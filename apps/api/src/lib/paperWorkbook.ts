import * as XLSX from "xlsx";

export type WorkbookIssueLevel = "error" | "warning";

export type WorkbookIssue = {
  level: WorkbookIssueLevel;
  sheet: string;
  row: number | null;
  field: string | null;
  message: string;
};

export type WorkbookSubjectCatalog = {
  id: string;
  code: string | null;
  exam_path: string | null;
};

export type WorkbookTopicCatalog = {
  id: string;
  code: string | null;
  subject_id: string;
  exam_path: string | null;
};

export type WorkbookSubtopicCatalog = {
  id: string;
  code: string | null;
  topic_id: string;
};

export type WorkbookCatalog = {
  subjects: WorkbookSubjectCatalog[];
  topics: WorkbookTopicCatalog[];
  subtopics: WorkbookSubtopicCatalog[];
};

export type WorkbookOption = {
  key: string;
  text: string;
  isCorrect: boolean;
  distractorExplanation: string | null;
};

export type WorkbookQuestionPart = {
  partLabel: string;
  body: string;
  marks: number;
  expectedAnswer: string | null;
  rubricCode: string | null;
  autoMarkingMode: string;
  orderIndex: number;
  options: WorkbookOption[];
  correctOption: string | null;
};

export type WorkbookQuestion = {
  questionNumber: number;
  sectionCode: string | null;
  type: string;
  body: string;
  marks: number;
  topicId: string | null;
  subtopicId: string | null;
  difficulty: string;
  allowShuffle: boolean;
  expectedAnswer: string | null;
  explanation: string | null;
  rubricCode: string | null;
  autoMarkingMode: string;
  options: WorkbookOption[];
  correctOption: string | null;
  parts: WorkbookQuestionPart[];
};

export type WorkbookSection = {
  sectionCode: string;
  title: string | null;
  instructions: string | null;
  orderIndex: number;
  questionSelectionMode: string;
  requiredCount: number | null;
  maxMarks: number | null;
  startsAtQuestionNumber: number | null;
  endsAtQuestionNumber: number | null;
};

export type WorkbookRubricCriterion = {
  criterionName: string;
  maxMarks: number;
  orderIndex: number;
  markBands: Array<{ key: string; value: string }>;
};

export type WorkbookRubric = {
  rubricCode: string;
  title: string;
  criteria: WorkbookRubricCriterion[];
  totalMarks: number;
};

export type WorkbookPaper = {
  examPath: string | null;
  subjectId: string | null;
  subjectCode: string;
  title: string;
  year: number | null;
  session: string | null;
  paperNumber: number | null;
  paperCode: string;
  durationMin: number | null;
  totalMarks: number | null;
  instructions: string | null;
  sourceType: string;
  markingMode: string;
  solutionUnlockMode: string;
  questionMode: string;
  status: string;
  isSample: boolean;
};

export type ParsedPaperWorkbook = {
  paper: WorkbookPaper | null;
  sections: WorkbookSection[];
  questions: WorkbookQuestion[];
  rubrics: WorkbookRubric[];
  issues: WorkbookIssue[];
  summary: {
    questionCount: number;
    partCount: number;
    sectionCount: number;
    rubricCount: number;
    objectiveCount: number;
    essayCount: number;
    structuredCount: number;
    totalQuestionMarks: number;
    totalSectionMarks: number;
    totalRubricMarks: number;
  };
};

type SheetRow = {
  rowNumber: number;
  values: Record<string, string>;
};

const QUESTION_TYPES = new Set([
  "mcq",
  "true_false",
  "short_answer",
  "numeric",
  "structured",
  "essay",
  "matching",
  "fill_blank",
]);

const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
const MARKING_MODES = new Set(["auto", "manual", "hybrid"]);
const SOLUTION_UNLOCK_MODES = new Set(["never", "after_submit", "after_marked", "always"]);
const PAPER_STATUSES = new Set(["draft", "published", "archived"]);
const QUESTION_MODES = new Set(["one_question_at_a_time", "full_paper"]);
const QUESTION_SELECTION_MODES = new Set(["answer_all", "answer_any_n"]);
const AUTO_MARKING_MODES = new Set(["exact", "keyword", "manual", "hybrid"]);
const SOURCE_TYPES = new Set(["maneb", "school", "teacher"]);

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, "_");
}

function normalizeCell(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeKey(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeQuestionType(value: string): string {
  const normalized = normalizeKey(value).replace(/[ -]+/g, "_");
  if (normalized === "true/false") return "true_false";
  return normalized;
}

function normalizeDifficulty(value: string): string {
  const normalized = normalizeKey(value);
  return DIFFICULTIES.has(normalized) ? normalized : "medium";
}

function normalizeAutoMarkingMode(value: string | null | undefined, questionType: string): string {
  const normalized = normalizeKey(value).replace(/[ -]+/g, "_");
  if (AUTO_MARKING_MODES.has(normalized)) return normalized;
  if (questionType === "essay" || questionType === "structured") return "manual";
  if (questionType === "short_answer" || questionType === "numeric" || questionType === "fill_blank") return "keyword";
  return "exact";
}

function normalizeSourceType(value: string): string {
  const normalized = normalizeKey(value).replace(/[ -]+/g, "_");
  if (normalized === "teacher_created") return "teacher";
  if (normalized === "school_exam") return "school";
  if (normalized === "maneb_past_paper") return "maneb";
  return SOURCE_TYPES.has(normalized) ? normalized : "maneb";
}

function normalizeMarkingMode(value: string): string {
  const normalized = normalizeKey(value).replace(/[ -]+/g, "_");
  return MARKING_MODES.has(normalized) ? normalized : "manual";
}

function normalizeSolutionUnlockMode(value: string): string {
  const normalized = normalizeKey(value).replace(/[ -]+/g, "_");
  return SOLUTION_UNLOCK_MODES.has(normalized) ? normalized : "after_marked";
}

function normalizePaperStatus(value: string): string {
  const normalized = normalizeKey(value);
  return PAPER_STATUSES.has(normalized) ? normalized : "draft";
}

function normalizeQuestionMode(value: string): string {
  const normalized = normalizeKey(value).replace(/[ -]+/g, "_");
  return QUESTION_MODES.has(normalized) ? normalized : "one_question_at_a_time";
}

function normalizeSectionMode(value: string): string {
  const normalized = normalizeKey(value).replace(/[ -]+/g, "_");
  return QUESTION_SELECTION_MODES.has(normalized) ? normalized : "answer_all";
}

function parseBoolean(value: string | null | undefined, fallback = false): boolean {
  const normalized = normalizeKey(value);
  if (!normalized) return fallback;
  return normalized === "true" || normalized === "yes" || normalized === "1";
}

function parseInteger(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

function parseDecimal(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readSheet(workbook: XLSX.WorkBook, sheetName: string): SheetRow[] | null {
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) return null;

  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  if (rawRows.length === 0) return [];

  const headerRow = (rawRows[0] ?? []).map((cell) => normalizeHeader(normalizeCell(cell)));
  return rawRows.slice(1).map((row, index) => {
    const values: Record<string, string> = {};
    headerRow.forEach((header, headerIndex) => {
      if (!header) return;
      values[header] = normalizeCell(row[headerIndex]);
    });

    return {
      rowNumber: index + 2,
      values,
    };
  });
}

function requireSheet(
  workbook: XLSX.WorkBook,
  sheetName: string,
  issues: WorkbookIssue[],
  optional = false
): SheetRow[] {
  const rows = readSheet(workbook, sheetName);
  if (!rows) {
    if (!optional) {
      issues.push({
        level: "error",
        sheet: sheetName,
        row: null,
        field: null,
        message: `Workbook must contain a sheet named '${sheetName}'`,
      });
    }
    return [];
  }

  return rows.filter((row) => Object.values(row.values).some((value) => value !== ""));
}

function pushIssue(
  issues: WorkbookIssue[],
  level: WorkbookIssueLevel,
  sheet: string,
  row: number | null,
  field: string | null,
  message: string
) {
  issues.push({ level, sheet, row, field, message });
}

function mapByCode<T extends { code: string | null }>(rows: T[]): Map<string, T> {
  return new Map(
    rows.flatMap((row) => {
      if (!row.code) return [];
      return [[normalizeKey(row.code), row] as const];
    })
  );
}

function calculateSectionCountedMarks(section: WorkbookSection, questions: WorkbookQuestion[]): number {
  if (section.questionSelectionMode !== "answer_any_n") {
    return questions.reduce((sum, question) => sum + question.marks, 0);
  }

  const requiredCount = section.requiredCount ?? 0;
  return [...questions]
    .sort((left, right) => right.marks - left.marks)
    .slice(0, requiredCount)
    .reduce((sum, question) => sum + question.marks, 0);
}

export function parsePaperWorkbook(buffer: Buffer, catalog: WorkbookCatalog): ParsedPaperWorkbook {
  const issues: WorkbookIssue[] = [];

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    return {
      paper: null,
      sections: [],
      questions: [],
      rubrics: [],
      issues: [
        {
          level: "error",
          sheet: "workbook",
          row: null,
          field: null,
          message: "Could not parse XLSX workbook",
        },
      ],
      summary: {
        questionCount: 0,
        partCount: 0,
        sectionCount: 0,
        rubricCount: 0,
        objectiveCount: 0,
        essayCount: 0,
        structuredCount: 0,
        totalQuestionMarks: 0,
        totalSectionMarks: 0,
        totalRubricMarks: 0,
      },
    };
  }

  const paperRows = requireSheet(workbook, "exam_papers", issues);
  const sectionRows = requireSheet(workbook, "paper_sections", issues, true);
  const questionRows = requireSheet(workbook, "questions", issues);
  const partRows = requireSheet(workbook, "question_parts", issues, true);
  const optionRows = requireSheet(workbook, "options", issues, true);
  const rubricRows = requireSheet(workbook, "rubrics", issues, true);

  const subjectByCode = mapByCode(catalog.subjects);
  const topicByCode = mapByCode(catalog.topics);
  const subtopicByCode = mapByCode(catalog.subtopics);

  if (paperRows.length !== 1) {
    pushIssue(
      issues,
      "error",
      "exam_papers",
      null,
      null,
      paperRows.length === 0
        ? "The exam_papers sheet must contain exactly one paper row"
        : "Only one exam paper can be imported per workbook"
    );
  }

  const firstPaperRow = paperRows[0];
  let paper: WorkbookPaper | null = null;
  if (firstPaperRow) {
    const subjectCode = firstPaperRow.values.subject_code?.toUpperCase() ?? "";
    const subject = subjectByCode.get(normalizeKey(subjectCode));
    const paperCode = firstPaperRow.values.paper_code;
    const title = firstPaperRow.values.title;

    if (!paperCode) {
      pushIssue(issues, "error", "exam_papers", firstPaperRow.rowNumber, "paper_code", "paper_code is required");
    }

    if (!subjectCode) {
      pushIssue(issues, "error", "exam_papers", firstPaperRow.rowNumber, "subject_code", "subject_code is required");
    } else if (!subject) {
      pushIssue(issues, "error", "exam_papers", firstPaperRow.rowNumber, "subject_code", `Unknown subject_code '${subjectCode}'`);
    }

    const examPath = firstPaperRow.values.exam_path?.toUpperCase() || subject?.exam_path || null;
    if (!examPath) {
      pushIssue(issues, "error", "exam_papers", firstPaperRow.rowNumber, "exam_path", "exam_path is required");
    } else if (subject?.exam_path && subject.exam_path !== examPath) {
      pushIssue(
        issues,
        "error",
        "exam_papers",
        firstPaperRow.rowNumber,
        "exam_path",
        `Subject '${subjectCode}' belongs to ${subject.exam_path}, not ${examPath}`
      );
    }

    if (!title) {
      pushIssue(issues, "error", "exam_papers", firstPaperRow.rowNumber, "title", "title is required");
    }

    paper = {
      examPath,
      subjectId: subject?.id ?? null,
      subjectCode,
      title: title || "Untitled paper",
      year: parseInteger(firstPaperRow.values.year),
      session: firstPaperRow.values.session || null,
      paperNumber: parseInteger(firstPaperRow.values.paper_number),
      paperCode,
      durationMin: parseInteger(firstPaperRow.values.duration_min),
      totalMarks: parseInteger(firstPaperRow.values.total_marks),
      instructions: firstPaperRow.values.instructions || null,
      sourceType: normalizeSourceType(firstPaperRow.values.source),
      markingMode: normalizeMarkingMode(firstPaperRow.values.marking_mode),
      solutionUnlockMode: normalizeSolutionUnlockMode(firstPaperRow.values.solution_unlock_mode),
      questionMode: normalizeQuestionMode(firstPaperRow.values.question_mode),
      status: normalizePaperStatus(firstPaperRow.values.status),
      isSample: parseBoolean(firstPaperRow.values.is_sample, false),
    };
  }

  const sections = sectionRows
    .map<WorkbookSection | null>((row) => {
      const paperCode = row.values.paper_code;
      const sectionCode = row.values.section_code;
      if (!paperCode || (paper?.paperCode && paper.paperCode !== paperCode)) {
        pushIssue(issues, "error", "paper_sections", row.rowNumber, "paper_code", "paper_code must match the exam_papers sheet");
      }

      if (!sectionCode) {
        pushIssue(issues, "error", "paper_sections", row.rowNumber, "section_code", "section_code is required");
        return null;
      }

      const mode = normalizeSectionMode(row.values.question_selection_mode);
      const requiredCount = parseInteger(row.values.required_count);
      if (mode === "answer_any_n" && (!requiredCount || requiredCount <= 0)) {
        pushIssue(
          issues,
          "error",
          "paper_sections",
          row.rowNumber,
          "required_count",
          "answer_any_n sections require a positive required_count"
        );
      }

      return {
        sectionCode,
        title: row.values.title || null,
        instructions: row.values.instructions || null,
        orderIndex: parseInteger(row.values.order_index) ?? 0,
        questionSelectionMode: mode,
        requiredCount,
        maxMarks: parseInteger(row.values.max_marks),
        startsAtQuestionNumber: parseInteger(row.values.starts_at_question_number),
        endsAtQuestionNumber: parseInteger(row.values.ends_at_question_number),
      };
    })
    .filter((section): section is WorkbookSection => Boolean(section))
    .sort((left, right) => left.orderIndex - right.orderIndex);

  const sectionByCode = new Map(sections.map((section) => [normalizeKey(section.sectionCode), section]));
  const seenQuestionNumbers = new Set<number>();

  const questionInputs = questionRows
    .map<WorkbookQuestion | null>((row) => {
      const paperCode = row.values.paper_code;
      if (!paperCode || (paper?.paperCode && paper.paperCode !== paperCode)) {
        pushIssue(issues, "error", "questions", row.rowNumber, "paper_code", "paper_code must match the exam_papers sheet");
      }

      const questionNumber = parseInteger(row.values.question_number);
      if (!questionNumber || questionNumber <= 0) {
        pushIssue(issues, "error", "questions", row.rowNumber, "question_number", "question_number must be a positive integer");
        return null;
      }

      if (seenQuestionNumbers.has(questionNumber)) {
        pushIssue(
          issues,
          "error",
          "questions",
          row.rowNumber,
          "question_number",
          `Duplicate question_number '${questionNumber}' in this workbook`
        );
      }
      seenQuestionNumbers.add(questionNumber);

      const sectionCode = row.values.section_code || null;
      if (sections.length > 0 && !sectionCode) {
        pushIssue(issues, "error", "questions", row.rowNumber, "section_code", "section_code is required when the paper has sections");
      } else if (sectionCode && !sectionByCode.has(normalizeKey(sectionCode))) {
        pushIssue(issues, "error", "questions", row.rowNumber, "section_code", `Unknown section_code '${sectionCode}'`);
      }

      const type = normalizeQuestionType(row.values.type);
      if (!QUESTION_TYPES.has(type)) {
        pushIssue(issues, "error", "questions", row.rowNumber, "type", `Unsupported question type '${row.values.type}'`);
      }

      const body = row.values.body;
      if (!body) {
        pushIssue(issues, "error", "questions", row.rowNumber, "body", "body is required");
      }

      const marks = parseInteger(row.values.marks);
      if (!marks || marks <= 0) {
        pushIssue(issues, "error", "questions", row.rowNumber, "marks", "marks must be a positive integer");
      }

      const subjectId = paper?.subjectId ?? null;
      const topicCode = row.values.topic_code;
      const topic = topicCode ? topicByCode.get(normalizeKey(topicCode)) : null;
      if (topicCode && !topic) {
        pushIssue(issues, "error", "questions", row.rowNumber, "topic_code", `Unknown topic_code '${topicCode}'`);
      } else if (topic && subjectId && topic.subject_id !== subjectId) {
        pushIssue(
          issues,
          "error",
          "questions",
          row.rowNumber,
          "topic_code",
          `Topic '${topicCode}' does not belong to subject '${paper?.subjectCode ?? ""}'`
        );
      }

      const subtopicCode = row.values.subtopic_code;
      const subtopic = subtopicCode ? subtopicByCode.get(normalizeKey(subtopicCode)) : null;
      if (subtopicCode && !subtopic) {
        pushIssue(issues, "error", "questions", row.rowNumber, "subtopic_code", `Unknown subtopic_code '${subtopicCode}'`);
      } else if (subtopic && topic && subtopic.topic_id !== topic.id) {
        pushIssue(
          issues,
          "error",
          "questions",
          row.rowNumber,
          "subtopic_code",
          `Subtopic '${subtopicCode}' does not belong to topic '${topicCode}'`
        );
      }

      return {
        questionNumber,
        sectionCode,
        type,
        body,
        marks: marks ?? 0,
        topicId: topic?.id ?? null,
        subtopicId: subtopic?.id ?? null,
        difficulty: normalizeDifficulty(row.values.difficulty),
        allowShuffle: parseBoolean(row.values.allow_shuffle, false),
        expectedAnswer: row.values.expected_answer || null,
        explanation: row.values.explanation || null,
        rubricCode: row.values.rubric_code || null,
        autoMarkingMode: normalizeAutoMarkingMode(row.values.auto_marking_mode, type),
        options: [],
        correctOption: null,
        parts: [],
      };
    })
    .filter((question): question is WorkbookQuestion => Boolean(question))
    .sort((left, right) => left.questionNumber - right.questionNumber);

  const questionByNumber = new Map(questionInputs.map((question) => [question.questionNumber, question]));

  for (const row of partRows) {
    const questionNumber = parseInteger(row.values.question_number);
    const question = questionNumber ? questionByNumber.get(questionNumber) : null;
    if (!question) {
      pushIssue(issues, "error", "question_parts", row.rowNumber, "question_number", "question_number must reference a question row");
      continue;
    }

    const paperCode = row.values.paper_code;
    if (!paperCode || (paper?.paperCode && paper.paperCode !== paperCode)) {
      pushIssue(issues, "error", "question_parts", row.rowNumber, "paper_code", "paper_code must match the exam_papers sheet");
    }

    const partLabel = row.values.part_label;
    if (!partLabel) {
      pushIssue(issues, "error", "question_parts", row.rowNumber, "part_label", "part_label is required");
      continue;
    }

    const body = row.values.body;
    if (!body) {
      pushIssue(issues, "error", "question_parts", row.rowNumber, "body", "body is required");
      continue;
    }

    const marks = parseInteger(row.values.marks);
    if (!marks || marks <= 0) {
      pushIssue(issues, "error", "question_parts", row.rowNumber, "marks", "marks must be a positive integer");
      continue;
    }

    question.parts.push({
      partLabel,
      body,
      marks,
      expectedAnswer: row.values.expected_answer || null,
      rubricCode: row.values.rubric_code || null,
      autoMarkingMode: normalizeAutoMarkingMode(row.values.auto_marking_mode, question.type),
      orderIndex: parseInteger(row.values.order_index) ?? question.parts.length,
      options: [],
      correctOption: null,
    });
  }

  for (const question of questionInputs) {
    question.parts.sort((left, right) => left.orderIndex - right.orderIndex);
  }

  const rubricByCode = new Map<string, WorkbookRubric>();
  for (const row of rubricRows) {
    const rubricCode = row.values.rubric_code;
    const title = row.values.title;
    const criterionName = row.values.criterion_name;
    const maxMarks = parseDecimal(row.values.max_marks);

    if (!rubricCode) {
      pushIssue(issues, "error", "rubrics", row.rowNumber, "rubric_code", "rubric_code is required");
      continue;
    }
    if (!title) {
      pushIssue(issues, "error", "rubrics", row.rowNumber, "title", "title is required");
      continue;
    }
    if (!criterionName) {
      pushIssue(issues, "error", "rubrics", row.rowNumber, "criterion_name", "criterion_name is required");
      continue;
    }
    if (maxMarks === null || maxMarks < 0) {
      pushIssue(issues, "error", "rubrics", row.rowNumber, "max_marks", "max_marks must be zero or greater");
      continue;
    }

    const markBands = Object.entries(row.values)
      .filter(([key, value]) => !["rubric_code", "title", "criterion_name", "max_marks", "order_index"].includes(key) && value)
      .map(([key, value]) => ({ key, value }));

    const rubric =
      rubricByCode.get(normalizeKey(rubricCode)) ??
      {
        rubricCode,
        title,
        criteria: [],
        totalMarks: 0,
      };

    rubric.criteria.push({
      criterionName,
      maxMarks,
      orderIndex: parseInteger(row.values.order_index) ?? rubric.criteria.length,
      markBands,
    });

    rubricByCode.set(normalizeKey(rubricCode), rubric);
  }

  const rubrics = [...rubricByCode.values()]
    .map((rubric) => ({
      ...rubric,
      criteria: rubric.criteria.sort((left, right) => left.orderIndex - right.orderIndex),
      totalMarks: rubric.criteria.reduce((sum, criterion) => sum + criterion.maxMarks, 0),
    }))
    .sort((left, right) => left.rubricCode.localeCompare(right.rubricCode));

  const rubricCodeSet = new Set(rubrics.map((rubric) => normalizeKey(rubric.rubricCode)));
  const optionBuckets = new Map<string, WorkbookOption[]>();

  for (const row of optionRows) {
    const questionNumber = parseInteger(row.values.question_number);
    if (!questionNumber) {
      pushIssue(issues, "error", "options", row.rowNumber, "question_number", "question_number is required");
      continue;
    }

    const optionLabel = row.values.option_label;
    const optionText = row.values.option_text;
    if (!optionLabel || !optionText) {
      pushIssue(issues, "error", "options", row.rowNumber, "option_label", "option_label and option_text are required");
      continue;
    }

    const partLabel = row.values.part_label || "";
    const optionKey = `${questionNumber}::${normalizeKey(partLabel)}`;
    const bucket = optionBuckets.get(optionKey) ?? [];
    bucket.push({
      key: optionLabel,
      text: optionText,
      isCorrect: parseBoolean(row.values.is_correct, false),
      distractorExplanation: row.values.distractor_explanation || null,
    });
    optionBuckets.set(optionKey, bucket);
  }

  for (const question of questionInputs) {
    const questionOptions = optionBuckets.get(`${question.questionNumber}::`) ?? [];
    question.options = questionOptions;
    const correctQuestionOptions = questionOptions.filter((option) => option.isCorrect);
    question.correctOption = correctQuestionOptions[0]?.key ?? null;

    for (const part of question.parts) {
      const partOptions =
        optionBuckets.get(`${question.questionNumber}::${normalizeKey(part.partLabel)}`) ?? [];
      part.options = partOptions;
      const correctPartOptions = partOptions.filter((option) => option.isCorrect);
      part.correctOption = correctPartOptions[0]?.key ?? null;
    }

    if (question.type === "mcq" || question.type === "true_false") {
      if (question.options.length === 0) {
        pushIssue(issues, "error", "options", null, "option_label", `Question ${question.questionNumber} requires options`);
      }
      if (correctQuestionOptions.length !== 1) {
        pushIssue(
          issues,
          "error",
          "options",
          null,
          "is_correct",
          `Question ${question.questionNumber} must have exactly one correct option`
        );
      }
    }

    if (question.parts.length > 0) {
      const partTotal = question.parts.reduce((sum, part) => sum + part.marks, 0);
      if (question.marks !== partTotal) {
        pushIssue(
          issues,
          "error",
          "question_parts",
          null,
          "marks",
          `Question ${question.questionNumber} marks (${question.marks}) must equal the sum of its parts (${partTotal})`
        );
      }
    }

    if (question.type === "essay" && question.parts.length === 0 && !question.rubricCode) {
      pushIssue(
        issues,
        "error",
        "questions",
        null,
        "rubric_code",
        `Essay question ${question.questionNumber} requires a rubric_code column value or question_parts rows with rubric_code`
      );
    }

    if (question.type === "structured" && question.parts.length === 0) {
      pushIssue(
        issues,
        "error",
        "questions",
        null,
        "type",
        `Structured question ${question.questionNumber} requires question_parts rows`
      );
    }

    if (question.rubricCode && !rubricCodeSet.has(normalizeKey(question.rubricCode))) {
      pushIssue(issues, "error", "questions", null, "rubric_code", `Unknown rubric_code '${question.rubricCode}'`);
    }

    for (const part of question.parts) {
      if (part.rubricCode && !rubricCodeSet.has(normalizeKey(part.rubricCode))) {
        pushIssue(issues, "error", "question_parts", null, "rubric_code", `Unknown rubric_code '${part.rubricCode}'`);
      }

      if ((question.type === "mcq" || question.type === "true_false") && part.options.length > 0) {
        const correctPartOptions = part.options.filter((option) => option.isCorrect);
        if (correctPartOptions.length !== 1) {
          pushIssue(
            issues,
            "error",
            "options",
            null,
            "is_correct",
            `Question ${question.questionNumber} part ${part.partLabel} must have exactly one correct option`
          );
        }
      }
    }

    if (
      question.type === "essay" &&
      !question.rubricCode &&
      question.parts.some((part) => !part.rubricCode)
    ) {
      pushIssue(
        issues,
        "error",
        "question_parts",
        null,
        "rubric_code",
        `Essay question ${question.questionNumber} requires a rubric_code on the question or on every part`
      );
    }
  }

  const totalQuestionMarks = questionInputs.reduce((sum, question) => sum + question.marks, 0);
  const totalRubricMarks = rubrics.reduce((sum, rubric) => sum + rubric.totalMarks, 0);
  let totalSectionMarks = 0;

  for (const section of sections) {
    const sectionQuestions = questionInputs.filter(
      (question) => normalizeKey(question.sectionCode) === normalizeKey(section.sectionCode)
    );
    const sectionQuestionMarks = sectionQuestions.reduce((sum, question) => sum + question.marks, 0);
    const countedSectionMarks = calculateSectionCountedMarks(section, sectionQuestions);

    if (
      section.questionSelectionMode === "answer_any_n" &&
      (section.requiredCount ?? 0) > sectionQuestions.length
    ) {
      pushIssue(
        issues,
        "error",
        "paper_sections",
        null,
        "required_count",
        `Section ${section.sectionCode} requires ${section.requiredCount} questions but only has ${sectionQuestions.length}`
      );
    }

    if (section.maxMarks !== null) {
      const expectedSectionMarks =
        section.questionSelectionMode === "answer_any_n" ? countedSectionMarks : sectionQuestionMarks;
      const label =
        section.questionSelectionMode === "answer_any_n"
          ? "counted question marks"
          : "question marks";

      if (section.maxMarks !== expectedSectionMarks) {
        pushIssue(
          issues,
          "error",
          "paper_sections",
          null,
          "max_marks",
          `Section ${section.sectionCode} max_marks (${section.maxMarks}) does not match ${label} (${expectedSectionMarks})`
        );
      }
    }

    totalSectionMarks += section.maxMarks ?? countedSectionMarks;
  }

  if (paper?.totalMarks !== null && paper?.totalMarks !== undefined) {
    const expectedPaperMarks = sections.length > 0 ? totalSectionMarks : totalQuestionMarks;
    const label = sections.length > 0 ? "counted section marks" : "total question marks";
    if (paper.totalMarks !== expectedPaperMarks) {
      pushIssue(
        issues,
        "error",
        "exam_papers",
        firstPaperRow?.rowNumber ?? null,
        "total_marks",
        `Paper total_marks (${paper.totalMarks}) does not match ${label} (${expectedPaperMarks})`
      );
    }
  }

  if (sections.length === 0) {
    pushIssue(issues, "warning", "paper_sections", null, null, "No paper sections were provided; the paper will be treated as a single-section paper");
  }

  return {
    paper,
    sections,
    questions: questionInputs,
    rubrics,
    issues,
    summary: {
      questionCount: questionInputs.length,
      partCount: questionInputs.reduce((sum, question) => sum + question.parts.length, 0),
      sectionCount: sections.length,
      rubricCount: rubrics.length,
      objectiveCount: questionInputs.filter((question) => question.type === "mcq" || question.type === "true_false").length,
      essayCount: questionInputs.filter((question) => question.type === "essay").length,
      structuredCount: questionInputs.filter((question) => question.type === "structured").length,
      totalQuestionMarks,
      totalSectionMarks,
      totalRubricMarks,
    },
  };
}
