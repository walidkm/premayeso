export const EXAM_PATHS = ["JCE", "MSCE", "PSLCE"] as const;

export type ExamPath = (typeof EXAM_PATHS)[number];

export const DEFAULT_EXAM_PATH: ExamPath = "JCE";

export const EXAM_PATH_LABELS: Record<ExamPath, string> = {
  JCE: "Junior Certificate of Education",
  MSCE: "Malawi School Certificate of Education",
  PSLCE: "Primary School Leaving Certificate Examination",
};

export const EXAM_PATH_DESCRIPTIONS: Record<ExamPath, string> = {
  JCE: "Forms 1-2 learning content and practice",
  MSCE: "Forms 3-4 learning content and practice",
  PSLCE: "Primary leaving preparation and revision",
};

export function isExamPath(value: unknown): value is ExamPath {
  return value === "JCE" || value === "MSCE" || value === "PSLCE";
}

export function normalizeExamPath(value: unknown): ExamPath | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return isExamPath(normalized) ? normalized : null;
}
