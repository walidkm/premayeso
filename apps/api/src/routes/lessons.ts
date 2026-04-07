import { FastifyInstance } from "fastify";
import { supabase } from "../lib/supabase.js";
import {
  resolveLessonBlocks,
  type LessonWithBlocksRow,
} from "../lib/adminContent.js";

export async function lessonRoutes(app: FastifyInstance) {
  app.get<{ Params: { topicId: string } }>(
    "/topics/:topicId/lessons",
    async (request, reply) => {
      const { topicId } = request.params;

      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, content, video_url, content_type, order_index")
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
          "id, topic_id, title, content, video_url, content_type, tier_gate, is_free_preview, order_index, exam_path, lesson_blocks(id, lesson_id, block_type, title, text_content, video_url, video_provider, order_index, created_at, updated_at)"
        )
        .eq("id", lessonId)
        .maybeSingle();

      if (error || !data) {
        return reply.status(404).send({ error: "Lesson not found" });
      }

      const lesson = data as LessonWithBlocksRow;
      const { lesson_blocks, ...lessonMetadata } = lesson;

      return {
        ...lessonMetadata,
        blocks: resolveLessonBlocks({ ...lessonMetadata, lesson_blocks }),
      };
    }
  );
}
