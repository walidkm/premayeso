import { AdminShell } from "@/components/AdminShell";
import { PageIntro } from "@/components/AdminUi";
import { PaperLinksManager } from "@/components/PaperLinksManager";
import { getAdminPageContext } from "@/lib/adminPage";
import type {
  ContentTreeSubjectDto,
  ExamPaperAdminDto,
  PaperQuestionAdminDto,
  QuestionAdminDto,
} from "@/lib/content";

export const revalidate = 0;

export default async function PaperLinksPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase, examPath, role, email, token } = await getAdminPageContext(searchParams, { area: "platform" });

  const [{ data: subjectData }, { data: paperData }, { data: questionData }] = await Promise.all([
    supabase
      .from("subjects")
      .select("id, name, description, code, exam_path, order_index, topics(id, name, description, code, form_level, exam_path, order_index)")
      .eq("exam_path", examPath)
      .order("order_index"),
    supabase
      .from("exam_papers")
      .select("id, exam_path, subject_id, school_id, source_type, paper_type, exam_mode, title, year, paper_number, term, session, paper_code, duration_min, total_marks, instructions, has_sections, marking_mode, solution_unlock_mode, question_mode, status, is_sample, created_at, updated_at, subjects(name, code), schools(name), paper_questions(id), paper_sections(id)")
      .eq("exam_path", examPath)
      .order("year", { ascending: false })
      .order("paper_number", { ascending: true }),
    supabase
      .from("questions")
      .select("id, topic_id, stem, type, difficulty, marks, question_no, exam_path")
      .eq("exam_path", examPath)
      .eq("is_approved", true),
  ]);

  const papers = ((paperData as ExamPaperAdminDto[] | null) ?? []).map((paper) => ({
    ...paper,
    question_count: paper.paper_questions?.length ?? 0,
    section_count: paper.paper_sections?.length ?? 0,
  }));
  const paperIds = papers.map((paper) => paper.id);
  const { data: linkData } =
    paperIds.length === 0
        ? { data: [] as PaperQuestionAdminDto[] }
      : await supabase
          .from("paper_questions")
          .select("id, exam_paper_id, question_id, order_index, section, section_id, question_number, questions(id, stem, type, difficulty, marks, question_no, exam_path, topic_id)")
          .in("exam_paper_id", paperIds)
          .order("order_index");

  const subjects = ((subjectData as ContentTreeSubjectDto[] | null) ?? []).map((subject) => ({
    ...subject,
    topics: (subject.topics ?? []).sort((left, right) => left.order_index - right.order_index),
  }));
  const questions = (questionData as QuestionAdminDto[] | null) ?? [];
  const links = (linkData as PaperQuestionAdminDto[] | null) ?? [];

  return (
    <AdminShell activePath="/paper-links" examPath={examPath} email={email} role={role}>
      <PageIntro
        eyebrow={`${examPath} Paper Links`}
        title="Paper-question linking"
        description="Attach approved questions to the right paper with the right order and section. The API now rejects links that cross subject or exam-level boundaries."
      />
      <PaperLinksManager token={token} role={role} subjects={subjects} papers={papers} questions={questions} links={links} />
    </AdminShell>
  );
}
