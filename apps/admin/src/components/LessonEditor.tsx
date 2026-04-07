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
import { LessonBlocksEditor } from "@/components/LessonBlocksEditor";

type LessonFormState = {
  title: string;
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
  onSaved: (lesson: LessonAdminDto) => void;
  onDeleted: () => void;
};

const EMPTY_FORM: LessonFormState = {
  title: "",
  tier_gate: "free",
  is_free_preview: false,
  order_index: 0,
};

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
      const savedLesson = await requestJson<LessonAdminDto>(lesson ? `/admin/lessons/${lesson.id}` : "/admin/lessons", {
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
      onSaved(savedLesson);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!lesson || !window.confirm("Delete this lesson and all of its blocks? This cannot be undone.")) {
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

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-zinc-950">
            {lesson ? "Edit Lesson" : "Create Lesson"}
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            {subjectName} / {topicName} / {examPath}
          </p>
        </div>

        <Field label="Lesson Title">
          <input
            required
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            className={inputClassName}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
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

      {lesson ? (
        <LessonBlocksEditor key={lesson.id} token={token} lesson={lesson} onChanged={() => onSaved(lesson)} />
      ) : (
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 px-5 py-6">
          <p className="text-sm font-semibold text-zinc-900">Create the lesson container first</p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Once the lesson is created, you can add multiple ordered text and video blocks, import any legacy content,
            and manage the final learner-facing structure.
          </p>
        </div>
      )}
    </div>
  );
}
