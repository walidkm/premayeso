import type { MultipartFile } from "@fastify/multipart";
import { FastifyInstance, FastifyRequest } from "fastify";
import * as XLSX from "xlsx";
import { requireAdmin } from "../lib/adminAuth.js";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";

const TYPE_MAP: Record<string, string> = {
  mcq: "mcq",
  "true/false": "true_false",
  true_false: "true_false",
  "short answer": "short_answer",
  short_answer: "short_answer",
  essay: "essay",
};

const DIFFICULTY_MAP: Record<string, string> = {
  easy: "easy",
  medium: "medium",
  hard: "hard",
};

const SOURCE_MAP: Record<string, string> = {
  "maneb past paper": "maneb",
  maneb: "maneb",
  "teacher created": "teacher",
  teacher: "teacher",
  school: "school",
  "school exam": "school",
};

const PAPER_TYPE_MAP: Record<string, string> = {
  "maneb past paper": "maneb_past_paper",
  "school exam": "school_exam",
  "question pool": "question_pool",
};

const EXAM_MODE_MAP: Record<string, string> = {
  "paper layout": "paper_layout",
  paper_layout: "paper_layout",
  randomized: "randomized",
  both: "both",
};

type CellValue = string | number | boolean | null | undefined;

type SubjectRow = {
  id: string;
  code: string | null;
};

type TopicRow = {
  id: string;
  subject_id: string;
  code: string | null;
  exam_path: string | null;
};

type MultipartRequest = FastifyRequest & {
  file: () => Promise<MultipartFile | undefined>;
};

interface RawRow {
  type: string;
  questionNo: string;
  section: string;
  stem: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  marks: number;
  difficulty: string;
  allowShuffle: boolean;
  examPath: string;
  subjectCode: string;
  topicCode: string;
  source: string;
  paperType: string;
  examMode: string;
  year: number | null;
  paperNumber: number | null;
  poolTag: string;
  language: string;
  rowIndex: number;
}

function norm(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function parseSheet(worksheet: XLSX.WorkSheet): RawRow[] {
  const raw = XLSX.utils.sheet_to_json<CellValue[]>(worksheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  if (raw.length < 3) {
    return [];
  }

  let headerIndex = -1;
  for (let index = 0; index < Math.min(raw.length, 5); index += 1) {
    const row = raw[index] ?? [];
    if (row.some((cell) => String(cell).includes("Question Type"))) {
      headerIndex = index;
      break;
    }
  }

  if (headerIndex === -1) {
    return [];
  }

  const headers = (raw[headerIndex] ?? []).map((header) =>
    String(header).replace(/\s*\*$/, "").trim()
  );

  const col = (name: string) =>
    headers.findIndex((header) => header.toLowerCase().includes(name.toLowerCase()));

  const columns = {
    type: col("Question Type"),
    questionNo: col("Question No"),
    section: col("Section"),
    stem: col("Question Text"),
    optA: col("Option A"),
    optB: col("Option B"),
    optC: col("Option C"),
    optD: col("Option D"),
    correct: col("Correct Answer"),
    explanation: col("Explanation"),
    marks: col("Marks"),
    difficulty: col("Difficulty"),
    shuffle: col("Allow Shuffle"),
    examPath: col("Exam Level"),
    subjectCode: col("Subject Code"),
    topicCode: col("Topic Code"),
    source: col("Source"),
    paperType: col("Paper Type"),
    examMode: col("Exam Mode"),
    year: col("Year"),
    paperNo: col("Paper No"),
    poolTag: col("Pool Tag"),
    language: col("Language"),
  };

  const rows: RawRow[] = [];
  const dataStart = headerIndex + 2;

  for (let index = dataStart; index < raw.length; index += 1) {
    const row = raw[index] ?? [];
    const stem = String(row[columns.stem] ?? "").trim();
    if (!stem) {
      continue;
    }

    const marksRaw = row[columns.marks];
    const yearRaw = row[columns.year];
    const paperNumberRaw = row[columns.paperNo];

    rows.push({
      type: norm(row[columns.type]),
      questionNo: String(row[columns.questionNo] ?? "").trim(),
      section: String(row[columns.section] ?? "").trim(),
      stem,
      optionA: String(row[columns.optA] ?? "").trim(),
      optionB: String(row[columns.optB] ?? "").trim(),
      optionC: String(row[columns.optC] ?? "").trim(),
      optionD: String(row[columns.optD] ?? "").trim(),
      correctAnswer: String(row[columns.correct] ?? "").trim(),
      explanation: String(row[columns.explanation] ?? "").trim(),
      marks: marksRaw ? Number(marksRaw) || 1 : 1,
      difficulty: norm(row[columns.difficulty]),
      allowShuffle: norm(row[columns.shuffle]) === "yes",
      examPath: String(row[columns.examPath] ?? "").trim().toUpperCase(),
      subjectCode: String(row[columns.subjectCode] ?? "").trim().toUpperCase(),
      topicCode: String(row[columns.topicCode] ?? "").trim().toUpperCase(),
      source: norm(row[columns.source]),
      paperType: norm(row[columns.paperType]),
      examMode: norm(row[columns.examMode]),
      year: yearRaw ? Number(yearRaw) || null : null,
      paperNumber: paperNumberRaw ? Number(paperNumberRaw) || null : null,
      poolTag: String(row[columns.poolTag] ?? "").trim(),
      language: String(row[columns.language] ?? "English").trim() || "English",
      rowIndex: index + 1,
    });
  }

  return rows;
}

function buildOptions(row: RawRow): { key: string; text: string }[] {
  if (row.type === "mcq") {
    const options: { key: string; text: string }[] = [];
    if (row.optionA) options.push({ key: "A", text: row.optionA });
    if (row.optionB) options.push({ key: "B", text: row.optionB });
    if (row.optionC) options.push({ key: "C", text: row.optionC });
    if (row.optionD) options.push({ key: "D", text: row.optionD });
    return options;
  }

  if (row.type === "true_false") {
    return [
      { key: "A", text: "True" },
      { key: "B", text: "False" },
    ];
  }

  return [];
}

export async function adminRoutes(app: FastifyInstance) {
  app.get("/admin/health", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) {
      return;
    }

    return { ok: true, userId: admin.userId };
  });

  app.post("/admin/questions/upload", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) {
      return;
    }

    const data = await (request as MultipartRequest).file();
    if (!data) {
      return reply.status(400).send({ error: "No file uploaded" });
    }

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: "buffer" });
    } catch {
      return reply.status(400).send({ error: "Could not parse XLSX file" });
    }

    const questionsSheet = workbook.Sheets.Questions;
    if (!questionsSheet) {
      return reply.status(400).send({
        error: "Workbook must contain a sheet named 'Questions'",
      });
    }

    const rows = parseSheet(questionsSheet);
    if (rows.length === 0) {
      return reply.status(400).send({ error: "No data rows found in Questions sheet" });
    }

    const { data: subjectData } = await supabaseAdmin.from("subjects").select("id, code");
    const { data: topicData } = await supabaseAdmin.from("topics").select("id, subject_id, code, exam_path");

    const subjects = (subjectData ?? []) as SubjectRow[];
    const topics = (topicData ?? []) as TopicRow[];

    const subjectByCode = new Map(
      subjects.flatMap((subject) => (subject.code ? [[subject.code, subject.id] as const] : []))
    );
    const topicByCode = new Map(
      topics.flatMap((topic) => (topic.code ? [[topic.code, topic] as const] : []))
    );

    const paperCache = new Map<string, string>();
    const imported: number[] = [];
    const errors: { row: number; reason: string }[] = [];

    for (const row of rows) {
      const mappedType = TYPE_MAP[row.type];
      if (!mappedType) {
        errors.push({ row: row.rowIndex, reason: `Unknown question type: "${row.type}"` });
        continue;
      }

      const mappedDifficulty = DIFFICULTY_MAP[row.difficulty] ?? "medium";
      const mappedSource = SOURCE_MAP[row.source] ?? "maneb";
      const mappedPaperType = PAPER_TYPE_MAP[row.paperType] ?? "question_pool";
      const mappedExamMode = EXAM_MODE_MAP[row.examMode] ?? "paper_layout";

      if (!row.stem) {
        errors.push({ row: row.rowIndex, reason: "Question Text is required" });
        continue;
      }

      if (!row.correctAnswer) {
        errors.push({ row: row.rowIndex, reason: "Correct Answer is required" });
        continue;
      }

      if (!row.subjectCode) {
        errors.push({ row: row.rowIndex, reason: "Subject Code is required" });
        continue;
      }

      if (!row.topicCode) {
        errors.push({ row: row.rowIndex, reason: "Topic Code is required" });
        continue;
      }

      const subjectId = subjectByCode.get(row.subjectCode);
      if (!subjectId) {
        errors.push({ row: row.rowIndex, reason: `Unknown Subject Code: ${row.subjectCode}` });
        continue;
      }

      const topic = topicByCode.get(row.topicCode);
      if (!topic) {
        errors.push({ row: row.rowIndex, reason: `Unknown Topic Code: ${row.topicCode}` });
        continue;
      }

      if (topic.subject_id !== subjectId) {
        errors.push({
          row: row.rowIndex,
          reason: `Topic Code ${row.topicCode} does not belong to subject ${row.subjectCode}`,
        });
        continue;
      }

      if (topic.exam_path && row.examPath && topic.exam_path !== row.examPath) {
        errors.push({
          row: row.rowIndex,
          reason: `Topic Code ${row.topicCode} is for ${topic.exam_path}, not ${row.examPath}`,
        });
        continue;
      }

      let examPaperId: string | null = null;

      if (mappedPaperType !== "question_pool") {
        const paperKey = [
          mappedSource,
          mappedPaperType,
          mappedExamMode,
          row.examPath || "null",
          subjectId,
          row.year ?? "null",
          row.paperNumber ?? "null",
        ].join("|");

        if (paperCache.has(paperKey)) {
          examPaperId = paperCache.get(paperKey) ?? null;
        } else {
          let query = supabaseAdmin
            .from("exam_papers")
            .select("id")
            .eq("source_type", mappedSource)
            .eq("paper_type", mappedPaperType)
            .eq("exam_mode", mappedExamMode)
            .eq("subject_id", subjectId);

          query = row.examPath ? query.eq("exam_path", row.examPath) : query.is("exam_path", null);
          query = row.year ? query.eq("year", row.year) : query.is("year", null);
          query = row.paperNumber
            ? query.eq("paper_number", row.paperNumber)
            : query.is("paper_number", null);

          const { data: existingPaper } = await query.limit(1).maybeSingle();

          if (existingPaper) {
            examPaperId = existingPaper.id;
          } else {
            const { data: newPaper, error: paperError } = await supabaseAdmin
              .from("exam_papers")
              .insert({
                exam_path: row.examPath || null,
                subject_id: subjectId,
                source_type: mappedSource,
                paper_type: mappedPaperType,
                exam_mode: mappedExamMode,
                year: row.year,
                paper_number: row.paperNumber,
                title: row.year
                  ? `${row.subjectCode} ${row.year}${row.paperNumber ? ` Paper ${row.paperNumber}` : ""}`
                  : null,
              })
              .select("id")
              .single();

            if (paperError || !newPaper) {
              errors.push({
                row: row.rowIndex,
                reason: `Could not create exam_paper: ${paperError?.message}`,
              });
              continue;
            }

            examPaperId = newPaper.id;
          }

          if (examPaperId) {
            paperCache.set(paperKey, examPaperId);
          }
        }
      }

      let correctOption = row.correctAnswer.trim();
      if (mappedType === "true_false") {
        correctOption = correctOption.toLowerCase() === "true" ? "A" : "B";
      }

      const options = buildOptions(row);
      const { data: newQuestion, error: questionError } = await supabaseAdmin
        .from("questions")
        .insert({
          topic_id: topic.id,
          stem: row.stem,
          options,
          correct_option: correctOption,
          explanation: row.explanation || null,
          type: mappedType,
          difficulty: mappedDifficulty,
          marks: row.marks,
          allow_shuffle: row.allowShuffle,
          tier_gate: "free",
          is_approved: true,
          language: row.language,
          pool_tag: row.poolTag || null,
          question_no: row.questionNo || null,
          exam_path: row.examPath || null,
        })
        .select("id")
        .single();

      if (questionError || !newQuestion) {
        errors.push({
          row: row.rowIndex,
          reason: `DB insert failed: ${questionError?.message}`,
        });
        continue;
      }

      if (examPaperId) {
        const { error: paperQuestionError } = await supabaseAdmin.from("paper_questions").insert({
          exam_paper_id: examPaperId,
          question_id: newQuestion.id,
          section: row.section || null,
          order_index: imported.length,
        });

        if (paperQuestionError) {
          errors.push({
            row: row.rowIndex,
            reason: `Question saved but paper link failed: ${paperQuestionError.message}`,
          });
        }
      }

      imported.push(row.rowIndex);
    }

    return reply.status(200).send({
      imported: imported.length,
      errors: errors.length,
      total: rows.length,
      errorDetails: errors,
    });
  });
}
