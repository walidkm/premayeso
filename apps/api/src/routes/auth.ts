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

// ── Helpers ───────────────────────────────────────────────────

function generateOtp(): string {
  // 6-digit zero-padded
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

async function sendOtp(phone: string, otp: string): Promise<void> {
  // Read AT credentials from settings table (with env var fallback)
  let atKey = process.env.AT_API_KEY ?? "";
  let atUsername = process.env.AT_USERNAME ?? "sandbox";
  let atEnabled = !!atKey;

  try {
    const { data } = await supabaseAdmin
      .from("settings")
      .select("key, value")
      .in("key", ["at_api_key", "at_username", "at_enabled"]);

    const map = Object.fromEntries(
      (data ?? []).map((r: { key: string; value: string }) => [r.key, r.value])
    );

    if (map.at_api_key && map.at_api_key !== "••••••••") atKey = map.at_api_key;
    if (map.at_username) atUsername = map.at_username;
    if (map.at_enabled === "true") atEnabled = true;
    if (map.at_enabled === "false") atEnabled = false;
  } catch {
    // Fall through to env var values if settings read fails
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
      // Fall through to console log if AT fails
    }
  }

  console.log(`\n[OTP] ${phone} → ${otp}\n`);
}

// ── Routes ────────────────────────────────────────────────────

export async function authRoutes(app: FastifyInstance) {
  // POST /api/v1/auth/request-otp
  // Body: { phone: "+265..." }
  app.post<{ Body: { phone: string } }>(
    "/api/v1/auth/request-otp",
    async (request, reply) => {
      const { phone } = request.body ?? {};
      if (!phone || !/^\+?\d{7,15}$/.test(phone.replace(/\s/g, ""))) {
        return reply.status(400).send({ error: "Valid phone number required" });
      }

      const otp = generateOtp();
      const otpHash = await bcrypt.hash(otp, 10);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min

      // Delete any previous unverified OTPs for this phone
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

  // POST /api/v1/auth/verify-otp
  // Body: { phone, otp, name? }
  app.post<{ Body: { phone: string; otp: string; name?: string } }>(
    "/api/v1/auth/verify-otp",
    async (request, reply) => {
      const { phone, otp, name } = request.body ?? {};
      if (!phone || !otp) {
        return reply.status(400).send({ error: "phone and otp are required" });
      }

      // Fetch latest unverified OTP for this phone
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

      // Mark OTP as verified
      await supabaseAdmin
        .from("otp_logs")
        .update({ verified_at: new Date().toISOString() })
        .eq("id", otpRow.id);

      // Upsert user profile
      const { data: existingUser } = await supabaseAdmin
        .from("users")
        .select("id, role, subscription_status")
        .eq("phone", phone)
        .maybeSingle();

      let userId: string;
      let role: string;

      if (existingUser) {
        userId = existingUser.id;
        role = existingUser.role;
      } else {
        // New user — generate a UUID and insert
        const newId = crypto.randomUUID();
        const { error: insertError } = await supabaseAdmin
          .from("users")
          .insert({
            id: newId,
            phone,
            full_name: name ?? null,
            role: "student",
            subscription_status: "free",
          });

        if (insertError) {
          return reply.status(500).send({ error: "Could not create user" });
        }
        userId = newId;
        role = "student";
      }

      // Issue tokens
      const accessToken = signAccess({ sub: userId, phone, role });
      const refreshJti = crypto.randomUUID();
      const refreshToken = signRefresh({ sub: userId, jti: refreshJti });

      return {
        accessToken,
        refreshToken,
        user: { id: userId, phone, role },
      };
    }
  );

  // POST /api/v1/auth/refresh
  // Body: { refreshToken }
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

      // Fetch user to get current role/phone
      const { data: user } = await supabaseAdmin
        .from("users")
        .select("id, phone, role")
        .eq("id", payload.sub)
        .maybeSingle();

      if (!user) {
        return reply.status(401).send({ error: "User not found" });
      }

      const newAccessToken = signAccess({
        sub: user.id,
        phone: user.phone ?? "",
        role: user.role,
      });
      const newRefreshJti = crypto.randomUUID();
      const newRefreshToken = signRefresh({ sub: user.id, jti: newRefreshJti });

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    }
  );

  // GET /api/v1/auth/me
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
      .select("id, phone, full_name, role, exam_path, subscription_status")
      .eq("id", payload.sub)
      .maybeSingle();

    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }

    return user;
  });

  // PATCH /api/v1/auth/exam-path
  // Body: { exam_path: "JCE" | "MSCE" | "PSLCE" }
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
