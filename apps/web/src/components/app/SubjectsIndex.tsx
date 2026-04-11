"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchSubjects, type Subject } from "@/lib/browser-api";
import { type ExamPath } from "@/lib/exam-paths";
import { useStudentSession } from "./StudentSessionProvider";

export function SubjectsIndex() {
  const { state } = useStudentSession();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const examPath = ((state.status === "authenticated" && state.user.exam_path) ||
    "JCE") as ExamPath;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSubjects(examPath)
      .then((items) => {
        if (!cancelled) {
          setSubjects(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load subjects right now.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [examPath]);

  return (
    <section className="rounded-[2.25rem] border border-border bg-white/85 p-7">
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand">
        Subjects
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
        Browse {examPath} subjects
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
        Choose a subject to move into topics, lessons, and published paper coverage without mixing learner routes with the admin CMS.
      </p>

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Loading subjects...</p>
      ) : error ? (
        <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      ) : subjects.length === 0 ? (
        <div className="mt-8 rounded-[1.75rem] border border-dashed border-border bg-surface px-5 py-10 text-center">
          <p className="text-lg font-semibold text-foreground">No live subjects yet for {examPath}</p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            This exam path is still being prepared. Join the waitlist to hear when the learner rollout opens.
          </p>
          <Link
            href={`/waitlist?exam_path=${examPath}`}
            className="mt-5 inline-flex rounded-full border border-border px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand hover:text-brand"
          >
            Join waitlist
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {subjects.map((subject) => (
            <Link
              key={subject.id}
              href={`/app/subjects/${subject.id}`}
              className="rounded-[1.75rem] border border-border bg-surface/80 p-5 transition hover:-translate-y-0.5 hover:border-brand/50 hover:bg-white"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-lg font-semibold text-foreground">{subject.name}</p>
                {subject.code ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {subject.code}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {subject.description ?? "Open this subject to browse topics, lessons, and available papers."}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
