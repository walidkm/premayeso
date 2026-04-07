"use client";

import { type FormEvent, useEffect, useState } from "react";
import type { AdminUiExamPath } from "@/lib/admin";
import { requestJson } from "@/lib/adminApi";
import type { ContentTreeSubjectDto } from "@/lib/content";
import {
  Field,
  dangerButtonClassName,
  inputClassName,
  primaryButtonClassName,
} from "@/components/AdminForm";

type SubjectFormState = {
  name: string;
  description: string;
  code: string;
  order_index: number;
};

type Props = {
  token: string;
  examPath: AdminUiExamPath;
  subject: ContentTreeSubjectDto | null;
  onSaved: () => void;
  onDeleted: () => void;
};

const EMPTY_FORM: SubjectFormState = {
  name: "",
  description: "",
  code: "",
  order_index: 0,
};

export function SubjectForm({ token, examPath, subject, onSaved, onDeleted }: Props) {
  const [form, setForm] = useState<SubjectFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!subject) {
      setForm(EMPTY_FORM);
      setError(null);
      return;
    }

    setForm({
      name: subject.name ?? "",
      description: subject.description ?? "",
      code: subject.code ?? "",
      order_index: subject.order_index ?? 0,
    });
    setError(null);
  }, [subject]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await requestJson(subject ? `/admin/subjects/${subject.id}` : "/admin/subjects", {
        method: subject ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          exam_path: examPath,
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
    if (!subject || !window.confirm("Delete this subject and its dependent content? This cannot be undone.")) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await requestJson(`/admin/subjects/${subject.id}`, {
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
          {subject ? "Edit Subject" : "Create Subject"}
        </h3>
        <p className="mt-1 text-sm text-zinc-500">
          Subjects stay inside the active exam level. Switch level in the header to manage the other catalog.
        </p>
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
        <Field label="Code" hint="Use short, stable subject codes for upload templates and admin search.">
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
        <Field label="Exam Level">
          <input value={examPath} readOnly className={`${inputClassName} bg-zinc-50 text-zinc-500`} />
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
          {saving ? "Saving..." : subject ? "Save Subject" : "Create Subject"}
        </button>
        {subject ? (
          <button type="button" disabled={deleting} onClick={handleDelete} className={dangerButtonClassName}>
            {deleting ? "Deleting..." : "Delete Subject"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
