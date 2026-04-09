import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  buildAttemptSummary,
  getAttemptQuestionSavedAnswers,
  getAttemptRecord,
  loadPaperStructure,
  maybeAutoSubmitAttempt,
  refreshAttemptScores,
  sanitizeQuestionForDelivery,
  savePaperAnswer,
  submitPaperAttempt,
  type AttemptRecord,
  type PaperStructure,
} from "./paperAttempts.js";
import { buildPaperWorkbookPreview, publishPaperWorkbook } from "./paperAdmin.js";
import { supabaseAdmin } from "./supabaseAdmin.js";

type SubjectTopicSeed = {
  subjectId: string;
  topicId: string;
  examPath: string;
};

async function loadSeedSubjectAndTopic(): Promise<SubjectTopicSeed> {
  const { data: subjects, error: subjectError } = await supabaseAdmin
    .from("subjects")
    .select("id, exam_path, topics(id)")
    .eq("exam_path", "JCE")
    .order("order_index")
    .limit(10);

  if (subjectError) throw new Error(subjectError.message);

  const subjectWithTopic = (subjects ?? []).find(
    (subject: any) => (subject.topics?.length ?? 0) > 0
  );

  if (!subjectWithTopic?.id || !subjectWithTopic.topics?.[0]?.id) {
    throw new Error("A seeded JCE subject and topic are required for DB paper flow tests");
  }

  return {
    subjectId: subjectWithTopic.id,
    topicId: subjectWithTopic.topics[0].id,
    examPath: subjectWithTopic.exam_path ?? "JCE",
  };
}

function buildPaperPayload(seed: SubjectTopicSeed, namespace: string) {
  const paperCode = `TEST-${namespace}`;
  const rubricCode = `RUBRIC-${namespace}`;

  return {
    paperCode,
    rubricCode,
    payload: {
      paper: {
        examPath: seed.examPath,
        subjectId: seed.subjectId,
        subjectCode: "TEST",
        title: `Structured Paper ${namespace}`,
        year: 2024,
        session: "JCE",
        paperNumber: 1,
        paperCode,
        durationMin: 120,
        totalMarks: 35,
        instructions: "Integration test paper",
        sourceType: "maneb",
        markingMode: "manual",
        solutionUnlockMode: "after_marked",
        questionMode: "one_question_at_a_time",
        status: "published",
        isSample: false,
      },
      sections: [
        {
          sectionCode: "A",
          title: "Section A",
          instructions: "Answer all questions",
          orderIndex: 0,
          questionSelectionMode: "answer_all",
          requiredCount: null,
          maxMarks: 25,
          startsAtQuestionNumber: 1,
          endsAtQuestionNumber: 3,
        },
        {
          sectionCode: "B",
          title: "Section B",
          instructions: "Answer any two questions",
          orderIndex: 1,
          questionSelectionMode: "answer_any_n",
          requiredCount: 2,
          maxMarks: 10,
          startsAtQuestionNumber: 4,
          endsAtQuestionNumber: 6,
        },
      ],
      rubrics: [
        {
          rubricCode,
          title: "Essay Rubric",
          totalMarks: 15,
          criteria: [
            {
              criterionName: "Knowledge",
              maxMarks: 7,
              orderIndex: 0,
              markBands: [],
            },
            {
              criterionName: "Communication",
              maxMarks: 8,
              orderIndex: 1,
              markBands: [],
            },
          ],
        },
      ],
      questions: [
        {
          questionNumber: 1,
          sectionCode: "A",
          type: "mcq",
          body: "Which organelle controls cell activities?",
          marks: 2,
          topicId: seed.topicId,
          subtopicId: null,
          difficulty: "medium",
          allowShuffle: false,
          expectedAnswer: null,
          explanation: "The nucleus contains the genetic material.",
          rubricCode: null,
          autoMarkingMode: "exact",
          correctOption: "A",
          options: [
            { key: "A", text: "Nucleus", isCorrect: true, distractorExplanation: null },
            { key: "B", text: "Ribosome", isCorrect: false, distractorExplanation: "Not correct" },
          ],
          parts: [],
        },
        {
          questionNumber: 2,
          sectionCode: "A",
          type: "structured",
          body: "Answer the structured question.",
          marks: 8,
          topicId: seed.topicId,
          subtopicId: null,
          difficulty: "medium",
          allowShuffle: false,
          expectedAnswer: null,
          explanation: null,
          rubricCode: null,
          autoMarkingMode: "manual",
          correctOption: null,
          options: [],
          parts: [
            {
              partLabel: "a",
              body: "Part A",
              marks: 4,
              expectedAnswer: "alpha",
              rubricCode: null,
              autoMarkingMode: "manual",
              orderIndex: 0,
              correctOption: null,
              options: [],
            },
            {
              partLabel: "b",
              body: "Part B",
              marks: 4,
              expectedAnswer: "beta",
              rubricCode: null,
              autoMarkingMode: "manual",
              orderIndex: 1,
              correctOption: null,
              options: [],
            },
          ],
        },
        {
          questionNumber: 3,
          sectionCode: "A",
          type: "essay",
          body: "Discuss photosynthesis.",
          marks: 15,
          topicId: seed.topicId,
          subtopicId: null,
          difficulty: "hard",
          allowShuffle: false,
          expectedAnswer: null,
          explanation: null,
          rubricCode,
          autoMarkingMode: "manual",
          correctOption: null,
          options: [],
          parts: [],
        },
        {
          questionNumber: 4,
          sectionCode: "B",
          type: "mcq",
          body: "Question 4",
          marks: 5,
          topicId: seed.topicId,
          subtopicId: null,
          difficulty: "medium",
          allowShuffle: false,
          expectedAnswer: null,
          explanation: "Option A is correct.",
          rubricCode: null,
          autoMarkingMode: "exact",
          correctOption: "A",
          options: [
            { key: "A", text: "A", isCorrect: true, distractorExplanation: null },
            { key: "B", text: "B", isCorrect: false, distractorExplanation: "Incorrect" },
          ],
          parts: [],
        },
        {
          questionNumber: 5,
          sectionCode: "B",
          type: "mcq",
          body: "Question 5",
          marks: 5,
          topicId: seed.topicId,
          subtopicId: null,
          difficulty: "medium",
          allowShuffle: false,
          expectedAnswer: null,
          explanation: "Option A is correct.",
          rubricCode: null,
          autoMarkingMode: "exact",
          correctOption: "A",
          options: [
            { key: "A", text: "A", isCorrect: true, distractorExplanation: null },
            { key: "B", text: "B", isCorrect: false, distractorExplanation: "Incorrect" },
          ],
          parts: [],
        },
        {
          questionNumber: 6,
          sectionCode: "B",
          type: "mcq",
          body: "Question 6",
          marks: 5,
          topicId: seed.topicId,
          subtopicId: null,
          difficulty: "medium",
          allowShuffle: false,
          expectedAnswer: null,
          explanation: "Option A is correct.",
          rubricCode: null,
          autoMarkingMode: "exact",
          correctOption: "A",
          options: [
            { key: "A", text: "A", isCorrect: true, distractorExplanation: null },
            { key: "B", text: "B", isCorrect: false, distractorExplanation: "Incorrect" },
          ],
          parts: [],
        },
      ],
    },
  };
}

async function publishFixturePaper(seed: SubjectTopicSeed, namespace: string) {
  const { paperCode, rubricCode, payload } = buildPaperPayload(seed, namespace);
  const { data, error } = await supabaseAdmin.rpc("admin_publish_paper_workbook", {
    p_payload: payload,
  });

  if (error) {
    if (error.message.includes("Could not find the function public.admin_publish_paper_workbook")) {
      throw new Error(
        "Structured paper publish RPC is missing from the target database. Apply migration 013_paper_import_rpc.sql before running DB integration tests."
      );
    }
    throw new Error(error.message);
  }
  const examPaperId = (data as { exam_paper_id?: string } | null)?.exam_paper_id;
  if (!examPaperId) {
    throw new Error("Publish RPC did not return an exam_paper_id");
  }

  return { paperCode, rubricCode, examPaperId };
}

async function createAttempt(
  examPaperId: string,
  expiresAt: string,
  maxScore = 35
): Promise<AttemptRecord> {
  const now = new Date();
  const { data, error } = await supabaseAdmin
    .from("paper_attempts")
    .insert({
      exam_paper_id: examPaperId,
      user_id: null,
      status: "in_progress",
      marking_status: "pending",
      time_limit_seconds: 3600,
      started_at: now.toISOString(),
      expires_at: expiresAt,
      max_score: maxScore,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not create test attempt");
  return data as AttemptRecord;
}

function mapQuestions(structure: PaperStructure) {
  const byNumber = new Map(
    structure.questions.map((paperQuestion) => [paperQuestion.question_number, paperQuestion] as const)
  );

  return {
    sectionA: structure.sections.find((section) => section.section_code === "A")!,
    sectionB: structure.sections.find((section) => section.section_code === "B")!,
    q1: byNumber.get(1)!,
    q2: byNumber.get(2)!,
    q3: byNumber.get(3)!,
    q4: byNumber.get(4)!,
    q5: byNumber.get(5)!,
    q6: byNumber.get(6)!,
  };
}

async function insertHumanMark(
  attemptId: string,
  attemptAnswerId: string,
  finalScore: number,
  criterionId: string | null = null
) {
  const { error } = await supabaseAdmin.from("answer_marks").insert({
    paper_attempt_id: attemptId,
    attempt_answer_id: attemptAnswerId,
    criterion_id: criterionId,
    marker_type: "human",
    score: finalScore,
    suggested_score: finalScore,
    final_score: finalScore,
    comment: null,
    moderation_status: "reviewed",
  });

  if (error) throw new Error(error.message);
}

async function upsertReview(
  attemptId: string,
  paperQuestionId: string,
  attemptAnswerId: string,
  status: "draft" | "finalized",
  finalTotal: number
) {
  const { error: deleteError } = await supabaseAdmin
    .from("essay_marking_reviews")
    .delete()
    .eq("paper_attempt_id", attemptId)
    .eq("attempt_answer_id", attemptAnswerId);

  if (deleteError) throw new Error(deleteError.message);

  const { error } = await supabaseAdmin.from("essay_marking_reviews").insert({
    paper_attempt_id: attemptId,
    paper_question_id: paperQuestionId,
    attempt_answer_id: attemptAnswerId,
    reviewer_user_id: null,
    marker_mode: "manual",
    status,
    overall_comment: null,
    suggested_total: finalTotal,
    final_total: finalTotal,
    finalized_at: status === "finalized" ? new Date().toISOString() : null,
  });

  if (error) throw new Error(error.message);
}

async function cleanupFixture(paperCode: string, rubricCode: string) {
  const poolTag = `paper_import:${paperCode}`;
  await supabaseAdmin.from("exam_papers").delete().eq("paper_code", paperCode);
  await supabaseAdmin.from("questions").delete().eq("pool_tag", poolTag);
  await supabaseAdmin.from("essay_rubrics").delete().eq("rubric_code", rubricCode);
}

function buildOfficialWorkbookUrl() {
  return new URL("../../../../infra/samples/golden/maneb-2021-jce-biology-sample-j022.xlsx", import.meta.url);
}

function remapPublishError(error: unknown): never {
  if (error instanceof Error && error.message.includes("Could not find the function public.admin_publish_paper_workbook")) {
    throw new Error(
      "Structured paper publish RPC is missing from the target database. Apply migration 013_paper_import_rpc.sql before running DB integration tests."
    );
  }

  throw error;
}

async function loadOfficialWorkbookPreview() {
  const buffer = readFileSync(buildOfficialWorkbookUrl());
  return buildPaperWorkbookPreview(buffer);
}

function namespaceOfficialPreview(preview: Awaited<ReturnType<typeof buildPaperWorkbookPreview>>, namespace: string) {
  if (!preview.paper) {
    throw new Error("Official workbook preview did not contain a paper");
  }

  const rubricCodeMap = new Map(
    preview.rubrics.map((rubric) => [rubric.rubricCode, `${rubric.rubricCode}-${namespace}`] as const)
  );

  return {
    ...preview,
    existingPaper: null,
    canPublish: true,
    paper: {
      ...preview.paper,
      paperCode: `${preview.paper.paperCode}-${namespace}`,
    },
    sections: preview.sections.map((section) => ({ ...section })),
    questions: preview.questions.map((question) => ({
      ...question,
      options: question.options.map((option) => ({ ...option })),
      rubricCode: question.rubricCode ? (rubricCodeMap.get(question.rubricCode) ?? question.rubricCode) : null,
      parts: question.parts.map((part) => ({
        ...part,
        options: part.options.map((option) => ({ ...option })),
        rubricCode: part.rubricCode ? (rubricCodeMap.get(part.rubricCode) ?? part.rubricCode) : null,
      })),
    })),
    rubrics: preview.rubrics.map((rubric) => ({
      ...rubric,
      rubricCode: rubricCodeMap.get(rubric.rubricCode) ?? rubric.rubricCode,
      criteria: rubric.criteria.map((criterion) => ({ ...criterion })),
    })),
    summary: { ...preview.summary },
    issues: [...preview.issues],
  };
}

async function publishOfficialWorkbook(preview: Awaited<ReturnType<typeof buildPaperWorkbookPreview>>, namespace: string) {
  const namespacedPreview = namespaceOfficialPreview(preview, namespace);

  try {
    const result = await publishPaperWorkbook(namespacedPreview);
    return {
      examPaperId: result.examPaperId,
      paperCode: namespacedPreview.paper!.paperCode,
      rubricCodes: namespacedPreview.rubrics.map((rubric) => rubric.rubricCode),
    };
  } catch (error) {
    remapPublishError(error);
  }
}

async function cleanupPublishedWorkbook(paperCode: string, rubricCodes: string[]) {
  const poolTag = `paper_import:${paperCode}`;
  await supabaseAdmin.from("exam_papers").delete().eq("paper_code", paperCode);
  await supabaseAdmin.from("questions").delete().eq("pool_tag", poolTag);
  if (rubricCodes.length > 0) {
    await supabaseAdmin.from("essay_rubrics").delete().in("rubric_code", rubricCodes);
  }
}

async function answerEveryQuestion(attempt: AttemptRecord, structure: PaperStructure) {
  for (const paperQuestion of structure.questions) {
    const parts = paperQuestion.questions.question_parts ?? [];
    const type = paperQuestion.questions.type;

    if ((type === "mcq" || type === "true_false") && paperQuestion.questions.correct_option) {
      await savePaperAnswer(attempt, paperQuestion, { selectedOption: paperQuestion.questions.correct_option });
      continue;
    }

    if (parts.length > 0) {
      await savePaperAnswer(attempt, paperQuestion, {
        partAnswers: parts.map((questionPart) => ({
          questionPartId: questionPart.id,
          textAnswer: `Response for Q${paperQuestion.question_number} ${questionPart.part_label}`,
        })),
      });
      continue;
    }

    await savePaperAnswer(attempt, paperQuestion, {
      textAnswer: `Response for question ${paperQuestion.question_number}`,
    });
  }
}

async function finalizeManualMarks(attemptId: string, structure: PaperStructure) {
  const { data: answerRows, error: answerError } = await supabaseAdmin
    .from("attempt_answers")
    .select("id, paper_question_id, question_part_id, is_selected_for_marking")
    .eq("paper_attempt_id", attemptId)
    .eq("is_selected_for_marking", true);

  if (answerError) throw new Error(answerError.message);

  const rubricIds = [
    ...new Set(
      structure.questions
        .map((paperQuestion) => paperQuestion.questions.rubric_id)
        .filter((rubricId): rubricId is string => Boolean(rubricId))
    ),
  ];

  const rubricCriteriaByRubricId = new Map<
    string,
    Array<{ id: string; max_marks: number }>
  >();

  if (rubricIds.length > 0) {
    const { data: rubrics, error: rubricError } = await supabaseAdmin
      .from("essay_rubrics")
      .select("id, essay_rubric_criteria(id, max_marks)")
      .in("id", rubricIds);

    if (rubricError) throw new Error(rubricError.message);

    for (const rubric of rubrics ?? []) {
      rubricCriteriaByRubricId.set(
        rubric.id,
        (rubric.essay_rubric_criteria ?? []).map((criterion: any) => ({
          id: criterion.id,
          max_marks: criterion.max_marks,
        }))
      );
    }
  }

  const questionByPaperQuestionId = new Map(
    structure.questions.map((paperQuestion) => [paperQuestion.id, paperQuestion] as const)
  );

  for (const answerRow of answerRows ?? []) {
    const paperQuestion = questionByPaperQuestionId.get(answerRow.paper_question_id);
    if (!paperQuestion) continue;

    if (answerRow.question_part_id) {
      const questionPart = paperQuestion.questions.question_parts?.find(
        (candidate) => candidate.id === answerRow.question_part_id
      );
      if (!questionPart) continue;

      await insertHumanMark(attemptId, answerRow.id, questionPart.marks);
      await upsertReview(attemptId, paperQuestion.id, answerRow.id, "finalized", questionPart.marks);
      continue;
    }

    const rubricId = paperQuestion.questions.rubric_id;
    if (rubricId) {
      const criteria = rubricCriteriaByRubricId.get(rubricId) ?? [];
      const total = criteria.reduce((sum, criterion) => sum + criterion.max_marks, 0);
      for (const criterion of criteria) {
        await insertHumanMark(attemptId, answerRow.id, criterion.max_marks, criterion.id);
      }
      await upsertReview(attemptId, paperQuestion.id, answerRow.id, "finalized", total);
      continue;
    }

    await insertHumanMark(attemptId, answerRow.id, paperQuestion.questions.marks);
    await upsertReview(attemptId, paperQuestion.id, answerRow.id, "finalized", paperQuestion.questions.marks);
  }
}

async function runPaperFlowIntegrationTests() {
  const namespace = randomUUID().slice(0, 8).toUpperCase();
  const seed = await loadSeedSubjectAndTopic();
  const { paperCode, rubricCode, examPaperId } = await publishFixturePaper(seed, namespace);

  try {
    const structure = await loadPaperStructure(examPaperId);
    const { sectionB, q1, q2, q3, q4, q5, q6 } = mapQuestions(structure);

    {
      const attempt = await createAttempt(
        examPaperId,
        new Date(Date.now() + 30 * 60 * 1000).toISOString()
      );
      await savePaperAnswer(attempt, q1, { selectedOption: "A" });
      await savePaperAnswer(attempt, q2, {
        partAnswers: [
          { questionPartId: q2.questions.question_parts?.[0]?.id, textAnswer: "alpha" },
        ],
      });
      await savePaperAnswer(attempt, q3, { textAnswer: "Essay answer" });
      await savePaperAnswer(attempt, q4, { selectedOption: "A" });

      const result = await submitPaperAttempt(attempt, structure, {});
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.ok(
          result.validationErrors.some((issue) =>
            issue.message.includes("requires 2 answered questions")
          )
        );
      }
    }

    {
      const attempt = await createAttempt(
        examPaperId,
        new Date(Date.now() + 30 * 60 * 1000).toISOString()
      );
      await savePaperAnswer(attempt, q1, { selectedOption: "A" });
      await savePaperAnswer(attempt, q2, {
        partAnswers: [
          { questionPartId: q2.questions.question_parts?.[0]?.id, textAnswer: "alpha" },
          { questionPartId: q2.questions.question_parts?.[1]?.id, textAnswer: "beta" },
        ],
      });
      await savePaperAnswer(attempt, q3, { textAnswer: "Essay answer" });
      await savePaperAnswer(attempt, q4, { selectedOption: "A" });
      await savePaperAnswer(attempt, q5, { selectedOption: "B" });
      await savePaperAnswer(attempt, q6, { selectedOption: "A" });

      const overAnswerResult = await submitPaperAttempt(attempt, structure, {});
      assert.equal(overAnswerResult.ok, false);
      if (!overAnswerResult.ok) {
        assert.ok(
          overAnswerResult.validationErrors.some((issue) =>
            issue.message.includes("choose which 2 questions to count")
          )
        );
      }

      const explicitSelectionResult = await submitPaperAttempt(attempt, structure, {
        [sectionB.id]: [q5.id, q6.id],
      });
      assert.equal(explicitSelectionResult.ok, true);
      if (!explicitSelectionResult.ok) return;

      const submittedAttempt = explicitSelectionResult.attempt;
      assert.equal(submittedAttempt.marking_status, "pending_manual");
      assert.equal(submittedAttempt.status, "submitted");
      assert.equal(submittedAttempt.objective_score, 7);
      assert.equal(submittedAttempt.manual_score, 0);
      assert.equal(submittedAttempt.final_score, null);

      const summary = await buildAttemptSummary(submittedAttempt, structure);
      const sectionBSummary = summary.sections.find((section) => section.sectionCode === "B");
      assert.ok(sectionBSummary);
      const deselectedQuestion = (sectionBSummary?.questions as Array<any>).find(
        (question) => question.id === q4.id
      );
      assert.equal(deselectedQuestion?.countsTowardScore, false);

      const learnerQuestion = sanitizeQuestionForDelivery(
        q4,
        submittedAttempt,
        await getAttemptQuestionSavedAnswers(submittedAttempt.id, q4.id)
      );
      const learnerQuestionJson = JSON.stringify(learnerQuestion);
      assert.equal(learnerQuestionJson.includes("correct_option"), false);
      assert.equal(learnerQuestionJson.includes("expected_answer"), false);
      assert.equal(learnerQuestionJson.includes("distractorExplanation"), false);

      const reviewJson = JSON.stringify(summary);
      assert.equal(reviewJson.includes("The nucleus contains the genetic material."), false);

      const essayAnswers = await getAttemptQuestionSavedAnswers(submittedAttempt.id, q3.id);
      assert.equal(essayAnswers.length, 1);
      assert.equal(essayAnswers[0]?.is_selected_for_marking, true);

      const structuredPartAnswers = await getAttemptQuestionSavedAnswers(submittedAttempt.id, q2.id);
      assert.equal(structuredPartAnswers.length, 2);
      assert.ok(structuredPartAnswers.every((answer) => answer.is_selected_for_marking));

      const pendingQueue = await supabaseAdmin
        .from("paper_attempts")
        .select("id, marking_status")
        .eq("id", submittedAttempt.id)
        .in("marking_status", ["pending_manual", "under_review"]);
      assert.equal(pendingQueue.error, null);
      assert.equal((pendingQueue.data ?? []).length, 1);

      const rubricResult = await supabaseAdmin
        .from("essay_rubrics")
        .select("id, essay_rubric_criteria(id, max_marks)")
        .eq("rubric_code", rubricCode)
        .single();
      if (rubricResult.error || !rubricResult.data) throw new Error(rubricResult.error?.message ?? "Rubric missing");
      const rubricCriteria = rubricResult.data.essay_rubric_criteria;
      const essayAnswerId = essayAnswers[0]!.id;
      const partAnswerA = structuredPartAnswers.find(
        (answer) => answer.question_part_id === q2.questions.question_parts?.[0]?.id
      )!;
      const partAnswerB = structuredPartAnswers.find(
        (answer) => answer.question_part_id === q2.questions.question_parts?.[1]?.id
      )!;

      await insertHumanMark(submittedAttempt.id, partAnswerA.id, 3);
      await insertHumanMark(submittedAttempt.id, partAnswerB.id, 4);
      await insertHumanMark(submittedAttempt.id, essayAnswerId, 6, rubricCriteria[0]!.id);
      await insertHumanMark(submittedAttempt.id, essayAnswerId, 7, rubricCriteria[1]!.id);
      await upsertReview(submittedAttempt.id, q2.id, partAnswerA.id, "draft", 3);
      await upsertReview(submittedAttempt.id, q2.id, partAnswerB.id, "draft", 4);
      await upsertReview(submittedAttempt.id, q3.id, essayAnswerId, "draft", 13);

      const underReviewAttempt = await refreshAttemptScores(submittedAttempt.id);
      assert.equal(underReviewAttempt.marking_status, "under_review");
      assert.equal(underReviewAttempt.final_score, null);

      await upsertReview(submittedAttempt.id, q2.id, partAnswerA.id, "finalized", 3);
      await upsertReview(submittedAttempt.id, q2.id, partAnswerB.id, "finalized", 4);
      await upsertReview(submittedAttempt.id, q3.id, essayAnswerId, "finalized", 13);

      const completedAttempt = await refreshAttemptScores(submittedAttempt.id);
      assert.equal(completedAttempt.marking_status, "completed");
      assert.equal(completedAttempt.objective_score, 7);
      assert.equal(completedAttempt.manual_score, 20);
      assert.equal(completedAttempt.final_score, 27);
      assert.equal(completedAttempt.max_score, 35);

      const completedQueue = await supabaseAdmin
        .from("paper_attempts")
        .select("id")
        .eq("id", submittedAttempt.id)
        .in("marking_status", ["pending_manual", "under_review"]);
      assert.equal(completedQueue.error, null);
      assert.equal((completedQueue.data ?? []).length, 0);
    }

    {
      const attempt = await createAttempt(
        examPaperId,
        new Date(Date.now() - 5 * 60 * 1000).toISOString()
      );
      await savePaperAnswer(attempt, q1, { selectedOption: "A" });
      await savePaperAnswer(attempt, q4, { selectedOption: "A" });
      await savePaperAnswer(attempt, q5, { selectedOption: "A" });
      await savePaperAnswer(attempt, q6, { selectedOption: "B" });

      const autoSubmittedAttempt = await maybeAutoSubmitAttempt(attempt, structure);
      assert.equal(autoSubmittedAttempt.status, "auto_submitted");
      assert.equal(autoSubmittedAttempt.marking_status, "completed");

      const reloadedAttempt = await getAttemptRecord(autoSubmittedAttempt.id);
      assert.deepEqual(reloadedAttempt.selected_question_ids_by_section?.[sectionB.id], [q4.id, q5.id]);
      assert.equal(reloadedAttempt.objective_score, 12);
      assert.equal(reloadedAttempt.final_score, 12);
    }
  } finally {
    await cleanupFixture(paperCode, rubricCode);
  }

  {
    const officialNamespace = `OFFICIAL-${randomUUID().slice(0, 8).toUpperCase()}`;
    const preview = await loadOfficialWorkbookPreview();
    assert.equal(preview.paper?.paperCode, "MANEB-JCE-BIOL-J022-2021-SAMPLE");
    assert.equal(preview.issues.some((issue) => issue.level === "error"), false);
    assert.equal(preview.summary.questionCount, 33);
    assert.equal(preview.summary.sectionCount, 3);
    assert.equal(preview.summary.partCount, 28);
    assert.equal(preview.summary.essayCount, 3);
    assert.equal(preview.summary.structuredCount, 10);

    const { examPaperId, paperCode: officialPaperCode, rubricCodes } = await publishOfficialWorkbook(
      preview,
      officialNamespace
    );

    try {
      const structure = await loadPaperStructure(examPaperId);
      const maxScore = structure.paper.total_marks ?? 100;
      const attempt = await createAttempt(
        examPaperId,
        new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        maxScore
      );

      await answerEveryQuestion(attempt, structure);

      const submittedResult = await submitPaperAttempt(attempt, structure, {});
      assert.equal(submittedResult.ok, true);
      if (!submittedResult.ok) return;

      const submittedAttempt = submittedResult.attempt;
      assert.equal(submittedAttempt.status, "submitted");
      assert.equal(submittedAttempt.marking_status, "pending_manual");
      assert.equal(submittedAttempt.objective_score, 20);
      assert.equal(submittedAttempt.manual_score, 0);

      const questionByNumber = new Map(
        structure.questions.map((paperQuestion) => [paperQuestion.question_number, paperQuestion] as const)
      );
      const q1 = questionByNumber.get(1)!;
      const q21 = questionByNumber.get(21)!;
      const q31 = questionByNumber.get(31)!;

      const learnerQuestion = sanitizeQuestionForDelivery(
        q1,
        submittedAttempt,
        await getAttemptQuestionSavedAnswers(submittedAttempt.id, q1.id)
      );
      const learnerQuestionJson = JSON.stringify(learnerQuestion);
      assert.equal(learnerQuestionJson.includes("correct_option"), false);
      assert.equal(learnerQuestionJson.includes("expected_answer"), false);

      const structuredAnswers = await getAttemptQuestionSavedAnswers(submittedAttempt.id, q21.id);
      const essayAnswers = await getAttemptQuestionSavedAnswers(submittedAttempt.id, q31.id);
      assert.ok(structuredAnswers.length > 0);
      assert.equal(essayAnswers.length, 1);

      await finalizeManualMarks(submittedAttempt.id, structure);

      const completedAttempt = await refreshAttemptScores(submittedAttempt.id);
      assert.equal(completedAttempt.marking_status, "completed");
      assert.equal(completedAttempt.objective_score, 20);
      assert.equal(completedAttempt.manual_score, 80);
      assert.equal(completedAttempt.final_score, 100);
      assert.equal(completedAttempt.max_score, 100);

      const summary = await buildAttemptSummary(completedAttempt, structure);
      const summaryJson = JSON.stringify(summary);
      assert.equal(summaryJson.includes("presence of cones"), false);
      assert.equal(summaryJson.includes("Response for question 31"), true);
    } finally {
      await cleanupPublishedWorkbook(officialPaperCode, rubricCodes);
    }
  }
}

runPaperFlowIntegrationTests()
  .then(() => {
    console.log("paperFlow integration tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
