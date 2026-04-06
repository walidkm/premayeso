const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

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

export async function getSubjects(): Promise<Subject[]> {
  const res = await fetch(`${API_URL}/subjects`);
  if (!res.ok) throw new Error("Failed to fetch subjects");
  return res.json();
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
  await fetch(`${API_URL}/quiz-attempts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(attempt),
  });
}
