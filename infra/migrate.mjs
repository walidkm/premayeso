/**
 * PreMayeso migration runner.
 *
 * Supported connection inputs, in priority order:
 * 1. DATABASE_URL
 * 2. SUPABASE_DB_URL
 * 3. Legacy DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD
 *
 * Usage:
 *   node infra/migrate.mjs
 */
import { readdirSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const { Client } = pg;
const __dir = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(__dir, "supabase/migrations");
const MIGRATIONS = readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => ({
    label: file,
    path: resolve(MIGRATIONS_DIR, file),
  }));

const REQUIRED_TABLES = [
  "paper_sections",
  "question_parts",
  "essay_rubrics",
  "essay_rubric_criteria",
  "paper_attempts",
  "attempt_answers",
  "answer_marks",
  "essay_marking_reviews",
];

const REQUIRED_INDEXES = [
  "paper_sections_paper_id_idx",
  "question_parts_question_id_idx",
  "essay_rubrics_rubric_code_idx",
  "essay_rubric_criteria_rubric_id_idx",
  "paper_attempts_paper_id_idx",
  "attempt_answers_attempt_id_idx",
  "answer_marks_attempt_id_idx",
  "essay_marking_reviews_attempt_id_idx",
  "paper_questions_paper_question_number_idx",
];

function resolveConnectionConfig() {
  const connectionString =
    process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL ?? null;

  if (connectionString) {
    const parsed = new URL(connectionString);
    return {
      clientConfig: {
        connectionString,
        ssl: { rejectUnauthorized: false },
      },
      preflight: {
        source:
          process.env.DATABASE_URL !== undefined ? "DATABASE_URL" : "SUPABASE_DB_URL",
        host: parsed.hostname,
        port: parsed.port || "5432",
        database: decodeURIComponent(parsed.pathname.replace(/^\//, "") || "postgres"),
        user: decodeURIComponent(parsed.username || "postgres"),
      },
    };
  }

  if (!process.env.DB_HOST || !process.env.DB_PASSWORD) {
    throw new Error(
      "Provide DATABASE_URL, SUPABASE_DB_URL, or legacy DB_HOST and DB_PASSWORD credentials."
    );
  }

  return {
    clientConfig: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT ?? "5432", 10),
      database: process.env.DB_NAME ?? "postgres",
      user: process.env.DB_USER ?? "postgres",
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
    },
    preflight: {
      source: "DB_*",
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ?? "5432",
      database: process.env.DB_NAME ?? "postgres",
      user: process.env.DB_USER ?? "postgres",
    },
  };
}

async function verifyStructuredPaperObjects(client) {
  const { rows: tableRows } = await client.query(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name = any($1::text[])
    `,
    [REQUIRED_TABLES]
  );

  const foundTables = new Set(tableRows.map((row) => row.table_name));
  const missingTables = REQUIRED_TABLES.filter((tableName) => !foundTables.has(tableName));
  if (missingTables.length > 0) {
    throw new Error(`Missing required tables: ${missingTables.join(", ")}`);
  }

  const { rows: indexRows } = await client.query(
    `
      select indexname
      from pg_indexes
      where schemaname = 'public'
        and indexname = any($1::text[])
    `,
    [REQUIRED_INDEXES]
  );

  const foundIndexes = new Set(indexRows.map((row) => row.indexname));
  const missingIndexes = REQUIRED_INDEXES.filter((indexName) => !foundIndexes.has(indexName));
  if (missingIndexes.length > 0) {
    throw new Error(`Missing required indexes: ${missingIndexes.join(", ")}`);
  }

  const { rowCount: functionCount } = await client.query(
    `
      select 1
      from pg_proc proc
      join pg_namespace ns on ns.oid = proc.pronamespace
      where ns.nspname = 'public'
        and proc.proname = 'admin_publish_paper_workbook'
    `
  );

  if (functionCount === 0) {
    throw new Error("Missing required RPC function public.admin_publish_paper_workbook(jsonb)");
  }
}

async function main() {
  const { clientConfig, preflight } = resolveConnectionConfig();
  const client = new Client(clientConfig);

  console.log("PreMayeso Migration Runner\n");
  console.log(
    `Target: ${preflight.host}:${preflight.port}/${preflight.database} as ${preflight.user} (${preflight.source})\n`
  );

  await client.connect();
  console.log("Connected.\n");

  try {
    for (const migration of MIGRATIONS) {
      const sql = readFileSync(migration.path, "utf-8");
      process.stdout.write(`Applying ${migration.label} ... `);
      await client.query(sql);
      console.log("ok");
    }

    console.log("\nVerifying structured-paper objects ... ");
    await verifyStructuredPaperObjects(client);
    console.log("Verification passed.\n");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`Fatal: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
