import { FastifyInstance } from "fastify";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";

const VALID_EXAM_PATHS = ["JCE", "MSCE", "PSLCE"] as const;

function normalizeExamPath(value: unknown): (typeof VALID_EXAM_PATHS)[number] | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if ((VALID_EXAM_PATHS as readonly string[]).includes(normalized)) {
    return normalized as (typeof VALID_EXAM_PATHS)[number];
  }

  return null;
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeEmail(value: unknown): string | null {
  const normalized = normalizeOptionalText(value);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizePhone(value: unknown): string | null {
  const normalized = normalizeOptionalText(value)?.replace(/\s+/g, "");
  if (!normalized) {
    return null;
  }

  return /^\+?\d{7,15}$/.test(normalized) ? normalized : null;
}

export async function waitlistRoutes(app: FastifyInstance) {
  app.post<{
    Body: {
      name?: string;
      email?: string;
      phone?: string;
      notes?: string;
      source?: string;
      exam_path: string;
    };
  }>("/api/v1/waitlist", async (request, reply) => {
    const examPath = normalizeExamPath(request.body?.exam_path);
    const name = normalizeOptionalText(request.body?.name);
    const email = normalizeEmail(request.body?.email);
    const phone = normalizePhone(request.body?.phone);
    const notes = normalizeOptionalText(request.body?.notes);
    const source = normalizeOptionalText(request.body?.source) ?? "web";

    if (!examPath) {
      return reply.status(400).send({ error: "exam_path must be JCE, MSCE, or PSLCE" });
    }

    if (!email && !phone) {
      return reply.status(400).send({ error: "Provide an email or phone number for the waitlist" });
    }

    if (request.body?.email && !email) {
      return reply.status(400).send({ error: "Email address is invalid" });
    }

    if (request.body?.phone && !phone) {
      return reply.status(400).send({ error: "Phone number is invalid" });
    }

    const phoneLookup = phone
      ? await supabaseAdmin
          .from("waitlist_signups")
          .select("id")
          .eq("exam_path", examPath)
          .eq("phone", phone)
          .limit(1)
          .maybeSingle()
      : { data: null, error: null };

    if (phoneLookup.error) {
      return reply.status(500).send({ error: phoneLookup.error.message });
    }

    const emailLookup = email
      ? await supabaseAdmin
          .from("waitlist_signups")
          .select("id")
          .eq("exam_path", examPath)
          .eq("email", email)
          .limit(1)
          .maybeSingle()
      : { data: null, error: null };

    if (emailLookup.error) {
      return reply.status(500).send({ error: emailLookup.error.message });
    }

    if (phoneLookup.data?.id || emailLookup.data?.id) {
      return { ok: true, existing: true };
    }

    const { error } = await supabaseAdmin.from("waitlist_signups").insert({
      name,
      email,
      phone,
      notes,
      source,
      exam_path: examPath,
    });

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return reply.status(201).send({ ok: true, existing: false });
  });
}
