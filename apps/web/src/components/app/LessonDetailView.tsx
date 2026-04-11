"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchLessonDetail, type LessonDetail } from "@/lib/browser-api";

export function LessonDetailView({ lessonId }: { lessonId: string }) {
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchLessonDetail(lessonId)
      .then((data) => {
        if (!cancelled) {
          setLesson(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load this lesson right now.");
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
  }, [lessonId]);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading lesson...</p>;
  }

  if (error || !lesson) {
    return (
      <div className="rounded-[2rem] border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
        {error ?? "Lesson not found."}
      </div>
    );
  }

  return (
    <article className="rounded-[2rem] border border-border bg-white/90 p-7 shadow-[0_18px_50px_rgba(15,35,52,0.05)] sm:p-10">
      <Link href={`/app/topics/${lesson.topic_id}`} className="text-sm font-semibold text-brand">
        ← Back to topic
      </Link>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          {lesson.exam_path ?? "Lesson"}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {lesson.tier_gate ?? "free"}
        </span>
      </div>
      <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {lesson.title}
      </h1>

      {lesson.content ? (
        <div className="mt-6 rounded-[1.75rem] border border-border bg-surface/70 px-5 py-5 text-sm leading-8 text-slate-700">
          {lesson.content}
        </div>
      ) : null}

      {lesson.blocks.length > 0 ? (
        <div className="mt-6 space-y-4">
          {lesson.blocks.map((block) => (
            <section
              key={block.id}
              className="rounded-[1.75rem] border border-border bg-surface/80 p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-lg font-semibold text-foreground">
                  {block.title ?? `Lesson ${block.block_type}`}
                </p>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {block.block_type}
                </span>
              </div>

              {block.text_content ? (
                <p className="mt-3 text-sm leading-8 text-slate-700">{block.text_content}</p>
              ) : null}

              {block.video_url ? (
                <a
                  href={block.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex rounded-full border border-border px-4 py-2 text-sm font-semibold text-brand transition hover:border-brand hover:text-brand-strong"
                >
                  Open video resource
                </a>
              ) : null}

              {block.file_url ? (
                <a
                  href={block.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex rounded-full border border-border px-4 py-2 text-sm font-semibold text-brand transition hover:border-brand hover:text-brand-strong"
                >
                  Open PDF resource
                </a>
              ) : null}
            </section>
          ))}
        </div>
      ) : null}
    </article>
  );
}
