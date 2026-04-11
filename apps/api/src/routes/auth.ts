import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import {
  signAccess,
  signRefresh,
  verifyRefresh,
  getBearerToken,
  verifyAccess,
} from "../lib/jwt.js";
import {
  buildAdminPermissions,
  isAdminCapableRole,
  normalizeSubscriptionStatus,
  normalizeUserRole,
} from "../lib/roles.js";

type UserIdentityRow = {
  id: string;
  phone: string | null;
  email?: string | null;
  full_name: string | null;
  role: string | null;
  exam_path: string | null;
  subscription_status: string | null;
};

function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

async function sendOtp(phone: string, otp: string): Promise<void> {
  let atKey = process.env.AT_API_KEY ?? "";
  let atUsername = process.env.AT_USERNAME ?? "sandbox";
  let atEnabled = !!atKey;

  try {
    const { data } = await supabaseAdmin
      .from("settings")
      .select("key, value")
      .in("key", ["at_api_key", "at_username", "at_enabled"]);

    const map = Object.fromEntries(
      (data ?? []).map((row: { key: string; value: string }) => [row.key, row.value])
    );

    if (map.at_api_key && map.at_api_key !== "â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢") atKey = map.at_api_key;
    if (map.at_username) atUsername = map.at_username;
    if (map.at_enabled === "true") atEnabled = true;
    if (map.at_enabled === "false") atEnabled = false;
  } catch {
    // Fall back to env vars if settings are unavailable.
  }

  if (atEnabled && atKey) {
    try {
      await fetch("https://api.africastalking.com/version1/messaging", {
        method: "POST",
        headers: {
          apiKey: atKey,
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          username: atUsername,
          to: phone,
          message: `Your PreMayeso code is ${otp}. Valid for 5 minutes.`,
        }),
      });
    } catch {
      // If SMS sending fails, the console fallback still makes local development usable.
    }
  }

  console.log(`\n[OTP] ${phone} â†’ ${otp}\n`);
}

function buildUserIdentity(user: UserIdentityRow) {
  const role = normalizeUserRole(user.role) ?? "student";
  const subscriptionStatus =
    normalizeSubscriptionStatus(user.subscription_status) ?? "free";

  return {
    id: user.id,
    phone: user.phone ?? user.email ?? null,
    identifier: user.phone ?? user.email ?? null,
    name: user.full_name ?? null,
    full_name: user.full_name ?? null,
    role,
    exam_path: user.exam_path ?? null,
    subscription_status: subscriptionStatus,
    admin_permissions: buildAdminPermissions(role),
  };
}

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: { phone: string } }>(
    "/api/v1/auth/request-otp",
    async (request, reply) => {
      const { phone } = request.body ?? {};
      if (!phone || !/^\+?\d{7,15}$/.test(phone.replace(/\s/g, ""))) {
        return reply.status(400).send({ error: "Valid phone number required" });
      }

      const otp = generateOtp();
      const otpHash = await bcrypt.hash(otp, 10);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      await supabaseAdmin
        .from("otp_logs")
        .delete()
        .eq("phone", phone)
        .is("verified_at", null);

      const { error } = await supabaseAdmin.from("otp_logs").insert({
        phone,
        otp_hash: otpHash,
        expires_at: expiresAt,
      });

      if (error) {
        return reply.status(500).send({ error: "Could not create OTP" });
      }

      await sendOtp(phone, otp);

      return { sent: true };
    }
  );

  app.post<{ Body: { phone: string; otp: string; name?: string } }>(
    "/api/v1/auth/verify-otp",
    async (request, reply) => {
      const { phone, otp, name } = request.body ?? {};
      if (!phone || !otp) {
        return reply.status(400).send({ error: "phone and otp are required" });
      }

      const { data: otpRow } = await supabaseAdmin
        .from("otp_logs")
        .select("id, otp_hash, expires_at")
        .eq("phone", phone)
        .is("verified_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!otpRow) {
        return reply.status(400).send({ error: "No OTP found for this number" });
      }

      if (new Date(otpRow.expires_at) < new Date()) {
        return reply.status(400).send({ error: "OTP has expired" });
      }

      const valid = await bcrypt.compare(otp, otpRow.otp_hash);
      if (!valid) {
        return reply.status(400).send({ error: "Incorrect OTP" });
      }

      await supabaseAdmin
        .from("otp_logs")
        .update({ verified_at: new Date().toISOString() })
        .eq("id", otpRow.id);

      const normalizedName = typeof name === "string" ? name.trim() : "";
      const { data: existingUser } = await supabaseAdmin
        .from("users")
        .select("id, phone, email, full_name, role, exam_path, subscription_status")
        .eq("phone", phone)
        .maybeSingle();

      let identity: ReturnType<typeof buildUserIdentity>;

      if (existingUser) {
        const existingRole = normalizeUserRole(existingUser.role) ?? "student";
        if (isAdminCapableRole(existingRole)) {
          return reply.status(403).send({
            error: "This number belongs to an admin profile. Use the admin login instead.",
          });
        }

        if (normalizedName.length > 0 && normalizedName !== existingUser.full_name) {
          const { error: updateError } = await supabaseAdmin
            .from("users")
            .update({ full_name: normalizedName })
            .eq("id", existingUser.id);

          if (updateError) {
            return reply.status(500).send({ error: "Could not update user profile" });
          }
        }

        identity = buildUserIdentity({
          ...existingUser,
          full_name: normalizedName.length > 0 ? normalizedName : existingUser.full_name,
        });
      } else {
        const newId = crypto.randomUUID();
        const { error: insertError } = await supabaseAdmin
          .from("users")
          .insert({
            id: newId,
            phone,
            full_name: normalizedName || null,
            role: "student",
            subscription_status: "free",
          });

        if (insertError) {
          return reply.status(500).send({ error: "Could not create user" });
        }

        identity = buildUserIdentity({
          id: newId,
          phone,
          email: null,
          full_name: normalizedName || null,
          role: "student",
          exam_path: null,
          subscription_status: "free",
        });
      }

      const accessToken = signAccess({
        sub: identity.id,
        phone: identity.phone ?? phone,
        role: identity.role,
      });
      const refreshJti = crypto.randomUUID();
      const refreshToken = signRefresh({ sub: identity.id, jti: refreshJti });

      return {
        accessToken,
        refreshToken,
        user: identity,
      };
    }
  );

  app.post<{ Body: { refreshToken: string } }>(
    "/api/v1/auth/refresh",
    async (request, reply) => {
      const { refreshToken } = request.body ?? {};
      if (!refreshToken) {
        return reply.status(400).send({ error: "refreshToken required" });
      }

      let payload;
      try {
        payload = verifyRefresh(refreshToken);
      } catch {
        return reply.status(401).send({ error: "Invalid or expired refresh token" });
      }

      const { data: user } = await supabaseAdmin
        .from("users")
        .select("id, phone, email, full_name, role, exam_path, subscription_status")
        .eq("id", payload.sub)
        .maybeSingle();

      if (!user) {
        return reply.status(401).send({ error: "User not found" });
      }

      const identity = buildUserIdentity(user);
      if (isAdminCapableRole(identity.role)) {
        return reply.status(403).send({
          error: "This account uses admin login. Use the admin site instead.",
        });
      }

      const newAccessToken = signAccess({
        sub: identity.id,
        phone: identity.phone ?? "",
        role: identity.role,
      });
      const newRefreshJti = crypto.randomUUID();
      const newRefreshToken = signRefresh({ sub: identity.id, jti: newRefreshJti });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: identity,
      };
    }
  );

  app.get("/api/v1/auth/me", async (request, reply) => {
    const token = getBearerToken(request.headers.authorization);
    if (!token) {
      return reply.status(401).send({ error: "Missing bearer token" });
    }

    let payload;
    try {
      payload = verifyAccess(token);
    } catch {
      return reply.status(401).send({ error: "Invalid or expired token" });
    }

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id, phone, email, full_name, role, exam_path, subscription_status")
      .eq("id", payload.sub)
      .maybeSingle();

    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }

    const identity = buildUserIdentity(user as UserIdentityRow);
    if (isAdminCapableRole(identity.role)) {
      return reply.status(403).send({
        error: "This account uses admin login. Use the admin site instead.",
      });
    }

    return identity;
  });

  app.patch<{ Body: { exam_path: string } }>(
    "/api/v1/auth/exam-path",
    async (request, reply) => {
      const token = getBearerToken(request.headers.authorization);
      if (!token) return reply.status(401).send({ error: "Missing bearer token" });

      let payload;
      try {
        payload = verifyAccess(token);
      } catch {
        return reply.status(401).send({ error: "Invalid or expired token" });
      }

      if (isAdminCapableRole(payload.role)) {
        return reply.status(403).send({
          error: "This account uses admin login. Use the admin site instead.",
        });
      }

      const { exam_path } = request.body ?? {};
      if (!["JCE", "MSCE", "PSLCE"].includes(exam_path)) {
        return reply.status(400).send({ error: "exam_path must be JCE, MSCE, or PSLCE" });
      }

      const { error } = await supabaseAdmin
        .from("users")
        .update({ exam_path })
        .eq("id", payload.sub);

      if (error) return reply.status(500).send({ error: error.message });

      return { updated: true, exam_path };
    }
  );
}
