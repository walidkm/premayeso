export const FORM_LEVEL_OPTIONS = ["F1", "F2", "F3", "F4"] as const;
export const PAPER_SOURCE_OPTIONS = ["maneb", "school", "teacher"] as const;
export const PAPER_TYPE_OPTIONS = ["maneb_past_paper", "school_exam", "question_pool"] as const;
export const PAPER_EXAM_MODE_OPTIONS = ["paper_layout", "randomized", "both"] as const;
export const LESSON_BLOCK_TYPE_OPTIONS = ["text", "video", "pdf"] as const;
export const VIDEO_PROVIDER_OPTIONS = ["youtube", "vimeo", "direct", "other"] as const;

export type LessonBlockType = (typeof LESSON_BLOCK_TYPE_OPTIONS)[number];
export type VideoProvider = (typeof VIDEO_PROVIDER_OPTIONS)[number];

export type ContentTreeTopicDto = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  form_level: string | null;
  exam_path: string | null;
  order_index: number;
};

export type ContentTreeSubjectDto = {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  exam_path: string | null;
  order_index: number;
  topics: ContentTreeTopicDto[];
};

export type LessonBlockAdminDto = {
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
};

export type LessonAdminDto = {
  id: string;
  topic_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  content_type: "text" | "video" | "mixed" | null;
  tier_gate: "free" | "premium" | null;
  is_free_preview: boolean | null;
  order_index: number;
  exam_path: string | null;
  lesson_blocks?: LessonBlockAdminDto[] | null;
};

export type ExamPaperAdminDto = {
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
  duration_min: number | null;
  is_sample: boolean;
  created_at: string;
  question_count?: number;
  paper_questions?: { id: string }[] | null;
  subjects?: { name: string | null; code: string | null } | null;
  schools?: { name: string | null } | null;
};

export type SchoolAdminDto = {
  id: string;
  name: string;
  created_at: string;
};

export type PaperQuestionAdminDto = {
  id: string;
  exam_paper_id: string;
  question_id: string;
  order_index: number;
  section: string | null;
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

export type QuestionAdminDto = {
  id: string;
  topic_id: string | null;
  stem: string;
  type: string;
  difficulty: string;
  marks: number;
  question_no: string | null;
  exam_path: string | null;
};

export function inferVideoProviderFromUrl(value: string | null | undefined): VideoProvider | null {
  const url = value?.trim();
  if (!url) return null;

  const lower = url.toLowerCase();
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "youtube";
  if (lower.includes("vimeo.com")) return "vimeo";

  const directExtensions = [".mp4", ".m4v", ".mov", ".webm", ".m3u8", ".ogg", ".ogv"];

  try {
    const parsed = new URL(url);
    if (directExtensions.some((extension) => parsed.pathname.toLowerCase().endsWith(extension))) {
      return "direct";
    }
  } catch {
    if (directExtensions.some((extension) => lower.includes(extension))) {
      return "direct";
    }
  }

  return "other";
}

export function sortLessonBlocks(blocks: LessonBlockAdminDto[] | null | undefined): LessonBlockAdminDto[] {
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

export function synthesizeLegacyLessonBlocks(
  lesson: Pick<LessonAdminDto, "id" | "content" | "video_url" | "content_type">
): LessonBlockAdminDto[] {
  const blocks: LessonBlockAdminDto[] = [];
  const contentType = lesson.content_type ?? "text";

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
    });
  }

  return blocks;
}

export function getPersistedLessonBlocks(lesson: Pick<LessonAdminDto, "lesson_blocks">): LessonBlockAdminDto[] {
  return sortLessonBlocks(lesson.lesson_blocks);
}

export function getResolvedLessonBlocks(lesson: LessonAdminDto): LessonBlockAdminDto[] {
  const persistedBlocks = getPersistedLessonBlocks(lesson);
  return persistedBlocks.length > 0 ? persistedBlocks : synthesizeLegacyLessonBlocks(lesson);
}

export function getLessonContentMode(lesson: LessonAdminDto): "structured" | "legacy" | "empty" {
  if (getPersistedLessonBlocks(lesson).length > 0) return "structured";
  if (synthesizeLegacyLessonBlocks(lesson).length > 0) return "legacy";
  return "empty";
}

export function getVideoProviderLabel(provider: VideoProvider | null | undefined): string {
  switch (provider) {
    case "youtube":
      return "YouTube";
    case "vimeo":
      return "Vimeo";
    case "direct":
      return "Direct";
    case "other":
      return "External";
    default:
      return "Video";
  }
}
