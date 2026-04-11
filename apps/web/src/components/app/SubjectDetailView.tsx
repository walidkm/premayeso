"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fetchSubject,
  fetchSubjectPapers,
  fetchTopics,
  type ExamPaper,
  type Subject,
  type Topic,
} from "@/lib/browser-api";
import { type ExamPath } from "@/lib/exam-paths";
import { useStudentSession } from "./StudentSessionProvider";

export function SubjectDetailView({ subjectId }: { subjectId: string }) {
  const { state } = useStudentSession();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [papers, setPapers] = useState<ExamPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const examPath = ((state.status === "authenticated" && state.user.exam_path) ||
    "JCE") as ExamPath;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchSubject(subjectId),
      fetchTopics(subjectId),
      fetchSubjectPapers(subjectId, examPath),
    ])
      .then(([subjectData, topicData, paperData]) => {
        if (cancelled) return;
        setSubject(subjectData);
        setTopics(topicData);
        setPapers(paperData);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load this subject right now.");
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
  }, [examPath, subjectId]);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading subject...</p>;
  }

  if (error || !subject) {
    return (
      <div className="rounded-[2rem] border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
        {error ?? "Subject not found."}
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-[2rem] border border-border bg-white/85 p-7">
        <Link href="/app/subjects" className="text-sm font-semibold text-brand">
          ← Back to subjects
        </Link>
        <p className="mt-4 text-sm font-semibold uppercase tracking-[0.28em] text-brand">
          {subject.code ?? examPath}
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
          {subject.name}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          {subject.description ??
            "Open a topic to move further into lessons and guided revision for this subject."}
        </p>

        <div className="mt-8 space-y-4">
          {topics.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-border bg-surface px-5 py-8 text-sm text-slate-600">
              No topics are live for this subject yet.
            </div>
          ) : (
            topics.map((topic) => (
              <Link
                key={topic.id}
                href={`/app/topics/${topic.id}`}
                className="block rounded-[1.75rem] border border-border bg-surface/80 p-5 transition hover:border-brand/50 hover:bg-white"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-lg font-semibold text-foreground">{topic.name}</p>
                  {topic.form_level ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {topic.form_level}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {topic.description ?? "Open this topic to continue into lesson-by-lesson revision."}
                </p>
              </Link>
            ))
          )}
        </div>
      </section>

      <aside className="rounded-[2rem] border border-border bg-surface/80 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand">
          Published papers
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Past-paper coverage for this subject appears here when published to learners.
        </p>

        <div className="mt-6 space-y-3">
          {papers.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-border bg-white/70 px-4 py-5 text-sm text-slate-600">
              No published papers are live for this subject yet.
            </div>
          ) : (
            papers.map((paper) => (
              <article
                key={paper.id}
                className="rounded-[1.5rem] border border-border bg-white/80 px-4 py-4"
              >
                <p className="text-sm font-semibold text-foreground">
                  {paper.title ??
                    `${subject.name} ${paper.year ?? ""}${paper.paper_number ? ` Paper ${paper.paper_number}` : ""}`}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                  {paper.year ?? "Year TBA"} / {paper.question_count} questions
                </p>
              </article>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
