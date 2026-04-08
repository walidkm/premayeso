"use client";

import { type FormEvent, useEffect, useState } from "react";
import { requestJson } from "@/lib/adminApi";
import {
  PAPER_EXAM_MODE_OPTIONS,
  PAPER_MARKING_MODE_OPTIONS,
  PAPER_QUESTION_MODE_OPTIONS,
  PAPER_SOLUTION_UNLOCK_MODE_OPTIONS,
  PAPER_STATUS_OPTIONS,
  PAPER_SOURCE_OPTIONS,
  PAPER_TYPE_OPTIONS,
  type ExamPaperAdminDto,
  type SchoolAdminDto,
} from "@/lib/content";
import {
  Field,
  dangerButtonClassName,
  inputClassName,
  primaryButtonClassName,
  textAreaClassName,
} from "@/components/AdminForm";

type ExamPaperFormState = {
  title: string;
  source_type: string;
  paper_type: string;
  exam_mode: string;
  year: number | null;
  paper_number: number | null;
  term: string;
  session: string;
  paper_code: string;
  duration_min: number | null;
  total_marks: number | null;
  instructions: string;
  has_sections: boolean;
  marking_mode: string;
  solution_unlock_mode: string;
  question_mode: string;
  status: string;
  school_id: string;
  is_sample: boolean;
};

type Props = {
  token: string;
  subjectId: string;
  subjectName: string;
  examPath: string;
  paper: ExamPaperAdminDto | null;
  schools: SchoolAdminDto[];
  onSaved: () => void;
  onDeleted: () => void;
};

const EMPTY_FORM: ExamPaperFormState = {
  title: "",
  source_type: "maneb",
  paper_type: "maneb_past_paper",
  exam_mode: "paper_layout",
  year: null,
  paper_number: null,
  term: "",
  session: "",
  paper_code: "",
  duration_min: null,
  total_marks: null,
  instructions: "",
  has_sections: false,
  marking_mode: "auto",
  solution_unlock_mode: "after_submit",
  question_mode: "one_question_at_a_time",
  status: "published",
  school_id: "",
  is_sample: false,
};

export function ExamPaperForm({
  token,
  subjectId,
  subjectName,
  examPath,
  paper,
  schools,
  onSaved,
  onDeleted,
}: Props) {
  const [form, setForm] = useState<ExamPaperFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!paper) {
      setForm(EMPTY_FORM);
      setError(null);
      return;
    }

    setForm({
      title: paper.title ?? "",
      source_type: paper.source_type,
      paper_type: paper.paper_type,
      exam_mode: paper.exam_mode,
      year: paper.year,
      paper_number: paper.paper_number,
      term: paper.term ?? "",
      session: paper.session ?? "",
      paper_code: paper.paper_code ?? "",
      duration_min: paper.duration_min,
      total_marks: paper.total_marks,
      instructions: paper.instructions ?? "",
      has_sections: paper.has_sections,
      marking_mode: paper.marking_mode,
      solution_unlock_mode: paper.solution_unlock_mode,
      question_mode: paper.question_mode,
      status: paper.status,
      school_id: paper.school_id ?? "",
      is_sample: paper.is_sample,
    });
    setError(null);
  }, [paper]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await requestJson(paper ? `/admin/exam-papers/${paper.id}` : "/admin/exam-papers", {
        method: paper ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          subject_id: subjectId,
          exam_path: examPath,
          school_id: form.source_type === "school" ? form.school_id || null : null,
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
    if (!paper || !window.confirm("Delete this exam paper and its paper-question links?")) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await requestJson(`/admin/exam-papers/${paper.id}`, {
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
          {paper ? "Edit Exam Paper" : "Create Exam Paper"}
        </h3>
        <p className="mt-1 text-sm text-zinc-500">
          {subjectName} / {examPath}
        </p>
      </div>

      <Field label="Title">
        <input
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          className={inputClassName}
          placeholder="Example: 2024 Biology Paper 1"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Source Type">
          <select
            value={form.source_type}
            onChange={(event) => setForm((current) => ({ ...current, source_type: event.target.value }))}
            className={inputClassName}
          >
            {PAPER_SOURCE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Paper Type">
          <select
            value={form.paper_type}
            onChange={(event) => setForm((current) => ({ ...current, paper_type: event.target.value }))}
            className={inputClassName}
          >
            {PAPER_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Exam Mode">
          <select
            value={form.exam_mode}
            onChange={(event) => setForm((current) => ({ ...current, exam_mode: event.target.value }))}
            className={inputClassName}
          >
            {PAPER_EXAM_MODE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Question Mode">
          <select
            value={form.question_mode}
            onChange={(event) => setForm((current) => ({ ...current, question_mode: event.target.value }))}
            className={inputClassName}
          >
            {PAPER_QUESTION_MODE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Marking Mode">
          <select
            value={form.marking_mode}
            onChange={(event) => setForm((current) => ({ ...current, marking_mode: event.target.value }))}
            className={inputClassName}
          >
            {PAPER_MARKING_MODE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Solution Unlock">
          <select
            value={form.solution_unlock_mode}
            onChange={(event) => setForm((current) => ({ ...current, solution_unlock_mode: event.target.value }))}
            className={inputClassName}
          >
            {PAPER_SOLUTION_UNLOCK_MODE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            value={form.status}
            onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
            className={inputClassName}
          >
            {PAPER_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="School" hint="Required only when the source type is school.">
          <select
            value={form.school_id}
            onChange={(event) => setForm((current) => ({ ...current, school_id: event.target.value }))}
            className={inputClassName}
            disabled={form.source_type !== "school"}
          >
            <option value="">No school</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Year">
          <input
            type="number"
            value={form.year ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                year: event.target.value ? Number(event.target.value) : null,
              }))
            }
            className={inputClassName}
          />
        </Field>
        <Field label="Paper Number">
          <input
            type="number"
            value={form.paper_number ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                paper_number: event.target.value ? Number(event.target.value) : null,
              }))
            }
            className={inputClassName}
          />
        </Field>
        <Field label="Duration (min)">
          <input
            type="number"
            value={form.duration_min ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                duration_min: event.target.value ? Number(event.target.value) : null,
              }))
            }
            className={inputClassName}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Session">
          <input
            value={form.session}
            onChange={(event) => setForm((current) => ({ ...current, session: event.target.value }))}
            className={inputClassName}
            placeholder="Example: Nov"
          />
        </Field>
        <Field label="Paper Code">
          <input
            value={form.paper_code}
            onChange={(event) => setForm((current) => ({ ...current, paper_code: event.target.value }))}
            className={inputClassName}
            placeholder="Example: BIO-2024-P1"
          />
        </Field>
        <Field label="Total Marks">
          <input
            type="number"
            value={form.total_marks ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                total_marks: event.target.value ? Number(event.target.value) : null,
              }))
            }
            className={inputClassName}
          />
        </Field>
        <Field label="Has Sections">
          <select
            value={form.has_sections ? "true" : "false"}
            onChange={(event) => setForm((current) => ({ ...current, has_sections: event.target.value === "true" }))}
            className={inputClassName}
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </Field>
      </div>

      <Field label="Instructions">
        <textarea
          value={form.instructions}
          onChange={(event) => setForm((current) => ({ ...current, instructions: event.target.value }))}
          className={textAreaClassName}
          placeholder="Add paper-level instructions for learners."
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sample Paper">
          <select
            value={form.is_sample ? "true" : "false"}
            onChange={(event) => setForm((current) => ({ ...current, is_sample: event.target.value === "true" }))}
            className={inputClassName}
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </Field>
        <Field label="Legacy Term">
          <input
            value={form.term}
            onChange={(event) => setForm((current) => ({ ...current, term: event.target.value }))}
            className={inputClassName}
            placeholder="Optional legacy term label"
          />
        </Field>
      </div>

      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button type="submit" disabled={saving} className={primaryButtonClassName}>
          {saving ? "Saving..." : paper ? "Save Exam Paper" : "Create Exam Paper"}
        </button>
        {paper ? (
          <button type="button" disabled={deleting} onClick={handleDelete} className={dangerButtonClassName}>
            {deleting ? "Deleting..." : "Delete Exam Paper"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
