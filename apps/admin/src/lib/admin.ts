export const ADMIN_UI_EXAM_PATHS = ["JCE", "MSCE"] as const;
export const ALL_EXAM_PATHS = ["JCE", "MSCE", "PSLCE"] as const;
export const ADMIN_ROLES = [
  "content_author",
  "reviewer",
  "platform_admin",
  "super_admin",
  "school_admin",
] as const;

export type AdminUiExamPath = (typeof ADMIN_UI_EXAM_PATHS)[number];
export type AnyExamPath = (typeof ALL_EXAM_PATHS)[number];
export type AdminRole = (typeof ADMIN_ROLES)[number];
export type AdminAccessArea = "any" | "content" | "review" | "platform";

const LEGACY_ROLE_ALIASES: Record<string, AdminRole> = {
  admin: "platform_admin",
  family_admin: "reviewer",
};

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

export function normalizeAdminRole(value: unknown): AdminRole | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if ((ADMIN_ROLES as readonly string[]).includes(normalized)) {
    return normalized as AdminRole;
  }

  return LEGACY_ROLE_ALIASES[normalized] ?? null;
}

export function isAdminRole(role: unknown): boolean {
  return normalizeAdminRole(role) !== null;
}

export function hasContentAccess(role: unknown): boolean {
  const normalized = normalizeAdminRole(role);
  return (
    normalized === "content_author" ||
    normalized === "school_admin" ||
    normalized === "platform_admin" ||
    normalized === "super_admin"
  );
}

export function hasReviewerAccess(role: unknown): boolean {
  const normalized = normalizeAdminRole(role);
  return (
    normalized === "reviewer" ||
    normalized === "platform_admin" ||
    normalized === "super_admin"
  );
}

export function hasPlatformAccess(role: unknown): boolean {
  const normalized = normalizeAdminRole(role);
  return normalized === "platform_admin" || normalized === "super_admin";
}

export function isSuperAdminRole(role: unknown): boolean {
  return normalizeAdminRole(role) === "super_admin";
}

export function canEditLessons(role: unknown): boolean {
  return hasContentAccess(role);
}

export function hasAdminAreaAccess(role: unknown, area: AdminAccessArea): boolean {
  if (area === "any") return isAdminRole(role);
  if (area === "content") return hasContentAccess(role);
  if (area === "review") return hasReviewerAccess(role);
  return hasPlatformAccess(role);
}

export function getDefaultAdminPath(role: unknown): string {
  if (hasPlatformAccess(role)) return "/";
  if (hasContentAccess(role)) return "/subjects";
  if (hasReviewerAccess(role)) return "/marking";
  return "/login";
}

export function roleLabel(role: unknown): string {
  const normalized = normalizeAdminRole(role);
  switch (normalized) {
    case "content_author":
      return "Content Author";
    case "reviewer":
      return "Reviewer";
    case "platform_admin":
      return "Platform Admin";
    case "super_admin":
      return "Super Admin";
    case "school_admin":
      return "School Admin";
    default:
      return "Unknown";
  }
}

export function buildAdminHref(pathname: string, examPath: AdminUiExamPath): string {
  return `${pathname}?exam_path=${examPath}`;
}

export function examPathLabel(examPath: AdminUiExamPath): string {
  return examPath === "MSCE" ? "MSCE" : "JCE";
}
