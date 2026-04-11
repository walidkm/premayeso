"use client";

import { useMemo, useState, type FormEvent } from "react";
import { EXAM_PATH_COPY, EXAM_PATHS, type ExamPath } from "@/lib/exam-paths";

export function WaitlistForm({ initialExamPath }: { initialExamPath: ExamPath }) {
  const [examPath, setExamPath] = useState<ExamPath>(initialExamPath);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const label = useMemo(() => EXAM_PATH_COPY[examPath].label, [examPath]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_path: examPath,
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          source: "web",
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        existing?: boolean;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not join the waitlist.");
      }

      setSuccess(
        payload.existing
          ? `You are already on the ${examPath} waitlist.`
          : `You are on the ${examPath} waitlist. We will let you know when ${label} opens.`
      );
      if (!payload.existing) {
        setName("");
        setEmail("");
        setPhone("");
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not join the waitlist."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-5 py-10 sm:px-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-[2rem] border border-border bg-surface/90 p-8 shadow-[0_24px_90px_rgba(15,35,52,0.08)] sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand">
            Waitlist
          </p>
          <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Register interest for MSCE and PSLCE.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
            JCE is live first. If you want to be early for MSCE or PSLCE, join the
            waitlist and PreMayeso will notify you as those learner paths open.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {(["MSCE", "PSLCE"] as const).map((path) => (
              <button
                key={path}
                type="button"
                onClick={() => setExamPath(path)}
                className={`rounded-[1.75rem] border p-5 text-left transition ${
                  examPath === path
                    ? "border-brand bg-brand text-white"
                    : "border-border bg-white/80 text-foreground hover:border-brand/50"
                }`}
              >
                <p className="text-lg font-semibold">{path}</p>
                <p className={`mt-2 text-sm leading-7 ${examPath === path ? "text-white/80" : "text-slate-600"}`}>
                  {EXAM_PATH_COPY[path].description}
                </p>
              </button>
            ))}
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="rounded-[2rem] border border-border bg-white/90 p-6 shadow-[0_24px_90px_rgba(15,35,52,0.08)] sm:p-8"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand">
            Join the list
          </p>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
            {examPath} updates
          </h2>

          <div className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Full name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none transition focus:border-brand"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none transition focus:border-brand"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Phone
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+265 999 000 001"
                className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none transition focus:border-brand"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {EXAM_PATHS.filter((path) => path !== "JCE").map((path) => (
                <button
                  key={path}
                  type="button"
                  onClick={() => setExamPath(path)}
                  className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${
                    examPath === path
                      ? "border-brand bg-brand text-white"
                      : "border-border text-slate-600"
                  }`}
                >
                  {path}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {success}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Joining waitlist..." : `Join ${examPath} waitlist`}
          </button>
        </form>
      </div>
    </main>
  );
}
