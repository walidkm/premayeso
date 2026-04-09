import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import { parsePaperWorkbook, type WorkbookCatalog } from "./paperWorkbook.js";

const catalog: WorkbookCatalog = {
  subjects: [
    { id: "subject-1", code: "BIO", exam_path: "MSCE" },
    { id: "subject-2", code: "BIOL-JCE", exam_path: "JCE" },
  ],
  topics: [{ id: "topic-1", code: "CELL", subject_id: "subject-1", exam_path: "MSCE" }],
  subtopics: [{ id: "subtopic-1", code: "CELL-1", topic_id: "topic-1" }],
};

function workbookBuffer(sheets: Record<string, Array<Record<string, unknown>>>) {
  const workbook = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name);
  }
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

function runPaperWorkbookTests() {
  {
    const parsed = parsePaperWorkbook(
      workbookBuffer({
        exam_papers: [{ exam_path: "MSCE", subject_code: "BIO", paper_code: "BIO-2024-P1", title: "Paper" }],
      }),
      catalog
    );
    assert.ok(parsed.issues.some((issue) => issue.sheet === "questions" && issue.level === "error"));
  }

  {
    const parsed = parsePaperWorkbook(
      workbookBuffer({
        exam_papers: [{ exam_path: "MSCE", subject_code: "BIO", paper_code: "BIO-2024-P1", title: "Paper", total_marks: 20 }],
        questions: [
          { paper_code: "BIO-2024-P1", question_number: 1, type: "short_answer", body: "One", marks: 10, topic_code: "CELL" },
          { paper_code: "BIO-2024-P1", question_number: 1, type: "short_answer", body: "Two", marks: 10, topic_code: "CELL" },
        ],
      }),
      catalog
    );
    assert.ok(parsed.issues.some((issue) => issue.field === "question_number" && issue.message.includes("Duplicate question_number")));
  }

  {
    const parsed = parsePaperWorkbook(
      workbookBuffer({
        exam_papers: [{ exam_path: "MSCE", subject_code: "BIO", paper_code: "BIO-2024-P2", title: "Paper", total_marks: 20 }],
        questions: [
          { paper_code: "BIO-2024-P2", question_number: 1, type: "essay", body: "Describe.", marks: 20, topic_code: "CELL" },
        ],
      }),
      catalog
    );
    assert.ok(parsed.issues.some((issue) => issue.field === "rubric_code" && issue.message.includes("Essay question 1")));
  }

  {
    const parsed = parsePaperWorkbook(
      workbookBuffer({
        exam_papers: [{ exam_path: "MSCE", subject_code: "BIO", paper_code: "BIO-2024-P1", title: "Paper", total_marks: 1 }],
        questions: [
          { paper_code: "BIO-2024-P1", question_number: 1, type: "mcq", body: "Which?", marks: 1, topic_code: "CELL" },
        ],
        options: [
          { paper_code: "BIO-2024-P1", question_number: 1, option_label: "A", option_text: "Nucleus", is_correct: "true" },
          { paper_code: "BIO-2024-P1", question_number: 1, option_label: "B", option_text: "Ribosome", is_correct: "true" },
        ],
      }),
      catalog
    );
    assert.ok(parsed.issues.some((issue) => issue.field === "is_correct" && issue.message.includes("exactly one correct option")));
  }

  {
    const parsed = parsePaperWorkbook(
      workbookBuffer({
        exam_papers: [{ exam_path: "MSCE", subject_code: "BIO", paper_code: "BIO-2024-P1", title: "Paper", total_marks: 12 }],
        paper_sections: [{ paper_code: "BIO-2024-P1", section_code: "A", title: "Section A", order_index: 1, max_marks: 5 }],
        questions: [
          { paper_code: "BIO-2024-P1", section_code: "A", question_number: 1, type: "short_answer", body: "One", marks: 10, topic_code: "CELL" },
        ],
      }),
      catalog
    );
    assert.ok(parsed.issues.some((issue) => issue.field === "total_marks" && issue.message.includes("does not match counted section marks")));
    assert.ok(parsed.issues.some((issue) => issue.field === "max_marks" && issue.message.includes("does not match question marks")));
  }

  {
    const parsed = parsePaperWorkbook(
      workbookBuffer({
        exam_papers: [{ exam_path: "MSCE", subject_code: "BIO", paper_code: "BIO-2024-P3", title: "Paper", total_marks: 20 }],
        paper_sections: [
          {
            paper_code: "BIO-2024-P3",
            section_code: "B",
            title: "Section B",
            order_index: 1,
            question_selection_mode: "answer_any_n",
            required_count: 2,
            max_marks: 20,
          },
        ],
        questions: [
          { paper_code: "BIO-2024-P3", section_code: "B", question_number: 1, type: "short_answer", body: "One", marks: 10, topic_code: "CELL" },
          { paper_code: "BIO-2024-P3", section_code: "B", question_number: 2, type: "short_answer", body: "Two", marks: 10, topic_code: "CELL" },
          { paper_code: "BIO-2024-P3", section_code: "B", question_number: 3, type: "short_answer", body: "Three", marks: 6, topic_code: "CELL" },
        ],
      }),
      catalog
    );
    assert.equal(parsed.issues.some((issue) => issue.level === "error"), false);
  }

  {
    const parsed = parsePaperWorkbook(
      workbookBuffer({
        exam_papers: [{ exam_path: "MSCE", subject_code: "BIO", paper_code: "BIO-2024-P4", title: "Paper", total_marks: 10 }],
        paper_sections: [
          {
            paper_code: "BIO-2024-P4",
            section_code: "B",
            title: "Section B",
            order_index: 1,
            question_selection_mode: "answer_any_n",
            required_count: 2,
            max_marks: 10,
          },
        ],
        questions: [
          { paper_code: "BIO-2024-P4", section_code: "B", question_number: 1, type: "short_answer", body: "One", marks: 10, topic_code: "CELL" },
        ],
      }),
      catalog
    );
    assert.ok(parsed.issues.some((issue) => issue.field === "required_count" && issue.message.includes("only has 1")));
  }

  {
    const parsed = parsePaperWorkbook(
      workbookBuffer({
        exam_papers: [{ exam_path: "MSCE", subject_code: "BIO", paper_code: "BIO-2024-P5", title: "Paper", total_marks: 10 }],
        questions: [
          { paper_code: "BIO-2024-P5", question_number: 1, type: "structured", body: "Explain.", marks: 10, topic_code: "CELL" },
        ],
      }),
      catalog
    );
    assert.ok(parsed.issues.some((issue) => issue.field === "type" && issue.message.includes("Structured question 1")));
  }

  {
    const parsed = parsePaperWorkbook(
      workbookBuffer({
        exam_papers: [{ exam_path: "MSCE", subject_code: "BIO", paper_code: "BIO-2024-P6", title: "Paper", total_marks: 10 }],
        questions: [
          { paper_code: "BIO-2024-P6", question_number: 1, type: "essay", body: "Discuss.", marks: 10, topic_code: "CELL" },
        ],
        question_parts: [
          { paper_code: "BIO-2024-P6", question_number: 1, part_label: "a", body: "Part a", marks: 5 },
          { paper_code: "BIO-2024-P6", question_number: 1, part_label: "b", body: "Part b", marks: 5 },
        ],
      }),
      catalog
    );
    assert.ok(parsed.issues.some((issue) => issue.field === "rubric_code" && issue.message.includes("every part")));
  }

  {
    const goldenWorkbook = readFileSync(
      new URL("../../../../infra/samples/golden/maneb-2021-jce-biology-sample-j022.xlsx", import.meta.url)
    );
    const parsed = parsePaperWorkbook(goldenWorkbook, catalog);

    assert.equal(
      parsed.issues.some((issue) => issue.level === "error"),
      false
    );
    assert.equal(parsed.paper?.paperCode, "MANEB-JCE-BIOL-J022-2021-SAMPLE");
    assert.equal(parsed.summary.questionCount, 33);
    assert.equal(parsed.summary.sectionCount, 3);
    assert.equal(parsed.summary.partCount, 28);
    assert.equal(parsed.summary.essayCount, 3);
    assert.equal(parsed.summary.structuredCount, 10);
    assert.equal(parsed.summary.objectiveCount, 20);
    assert.equal(parsed.summary.totalQuestionMarks, 100);
    assert.equal(parsed.summary.totalSectionMarks, 100);
  }
}

runPaperWorkbookTests();
console.log("paperWorkbook tests passed");
