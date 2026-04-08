import assert from "node:assert/strict";
import { validatePaperStructureForPublication } from "./paperPublicationValidation.js";
import type { PaperStructure } from "./paperAttempts.js";

function buildBaseStructure(): PaperStructure {
  return {
    paper: {
      id: "paper-1",
      title: "Biology",
      year: 2024,
      session: "JCE",
      paper_number: 1,
      paper_code: "BIO-2024-P1",
      source_type: "maneb",
      paper_type: "maneb_past_paper",
      exam_mode: "paper_layout",
      exam_path: "JCE",
      duration_min: 120,
      total_marks: 10,
      instructions: null,
      has_sections: true,
      marking_mode: "manual",
      solution_unlock_mode: "after_marked",
      question_mode: "one_question_at_a_time",
      status: "draft",
      is_sample: false,
      subjects: null,
    },
    sections: [
      {
        id: "section-1",
        section_code: "A",
        title: "Section A",
        instructions: null,
        order_index: 0,
        question_selection_mode: "answer_all",
        required_count: null,
        max_marks: 10,
        starts_at_question_number: 1,
        ends_at_question_number: 1,
      },
    ],
    questions: [
      {
        id: "paper-question-1",
        question_id: "question-1",
        order_index: 0,
        section: "A",
        section_id: "section-1",
        question_number: 1,
        questions: {
          id: "question-1",
          topic_id: "topic-1",
          subtopic_id: null,
          stem: "Which organelle controls cell activities?",
          options: [
            { key: "A", text: "Nucleus", distractorExplanation: null },
            { key: "B", text: "Ribosome", distractorExplanation: null },
          ],
          correct_option: "A",
          explanation: "The nucleus contains the genetic material.",
          expected_answer: null,
          type: "mcq",
          difficulty: "medium",
          marks: 10,
          allow_shuffle: false,
          rubric_id: null,
          auto_marking_mode: "exact",
          question_parts: null,
        },
      },
    ],
  };
}

function runPaperPublicationValidationTests() {
  {
    const structure = buildBaseStructure();
    structure.questions = [];
    const issues = validatePaperStructureForPublication(structure);
    assert.ok(issues.some((issue) => issue.code === "paper_empty"));
  }

  {
    const structure = buildBaseStructure();
    structure.questions[0] = {
      ...structure.questions[0],
      questions: {
        ...structure.questions[0].questions,
        type: "structured",
        question_parts: [],
      },
    };
    const issues = validatePaperStructureForPublication(structure);
    assert.ok(issues.some((issue) => issue.code === "structured_missing_parts"));
  }

  {
    const structure = buildBaseStructure();
    structure.sections[0] = {
      ...structure.sections[0],
      question_selection_mode: "answer_any_n",
      required_count: 2,
      max_marks: 10,
    };
    structure.questions.push({
      ...structure.questions[0],
      id: "paper-question-2",
      question_id: "question-2",
      order_index: 1,
      question_number: 2,
      questions: {
        ...structure.questions[0].questions,
        id: "question-2",
        marks: 4,
      },
    });
    structure.paper.total_marks = 9;
    const issues = validatePaperStructureForPublication(structure);
    assert.ok(issues.some((issue) => issue.code === "section_marks_mismatch"));
    assert.ok(issues.some((issue) => issue.code === "paper_total_mismatch"));
  }

  {
    const structure = buildBaseStructure();
    structure.questions[0] = {
      ...structure.questions[0],
      questions: {
        ...structure.questions[0].questions,
        type: "essay",
        options: [],
        correct_option: null,
        question_parts: [
          {
            id: "part-1",
            part_label: "a",
            body: "Explain",
            marks: 10,
            expected_answer: null,
            order_index: 0,
            rubric_id: null,
            auto_marking_mode: "manual",
            options: [],
            correct_option: null,
          },
        ],
      },
    };
    const issues = validatePaperStructureForPublication(structure);
    assert.ok(issues.some((issue) => issue.code === "essay_missing_rubric"));
  }
}

runPaperPublicationValidationTests();
console.log("paperPublicationValidation tests passed");
