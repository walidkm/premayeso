import type { MultipartFile } from "@fastify/multipart";
import { FastifyInstance, FastifyRequest } from "fastify";
import { requireAnyAdmin, requireSuperAdmin } from "../lib/adminAuth.js";
import { buildPaperWorkbookPreview, publishPaperWorkbook } from "../lib/paperAdmin.js";
import { loadPaperStructure, refreshAttemptScores } from "../lib/paperAttempts.js";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";

type MultipartRequest = FastifyRequest & {
  file: () => Promise<MultipartFile | undefined>;
};

async function readWorkbookFile(request: FastifyRequest): Promise<Buffer> {
  const data = await (request as MultipartRequest).file();
  if (!data) {
    throw new Error("No file uploaded");
  }

  const chunks: Buffer[] = [];
  for await (const chunk of data.file) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

async function ensurePaperMutable(paperId: string): Promise<void> {
  const { data: paper, error: paperError } = await supabaseAdmin
    .from("exam_papers")
    .select("status")
    .eq("id", paperId)
    .maybeSingle();

  if (paperError) throw new Error(paperError.message);
  if (!paper) throw new Error("Exam paper not found");
  if (paper.status === "published") {
    throw new Error("Set the paper to draft before changing its structure");
  }

  const { count, error } = await supabaseAdmin
    .from("paper_attempts")
    .select("id", { count: "exact", head: true })
    .eq("exam_paper_id", paperId);

  if (error) throw new Error(error.message);
  if ((count ?? 0) > 0) {
    throw new Error("This paper already has attempts and cannot be structurally modified");
  }
}

async function ensureQuestionMutable(questionId: string): Promise<void> {
  const { data: linkedPapers, error: linkError } = await supabaseAdmin
    .from("paper_questions")
    .select("exam_paper_id")
    .eq("question_id", questionId);

  if (linkError) throw new Error(linkError.message);

  const paperIds = [...new Set((linkedPapers ?? []).map((row) => row.exam_paper_id))];
  if (paperIds.length === 0) return;

  const { data: papers, error: paperError } = await supabaseAdmin
    .from("exam_papers")
    .select("id, status")
    .in("id", paperIds);

  if (paperError) throw new Error(paperError.message);
  if ((papers ?? []).some((paper) => paper.status === "published")) {
    throw new Error("Set linked papers to draft before changing question structure");
  }

  const { count, error } = await supabaseAdmin
    .from("paper_attempts")
    .select("id", { count: "exact", head: true })
    .in("exam_paper_id", paperIds);

  if (error) throw new Error(error.message);
  if ((count ?? 0) > 0) {
    throw new Error("This question is already part of attempted papers and cannot be structurally modified");
  }
}

function sumCriterionMarks(criteria: Array<{ max_marks?: number | null }>): number {
  return criteria.reduce((sum, criterion) => sum + Number(criterion.max_marks ?? 0), 0);
}

function logRouteFailure(
  request: FastifyRequest,
  stage: string,
  error: unknown,
  context: Record<string, unknown> = {}
) {
  request.log.error(
    {
      stage,
      ...context,
      err: error,
    },
    `${stage} failed`
  );
}

type ReviewValidationContext = {
  structure: Awaited<ReturnType<typeof loadPaperStructure>>;
  answers: Array<{
    id: string;
    paper_question_id: string;
    question_part_id: string | null;
  }>;
  rubrics: Array<{
    id: string;
    title: string;
    rubric_code: string | null;
    essay_rubric_criteria: Array<{
      id: string;
      criterion_name: string;
      max_marks: number;
      mark_bands: Array<{ key: string; value: string }>;
      order_index: number;
    }>;
  }>;
};

function normalizeReviewScore(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function loadReviewValidationContext(attemptId: string): Promise<ReviewValidationContext> {
  const [attemptResult, answersResult, rubricsResult] = await Promise.all([
    supabaseAdmin.from("paper_attempts").select("exam_paper_id").eq("id", attemptId).maybeSingle(),
    supabaseAdmin
      .from("attempt_answers")
      .select("id, paper_question_id, question_part_id")
      .eq("paper_attempt_id", attemptId),
    supabaseAdmin
      .from("essay_rubrics")
      .select("id, title, rubric_code, essay_rubric_criteria(id, criterion_name, max_marks, mark_bands, order_index)"),
  ]);

  if (attemptResult.error) throw new Error(attemptResult.error.message);
  if (!attemptResult.data?.exam_paper_id) throw new Error("Paper attempt not found");
  if (answersResult.error) throw new Error(answersResult.error.message);
  if (rubricsResult.error) throw new Error(rubricsResult.error.message);

  const structure = await loadPaperStructure(attemptResult.data.exam_paper_id);
  return {
    structure,
    answers: (answersResult.data ?? []) as ReviewValidationContext["answers"],
    rubrics: (rubricsResult.data ?? []) as ReviewValidationContext["rubrics"],
  };
}

function validateReviewInput(
  review: {
    attempt_answer_id: string;
    paper_question_id?: string | null;
    marker_mode?: string;
    status?: string;
    overall_comment?: string | null;
    suggested_total?: number | null;
    final_total?: number | null;
    criterion_marks?: Array<{
      criterion_id?: string | null;
      score?: number | null;
      suggested_score?: number | null;
      final_score?: number | null;
      comment?: string | null;
    }>;
  },
  context: ReviewValidationContext
) {
  const answer = context.answers.find((candidate) => candidate.id === review.attempt_answer_id);
  if (!answer) {
    throw new Error(`Unknown attempt_answer_id '${review.attempt_answer_id}'`);
  }

  const paperQuestion = context.structure.questions.find(
    (candidate) => candidate.id === answer.paper_question_id
  );
  if (!paperQuestion) {
    throw new Error(`Answer ${review.attempt_answer_id} is linked to an unknown paper question`);
  }

  const part =
    paperQuestion.questions.question_parts?.find(
      (candidate) => candidate.id === answer.question_part_id
    ) ?? null;
  const targetMaxScore = part?.marks ?? paperQuestion.questions.marks;
  const rubricId = part?.rubric_id ?? paperQuestion.questions.rubric_id ?? null;
  const rubric = rubricId
    ? context.rubrics.find((candidate) => candidate.id === rubricId) ?? null
    : null;
  const criterionMarks = review.criterion_marks ?? [];

  if (rubric && rubric.essay_rubric_criteria.length > 0) {
    const criteriaById = new Map(
      rubric.essay_rubric_criteria.map((criterion) => [criterion.id, criterion] as const)
    );
    const seenCriterionIds = new Set<string>();
    const normalizedCriterionMarks = criterionMarks.map((criterionMark) => {
      if (!criterionMark.criterion_id || !criteriaById.has(criterionMark.criterion_id)) {
        throw new Error(
          `Answer ${review.attempt_answer_id} includes an invalid rubric criterion reference`
        );
      }

      if (seenCriterionIds.has(criterionMark.criterion_id)) {
        throw new Error(`Answer ${review.attempt_answer_id} repeats rubric criterion scores`);
      }
      seenCriterionIds.add(criterionMark.criterion_id);

      const score = normalizeReviewScore(
        criterionMark.final_score ?? criterionMark.score ?? null
      );
      const criterion = criteriaById.get(criterionMark.criterion_id)!;
      if (score !== null && (score < 0 || score > Number(criterion.max_marks))) {
        throw new Error(
          `Answer ${review.attempt_answer_id} exceeds the cap for criterion '${criterion.criterion_name}'`
        );
      }

      return {
        criterion_id: criterionMark.criterion_id,
        score,
        suggested_score: normalizeReviewScore(criterionMark.suggested_score),
        final_score: score,
        comment: criterionMark.comment ?? null,
      };
    });

    const computedTotal = normalizedCriterionMarks.reduce(
      (sum, criterionMark) => sum + Number(criterionMark.final_score ?? 0),
      0
    );
    if (computedTotal > targetMaxScore) {
      throw new Error(`Answer ${review.attempt_answer_id} exceeds the question total of ${targetMaxScore}`);
    }

    return {
      paperQuestionId: answer.paper_question_id,
      normalizedCriterionMarks,
      suggestedTotal: computedTotal,
      finalTotal: computedTotal,
    };
  }

  if (criterionMarks.length > 1 || criterionMarks.some((criterionMark) => criterionMark.criterion_id)) {
    throw new Error(`Answer ${review.attempt_answer_id} does not support rubric criterion scoring`);
  }

  const fallbackScore = normalizeReviewScore(
    criterionMarks[0]?.final_score ?? criterionMarks[0]?.score ?? review.final_total ?? null
  );
  if (fallbackScore !== null && (fallbackScore < 0 || fallbackScore > targetMaxScore)) {
    throw new Error(`Answer ${review.attempt_answer_id} exceeds the question total of ${targetMaxScore}`);
  }

  return {
    paperQuestionId: answer.paper_question_id,
    normalizedCriterionMarks: criterionMarks.map((criterionMark) => ({
      criterion_id: null,
      score: normalizeReviewScore(criterionMark.score ?? criterionMark.final_score),
      suggested_score: normalizeReviewScore(criterionMark.suggested_score),
      final_score: fallbackScore,
      comment: criterionMark.comment ?? null,
    })),
    suggestedTotal: fallbackScore,
    finalTotal: fallbackScore,
  };
}

export async function paperAdminRoutes(app: FastifyInstance) {
  app.get<{ Params: { paperId: string } }>("/admin/exam-papers/:paperId/sections", async (request, reply) => {
    const admin = await requireAnyAdmin(request, reply);
    if (!admin) return;

    const { data, error } = await supabaseAdmin
      .from("paper_sections")
      .select("*")
      .eq("exam_paper_id", request.params.paperId)
      .order("order_index");

    if (error) return reply.status(500).send({ error: error.message });
    return data ?? [];
  });

  app.post<{
    Params: { paperId: string };
    Body: {
      section_code: string;
      title?: string | null;
      instructions?: string | null;
      order_index?: number;
      question_selection_mode?: string;
      required_count?: number | null;
      max_marks?: number | null;
      starts_at_question_number?: number | null;
      ends_at_question_number?: number | null;
    };
  }>("/admin/exam-papers/:paperId/sections", async (request, reply) => {
    const admin = await requireSuperAdmin(request, reply);
    if (!admin) return;

    try {
      await ensurePaperMutable(request.params.paperId);
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "Paper is not mutable" });
    }

    const { data, error } = await supabaseAdmin
      .from("paper_sections")
      .insert({
        exam_paper_id: request.params.paperId,
        section_code: request.body.section_code,
        title: request.body.title ?? null,
        instructions: request.body.instructions ?? null,
        order_index: request.body.order_index ?? 0,
        question_selection_mode: request.body.question_selection_mode ?? "answer_all",
        required_count: request.body.required_count ?? null,
        max_marks: request.body.max_marks ?? null,
        starts_at_question_number: request.body.starts_at_question_number ?? null,
        ends_at_question_number: request.body.ends_at_question_number ?? null,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) return reply.status(400).send({ error: error.message });

    await supabaseAdmin
      .from("exam_papers")
      .update({ has_sections: true, updated_at: new Date().toISOString() })
      .eq("id", request.params.paperId);

    return reply.status(201).send(data);
  });

  app.patch<{
    Params: { id: string };
    Body: {
      section_code?: string;
      title?: string | null;
      instructions?: string | null;
      order_index?: number;
      question_selection_mode?: string;
      required_count?: number | null;
      max_marks?: number | null;
      starts_at_question_number?: number | null;
      ends_at_question_number?: number | null;
    };
  }>("/admin/paper-sections/:id", async (request, reply) => {
    const admin = await requireSuperAdmin(request, reply);
    if (!admin) return;

    const { data: existingSection, error: existingError } = await supabaseAdmin
      .from("paper_sections")
      .select("id, exam_paper_id")
      .eq("id", request.params.id)
      .maybeSingle();

    if (existingError) return reply.status(500).send({ error: existingError.message });
    if (!existingSection) return reply.status(404).send({ error: "Paper section not found" });

    try {
      await ensurePaperMutable(existingSection.exam_paper_id);
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "Paper is not mutable" });
    }

    const { data, error } = await supabaseAdmin
      .from("paper_sections")
      .update({
        section_code: request.body.section_code,
        title: request.body.title,
        instructions: request.body.instructions,
        order_index: request.body.order_index,
        question_selection_mode: request.body.question_selection_mode,
        required_count: request.body.required_count,
        max_marks: request.body.max_marks,
        starts_at_question_number: request.body.starts_at_question_number,
        ends_at_question_number: request.body.ends_at_question_number,
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.params.id)
      .select("*")
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return data;
  });

  app.delete<{ Params: { id: string } }>("/admin/paper-sections/:id", async (request, reply) => {
    const admin = await requireSuperAdmin(request, reply);
    if (!admin) return;

    const { data: existingSection, error: existingError } = await supabaseAdmin
      .from("paper_sections")
      .select("id, exam_paper_id")
      .eq("id", request.params.id)
      .maybeSingle();

    if (existingError) return reply.status(500).send({ error: existingError.message });
    if (!existingSection) return reply.status(404).send({ error: "Paper section not found" });

    try {
      await ensurePaperMutable(existingSection.exam_paper_id);
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "Paper is not mutable" });
    }

    const { error } = await supabaseAdmin.from("paper_sections").delete().eq("id", request.params.id);
    if (error) return reply.status(400).send({ error: error.message });
    return { ok: true };
  });

  app.post("/admin/exam-papers/import/preview", async (request, reply) => {
    const admin = await requireSuperAdmin(request, reply);
    if (!admin) return;

    try {
      const buffer = await readWorkbookFile(request);
      const preview = await buildPaperWorkbookPreview(buffer);
      return preview;
    } catch (error) {
      logRouteFailure(request, "paper_import_preview", error);
      return reply.status(400).send({ error: error instanceof Error ? error.message : "Workbook preview failed" });
    }
  });

  app.post("/admin/exam-papers/import/publish", async (request, reply) => {
    const admin = await requireSuperAdmin(request, reply);
    if (!admin) return;

    try {
      const buffer = await readWorkbookFile(request);
      const preview = await buildPaperWorkbookPreview(buffer);
      const published = await publishPaperWorkbook(preview);
      return {
        ...published,
        preview,
      };
    } catch (error) {
      logRouteFailure(request, "paper_import_publish", error);
      return reply.status(400).send({ error: error instanceof Error ? error.message : "Workbook publish failed" });
    }
  });

  app.get<{ Params: { paperId: string } }>("/admin/exam-papers/:paperId/structure", async (request, reply) => {
    const admin = await requireAnyAdmin(request, reply);
    if (!admin) return;

    try {
      return await loadPaperStructure(request.params.paperId);
    } catch (error) {
      logRouteFailure(request, "paper_structure_load", error, { paperId: request.params.paperId });
      return reply.status(400).send({ error: error instanceof Error ? error.message : "Could not load paper structure" });
    }
  });

  app.patch<{
    Params: { id: string };
    Body: {
      stem?: string;
      type?: string;
      difficulty?: string;
      marks?: number;
      explanation?: string | null;
      expected_answer?: string | null;
      allow_shuffle?: boolean;
      rubric_id?: string | null;
      auto_marking_mode?: string;
    };
  }>("/admin/questions/:id", async (request, reply) => {
    const admin = await requireSuperAdmin(request, reply);
    if (!admin) return;

    try {
      await ensureQuestionMutable(request.params.id);
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "Question is not mutable" });
    }

    const { data, error } = await supabaseAdmin
      .from("questions")
      .update({
        stem: request.body.stem,
        type: request.body.type,
        difficulty: request.body.difficulty,
        marks: request.body.marks,
        explanation: request.body.explanation,
        expected_answer: request.body.expected_answer,
        allow_shuffle: request.body.allow_shuffle,
        rubric_id: request.body.rubric_id,
        auto_marking_mode: request.body.auto_marking_mode,
      })
      .eq("id", request.params.id)
      .select("*")
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return data;
  });

  app.put<{
    Params: { id: string };
    Body: {
      parts: Array<{
        part_label: string;
        body: string;
        marks: number;
        expected_answer?: string | null;
        rubric_id?: string | null;
        auto_marking_mode?: string;
        order_index?: number;
        options?: Array<{ key: string; text: string; distractorExplanation?: string | null }>;
        correct_option?: string | null;
      }>;
    };
  }>("/admin/questions/:id/parts", async (request, reply) => {
    const admin = await requireSuperAdmin(request, reply);
    if (!admin) return;

    try {
      await ensureQuestionMutable(request.params.id);
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "Question is not mutable" });
    }

    const { error: deleteError } = await supabaseAdmin
      .from("question_parts")
      .delete()
      .eq("question_id", request.params.id);

    if (deleteError) return reply.status(400).send({ error: deleteError.message });

    if ((request.body.parts ?? []).length > 0) {
      const { error: insertError } = await supabaseAdmin.from("question_parts").insert(
        request.body.parts.map((part, index) => ({
          question_id: request.params.id,
          part_label: part.part_label,
          body: part.body,
          marks: part.marks,
          expected_answer: part.expected_answer ?? null,
          rubric_id: part.rubric_id ?? null,
          auto_marking_mode: part.auto_marking_mode ?? "manual",
          order_index: part.order_index ?? index,
          options: (part.options ?? []).map((option) => ({
            key: option.key,
            text: option.text,
            distractorExplanation: option.distractorExplanation ?? null,
          })),
          correct_option: part.correct_option ?? null,
          updated_at: new Date().toISOString(),
        }))
      );

      if (insertError) return reply.status(400).send({ error: insertError.message });
    }

    const { data, error } = await supabaseAdmin
      .from("question_parts")
      .select("*")
      .eq("question_id", request.params.id)
      .order("order_index");

    if (error) return reply.status(400).send({ error: error.message });
    return data ?? [];
  });

  app.get<{ Querystring: { exam_path?: string; subject_id?: string } }>("/admin/rubrics", async (request, reply) => {
    const admin = await requireAnyAdmin(request, reply);
    if (!admin) return;

    let query = supabaseAdmin
      .from("essay_rubrics")
      .select("id, rubric_code, exam_path, subject_id, title, description, total_marks, updated_at, essay_rubric_criteria(id, criterion_name, max_marks, mark_bands, order_index)")
      .order("title");

    if (request.query.exam_path) query = query.eq("exam_path", request.query.exam_path);
    if (request.query.subject_id) query = query.eq("subject_id", request.query.subject_id);

    const { data, error } = await query;
    if (error) return reply.status(500).send({ error: error.message });
    return data ?? [];
  });

  app.post<{
    Body: {
      rubric_code?: string | null;
      exam_path?: string | null;
      subject_id?: string | null;
      title: string;
      description?: string | null;
      criteria: Array<{
        criterion_name: string;
        max_marks: number;
        mark_bands?: Array<{ key: string; value: string }>;
        order_index?: number;
      }>;
    };
  }>("/admin/rubrics", async (request, reply) => {
    const admin = await requireSuperAdmin(request, reply);
    if (!admin) return;

    const { data, error } = await supabaseAdmin
      .from("essay_rubrics")
      .insert({
        rubric_code: request.body.rubric_code ?? null,
        exam_path: request.body.exam_path ?? null,
        subject_id: request.body.subject_id ?? null,
        title: request.body.title,
        description: request.body.description ?? null,
        total_marks: sumCriterionMarks(request.body.criteria),
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error || !data) return reply.status(400).send({ error: error?.message ?? "Could not create rubric" });

    if (request.body.criteria.length > 0) {
      const { error: criteriaError } = await supabaseAdmin.from("essay_rubric_criteria").insert(
        request.body.criteria.map((criterion, index) => ({
          rubric_id: data.id,
          criterion_name: criterion.criterion_name,
          max_marks: criterion.max_marks,
          mark_bands: criterion.mark_bands ?? [],
          order_index: criterion.order_index ?? index,
          updated_at: new Date().toISOString(),
        }))
      );

      if (criteriaError) return reply.status(400).send({ error: criteriaError.message });
    }

    return reply.status(201).send(data);
  });

  app.patch<{
    Params: { id: string };
    Body: {
      rubric_code?: string | null;
      exam_path?: string | null;
      subject_id?: string | null;
      title?: string;
      description?: string | null;
      criteria?: Array<{
        criterion_name: string;
        max_marks: number;
        mark_bands?: Array<{ key: string; value: string }>;
        order_index?: number;
      }>;
    };
  }>("/admin/rubrics/:id", async (request, reply) => {
    const admin = await requireSuperAdmin(request, reply);
    if (!admin) return;

    const { data, error } = await supabaseAdmin
      .from("essay_rubrics")
      .update({
        rubric_code: request.body.rubric_code,
        exam_path: request.body.exam_path,
        subject_id: request.body.subject_id,
        title: request.body.title,
        description: request.body.description,
        total_marks: request.body.criteria ? sumCriterionMarks(request.body.criteria) : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.params.id)
      .select("*")
      .single();

    if (error || !data) return reply.status(400).send({ error: error?.message ?? "Could not update rubric" });

    if (request.body.criteria) {
      const { error: deleteError } = await supabaseAdmin
        .from("essay_rubric_criteria")
        .delete()
        .eq("rubric_id", request.params.id);

      if (deleteError) return reply.status(400).send({ error: deleteError.message });

      if (request.body.criteria.length > 0) {
        const { error: insertError } = await supabaseAdmin.from("essay_rubric_criteria").insert(
          request.body.criteria.map((criterion, index) => ({
            rubric_id: request.params.id,
            criterion_name: criterion.criterion_name,
            max_marks: criterion.max_marks,
            mark_bands: criterion.mark_bands ?? [],
            order_index: criterion.order_index ?? index,
            updated_at: new Date().toISOString(),
          }))
        );

        if (insertError) return reply.status(400).send({ error: insertError.message });
      }
    }

    return data;
  });

  app.delete<{ Params: { id: string } }>("/admin/rubrics/:id", async (request, reply) => {
    const admin = await requireSuperAdmin(request, reply);
    if (!admin) return;

    const [{ count: questionCount }, { count: partCount }] = await Promise.all([
      supabaseAdmin.from("questions").select("id", { count: "exact", head: true }).eq("rubric_id", request.params.id),
      supabaseAdmin.from("question_parts").select("id", { count: "exact", head: true }).eq("rubric_id", request.params.id),
    ]);

    if ((questionCount ?? 0) > 0 || (partCount ?? 0) > 0) {
      return reply.status(400).send({ error: "Cannot delete a rubric that is still attached to questions or parts" });
    }

    const { error } = await supabaseAdmin.from("essay_rubrics").delete().eq("id", request.params.id);
    if (error) return reply.status(400).send({ error: error.message });
    return { ok: true };
  });

  app.get<{ Querystring: { exam_path?: string; status?: string } }>("/admin/marking/queue", async (request, reply) => {
    const admin = await requireAnyAdmin(request, reply);
    if (!admin) return;

    let query = supabaseAdmin
      .from("paper_attempts")
      .select(`
        id, exam_paper_id, user_id, status, marking_status, started_at, submitted_at,
        objective_score, final_score, max_score,
        exam_papers(id, title, year, paper_number, exam_path, paper_code, subjects(name, code)),
        users(id, full_name, phone)
      `)
      .order("submitted_at", { ascending: false });

    if (request.query.status) {
      query = query.eq("marking_status", request.query.status);
    } else {
      query = query.in("marking_status", ["pending_manual", "under_review"]);
    }
    if (request.query.exam_path) query = query.eq("exam_papers.exam_path", request.query.exam_path);

    const { data, error } = await query;
    if (error) return reply.status(500).send({ error: error.message });
    return data ?? [];
  });

  app.get<{ Params: { attemptId: string } }>("/admin/marking/attempts/:attemptId", async (request, reply) => {
    const admin = await requireAnyAdmin(request, reply);
    if (!admin) return;

    try {
      const attemptPaperResult = await supabaseAdmin
        .from("paper_attempts")
        .select("exam_paper_id")
        .eq("id", request.params.attemptId)
        .maybeSingle();

      if (attemptPaperResult.error) {
        return reply.status(500).send({ error: attemptPaperResult.error.message });
      }

      if (!attemptPaperResult.data?.exam_paper_id) {
        return reply.status(404).send({ error: "Paper attempt not found" });
      }

      const structure = await loadPaperStructure(attemptPaperResult.data.exam_paper_id);
      const [attemptResult, answersResult, marksResult, reviewsResult, rubricsResult] = await Promise.all([
        supabaseAdmin.from("paper_attempts").select("*").eq("id", request.params.attemptId).single(),
        supabaseAdmin.from("attempt_answers").select("*").eq("paper_attempt_id", request.params.attemptId),
        supabaseAdmin.from("answer_marks").select("*").eq("paper_attempt_id", request.params.attemptId),
        supabaseAdmin.from("essay_marking_reviews").select("*").eq("paper_attempt_id", request.params.attemptId),
        supabaseAdmin.from("essay_rubrics").select("id, title, rubric_code, essay_rubric_criteria(id, criterion_name, max_marks, mark_bands, order_index)"),
      ]);

      if (attemptResult.error) return reply.status(500).send({ error: attemptResult.error.message });
      if (answersResult.error) return reply.status(500).send({ error: answersResult.error.message });
      if (marksResult.error) return reply.status(500).send({ error: marksResult.error.message });
      if (reviewsResult.error) return reply.status(500).send({ error: reviewsResult.error.message });
      if (rubricsResult.error) return reply.status(500).send({ error: rubricsResult.error.message });

      return {
        attempt: attemptResult.data,
        structure,
        answers: answersResult.data ?? [],
        marks: marksResult.data ?? [],
        reviews: reviewsResult.data ?? [],
        rubrics: rubricsResult.data ?? [],
      };
    } catch (error) {
      logRouteFailure(request, "marking_detail_load", error, { attemptId: request.params.attemptId });
      return reply.status(400).send({ error: error instanceof Error ? error.message : "Could not load marking detail" });
    }
  });

  app.put<{
    Params: { attemptId: string };
    Body: {
      reviews: Array<{
        attempt_answer_id: string;
        paper_question_id?: string | null;
        marker_mode?: string;
        status?: string;
        overall_comment?: string | null;
        suggested_total?: number | null;
        final_total?: number | null;
        criterion_marks?: Array<{
          criterion_id?: string | null;
          score?: number | null;
          suggested_score?: number | null;
          final_score?: number | null;
          comment?: string | null;
        }>;
      }>;
    };
  }>("/admin/marking/attempts/:attemptId/review", async (request, reply) => {
    const admin = await requireAnyAdmin(request, reply);
    if (!admin) return;

    let reviewContext: ReviewValidationContext;
    try {
      reviewContext = await loadReviewValidationContext(request.params.attemptId);
    } catch (error) {
      logRouteFailure(request, "marking_review_context", error, { attemptId: request.params.attemptId });
      return reply.status(400).send({ error: error instanceof Error ? error.message : "Could not load marking context" });
    }

    for (const review of request.body.reviews ?? []) {
      let validatedReview: ReturnType<typeof validateReviewInput>;
      try {
        validatedReview = validateReviewInput(review, reviewContext);
      } catch (error) {
        logRouteFailure(request, "marking_review_validation", error, {
          attemptId: request.params.attemptId,
          attemptAnswerId: review.attempt_answer_id,
          paperQuestionId: review.paper_question_id ?? null,
        });
        return reply.status(400).send({ error: error instanceof Error ? error.message : "Invalid review payload" });
      }

      const { error: deleteMarksError } = await supabaseAdmin
        .from("answer_marks")
        .delete()
        .eq("paper_attempt_id", request.params.attemptId)
        .eq("attempt_answer_id", review.attempt_answer_id)
        .in("marker_type", ["human", "moderator"]);

      if (deleteMarksError) return reply.status(400).send({ error: deleteMarksError.message });

      if (validatedReview.normalizedCriterionMarks.length > 0) {
        const { error: insertMarksError } = await supabaseAdmin.from("answer_marks").insert(
          validatedReview.normalizedCriterionMarks.map((criterionMark) => ({
            paper_attempt_id: request.params.attemptId,
            attempt_answer_id: review.attempt_answer_id,
            criterion_id: criterionMark.criterion_id ?? null,
            marker_type: "human",
            score: criterionMark.score ?? criterionMark.final_score ?? null,
            suggested_score: criterionMark.suggested_score ?? null,
            final_score: criterionMark.final_score ?? criterionMark.score ?? null,
            comment: criterionMark.comment ?? null,
            moderation_status: "reviewed",
          }))
        );

        if (insertMarksError) return reply.status(400).send({ error: insertMarksError.message });
      }

      const { error: deleteReviewError } = await supabaseAdmin
        .from("essay_marking_reviews")
        .delete()
        .eq("paper_attempt_id", request.params.attemptId)
        .eq("attempt_answer_id", review.attempt_answer_id)
        .eq("reviewer_user_id", admin.userId);

      if (deleteReviewError) return reply.status(400).send({ error: deleteReviewError.message });

      const { error: insertReviewError } = await supabaseAdmin.from("essay_marking_reviews").insert({
        paper_attempt_id: request.params.attemptId,
        paper_question_id: validatedReview.paperQuestionId ?? null,
        attempt_answer_id: review.attempt_answer_id,
        reviewer_user_id: admin.userId,
        marker_mode: review.marker_mode ?? "manual",
        status: review.status ?? "draft",
        overall_comment: review.overall_comment ?? null,
        suggested_total: validatedReview.suggestedTotal,
        final_total: validatedReview.finalTotal,
        finalized_at: review.status === "finalized" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      });

      if (insertReviewError) return reply.status(400).send({ error: insertReviewError.message });
    }

    try {
      const attempt = await refreshAttemptScores(request.params.attemptId);
      return { ok: true, attempt };
    } catch (error) {
      logRouteFailure(request, "marking_review_refresh", error, { attemptId: request.params.attemptId });
      return reply.status(400).send({ error: error instanceof Error ? error.message : "Could not refresh attempt scores" });
    }
  });
}
