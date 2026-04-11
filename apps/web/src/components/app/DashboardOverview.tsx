"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchSubjects } from "@/lib/browser-api";
import { EXAM_PATH_COPY, type ExamPath } from "@/lib/exam-paths";
import { useStudentSession } from "./StudentSessionProvider";

export function DashboardOverview() {
  const { state } = useStudentSession();
  const [subjectCount, setSubjectCount] = useState<number | null>(null);
  const currentExamPath = ((state.status === "authenticated" && state.user.exam_path) ||
    "JCE") as ExamPath;

  useEffect(() => {
    let cancelled = false;

    fetchSubjects(currentExamPath)
      .then((subjects) => {
        if (!cancelled) {
          setSubjectCount(subjects.length);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSubjectCount(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentExamPath]);

  if (state.status !== "authenticated") {
    return null;
  }

  const currentExamCopy = EXAM_PATH_COPY[currentExamPath];

  return (
    <section className="rounded-[2.25rem] border border-border bg-surface/90 p-7 shadow-[0_18px_50px_rgba(15,35,52,0.05)] sm:p-10">
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand">
        Learner dashboard
      </p>
      <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
        {state.user.name ? `Welcome back, ${state.user.name}.` : "Welcome back."}
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
        Your account stays routed through the learner app under{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5">/app</code>, while
        admin access stays separate. Keep moving through subjects, topics, and lessons
        with {currentExamPath} as your current exam path.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.75rem] border border-border bg-white/85 p-5">
          <p className="text-sm font-medium text-slate-500">Current exam path</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">{currentExamPath}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{currentExamCopy.label}</p>
        </div>

        <div className="rounded-[1.75rem] border border-border bg-white/85 p-5">
          <p className="text-sm font-medium text-slate-500">Subscription</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">
            {state.user.subscription_status}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Free learners can start immediately, then upgrade when they need more guided revision support.
          </p>
        </div>

        <div className="rounded-[1.75rem] border border-border bg-white/85 p-5">
          <p className="text-sm font-medium text-slate-500">Subjects ready</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">
            {subjectCount ?? "—"}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {currentExamPath === "JCE"
              ? "Open the live JCE subject list and continue with topics and lessons."
              : "This path is being staged. Join the waitlist if you want launch updates."}
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/app/subjects"
          className="rounded-full bg-brand px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-brand-strong"
        >
          Open subjects
        </Link>
        <Link
          href={`/waitlist?exam_path=${currentExamPath}`}
          className="rounded-full border border-border px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
        >
          Waitlist updates
        </Link>
      </div>
    </section>
  );
}
