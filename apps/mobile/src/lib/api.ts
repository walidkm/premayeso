import { getAccessToken } from "./auth";
import { type ExamPath } from "./examPath";

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

// ── Auth headers helper ────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

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
  name: string;
  description: string | null;
  form_level: string | null;
  exam_path: ExamPath | null;
  order_index: number;
};

export async function getSubjects(examPath?: ExamPath): Promise<Subject[]> {
  const url = examPath
    ? `${API_URL}/subjects?exam_path=${examPath}`
    : `${API_URL}/subjects`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch subjects");
  return res.json();
}

export async function setExamPathApi(examPath: ExamPath): Promise<void> {
  const extra = await authHeaders();
  const res = await fetch(`${API_URL}/api/v1/auth/exam-path`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...extra },
    body: JSON.stringify({ exam_path: examPath }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Failed to update exam level");
  }
}

export type AuthMe = {
  id: string;
  phone: string | null;
  full_name: string | null;
  role: string;
  exam_path: string | null;
  subscription_status: string;
};

export async function getMe(): Promise<AuthMe> {
  const extra = await authHeaders();
  const res = await fetch(`${API_URL}/api/v1/auth/me`, {
    headers: extra,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Failed to fetch current user");
  }
  return res.json();
}

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
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  file_url: string | null;
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
  order_index: number;
  exam_path: ExamPath | null;
  blocks: LessonBlock[];
};

export async function getTopics(subjectId: string): Promise<Topic[]> {
  const res = await fetch(`${API_URL}/subjects/${subjectId}/topics`);
  if (!res.ok) throw new Error("Failed to fetch topics");
  return res.json();
}

export type QuestionOption = { key: string; text: string };

export type QuestionSource = {
  school: string;
  year: number;
  term: string | null;
  paper_number: number | null;
  source_type: string | null;
  title: string | null;
};

export type Question = {
  id: string;
  topic_id: string;
  lesson_id: string | null;
  stem: string;
  options: QuestionOption[];
  explanation: string | null;
  hints: string[] | null;
  tier_gate: "free" | "premium" | null;
  marks: number | null;
  source: QuestionSource | null;
};

export type CheckResult = {
  correct: boolean;
  correctOption: string;
  explanation: string | null;
};

export async function getLessons(topicId: string): Promise<Lesson[]> {
  const res = await fetch(`${API_URL}/topics/${topicId}/lessons`);
  if (!res.ok) throw new Error("Failed to fetch lessons");
  return res.json();
}

export async function getLessonDetail(lessonId: string): Promise<LessonDetail> {
  const res = await fetch(`${API_URL}/lessons/${lessonId}`);
  if (!res.ok) throw new Error("Failed to fetch lesson detail");
  return res.json();
}

export async function getQuestions(topicId: string): Promise<Question[]> {
  const res = await fetch(`${API_URL}/topics/${topicId}/questions`);
  if (!res.ok) throw new Error("Failed to fetch questions");
  return res.json();
}

export async function checkAnswer(
  questionId: string,
  chosenOption: string
): Promise<CheckResult> {
  const res = await fetch(`${API_URL}/questions/${questionId}/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chosenOption }),
  });
  if (!res.ok) throw new Error("Failed to check answer");
  return res.json();
}

export async function saveQuizAttempt(attempt: {
  user_id: string | null;
  topic_id: string;
  score: number;
  total: number;
  answers: { question_id: string; chosen: string; correct: boolean }[];
}): Promise<void> {
  const extra = await authHeaders();
  await fetch(`${API_URL}/quiz-attempts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...extra },
    body: JSON.stringify(attempt),
  });
}

// ── Past papers ───────────────────────────────────────────────

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
  has_sections?: boolean;
  marking_mode?: string;
  solution_unlock_mode?: string;
  question_mode?: string;
  status?: string;
  question_count: number;
  section_count?: number;
};

export type PaperQuestion = {
  id?: string;
  order_index: number;
  section: string | null;
  section_id?: string | null;
  question_number?: number | null;
  question: Question;
};

export type PaperSection = {
  id: string;
  section_code: string;
  title: string | null;
  instructions: string | null;
  order_index: number;
  question_selection_mode: "answer_all" | "answer_any_n";
  required_count: number | null;
  max_marks: number | null;
};

export type ExamPaperDetail = ExamPaper & {
  subjects?: { name: string | null; code: string | null } | null;
  paper_sections: PaperSection[];
};

export type PaperAttempt = {
  id: string;
  exam_paper_id: string;
  status: string;
  marking_status: string;
  time_limit_seconds: number | null;
  started_at: string;
  expires_at: string;
  submitted_at: string | null;
  finalized_at: string | null;
  objective_score: number | null;
  final_score: number | null;
  max_score: number | null;
};

export type PaperAttemptQuestionSummary = {
  id: string;
  questionNumber: number;
  type: string;
  marks: number;
  answered: boolean;
  pendingManual: boolean;
  score: number | null;
  maxScore: number;
  question: {
    id: string;
    stem: string;
    type: string;
    explanation: string | null;
    expectedAnswer: string | null;
  };
};

export type PaperAttemptSectionSummary = {
  id: string;
  sectionCode: string;
  title: string | null;
  instructions: string | null;
  questionSelectionMode: "answer_all" | "answer_any_n";
  requiredCount: number | null;
  questionCount: number;
  answeredCount: number;
  pendingManualCount: number;
  score: number;
  maxScore: number;
  questions: PaperAttemptQuestionSummary[];
};

export type PaperAttemptSummary = {
  attempt: PaperAttempt;
  paper: ExamPaperDetail;
  sections: PaperAttemptSectionSummary[];
  revealSolutions: boolean;
  firstQuestionId?: string | null;
  questionCount?: number;
  remainingSeconds?: number;
};

export type PaperAttemptQuestionPart = {
  id: string;
  partLabel: string;
  body: string;
  marks: number;
  autoMarkingMode: string;
  options: QuestionOption[];
};

export type PaperAttemptQuestion = {
  id: string;
  questionNumber: number;
  sectionCode: string | null;
  sectionId: string | null;
  orderIndex: number;
  marks: number;
  type: string;
  difficulty: string;
  stem: string;
  options: QuestionOption[];
  allowShuffle: boolean;
  remainingSeconds: number;
  answers: Array<{
    questionPartId: string | null;
    selectedOption: string | null;
    textAnswer: string | null;
    numericAnswer: number | null;
    answerPayload: Record<string, unknown> | null;
  }>;
  parts: PaperAttemptQuestionPart[];
};

export async function getPapers(
  subjectId: string,
  examPath?: ExamPath
): Promise<ExamPaper[]> {
  const url = examPath
    ? `${API_URL}/subjects/${subjectId}/papers?exam_path=${examPath}`
    : `${API_URL}/subjects/${subjectId}/papers`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch papers");
  return res.json();
}

export async function getPaperQuestions(
  paperId: string
): Promise<PaperQuestion[]> {
  const res = await fetch(`${API_URL}/papers/${paperId}/questions`);
  if (!res.ok) throw new Error("Failed to fetch paper questions");
  return res.json();
}

export async function getPaperDetail(paperId: string): Promise<ExamPaperDetail> {
  const res = await fetch(`${API_URL}/papers/${paperId}`);
  if (!res.ok) throw new Error("Failed to fetch paper details");
  return res.json();
}

export async function startPaperAttemptApi(paperId: string): Promise<{
  attempt: PaperAttempt;
  paper: ExamPaperDetail;
  sections: PaperSection[];
  firstQuestionId: string | null;
  questionCount: number;
}> {
  const extra = await authHeaders();
  const res = await fetch(`${API_URL}/papers/${paperId}/attempts`, {
    method: "POST",
    headers: extra,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Failed to start paper attempt");
  }
  return res.json();
}

export async function getPaperAttempt(attemptId: string): Promise<PaperAttemptSummary> {
  const extra = await authHeaders();
  const res = await fetch(`${API_URL}/paper-attempts/${attemptId}`, {
    headers: extra,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Failed to fetch paper attempt");
  }
  return res.json();
}

export async function getPaperAttemptQuestion(
  attemptId: string,
  paperQuestionId: string
): Promise<{
  paper: ExamPaperDetail;
  section: PaperSection | null;
  question: PaperAttemptQuestion;
}> {
  const extra = await authHeaders();
  const res = await fetch(`${API_URL}/paper-attempts/${attemptId}/questions/${paperQuestionId}`, {
    headers: extra,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Failed to fetch attempt question");
  }
  return res.json();
}

export async function savePaperAttemptAnswer(
  attemptId: string,
  paperQuestionId: string,
  payload: {
    selectedOption?: string | null;
    textAnswer?: string | null;
    numericAnswer?: number | null;
    answerPayload?: Record<string, unknown> | null;
    partAnswers?: Array<{
      questionPartId?: string;
      partLabel?: string;
      selectedOption?: string | null;
      textAnswer?: string | null;
      numericAnswer?: number | null;
      answerPayload?: Record<string, unknown> | null;
    }>;
  }
): Promise<void> {
  const extra = await authHeaders();
  const res = await fetch(`${API_URL}/paper-attempts/${attemptId}/answers/${paperQuestionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...extra },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Failed to save answer");
  }
}

export async function submitPaperAttemptApi(
  attemptId: string,
  selectedQuestionIdsBySection?: Record<string, string[]>
): Promise<PaperAttemptSummary> {
  const extra = await authHeaders();
  const res = await fetch(`${API_URL}/paper-attempts/${attemptId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...extra },
    body: JSON.stringify({
      selected_question_ids_by_section: selectedQuestionIdsBySection ?? {},
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const payload = body as {
      error?: string;
      validationErrors?: Array<{
        sectionId: string;
        sectionCode: string;
        message: string;
        answeredQuestionIds?: string[];
      }>;
    };
    const error = new Error(payload.error ?? "Failed to submit paper") as Error & {
      validationErrors?: typeof payload.validationErrors;
    };
    error.validationErrors = payload.validationErrors;
    throw error;
  }
  return body as PaperAttemptSummary;
}

export async function getPaperAttemptReview(attemptId: string): Promise<PaperAttemptSummary> {
  const extra = await authHeaders();
  const res = await fetch(`${API_URL}/paper-attempts/${attemptId}/review`, {
    headers: extra,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Failed to fetch review");
  }
  return res.json();
}

// ── Auth API ──────────────────────────────────────────────────

export async function requestOtp(phone: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/auth/request-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Failed to send OTP");
  }
}

export type AuthResult = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; phone: string; role: string };
};

export async function verifyOtp(
  phone: string,
  otp: string,
  name?: string
): Promise<AuthResult> {
  const res = await fetch(`${API_URL}/api/v1/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, otp, name }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "OTP verification failed");
  }
  return res.json();
}

export async function refreshTokens(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new Error("Token refresh failed");
  return res.json();
}
