import { FastifyInstance } from "fastify";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { requireAnyAdmin, requireSuperAdmin } from "../lib/adminAuth.js";
import {
  ensureSchoolExists,
  getExamPaper,
  getQuestion,
  getQuestionSubjectId,
  getSubject,
  normalizeExamMode,
  normalizeExamPath,
  normalizeInteger,
  normalizeOptionalText,
  normalizeOrderIndex,
  normalizePaperMarkingMode,
  normalizePaperQuestionMode,
  normalizePaperSolutionUnlockMode,
  normalizePaperStatus,
  normalizePaperType,
  normalizeSourceType,
} from "../lib/adminContent.js";

type ExamPaperListRow = {
  id: string;
  exam_path: string | null;
  subject_id: string | null;
  school_id: string | null;
  source_type: string;
  paper_type: string;
  exam_mode: string;
  title: string | null;
  year: number | null;
  paper_number: number | null;
  term: string | null;
  session: string | null;
  paper_code: string | null;
  duration_min: number | null;
  total_marks: number | null;
  instructions: string | null;
  has_sections: boolean;
  marking_mode: string;
  solution_unlock_mode: string;
  question_mode: string;
  status: string;
  is_sample: boolean;
  created_at: string;
  updated_at: string | null;
  subjects: { name: string | null; code: string | null } | null;
  schools: { name: string | null } | null;
  paper_questions: { id: string }[] | null;
  paper_sections: { id: string }[] | null;
};

type SchoolRow = {
  id: string;
  name: string;
  created_at: string;
};

type PaperQuestionRow = {
  id: string;
  exam_paper_id: string;
  question_id: string;
  order_index: number;
  section: string | null;
  section_id: string | null;
  question_number: number | null;
  questions: {
    id: string;
    stem: string;
    type: string;
    difficulty: string;
    marks: number;
    question_no: string | null;
    exam_path: string | null;
    topic_id: string | null;
  } | null;
};

async function ensurePaperHasNoAttempts(paperId: string): Promise<string | null> {
  const { count, error } = await supabaseAdmin
    .from("paper_attempts")
    .select("id", { count: "exact", head: true })
    .eq("exam_paper_id", paperId);

  if (error) return error.message;
  if ((count ?? 0) > 0) {
    return "This paper already has attempts and cannot be structurally modified or deleted";
  }

  return null;
}

export async function adminResourceRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { exam_path?: string; subject_id?: string } }>("/admin/exam-papers", async (request, reply) => {
    const admin = await requireAnyAdmin(request, reply);
    if (!admin) return;

    const examPath = normalizeExamPath(request.query.exam_path);

    let query = supabaseAdmin
      .from("exam_papers")
      .select(
        "id, exam_path, subject_id, school_id, source_type, paper_type, exam_mode, title, year, paper_number, term, session, paper_code, duration_min, total_marks, instructions, has_sections, marking_mode, solution_unlock_mode, question_mode, status, is_sample, created_at, updated_at, subjects(name, code), schools(name), paper_questions(id), paper_sections(id)"
      )
      .order("year", { ascending: false })
      .order("paper_number", { ascending: true });

    if (examPath) query = query.eq("exam_path", examPath);
    if (request.query.subject_id) query = query.eq("subject_id", request.query.subject_id);

    const { data, error } = await query;
    if (error) return reply.status(500).send({ error: error.message });

    return ((data as unknown as ExamPaperListRow[] | null) ?? []).map((paper) => ({
      ...paper,
      question_count: paper.paper_questions?.length ?? 0,
      section_count: paper.paper_sections?.length ?? 0,
    }));
  });

  app.post<{
    Body: {
      subject_id: string;
      school_id?: string | null;
      source_type?: string;
      paper_type?: string;
      exam_mode?: string;
      title?: string;
      year?: number | null;
      paper_number?: number | null;
      term?: string;
      session?: string;
      paper_code?: string;
      duration_min?: number | null;
      total_marks?: number | null;
      instructions?: string;
      has_sections?: boolean;
      marking_mode?: string;
      solution_unlock_mode?: string;
      question_mode?: string;
      status?: string;
      is_sample?: boolean;
      exam_path?: string;
    };
  }>("/admin/exam-papers", async (request, reply) => {
    const admin = await requireSuperAdmin(request, reply);
    if (!admin) return;

    const subjectResult = await getSubject(request.body.subject_id);
    if (subjectResult.error) return reply.status(500).send({ error: subjectResult.error });
    if (!subjectResult.data?.exam_path) return reply.status(404).send({ error: "Subject not found" });

    if (request.body.exam_path !== undefined && normalizeExamPath(request.body.exam_path) !== subjectResult.data.exam_path) {
      return reply.status(400).send({ error: "Exam paper exam_path must match its subject exam_path" });
    }

    const sourceType = normalizeSourceType(request.body.source_type) ?? "maneb";
    const paperType = normalizePaperType(request.body.paper_type) ?? "maneb_past_paper";
    const examMode = normalizeExamMode(request.body.exam_mode) ?? "paper_layout";
    const markingMode = normalizePaperMarkingMode(request.body.marking_mode) ?? "auto";
    const solutionUnlockMode =
      normalizePaperSolutionUnlockMode(request.body.solution_unlock_mode) ?? "after_submit";
    const questionMode = normalizePaperQuestionMode(request.body.question_mode) ?? "one_question_at_a_time";
    const status = normalizePaperStatus(request.body.status) ?? "published";
    const schoolId = request.body.school_id ?? null;

    if (sourceType === "school") {
      if (!schoolId) return reply.status(400).send({ error: "school_id is required when source_type is school" });
      const schoolError = await ensureSchoolExists(schoolId);
      if (schoolError) return reply.status(400).send({ error: schoolError });
    }

    const { data, error } = await supabaseAdmin
      .from("exam_papers")
      .insert({
        subject_id: request.body.subject_id,
        school_id: sourceType === "school" ? schoolId : null,
        source_type: sourceType,
        paper_type: paperType,
        exam_mode: examMode,
        title: normalizeOptionalText(request.body.title),
        year: normalizeInteger(request.body.year),
        paper_number: normalizeInteger(request.body.paper_number),
        term: normalizeOptionalText(request.body.term),
        session: normalizeOptionalText(request.body.session),
        paper_code: normalizeOptionalText(request.body.paper_code),
        duration_min: normalizeInteger(request.body.duration_min),
        total_marks: normalizeInteger(request.body.total_marks),
        instructions: normalizeOptionalText(request.body.instructions),
        has_sections: request.body.has_sections ?? false,
        marking_mode: markingMode,
        solution_unlock_mode: solutionUnlockMode,
        question_mode: questionMode,
        status,
        is_sample: request.body.is_sample ?? false,
        exam_path: subjectResult.data.exam_path,
      })
      .select()
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return reply.status(201).send(data);
  });

  app.patch<{
    Params: { id: string };
    Body: {
      subject_id?: string;
      school_id?: string | null;
      source_type?: string;
      paper_type?: string;
      exam_mode?: string;
      title?: string;
      year?: number | null;
      paper_number?: number | null;
      term?: string;
      session?: string;
      paper_code?: string;
      duration_min?: number | null;
      total_marks?: number | null;
      instructions?: string;
      has_sections?: boolean;
      marking_mode?: string;
      solution_unlock_mode?: string;
      question_mode?: string;
      status?: string;
      is_sample?: boolean;
      exam_path?: string;
    };
  }>("/admin/exam-papers/:id", async (request, reply) => {
    const admin = await requireSuperAdmin(request, reply);
    if (!admin) return;

    const paperResult = await getExamPaper(request.params.id);
    if (paperResult.error) return reply.status(500).send({ error: paperResult.error });
    if (!paperResult.data) return reply.status(404).send({ error: "Exam paper not found" });

    const subjectId = request.body.subject_id ?? paperResult.data.subject_id;
    if (!subjectId) return reply.status(400).send({ error: "Exam paper must be linked to a subject" });

    const subjectResult = await getSubject(subjectId);
    if (subjectResult.error) return reply.status(500).send({ error: subjectResult.error });
    if (!subjectResult.data?.exam_path) return reply.status(404).send({ error: "Subject not found" });

    if (request.body.exam_path !== undefined && normalizeExamPath(request.body.exam_path) !== subjectResult.data.exam_path) {
      return reply.status(400).send({ error: "Exam paper exam_path must match its subject exam_path" });
    }

    const sourceType = request.body.source_type ? normalizeSourceType(request.body.source_type) : paperResult.data.source_type;
    const paperType = request.body.paper_type ? normalizePaperType(request.body.paper_type) : paperResult.data.paper_type;
    const examMode = request.body.exam_mode ? normalizeExamMode(request.body.exam_mode) : paperResult.data.exam_mode;
    const markingMode =
      request.body.marking_mode !== undefined
        ? normalizePaperMarkingMode(request.body.marking_mode)
        : paperResult.data.marking_mode;
    const solutionUnlockMode =
      request.body.solution_unlock_mode !== undefined
        ? normalizePaperSolutionUnlockMode(request.body.solution_unlock_mode)
        : paperResult.data.solution_unlock_mode;
    const questionMode =
      request.body.question_mode !== undefined
        ? normalizePaperQuestionMode(request.body.question_mode)
        : paperResult.data.question_mode;
    const status =
      request.body.status !== undefined
        ? normalizePaperStatus(request.body.status)
        : paperResult.data.status;
    if (!sourceType || !paperType || !examMode || !markingMode || !solutionUnlockMode || !questionMode || !status) {
      return reply.status(400).send({ error: "Invalid exam paper metadata supplied" });
    }

    const schoolId = request.body.school_id !== undefined ? request.body.school_id : paperResult.data.school_id;
    if (sourceType === "school") {
      if (!schoolId) return reply.status(400).send({ error: "school_id is required when source_type is school" });
      const schoolError = await ensureSchoolExists(schoolId);
      if (schoolError) return reply.status(400).send({ error: schoolError });
    }

    const { data, error } = await supabaseAdmin
      .from("exam_papers")
      .update({
        subject_id: subjectId,
        school_id: sourceType === "school" ? schoolId : null,
        source_type: sourceType,
        paper_type: paperType,
        exam_mode: examMode,
        title: request.body.title !== undefined ? normalizeOptionalText(request.body.title) : undefined,
        year: request.body.year !== undefined ? normalizeInteger(request.body.year) : undefined,
        paper_number: request.body.paper_number !== undefined ? normalizeInteger(request.body.paper_number) : undefined,
        term: request.body.term !== undefined ? normalizeOptionalText(request.body.term) : undefined,
        session: request.body.session !== undefined ? normalizeOptionalText(request.body.session) : undefined,
        paper_code: request.body.paper_code !== undefined ? normalizeOptionalText(request.body.paper_code) : undefined,
        duration_min: request.body.duration_min !== undefined ? normalizeInteger(request.body.duration_min) : undefined,
        total_marks: request.body.total_marks !== undefined ? normalizeInteger(request.body.total_marks) : undefined,
        instructions: request.body.instructions !== undefined ? normalizeOptionalText(request.body.instructions) : undefined,
        has_sections: request.body.has_sections,
        marking_mode: markingMode,
        solution_unlock_mode: solutionUnlockMode,
        question_mode: questionMode,
        status,
        is_sample: request.body.is_sample,
        exam_path: subjectResult.data.exam_path,
      })
      .eq("id", request.params.id)
      .select()
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return data;
  });

  app.delete<{ Params: { id: string } }>("/admin/exam-papers/:id", async (request, reply) => {
    const admin = await requireSuperAdmin(request, reply);
    if (!admin) return;

    const attemptsError = await ensurePaperHasNoAttempts(request.params.id);
    if (attemptsError) return reply.status(400).send({ error: attemptsError });

    const { error } = await supabaseAdmin.from("exam_papers").delete().eq("id", request.params.id);
    if (error) return reply.status(400).send({ error: error.message });
    return { ok: true };
  });

  app.get("/admin/schools", async (request, reply) => {
    const admin = await requireAnyAdmin(request, reply);
    if (!admin) return;

    const { data, error } = await supabaseAdmin.from("schools").select("id, name, created_at").order("name");
    if (error) return reply.status(500).send({ error: error.message });
    return (data as SchoolRow[] | null) ?? [];
  });

  app.post<{ Body: { name: string } }>("/admin/schools", async (request, reply) => {
    const admin = await requireSuperAdmin(request, reply);
    if (!admin) return;

    const name = normalizeOptionalText(request.body.name);
    if (!name) return reply.status(400).send({ error: "School name is required" });

    const { data, error } = await supabaseAdmin.from("schools").insert({ name }).select("id, name, created_at").single();
    if (error) return reply.status(400).send({ error: error.message });
    return reply.status(201).send(data);
  });

  app.patch<{ Params: { id: string }; Body: { name?: string } }>("/admin/schools/:id", async (request, reply) => {
    const admin = await requireSuperAdmin(request, reply);
    if (!admin) return;

    const name = normalizeOptionalText(request.body.name);
    if (request.body.name !== undefined && !name) {
      return reply.status(400).send({ error: "School name is required" });
    }

    const { data, error } = await supabaseAdmin
      .from("schools")
      .update({ name })
      .eq("id", request.params.id)
      .select("id, name, created_at")
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return data;
  });

  app.delete<{ Params: { id: string } }>("/admin/schools/:id", async (request, reply) => {
    const admin = await requireSuperAdmin(request, reply);
    if (!admin) return;

    const [{ count: paperCount }, { count: userCount }] = await Promise.all([
      supabaseAdmin.from("exam_papers").select("id", { count: "exact", head: true }).eq("school_id", request.params.id),
      supabaseAdmin.from("users").select("id", { count: "exact", head: true }).eq("school_id", request.params.id),
    ]);

    if ((paperCount ?? 0) > 0 || (userCount ?? 0) > 0) {
      return reply.status(400).send({
        error: "Cannot delete a school that is still referenced by users or exam papers",
      });
    }

    const { error } = await supabaseAdmin.from("schools").delete().eq("id", request.params.id);
    if (error) return reply.status(400).send({ error: error.message });
    return { ok: true };
  });

  app.get<{ Params: { paperId: string } }>("/admin/exam-papers/:paperId/questions", async (request, reply) => {
    const admin = await requireAnyAdmin(request, reply);
    if (!admin) return;

    const { data, error } = await supabaseAdmin
      .from("paper_questions")
      .select("id, exam_paper_id, question_id, order_index, section, section_id, question_number, questions(id, stem, type, difficulty, marks, question_no, exam_path, topic_id)")
      .eq("exam_paper_id", request.params.paperId)
      .order("order_index");

    if (error) return reply.status(500).send({ error: error.message });
    return (data as unknown as PaperQuestionRow[] | null) ?? [];
  });

  app.post<{
    Params: { paperId: string };
    Body: { question_id: string; order_index?: number; section?: string; section_id?: string | null; question_number?: number | null };
  }>("/admin/exam-papers/:paperId/questions", async (request, reply) => {
    const admin = await requireSuperAdmin(request, reply);
    if (!admin) return;

    const attemptsError = await ensurePaperHasNoAttempts(request.params.paperId);
    if (attemptsError) return reply.status(400).send({ error: attemptsError });

    const paperResult = await getExamPaper(request.params.paperId);
    if (paperResult.error) return reply.status(500).send({ error: paperResult.error });
    if (!paperResult.data?.subject_id || !paperResult.data.exam_path) {
      return reply.status(404).send({ error: "Exam paper not found" });
    }

    const questionResult = await getQuestion(request.body.question_id);
    if (questionResult.error) return reply.status(500).send({ error: questionResult.error });
    if (!questionResult.data) return reply.status(404).send({ error: "Question not found" });
    if (questionResult.data.exam_path !== paperResult.data.exam_path) {
      return reply.status(400).send({ error: "Question exam_path must match the exam paper exam_path" });
    }

    const questionSubjectResult = await getQuestionSubjectId(questionResult.data);
    if (questionSubjectResult.error) return reply.status(400).send({ error: questionSubjectResult.error });
    if (questionSubjectResult.subjectId !== paperResult.data.subject_id) {
      return reply.status(400).send({ error: "Question subject must match the exam paper subject" });
    }

    const { data, error } = await supabaseAdmin
      .from("paper_questions")
      .insert({
        exam_paper_id: request.params.paperId,
        question_id: request.body.question_id,
        order_index: normalizeOrderIndex(request.body.order_index),
        section: normalizeOptionalText(request.body.section),
        section_id: request.body.section_id ?? null,
        question_number: normalizeInteger(request.body.question_number),
      })
      .select("id, exam_paper_id, question_id, order_index, section, section_id, question_number, questions(id, stem, type, difficulty, marks, question_no, exam_path, topic_id)")
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return reply.status(201).send(data);
  });

  app.patch<{ Params: { id: string }; Body: { order_index?: number; section?: string; section_id?: string | null; question_number?: number | null } }>("/admin/paper-questions/:id", async (request, reply) => {
    const admin = await requireSuperAdmin(request, reply);
    if (!admin) return;

    const { data: existingLink, error: existingLinkError } = await supabaseAdmin
      .from("paper_questions")
      .select("id, exam_paper_id")
      .eq("id", request.params.id)
      .maybeSingle();

    if (existingLinkError) return reply.status(500).send({ error: existingLinkError.message });
    if (!existingLink) return reply.status(404).send({ error: "Paper-question link not found" });

    const attemptsError = await ensurePaperHasNoAttempts(existingLink.exam_paper_id);
    if (attemptsError) return reply.status(400).send({ error: attemptsError });

    const { data, error } = await supabaseAdmin
      .from("paper_questions")
      .update({
        order_index: request.body.order_index !== undefined ? normalizeOrderIndex(request.body.order_index) : undefined,
        section: request.body.section !== undefined ? normalizeOptionalText(request.body.section) : undefined,
        section_id: request.body.section_id !== undefined ? request.body.section_id : undefined,
        question_number: request.body.question_number !== undefined ? normalizeInteger(request.body.question_number) : undefined,
      })
      .eq("id", request.params.id)
      .select("id, exam_paper_id, question_id, order_index, section, section_id, question_number, questions(id, stem, type, difficulty, marks, question_no, exam_path, topic_id)")
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return data;
  });

  app.delete<{ Params: { id: string } }>("/admin/paper-questions/:id", async (request, reply) => {
    const admin = await requireSuperAdmin(request, reply);
    if (!admin) return;

    const { data: existingLink, error: existingLinkError } = await supabaseAdmin
      .from("paper_questions")
      .select("id, exam_paper_id")
      .eq("id", request.params.id)
      .maybeSingle();

    if (existingLinkError) return reply.status(500).send({ error: existingLinkError.message });
    if (!existingLink) return reply.status(404).send({ error: "Paper-question link not found" });

    const attemptsError = await ensurePaperHasNoAttempts(existingLink.exam_paper_id);
    if (attemptsError) return reply.status(400).send({ error: attemptsError });

    const { error } = await supabaseAdmin.from("paper_questions").delete().eq("id", request.params.id);
    if (error) return reply.status(400).send({ error: error.message });
    return { ok: true };
  });
}
