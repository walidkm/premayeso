export const EXAM_PATHS = ["JCE", "MSCE", "PSLCE"] as const;

export type ExamPath = (typeof EXAM_PATHS)[number];

export const EXAM_PATH_COPY: Record<
  ExamPath,
  {
    label: string;
    description: string;
    status: "live" | "waitlist";
  }
> = {
  JCE: {
    label: "Junior Certificate of Education",
    description: "Live now with lessons, subject guides, and revision support designed for Forms 1 and 2.",
    status: "live",
  },
  MSCE: {
    label: "Malawi School Certificate of Education",
    description: "Next in line. Join the waitlist to hear when senior-secondary lessons and papers open.",
    status: "waitlist",
  },
  PSLCE: {
    label: "Primary School Leaving Certificate of Education",
    description: "Planned next. Register interest early so the rollout can be prioritized around demand.",
    status: "waitlist",
  },
};

export function isExamPath(value: unknown): value is ExamPath {
  return typeof value === "string" && (EXAM_PATHS as readonly string[]).includes(value);
}

export function normalizeExamPath(value: unknown): ExamPath | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return isExamPath(normalized) ? normalized : null;
}
