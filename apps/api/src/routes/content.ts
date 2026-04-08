import { randomUUID } from "node:crypto";
import { FastifyInstance, FastifyRequest } from "fastify";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { requireSuperAdmin, requireAnyAdmin } from "../lib/adminAuth.js";
import {
  buildLegacyLessonBlocks,
  getLesson,
  getLessonBlock,
  getSubject,
  getTopic,
  inferVideoProviderFromUrl,
  LESSON_FILES_BUCKET,
  normalizeExamPath,
  normalizeLessonBlockType,
  normalizeLessonContentType,
  normalizeOptionalText,
  normalizeOrderIndex,
  normalizeRequiredText,
  normalizeVideoProvider,
  sortLessonBlocks,
  withSignedLessonBlockUrls,
  type LessonBlockRow,
  type LessonRow,
  type SubjectRow,
  type TopicRow,
  type LessonWithBlocksRow,
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

const LESSON_SELECT = "*";
const LESSON_BLOCK_SELECT =
  "id, lesson_id, block_type, title, text_content, video_url, video_provider, file_path, file_name, file_size, order_index, created_at, updated_at";
const LESSON_WITH_BLOCKS_SELECT = `${LESSON_SELECT}, lesson_blocks(${LESSON_BLOCK_SELECT})`;
const MAX_LESSON_PDF_SIZE_BYTES = 20 * 1024 * 1024;

type LessonBlockDraft = {
  block_type: "text" | "video";
  title: string | null;
  text_content: string | null;
  video_url: string | null;
  video_provider: "youtube" | "vimeo" | "direct" | "other" | null;
  file_path: null;
  file_name: null;
  file_size: null;
};

type UploadedPdfFile = {
  buffer: Buffer;
  filename: string;
  mimetype: string;
  size: number;
};

function mapLessonWithSortedBlocks(lesson: LessonWithBlocksRow): LessonWithBlocksRow {
  return {
    ...lesson,
    lesson_blocks: sortLessonBlocks(lesson.lesson_blocks),
  };
}

function extractLeafFileName(value: string): string {
  return value.replace(/^.*[\\/]/, "").trim();
}

function normalizePdfDisplayName(value: string): string {
  const leaf = extractLeafFileName(value);
  return leaf.length > 0 ? leaf : "lesson.pdf";
}

function buildLessonPdfStoragePath(lessonId: string, originalFilename: string): string {
  const displayName = normalizePdfDisplayName(originalFilename);
  const baseName = displayName.replace(/\.pdf$/i, "");
  const safeBase =
    baseName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "lesson";

  return `${lessonId}/${randomUUID()}-${safeBase}.pdf`;
}

async function parsePdfUpload(
  request: FastifyRequest,
  requireFile: boolean
): Promise<{ title: string | null; file: UploadedPdfFile | null; error: string | null }> {
  if (!request.isMultipart()) {
    return { title: null, file: null, error: "Expected multipart/form-data" };
  }

  let title: string | null = null;
  let file: UploadedPdfFile | null = null;

  try {
    for await (const part of request.parts()) {
      if (part.type === "field") {
        if (part.fieldname === "title") {
          title = normalizeOptionalText(typeof part.value === "string" ? part.value : String(part.value));
        }
        continue;
      }

      const buffer = await part.toBuffer();
      if (part.fieldname !== "file") {
        continue;
      }

      if (file) {
        return { title, file: null, error: "Only one PDF file can be uploaded per block" };
      }

      file = {
        buffer,
        filename: part.filename,
        mimetype: part.mimetype,
        size: buffer.length,
      };
    }
  } catch {
    return { title, file: null, error: "Could not read uploaded PDF file" };
  }

  if (!file && requireFile) {
    return { title, file: null, error: "No PDF file uploaded" };
  }

  if (!file) {
    return { title, file: null, error: null };
  }

  const fileName = normalizePdfDisplayName(file.filename);
  const looksLikePdf = file.mimetype === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
  if (!looksLikePdf) {
    return { title, file: null, error: "Only PDF files are allowed" };
  }

  if (file.size === 0) {
    return { title, file: null, error: "Uploaded PDF is empty" };
  }

  if (file.size > MAX_LESSON_PDF_SIZE_BYTES) {
    return { title, file: null, error: "PDF files must be 20 MB or smaller" };
  }

  return {
    title,
    file: {
      ...file,
      filename: fileName,
    },
    error: null,
  };
}

async function removeLessonFiles(filePaths: Array<string | null | undefined>): Promise<void> {
  const paths = [...new Set(filePaths.filter((value): value is string => typeof value === "string" && value.length > 0))];
  if (paths.length === 0) return;
  await supabaseAdmin.storage.from(LESSON_FILES_BUCKET).remove(paths);
}

function buildLessonBlockDraft(input: {
  block_type: string | null | undefined;
  title?: string | null;
  text_content?: string | null;
  video_url?: string | null;
  video_provider?: string | null;
}): { data: LessonBlockDraft | null; error: string | null } {
  const blockType = normalizeLessonBlockType(input.block_type);
  if (!blockType) {
    return { data: null, error: "Block type must be text, video, or pdf" };
  }

  if (blockType === "pdf") {
    return { data: null, error: "PDF blocks must be created through the PDF upload endpoint" };
  }

  const title = normalizeOptionalText(input.title);
  const textContent = normalizeOptionalText(input.text_content);
  const videoUrl = normalizeOptionalText(input.video_url);
  const requestedProvider = normalizeVideoProvider(input.video_provider);

  if (blockType === "text") {
    if (!textContent) {
      return { data: null, error: "Text blocks require text_content" };
    }

    return {
      data: {
        block_type: blockType,
        title,
        text_content: textContent,
        video_url: null,
        video_provider: null,
        file_path: null,
        file_name: null,
        file_size: null,
      },
      error: null,
    };
  }

  if (!videoUrl) {
    return { data: null, error: "Video blocks require video_url" };
  }

  return {
    data: {
      block_type: blockType,
      title,
      text_content: null,
      video_url: videoUrl,
      video_provider: requestedProvider ?? inferVideoProviderFromUrl(videoUrl) ?? "other",
      file_path: null,
      file_name: null,
      file_size: null,
    },
    error: null,
  };
}

function buildLegacyImportPayload(lesson: LessonRow): LessonBlockDraft[] {
  return buildLegacyLessonBlocks(lesson).map((block) => ({
    block_type: block.block_type === "video" ? "video" : "text",
    title: block.title,
    text_content: block.text_content,
    video_url: block.video_url,
    video_provider: block.video_provider,
    file_path: null,
    file_name: null,
    file_size: null,
  }));
}

function getNextLessonBlockOrderIndex(blocks: LessonBlockRow[]): number {
  return blocks.reduce((maxOrder, block) => Math.max(maxOrder, block.order_index), -1) + 1;
}

function hasLessonsSchemaCacheError(message: string | null | undefined): boolean {
  if (!message) return false;

  return (
    message.includes("'content_type' column of 'lessons'") ||
    message.includes("'video_url' column of 'lessons'") ||
    message.includes("'lesson_blocks'") ||
    message.includes("schema cache")
  );
}

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
        .select(LESSON_WITH_BLOCKS_SELECT)
        .eq("topic_id", request.params.topicId)
        .order("order_index");

      if (!error) {
        return ((data as LessonWithBlocksRow[] | null) ?? []).map(mapLessonWithSortedBlocks);
      }

      if (!hasLessonsSchemaCacheError(error.message)) {
        return reply.status(500).send({ error: error.message });
      }

      const { data: fallbackData, error: fallbackError } = await supabaseAdmin
        .from("lessons")
        .select(LESSON_SELECT)
        .eq("topic_id", request.params.topicId)
        .order("order_index");

      if (fallbackError) return reply.status(500).send({ error: fallbackError.message });
      return ((fallbackData as LessonRow[] | null) ?? []).map((lesson) => ({ ...lesson, lesson_blocks: [] }));
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

    const contentType =
      request.body.content_type !== undefined ? normalizeLessonContentType(request.body.content_type) : null;
    if (request.body.content_type !== undefined && !contentType) {
      return reply.status(400).send({ error: "Lesson content_type must be text, video, or mixed" });
    }

    const insertPayload: Record<string, string | number | boolean | null> = {
      topic_id: request.body.topic_id,
      title,
      content: normalizeOptionalText(request.body.content),
      tier_gate: normalizeOptionalText(request.body.tier_gate) ?? "free",
      is_free_preview: request.body.is_free_preview ?? false,
      order_index: normalizeOrderIndex(request.body.order_index),
      exam_path: topicResult.data.exam_path,
    };

    const videoUrl = normalizeOptionalText(request.body.video_url);
    if (videoUrl !== null) insertPayload.video_url = videoUrl;
    if (contentType !== null) insertPayload.content_type = contentType;

    const { data, error } = await supabaseAdmin
      .from("lessons")
      .insert(insertPayload)
      .select(LESSON_SELECT)
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
    if (request.body.content_type !== undefined) {
      const contentType = normalizeLessonContentType(request.body.content_type);
      if (!contentType) return reply.status(400).send({ error: "Lesson content_type must be text, video, or mixed" });
      updates.content_type = contentType;
    }
    if (request.body.tier_gate !== undefined) updates.tier_gate = normalizeOptionalText(request.body.tier_gate);
    if (request.body.is_free_preview !== undefined) updates.is_free_preview = request.body.is_free_preview;
    if (request.body.order_index !== undefined) updates.order_index = normalizeOrderIndex(request.body.order_index);

    const { data, error } = await supabaseAdmin
      .from("lessons")
      .update(updates)
      .eq("id", request.params.id)
      .select(LESSON_SELECT)
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return data as LessonRow;
  });

  app.get<{ Params: { lessonId: string } }>(
    "/admin/lessons/:lessonId/blocks",
    async (request, reply) => {
      const admin = await requireAnyAdmin(request, reply);
      if (!admin) return;

      const lessonResult = await getLesson(request.params.lessonId);
      if (lessonResult.error) return reply.status(500).send({ error: lessonResult.error });
      if (!lessonResult.data) return reply.status(404).send({ error: "Lesson not found" });

      const { data, error } = await supabaseAdmin
        .from("lesson_blocks")
        .select(LESSON_BLOCK_SELECT)
        .eq("lesson_id", request.params.lessonId);

      if (error) return reply.status(500).send({ error: error.message });

      const blocks = sortLessonBlocks((data as LessonBlockRow[] | null) ?? []);
      const legacyBlocks = blocks.length === 0 ? buildLegacyLessonBlocks(lessonResult.data) : [];

      return {
        lesson_id: request.params.lessonId,
        has_persisted_blocks: blocks.length > 0,
        uses_legacy_fallback: blocks.length === 0 && legacyBlocks.length > 0,
        blocks: await withSignedLessonBlockUrls(blocks),
        legacy_blocks: await withSignedLessonBlockUrls(legacyBlocks),
      };
    }
  );

  app.post<{
    Params: { lessonId: string };
    Body: {
      block_type: string;
      title?: string;
      text_content?: string;
      video_url?: string;
      video_provider?: string;
    };
  }>("/admin/lessons/:lessonId/blocks", async (request, reply) => {
    const admin = await requireAnyAdmin(request, reply);
    if (!admin) return;

    const lessonResult = await getLesson(request.params.lessonId);
    if (lessonResult.error) return reply.status(500).send({ error: lessonResult.error });
    if (!lessonResult.data) return reply.status(404).send({ error: "Lesson not found" });

    const { data: existingData, error: existingError } = await supabaseAdmin
      .from("lesson_blocks")
      .select(LESSON_BLOCK_SELECT)
      .eq("lesson_id", request.params.lessonId);

    if (existingError) return reply.status(500).send({ error: existingError.message });

    const existingBlocks = sortLessonBlocks((existingData as LessonBlockRow[] | null) ?? []);
    if (existingBlocks.length === 0 && buildLegacyLessonBlocks(lessonResult.data).length > 0) {
      return reply.status(409).send({ error: "Import legacy content before adding structured blocks" });
    }

    const draftResult = buildLessonBlockDraft(request.body);
    if (draftResult.error || !draftResult.data) {
      return reply.status(400).send({ error: draftResult.error ?? "Invalid lesson block payload" });
    }

    const { data, error } = await supabaseAdmin
      .from("lesson_blocks")
      .insert({
        lesson_id: request.params.lessonId,
        ...draftResult.data,
        order_index: getNextLessonBlockOrderIndex(existingBlocks),
      })
      .select(LESSON_BLOCK_SELECT)
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return reply.status(201).send((await withSignedLessonBlockUrls([data as LessonBlockRow]))[0]);
  });

  // ── PDF upload (multipart, multiple files) ────────────────────
  app.post<{ Params: { lessonId: string } }>(
    "/admin/lessons/:lessonId/blocks/upload-pdf",
    async (request, reply) => {
      const admin = await requireAnyAdmin(request, reply);
      if (!admin) return;

      const lessonResult = await getLesson(request.params.lessonId);
      if (lessonResult.error) return reply.status(500).send({ error: lessonResult.error });
      if (!lessonResult.data) return reply.status(404).send({ error: "Lesson not found" });

      const { data: existingData, error: existingError } = await supabaseAdmin
        .from("lesson_blocks")
        .select(LESSON_BLOCK_SELECT)
        .eq("lesson_id", request.params.lessonId);

      if (existingError) return reply.status(500).send({ error: existingError.message });

      const existingBlocks = sortLessonBlocks((existingData as LessonBlockRow[] | null) ?? []);
      if (existingBlocks.length === 0 && buildLegacyLessonBlocks(lessonResult.data).length > 0) {
        return reply.status(409).send({ error: "Import legacy content before adding structured blocks" });
      }

      let nextOrderIndex = getNextLessonBlockOrderIndex(existingBlocks);
      const createdBlocks: LessonBlockRow[] = [];
      const errors: string[] = [];

      const parts = request.parts();
      for await (const part of parts) {
        if (part.type !== "file") continue;
        if (part.mimetype !== "application/pdf") {
          errors.push(`${part.filename}: not a PDF file`);
          await part.toBuffer(); // drain
          continue;
        }

        const buffer = await part.toBuffer();
        const fileId = crypto.randomUUID();
        const storagePath = `lessons/${request.params.lessonId}/${fileId}.pdf`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from("lesson-files")
          .upload(storagePath, buffer, {
            contentType: "application/pdf",
            upsert: false,
          });

        if (uploadError) {
          errors.push(`${part.filename}: upload failed — ${uploadError.message}`);
          continue;
        }

        const { data: blockData, error: blockError } = await supabaseAdmin
          .from("lesson_blocks")
          .insert({
            lesson_id: request.params.lessonId,
            block_type: "pdf",
            title: part.filename?.replace(/\.pdf$/i, "") ?? null,
            text_content: null,
            video_url: null,
            video_provider: null,
            file_path: storagePath,
            file_name: part.filename ?? `${fileId}.pdf`,
            file_size: buffer.length,
            order_index: nextOrderIndex,
          })
          .select(LESSON_BLOCK_SELECT)
          .single();

        if (blockError) {
          errors.push(`${part.filename}: block save failed — ${blockError.message}`);
          await supabaseAdmin.storage.from("lesson-files").remove([storagePath]);
          continue;
        }

        createdBlocks.push(blockData as LessonBlockRow);
        nextOrderIndex++;
      }

      if (createdBlocks.length === 0 && errors.length > 0) {
        return reply.status(400).send({ error: errors.join("; ") });
      }

      return reply.status(201).send({ created: createdBlocks, errors });
    }
  );

  app.patch<{
    Params: { id: string };
    Body: {
      block_type?: string;
      title?: string;
      text_content?: string;
      video_url?: string;
      video_provider?: string;
    };
  }>("/admin/lesson-blocks/:id", async (request, reply) => {
    const admin = await requireAnyAdmin(request, reply);
    if (!admin) return;

    const blockResult = await getLessonBlock(request.params.id);
    if (blockResult.error) return reply.status(500).send({ error: blockResult.error });
    if (!blockResult.data) return reply.status(404).send({ error: "Lesson block not found" });

    const draftResult = buildLessonBlockDraft({
      block_type: request.body.block_type ?? blockResult.data.block_type,
      title: request.body.title !== undefined ? request.body.title : blockResult.data.title,
      text_content: request.body.text_content !== undefined ? request.body.text_content : blockResult.data.text_content,
      video_url: request.body.video_url !== undefined ? request.body.video_url : blockResult.data.video_url,
      video_provider:
        request.body.video_provider !== undefined ? request.body.video_provider : blockResult.data.video_provider,
    });

    if (draftResult.error || !draftResult.data) {
      return reply.status(400).send({ error: draftResult.error ?? "Invalid lesson block payload" });
    }

    const { data, error } = await supabaseAdmin
      .from("lesson_blocks")
      .update(draftResult.data)
      .eq("id", request.params.id)
      .select(LESSON_BLOCK_SELECT)
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return (await withSignedLessonBlockUrls([data as LessonBlockRow]))[0];
  });

  app.patch<{ Params: { id: string } }>(
    "/admin/lesson-blocks/:id/pdf",
    async (request, reply) => {
      const admin = await requireAnyAdmin(request, reply);
      if (!admin) return;

      const blockResult = await getLessonBlock(request.params.id);
      if (blockResult.error) return reply.status(500).send({ error: blockResult.error });
      if (!blockResult.data) return reply.status(404).send({ error: "Lesson block not found" });
      if (blockResult.data.block_type !== "pdf") {
        return reply.status(400).send({ error: "This endpoint only updates PDF blocks" });
      }

      const uploadResult = await parsePdfUpload(request, false);
      if (uploadResult.error) {
        return reply.status(400).send({ error: uploadResult.error });
      }

      let nextFilePath = blockResult.data.file_path;
      let nextFileName = blockResult.data.file_name;
      let nextFileSize = blockResult.data.file_size;
      let uploadedFilePath: string | null = null;

      if (uploadResult.file) {
        uploadedFilePath = buildLessonPdfStoragePath(blockResult.data.lesson_id, uploadResult.file.filename);
        const { error: uploadError } = await supabaseAdmin.storage
          .from(LESSON_FILES_BUCKET)
          .upload(uploadedFilePath, uploadResult.file.buffer, {
            contentType: "application/pdf",
            upsert: false,
          });

        if (uploadError) return reply.status(400).send({ error: uploadError.message });
        nextFilePath = uploadedFilePath;
        nextFileName = uploadResult.file.filename;
        nextFileSize = uploadResult.file.size;
      }

      const { data, error } = await supabaseAdmin
        .from("lesson_blocks")
        .update({
          title: uploadResult.title,
          text_content: null,
          video_url: null,
          video_provider: null,
          file_path: nextFilePath,
          file_name: nextFileName,
          file_size: nextFileSize,
        })
        .eq("id", request.params.id)
        .select(LESSON_BLOCK_SELECT)
        .single();

      if (error) {
        await removeLessonFiles([uploadedFilePath]);
        return reply.status(400).send({ error: error.message });
      }

      if (uploadedFilePath && blockResult.data.file_path && blockResult.data.file_path !== uploadedFilePath) {
        await removeLessonFiles([blockResult.data.file_path]);
      }

      return (await withSignedLessonBlockUrls([data as LessonBlockRow]))[0];
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/admin/lesson-blocks/:id",
    async (request, reply) => {
      const admin = await requireAnyAdmin(request, reply);
      if (!admin) return;

      const blockResult = await getLessonBlock(request.params.id);
      if (blockResult.error) return reply.status(500).send({ error: blockResult.error });
      if (!blockResult.data) return reply.status(404).send({ error: "Lesson block not found" });

      // Clean up Storage file for PDF blocks
      if (blockResult.data.block_type === "pdf" && blockResult.data.file_path) {
        await supabaseAdmin.storage.from("lesson-files").remove([blockResult.data.file_path]);
      }

      const { error } = await supabaseAdmin
        .from("lesson_blocks")
        .delete()
        .eq("id", request.params.id);

      if (error) return reply.status(400).send({ error: error.message });
      await removeLessonFiles([blockResult.data.file_path]);
      return { ok: true };
    }
  );

  app.post<{
    Params: { lessonId: string };
    Body: { block_ids: string[] };
  }>("/admin/lessons/:lessonId/blocks/reorder", async (request, reply) => {
    const admin = await requireAnyAdmin(request, reply);
    if (!admin) return;

    const lessonResult = await getLesson(request.params.lessonId);
    if (lessonResult.error) return reply.status(500).send({ error: lessonResult.error });
    if (!lessonResult.data) return reply.status(404).send({ error: "Lesson not found" });

    const { data: blockData, error: blockError } = await supabaseAdmin
      .from("lesson_blocks")
      .select(LESSON_BLOCK_SELECT)
      .eq("lesson_id", request.params.lessonId);

    if (blockError) return reply.status(500).send({ error: blockError.message });

    const blocks = sortLessonBlocks((blockData as LessonBlockRow[] | null) ?? []);
    const requestedIds = Array.isArray(request.body.block_ids)
      ? request.body.block_ids.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      : [];

    if (requestedIds.length !== blocks.length) {
      return reply.status(400).send({ error: "Reorder payload must include every block for the lesson" });
    }

    if (new Set(requestedIds).size !== requestedIds.length) {
      return reply.status(400).send({ error: "Reorder payload contains duplicate block ids" });
    }

    const blockById = new Map(blocks.map((block) => [block.id, block]));
    if (requestedIds.some((id) => !blockById.has(id))) {
      return reply.status(400).send({ error: "Reorder payload contains blocks outside this lesson" });
    }

    const timestamp = new Date().toISOString();
    const reorderResults = await Promise.all(
      requestedIds.map((id, index) =>
        supabaseAdmin
          .from("lesson_blocks")
          .update({ order_index: index, updated_at: timestamp })
          .eq("id", id)
      )
    );

    const reorderError = reorderResults.find((result) => result.error)?.error;
    if (reorderError) return reply.status(400).send({ error: reorderError.message });

    const { data: reorderedData, error: reorderedError } = await supabaseAdmin
      .from("lesson_blocks")
      .select(LESSON_BLOCK_SELECT)
      .eq("lesson_id", request.params.lessonId);

    if (reorderedError) return reply.status(500).send({ error: reorderedError.message });
    return await withSignedLessonBlockUrls(sortLessonBlocks((reorderedData as LessonBlockRow[] | null) ?? []));
  });

  app.post<{ Params: { lessonId: string } }>(
    "/admin/lessons/:lessonId/blocks/import-legacy",
    async (request, reply) => {
      const admin = await requireAnyAdmin(request, reply);
      if (!admin) return;

      const lessonResult = await getLesson(request.params.lessonId);
      if (lessonResult.error) return reply.status(500).send({ error: lessonResult.error });
      if (!lessonResult.data) return reply.status(404).send({ error: "Lesson not found" });

      const { data: existingData, error: existingError } = await supabaseAdmin
        .from("lesson_blocks")
        .select(LESSON_BLOCK_SELECT)
        .eq("lesson_id", request.params.lessonId);

      if (existingError) return reply.status(500).send({ error: existingError.message });
      if (((existingData as LessonBlockRow[] | null) ?? []).length > 0) {
        return reply.status(409).send({ error: "Lesson already uses structured blocks" });
      }

      const draftBlocks = buildLegacyImportPayload(lessonResult.data);
      if (draftBlocks.length === 0) {
        return reply.status(400).send({ error: "Lesson has no legacy content to import" });
      }

      const { data, error } = await supabaseAdmin
        .from("lesson_blocks")
        .insert(
          draftBlocks.map((block, index) => ({
            lesson_id: request.params.lessonId,
            ...block,
            order_index: index,
          }))
        )
        .select(LESSON_BLOCK_SELECT);

      if (error) return reply.status(400).send({ error: error.message });
      return reply.status(201).send(
        await withSignedLessonBlockUrls(sortLessonBlocks((data as LessonBlockRow[] | null) ?? []))
      );
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/admin/lessons/:id",
    async (request, reply) => {
      const admin = await requireAnyAdmin(request, reply);
      if (!admin) return;

      const { data: blockData, error: blockError } = await supabaseAdmin
        .from("lesson_blocks")
        .select("file_path")
        .eq("lesson_id", request.params.id);

      if (blockError) return reply.status(500).send({ error: blockError.message });

      const { error } = await supabaseAdmin
        .from("lessons")
        .delete()
        .eq("id", request.params.id);

      if (error) return reply.status(400).send({ error: error.message });
      await removeLessonFiles(((blockData as Array<{ file_path: string | null }> | null) ?? []).map((block) => block.file_path));
      return { ok: true };
    }
  );
}
