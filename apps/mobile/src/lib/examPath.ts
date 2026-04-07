export const EXAM_PATHS = ["JCE", "MSCE"] as const;

export type ExamPath = (typeof EXAM_PATHS)[number];

export const DEFAULT_EXAM_PATH: ExamPath = "JCE";

export const EXAM_PATH_LABELS: Record<ExamPath, string> = {
  JCE: "Junior Certificate of Education",
  MSCE: "Malawi School Certificate of Education",
};

export const EXAM_PATH_DESCRIPTIONS: Record<ExamPath, string> = {
  JCE: "Forms 1-2 learning content and practice",
  MSCE: "Forms 3-4 learning content and practice",
};

export function isExamPath(value: unknown): value is ExamPath {
  return value === "JCE" || value === "MSCE";
}

export function normalizeExamPath(value: unknown): ExamPath | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return isExamPath(normalized) ? normalized : null;
}
