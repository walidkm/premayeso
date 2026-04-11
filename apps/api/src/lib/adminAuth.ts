import { FastifyReply, FastifyRequest } from "fastify";
import { supabaseAdmin } from "./supabaseAdmin.js";
import {
  hasContentAuthorAccess,
  hasPlatformAdminAccess,
  hasReviewerAccess,
  normalizeUserRole,
  type UserRole,
} from "./roles.js";

type AdminProfile = {
  id: string;
  role: string | null;
  email: string | null;
};

export type AdminContext = {
  userId: string;
  email: string | null;
  role: UserRole;
};

function getBearerToken(request: FastifyRequest): string | null {
  const authorization = request.headers.authorization;
  if (!authorization) return null;
  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

async function resolveAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
  accessCheck: (role: UserRole) => boolean
): Promise<AdminContext | null> {
  const token = getBearerToken(request);
  if (!token) {
    reply.status(401).send({ error: "Missing bearer token" });
    return null;
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) {
    reply.status(401).send({ error: "Invalid or expired token" });
    return null;
  }

  const { data: profileData, error: profileError } = await supabaseAdmin
    .from("users")
    .select("id, role, email")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError) {
    reply.status(500).send({ error: "Could not verify admin access" });
    return null;
  }

  const profile = profileData as AdminProfile | null;
  const normalizedRole = normalizeUserRole(profile?.role);
  if (!profile || !normalizedRole || !accessCheck(normalizedRole)) {
    reply.status(403).send({ error: "Insufficient permissions" });
    return null;
  }

  return {
    userId: profile.id,
    email: profile.email ?? authData.user.email ?? null,
    role: normalizedRole,
  };
}

/** Platform admin and super admin */
export async function requireSuperAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<AdminContext | null> {
  return resolveAdmin(request, reply, hasPlatformAdminAccess);
}

/** Any admin-capable role with access to at least one admin surface */
export async function requireAnyAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<AdminContext | null> {
  return resolveAdmin(
    request,
    reply,
    (role) => hasContentAuthorAccess(role) || hasReviewerAccess(role)
  );
}

/** Backwards-compatible alias -> same as requireSuperAdmin */
export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<AdminContext | null> {
  return resolveAdmin(request, reply, hasPlatformAdminAccess);
}
