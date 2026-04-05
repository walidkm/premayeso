import { FastifyInstance } from "fastify";
import { supabase } from "../lib/supabase.js";

export async function subjectRoutes(app: FastifyInstance) {
  // GET /subjects?exam_path=JCE
  app.get<{ Querystring: { exam_path?: string } }>(
    "/subjects",
    async (request, reply) => {
      const { exam_path } = request.query;

      let query = supabase
        .from("subjects")
        .select("id, name, code, description, exam_path, order_index")
        .order("order_index");

      if (exam_path) {
        query = query.eq("exam_path", exam_path.toUpperCase());
      }

      const { data, error } = await query;

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return data;
    }
  );

  // GET /subjects/:subjectId/topics
  app.get<{ Params: { subjectId: string }; Querystring: { form_level?: string } }>(
    "/subjects/:subjectId/topics",
    async (request, reply) => {
      const { subjectId } = request.params;
      const { form_level } = request.query;

      let query = supabase
        .from("topics")
        .select("id, name, description, form_level, exam_path, order_index")
        .eq("subject_id", subjectId)
        .order("order_index");

      if (form_level) {
        query = query.eq("form_level", form_level.toUpperCase());
      }

      const { data, error } = await query;

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return data;
    }
  );
}
