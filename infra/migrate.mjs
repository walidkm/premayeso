/**
 * PreMayeso migration runner
 * Executes SQL migration files against the remote Supabase project
 * using the Management API SQL endpoint.
 *
 * Usage:  node infra/migrate.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = "https://fajlmrlcqfwklubencgy.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhamxtcmxjcWZ3a2x1YmVuY2d5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQwMTQxNiwiZXhwIjoyMDkwOTc3NDE2fQ.MYRYVFmN_kOqsNfIYfuGR-feCcyCo-0ulZzjf2UeWpE";
const PROJECT_REF = "fajlmrlcqfwklubencgy";

const MIGRATIONS = [
  "supabase/migrations/002_schema_v2.sql",
  "supabase/migrations/003_seed_jce.sql",
];

async function runSql(sql, label) {
  // Try Supabase Management API (requires Supabase access token, not service role)
  // Fallback: try the project's /rest endpoint with pg_execute workaround
  const managementUrl = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

  const res = await fetch(managementUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await res.text();

  if (res.ok) {
    return { ok: true, body: text };
  }

  // If Management API rejected (needs personal access token), fall back
  return { ok: false, status: res.status, body: text };
}

async function main() {
  console.log("PreMayeso Migration Runner\n");

  for (const file of MIGRATIONS) {
    const filePath = resolve(__dir, file);
    const sql = readFileSync(filePath, "utf-8");
    const label = file.split("/").pop();

    process.stdout.write(`  Running ${label} ... `);
    const result = await runSql(sql, label);

    if (result.ok) {
      console.log("✓");
    } else {
      console.log(`✗  (${result.status})`);
      console.log(`     Response: ${result.body.slice(0, 300)}`);
      console.log(
        "\n  The Management API requires a Supabase personal access token, not the service role key."
      );
      console.log("  Please apply the migrations manually via the SQL editor:");
      console.log(
        `  → https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new\n`
      );
      process.exit(1);
    }
  }

  console.log("\n✓ All migrations applied successfully.\n");
  console.log("Verifying seed data...");

  const verifyRes = await fetch(`${SUPABASE_URL}/rest/v1/subjects?select=code,name,exam_path&order=order_index`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });

  if (verifyRes.ok) {
    const subjects = await verifyRes.json();
    console.log(`✓ ${subjects.length} subjects in database:`);
    subjects.forEach((s) => console.log(`  ${s.code.padEnd(12)} ${s.name}`));
  } else {
    console.log("Could not verify (RLS may be blocking anon reads on new rows)");
  }
}

main().catch(console.error);
