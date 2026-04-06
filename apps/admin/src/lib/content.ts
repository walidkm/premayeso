export const FORM_LEVEL_OPTIONS = ["F1", "F2", "F3", "F4"] as const;
export const PAPER_SOURCE_OPTIONS = ["maneb", "school", "teacher"] as const;
export const PAPER_TYPE_OPTIONS = ["maneb_past_paper", "school_exam", "question_pool"] as const;
export const PAPER_EXAM_MODE_OPTIONS = ["paper_layout", "randomized", "both"] as const;

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
