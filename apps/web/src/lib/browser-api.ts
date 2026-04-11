import { getApiUrl } from "./app-config";
import { type ExamPath } from "./exam-paths";

export type StudentIdentity = {
  id: string;
  phone: string | null;
  identifier: string | null;
  name: string | null;
  full_name: string | null;
  role: string;
  exam_path: string | null;
  subscription_status: string;
  admin_permissions: {
    can_author_content: boolean;
    can_review_content: boolean;
    can_manage_platform: boolean;
  } | null;
};

export type Subject = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  exam_path: ExamPath | null;
  order_index: number;
};

export type Topic = {
  id: string;
  subject_id?: string;
  name: string;
  description: string | null;
  form_level: string | null;
  exam_path: ExamPath | null;
  order_index: number;
};

export type Lesson = {
  id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  content_type: "text" | "video" | "mixed";
  order_index: number;
};

export type LessonBlock = {
  id: string;
  lesson_id: string;
  block_type: "text" | "video" | "pdf";
  title: string | null;
  text_content: string | null;
  video_url: string | null;
  video_provider: "youtube" | "vimeo" | "direct" | "other" | null;
  file_url?: string | null;
  order_index: number;
};

export type LessonDetail = {
  id: string;
  topic_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  content_type: "text" | "video" | "mixed";
  tier_gate: "free" | "premium" | null;
  is_free_preview: boolean | null;
  exam_path: ExamPath | null;
  blocks: LessonBlock[];
};

export type ExamPaper = {
  id: string;
  title: string | null;
  year: number | null;
  session?: string | null;
  paper_number: number | null;
  paper_code?: string | null;
  source_type: string | null;
  paper_type: string;
  exam_mode: string;
  exam_path: string | null;
  duration_min?: number | null;
  total_marks?: number | null;
  instructions?: string | null;
  question_count: number;
  section_count?: number;
};

async function requestJson<T>(pathname: string): Promise<T> {
  const response = await fetch(getApiUrl(pathname), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Request failed");
  }

  return (await response.json()) as T;
}

export async function fetchSubjects(examPath: ExamPath): Promise<Subject[]> {
  return requestJson<Subject[]>(`/subjects?exam_path=${examPath}`);
}

export async function fetchSubject(subjectId: string): Promise<Subject> {
  return requestJson<Subject>(`/subjects/${subjectId}`);
}

export async function fetchTopics(subjectId: string): Promise<Topic[]> {
  return requestJson<Topic[]>(`/subjects/${subjectId}/topics`);
}

export async function fetchTopic(topicId: string): Promise<Topic> {
  return requestJson<Topic>(`/topics/${topicId}`);
}

export async function fetchLessons(topicId: string): Promise<Lesson[]> {
  return requestJson<Lesson[]>(`/topics/${topicId}/lessons`);
}

export async function fetchLessonDetail(lessonId: string): Promise<LessonDetail> {
  return requestJson<LessonDetail>(`/lessons/${lessonId}`);
}

export async function fetchSubjectPapers(
  subjectId: string,
  examPath: ExamPath
): Promise<ExamPaper[]> {
  return requestJson<ExamPaper[]>(
    `/subjects/${subjectId}/papers?exam_path=${examPath}`
  );
}
