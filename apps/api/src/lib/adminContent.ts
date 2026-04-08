import { supabaseAdmin } from "./supabaseAdmin.js";

export const ALL_EXAM_PATHS = ["JCE", "MSCE", "PSLCE"] as const;
export const PAPER_SOURCE_TYPES = ["maneb", "school", "teacher"] as const;
export const PAPER_TYPES = ["maneb_past_paper", "school_exam", "question_pool"] as const;
export const PAPER_EXAM_MODES = ["paper_layout", "randomized", "both"] as const;
export const LESSON_CONTENT_TYPES = ["text", "video", "mixed"] as const;
export const LESSON_BLOCK_TYPES = ["text", "video", "pdf"] as const;
export const LESSON_BLOCK_TYPES = ["text", "video"] as const;
export const VIDEO_PROVIDERS = ["youtube", "vimeo", "direct", "other"] as const;
export const LESSON_FILES_BUCKET = "lesson-files";

export type ExamPath = (typeof ALL_EXAM_PATHS)[number];
export type PaperSourceType = (typeof PAPER_SOURCE_TYPES)[number];
export type PaperType = (typeof PAPER_TYPES)[number];
export type PaperExamMode = (typeof PAPER_EXAM_MODES)[number];
export type LessonContentType = (typeof LESSON_CONTENT_TYPES)[number];
export type LessonBlockType = (typeof LESSON_BLOCK_TYPES)[number];
export type VideoProvider = (typeof VIDEO_PROVIDERS)[number];

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
  content_type: LessonContentType | null;
  tier_gate: "free" | "premium" | null;
  is_free_preview: boolean | null;
  order_index: number;
  exam_path: ExamPath | null;
};

export type LessonBlockRow = {
  id: string;
  lesson_id: string;
  block_type: LessonBlockType;
  title: string | null;
  text_content: string | null;
  video_url: string | null;
  video_provider: VideoProvider | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  file_url?: string | null;
};

export type LessonWithBlocksRow = LessonRow & {
  lesson_blocks?: LessonBlockRow[] | null;
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

export function normalizeLessonContentType(value: string | null | undefined): LessonContentType | null {
  return LESSON_CONTENT_TYPES.find((candidate) => candidate === value) ?? null;
}

export function normalizeLessonBlockType(value: string | null | undefined): LessonBlockType | null {
  return LESSON_BLOCK_TYPES.find((candidate) => candidate === value) ?? null;
}

export function normalizeVideoProvider(value: string | null | undefined): VideoProvider | null {
  return VIDEO_PROVIDERS.find((candidate) => candidate === value) ?? null;
}

export function inferVideoProviderFromUrl(value: string | null | undefined): VideoProvider | null {
  const url = normalizeOptionalText(value);
  if (!url) return null;

  const lower = url.toLowerCase();
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) {
    return "youtube";
  }

  if (lower.includes("vimeo.com")) {
    return "vimeo";
  }

  const directExtensions = [".mp4", ".m4v", ".mov", ".webm", ".m3u8", ".ogg", ".ogv"];

  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    if (directExtensions.some((extension) => pathname.endsWith(extension))) {
      return "direct";
    }
  } catch {
    if (directExtensions.some((extension) => lower.includes(extension))) {
      return "direct";
    }
  }

  return "other";
}

export function sortLessonBlocks(blocks: LessonBlockRow[] | null | undefined): LessonBlockRow[] {
  return [...(blocks ?? [])].sort((left, right) => {
    if (left.order_index !== right.order_index) {
      return left.order_index - right.order_index;
    }

    if (left.created_at !== right.created_at) {
      return left.created_at.localeCompare(right.created_at);
    }

    return left.id.localeCompare(right.id);
  });
}

const LEGACY_BLOCK_TIMESTAMP = "1970-01-01T00:00:00.000Z";

export function buildLegacyLessonBlocks(
  lesson: Pick<LessonRow, "id" | "content" | "video_url" | "content_type">
): LessonBlockRow[] {
  const blocks: LessonBlockRow[] = [];
  const contentType = normalizeLessonContentType(lesson.content_type) ?? "text";

  if ((contentType === "text" || contentType === "mixed") && lesson.content) {
    blocks.push({
      id: `legacy-text-${lesson.id}`,
      lesson_id: lesson.id,
      block_type: "text",
      title: null,
      text_content: lesson.content,
      video_url: null,
      video_provider: null,
      file_path: null,
      file_name: null,
      file_size: null,
      order_index: blocks.length,
      created_at: LEGACY_BLOCK_TIMESTAMP,
      updated_at: LEGACY_BLOCK_TIMESTAMP,
      file_url: null,
    });
  }

  if ((contentType === "video" || contentType === "mixed") && lesson.video_url) {
    blocks.push({
      id: `legacy-video-${lesson.id}`,
      lesson_id: lesson.id,
      block_type: "video",
      title: null,
      text_content: null,
      video_url: lesson.video_url,
      video_provider: inferVideoProviderFromUrl(lesson.video_url) ?? "other",
      file_path: null,
      file_name: null,
      file_size: null,
      order_index: blocks.length,
      created_at: LEGACY_BLOCK_TIMESTAMP,
      updated_at: LEGACY_BLOCK_TIMESTAMP,
      file_url: null,
    });
  }

  return blocks;
}

export function resolveLessonBlocks(
  lesson: Pick<LessonRow, "id" | "content" | "video_url" | "content_type"> & {
    lesson_blocks?: LessonBlockRow[] | null;
  }
): LessonBlockRow[] {
  const persistedBlocks = sortLessonBlocks(lesson.lesson_blocks);
  return persistedBlocks.length > 0 ? persistedBlocks : buildLegacyLessonBlocks(lesson);
}

export async function withSignedLessonBlockUrls(
  blocks: LessonBlockRow[] | null | undefined
): Promise<LessonBlockRow[]> {
  return Promise.all(
    (blocks ?? []).map(async (block) => {
      if (block.block_type !== "pdf" || !block.file_path) {
        return { ...block, file_url: null };
      }

      const { data, error } = await supabaseAdmin.storage
        .from(LESSON_FILES_BUCKET)
        .createSignedUrl(block.file_path, 60 * 60);

      return {
        ...block,
        file_url: error ? null : data.signedUrl,
      };
    })
  );
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
    .select("*")
    .eq("id", lessonId)
    .maybeSingle();

  return { data: (data as LessonRow | null) ?? null, error: error?.message ?? null };
}

export async function getLessonBlock(blockId: string): Promise<{ data: LessonBlockRow | null; error: string | null }> {
  const { data, error } = await supabaseAdmin
    .from("lesson_blocks")
    .select("id, lesson_id, block_type, title, text_content, video_url, video_provider, file_path, file_name, file_size, order_index, created_at, updated_at")
    .select("id, lesson_id, block_type, title, text_content, video_url, video_provider, order_index, created_at, updated_at")
    .eq("id", blockId)
    .maybeSingle();

  return { data: (data as LessonBlockRow | null) ?? null, error: error?.message ?? null };
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
