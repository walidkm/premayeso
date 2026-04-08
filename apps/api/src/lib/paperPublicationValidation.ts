import type { PaperStructure } from "./paperAttempts.js";

export type PublicationValidationIssue = {
  code:
    | "paper_empty"
    | "question_missing_section"
    | "structured_missing_parts"
    | "essay_missing_rubric"
    | "question_marks_mismatch"
    | "section_required_count_invalid"
    | "section_required_count_exceeds_questions"
    | "section_marks_mismatch"
    | "paper_total_mismatch";
  message: string;
  sectionId?: string;
  sectionCode?: string;
  paperQuestionId?: string;
  questionId?: string;
};

function normalizeValue(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

function calculateSectionCountedMarks(
  section: PaperStructure["sections"][number],
  sectionQuestions: PaperStructure["questions"]
): number {
  if (section.question_selection_mode !== "answer_any_n") {
    return sectionQuestions.reduce((sum, question) => sum + question.questions.marks, 0);
  }

  const requiredCount = section.required_count ?? 0;
  return [...sectionQuestions]
    .sort((left, right) => right.questions.marks - left.questions.marks)
    .slice(0, requiredCount)
    .reduce((sum, question) => sum + question.questions.marks, 0);
}

export function validatePaperStructureForPublication(
  structure: PaperStructure
): PublicationValidationIssue[] {
  const issues: PublicationValidationIssue[] = [];

  if (structure.questions.length === 0) {
    issues.push({
      code: "paper_empty",
      message: "Published papers must contain at least one linked question",
    });
    return issues;
  }

  const hasSections = structure.sections.length > 0;
  const sectionById = new Map(structure.sections.map((section) => [section.id, section] as const));
  const sectionByCode = new Map(
    structure.sections.map((section) => [normalizeValue(section.section_code), section] as const)
  );

  for (const paperQuestion of structure.questions) {
    const question = paperQuestion.questions;
    const parts = question.question_parts ?? [];

    if (hasSections) {
      const linkedSection =
        (paperQuestion.section_id ? sectionById.get(paperQuestion.section_id) : undefined) ??
        (paperQuestion.section ? sectionByCode.get(normalizeValue(paperQuestion.section)) : undefined);

      if (!linkedSection) {
        issues.push({
          code: "question_missing_section",
          message: `Question ${paperQuestion.question_number ?? paperQuestion.order_index + 1} is not linked to a valid paper section`,
          paperQuestionId: paperQuestion.id,
          questionId: question.id,
        });
      }
    }

    if (parts.length > 0) {
      const partTotal = parts.reduce((sum, part) => sum + part.marks, 0);
      if (partTotal !== question.marks) {
        issues.push({
          code: "question_marks_mismatch",
          message: `Question ${paperQuestion.question_number ?? paperQuestion.order_index + 1} marks (${question.marks}) must equal the sum of its parts (${partTotal})`,
          paperQuestionId: paperQuestion.id,
          questionId: question.id,
        });
      }
    }

    if (question.type === "structured" && parts.length === 0) {
      issues.push({
        code: "structured_missing_parts",
        message: `Structured question ${paperQuestion.question_number ?? paperQuestion.order_index + 1} requires at least one part`,
        paperQuestionId: paperQuestion.id,
        questionId: question.id,
      });
    }

    if (
      question.type === "essay" &&
      !question.rubric_id &&
      (parts.length === 0 || parts.some((part) => !part.rubric_id))
    ) {
      issues.push({
        code: "essay_missing_rubric",
        message: `Essay question ${paperQuestion.question_number ?? paperQuestion.order_index + 1} requires a rubric on the question or every part`,
        paperQuestionId: paperQuestion.id,
        questionId: question.id,
      });
    }
  }

  const totalQuestionMarks = structure.questions.reduce(
    (sum, paperQuestion) => sum + paperQuestion.questions.marks,
    0
  );
  let totalSectionMarks = 0;

  for (const section of structure.sections) {
    const sectionQuestions = structure.questions.filter((paperQuestion) => {
      return (
        paperQuestion.section_id === section.id ||
        normalizeValue(paperQuestion.section) === normalizeValue(section.section_code)
      );
    });

    if (section.question_selection_mode === "answer_any_n") {
      if (!section.required_count || section.required_count <= 0) {
        issues.push({
          code: "section_required_count_invalid",
          message: `Section ${section.section_code} requires a positive required_count`,
          sectionId: section.id,
          sectionCode: section.section_code,
        });
      } else if (section.required_count > sectionQuestions.length) {
        issues.push({
          code: "section_required_count_exceeds_questions",
          message: `Section ${section.section_code} requires ${section.required_count} questions but only has ${sectionQuestions.length}`,
          sectionId: section.id,
          sectionCode: section.section_code,
        });
      }
    }

    const rawSectionMarks = sectionQuestions.reduce(
      (sum, paperQuestion) => sum + paperQuestion.questions.marks,
      0
    );
    const countedSectionMarks = calculateSectionCountedMarks(section, sectionQuestions);
    const expectedSectionMarks =
      section.question_selection_mode === "answer_any_n" ? countedSectionMarks : rawSectionMarks;

    if (
      section.max_marks !== null &&
      section.max_marks !== undefined &&
      section.max_marks !== expectedSectionMarks
    ) {
      issues.push({
        code: "section_marks_mismatch",
        message: `Section ${section.section_code} max_marks (${section.max_marks}) does not match its counted marks (${expectedSectionMarks})`,
        sectionId: section.id,
        sectionCode: section.section_code,
      });
    }

    totalSectionMarks += section.max_marks ?? expectedSectionMarks;
  }

  if (
    structure.paper.total_marks !== null &&
    structure.paper.total_marks !== undefined
  ) {
    const expectedPaperMarks = hasSections ? totalSectionMarks : totalQuestionMarks;
    if (structure.paper.total_marks !== expectedPaperMarks) {
      issues.push({
        code: "paper_total_mismatch",
        message: `Paper total_marks (${structure.paper.total_marks}) does not match ${hasSections ? "counted section marks" : "question marks"} (${expectedPaperMarks})`,
      });
    }
  }

  return issues;
}
