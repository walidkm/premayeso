"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchLessons, fetchTopic, type Lesson, type Topic } from "@/lib/browser-api";

export function TopicDetailView({ topicId }: { topicId: string }) {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([fetchTopic(topicId), fetchLessons(topicId)])
      .then(([topicData, lessonData]) => {
        if (cancelled) return;
        setTopic(topicData);
        setLessons(lessonData);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load this topic right now.");
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
  }, [topicId]);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading topic...</p>;
  }

  if (error || !topic) {
    return (
      <div className="rounded-[2rem] border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
        {error ?? "Topic not found."}
      </div>
    );
  }

  return (
    <section className="rounded-[2rem] border border-border bg-white/85 p-7">
      <Link href={`/app/subjects/${topic.subject_id ?? ""}`} className="text-sm font-semibold text-brand">
        ← Back to subject
      </Link>
      <p className="mt-4 text-sm font-semibold uppercase tracking-[0.28em] text-brand">
        Topic
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
        {topic.name}
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
        {topic.description ??
          "Follow the lessons below to move through this topic one step at a time."}
      </p>

      <div className="mt-8 space-y-4">
        {lessons.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-border bg-surface px-5 py-8 text-sm text-slate-600">
            No lessons are live for this topic yet.
          </div>
        ) : (
          lessons.map((lesson) => (
            <Link
              key={lesson.id}
              href={`/app/lessons/${lesson.id}`}
              className="block rounded-[1.75rem] border border-border bg-surface/80 p-5 transition hover:border-brand/50 hover:bg-white"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-lg font-semibold text-foreground">{lesson.title}</p>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {lesson.content_type}
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {lesson.content
                  ? `${lesson.content.slice(0, 120)}${lesson.content.length > 120 ? "..." : ""}`
                  : "Open this lesson to read the full explanation and supporting study blocks."}
              </p>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
