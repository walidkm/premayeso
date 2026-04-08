import { FastifyInstance } from "fastify";
import { supabase } from "../lib/supabase.js";

function sanitizeOptions(options: Array<{ key: string; text: string }> | null | undefined) {
  return (options ?? []).map((option) => ({
    key: option.key,
    text: option.text,
  }));
}

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
          id, title, year, session, paper_number, paper_code, source_type,
          paper_type, exam_mode, exam_path, duration_min, total_marks,
          instructions, has_sections, marking_mode, solution_unlock_mode,
          question_mode, status, paper_questions(id), paper_sections(id)
        `)
        .eq("subject_id", subjectId)
        .neq("paper_type", "question_pool")
        .eq("status", "published")
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
        session: p.session,
        paper_number: p.paper_number,
        paper_code: p.paper_code,
        source_type: p.source_type,
        paper_type: p.paper_type,
        exam_mode: p.exam_mode,
        exam_path: p.exam_path,
        duration_min: p.duration_min,
        total_marks: p.total_marks,
        instructions: p.instructions,
        has_sections: p.has_sections,
        marking_mode: p.marking_mode,
        solution_unlock_mode: p.solution_unlock_mode,
        question_mode: p.question_mode,
        status: p.status,
        question_count: p.paper_questions?.length ?? 0,
        section_count: p.paper_sections?.length ?? 0,
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
          id, order_index, section, section_id, question_number,
          questions(
            id, stem, options, type, difficulty, marks,
            hints, tier_gate, allow_shuffle, question_no,
            question_parts(id, part_label, body, marks, order_index, options)
          )
        `)
        .eq("exam_paper_id", paperId)
        .order("order_index", { ascending: true });

      if (error) return reply.status(500).send({ error: error.message });

      const result = (data ?? [])
        .filter((row: any) => row.questions)
        .map((row: any) => ({
          id: row.id,
          order_index: row.order_index,
          section: row.section ?? null,
          section_id: row.section_id ?? null,
          question_number: row.question_number ?? null,
          question: {
            ...row.questions,
            options: sanitizeOptions(row.questions.options),
            question_parts: (row.questions.question_parts ?? []).map((part: any) => ({
              ...part,
              options: sanitizeOptions(part.options),
            })),
          },
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
          id, title, year, session, paper_number, paper_code, source_type,
          paper_type, exam_mode, exam_path, duration_min, total_marks,
          instructions, has_sections, marking_mode, solution_unlock_mode,
          question_mode, status, subjects(name, code),
          paper_sections(
            id, section_code, title, instructions, order_index,
            question_selection_mode, required_count, max_marks
          )
        `)
        .eq("id", paperId)
        .eq("status", "published")
        .maybeSingle();

      if (error) return reply.status(500).send({ error: error.message });
      if (!data) return reply.status(404).send({ error: "Paper not found" });

      return data;
    }
  );
}
