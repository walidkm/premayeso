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
        .select("id, topic_id, lesson_id, stem, options, explanation")
        .eq("topic_id", topicId);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return data;
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
      .select("correct_option, explanation")
      .eq("id", questionId)
      .single();

    if (error || !data) {
      return reply.status(404).send({ error: "Question not found" });
    }

    return {
      correct: chosenOption === data.correct_option,
      correctOption: data.correct_option,
      explanation: data.explanation ?? null,
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

    // user_id is nullable until auth is added
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
