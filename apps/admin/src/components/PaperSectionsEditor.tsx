"use client";

import { useEffect, useState } from "react";
import { requestJson } from "@/lib/adminApi";
import {
  PAPER_SECTION_SELECTION_MODE_OPTIONS,
  type PaperSectionAdminDto,
} from "@/lib/content";
import {
  Field,
  inputClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/AdminForm";

type SectionDraft = {
  section_code: string;
  title: string;
  instructions: string;
  order_index: number;
  question_selection_mode: string;
  required_count: number | null;
  max_marks: number | null;
  starts_at_question_number: number | null;
  ends_at_question_number: number | null;
};

const EMPTY_SECTION: SectionDraft = {
  section_code: "",
  title: "",
  instructions: "",
  order_index: 0,
  question_selection_mode: "answer_all",
  required_count: null,
  max_marks: null,
  starts_at_question_number: null,
  ends_at_question_number: null,
};

function toDraft(section: PaperSectionAdminDto): SectionDraft {
  return {
    section_code: section.section_code,
    title: section.title ?? "",
    instructions: section.instructions ?? "",
    order_index: section.order_index,
    question_selection_mode: section.question_selection_mode,
    required_count: section.required_count,
    max_marks: section.max_marks,
    starts_at_question_number: section.starts_at_question_number,
    ends_at_question_number: section.ends_at_question_number,
  };
}

export function PaperSectionsEditor({
  token,
  paperId,
  onChanged,
}: {
  token: string;
  paperId: string;
  onChanged?: () => void;
}) {
  const [sections, setSections] = useState<PaperSectionAdminDto[]>([]);
  const [draft, setDraft] = useState<SectionDraft>(EMPTY_SECTION);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    requestJson<PaperSectionAdminDto[]>(`/admin/exam-papers/${paperId}/sections`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((data) => {
        if (!cancelled) setSections(data);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "Failed to load sections");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [paperId, token]);

  async function handleCreate() {
    setSaving(true);
    setError(null);

    try {
      const section = await requestJson<PaperSectionAdminDto>(`/admin/exam-papers/${paperId}/sections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(draft),
      });
      setSections((current) => [...current, section].sort((left, right) => left.order_index - right.order_index));
      setDraft(EMPTY_SECTION);
      onChanged?.();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to create section");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave(sectionId: string, nextDraft: SectionDraft) {
    setSaving(true);
    setError(null);

    try {
      const updated = await requestJson<PaperSectionAdminDto>(`/admin/paper-sections/${sectionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(nextDraft),
      });
      setSections((current) =>
        current
          .map((section) => (section.id === sectionId ? updated : section))
          .sort((left, right) => left.order_index - right.order_index)
      );
      onChanged?.();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to save section");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(sectionId: string) {
    if (!window.confirm("Delete this section?")) return;

    setSaving(true);
    setError(null);

    try {
      await requestJson<{ ok: true }>(`/admin/paper-sections/${sectionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSections((current) => current.filter((section) => section.id !== sectionId));
      onChanged?.();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to delete section");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
      <div>
        <h3 className="text-base font-semibold text-zinc-950">Paper Sections</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Define Section A/B/C rules, numbering ranges, and answer-any rules without leaving the paper screen.
        </p>
      </div>

      <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-4 lg:grid-cols-4">
        <Field label="Section Code">
          <input
            value={draft.section_code}
            onChange={(event) => setDraft((current) => ({ ...current, section_code: event.target.value }))}
            className={inputClassName}
            placeholder="A"
          />
        </Field>
        <Field label="Title">
          <input
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            className={inputClassName}
            placeholder="Multiple choice"
          />
        </Field>
        <Field label="Order">
          <input
            type="number"
            value={draft.order_index}
            onChange={(event) => setDraft((current) => ({ ...current, order_index: Number(event.target.value) || 0 }))}
            className={inputClassName}
          />
        </Field>
        <Field label="Selection Mode">
          <select
            value={draft.question_selection_mode}
            onChange={(event) => setDraft((current) => ({ ...current, question_selection_mode: event.target.value }))}
            className={inputClassName}
          >
            {PAPER_SECTION_SELECTION_MODE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Required Count">
          <input
            type="number"
            value={draft.required_count ?? ""}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                required_count: event.target.value ? Number(event.target.value) : null,
              }))
            }
            className={inputClassName}
          />
        </Field>
        <Field label="Max Marks">
          <input
            type="number"
            value={draft.max_marks ?? ""}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                max_marks: event.target.value ? Number(event.target.value) : null,
              }))
            }
            className={inputClassName}
          />
        </Field>
        <Field label="Starts At Question">
          <input
            type="number"
            value={draft.starts_at_question_number ?? ""}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                starts_at_question_number: event.target.value ? Number(event.target.value) : null,
              }))
            }
            className={inputClassName}
          />
        </Field>
        <Field label="Ends At Question">
          <input
            type="number"
            value={draft.ends_at_question_number ?? ""}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                ends_at_question_number: event.target.value ? Number(event.target.value) : null,
              }))
            }
            className={inputClassName}
          />
        </Field>
        <Field label="Instructions">
          <textarea
            value={draft.instructions}
            onChange={(event) => setDraft((current) => ({ ...current, instructions: event.target.value }))}
            className={`${inputClassName} min-h-24 resize-y`}
          />
        </Field>
        <div className="flex items-end">
          <button type="button" onClick={() => void handleCreate()} disabled={saving} className={`${primaryButtonClassName} w-full`}>
            {saving ? "Saving..." : "Add Section"}
          </button>
        </div>
      </div>

      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading sections...</p>
      ) : sections.length === 0 ? (
        <p className="text-sm text-zinc-500">No sections yet. Add the first section above.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {sections.map((section) => (
            <SectionRow
              key={section.id}
              section={section}
              disabled={saving}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionRow({
  section,
  disabled,
  onSave,
  onDelete,
}: {
  section: PaperSectionAdminDto;
  disabled: boolean;
  onSave: (sectionId: string, nextDraft: SectionDraft) => Promise<void>;
  onDelete: (sectionId: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState<SectionDraft>(() => toDraft(section));

  useEffect(() => {
    setDraft(toDraft(section));
  }, [section]);

  return (
    <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-4 lg:grid-cols-5">
      <Field label="Code">
        <input
          value={draft.section_code}
          onChange={(event) => setDraft((current) => ({ ...current, section_code: event.target.value }))}
          className={inputClassName}
        />
      </Field>
      <Field label="Title">
        <input
          value={draft.title}
          onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
          className={inputClassName}
        />
      </Field>
      <Field label="Order">
        <input
          type="number"
          value={draft.order_index}
          onChange={(event) => setDraft((current) => ({ ...current, order_index: Number(event.target.value) || 0 }))}
          className={inputClassName}
        />
      </Field>
      <Field label="Mode">
        <select
          value={draft.question_selection_mode}
          onChange={(event) => setDraft((current) => ({ ...current, question_selection_mode: event.target.value }))}
          className={inputClassName}
        >
          {PAPER_SECTION_SELECTION_MODE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Required Count">
        <input
          type="number"
          value={draft.required_count ?? ""}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              required_count: event.target.value ? Number(event.target.value) : null,
            }))
          }
          className={inputClassName}
        />
      </Field>
      <Field label="Max Marks">
        <input
          type="number"
          value={draft.max_marks ?? ""}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              max_marks: event.target.value ? Number(event.target.value) : null,
            }))
          }
          className={inputClassName}
        />
      </Field>
      <Field label="Starts At">
        <input
          type="number"
          value={draft.starts_at_question_number ?? ""}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              starts_at_question_number: event.target.value ? Number(event.target.value) : null,
            }))
          }
          className={inputClassName}
        />
      </Field>
      <Field label="Ends At">
        <input
          type="number"
          value={draft.ends_at_question_number ?? ""}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              ends_at_question_number: event.target.value ? Number(event.target.value) : null,
            }))
          }
          className={inputClassName}
        />
      </Field>
      <Field label="Instructions">
        <textarea
          value={draft.instructions}
          onChange={(event) => setDraft((current) => ({ ...current, instructions: event.target.value }))}
          className={`${inputClassName} min-h-24 resize-y`}
        />
      </Field>
      <div className="flex items-end gap-2">
        <button type="button" disabled={disabled} onClick={() => void onSave(section.id, draft)} className={primaryButtonClassName}>
          Save
        </button>
        <button type="button" disabled={disabled} onClick={() => void onDelete(section.id)} className={secondaryButtonClassName}>
          Delete
        </button>
      </div>
    </div>
  );
}
