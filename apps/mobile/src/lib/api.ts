import { getAccessToken } from "./auth";

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
  description: string | null;
};

export type Topic = {
  id: string;
  name: string;
  description: string | null;
  order_index: number;
};

export async function getSubjects(examPath?: string): Promise<Subject[]> {
  const url = examPath
    ? `${API_URL}/subjects?exam_path=${examPath}`
    : `${API_URL}/subjects`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch subjects");
  return res.json();
}

export async function setExamPathApi(examPath: string): Promise<void> {
  const extra = await authHeaders();
  await fetch(`${API_URL}/api/v1/auth/exam-path`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...extra },
    body: JSON.stringify({ exam_path: examPath }),
  });
}

export type Lesson = {
  id: string;
  title: string;
  content: string | null;
  order_index: number;
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
  paper_number: number | null;
  source_type: string | null;
  paper_type: string;
  exam_mode: string;
  exam_path: string | null;
  question_count: number;
};

export type PaperQuestion = {
  order_index: number;
  section: string | null;
  question: Question;
};

export async function getPapers(
  subjectId: string,
  examPath?: string
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
