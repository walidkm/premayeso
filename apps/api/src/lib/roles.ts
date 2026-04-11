export const USER_ROLES = [
  "student",
  "content_author",
  "reviewer",
  "platform_admin",
  "super_admin",
  "school_admin",
  "teacher",
  "parent",
] as const;

export const SUBSCRIPTION_STATUSES = [
  "free",
  "premium",
  "school",
  "voucher",
  "expired",
] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

const LEGACY_ROLE_ALIASES: Record<string, UserRole> = {
  admin: "platform_admin",
  family_admin: "reviewer",
};

export function normalizeUserRole(value: unknown): UserRole | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if ((USER_ROLES as readonly string[]).includes(normalized)) {
    return normalized as UserRole;
  }

  return LEGACY_ROLE_ALIASES[normalized] ?? null;
}

export function normalizeSubscriptionStatus(
  value: unknown
): SubscriptionStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if ((SUBSCRIPTION_STATUSES as readonly string[]).includes(normalized)) {
    return normalized as SubscriptionStatus;
  }

  return null;
}

export function isLearnerRole(role: unknown): boolean {
  return normalizeUserRole(role) === "student";
}

export function hasContentAuthorAccess(role: unknown): boolean {
  const normalized = normalizeUserRole(role);
  return (
    normalized === "content_author" ||
    normalized === "school_admin" ||
    normalized === "platform_admin" ||
    normalized === "super_admin"
  );
}

export function hasReviewerAccess(role: unknown): boolean {
  const normalized = normalizeUserRole(role);
  return (
    normalized === "reviewer" ||
    normalized === "platform_admin" ||
    normalized === "super_admin"
  );
}

export function hasPlatformAdminAccess(role: unknown): boolean {
  const normalized = normalizeUserRole(role);
  return normalized === "platform_admin" || normalized === "super_admin";
}

export function isAdminCapableRole(role: unknown): boolean {
  return hasContentAuthorAccess(role) || hasReviewerAccess(role);
}

export function buildAdminPermissions(role: unknown) {
  if (!isAdminCapableRole(role)) {
    return null;
  }

  return {
    can_author_content: hasContentAuthorAccess(role),
    can_review_content: hasReviewerAccess(role),
    can_manage_platform: hasPlatformAdminAccess(role),
  };
}
