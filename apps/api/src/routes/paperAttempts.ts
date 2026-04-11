import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getBearerToken, verifyAccess } from "../lib/jwt.js";
import { isLearnerRole } from "../lib/roles.js";
import {
  buildAttemptSummary,
  getAttemptQuestionSavedAnswers,
  getAttemptRecord,
  loadPaperStructure,
  maybeAutoSubmitAttempt,
  sanitizeQuestionForDelivery,
  savePaperAnswer,
  startPaperAttempt,
  submitPaperAttempt,
} from "../lib/paperAttempts.js";

function logAttemptFailure(
  request: FastifyRequest,
  stage: string,
  error: unknown,
  context: Record<string, unknown> = {}
) {
  request.log.error(
    {
      stage,
      ...context,
      err: error,
    },
    `${stage} failed`
  );
}

async function requireStudentToken(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<{ userId: string; role: string } | null> {
  const token = getBearerToken(request.headers.authorization);
  if (!token) {
    reply.status(401).send({ error: "Missing bearer token" });
    return null;
  }

  try {
    const payload = verifyAccess(token);
    if (!isLearnerRole(payload.role)) {
      reply.status(403).send({ error: "Learner access is required for this endpoint" });
      return null;
    }
    return { userId: payload.sub, role: payload.role };
  } catch {
    reply.status(401).send({ error: "Invalid or expired token" });
    return null;
  }
}

export async function paperAttemptRoutes(app: FastifyInstance) {
  app.post<{ Params: { paperId: string } }>("/papers/:paperId/attempts", async (request, reply) => {
    const auth = await requireStudentToken(request, reply);
    if (!auth) return;

    try {
      const attempt = await startPaperAttempt(request.params.paperId, auth.userId);
      const structure = await loadPaperStructure(request.params.paperId);

      return {
        attempt,
        paper: {
          ...structure.paper,
          paper_sections: structure.sections,
        },
        sections: structure.sections,
        firstQuestionId: structure.questions[0]?.id ?? null,
        questionCount: structure.questions.length,
      };
    } catch (error) {
      logAttemptFailure(request, "paper_attempt_start", error, {
        paperId: request.params.paperId,
        userId: auth.userId,
      });
      return reply.status(400).send({ error: error instanceof Error ? error.message : "Failed to start paper attempt" });
    }
  });

  app.get<{ Params: { attemptId: string } }>("/paper-attempts/:attemptId", async (request, reply) => {
    const auth = await requireStudentToken(request, reply);
    if (!auth) return;

    try {
      const attempt = await getAttemptRecord(request.params.attemptId);
      if (attempt.user_id !== auth.userId) {
        return reply.status(403).send({ error: "You do not have access to this attempt" });
      }

      const structure = await loadPaperStructure(attempt.exam_paper_id);
      const resolvedAttempt = await maybeAutoSubmitAttempt(attempt, structure);
      const summary = await buildAttemptSummary(resolvedAttempt, structure);

      return {
        ...summary,
        firstQuestionId: structure.questions[0]?.id ?? null,
        questionCount: structure.questions.length,
        remainingSeconds: Math.max(
          0,
          Math.floor((new Date(resolvedAttempt.expires_at).getTime() - Date.now()) / 1000)
        ),
      };
    } catch (error) {
      logAttemptFailure(request, "paper_attempt_load", error, {
        attemptId: request.params.attemptId,
        userId: auth.userId,
      });
      return reply.status(400).send({ error: error instanceof Error ? error.message : "Failed to load paper attempt" });
    }
  });

  app.get<{ Params: { attemptId: string; paperQuestionId: string } }>(
    "/paper-attempts/:attemptId/questions/:paperQuestionId",
    async (request, reply) => {
      const auth = await requireStudentToken(request, reply);
      if (!auth) return;

      try {
        const attempt = await getAttemptRecord(request.params.attemptId);
        if (attempt.user_id !== auth.userId) {
          return reply.status(403).send({ error: "You do not have access to this attempt" });
        }

        const structure = await loadPaperStructure(attempt.exam_paper_id);
        const resolvedAttempt = await maybeAutoSubmitAttempt(attempt, structure);
        if (resolvedAttempt.status !== "in_progress") {
          return reply.status(409).send({ error: "Attempt is no longer in progress" });
        }

        const paperQuestion = structure.questions.find(
          (question) => question.id === request.params.paperQuestionId
        );

        if (!paperQuestion) {
          return reply.status(404).send({ error: "Paper question not found" });
        }

        const savedAnswers = await getAttemptQuestionSavedAnswers(
          request.params.attemptId,
          request.params.paperQuestionId
        );

        return {
          paper: {
            ...structure.paper,
            paper_sections: structure.sections,
          },
          section:
            structure.sections.find((section) => section.id === paperQuestion.section_id) ?? null,
          question: sanitizeQuestionForDelivery(paperQuestion, resolvedAttempt, savedAnswers),
        };
      } catch (error) {
        logAttemptFailure(request, "paper_attempt_question_load", error, {
          attemptId: request.params.attemptId,
          paperQuestionId: request.params.paperQuestionId,
          userId: auth.userId,
        });
        return reply.status(400).send({ error: error instanceof Error ? error.message : "Failed to fetch attempt question" });
      }
    }
  );

  app.put<{
    Params: { attemptId: string; paperQuestionId: string };
    Body: {
      selectedOption?: string | null;
      textAnswer?: string | null;
      numericAnswer?: number | null;
      answerPayload?: Record<string, unknown> | null;
      partAnswers?: Array<{
        questionPartId?: string;
        partLabel?: string;
        selectedOption?: string | null;
        textAnswer?: string | null;
        numericAnswer?: number | null;
        answerPayload?: Record<string, unknown> | null;
      }>;
    };
  }>("/paper-attempts/:attemptId/answers/:paperQuestionId", async (request, reply) => {
    const auth = await requireStudentToken(request, reply);
    if (!auth) return;

    try {
      const attempt = await getAttemptRecord(request.params.attemptId);
      if (attempt.user_id !== auth.userId) {
        return reply.status(403).send({ error: "You do not have access to this attempt" });
      }

      const structure = await loadPaperStructure(attempt.exam_paper_id);
      const resolvedAttempt = await maybeAutoSubmitAttempt(attempt, structure);
      if (resolvedAttempt.status !== "in_progress") {
        return reply.status(409).send({ error: "Attempt is no longer in progress" });
      }

      const paperQuestion = structure.questions.find(
        (question) => question.id === request.params.paperQuestionId
      );

      if (!paperQuestion) {
        return reply.status(404).send({ error: "Paper question not found" });
      }

      await savePaperAnswer(resolvedAttempt, paperQuestion, request.body ?? {});
      return { saved: true };
    } catch (error) {
      logAttemptFailure(request, "paper_attempt_save_answer", error, {
        attemptId: request.params.attemptId,
        paperQuestionId: request.params.paperQuestionId,
        userId: auth.userId,
      });
      return reply.status(400).send({ error: error instanceof Error ? error.message : "Failed to save answer" });
    }
  });

  app.post<{
    Params: { attemptId: string };
    Body: { selected_question_ids_by_section?: Record<string, string[]> };
  }>("/paper-attempts/:attemptId/submit", async (request, reply) => {
    const auth = await requireStudentToken(request, reply);
    if (!auth) return;

    try {
      const attempt = await getAttemptRecord(request.params.attemptId);
      if (attempt.user_id !== auth.userId) {
        return reply.status(403).send({ error: "You do not have access to this attempt" });
      }

      const structure = await loadPaperStructure(attempt.exam_paper_id);
      const resolvedAttempt = await maybeAutoSubmitAttempt(attempt, structure);
      if (resolvedAttempt.status !== "in_progress") {
        const summary = await buildAttemptSummary(resolvedAttempt, structure);
        return summary;
      }

      const submitResult = await submitPaperAttempt(
        resolvedAttempt,
        structure,
        request.body?.selected_question_ids_by_section ?? {}
      );

      if (!submitResult.ok) {
        logAttemptFailure(request, "paper_attempt_submit_validation", new Error("Submission validation failed"), {
          attemptId: request.params.attemptId,
          userId: auth.userId,
          validationErrors: submitResult.validationErrors,
        });
        return reply.status(400).send({
          error: "Submission validation failed",
          validationErrors: submitResult.validationErrors,
        });
      }

      return buildAttemptSummary(submitResult.attempt, structure);
    } catch (error) {
      logAttemptFailure(request, "paper_attempt_submit", error, {
        attemptId: request.params.attemptId,
        userId: auth.userId,
      });
      return reply.status(400).send({ error: error instanceof Error ? error.message : "Failed to submit paper" });
    }
  });

  app.get<{ Params: { attemptId: string } }>("/paper-attempts/:attemptId/review", async (request, reply) => {
    const auth = await requireStudentToken(request, reply);
    if (!auth) return;

    try {
      const attempt = await getAttemptRecord(request.params.attemptId);
      if (attempt.user_id !== auth.userId) {
        return reply.status(403).send({ error: "You do not have access to this attempt" });
      }

      const structure = await loadPaperStructure(attempt.exam_paper_id);
      const resolvedAttempt = await maybeAutoSubmitAttempt(attempt, structure);
      return buildAttemptSummary(resolvedAttempt, structure);
    } catch (error) {
      logAttemptFailure(request, "paper_attempt_review_load", error, {
        attemptId: request.params.attemptId,
        userId: auth.userId,
      });
      return reply.status(400).send({ error: error instanceof Error ? error.message : "Failed to fetch review" });
    }
  });
}
