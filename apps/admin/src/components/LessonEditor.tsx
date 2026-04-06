"use client";

import { type FormEvent, useEffect, useState } from "react";
import { requestJson } from "@/lib/adminApi";
import type { LessonAdminDto } from "@/lib/content";
import {
  Field,
  dangerButtonClassName,
  inputClassName,
  primaryButtonClassName,
} from "@/components/AdminForm";

type LessonFormState = {
  title: string;
  content: string;
  video_url: string;
  content_type: "text" | "video" | "mixed";
  tier_gate: "free" | "premium";
  is_free_preview: boolean;
  order_index: number;
};

type Props = {
  token: string;
  topicId: string;
  topicName: string;
  subjectName: string;
  examPath: string;
  lesson: LessonAdminDto | null;
  onSaved: () => void;
  onDeleted: () => void;
};

const EMPTY_FORM: LessonFormState = {
  title: "",
  content: "",
  video_url: "",
  content_type: "text",
  tier_gate: "free",
  is_free_preview: false,
  order_index: 0,
};

function extractYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1] ?? null;
}

export function LessonEditor({
  token,
  topicId,
  topicName,
  subjectName,
  examPath,
  lesson,
  onSaved,
  onDeleted,
}: Props) {
  const [form, setForm] = useState<LessonFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!lesson) {
      setForm(EMPTY_FORM);
      setError(null);
      return;
    }

    setForm({
      title: lesson.title ?? "",
      content: lesson.content ?? "",
      video_url: lesson.video_url ?? "",
      content_type: lesson.content_type ?? "text",
      tier_gate: lesson.tier_gate ?? "free",
      is_free_preview: lesson.is_free_preview ?? false,
      order_index: lesson.order_index ?? 0,
    });
    setError(null);
  }, [lesson]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await requestJson(lesson ? `/admin/lessons/${lesson.id}` : "/admin/lessons", {
        method: lesson ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          topic_id: topicId,
        }),
      });
      onSaved();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!lesson || !window.confirm("Delete this lesson? This cannot be undone.")) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await requestJson(`/admin/lessons/${lesson.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      onDeleted();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  const youtubeId = form.video_url ? extractYoutubeId(form.video_url) : null;
  const showTextEditor = form.content_type === "text" || form.content_type === "mixed";
  const showVideo = form.content_type === "video" || form.content_type === "mixed";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold tracking-tight text-zinc-950">
          {lesson ? "Edit Lesson" : "Create Lesson"}
        </h3>
        <p className="mt-1 text-sm text-zinc-500">
          {subjectName} / {topicName} / {examPath}
        </p>
      </div>

      <Field label="Title">
        <input
          required
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          className={inputClassName}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Content Type">
          <select
            value={form.content_type}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                content_type: event.target.value as LessonFormState["content_type"],
              }))
            }
            className={inputClassName}
          >
            <option value="text">Text</option>
            <option value="video">Video</option>
            <option value="mixed">Mixed</option>
          </select>
        </Field>
        <Field label="Order">
          <input
            type="number"
            value={form.order_index}
            onChange={(event) =>
              setForm((current) => ({ ...current, order_index: Number(event.target.value) || 0 }))
            }
            className={inputClassName}
          />
        </Field>
      </div>

      {showTextEditor ? (
        <Field label="Lesson Content">
          <textarea
            value={form.content}
            onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
            className={`${inputClassName} min-h-64 resize-y font-mono text-xs`}
          />
        </Field>
      ) : null}

      {showVideo ? (
        <div className="flex flex-col gap-3">
          <Field label="Video URL">
            <input
              value={form.video_url}
              onChange={(event) => setForm((current) => ({ ...current, video_url: event.target.value }))}
              className={inputClassName}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </Field>
          {youtubeId ? (
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-black aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tier Gate">
          <select
            value={form.tier_gate}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                tier_gate: event.target.value as LessonFormState["tier_gate"],
              }))
            }
            className={inputClassName}
          >
            <option value="free">Free</option>
            <option value="premium">Premium</option>
          </select>
        </Field>
        <Field label="Free Preview">
          <select
            value={form.is_free_preview ? "true" : "false"}
            onChange={(event) =>
              setForm((current) => ({ ...current, is_free_preview: event.target.value === "true" }))
            }
            className={inputClassName}
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </Field>
      </div>

      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button type="submit" disabled={saving} className={primaryButtonClassName}>
          {saving ? "Saving..." : lesson ? "Save Lesson" : "Create Lesson"}
        </button>
        {lesson ? (
          <button type="button" disabled={deleting} onClick={handleDelete} className={dangerButtonClassName}>
            {deleting ? "Deleting..." : "Delete Lesson"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
