/**
 * PreMayeso migration runner — uses pg direct connection
 * node infra/migrate.mjs
 *
 * Requires environment variables:
 *   DB_HOST     - PostgreSQL host
 *   DB_PORT     - PostgreSQL port (default: 5432)
 *   DB_NAME     - Database name (default: postgres)
 *   DB_USER     - Database user (default: postgres)
 *   DB_PASSWORD - Database password
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const { Client } = pg;
const __dir = dirname(fileURLToPath(import.meta.url));

const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? "5432", 10),
    database: process.env.DB_NAME ?? "postgres",
    user: process.env.DB_USER ?? "postgres",
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
});

const MIGRATIONS = [
    "supabase/migrations/002_schema_v2.sql",
    "supabase/migrations/003_seed_jce.sql",
  ];

async function main() {
    if (!process.env.DB_HOST || !process.env.DB_PASSWORD) {
          console.error("Error: DB_HOST and DB_PASSWORD environment variables are required.");
          process.exit(1);
    }

  console.log("PreMayeso Migration Runner\n");
    await client.connect();
    console.log("✓ Connected to Supabase\n");

  for (const file of MIGRATIONS) {
        const filePath = resolve(__dir, file);
        const sql = readFileSync(filePath, "utf-8");
        const label = file.split("/").pop();

      process.stdout.write(` Running ${label} ... `);
        try {
                await client.query(sql);
                console.log("✓");
        } catch (err) {
                console.log(`✗\n  Error: ${err.message}\n`);
                await client.end();
                process.exit(1);
        }
  }

  console.log("\n✓ All migrations applied.\n");

  // Verify
  const { rows } = await client.query(
        "SELECT code, name, exam_path FROM subjects ORDER BY order_index"
      );
    console.log(`Subjects in DB (${rows.length}):`);
    rows.forEach((r) =>
          console.log(` ${String(r.code ?? "—").padEnd(12)} ${r.name} [${r.exam_path ?? "—"}]`)
                   );

  const { rows: topicCount } = await client.query(
        "SELECT COUNT(*) FROM topics WHERE exam_path = 'JCE'"
      );
    console.log(`\nJCE topics: ${topicCount[0].count}`);

  await client.end();
}

main().catch(async (err) => {
    console.error("Fatal:", err.message);
    await client.end().catch(() => {});
    process.exit(1);
});
