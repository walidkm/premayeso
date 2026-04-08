import assert from "node:assert/strict";
import { sanitizeQuestionForDelivery } from "./paperAttempts.js";

function runPaperAttemptTests() {
  const delivered = sanitizeQuestionForDelivery(
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
        subtopic_id: "subtopic-1",
        stem: "Which organelle controls cell activities?",
        options: [
          { key: "A", text: "Nucleus", distractorExplanation: null },
          { key: "B", text: "Ribosome", distractorExplanation: "Incorrect" },
        ],
        correct_option: "A",
        explanation: "The nucleus contains the genetic material.",
        expected_answer: "Nucleus",
        type: "mcq",
        difficulty: "medium",
        marks: 1,
        allow_shuffle: false,
        rubric_id: null,
        auto_marking_mode: "exact",
        question_parts: [
          {
            id: "part-1",
            part_label: "a",
            body: "Name the organelle.",
            marks: 1,
            expected_answer: "Nucleus",
            order_index: 0,
            rubric_id: null,
            auto_marking_mode: "manual",
            options: [{ key: "A", text: "Nucleus", distractorExplanation: "Hidden" }],
            correct_option: "A",
          },
        ],
      },
    },
    {
      id: "attempt-1",
      exam_paper_id: "paper-1",
      user_id: "user-1",
      status: "in_progress",
      marking_status: "pending",
      time_limit_seconds: 3600,
      started_at: "2026-04-08T10:00:00.000Z",
      expires_at: "2099-04-08T11:00:00.000Z",
      submitted_at: null,
      finalized_at: null,
      selected_question_ids_by_section: null,
      objective_score: null,
      manual_score: null,
      final_score: null,
      max_score: 100,
      created_at: "2026-04-08T10:00:00.000Z",
      updated_at: "2026-04-08T10:00:00.000Z",
    },
    [
      {
        id: "answer-1",
        paper_attempt_id: "attempt-1",
        paper_question_id: "paper-question-1",
        question_id: "question-1",
        question_part_id: null,
        selected_option: "B",
        text_answer: null,
        numeric_answer: null,
        answer_payload: null,
        answer_status: "draft",
        is_selected_for_marking: false,
        submitted_at: null,
        created_at: "2026-04-08T10:05:00.000Z",
        updated_at: "2026-04-08T10:05:00.000Z",
      },
    ]
  );

  assert.equal(delivered.stem, "Which organelle controls cell activities?");
  assert.equal(delivered.answers.length, 1);
  assert.equal(delivered.answers[0]?.selectedOption, "B");
  assert.equal(delivered.parts.length, 1);
  assert.equal(delivered.parts[0]?.partLabel, "a");

  const deliveredJson = JSON.stringify(delivered);
  assert.equal(deliveredJson.includes("correct_option"), false);
  assert.equal(deliveredJson.includes("explanation"), false);
  assert.equal(deliveredJson.includes("expected_answer"), false);
  assert.equal(deliveredJson.includes("distractorExplanation"), false);
  assert.equal(deliveredJson.includes("isCorrect"), false);
}

runPaperAttemptTests();
console.log("paperAttempts tests passed");
