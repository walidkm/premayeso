import { FastifyInstance } from "fastify";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { requireSuperAdmin, requireAnyAdmin } from "../lib/adminAuth.js";
import {
  getLesson,
  getSubject,
  getTopic,
  normalizeExamPath,
  normalizeOptionalText,
  normalizeOrderIndex,
  normalizeRequiredText,
  type LessonRow,
  type SubjectRow,
  type TopicRow,
} from "../lib/adminContent.js";

type ContentTreeTopicRow = {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  form_level: string | null;
  exam_path: string | null;
  order_index: number;
};

type ContentTreeSubjectRow = SubjectRow & {
  topics: ContentTreeTopicRow[];
};

export async function contentRoutes(app: FastifyInstance) {
  // ── Content tree (sidebar) ─────────────────────────────────────
  app.get<{ Querystring: { exam_path?: string } }>("/admin/content/tree", async (request, reply) => {
    const admin = await requireAnyAdmin(request, reply);
    if (!admin) return;

    const examPath = normalizeExamPath(request.query.exam_path);

    let query = supabaseAdmin
      .from("subjects")
      .select(
        "id, name, description, code, exam_path, order_index, topics(id, name, description, code, form_level, exam_path, order_index)"
      )
      .order("order_index");

    if (examPath) {
      query = query.eq("exam_path", examPath);
    }

    const { data, error } = await query;
    if (error) return reply.status(500).send({ error: error.message });
    return ((data as ContentTreeSubjectRow[] | null) ?? []).map((subject) => ({
      ...subject,
      topics: (subject.topics ?? []).sort((left, right) => left.order_index - right.order_index),
    }));
  });

  // ── Lessons admin list ─────────────────────────────────────────
  app.get<{ Params: { topicId: string } }>(
    "/admin/topics/:topicId/lessons-admin",
    async (request, reply) => {
      const admin = await requireAnyAdmin(request, reply);
      if (!admin) return;

      const { data, error } = await supabaseAdmin
        .from("lessons")
        .select("id, topic_id, title, content, video_url, content_type, tier_gate, is_free_preview, order_index, exam_path")
        .eq("topic_id", request.params.topicId)
        .order("order_index");

      if (error) return reply.status(500).send({ error: error.message });
      return (data as LessonRow[] | null) ?? [];
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

    const name = normalizeRequiredText(request.body.name);
    const examPath = normalizeExamPath(request.body.exam_path);
    if (!name) return reply.status(400).send({ error: "Subject name is required" });
    if (!examPath) return reply.status(400).send({ error: "Subject exam_path must be JCE, MSCE, or PSLCE" });

    const { data, error } = await supabaseAdmin
      .from("subjects")
      .insert({
        name,
        description: normalizeOptionalText(request.body.description),
        code: normalizeOptionalText(request.body.code),
        exam_path: examPath,
        order_index: normalizeOrderIndex(request.body.order_index),
      })
      .select("id, name, description, code, exam_path, order_index")
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return reply.status(201).send(data as SubjectRow);
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

    const subjectResult = await getSubject(request.params.id);
    if (subjectResult.error) return reply.status(500).send({ error: subjectResult.error });
    if (!subjectResult.data) return reply.status(404).send({ error: "Subject not found" });

    const updates: Record<string, string | number | null> = {};
    if (request.body.name !== undefined) {
      const name = normalizeRequiredText(request.body.name);
      if (!name) return reply.status(400).send({ error: "Subject name is required" });
      updates.name = name;
    }
    if (request.body.description !== undefined) updates.description = normalizeOptionalText(request.body.description);
    if (request.body.code !== undefined) updates.code = normalizeOptionalText(request.body.code);
    if (request.body.order_index !== undefined) updates.order_index = normalizeOrderIndex(request.body.order_index);

    if (request.body.exam_path !== undefined) {
      const examPath = normalizeExamPath(request.body.exam_path);
      if (!examPath) {
        return reply.status(400).send({ error: "Subject exam_path must be JCE, MSCE, or PSLCE" });
      }

      if (subjectResult.data.exam_path !== examPath) {
        const [{ count: topicCount }, { count: paperCount }] = await Promise.all([
          supabaseAdmin.from("topics").select("id", { count: "exact", head: true }).eq("subject_id", request.params.id),
          supabaseAdmin.from("exam_papers").select("id", { count: "exact", head: true }).eq("subject_id", request.params.id),
        ]);

        if ((topicCount ?? 0) > 0 || (paperCount ?? 0) > 0) {
          return reply.status(400).send({
            error: "Cannot change a subject exam level after topics or exam papers have been created",
          });
        }
      }

      updates.exam_path = examPath;
    }

    const { data, error } = await supabaseAdmin
      .from("subjects")
      .update(updates)
      .eq("id", request.params.id)
      .select("id, name, description, code, exam_path, order_index")
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return data as SubjectRow;
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

    const subjectResult = await getSubject(request.body.subject_id);
    if (subjectResult.error) return reply.status(500).send({ error: subjectResult.error });
    if (!subjectResult.data) return reply.status(404).send({ error: "Subject not found" });
    if (!subjectResult.data.exam_path) return reply.status(400).send({ error: "Subject exam_path is missing" });

    if (request.body.exam_path !== undefined && normalizeExamPath(request.body.exam_path) !== subjectResult.data.exam_path) {
      return reply.status(400).send({ error: "Topic exam_path must match its subject exam_path" });
    }

    const name = normalizeRequiredText(request.body.name);
    if (!name) return reply.status(400).send({ error: "Topic name is required" });

    const { data, error } = await supabaseAdmin
      .from("topics")
      .insert({
        subject_id: request.body.subject_id,
        name,
        description: normalizeOptionalText(request.body.description),
        code: normalizeOptionalText(request.body.code),
        form_level: normalizeOptionalText(request.body.form_level),
        exam_path: subjectResult.data.exam_path,
        order_index: normalizeOrderIndex(request.body.order_index),
      })
      .select("id, subject_id, name, description, code, form_level, exam_path, order_index")
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return reply.status(201).send(data as TopicRow);
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

    const topicResult = await getTopic(request.params.id);
    if (topicResult.error) return reply.status(500).send({ error: topicResult.error });
    if (!topicResult.data) return reply.status(404).send({ error: "Topic not found" });

    const subjectResult = await getSubject(topicResult.data.subject_id);
    if (subjectResult.error) return reply.status(500).send({ error: subjectResult.error });
    if (!subjectResult.data?.exam_path) {
      return reply.status(400).send({ error: "Topic subject is missing exam_path" });
    }

    if (request.body.exam_path !== undefined && normalizeExamPath(request.body.exam_path) !== subjectResult.data.exam_path) {
      return reply.status(400).send({ error: "Topic exam_path must match its subject exam_path" });
    }

    const updates: Record<string, string | number | null> = {
      exam_path: subjectResult.data.exam_path,
    };
    if (request.body.name !== undefined) {
      const name = normalizeRequiredText(request.body.name);
      if (!name) return reply.status(400).send({ error: "Topic name is required" });
      updates.name = name;
    }
    if (request.body.description !== undefined) updates.description = normalizeOptionalText(request.body.description);
    if (request.body.code !== undefined) updates.code = normalizeOptionalText(request.body.code);
    if (request.body.form_level !== undefined) updates.form_level = normalizeOptionalText(request.body.form_level);
    if (request.body.order_index !== undefined) updates.order_index = normalizeOrderIndex(request.body.order_index);

    const { data, error } = await supabaseAdmin
      .from("topics")
      .update(updates)
      .eq("id", request.params.id)
      .select("id, subject_id, name, description, code, form_level, exam_path, order_index")
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return data as TopicRow;
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

    const topicResult = await getTopic(request.body.topic_id);
    if (topicResult.error) return reply.status(500).send({ error: topicResult.error });
    if (!topicResult.data?.exam_path) return reply.status(404).send({ error: "Topic not found" });

    const title = normalizeRequiredText(request.body.title);
    if (!title) return reply.status(400).send({ error: "Lesson title is required" });

    const { data, error } = await supabaseAdmin
      .from("lessons")
      .insert({
        topic_id: request.body.topic_id,
        title,
        content: normalizeOptionalText(request.body.content),
        video_url: normalizeOptionalText(request.body.video_url),
        content_type: normalizeOptionalText(request.body.content_type) ?? "text",
        tier_gate: normalizeOptionalText(request.body.tier_gate) ?? "free",
        is_free_preview: request.body.is_free_preview ?? false,
        order_index: normalizeOrderIndex(request.body.order_index),
        exam_path: topicResult.data.exam_path,
      })
      .select("id, topic_id, title, content, video_url, content_type, tier_gate, is_free_preview, order_index, exam_path")
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return reply.status(201).send(data as LessonRow);
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

    const lessonResult = await getLesson(request.params.id);
    if (lessonResult.error) return reply.status(500).send({ error: lessonResult.error });
    if (!lessonResult.data) return reply.status(404).send({ error: "Lesson not found" });

    const topicResult = await getTopic(lessonResult.data.topic_id);
    if (topicResult.error) return reply.status(500).send({ error: topicResult.error });
    if (!topicResult.data?.exam_path) {
      return reply.status(400).send({ error: "Lesson topic is missing exam_path" });
    }

    const updates: Record<string, string | number | boolean | null> = {
      exam_path: topicResult.data.exam_path,
    };
    if (request.body.title !== undefined) {
      const title = normalizeRequiredText(request.body.title);
      if (!title) return reply.status(400).send({ error: "Lesson title is required" });
      updates.title = title;
    }
    if (request.body.content !== undefined) updates.content = normalizeOptionalText(request.body.content);
    if (request.body.video_url !== undefined) updates.video_url = normalizeOptionalText(request.body.video_url);
    if (request.body.content_type !== undefined) updates.content_type = normalizeOptionalText(request.body.content_type);
    if (request.body.tier_gate !== undefined) updates.tier_gate = normalizeOptionalText(request.body.tier_gate);
    if (request.body.is_free_preview !== undefined) updates.is_free_preview = request.body.is_free_preview;
    if (request.body.order_index !== undefined) updates.order_index = normalizeOrderIndex(request.body.order_index);

    const { data, error } = await supabaseAdmin
      .from("lessons")
      .update(updates)
      .eq("id", request.params.id)
      .select("id, topic_id, title, content, video_url, content_type, tier_gate, is_free_preview, order_index, exam_path")
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return data as LessonRow;
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
