"use client";

import { type FormEvent, useEffect, useState } from "react";
import { requestJson } from "@/lib/adminApi";
import { FORM_LEVEL_OPTIONS, type ContentTreeTopicDto } from "@/lib/content";
import {
  Field,
  dangerButtonClassName,
  inputClassName,
  primaryButtonClassName,
} from "@/components/AdminForm";

type TopicFormState = {
  name: string;
  description: string;
  code: string;
  form_level: string;
  order_index: number;
};

type Props = {
  token: string;
  subjectId: string;
  subjectName: string;
  subjectExamPath: string;
  topic: ContentTreeTopicDto | null;
  onSaved: () => void;
  onDeleted: () => void;
};

const EMPTY_FORM: TopicFormState = {
  name: "",
  description: "",
  code: "",
  form_level: "",
  order_index: 0,
};

export function TopicForm({
  token,
  subjectId,
  subjectName,
  subjectExamPath,
  topic,
  onSaved,
  onDeleted,
}: Props) {
  const [form, setForm] = useState<TopicFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!topic) {
      setForm(EMPTY_FORM);
      setError(null);
      return;
    }

    setForm({
      name: topic.name ?? "",
      description: topic.description ?? "",
      code: topic.code ?? "",
      form_level: topic.form_level ?? "",
      order_index: topic.order_index ?? 0,
    });
    setError(null);
  }, [topic]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await requestJson(topic ? `/admin/topics/${topic.id}` : "/admin/topics", {
        method: topic ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          subject_id: subjectId,
          exam_path: subjectExamPath,
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
    if (!topic || !window.confirm("Delete this topic and all of its lessons? This cannot be undone.")) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await requestJson(`/admin/topics/${topic.id}`, {
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold tracking-tight text-zinc-950">
          {topic ? "Edit Topic" : "Create Topic"}
        </h3>
        <p className="mt-1 text-sm text-zinc-500">
          Topics inherit their exam level from the selected subject.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Subject">
          <input value={subjectName} readOnly className={`${inputClassName} bg-zinc-50 text-zinc-500`} />
        </Field>
        <Field label="Exam Level">
          <input value={subjectExamPath} readOnly className={`${inputClassName} bg-zinc-50 text-zinc-500`} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <input
            required
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            className={inputClassName}
          />
        </Field>
        <Field label="Code">
          <input
            value={form.code}
            onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
            className={inputClassName}
          />
        </Field>
      </div>

      <Field label="Description">
        <textarea
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          className={`${inputClassName} min-h-28 resize-y`}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Form Level">
          <select
            value={form.form_level}
            onChange={(event) => setForm((current) => ({ ...current, form_level: event.target.value }))}
            className={inputClassName}
          >
            <option value="">Not set</option>
            {FORM_LEVEL_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
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

      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button type="submit" disabled={saving} className={primaryButtonClassName}>
          {saving ? "Saving..." : topic ? "Save Topic" : "Create Topic"}
        </button>
        {topic ? (
          <button type="button" disabled={deleting} onClick={handleDelete} className={dangerButtonClassName}>
            {deleting ? "Deleting..." : "Delete Topic"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
