import { FastifyInstance } from "fastify";
import * as XLSX from "xlsx";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";

// ── Auth guard ────────────────────────────────────────────────
// Simple shared-secret header. Replace with JWT admin check in Sprint 3.
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "premayeso-admin-dev";

function assertAdmin(request: any, reply: any): boolean {
  const secret = request.headers["x-admin-secret"];
  if (secret !== ADMIN_SECRET) {
    reply.status(401).send({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// ── Value normalisation maps ──────────────────────────────────
const TYPE_MAP: Record<string, string> = {
  mcq: "mcq",
  "true/false": "true_false",
  "true_false": "true_false",
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

function norm(v: any): string {
  return String(v ?? "").trim().toLowerCase();
}

// ── Parse the Questions sheet ─────────────────────────────────
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

function parseSheet(ws: XLSX.WorkSheet): RawRow[] {
  // Row 1 (index 0): section group headers — skip
  // Row 2 (index 1): column headers — use these
  // Row 3 (index 2): example hints — skip
  // Row 4+ (index 3+): data rows

  const raw = XLSX.utils.sheet_to_json<any[]>(ws, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  if (raw.length < 3) return [];

  // Find the header row — it contains "Question Type *"
  let headerIdx = -1;
  for (let i = 0; i < Math.min(raw.length, 5); i++) {
    const row = raw[i] as any[];
    if (row.some((cell) => String(cell).includes("Question Type"))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return [];

  const headers: string[] = (raw[headerIdx] as any[]).map((h) =>
    String(h).replace(/\s*\*$/, "").trim()
  );

  const col = (name: string) => {
    const idx = headers.findIndex((h) =>
      h.toLowerCase().includes(name.toLowerCase())
    );
    return idx;
  };

  const C = {
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
  const dataStart = headerIdx + 2; // skip the example/hints row after headers

  for (let i = dataStart; i < raw.length; i++) {
    const r = raw[i] as any[];
    const stem = String(r[C.stem] ?? "").trim();
    if (!stem) continue; // skip blank rows

    const marksRaw = r[C.marks];
    const yearRaw = r[C.year];
    const paperNoRaw = r[C.paperNo];

    rows.push({
      type: norm(r[C.type]),
      questionNo: String(r[C.questionNo] ?? "").trim(),
      section: String(r[C.section] ?? "").trim(),
      stem,
      optionA: String(r[C.optA] ?? "").trim(),
      optionB: String(r[C.optB] ?? "").trim(),
      optionC: String(r[C.optC] ?? "").trim(),
      optionD: String(r[C.optD] ?? "").trim(),
      correctAnswer: String(r[C.correct] ?? "").trim(),
      explanation: String(r[C.explanation] ?? "").trim(),
      marks: marksRaw ? Number(marksRaw) || 1 : 1,
      difficulty: norm(r[C.difficulty]),
      allowShuffle: norm(r[C.shuffle]) === "yes",
      examPath: String(r[C.examPath] ?? "").trim().toUpperCase(),
      subjectCode: String(r[C.subjectCode] ?? "").trim().toUpperCase(),
      topicCode: String(r[C.topicCode] ?? "").trim().toUpperCase(),
      source: norm(r[C.source]),
      paperType: norm(r[C.paperType]),
      examMode: norm(r[C.examMode]),
      year: yearRaw ? Number(yearRaw) || null : null,
      paperNumber: paperNoRaw ? Number(paperNoRaw) || null : null,
      poolTag: String(r[C.poolTag] ?? "").trim(),
      language: String(r[C.language] ?? "English").trim() || "English",
      rowIndex: i + 1, // 1-based for error messages
    });
  }

  return rows;
}

// ── Build options JSONB for MCQ / True-False ──────────────────
function buildOptions(row: RawRow): { key: string; text: string }[] | null {
  const t = row.type;
  if (t === "mcq") {
    const opts: { key: string; text: string }[] = [];
    if (row.optionA) opts.push({ key: "A", text: row.optionA });
    if (row.optionB) opts.push({ key: "B", text: row.optionB });
    if (row.optionC) opts.push({ key: "C", text: row.optionC });
    if (row.optionD) opts.push({ key: "D", text: row.optionD });
    return opts;
  }
  if (t === "true_false") {
    return [
      { key: "A", text: "True" },
      { key: "B", text: "False" },
    ];
  }
  return [];
}

// ── Route ─────────────────────────────────────────────────────
export async function adminRoutes(app: FastifyInstance) {
  // GET /admin/health
  app.get("/admin/health", async (request, reply) => {
    if (!assertAdmin(request, reply)) return;
    return { ok: true };
  });

  // POST /admin/questions/upload
  app.post("/admin/questions/upload", async (request, reply) => {
    if (!assertAdmin(request, reply)) return;

    // Receive multipart file
    const data = await (request as any).file();
    if (!data) {
      return reply.status(400).send({ error: "No file uploaded" });
    }

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Parse workbook
    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(buffer, { type: "buffer" });
    } catch {
      return reply.status(400).send({ error: "Could not parse XLSX file" });
    }

    const questionsSheet = wb.Sheets["Questions"];
    if (!questionsSheet) {
      return reply.status(400).send({
        error: "Workbook must contain a sheet named 'Questions'",
      });
    }

    const rows = parseSheet(questionsSheet);
    if (rows.length === 0) {
      return reply.status(400).send({ error: "No data rows found in Questions sheet" });
    }

    // ── Pre-load lookup tables ────────────────────────────────
    const { data: subjects } = await supabaseAdmin
      .from("subjects")
      .select("id, code");
    const { data: topics } = await supabaseAdmin
      .from("topics")
      .select("id, subject_id");

    const subjectByCode = new Map(
      (subjects ?? []).map((s: any) => [s.code as string, s.id as string])
    );

    // exam_papers cache: key = "source|paperType|examMode|examPath|subjectId|year|paperNo"
    const paperCache = new Map<string, string>();

    const imported: number[] = [];
    const errors: { row: number; reason: string }[] = [];

    // ── Process each row ──────────────────────────────────────
    for (const row of rows) {
      // Validate required fields
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

      const subjectId = subjectByCode.get(row.subjectCode);
      if (!subjectId) {
        errors.push({ row: row.rowIndex, reason: `Unknown Subject Code: ${row.subjectCode}` });
        continue;
      }

      // Resolve topic — find topic in this subject whose name or id matches the topic code
      // Topics in our DB don't have a code column yet; we match on the first topic under
      // this subject if no direct match, and log it. This will be improved when
      // subtopic codes are fully mapped.
      // For now we match on exact topic_id if row.topicCode is a UUID, otherwise
      // we use the first topic under the subject as a fallback and log a warning.
      let topicId: string | null = null;
      const subjectTopics = (topics ?? []).filter(
        (t: any) => t.subject_id === subjectId
      );

      if (/^[0-9a-f-]{36}$/i.test(row.topicCode)) {
        // raw UUID provided
        topicId = row.topicCode;
      } else if (subjectTopics.length > 0) {
        // Best-effort: use first topic for this subject until topic codes are added
        topicId = subjectTopics[0].id;
      }

      if (!topicId) {
        errors.push({ row: row.rowIndex, reason: `No topics found for subject ${row.subjectCode}` });
        continue;
      }

      // ── Resolve / create exam_paper ───────────────────────
      let examPaperId: string | null = null;

      if (mappedPaperType !== "question_pool") {
        const paperKey = [
          mappedSource,
          mappedPaperType,
          mappedExamMode,
          row.examPath,
          subjectId,
          row.year ?? "null",
          row.paperNumber ?? "null",
        ].join("|");

        if (paperCache.has(paperKey)) {
          examPaperId = paperCache.get(paperKey)!;
        } else {
          // Check if it already exists
          let query = supabaseAdmin
            .from("exam_papers")
            .select("id")
            .eq("source_type", mappedSource)
            .eq("paper_type", mappedPaperType)
            .eq("subject_id", subjectId);

          if (row.year) query = query.eq("year", row.year);
          if (row.paperNumber) query = query.eq("paper_number", row.paperNumber);

          const { data: existing } = await query.limit(1).maybeSingle();

          if (existing) {
            examPaperId = existing.id;
          } else {
            const { data: newPaper, error: paperErr } = await supabaseAdmin
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

            if (paperErr || !newPaper) {
              errors.push({
                row: row.rowIndex,
                reason: `Could not create exam_paper: ${paperErr?.message}`,
              });
              continue;
            }
            examPaperId = newPaper.id;
          }
          paperCache.set(paperKey, examPaperId!);
        }
      }

      // ── Build correct_option value ────────────────────────
      // For True/False questions normalise "True"→"A", "False"→"B"
      let correctOption = row.correctAnswer.trim();
      if (mappedType === "true_false") {
        correctOption =
          correctOption.toLowerCase() === "true" ? "A" : "B";
      }

      // ── Insert question ───────────────────────────────────
      const options = buildOptions(row);
      const { data: newQ, error: qErr } = await supabaseAdmin
        .from("questions")
        .insert({
          topic_id: topicId,
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

      if (qErr || !newQ) {
        errors.push({
          row: row.rowIndex,
          reason: `DB insert failed: ${qErr?.message}`,
        });
        continue;
      }

      // ── Link to exam_paper if applicable ──────────────────
      if (examPaperId) {
        const { error: pqErr } = await supabaseAdmin
          .from("paper_questions")
          .insert({
            exam_paper_id: examPaperId,
            question_id: newQ.id,
            section: row.section || null,
            order_index: imported.length,
          });

        if (pqErr) {
          // Non-fatal — question was saved, just not linked to paper
          errors.push({
            row: row.rowIndex,
            reason: `Question saved but paper link failed: ${pqErr.message}`,
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
