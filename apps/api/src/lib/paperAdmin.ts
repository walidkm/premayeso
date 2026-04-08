import { supabaseAdmin } from "./supabaseAdmin.js";
import {
  parsePaperWorkbook,
  type ParsedPaperWorkbook,
  type WorkbookCatalog,
} from "./paperWorkbook.js";

export type ExistingPaperPreview = {
  id: string;
  title: string | null;
  status: string | null;
  paper_code: string | null;
  attemptCount: number;
};

export type PaperWorkbookPreview = ParsedPaperWorkbook & {
  existingPaper: ExistingPaperPreview | null;
  canPublish: boolean;
};

export async function loadWorkbookCatalog(): Promise<WorkbookCatalog> {
  const [{ data: subjectData, error: subjectError }, { data: topicData, error: topicError }, { data: subtopicData, error: subtopicError }] =
    await Promise.all([
      supabaseAdmin.from("subjects").select("id, code, exam_path"),
      supabaseAdmin.from("topics").select("id, code, subject_id, exam_path"),
      supabaseAdmin.from("subtopics").select("id, code, topic_id"),
    ]);

  const errorMessage = subjectError?.message ?? topicError?.message ?? subtopicError?.message ?? null;
  if (errorMessage) {
    throw new Error(errorMessage);
  }

  return {
    subjects: (subjectData ?? []) as WorkbookCatalog["subjects"],
    topics: (topicData ?? []) as WorkbookCatalog["topics"],
    subtopics: (subtopicData ?? []) as WorkbookCatalog["subtopics"],
  };
}

export async function buildPaperWorkbookPreview(buffer: Buffer): Promise<PaperWorkbookPreview> {
  const catalog = await loadWorkbookCatalog();
  const parsed = parsePaperWorkbook(buffer, catalog);

  let existingPaper: ExistingPaperPreview | null = null;
  if (parsed.paper?.paperCode) {
    const { data: paperData, error: paperError } = await supabaseAdmin
      .from("exam_papers")
      .select("id, title, status, paper_code")
      .eq("paper_code", parsed.paper.paperCode)
      .maybeSingle();

    if (paperError) {
      throw new Error(paperError.message);
    }

    if (paperData) {
      const { count, error: attemptError } = await supabaseAdmin
        .from("paper_attempts")
        .select("id", { count: "exact", head: true })
        .eq("exam_paper_id", paperData.id);

      if (attemptError) {
        throw new Error(attemptError.message);
      }

      existingPaper = {
        ...(paperData as {
          id: string;
          title: string | null;
          status: string | null;
          paper_code: string | null;
        }),
        attemptCount: count ?? 0,
      };
    }
  }

  const hasErrors = parsed.issues.some((issue) => issue.level === "error");
  return {
    ...parsed,
    existingPaper,
    canPublish: !hasErrors && (existingPaper?.attemptCount ?? 0) === 0,
  };
}

export async function publishPaperWorkbook(preview: PaperWorkbookPreview): Promise<{
  examPaperId: string;
  questionCount: number;
}> {
  if (!preview.paper) {
    throw new Error("Workbook preview does not contain a paper");
  }

  if (!preview.canPublish) {
    throw new Error("Workbook contains blocking errors and cannot be published");
  }

  const { data, error } = await supabaseAdmin.rpc("admin_publish_paper_workbook", {
    p_payload: {
      paper: preview.paper,
      sections: preview.sections,
      questions: preview.questions,
      rubrics: preview.rubrics,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  const result = (data ?? {}) as {
    exam_paper_id?: string;
    question_count?: number;
  };

  if (!result.exam_paper_id) {
    throw new Error("Paper publish RPC did not return an exam_paper_id");
  }

  return {
    examPaperId: result.exam_paper_id,
    questionCount: result.question_count ?? preview.summary.questionCount,
  };
}
