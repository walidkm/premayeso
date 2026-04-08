export const FORM_LEVEL_OPTIONS = ["F1", "F2", "F3", "F4"] as const;
export const PAPER_SOURCE_OPTIONS = ["maneb", "school", "teacher"] as const;
export const PAPER_TYPE_OPTIONS = ["maneb_past_paper", "school_exam", "question_pool"] as const;
export const PAPER_EXAM_MODE_OPTIONS = ["paper_layout", "randomized", "both"] as const;
export const PAPER_MARKING_MODE_OPTIONS = ["auto", "manual", "hybrid"] as const;
export const PAPER_SOLUTION_UNLOCK_MODE_OPTIONS = ["never", "after_submit", "after_marked", "always"] as const;
export const PAPER_QUESTION_MODE_OPTIONS = ["one_question_at_a_time", "full_paper"] as const;
export const PAPER_STATUS_OPTIONS = ["draft", "published", "archived"] as const;
export const PAPER_SECTION_SELECTION_MODE_OPTIONS = ["answer_all", "answer_any_n"] as const;
export const QUESTION_AUTO_MARKING_MODE_OPTIONS = ["exact", "keyword", "manual", "hybrid"] as const;
export const LESSON_BLOCK_TYPE_OPTIONS = ["text", "video", "pdf"] as const;
export const VIDEO_PROVIDER_OPTIONS = ["youtube", "vimeo", "direct", "other"] as const;

export type LessonBlockType = (typeof LESSON_BLOCK_TYPE_OPTIONS)[number];
export type VideoProvider = (typeof VIDEO_PROVIDER_OPTIONS)[number];
export type PaperMarkingMode = (typeof PAPER_MARKING_MODE_OPTIONS)[number];
export type PaperSolutionUnlockMode = (typeof PAPER_SOLUTION_UNLOCK_MODE_OPTIONS)[number];
export type PaperQuestionMode = (typeof PAPER_QUESTION_MODE_OPTIONS)[number];
export type PaperStatus = (typeof PAPER_STATUS_OPTIONS)[number];
export type PaperSectionSelectionMode = (typeof PAPER_SECTION_SELECTION_MODE_OPTIONS)[number];
export type QuestionAutoMarkingMode = (typeof QUESTION_AUTO_MARKING_MODE_OPTIONS)[number];

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
  file_url?: string | null;
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
  session: string | null;
  paper_code: string | null;
  duration_min: number | null;
  total_marks: number | null;
  instructions: string | null;
  has_sections: boolean;
  marking_mode: PaperMarkingMode;
  solution_unlock_mode: PaperSolutionUnlockMode;
  question_mode: PaperQuestionMode;
  status: PaperStatus;
  is_sample: boolean;
  created_at: string;
  updated_at: string | null;
  question_count?: number;
  section_count?: number;
  paper_questions?: { id: string }[] | null;
  paper_sections?: { id: string }[] | null;
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
  section_id: string | null;
  question_number: number | null;
  questions: {
    id: string;
    stem: string;
    type: string;
    difficulty: string | null;
    marks: number | null;
    question_no: string | null;
    exam_path: string | null;
    topic_id: string | null;
  } | null;
};

export type QuestionAdminDto = {
  id: string;
  topic_id: string | null;
  subtopic_id?: string | null;
  stem: string;
  type: string;
  difficulty: string | null;
  marks: number | null;
  question_no: string | null;
  exam_path: string | null;
  explanation?: string | null;
  expected_answer?: string | null;
  allow_shuffle?: boolean;
  rubric_id?: string | null;
  auto_marking_mode?: QuestionAutoMarkingMode;
  options?: Array<{ key: string; text: string; distractorExplanation?: string | null }> | null;
  question_parts?: PaperQuestionPartAdminDto[] | null;
};

export type PaperSectionAdminDto = {
  id: string;
  exam_paper_id: string;
  section_code: string;
  title: string | null;
  instructions: string | null;
  order_index: number;
  question_selection_mode: PaperSectionSelectionMode;
  required_count: number | null;
  max_marks: number | null;
  starts_at_question_number: number | null;
  ends_at_question_number: number | null;
  updated_at: string | null;
};

export type PaperQuestionPartAdminDto = {
  id?: string;
  question_id?: string;
  part_label: string;
  body: string;
  marks: number;
  expected_answer: string | null;
  rubric_id: string | null;
  auto_marking_mode: QuestionAutoMarkingMode;
  order_index: number;
  options?: Array<{ key: string; text: string; distractorExplanation?: string | null }> | null;
  correct_option?: string | null;
};

export type PaperStructureQuestionAdminDto = PaperQuestionAdminDto & {
  questions: QuestionAdminDto & {
    question_parts?: PaperQuestionPartAdminDto[] | null;
  };
};

export type PaperStructureAdminDto = {
  paper: ExamPaperAdminDto;
  sections: PaperSectionAdminDto[];
  questions: PaperStructureQuestionAdminDto[];
};

export type EssayRubricCriterionAdminDto = {
  id: string;
  rubric_id?: string;
  criterion_name: string;
  max_marks: number;
  mark_bands: Array<{ key: string; value: string }>;
  order_index: number;
};

export type EssayRubricAdminDto = {
  id: string;
  rubric_code: string | null;
  exam_path: string | null;
  subject_id: string | null;
  title: string;
  description: string | null;
  total_marks: number;
  updated_at: string | null;
  essay_rubric_criteria: EssayRubricCriterionAdminDto[];
};

export type MarkingQueueItemAdminDto = {
  id: string;
  exam_paper_id: string;
  user_id: string | null;
  status: string;
  marking_status: string;
  started_at: string;
  submitted_at: string | null;
  objective_score: number | null;
  final_score: number | null;
  max_score: number | null;
  exam_papers: {
    id: string;
    title: string | null;
    year: number | null;
    paper_number: number | null;
    exam_path: string | null;
    paper_code: string | null;
    subjects: { name: string | null; code: string | null } | null;
  } | null;
  users: {
    id: string;
    full_name: string | null;
    phone: string | null;
  } | null;
};

export type AttemptAnswerAdminDto = {
  id: string;
  paper_attempt_id: string;
  paper_question_id: string;
  question_id: string | null;
  question_part_id: string | null;
  selected_option: string | null;
  text_answer: string | null;
  numeric_answer: number | null;
  answer_payload: Record<string, unknown> | null;
  answer_status: string;
  is_selected_for_marking: boolean;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AnswerMarkAdminDto = {
  id: string;
  paper_attempt_id: string;
  attempt_answer_id: string;
  criterion_id: string | null;
  marker_type: string;
  score: number | null;
  suggested_score: number | null;
  final_score: number | null;
  comment: string | null;
  moderation_status: string;
  created_at: string;
  updated_at: string;
};

export type EssayMarkingReviewAdminDto = {
  id: string;
  paper_attempt_id: string;
  paper_question_id: string | null;
  attempt_answer_id: string;
  reviewer_user_id: string;
  marker_mode: string;
  status: string;
  overall_comment: string | null;
  suggested_total: number | null;
  final_total: number | null;
  finalized_at: string | null;
  updated_at: string;
};

export type MarkingDetailAdminDto = {
  attempt: {
    id: string;
    exam_paper_id: string;
    user_id: string | null;
    status: string;
    marking_status: string;
    time_limit_seconds: number | null;
    started_at: string;
    expires_at: string;
    submitted_at: string | null;
    finalized_at: string | null;
    objective_score: number | null;
    manual_score: number | null;
    final_score: number | null;
    max_score: number | null;
  };
  structure: PaperStructureAdminDto;
  answers: AttemptAnswerAdminDto[];
  marks: AnswerMarkAdminDto[];
  reviews: EssayMarkingReviewAdminDto[];
  rubrics: EssayRubricAdminDto[];
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
