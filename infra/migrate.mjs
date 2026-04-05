/**
 * PreMayeso migration runner — uses pg direct connection
 * node infra/migrate.mjs
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const { Client } = pg;
const __dir = dirname(fileURLToPath(import.meta.url));

// Direct IPv6 address — DNS not resolving in this environment
const client = new Client({
  host: "2406:da12:b78:de14:b2ca:559d:1cb9:755d",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: "@-btaYyH4YRtPWm",
  ssl: { rejectUnauthorized: false },
});

const MIGRATIONS = [
  "supabase/migrations/002_schema_v2.sql",
  "supabase/migrations/003_seed_jce.sql",
];

async function main() {
  console.log("PreMayeso Migration Runner\n");
  await client.connect();
  console.log("✓ Connected to Supabase\n");

  for (const file of MIGRATIONS) {
    const filePath = resolve(__dir, file);
    const sql = readFileSync(filePath, "utf-8");
    const label = file.split("/").pop();

    process.stdout.write(`  Running ${label} ... `);
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
    console.log(`  ${String(r.code ?? "—").padEnd(12)} ${r.name}  [${r.exam_path ?? "—"}]`)
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
