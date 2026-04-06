import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSessionState } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { QuestionUploader } from "@/components/QuestionUploader";
import { SignOutButton } from "@/components/SignOutButton";

export const revalidate = 0;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// ── Helpers ───────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4">
      <p className={`text-3xl font-bold tabular-nums ${accent ?? "text-zinc-900"}`}>
        {value}
      </p>
      <p className="mt-0.5 text-sm font-medium text-zinc-600">{label}</p>
      {sub && <p className="mt-1 text-xs text-zinc-400">{sub}</p>}
    </div>
  );
}

function StatusPill({
  label,
  status,
}: {
  label: string;
  status: "ok" | "warn" | "off" | "soon";
}) {
  const colours = {
    ok:   "bg-green-50 text-green-700 border-green-200",
    warn: "bg-amber-50 text-amber-700 border-amber-200",
    off:  "bg-red-50 text-red-700 border-red-200",
    soon: "bg-zinc-100 text-zinc-500 border-zinc-200",
  };
  const dots = {
    ok:   "bg-green-500",
    warn: "bg-amber-400",
    off:  "bg-red-400",
    soon: "bg-zinc-400",
  };
  const texts = { ok: "Live", warn: "Warning", off: "Disabled", soon: "Soon" };

  return (
    <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${colours[status]}`}>
      <span className={`size-1.5 rounded-full ${dots[status]}`} />
      {label}
      <span className="opacity-60">·</span>
      <span className="opacity-70">{texts[status]}</span>
    </div>
  );
}

function BreakdownRow({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-sm text-zinc-600">{label}</span>
      <div className="flex-1 rounded-full bg-zinc-100 h-1.5">
        <div
          className="h-1.5 rounded-full bg-zinc-800 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-sm font-medium tabular-nums text-zinc-700">{count}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default async function DashboardPage() {
  const adminSession = await getAdminSessionState();
  if (!adminSession.user) redirect("/login");
  if (!adminSession.isAdmin) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm font-medium text-amber-900">Admin access required</p>
          <p className="mt-2 text-sm text-amber-800">
            Signed in as {adminSession.user.email}, but this account does not have admin access.
          </p>
        </div>
        <SignOutButton />
      </main>
    );
  }

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? "";

  // ── Fetch everything in parallel ─────────────────────────────

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: subjects },
    { count: totalQuestions },
    { count: mcqCount },
    { count: tfCount },
    { count: saCount },
    { count: essayCount },
    { count: easyCount },
    { count: mediumCount },
    { count: hardCount },
    { count: jceCount },
    { count: msceCount },
    { count: pslceCount },
    { count: topicCount },
    { count: userCount },
    { count: premiumCount },
    { count: newUserCount },
    { count: attemptCount },
    { count: paperCount },
  ] = await Promise.all([
    // Subjects
    supabase.from("subjects").select("id, name, code, exam_path, order_index").order("order_index"),
    // Questions by type
    supabase.from("questions").select("id", { count: "exact", head: true }).eq("is_approved", true),
    supabase.from("questions").select("id", { count: "exact", head: true }).eq("is_approved", true).eq("type", "mcq"),
    supabase.from("questions").select("id", { count: "exact", head: true }).eq("is_approved", true).eq("type", "true_false"),
    supabase.from("questions").select("id", { count: "exact", head: true }).eq("is_approved", true).eq("type", "short_answer"),
    supabase.from("questions").select("id", { count: "exact", head: true }).eq("is_approved", true).eq("type", "essay"),
    // Questions by difficulty
    supabase.from("questions").select("id", { count: "exact", head: true }).eq("is_approved", true).eq("difficulty", "easy"),
    supabase.from("questions").select("id", { count: "exact", head: true }).eq("is_approved", true).eq("difficulty", "medium"),
    supabase.from("questions").select("id", { count: "exact", head: true }).eq("is_approved", true).eq("difficulty", "hard"),
    // Questions by exam path
    supabase.from("questions").select("id", { count: "exact", head: true }).eq("is_approved", true).eq("exam_path", "JCE"),
    supabase.from("questions").select("id", { count: "exact", head: true }).eq("is_approved", true).eq("exam_path", "MSCE"),
    supabase.from("questions").select("id", { count: "exact", head: true }).eq("is_approved", true).eq("exam_path", "PSLCE"),
    // Topics
    supabase.from("topics").select("id", { count: "exact", head: true }),
    // Users
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("subscription_status", "premium"),
    supabase.from("users").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    // Quiz attempts
    supabase.from("quiz_attempts").select("id", { count: "exact", head: true }),
    // Exam papers
    supabase.from("exam_papers").select("id", { count: "exact", head: true }),
  ]);

  // ── Settings (from API) ───────────────────────────────────────

  type SettingRow = { key: string; value: string; is_secret: boolean };
  let settings: SettingRow[] = [];
  let apiAlive = false;

  try {
    const [healthRes, settingsRes] = await Promise.all([
      fetch(`${API_URL}/health`, { cache: "no-store" }).catch(() => null),
      token
        ? fetch(`${API_URL}/admin/settings`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }).catch(() => null)
        : Promise.resolve(null),
    ]);
    apiAlive = healthRes?.ok ?? false;
    if (settingsRes?.ok) settings = await settingsRes.json();
  } catch {
    // API unreachable — show warning
  }

  const settingVal = (key: string) => settings.find((s) => s.key === key)?.value ?? "";
  const atEnabled = settingVal("at_enabled") === "true";
  const atKeySet  = !!settingVal("at_api_key") && settingVal("at_api_key") !== "••••••••" || settings.find(s => s.key === "at_api_key")?.value === "••••••••";
  const flEnabled = settingVal("fl_enabled") === "true";
  const otp_ttl   = settingVal("otp_ttl_mins") || "5";
  const otpDevLog = settingVal("otp_dev_log") !== "false";

  const smsStatus = atEnabled && atKeySet ? "ok" : atKeySet ? "warn" : "off";

  const q = totalQuestions ?? 0;

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* ── Nav ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <span className="text-sm font-bold tracking-tight text-zinc-900">PreMayeso Admin</span>
            <nav className="flex items-center gap-1">
              <Link href="/" className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-900 bg-zinc-100">
                Dashboard
              </Link>
              <Link href="/settings" className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition">
                Integrations
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400">{adminSession.user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 flex flex-col gap-8">

        {/* ── Status bar ────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          <StatusPill label="API" status={apiAlive ? "ok" : "warn"} />
          <StatusPill label="Database" status="ok" />
          <StatusPill label="SMS" status={smsStatus} />
          <StatusPill label="Payments" status={flEnabled ? "ok" : "soon"} />
          <StatusPill
            label={`OTP log ${otpDevLog ? "on" : "off"}`}
            status={otpDevLog ? "warn" : "ok"}
          />
        </div>

        {/* ── Key metrics ───────────────────────────────────────── */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">Overview</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Registered users"    value={userCount ?? 0}    sub={`${premiumCount ?? 0} premium · ${newUserCount ?? 0} this week`} />
            <StatCard label="Questions (approved)" value={q}                sub={`${paperCount ?? 0} exam papers`} />
            <StatCard label="Topics"              value={topicCount ?? 0}   sub={`${subjects?.length ?? 0} subjects`} />
            <StatCard label="Quiz attempts"       value={attemptCount ?? 0} />
          </div>
        </section>

        {/* ── Content breakdown + Integrations ─────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Content breakdown */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 flex flex-col gap-6">
            <h2 className="text-base font-semibold text-zinc-900">Content breakdown</h2>

            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">By exam path</p>
              <BreakdownRow label="JCE"    count={jceCount   ?? 0} total={q} />
              <BreakdownRow label="MSCE"   count={msceCount  ?? 0} total={q} />
              <BreakdownRow label="PSLCE"  count={pslceCount ?? 0} total={q} />
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">By question type</p>
              <BreakdownRow label="MCQ"          count={mcqCount   ?? 0} total={q} />
              <BreakdownRow label="True / False" count={tfCount    ?? 0} total={q} />
              <BreakdownRow label="Short answer" count={saCount    ?? 0} total={q} />
              <BreakdownRow label="Essay"        count={essayCount ?? 0} total={q} />
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">By difficulty</p>
              <BreakdownRow label="Easy"   count={easyCount   ?? 0} total={q} />
              <BreakdownRow label="Medium" count={mediumCount ?? 0} total={q} />
              <BreakdownRow label="Hard"   count={hardCount   ?? 0} total={q} />
            </div>
          </section>

          {/* Integrations + quick actions */}
          <div className="flex flex-col gap-4">

            {/* Integration status */}
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-zinc-900">Integrations</h2>
                <Link href="/settings" className="text-xs font-medium text-zinc-400 hover:text-zinc-700 transition">
                  Configure →
                </Link>
              </div>

              {/* Africa's Talking */}
              <div className="flex items-start justify-between gap-4 rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-800">Africa&apos;s Talking — SMS</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    API key: {atKeySet ? "configured" : "not set"} ·
                    Username: <span className="font-mono">{settingVal("at_username") || "—"}</span>
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  atEnabled && atKeySet
                    ? "bg-green-100 text-green-700"
                    : "bg-zinc-200 text-zinc-500"
                }`}>
                  {atEnabled && atKeySet ? "Live" : "Disabled"}
                </span>
              </div>

              {/* OTP config */}
              <div className="flex items-start justify-between gap-4 rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-800">OTP settings</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    TTL: {otp_ttl} min ·
                    Console log: {otpDevLog ? "on" : "off"}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  otpDevLog ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                }`}>
                  {otpDevLog ? "Dev mode" : "Production"}
                </span>
              </div>

              {/* Flutterwave */}
              <div className="flex items-start justify-between gap-4 rounded-xl border border-zinc-100 bg-zinc-50 p-4 opacity-50">
                <div>
                  <p className="text-sm font-semibold text-zinc-800">Flutterwave — Payments</p>
                  <p className="mt-0.5 text-xs text-zinc-500">Sprint 5 — mobile money &amp; card payments</p>
                </div>
                <span className="shrink-0 rounded-full bg-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-500">
                  Coming soon
                </span>
              </div>
            </section>

            {/* Upload */}
            <section className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="mb-4 text-base font-semibold text-zinc-900">Upload questions</h2>
              <QuestionUploader />
            </section>
          </div>
        </div>

        {/* ── Users ─────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-zinc-900">Users</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Total",           value: userCount    ?? 0 },
              { label: "Free tier",       value: (userCount ?? 0) - (premiumCount ?? 0) },
              { label: "Premium",         value: premiumCount ?? 0 },
              { label: "Joined this week",value: newUserCount ?? 0 },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                <p className="text-2xl font-bold tabular-nums text-zinc-900">{s.value}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Subjects list ─────────────────────────────────────── */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900">
              Subjects <span className="ml-2 text-sm font-normal text-zinc-400">({subjects?.length ?? 0})</span>
            </h2>
          </div>
          {subjects && subjects.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {subjects.map((subject) => (
                <li
                  key={subject.id}
                  className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3"
                >
                  <span className="w-36 shrink-0 font-mono text-xs text-zinc-400">{subject.code}</span>
                  <span className="flex-1 text-sm font-medium text-zinc-800">{subject.name}</span>
                  <span className="rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-500">
                    {subject.exam_path ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">No subjects found.</p>
          )}
        </section>

      </main>
    </div>
  );
}
