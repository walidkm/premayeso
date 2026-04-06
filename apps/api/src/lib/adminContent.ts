import { supabaseAdmin } from "./supabaseAdmin.js";

export const ALL_EXAM_PATHS = ["JCE", "MSCE", "PSLCE"] as const;
export const PAPER_SOURCE_TYPES = ["maneb", "school", "teacher"] as const;
export const PAPER_TYPES = ["maneb_past_paper", "school_exam", "question_pool"] as const;
export const PAPER_EXAM_MODES = ["paper_layout", "randomized", "both"] as const;

export type ExamPath = (typeof ALL_EXAM_PATHS)[number];
export type PaperSourceType = (typeof PAPER_SOURCE_TYPES)[number];
export type PaperType = (typeof PAPER_TYPES)[number];
export type PaperExamMode = (typeof PAPER_EXAM_MODES)[number];

export type SubjectRow = {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  exam_path: ExamPath | null;
  order_index: number;
};

export type TopicRow = {
  id: string;
  subject_id: string;
  name: string;
  description: string | null;
  code: string | null;
  form_level: string | null;
  exam_path: ExamPath | null;
  order_index: number;
};

export type LessonRow = {
  id: string;
  topic_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  content_type: "text" | "video" | "mixed" | null;
  tier_gate: "free" | "premium" | null;
  is_free_preview: boolean | null;
  order_index: number;
  exam_path: ExamPath | null;
};

export type ExamPaperRow = {
  id: string;
  exam_path: ExamPath | null;
  subject_id: string | null;
  school_id: string | null;
  source_type: PaperSourceType;
  paper_type: PaperType;
  exam_mode: PaperExamMode;
  title: string | null;
  year: number | null;
  paper_number: number | null;
  term: string | null;
  duration_min: number | null;
  is_sample: boolean;
  created_at: string;
};

export type QuestionRow = {
  id: string;
  topic_id: string | null;
  stem: string;
  type: string;
  difficulty: string;
  marks: number;
  question_no: string | null;
  exam_path: ExamPath | null;
};

export function normalizeExamPath(value: string | null | undefined): ExamPath | null {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "JCE" || normalized === "MSCE" || normalized === "PSLCE") {
    return normalized;
  }

  return null;
}

export function normalizeOptionalText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeRequiredText(value: string | null | undefined): string | null {
  return normalizeOptionalText(value);
}

export function normalizeInteger(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null;
}

export function normalizeOrderIndex(value: number | null | undefined): number {
  return normalizeInteger(value) ?? 0;
}

export function normalizeSourceType(value: string | null | undefined): PaperSourceType | null {
  return PAPER_SOURCE_TYPES.find((candidate) => candidate === value) ?? null;
}

export function normalizePaperType(value: string | null | undefined): PaperType | null {
  return PAPER_TYPES.find((candidate) => candidate === value) ?? null;
}

export function normalizeExamMode(value: string | null | undefined): PaperExamMode | null {
  return PAPER_EXAM_MODES.find((candidate) => candidate === value) ?? null;
}

export async function getSubject(subjectId: string): Promise<{ data: SubjectRow | null; error: string | null }> {
  const { data, error } = await supabaseAdmin
    .from("subjects")
    .select("id, name, description, code, exam_path, order_index")
    .eq("id", subjectId)
    .maybeSingle();

  return { data: (data as SubjectRow | null) ?? null, error: error?.message ?? null };
}

export async function getTopic(topicId: string): Promise<{ data: TopicRow | null; error: string | null }> {
  const { data, error } = await supabaseAdmin
    .from("topics")
    .select("id, subject_id, name, description, code, form_level, exam_path, order_index")
    .eq("id", topicId)
    .maybeSingle();

  return { data: (data as TopicRow | null) ?? null, error: error?.message ?? null };
}

export async function getLesson(lessonId: string): Promise<{ data: LessonRow | null; error: string | null }> {
  const { data, error } = await supabaseAdmin
    .from("lessons")
    .select("id, topic_id, title, content, video_url, content_type, tier_gate, is_free_preview, order_index, exam_path")
    .eq("id", lessonId)
    .maybeSingle();

  return { data: (data as LessonRow | null) ?? null, error: error?.message ?? null };
}

export async function getExamPaper(paperId: string): Promise<{ data: ExamPaperRow | null; error: string | null }> {
  const { data, error } = await supabaseAdmin
    .from("exam_papers")
    .select("id, exam_path, subject_id, school_id, source_type, paper_type, exam_mode, title, year, paper_number, term, duration_min, is_sample, created_at")
    .eq("id", paperId)
    .maybeSingle();

  return { data: (data as ExamPaperRow | null) ?? null, error: error?.message ?? null };
}

export async function getQuestion(questionId: string): Promise<{ data: QuestionRow | null; error: string | null }> {
  const { data, error } = await supabaseAdmin
    .from("questions")
    .select("id, topic_id, stem, type, difficulty, marks, question_no, exam_path")
    .eq("id", questionId)
    .maybeSingle();

  return { data: (data as QuestionRow | null) ?? null, error: error?.message ?? null };
}

export async function ensureSchoolExists(schoolId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.from("schools").select("id").eq("id", schoolId).maybeSingle();
  if (error) return error.message;
  if (!data) return "School not found";
  return null;
}

export async function getQuestionSubjectId(question: QuestionRow): Promise<{ subjectId: string | null; error: string | null }> {
  if (!question.topic_id) {
    return { subjectId: null, error: "Question is not attached to a topic" };
  }

  const topicResult = await getTopic(question.topic_id);
  if (topicResult.error) return { subjectId: null, error: topicResult.error };
  if (!topicResult.data) return { subjectId: null, error: "Question topic not found" };

  return { subjectId: topicResult.data.subject_id, error: null };
}
