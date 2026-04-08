import { supabaseAdmin } from "./supabaseAdmin.js";

type OptionRecord = {
  key: string;
  text: string;
  distractorExplanation?: string | null;
};

type QuestionPartRecord = {
  id: string;
  part_label: string;
  body: string;
  marks: number;
  expected_answer: string | null;
  order_index: number;
  rubric_id: string | null;
  auto_marking_mode: string;
  options: OptionRecord[] | null;
  correct_option: string | null;
};

type QuestionRecord = {
  id: string;
  topic_id: string | null;
  subtopic_id: string | null;
  stem: string;
  options: OptionRecord[] | null;
  correct_option: string | null;
  explanation: string | null;
  expected_answer: string | null;
  type: string;
  difficulty: string;
  marks: number;
  allow_shuffle: boolean;
  rubric_id: string | null;
  auto_marking_mode: string;
  question_parts: QuestionPartRecord[] | null;
};

type PaperQuestionRecord = {
  id: string;
  question_id: string;
  order_index: number;
  section: string | null;
  section_id: string | null;
  question_number: number | null;
  questions: QuestionRecord | null;
};

type PaperSectionRecord = {
  id: string;
  section_code: string;
  title: string | null;
  instructions: string | null;
  order_index: number;
  question_selection_mode: string;
  required_count: number | null;
  max_marks: number | null;
  starts_at_question_number: number | null;
  ends_at_question_number: number | null;
};

type ExamPaperRecord = {
  id: string;
  title: string | null;
  year: number | null;
  session: string | null;
  paper_number: number | null;
  paper_code: string | null;
  source_type: string;
  paper_type: string;
  exam_mode: string;
  exam_path: string | null;
  duration_min: number | null;
  total_marks: number | null;
  instructions: string | null;
  has_sections: boolean;
  marking_mode: string;
  solution_unlock_mode: string;
  question_mode: string;
  status: string;
  is_sample: boolean;
  subjects: { id?: string | null; name: string | null; code: string | null } | null;
  paper_sections: PaperSectionRecord[] | null;
  paper_questions: PaperQuestionRecord[] | null;
};

export type AttemptRecord = {
  id: string;
  exam_paper_id: string;
  user_id: string | null;
  status: string;
  marking_status: string;
  time_limit_seconds: number | null;
  started_at: string;
  expires_at: string;
  submitted_at: string | null;
  finalized_at: string | null;
  selected_question_ids_by_section: Record<string, string[]> | null;
  objective_score: number | null;
  manual_score: number | null;
  final_score: number | null;
  max_score: number | null;
  created_at: string;
  updated_at: string;
};

export type AttemptAnswerRecord = {
  id: string;
  paper_attempt_id: string;
  paper_question_id: string;
  question_id: string | null;
  question_part_id: string | null;
  selected_option: string | null;
  text_answer: string | null;
  numeric_answer: number | null;
  answer_payload: Record<string, unknown> | null;
  answer_status: string;
  is_selected_for_marking: boolean;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

type AnswerMarkRecord = {
  id: string;
  paper_attempt_id: string;
  attempt_answer_id: string;
  criterion_id: string | null;
  marker_type: string;
  score: number | null;
  suggested_score: number | null;
  final_score: number | null;
  comment: string | null;
  moderation_status: string;
  created_at: string;
  updated_at: string;
};

type EssayMarkingReviewRecord = {
  id: string;
  paper_attempt_id: string;
  paper_question_id: string | null;
  attempt_answer_id: string | null;
  reviewer_user_id: string | null;
  marker_mode: string;
  status: string;
  overall_comment: string | null;
  suggested_total: number | null;
  final_total: number | null;
  created_at: string;
  updated_at: string;
  finalized_at: string | null;
};

export type AnswerInput = {
  selectedOption?: string | null;
  textAnswer?: string | null;
  numericAnswer?: number | null;
  answerPayload?: Record<string, unknown> | null;
};

export type PartAnswerInput = AnswerInput & {
  questionPartId?: string;
  partLabel?: string;
};

export type SaveAnswerInput = AnswerInput & {
  partAnswers?: PartAnswerInput[];
};

type PaperQuestionNode = PaperQuestionRecord & {
  questions: QuestionRecord;
};

export type PaperStructure = {
  paper: Omit<ExamPaperRecord, "paper_sections" | "paper_questions">;
  sections: PaperSectionRecord[];
  questions: PaperQuestionNode[];
};

const PAPER_SELECT = `
  id, title, year, session, paper_number, paper_code, source_type, paper_type,
  exam_mode, exam_path, duration_min, total_marks, instructions, has_sections,
  marking_mode, solution_unlock_mode, question_mode, status, is_sample,
  subjects(id, name, code),
  paper_sections(
    id, section_code, title, instructions, order_index, question_selection_mode,
    required_count, max_marks, starts_at_question_number, ends_at_question_number
  ),
  paper_questions(
    id, question_id, order_index, section, section_id, question_number,
    questions(
      id, topic_id, subtopic_id, stem, options, correct_option, explanation,
      expected_answer, type, difficulty, marks, allow_shuffle, rubric_id, auto_marking_mode,
      question_parts(
        id, part_label, body, marks, expected_answer, order_index,
        rubric_id, auto_marking_mode, options, correct_option
      )
    )
  )
`;

function normalizeValue(value: string | number | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

function sortStructure(structure: PaperStructure): PaperStructure {
  return {
    paper: structure.paper,
    sections: [...structure.sections].sort((left, right) => left.order_index - right.order_index),
    questions: [...structure.questions]
      .filter((paperQuestion) => Boolean(paperQuestion.questions))
      .map((paperQuestion) => ({
        ...paperQuestion,
        questions: {
          ...paperQuestion.questions,
          question_parts: [...(paperQuestion.questions.question_parts ?? [])].sort(
            (left, right) => left.order_index - right.order_index
          ),
        },
      }))
      .sort((left, right) => {
        const leftOrder = left.question_number ?? left.order_index;
        const rightOrder = right.question_number ?? right.order_index;
        return leftOrder - rightOrder;
      }),
  };
}

function isAnswerValuePresent(answer: {
  selected_option?: string | null;
  text_answer?: string | null;
  numeric_answer?: number | null;
  answer_payload?: Record<string, unknown> | null;
}): boolean {
  if (answer.selected_option) return true;
  if (answer.text_answer && answer.text_answer.trim().length > 0) return true;
  if (typeof answer.numeric_answer === "number" && Number.isFinite(answer.numeric_answer)) return true;
  return Boolean(answer.answer_payload && Object.keys(answer.answer_payload).length > 0);
}

function matchExactAnswer(input: string | number | null | undefined, expected: string | null): boolean {
  if (!expected) return false;
  return normalizeValue(input) === normalizeValue(expected);
}

function matchKeywordAnswer(input: string | number | null | undefined, expected: string | null): boolean {
  if (!expected) return false;
  const value = normalizeValue(input);
  if (!value) return false;

  const exactAlternatives = expected
    .split("|")
    .map((candidate) => candidate.trim())
    .filter(Boolean);

  if (exactAlternatives.some((candidate) => normalizeValue(candidate) === value)) {
    return true;
  }

  const keywords = expected
    .split(",")
    .map((keyword) => normalizeValue(keyword))
    .filter(Boolean);

  return keywords.length > 0 && keywords.every((keyword) => value.includes(keyword));
}

function isManualMode(mode: string): boolean {
  return mode === "manual" || mode === "hybrid";
}

function deriveAutoMarkingMode(questionType: string, configuredMode: string): string {
  if (configuredMode) return configuredMode;
  if (questionType === "essay" || questionType === "structured") return "manual";
  if (questionType === "short_answer" || questionType === "numeric" || questionType === "fill_blank") return "keyword";
  return "exact";
}

async function loadAnswerRows(attemptId: string): Promise<AttemptAnswerRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("attempt_answers")
    .select("*")
    .eq("paper_attempt_id", attemptId);

  if (error) throw new Error(error.message);
  return (data ?? []) as AttemptAnswerRecord[];
}

async function loadAnswerMarks(attemptId: string): Promise<AnswerMarkRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("answer_marks")
    .select("*")
    .eq("paper_attempt_id", attemptId);

  if (error) throw new Error(error.message);
  return (data ?? []) as AnswerMarkRecord[];
}

async function loadMarkingReviews(attemptId: string): Promise<EssayMarkingReviewRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("essay_marking_reviews")
    .select("*")
    .eq("paper_attempt_id", attemptId);

  if (error) throw new Error(error.message);
  return (data ?? []) as EssayMarkingReviewRecord[];
}

function sanitizeOptionList(options: OptionRecord[] | null | undefined) {
  return (options ?? []).map((option) => ({
    key: option.key,
    text: option.text,
  }));
}

function getAttemptSections(structure: PaperStructure): PaperSectionRecord[] {
  if (structure.sections.length > 0) {
    return structure.sections;
  }

  return [
    {
      id: "general",
      section_code: "GENERAL",
      title: "General",
      instructions: null,
      order_index: 0,
      question_selection_mode: "answer_all",
      required_count: null,
      max_marks: null,
      starts_at_question_number: null,
      ends_at_question_number: null,
    },
  ];
}

function getSectionQuestions(structure: PaperStructure, section: PaperSectionRecord): PaperQuestionNode[] {
  return structure.questions.filter((paperQuestion) => {
    if (structure.sections.length === 0) return true;
    return (
      paperQuestion.section_id === section.id ||
      normalizeValue(paperQuestion.section) === normalizeValue(section.section_code)
    );
  });
}

function calculateSectionMaxScore(section: PaperSectionRecord, sectionQuestions: PaperQuestionNode[]): number {
  if (section.max_marks !== null && section.max_marks !== undefined) {
    return section.max_marks;
  }

  if (section.question_selection_mode !== "answer_any_n") {
    return sectionQuestions.reduce((sum, question) => sum + question.questions.marks, 0);
  }

  const requiredCount = section.required_count ?? 0;
  return [...sectionQuestions]
    .sort((left, right) => right.questions.marks - left.questions.marks)
    .slice(0, requiredCount)
    .reduce((sum, question) => sum + question.questions.marks, 0);
}

function getRequestedSelection(
  section: Pick<PaperSectionRecord, "id" | "section_code">,
  selectionBySection: Record<string, string[]>
): string[] {
  return selectionBySection[section.id] ?? selectionBySection[section.section_code] ?? [];
}

function resolveReviewState(reviews: EssayMarkingReviewRecord[]): "finalized" | "draft" | "none" {
  if (reviews.some((review) => review.status === "finalized")) {
    return "finalized";
  }

  if (reviews.some((review) => review.status === "draft")) {
    return "draft";
  }

  return "none";
}

function sumMarkScores(marks: AnswerMarkRecord[]): number | null {
  const scoredMarks = marks
    .map((mark) => mark.final_score)
    .filter((score): score is number => score !== null && score !== undefined);

  if (scoredMarks.length === 0) {
    return null;
  }

  return scoredMarks.reduce((sum, score) => sum + score, 0);
}

function resolveHumanScore(answerMarks: AnswerMarkRecord[]): number | null {
  const moderatorScore = sumMarkScores(answerMarks.filter((mark) => mark.marker_type === "moderator"));
  if (moderatorScore !== null) {
    return moderatorScore;
  }

  return sumMarkScores(answerMarks.filter((mark) => mark.marker_type === "human"));
}

function resolveFinalizedManualScore(
  answerMarks: AnswerMarkRecord[],
  reviews: EssayMarkingReviewRecord[]
): number | null {
  const humanScore = resolveHumanScore(answerMarks);
  if (humanScore !== null) {
    return humanScore;
  }

  const finalizedTotals = reviews
    .filter((review) => review.status === "finalized")
    .map((review) => review.final_total)
    .filter((score): score is number => score !== null && score !== undefined);

  return finalizedTotals.at(-1) ?? null;
}

async function upsertSystemMark(attemptId: string, attemptAnswerId: string, score: number) {
  const { error: deleteError } = await supabaseAdmin
    .from("answer_marks")
    .delete()
    .eq("paper_attempt_id", attemptId)
    .eq("attempt_answer_id", attemptAnswerId)
    .eq("marker_type", "system")
    .is("criterion_id", null);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  const { error: insertError } = await supabaseAdmin.from("answer_marks").insert({
    paper_attempt_id: attemptId,
    attempt_answer_id: attemptAnswerId,
    criterion_id: null,
    marker_type: "system",
    score,
    suggested_score: score,
    final_score: score,
    moderation_status: "reviewed",
  });

  if (insertError) {
    throw new Error(insertError.message);
  }
}

function resolveQuestionScore(
  paperQuestion: PaperQuestionNode,
  answers: AttemptAnswerRecord[],
  marks: AnswerMarkRecord[],
  reviews: EssayMarkingReviewRecord[]
): {
  objectiveScore: number;
  manualScore: number;
  finalScore: number;
  maxScore: number;
  pendingManual: boolean;
  underReview: boolean;
  answered: boolean;
} {
  const questionRows = answers.filter(
    (answer) => answer.paper_question_id === paperQuestion.id && answer.is_selected_for_marking
  );

  if (paperQuestion.questions.question_parts && paperQuestion.questions.question_parts.length > 0) {
    let objectiveScore = 0;
    let manualScore = 0;
    let finalScore = 0;
    let pendingManual = false;
    let underReview = false;
    let answeredParts = 0;

    for (const part of paperQuestion.questions.question_parts) {
      const answerRow = questionRows.find((answer) => answer.question_part_id === part.id);
      const answerPresent = Boolean(answerRow && isAnswerValuePresent(answerRow));
      if (answerPresent) {
        answeredParts += 1;
      }

      const partMarks = marks.filter((mark) => mark.attempt_answer_id === answerRow?.id);
      const partReviews = reviews.filter((review) => review.attempt_answer_id === answerRow?.id);
      const reviewState = resolveReviewState(partReviews);
      const humanScore = resolveHumanScore(partMarks);
      const finalizedManualScore = resolveFinalizedManualScore(partMarks, partReviews);
      const systemMark = partMarks.find(
        (mark) => mark.marker_type === "system" && mark.final_score !== null && mark.final_score !== undefined
      );
      const resolvedMode = deriveAutoMarkingMode(paperQuestion.questions.type, part.auto_marking_mode);

      if (finalizedManualScore !== null && reviewState === "finalized") {
        manualScore += finalizedManualScore;
        finalScore += finalizedManualScore;
      } else if (
        systemMark?.final_score !== null &&
        systemMark?.final_score !== undefined &&
        !isManualMode(resolvedMode)
      ) {
        objectiveScore += systemMark.final_score;
        finalScore += systemMark.final_score;
      } else if (isManualMode(resolvedMode) && answerPresent) {
        if (reviewState === "draft" || humanScore !== null) {
          underReview = true;
        } else {
          pendingManual = true;
        }
      }
    }

    return {
      objectiveScore,
      manualScore,
      finalScore,
      maxScore: paperQuestion.questions.marks,
      pendingManual,
      underReview,
      answered: answeredParts > 0,
    };
  }

  const answerRow = questionRows.find((answer) => answer.question_part_id === null);
  const answerMarks = marks.filter((mark) => mark.attempt_answer_id === answerRow?.id);
  const answerReviews = reviews.filter((review) => review.attempt_answer_id === answerRow?.id);
  const reviewState = resolveReviewState(answerReviews);
  const humanScore = resolveHumanScore(answerMarks);
  const finalizedManualScore = resolveFinalizedManualScore(answerMarks, answerReviews);
  const systemMark = answerMarks.find(
    (mark) => mark.marker_type === "system" && mark.final_score !== null && mark.final_score !== undefined
  );
  const resolvedMode = deriveAutoMarkingMode(
    paperQuestion.questions.type,
    paperQuestion.questions.auto_marking_mode
  );
  const answerPresent = Boolean(answerRow && isAnswerValuePresent(answerRow));

  if (finalizedManualScore !== null && reviewState === "finalized") {
    return {
      objectiveScore: 0,
      manualScore: finalizedManualScore,
      finalScore: finalizedManualScore,
      maxScore: paperQuestion.questions.marks,
      pendingManual: false,
      underReview: false,
      answered: answerPresent,
    };
  }

  if (systemMark?.final_score !== null && systemMark?.final_score !== undefined && !isManualMode(resolvedMode)) {
    return {
      objectiveScore: systemMark.final_score,
      manualScore: 0,
      finalScore: systemMark.final_score,
      maxScore: paperQuestion.questions.marks,
      pendingManual: false,
      underReview: false,
      answered: answerPresent,
    };
  }

  return {
    objectiveScore: 0,
    manualScore: 0,
    finalScore: 0,
    maxScore: paperQuestion.questions.marks,
    pendingManual: isManualMode(resolvedMode) && answerPresent && reviewState === "none" && humanScore === null,
    underReview: isManualMode(resolvedMode) && answerPresent && (reviewState === "draft" || humanScore !== null),
    answered: answerPresent,
  };
}

function questionIsAnswered(paperQuestion: PaperQuestionNode, answers: AttemptAnswerRecord[]): boolean {
  const questionRows = answers.filter((answer) => answer.paper_question_id === paperQuestion.id);
  if (paperQuestion.questions.question_parts && paperQuestion.questions.question_parts.length > 0) {
    return questionRows.some(
      (answer) => answer.question_part_id !== null && isAnswerValuePresent(answer)
    );
  }

  return questionRows.some(
    (answer) => answer.question_part_id === null && isAnswerValuePresent(answer)
  );
}

function calculateAttemptMaxScore(structure: PaperStructure): number {
  if (structure.paper.total_marks !== null && structure.paper.total_marks !== undefined) {
    return structure.paper.total_marks;
  }

  return getAttemptSections(structure).reduce((sum, section) => {
    return sum + calculateSectionMaxScore(section, getSectionQuestions(structure, section));
  }, 0);
}

function resolveSectionSelection(
  section: PaperSectionRecord,
  sectionQuestions: PaperQuestionNode[],
  answeredQuestions: PaperQuestionNode[],
  selectionBySection: Record<string, string[]>,
  autoSubmitted: boolean
):
  | { selectedQuestionIds: string[]; validationError?: undefined }
  | {
      selectedQuestionIds?: undefined;
      validationError: {
        sectionId: string;
        sectionCode: string;
        message: string;
        answeredQuestionIds?: string[];
      };
    } {
  if (section.question_selection_mode !== "answer_any_n") {
    if (!autoSubmitted && answeredQuestions.length !== sectionQuestions.length) {
      return {
        validationError: {
          sectionId: section.id,
          sectionCode: section.section_code,
          message: `Section ${section.section_code} requires all questions to be answered`,
        },
      };
    }

    return {
      selectedQuestionIds: sectionQuestions.map((paperQuestion) => paperQuestion.id),
    };
  }

  const requiredCount = section.required_count ?? 0;
  const answeredQuestionIds = answeredQuestions.map((paperQuestion) => paperQuestion.id);

  if (!autoSubmitted && answeredQuestions.length < requiredCount) {
    return {
      validationError: {
        sectionId: section.id,
        sectionCode: section.section_code,
        message: `Section ${section.section_code} requires ${section.required_count} answered questions`,
      },
    };
  }

  if (answeredQuestions.length <= requiredCount) {
    return {
      selectedQuestionIds: answeredQuestionIds,
    };
  }

  const requestedSelection = getRequestedSelection(section, selectionBySection);
  const requestedSet = new Set(requestedSelection);
  const hasValidRequestedSelection =
    requestedSelection.length === requiredCount &&
    requestedSet.size === requestedSelection.length &&
    requestedSelection.every((questionId) => answeredQuestionIds.includes(questionId));

  if (hasValidRequestedSelection) {
    return {
      selectedQuestionIds: answeredQuestions
        .filter((paperQuestion) => requestedSet.has(paperQuestion.id))
        .map((paperQuestion) => paperQuestion.id),
    };
  }

  if (autoSubmitted) {
    return {
      selectedQuestionIds: answeredQuestions
        .slice(0, requiredCount)
        .map((paperQuestion) => paperQuestion.id),
    };
  }

  return {
    validationError: {
      sectionId: section.id,
      sectionCode: section.section_code,
      message: `Section ${section.section_code} requires you to choose which ${section.required_count} questions to count`,
      answeredQuestionIds,
    },
  };
}

type AttemptScoreSnapshot = {
  objectiveScore: number;
  manualScore: number;
  finalScore: number | null;
  maxScore: number;
  markingStatus: "completed" | "pending_manual" | "under_review";
  finalizedAt: string | null;
};

function resolveAttemptScores(
  structure: PaperStructure,
  answers: AttemptAnswerRecord[],
  marks: AnswerMarkRecord[],
  reviews: EssayMarkingReviewRecord[]
): AttemptScoreSnapshot {
  let objectiveScore = 0;
  let manualScore = 0;
  let finalScore = 0;
  let pendingManual = false;
  let underReview = false;

  for (const paperQuestion of structure.questions) {
    const resolved = resolveQuestionScore(paperQuestion, answers, marks, reviews);
    objectiveScore += resolved.objectiveScore;
    manualScore += resolved.manualScore;
    finalScore += resolved.finalScore;
    pendingManual = pendingManual || resolved.pendingManual;
    underReview = underReview || resolved.underReview;
  }

  const markingStatus = pendingManual
    ? "pending_manual"
    : underReview
      ? "under_review"
      : "completed";

  return {
    objectiveScore,
    manualScore,
    finalScore: markingStatus === "completed" ? finalScore : null,
    maxScore: calculateAttemptMaxScore(structure),
    markingStatus,
    finalizedAt: markingStatus === "completed" ? new Date().toISOString() : null,
  };
}

function resolveAttemptStatus(
  attempt: AttemptRecord,
  markingStatus: AttemptScoreSnapshot["markingStatus"],
  autoSubmitted: boolean
): AttemptRecord["status"] {
  if (attempt.status === "in_progress") {
    if (autoSubmitted) {
      return "auto_submitted";
    }

    return markingStatus === "completed" ? "marked" : "submitted";
  }

  if (attempt.status === "auto_submitted") {
    return "auto_submitted";
  }

  return markingStatus === "completed" ? "marked" : "submitted";
}

function canRevealSolutions(solutionUnlockMode: string, attempt: AttemptRecord): boolean {
  if (solutionUnlockMode === "always") return true;
  if (solutionUnlockMode === "never") return false;
  if (solutionUnlockMode === "after_submit") {
    return attempt.status !== "in_progress";
  }

  return attempt.marking_status === "completed" || attempt.status === "marked";
}

export async function loadPaperStructure(paperId: string): Promise<PaperStructure> {
  const { data, error } = await supabaseAdmin
    .from("exam_papers")
    .select(PAPER_SELECT)
    .eq("id", paperId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Exam paper not found");
  }

  const record = data as unknown as ExamPaperRecord;
  return sortStructure({
    paper: {
      id: record.id,
      title: record.title,
      year: record.year,
      session: record.session,
      paper_number: record.paper_number,
      paper_code: record.paper_code,
      source_type: record.source_type,
      paper_type: record.paper_type,
      exam_mode: record.exam_mode,
      exam_path: record.exam_path,
      duration_min: record.duration_min,
      total_marks: record.total_marks,
      instructions: record.instructions,
      has_sections: record.has_sections,
      marking_mode: record.marking_mode,
      solution_unlock_mode: record.solution_unlock_mode,
      question_mode: record.question_mode,
      status: record.status,
      is_sample: record.is_sample,
      subjects: record.subjects,
    },
    sections: record.paper_sections ?? [],
    questions: (record.paper_questions ?? []).filter(
      (paperQuestion): paperQuestion is PaperQuestionNode => Boolean(paperQuestion.questions)
    ),
  });
}

export async function getAttemptRecord(attemptId: string): Promise<AttemptRecord> {
  const { data, error } = await supabaseAdmin
    .from("paper_attempts")
    .select("*")
    .eq("id", attemptId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Paper attempt not found");
  return data as AttemptRecord;
}

export async function startPaperAttempt(paperId: string, userId: string) {
  const structure = await loadPaperStructure(paperId);
  if (structure.paper.status !== "published" && !structure.paper.is_sample) {
    throw new Error("Paper is not available for students");
  }

  const { data: existingData, error: existingError } = await supabaseAdmin
    .from("paper_attempts")
    .select("*")
    .eq("exam_paper_id", paperId)
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (existingData) {
    const existing = existingData as AttemptRecord;
    if (new Date(existing.expires_at).getTime() > Date.now()) {
      return existing;
    }
  }

  const durationSeconds = (structure.paper.duration_min ?? 150) * 60;
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + durationSeconds * 1000);
  const maxScore = calculateAttemptMaxScore(structure);

  const { data, error } = await supabaseAdmin
    .from("paper_attempts")
    .insert({
      exam_paper_id: paperId,
      user_id: userId,
      status: "in_progress",
      marking_status: "pending",
      time_limit_seconds: durationSeconds,
      started_at: startedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      max_score: maxScore,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not start paper attempt");
  }

  return data as AttemptRecord;
}

export async function savePaperAnswer(
  attempt: AttemptRecord,
  paperQuestion: PaperQuestionNode,
  input: SaveAnswerInput
) {
  const { error: deleteError } = await supabaseAdmin
    .from("attempt_answers")
    .delete()
    .eq("paper_attempt_id", attempt.id)
    .eq("paper_question_id", paperQuestion.id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  const rowsToInsert: Array<Record<string, unknown>> = [];
  const nowIso = new Date().toISOString();

  if (paperQuestion.questions.question_parts && paperQuestion.questions.question_parts.length > 0) {
    const partAnswers = input.partAnswers ?? [];
    for (const part of paperQuestion.questions.question_parts) {
      const answerInput =
        partAnswers.find(
          (candidate) =>
            candidate.questionPartId === part.id ||
            normalizeValue(candidate.partLabel) === normalizeValue(part.part_label)
        ) ?? {};

      if (
        !answerInput.selectedOption &&
        !answerInput.textAnswer &&
        answerInput.numericAnswer === undefined &&
        !answerInput.answerPayload
      ) {
        continue;
      }

      rowsToInsert.push({
        paper_attempt_id: attempt.id,
        paper_question_id: paperQuestion.id,
        question_id: paperQuestion.question_id,
        question_part_id: part.id,
        selected_option: answerInput.selectedOption ?? null,
        text_answer: answerInput.textAnswer ?? null,
        numeric_answer: answerInput.numericAnswer ?? null,
        answer_payload: answerInput.answerPayload ?? {},
        answer_status: "draft",
        submitted_at: null,
        updated_at: nowIso,
      });
    }
  } else if (
    input.selectedOption ||
    input.textAnswer ||
    input.numericAnswer !== undefined ||
    input.answerPayload
  ) {
    rowsToInsert.push({
      paper_attempt_id: attempt.id,
      paper_question_id: paperQuestion.id,
      question_id: paperQuestion.question_id,
      question_part_id: null,
      selected_option: input.selectedOption ?? null,
      text_answer: input.textAnswer ?? null,
      numeric_answer: input.numericAnswer ?? null,
      answer_payload: input.answerPayload ?? {},
      answer_status: "draft",
      submitted_at: null,
      updated_at: nowIso,
    });
  }

  if (rowsToInsert.length === 0) {
    await supabaseAdmin
      .from("paper_attempts")
      .update({ updated_at: nowIso })
      .eq("id", attempt.id);
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("attempt_answers")
    .insert(rowsToInsert)
    .select("*");

  if (error) {
    throw new Error(error.message);
  }

  const insertedRows = (data ?? []) as AttemptAnswerRecord[];
  for (const answerRow of insertedRows) {
    const part = paperQuestion.questions.question_parts?.find(
      (questionPart) => questionPart.id === answerRow.question_part_id
    );
    const autoMode = deriveAutoMarkingMode(
      paperQuestion.questions.type,
      part?.auto_marking_mode ?? paperQuestion.questions.auto_marking_mode
    );

    if (isManualMode(autoMode)) {
      continue;
    }

    let score = 0;
    if (answerRow.selected_option) {
      const correctOption = part?.correct_option ?? paperQuestion.questions.correct_option;
      score =
        correctOption && normalizeValue(answerRow.selected_option) === normalizeValue(correctOption)
          ? part?.marks ?? paperQuestion.questions.marks
          : 0;
    } else if (answerRow.text_answer) {
      const expected = part?.expected_answer ?? paperQuestion.questions.expected_answer;
      const matched =
        autoMode === "exact"
          ? matchExactAnswer(answerRow.text_answer, expected)
          : matchKeywordAnswer(answerRow.text_answer, expected);
      score = matched ? part?.marks ?? paperQuestion.questions.marks : 0;
    } else if (typeof answerRow.numeric_answer === "number") {
      const expected = part?.expected_answer ?? paperQuestion.questions.expected_answer;
      const matched =
        autoMode === "exact"
          ? matchExactAnswer(answerRow.numeric_answer, expected)
          : matchKeywordAnswer(answerRow.numeric_answer, expected);
      score = matched ? part?.marks ?? paperQuestion.questions.marks : 0;
    }

    await upsertSystemMark(attempt.id, answerRow.id, score);
  }

  await supabaseAdmin
    .from("paper_attempts")
    .update({ updated_at: nowIso })
    .eq("id", attempt.id);
}

export async function submitPaperAttempt(
  attempt: AttemptRecord,
  structure: PaperStructure,
  selectionBySection: Record<string, string[]> = {},
  autoSubmitted = false
) {
  const answers = await loadAnswerRows(attempt.id);
  const validationErrors: Array<{
    sectionId: string;
    sectionCode: string;
    message: string;
    answeredQuestionIds?: string[];
  }> = [];
  const selectedQuestionIdsBySection: Record<string, string[]> = {};
  const sections = getAttemptSections(structure);

  for (const section of sections) {
    const sectionQuestions = getSectionQuestions(structure, section);
    const answeredQuestions = sectionQuestions.filter((paperQuestion) =>
      questionIsAnswered(paperQuestion, answers)
    );
    const selectionResult = resolveSectionSelection(
      section,
      sectionQuestions,
      answeredQuestions,
      selectionBySection,
      autoSubmitted
    );

    if (selectionResult.validationError) {
      validationErrors.push(selectionResult.validationError);
      continue;
    }

    selectedQuestionIdsBySection[section.id] = selectionResult.selectedQuestionIds;
  }

  if (validationErrors.length > 0) {
    return { ok: false as const, validationErrors };
  }

  const submittedAt = new Date().toISOString();
  for (const section of sections) {
    const selectedIds = new Set(selectedQuestionIdsBySection[section.id] ?? []);
    const sectionQuestions = getSectionQuestions(structure, section);

    for (const paperQuestion of sectionQuestions) {
      const { error } = await supabaseAdmin
        .from("attempt_answers")
        .update({
          is_selected_for_marking:
            section.question_selection_mode === "answer_all"
              ? true
              : selectedIds.has(paperQuestion.id),
          answer_status: autoSubmitted ? "auto_submitted" : "submitted",
          submitted_at: submittedAt,
        })
        .eq("paper_attempt_id", attempt.id)
        .eq("paper_question_id", paperQuestion.id);

      if (error) {
        throw new Error(error.message);
      }
    }
  }

  const refreshedAnswers = await loadAnswerRows(attempt.id);
  const refreshedMarks = await loadAnswerMarks(attempt.id);
  const refreshedReviews = await loadMarkingReviews(attempt.id);
  const scoreSnapshot = resolveAttemptScores(
    structure,
    refreshedAnswers,
    refreshedMarks,
    refreshedReviews
  );
  const nextStatus = resolveAttemptStatus(attempt, scoreSnapshot.markingStatus, autoSubmitted);

  const { data, error } = await supabaseAdmin
    .from("paper_attempts")
    .update({
      status: nextStatus,
      marking_status: scoreSnapshot.markingStatus,
      selected_question_ids_by_section: selectedQuestionIdsBySection,
      objective_score: scoreSnapshot.objectiveScore,
      manual_score: scoreSnapshot.manualScore,
      final_score: scoreSnapshot.finalScore,
      submitted_at: submittedAt,
      finalized_at: scoreSnapshot.finalizedAt,
      updated_at: submittedAt,
      max_score: scoreSnapshot.maxScore,
    })
    .eq("id", attempt.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not finalize attempt");
  }

  return { ok: true as const, attempt: data as AttemptRecord };
}

export async function maybeAutoSubmitAttempt(attempt: AttemptRecord, structure: PaperStructure) {
  if (attempt.status !== "in_progress") {
    return attempt;
  }

  if (new Date(attempt.expires_at).getTime() > Date.now()) {
    return attempt;
  }

  const submitResult = await submitPaperAttempt(attempt, structure, {}, true);
  if (!submitResult.ok) {
    throw new Error("Could not auto-submit expired attempt");
  }

  return submitResult.attempt;
}

export async function buildAttemptSummary(attempt: AttemptRecord, structure: PaperStructure) {
  const answers = await loadAnswerRows(attempt.id);
  const marks = await loadAnswerMarks(attempt.id);
  const reviews = await loadMarkingReviews(attempt.id);
  const revealSolutions = canRevealSolutions(structure.paper.solution_unlock_mode, attempt);
  const sections = getAttemptSections(structure);

  return {
    attempt,
    paper: {
      ...structure.paper,
      paper_sections: sections,
    },
    sections: sections.map((section) => {
      const sectionQuestions = getSectionQuestions(structure, section);
      const selectedIds = new Set(
        getRequestedSelection(section, attempt.selected_question_ids_by_section ?? {})
      );

      const questionSummaries = sectionQuestions.map((paperQuestion) => {
        const resolved = resolveQuestionScore(paperQuestion, answers, marks, reviews);
        const countsTowardScore =
          section.question_selection_mode === "answer_all" ||
          selectedIds.has(paperQuestion.id) ||
          answers.some(
            (answer) =>
              answer.paper_question_id === paperQuestion.id && answer.is_selected_for_marking
          );

        return {
          id: paperQuestion.id,
          questionNumber: paperQuestion.question_number ?? paperQuestion.order_index + 1,
          type: paperQuestion.questions.type,
          marks: paperQuestion.questions.marks,
          answered: resolved.answered,
          pendingManual: resolved.pendingManual,
          underReview: resolved.underReview,
          countsTowardScore,
          score:
            !countsTowardScore || resolved.pendingManual || resolved.underReview
              ? null
              : resolved.finalScore,
          maxScore: resolved.maxScore,
          question: {
            id: paperQuestion.questions.id,
            stem: paperQuestion.questions.stem,
            type: paperQuestion.questions.type,
            explanation: revealSolutions ? paperQuestion.questions.explanation : null,
            expectedAnswer: revealSolutions ? paperQuestion.questions.expected_answer : null,
          },
        };
      });

      return {
        id: section.id,
        sectionCode: section.section_code,
        title: section.title,
        instructions: section.instructions,
        questionSelectionMode: section.question_selection_mode,
        requiredCount: section.required_count,
        questionCount: sectionQuestions.length,
        answeredCount: questionSummaries.filter((question) => question.answered).length,
        pendingManualCount: questionSummaries.filter((question) => question.pendingManual).length,
        score: questionSummaries.reduce((sum, question) => sum + (question.score ?? 0), 0),
        maxScore: calculateSectionMaxScore(section, sectionQuestions),
        questions: questionSummaries,
      };
    }),
    revealSolutions,
  };
}

export async function getAttemptQuestionSavedAnswers(attemptId: string, paperQuestionId: string) {
  const { data, error } = await supabaseAdmin
    .from("attempt_answers")
    .select("*")
    .eq("paper_attempt_id", attemptId)
    .eq("paper_question_id", paperQuestionId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AttemptAnswerRecord[];
}

export async function refreshAttemptScores(attemptId: string) {
  const attempt = await getAttemptRecord(attemptId);
  const structure = await loadPaperStructure(attempt.exam_paper_id);
  const answers = await loadAnswerRows(attemptId);
  const marks = await loadAnswerMarks(attemptId);
  const reviews = await loadMarkingReviews(attemptId);
  const scoreSnapshot = resolveAttemptScores(structure, answers, marks, reviews);
  const nextStatus = resolveAttemptStatus(attempt, scoreSnapshot.markingStatus, false);

  const { data, error } = await supabaseAdmin
    .from("paper_attempts")
    .update({
      marking_status: scoreSnapshot.markingStatus,
      status: attempt.status === "in_progress" ? "in_progress" : nextStatus,
      objective_score: scoreSnapshot.objectiveScore,
      final_score: scoreSnapshot.finalScore,
      manual_score: scoreSnapshot.manualScore,
      finalized_at: scoreSnapshot.finalizedAt,
      max_score: scoreSnapshot.maxScore,
      updated_at: new Date().toISOString(),
    })
    .eq("id", attemptId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not refresh attempt scores");
  }

  return data as AttemptRecord;
}

export function sanitizeQuestionForDelivery(
  paperQuestion: PaperQuestionNode,
  attempt: AttemptRecord,
  savedAnswers: AttemptAnswerRecord[]
) {
  return {
    id: paperQuestion.id,
    questionNumber: paperQuestion.question_number ?? paperQuestion.order_index + 1,
    sectionCode: paperQuestion.section,
    sectionId: paperQuestion.section_id,
    orderIndex: paperQuestion.order_index,
    marks: paperQuestion.questions.marks,
    type: paperQuestion.questions.type,
    difficulty: paperQuestion.questions.difficulty,
    stem: paperQuestion.questions.stem,
    options: sanitizeOptionList(paperQuestion.questions.options),
    allowShuffle: paperQuestion.questions.allow_shuffle,
    remainingSeconds: Math.max(
      0,
      Math.floor((new Date(attempt.expires_at).getTime() - Date.now()) / 1000)
    ),
    answers: savedAnswers.map((answer) => ({
      questionPartId: answer.question_part_id,
      selectedOption: answer.selected_option,
      textAnswer: answer.text_answer,
      numericAnswer: answer.numeric_answer,
      answerPayload: answer.answer_payload,
    })),
    parts: (paperQuestion.questions.question_parts ?? []).map((part) => ({
      id: part.id,
      partLabel: part.part_label,
      body: part.body,
      marks: part.marks,
      autoMarkingMode: part.auto_marking_mode,
      options: sanitizeOptionList(part.options),
    })),
  };
}
