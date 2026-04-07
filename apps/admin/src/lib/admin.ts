export const ADMIN_UI_EXAM_PATHS = ["JCE", "MSCE"] as const;
export const ALL_EXAM_PATHS = ["JCE", "MSCE", "PSLCE"] as const;

export type AdminUiExamPath = (typeof ADMIN_UI_EXAM_PATHS)[number];
export type AnyExamPath = (typeof ALL_EXAM_PATHS)[number];

export function normalizeAdminExamPath(value: string | string[] | undefined): AdminUiExamPath {
  const candidate = Array.isArray(value) ? value[0] : value;
  const normalized = candidate?.toUpperCase();
  return normalized === "MSCE" ? "MSCE" : "JCE";
}

export function normalizeAnyExamPath(value: string | null | undefined): AnyExamPath | null {
  const normalized = value?.toUpperCase();
  if (normalized === "JCE" || normalized === "MSCE" || normalized === "PSLCE") {
    return normalized;
  }

  return null;
}

export function isSuperAdminRole(role: string): boolean {
  return role === "admin" || role === "super_admin";
}

export function canEditLessons(role: string): boolean {
  return role === "admin" || role === "super_admin" || role === "school_admin";
}

export function buildAdminHref(pathname: string, examPath: AdminUiExamPath): string {
  return `${pathname}?exam_path=${examPath}`;
}

export function examPathLabel(examPath: AdminUiExamPath): string {
  return examPath === "MSCE" ? "MSCE" : "JCE";
}
