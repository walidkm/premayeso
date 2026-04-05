import { FastifyInstance } from "fastify";
import { supabase } from "../lib/supabase.js";

export async function lessonRoutes(app: FastifyInstance) {
  app.get<{ Params: { topicId: string } }>(
    "/topics/:topicId/lessons",
    async (request, reply) => {
      const { topicId } = request.params;

      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, content, order_index")
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
        .select("id, title, content, order_index, topic_id")
        .eq("id", lessonId)
        .single();

      if (error) {
        return reply.status(404).send({ error: "Lesson not found" });
      }

      return data;
    }
  );
}
