import { FastifyInstance } from "fastify";
import { supabase } from "../lib/supabase.js";

export async function subjectRoutes(app: FastifyInstance) {
  app.get("/subjects", async (request, reply) => {
    const { data, error } = await supabase
      .from("subjects")
      .select("id, name, description")
      .order("name");

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return data;
  });

  app.get<{ Params: { subjectId: string } }>(
    "/subjects/:subjectId/topics",
    async (request, reply) => {
      const { subjectId } = request.params;

      const { data, error } = await supabase
        .from("topics")
        .select("id, name, description, order_index")
        .eq("subject_id", subjectId)
        .order("order_index");

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return data;
    }
  );
}
