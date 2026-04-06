import { FastifyReply, FastifyRequest } from "fastify";
import { supabaseAdmin } from "./supabaseAdmin.js";

type AdminProfile = {
  id: string;
  role: string | null;
  email: string | null;
};

export type AdminContext = {
  userId: string;
  email: string | null;
  role: string;
};

const SUPER_ADMIN_ROLES = ["admin", "super_admin"];
const ANY_ADMIN_ROLES   = ["admin", "super_admin", "school_admin", "family_admin"];

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
  allowedRoles: string[]
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
  if (!profile?.role || !allowedRoles.includes(profile.role)) {
    reply.status(403).send({ error: "Insufficient permissions" });
    return null;
  }

  return {
    userId: profile.id,
    email: profile.email ?? authData.user.email ?? null,
    role: profile.role,
  };
}

/** Super-admin only: admin, super_admin */
export async function requireSuperAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<AdminContext | null> {
  return resolveAdmin(request, reply, SUPER_ADMIN_ROLES);
}

/** Any admin-type role: admin, super_admin, school_admin, family_admin */
export async function requireAnyAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<AdminContext | null> {
  return resolveAdmin(request, reply, ANY_ADMIN_ROLES);
}

/** Backwards-compatible alias → same as requireSuperAdmin */
export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<AdminContext | null> {
  return resolveAdmin(request, reply, SUPER_ADMIN_ROLES);
}
