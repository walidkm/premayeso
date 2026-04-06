export type ContentTreeTopicDto = {
  id: string;
  name: string;
  code: string | null;
  description?: string | null;
  form_level?: string | null;
  exam_path?: string | null;
  order_index: number;
};

export type ContentTreeSubjectDto = {
  id: string;
  name: string;
  description?: string | null;
  code: string | null;
  exam_path?: string | null;
  order_index: number;
  topics: ContentTreeTopicDto[];
};

export type LessonAdminDto = {
  id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  content_type: "text" | "video" | "mixed" | null;
  tier_gate: "free" | "premium" | null;
  is_free_preview: boolean | null;
  order_index: number;
};

export type ApiErrorResponse = {
  error?: string;
};
