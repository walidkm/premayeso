import { FastifyInstance } from "fastify";
import { supabase } from "../lib/supabase.js";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import {
  resolveLessonBlocks,
  type LessonBlockRow,
  type LessonWithBlocksRow,
} from "../lib/adminContent.js";

function hasLessonsSchemaCacheError(message: string | null | undefined): boolean {
  if (!message) return false;

  return (
    message.includes("'content_type' column of 'lessons'") ||
    message.includes("'video_url' column of 'lessons'") ||
    message.includes("'lesson_blocks'") ||
    message.includes("schema cache")
  );
}

async function attachSignedUrls(
  blocks: LessonBlockRow[]
): Promise<(LessonBlockRow & { download_url: string | null })[]> {
  return Promise.all(
    blocks.map(async (block) => {
      if (block.block_type !== "pdf" || !block.file_path) {
        return { ...block, download_url: null };
      }

      const { data } = await supabaseAdmin.storage
        .from("lesson-files")
        .createSignedUrl(block.file_path, 3600);

      return { ...block, download_url: data?.signedUrl ?? null };
    })
  );
}

export async function lessonRoutes(app: FastifyInstance) {
  app.get<{ Params: { topicId: string } }>(
    "/topics/:topicId/lessons",
    async (request, reply) => {
      const { topicId } = request.params;

      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("topic_id", topicId)
        .order("order_index");

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return data;
    }
  );

  app.get<{ Params: { lessonId: string } }>(
    "/lessons/:lessonId",
    async (request, reply) => {
      const { lessonId } = request.params;

      const { data, error } = await supabase
        .from("lessons")
        .select(
          "*, lesson_blocks(id, lesson_id, block_type, title, text_content, video_url, video_provider, file_path, file_name, file_size, order_index, created_at, updated_at)"
        )
        .eq("id", lessonId)
        .maybeSingle();

      if (error) {
        if (!hasLessonsSchemaCacheError(error.message)) {
          return reply.status(404).send({ error: "Lesson not found" });
        }

        const { data: fallbackData, error: fallbackError } = await supabase
          .from("lessons")
          .select("*")
          .eq("id", lessonId)
          .maybeSingle();

        if (fallbackError || !fallbackData) {
          return reply.status(404).send({ error: "Lesson not found" });
        }

        return {
          ...fallbackData,
          blocks: await attachSignedUrls(resolveLessonBlocks(fallbackData)),
        };
      }

      if (!data) {
        return reply.status(404).send({ error: "Lesson not found" });
      }

      const lesson = data as LessonWithBlocksRow;
      const { lesson_blocks, ...lessonMetadata } = lesson;

      return {
        ...lessonMetadata,
        blocks: await attachSignedUrls(resolveLessonBlocks({ ...lessonMetadata, lesson_blocks })),
      };
    }
  );
}
