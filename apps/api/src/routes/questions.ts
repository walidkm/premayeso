import { FastifyInstance } from "fastify";
import { supabase } from "../lib/supabase.js";

export async function questionRoutes(app: FastifyInstance) {
  // GET /topics/:topicId/questions — correct_option intentionally omitted
  app.get<{ Params: { topicId: string } }>(
    "/topics/:topicId/questions",
    async (request, reply) => {
      const { topicId } = request.params;

      const { data, error } = await supabase
        .from("questions")
        .select(`
          id, topic_id, subtopic_id, stem, options, explanation,
          type, difficulty, marks, allow_shuffle, hints, tier_gate, language,
          paper_questions(
            order_index, section,
            exam_papers(
              year, paper_number, source_type, title,
              schools(name)
            )
          )
        `)
        .eq("topic_id", topicId)
        .eq("is_approved", true);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      const result = (data ?? []).map((q: any) => {
        const firstPaper = q.paper_questions?.[0]?.exam_papers;
        let source = null;
        if (firstPaper) {
          source = {
            school: firstPaper.schools?.name ?? null,
            year: firstPaper.year ?? null,
            paper_number: firstPaper.paper_number ?? null,
            source_type: firstPaper.source_type ?? null,
            title: firstPaper.title ?? null,
          };
        }
        const { paper_questions, ...rest } = q;
        return { ...rest, source };
      });

      return result;
    }
  );

  // POST /questions/:questionId/check
  app.post<{
    Params: { questionId: string };
    Body: { chosenOption: string };
  }>("/questions/:questionId/check", async (request, reply) => {
    const { questionId } = request.params;
    const { chosenOption } = request.body;

    const { data, error } = await supabase
      .from("questions")
      .select("correct_option, explanation, worked_solution")
      .eq("id", questionId)
      .single();

    if (error || !data) {
      return reply.status(404).send({ error: "Question not found" });
    }

    return {
      correct: chosenOption === data.correct_option,
      correctOption: data.correct_option,
      explanation: data.explanation ?? null,
      workedSolution: data.worked_solution ?? null,
    };
  });

  // POST /quiz-attempts
  app.post<{
    Body: {
      user_id: string | null;
      topic_id: string;
      score: number;
      total: number;
      answers: { question_id: string; chosen: string; correct: boolean }[];
    };
  }>("/quiz-attempts", async (request, reply) => {
    const { user_id, topic_id, score, total, answers } = request.body;

    if (!user_id) {
      return reply.status(201).send({ saved: false, reason: "no_user" });
    }

    const { error } = await supabase.from("quiz_attempts").insert({
      user_id,
      topic_id,
      score,
      total,
      answers,
    });

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return reply.status(201).send({ saved: true });
  });
}
