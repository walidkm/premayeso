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
  marks: AnswerMarkRecord[]
): {
  score: number;
  maxScore: number;
  pendingManual: boolean;
  answered: boolean;
} {
  const questionRows = answers.filter(
    (answer) => answer.paper_question_id === paperQuestion.id && answer.is_selected_for_marking
  );

  if (paperQuestion.questions.question_parts && paperQuestion.questions.question_parts.length > 0) {
    let score = 0;
    let pendingManual = false;
    let answeredParts = 0;

    for (const part of paperQuestion.questions.question_parts) {
      const answerRow = questionRows.find((answer) => answer.question_part_id === part.id);
      if (answerRow && isAnswerValuePresent(answerRow)) {
        answeredParts += 1;
      }

      const partMarks = marks.filter((mark) => mark.attempt_answer_id === answerRow?.id);
      const humanMark = partMarks.find((mark) => mark.marker_type === "human" || mark.marker_type === "moderator");
      const systemMark = partMarks.find((mark) => mark.marker_type === "system");
      const resolvedMode = deriveAutoMarkingMode(paperQuestion.questions.type, part.auto_marking_mode);

      if (humanMark?.final_score !== null && humanMark?.final_score !== undefined) {
        score += humanMark.final_score;
      } else if (systemMark?.final_score !== null && systemMark?.final_score !== undefined && !isManualMode(resolvedMode)) {
        score += systemMark.final_score;
      } else if (isManualMode(resolvedMode)) {
        pendingManual = true;
      }
    }

    return {
      score,
      maxScore: paperQuestion.questions.marks,
      pendingManual,
      answered:
        paperQuestion.questions.question_parts.length > 0 &&
        answeredParts === paperQuestion.questions.question_parts.length,
    };
  }

  const answerRow = questionRows.find((answer) => answer.question_part_id === null);
  const answerMarks = marks.filter((mark) => mark.attempt_answer_id === answerRow?.id);
  const humanMark = answerMarks.find((mark) => mark.marker_type === "human" || mark.marker_type === "moderator");
  const systemMark = answerMarks.find((mark) => mark.marker_type === "system");
  const resolvedMode = deriveAutoMarkingMode(
    paperQuestion.questions.type,
    paperQuestion.questions.auto_marking_mode
  );

  if (humanMark?.final_score !== null && humanMark?.final_score !== undefined) {
    return {
      score: humanMark.final_score,
      maxScore: paperQuestion.questions.marks,
      pendingManual: false,
      answered: Boolean(answerRow && isAnswerValuePresent(answerRow)),
    };
  }

  if (systemMark?.final_score !== null && systemMark?.final_score !== undefined && !isManualMode(resolvedMode)) {
    return {
      score: systemMark.final_score,
      maxScore: paperQuestion.questions.marks,
      pendingManual: false,
      answered: Boolean(answerRow && isAnswerValuePresent(answerRow)),
    };
  }

  return {
    score: 0,
    maxScore: paperQuestion.questions.marks,
    pendingManual: isManualMode(resolvedMode),
    answered: Boolean(answerRow && isAnswerValuePresent(answerRow)),
  };
}

function questionIsAnswered(paperQuestion: PaperQuestionNode, answers: AttemptAnswerRecord[]): boolean {
  const questionRows = answers.filter((answer) => answer.paper_question_id === paperQuestion.id);
  if (paperQuestion.questions.question_parts && paperQuestion.questions.question_parts.length > 0) {
    return paperQuestion.questions.question_parts.every((part) =>
      questionRows.some(
        (answer) => answer.question_part_id === part.id && isAnswerValuePresent(answer)
      )
    );
  }

  return questionRows.some(
    (answer) => answer.question_part_id === null && isAnswerValuePresent(answer)
  );
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
  const maxScore =
    structure.paper.total_marks ??
    structure.questions.reduce((sum, question) => sum + question.questions.marks, 0);

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
  const marks = await loadAnswerMarks(attempt.id);
  const validationErrors: Array<{
    sectionId: string;
    sectionCode: string;
    message: string;
    answeredQuestionIds?: string[];
  }> = [];
  const selectedQuestionIdsBySection: Record<string, string[]> = {};
  const sections =
    structure.sections.length > 0
      ? structure.sections
      : [
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

  for (const section of sections) {
    const sectionQuestions = structure.questions.filter((paperQuestion) => {
      if (structure.sections.length === 0) return true;
      return paperQuestion.section_id === section.id || normalizeValue(paperQuestion.section) === normalizeValue(section.section_code);
    });
    const answeredQuestions = sectionQuestions.filter((paperQuestion) =>
      questionIsAnswered(paperQuestion, answers)
    );

    if (section.question_selection_mode === "answer_any_n") {
      if ((section.required_count ?? 0) > answeredQuestions.length) {
        validationErrors.push({
          sectionId: section.id,
          sectionCode: section.section_code,
          message: `Section ${section.section_code} requires ${section.required_count} answered questions`,
        });
        continue;
      }

      if ((section.required_count ?? 0) < answeredQuestions.length) {
        const requestedSelection =
          selectionBySection[section.id] ??
          selectionBySection[section.section_code] ??
          [];

        if (requestedSelection.length !== section.required_count) {
          validationErrors.push({
            sectionId: section.id,
            sectionCode: section.section_code,
            message: `Section ${section.section_code} requires you to choose which ${section.required_count} questions to count`,
            answeredQuestionIds: answeredQuestions.map((paperQuestion) => paperQuestion.id),
          });
          continue;
        }

        const answeredIds = new Set(answeredQuestions.map((paperQuestion) => paperQuestion.id));
        if (requestedSelection.some((questionId) => !answeredIds.has(questionId))) {
          validationErrors.push({
            sectionId: section.id,
            sectionCode: section.section_code,
            message: `Section ${section.section_code} selection includes unanswered or invalid questions`,
            answeredQuestionIds: answeredQuestions.map((paperQuestion) => paperQuestion.id),
          });
          continue;
        }

        selectedQuestionIdsBySection[section.id] = requestedSelection;
      } else {
        selectedQuestionIdsBySection[section.id] = answeredQuestions.map(
          (paperQuestion) => paperQuestion.id
        );
      }
    } else {
      const unanswered = sectionQuestions.filter(
        (paperQuestion) => !questionIsAnswered(paperQuestion, answers)
      );
      if (unanswered.length > 0) {
        validationErrors.push({
          sectionId: section.id,
          sectionCode: section.section_code,
          message: `Section ${section.section_code} requires all questions to be answered`,
        });
        continue;
      }

      selectedQuestionIdsBySection[section.id] = sectionQuestions.map((paperQuestion) => paperQuestion.id);
    }
  }

  if (validationErrors.length > 0) {
    return { ok: false as const, validationErrors };
  }

  for (const section of sections) {
    const selectedIds = new Set(selectedQuestionIdsBySection[section.id] ?? []);
    const sectionQuestions = structure.questions.filter((paperQuestion) => {
      if (structure.sections.length === 0) return true;
      return paperQuestion.section_id === section.id || normalizeValue(paperQuestion.section) === normalizeValue(section.section_code);
    });

    for (const paperQuestion of sectionQuestions) {
      const { error } = await supabaseAdmin
        .from("attempt_answers")
        .update({
          is_selected_for_marking:
            section.question_selection_mode === "answer_all"
              ? true
              : selectedIds.has(paperQuestion.id),
          answer_status: autoSubmitted ? "auto_submitted" : "submitted",
          submitted_at: new Date().toISOString(),
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
  let objectiveScore = 0;
  let pendingManual = false;

  for (const paperQuestion of structure.questions) {
    const resolved = resolveQuestionScore(paperQuestion, refreshedAnswers, refreshedMarks);
    objectiveScore += resolved.pendingManual ? 0 : resolved.score;
    pendingManual = pendingManual || resolved.pendingManual;
  }

  const maxScore =
    structure.paper.total_marks ??
    structure.questions.reduce((sum, question) => sum + question.questions.marks, 0);

  const { data, error } = await supabaseAdmin
    .from("paper_attempts")
    .update({
      status: autoSubmitted ? "auto_submitted" : pendingManual ? "submitted" : "marked",
      marking_status: pendingManual ? "pending_manual" : "completed",
      selected_question_ids_by_section: selectedQuestionIdsBySection,
      objective_score: objectiveScore,
      manual_score: null,
      final_score: pendingManual ? null : objectiveScore,
      submitted_at: new Date().toISOString(),
      finalized_at: pendingManual ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
      max_score: maxScore,
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
    const { data, error } = await supabaseAdmin
      .from("paper_attempts")
      .update({
        status: "auto_submitted",
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", attempt.id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Could not auto-submit expired attempt");
    }

    return data as AttemptRecord;
  }

  return submitResult.attempt;
}

export async function buildAttemptSummary(attempt: AttemptRecord, structure: PaperStructure) {
  const answers = await loadAnswerRows(attempt.id);
  const marks = await loadAnswerMarks(attempt.id);
  const revealSolutions = canRevealSolutions(structure.paper.solution_unlock_mode, attempt);

  const sections =
    structure.sections.length > 0
      ? structure.sections
      : [
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

  return {
    attempt,
    paper: {
      ...structure.paper,
      paper_sections: sections,
    },
    sections: sections.map((section) => {
      const sectionQuestions = structure.questions.filter((paperQuestion) => {
        if (structure.sections.length === 0) return true;
        return paperQuestion.section_id === section.id || normalizeValue(paperQuestion.section) === normalizeValue(section.section_code);
      });

      const questionSummaries = sectionQuestions.map((paperQuestion) => {
        const resolved = resolveQuestionScore(paperQuestion, answers, marks);
        return {
          id: paperQuestion.id,
          questionNumber: paperQuestion.question_number ?? paperQuestion.order_index + 1,
          type: paperQuestion.questions.type,
          marks: paperQuestion.questions.marks,
          answered: resolved.answered,
          pendingManual: resolved.pendingManual,
          score: resolved.pendingManual ? null : resolved.score,
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
        maxScore: questionSummaries.reduce((sum, question) => sum + question.maxScore, 0),
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

  let score = 0;
  let pendingManual = false;
  for (const paperQuestion of structure.questions) {
    const resolved = resolveQuestionScore(paperQuestion, answers, marks);
    score += resolved.pendingManual ? 0 : resolved.score;
    pendingManual = pendingManual || resolved.pendingManual;
  }

  const maxScore =
    structure.paper.total_marks ??
    structure.questions.reduce((sum, question) => sum + question.questions.marks, 0);

  const { data, error } = await supabaseAdmin
    .from("paper_attempts")
    .update({
      marking_status: pendingManual ? "pending_manual" : "completed",
      status:
        attempt.status === "in_progress"
          ? "in_progress"
          : pendingManual
            ? attempt.status === "auto_submitted"
              ? "auto_submitted"
              : "submitted"
            : "marked",
      objective_score: score,
      final_score: pendingManual ? null : score,
      manual_score: null,
      finalized_at: pendingManual ? null : new Date().toISOString(),
      max_score: maxScore,
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
    options: paperQuestion.questions.options ?? [],
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
      options: part.options ?? [],
    })),
  };
}
