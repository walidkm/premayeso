"use client";

import { useEffect, useState } from "react";
import type { ContentTreeSubjectDto, LessonAdminDto } from "../lib/content";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

export type Selection =
  | { type: "subject"; id: string }
  | { type: "topic"; id: string; subjectId: string }
  | { type: "lesson"; id: string; topicId: string }
  | { type: "new-subject" }
  | { type: "new-topic"; subjectId: string }
  | { type: "new-lesson"; topicId: string };

type Props = {
  token: string;
  role: string;
  selection: Selection | null;
  onSelect: (sel: Selection) => void;
};

export function ContentSidebar({ token, role, selection, onSelect }: Props) {
  const [tree, setTree] = useState<ContentTreeSubjectDto[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const isSuperAdmin = role === "admin" || role === "super_admin";

  useEffect(() => {
    fetch(`${API_URL}/admin/content/tree`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json() as Promise<ContentTreeSubjectDto[]>)
      .then((data) => {
        if (Array.isArray(data)) setTree(data);
      })
      .catch(() => {});
  }, [token]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selKey = selection
    ? selection.type === "new-subject"
      ? "new-subject"
      : selection.type === "new-topic"
      ? `new-topic-${selection.subjectId}`
      : selection.type === "new-lesson"
      ? `new-lesson-${selection.topicId}`
      : `${selection.type}-${selection.id}`
    : null;

  return (
    <div className="flex flex-col gap-1">
      {isSuperAdmin && (
        <button
          onClick={() => onSelect({ type: "new-subject" })}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
            selKey === "new-subject"
              ? "bg-zinc-900 text-white"
              : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          }`}
        >
          <span className="text-base leading-none">＋</span> New Subject
        </button>
      )}

      {tree.map((subject) => {
        const subjectKey = `subject-${subject.id}`;
        const isOpen = expanded.has(subject.id);

        return (
          <div key={subject.id}>
            <div className="flex items-center gap-1">
              <button
                onClick={() => toggle(subject.id)}
                className="flex size-6 items-center justify-center rounded text-zinc-400 hover:text-zinc-700 shrink-0"
              >
                {isOpen ? "▾" : "▸"}
              </button>
              <button
                onClick={() => onSelect({ type: "subject", id: subject.id })}
                className={`flex-1 rounded-lg px-2 py-1.5 text-left text-sm font-semibold transition ${
                  selKey === subjectKey
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-800 hover:bg-zinc-100"
                }`}
              >
                {subject.name}
              </button>
              {isSuperAdmin && (
                <button
                  onClick={() => { setExpanded((p) => new Set([...p, subject.id])); onSelect({ type: "new-topic", subjectId: subject.id }); }}
                  className="rounded px-1.5 py-0.5 text-xs text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                  title="New topic"
                >
                  ＋T
                </button>
              )}
            </div>

            {isOpen && (
              <div className="ml-5 mt-0.5 flex flex-col gap-0.5">
                {isSuperAdmin && (
                  <button
                    onClick={() => onSelect({ type: "new-topic", subjectId: subject.id })}
                    className={`rounded-lg px-3 py-1.5 text-left text-xs font-medium transition ${
                      selKey === `new-topic-${subject.id}`
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                    }`}
                  >
                    ＋ New Topic
                  </button>
                )}
                {subject.topics
                  .slice()
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((topic) => {
                    const topicKey = `topic-${topic.id}`;
                    const topicOpen = expanded.has(topic.id);
                    return (
                      <div key={topic.id}>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggle(topic.id)}
                            className="flex size-5 items-center justify-center rounded text-zinc-400 hover:text-zinc-700 shrink-0 text-xs"
                          >
                            {topicOpen ? "▾" : "▸"}
                          </button>
                          <button
                            onClick={() => onSelect({ type: "topic", id: topic.id, subjectId: subject.id })}
                            className={`flex-1 rounded-lg px-2 py-1 text-left text-sm transition ${
                              selKey === topicKey
                                ? "bg-zinc-900 text-white"
                                : "text-zinc-700 hover:bg-zinc-100"
                            }`}
                          >
                            {topic.name}
                          </button>
                          <button
                            onClick={() => { setExpanded((p) => new Set([...p, topic.id])); onSelect({ type: "new-lesson", topicId: topic.id }); }}
                            className="rounded px-1 py-0.5 text-xs text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                            title="New lesson"
                          >
                            ＋L
                          </button>
                        </div>

                        {topicOpen && (
                          <div className="ml-4 mt-0.5 flex flex-col gap-0.5">
                            <button
                              onClick={() => onSelect({ type: "new-lesson", topicId: topic.id })}
                              className={`rounded-lg px-3 py-1 text-left text-xs font-medium transition ${
                                selKey === `new-lesson-${topic.id}`
                                  ? "bg-zinc-900 text-white"
                                  : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                              }`}
                            >
                              ＋ New Lesson
                            </button>
                            <LessonList
                              topicId={topic.id}
                              token={token}
                              selKey={selKey}
                              onSelect={onSelect}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

type LessonMeta = Pick<LessonAdminDto, "id" | "title" | "order_index">;

function LessonList({
  topicId,
  token,
  selKey,
  onSelect,
}: {
  topicId: string;
  token: string;
  selKey: string | null;
  onSelect: (sel: Selection) => void;
}) {
  const [lessons, setLessons] = useState<LessonMeta[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/admin/topics/${topicId}/lessons-admin`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json() as Promise<LessonMeta[]>)
      .then((d) => { if (Array.isArray(d)) setLessons(d); })
      .catch(() => {});
  }, [topicId, token]);

  return (
    <>
      {lessons
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map((lesson) => {
          const key = `lesson-${lesson.id}`;
          return (
            <button
              key={lesson.id}
              onClick={() => onSelect({ type: "lesson", id: lesson.id, topicId })}
              className={`rounded-lg px-3 py-1 text-left text-xs transition ${
                selKey === key
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              {lesson.title}
            </button>
          );
        })}
    </>
  );
}
