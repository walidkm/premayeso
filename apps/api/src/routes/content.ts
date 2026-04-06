import { FastifyInstance } from "fastify";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { requireSuperAdmin, requireAnyAdmin } from "../lib/adminAuth.js";

export async function contentRoutes(app: FastifyInstance) {
  // ── Content tree (sidebar) ─────────────────────────────────────
  app.get("/admin/content/tree", async (request, reply) => {
    const admin = await requireAnyAdmin(request, reply);
    if (!admin) return;

    const { data, error } = await supabaseAdmin
      .from("subjects")
      .select("id, name, code, order_index, topics(id, name, code, order_index)")
      .order("order_index");

    if (error) return reply.status(500).send({ error: error.message });
    return data;
  });

  // ── Lessons admin list ─────────────────────────────────────────
  app.get<{ Params: { topicId: string } }>(
    "/admin/topics/:topicId/lessons-admin",
    async (request, reply) => {
      const admin = await requireAnyAdmin(request, reply);
      if (!admin) return;

      const { data, error } = await supabaseAdmin
        .from("lessons")
        .select("id, title, content, video_url, content_type, tier_gate, is_free_preview, order_index")
        .eq("topic_id", request.params.topicId)
        .order("order_index");

      if (error) return reply.status(500).send({ error: error.message });
      return data;
    }
  );

  // ── Subjects ───────────────────────────────────────────────────
  app.post<{
    Body: {
      name: string;
      description?: string;
      code?: string;
      exam_path?: string;
      order_index?: number;
    };
  }>("/admin/subjects", async (request, reply) => {
    const admin = await requireSuperAdmin(request, reply);
    if (!admin) return;

    const { name, description, code, exam_path, order_index } = request.body;
    const { data, error } = await supabaseAdmin
      .from("subjects")
      .insert({ name, description, code, exam_path, order_index: order_index ?? 0 })
      .select()
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return reply.status(201).send(data);
  });

  app.patch<{
    Params: { id: string };
    Body: {
      name?: string;
      description?: string;
      code?: string;
      exam_path?: string;
      order_index?: number;
    };
  }>("/admin/subjects/:id", async (request, reply) => {
    const admin = await requireSuperAdmin(request, reply);
    if (!admin) return;

    const { data, error } = await supabaseAdmin
      .from("subjects")
      .update(request.body)
      .eq("id", request.params.id)
      .select()
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return data;
  });

  app.delete<{ Params: { id: string } }>(
    "/admin/subjects/:id",
    async (request, reply) => {
      const admin = await requireSuperAdmin(request, reply);
      if (!admin) return;

      const { error } = await supabaseAdmin
        .from("subjects")
        .delete()
        .eq("id", request.params.id);

      if (error) return reply.status(400).send({ error: error.message });
      return { ok: true };
    }
  );

  // ── Topics ─────────────────────────────────────────────────────
  app.post<{
    Body: {
      subject_id: string;
      name: string;
      description?: string;
      code?: string;
      form_level?: string;
      exam_path?: string;
      order_index?: number;
    };
  }>("/admin/topics", async (request, reply) => {
    const admin = await requireSuperAdmin(request, reply);
    if (!admin) return;

    const { subject_id, name, description, code, form_level, exam_path, order_index } = request.body;
    const { data, error } = await supabaseAdmin
      .from("topics")
      .insert({ subject_id, name, description, code, form_level, exam_path, order_index: order_index ?? 0 })
      .select()
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return reply.status(201).send(data);
  });

  app.patch<{
    Params: { id: string };
    Body: {
      name?: string;
      description?: string;
      code?: string;
      form_level?: string;
      exam_path?: string;
      order_index?: number;
    };
  }>("/admin/topics/:id", async (request, reply) => {
    const admin = await requireSuperAdmin(request, reply);
    if (!admin) return;

    const { data, error } = await supabaseAdmin
      .from("topics")
      .update(request.body)
      .eq("id", request.params.id)
      .select()
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return data;
  });

  app.delete<{ Params: { id: string } }>(
    "/admin/topics/:id",
    async (request, reply) => {
      const admin = await requireSuperAdmin(request, reply);
      if (!admin) return;

      const { error } = await supabaseAdmin
        .from("topics")
        .delete()
        .eq("id", request.params.id);

      if (error) return reply.status(400).send({ error: error.message });
      return { ok: true };
    }
  );

  // ── Lessons ────────────────────────────────────────────────────
  app.post<{
    Body: {
      topic_id: string;
      title: string;
      content?: string;
      video_url?: string;
      content_type?: string;
      tier_gate?: string;
      is_free_preview?: boolean;
      order_index?: number;
    };
  }>("/admin/lessons", async (request, reply) => {
    const admin = await requireAnyAdmin(request, reply);
    if (!admin) return;

    const { topic_id, title, content, video_url, content_type, tier_gate, is_free_preview, order_index } =
      request.body;
    const { data, error } = await supabaseAdmin
      .from("lessons")
      .insert({
        topic_id,
        title,
        content,
        video_url,
        content_type: content_type ?? "text",
        tier_gate,
        is_free_preview: is_free_preview ?? false,
        order_index: order_index ?? 0,
      })
      .select()
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return reply.status(201).send(data);
  });

  app.patch<{
    Params: { id: string };
    Body: {
      title?: string;
      content?: string;
      video_url?: string;
      content_type?: string;
      tier_gate?: string;
      is_free_preview?: boolean;
      order_index?: number;
    };
  }>("/admin/lessons/:id", async (request, reply) => {
    const admin = await requireAnyAdmin(request, reply);
    if (!admin) return;

    const { data, error } = await supabaseAdmin
      .from("lessons")
      .update(request.body)
      .eq("id", request.params.id)
      .select()
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return data;
  });

  app.delete<{ Params: { id: string } }>(
    "/admin/lessons/:id",
    async (request, reply) => {
      const admin = await requireAnyAdmin(request, reply);
      if (!admin) return;

      const { error } = await supabaseAdmin
        .from("lessons")
        .delete()
        .eq("id", request.params.id);

      if (error) return reply.status(400).send({ error: error.message });
      return { ok: true };
    }
  );
}
