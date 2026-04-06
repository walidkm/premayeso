"use client";

import { FormEvent, useEffect, useState } from "react";
import type { ApiErrorResponse, LessonAdminDto } from "../lib/content";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

type LessonData = {
  title: string;
  content: string;
  video_url: string;
  content_type: "text" | "video" | "mixed";
  tier_gate: "free" | "premium";
  is_free_preview: boolean;
  order_index: number;
};

type Props = {
  lessonId: string | null; // null = new
  topicId: string;
  token: string;
  onSaved: () => void;
  onDeleted?: () => void;
};

function extractYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m?.[1] ?? null;
}

export function LessonEditor({ lessonId, topicId, token, onSaved, onDeleted }: Props) {
  const isNew = lessonId === null;
  const [form, setForm] = useState<LessonData>({
    title: "",
    content: "",
    video_url: "",
    content_type: "text",
    tier_gate: "free",
    is_free_preview: false,
    order_index: 0,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonId) return;
    fetch(`${API_URL}/admin/topics/${topicId}/lessons-admin`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json() as Promise<LessonAdminDto[]>)
      .then((lessons) => {
        if (!Array.isArray(lessons)) return;
        const l = lessons.find((lesson) => lesson.id === lessonId);
        if (l) {
          setForm({
            title: l.title ?? "",
            content: l.content ?? "",
            video_url: l.video_url ?? "",
            content_type: l.content_type ?? "text",
            tier_gate: l.tier_gate ?? "free",
            is_free_preview: l.is_free_preview ?? false,
            order_index: l.order_index ?? 0,
          });
        }
      })
      .catch(() => {});
  }, [lessonId, topicId, token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const url = isNew ? `${API_URL}/admin/lessons` : `${API_URL}/admin/lessons/${lessonId}`;
    const method = isNew ? "POST" : "PATCH";
    const body = isNew ? { ...form, topic_id: topicId } : form;
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const body: ApiErrorResponse = await res.json().catch(() => ({}));
      setError(body.error ?? "Save failed");
    } else {
      onSaved();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!lessonId || !confirm("Delete this lesson? This cannot be undone.")) return;
    setDeleting(true);
    const res = await fetch(`${API_URL}/admin/lessons/${lessonId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body: ApiErrorResponse = await res.json().catch(() => ({}));
      setError(body.error ?? "Delete failed");
    } else {
      onDeleted?.();
    }
    setDeleting(false);
  }

  const ytId = form.video_url ? extractYoutubeId(form.video_url) : null;
  const showContent = form.content_type === "text" || form.content_type === "mixed";
  const showVideo = form.content_type === "video" || form.content_type === "mixed";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-zinc-900">{isNew ? "New Lesson" : "Edit Lesson"}</h2>

      <Field label="Title *">
        <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
          className={inputCls} />
      </Field>

      {/* Content type tabs */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700">Content Type</span>
        <div className="flex gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1">
          {(["text", "video", "mixed"] as const).map((ct) => (
            <button
              key={ct}
              type="button"
              onClick={() => setForm({ ...form, content_type: ct })}
              className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition ${
                form.content_type === ct
                  ? "bg-white shadow text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {ct}
            </button>
          ))}
        </div>
      </div>

      {showContent && (
        <Field label="Text Content">
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={10}
            className={`${inputCls} font-mono text-xs`}
            placeholder={"Markdown supported: **bold**, _italic_\nBlank line = new paragraph"}
          />
        </Field>
      )}

      {showVideo && (
        <div className="flex flex-col gap-2">
          <Field label="Video URL">
            <input
              value={form.video_url}
              onChange={(e) => setForm({ ...form, video_url: e.target.value })}
              className={inputCls}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </Field>
          {ytId && (
            <div className="overflow-hidden rounded-xl border border-zinc-200 aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${ytId}`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">Tier Gate</span>
          <div className="flex gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1">
            {(["free", "premium"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm({ ...form, tier_gate: t })}
                className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition ${
                  form.tier_gate === t
                    ? "bg-white shadow text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <Field label="Order Index">
          <input type="number" value={form.order_index}
            onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })}
            className={inputCls} />
        </Field>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={form.is_free_preview}
          onChange={(e) => setForm({ ...form, is_free_preview: e.target.checked })}
          className="rounded"
        />
        Free preview (visible without subscription)
      </label>

      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50">
          {saving ? "Saving…" : "Save Lesson"}
        </button>
        {!isNew && (
          <button type="button" onClick={handleDelete} disabled={deleting}
            className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
      {label}
      {children}
    </label>
  );
}

const inputCls =
  "rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 w-full";
