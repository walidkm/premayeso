import { FastifyInstance } from "fastify";
import { supabase } from "../lib/supabase.js";

export async function paperRoutes(app: FastifyInstance) {
  // GET /subjects/:subjectId/papers
  // Returns past papers available for a subject, with question count
  app.get<{ Params: { subjectId: string }; Querystring: { exam_path?: string } }>(
    "/subjects/:subjectId/papers",
    async (request, reply) => {
      const { subjectId } = request.params;
      const { exam_path } = request.query;

      let query = supabase
        .from("exam_papers")
        .select(`
          id, title, year, paper_number, source_type,
          paper_type, exam_mode, exam_path,
          paper_questions(id)
        `)
        .eq("subject_id", subjectId)
        .neq("paper_type", "question_pool")
        .order("year", { ascending: false })
        .order("paper_number", { ascending: true });

      if (exam_path) {
        query = query.eq("exam_path", exam_path);
      }

      const { data, error } = await query;
      if (error) return reply.status(500).send({ error: error.message });

      const result = (data ?? []).map((p: any) => ({
        id: p.id,
        title: p.title,
        year: p.year,
        paper_number: p.paper_number,
        source_type: p.source_type,
        paper_type: p.paper_type,
        exam_mode: p.exam_mode,
        exam_path: p.exam_path,
        question_count: p.paper_questions?.length ?? 0,
      }));

      return result;
    }
  );

  // GET /papers/:paperId/questions
  // Returns questions for a paper, ordered by order_index, grouped by section
  app.get<{ Params: { paperId: string } }>(
    "/papers/:paperId/questions",
    async (request, reply) => {
      const { paperId } = request.params;

      const { data, error } = await supabase
        .from("paper_questions")
        .select(`
          order_index, section,
          questions(
            id, stem, options, type, difficulty, marks,
            hints, tier_gate, explanation, allow_shuffle, question_no
          )
        `)
        .eq("exam_paper_id", paperId)
        .order("order_index", { ascending: true });

      if (error) return reply.status(500).send({ error: error.message });

      const result = (data ?? [])
        .filter((row: any) => row.questions)
        .map((row: any) => ({
          order_index: row.order_index,
          section: row.section ?? null,
          question: row.questions,
        }));

      return result;
    }
  );

  // GET /papers/:paperId
  // Returns paper metadata
  app.get<{ Params: { paperId: string } }>(
    "/papers/:paperId",
    async (request, reply) => {
      const { paperId } = request.params;

      const { data, error } = await supabase
        .from("exam_papers")
        .select(`
          id, title, year, paper_number, source_type,
          paper_type, exam_mode, exam_path,
          subjects(name, code)
        `)
        .eq("id", paperId)
        .maybeSingle();

      if (error) return reply.status(500).send({ error: error.message });
      if (!data) return reply.status(404).send({ error: "Paper not found" });

      return data;
    }
  );
}
