"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestJson } from "@/lib/adminApi";
import type {
  ContentTreeSubjectDto,
  EssayRubricAdminDto,
  EssayRubricCriterionAdminDto,
} from "@/lib/content";
import { Field, inputClassName, primaryButtonClassName, secondaryButtonClassName, textAreaClassName } from "@/components/AdminForm";
import { EmptyState, SurfaceCard } from "@/components/AdminUi";

type CriterionDraft = {
  criterion_name: string;
  max_marks: number;
  mark_bands_text: string;
  order_index: number;
};

type RubricDraft = {
  rubric_code: string;
  subject_id: string;
  title: string;
  description: string;
  criteria: CriterionDraft[];
};

const EMPTY_CRITERION: CriterionDraft = {
  criterion_name: "",
  max_marks: 0,
  mark_bands_text: "",
  order_index: 0,
};

const EMPTY_RUBRIC: RubricDraft = {
  rubric_code: "",
  subject_id: "",
  title: "",
  description: "",
  criteria: [{ ...EMPTY_CRITERION }],
};

function criteriaToDraft(criteria: EssayRubricCriterionAdminDto[]): CriterionDraft[] {
  if (criteria.length === 0) return [{ ...EMPTY_CRITERION }];
  return criteria
    .slice()
    .sort((left, right) => left.order_index - right.order_index)
    .map((criterion) => ({
      criterion_name: criterion.criterion_name,
      max_marks: criterion.max_marks,
      mark_bands_text: criterion.mark_bands.map((band) => `${band.key}: ${band.value}`).join("\n"),
      order_index: criterion.order_index,
    }));
}

function rubricToDraft(rubric: EssayRubricAdminDto | null): RubricDraft {
  if (!rubric) return EMPTY_RUBRIC;
  return {
    rubric_code: rubric.rubric_code ?? "",
    subject_id: rubric.subject_id ?? "",
    title: rubric.title,
    description: rubric.description ?? "",
    criteria: criteriaToDraft(rubric.essay_rubric_criteria),
  };
}

function parseBands(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex < 0) {
        return { key: `band_${index + 1}`, value: line };
      }
      return {
        key: line.slice(0, separatorIndex).trim() || `band_${index + 1}`,
        value: line.slice(separatorIndex + 1).trim(),
      };
    });
}

export function RubricsManager({
  token,
  examPath,
  subjects,
}: {
  token: string;
  examPath: string;
  subjects: ContentTreeSubjectDto[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rubrics, setRubrics] = useState<EssayRubricAdminDto[]>([]);
  const [selectedRubricId, setSelectedRubricId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RubricDraft>(EMPTY_RUBRIC);
  const [isCreating, setIsCreating] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRubric = rubrics.find((rubric) => rubric.id === selectedRubricId) ?? null;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    requestJson<EssayRubricAdminDto[]>(`/admin/rubrics?exam_path=${examPath}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((data) => {
        if (cancelled) return;
        setRubrics(data);
        const firstRubric = data[0] ?? null;
        setSelectedRubricId(firstRubric?.id ?? null);
        setDraft(rubricToDraft(firstRubric));
        setIsCreating(!firstRubric);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "Failed to load rubrics");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [examPath, token]);

  function handleRefresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  function selectRubric(rubric: EssayRubricAdminDto | null) {
    setSelectedRubricId(rubric?.id ?? null);
    setDraft(rubricToDraft(rubric));
    setIsCreating(!rubric);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const payload = {
        rubric_code: draft.rubric_code || null,
        exam_path: examPath,
        subject_id: draft.subject_id || null,
        title: draft.title,
        description: draft.description || null,
        criteria: draft.criteria.map((criterion, index) => ({
          criterion_name: criterion.criterion_name,
          max_marks: criterion.max_marks,
          mark_bands: parseBands(criterion.mark_bands_text),
          order_index: criterion.order_index || index,
        })),
      };

      const saved = await requestJson<EssayRubricAdminDto>(
        isCreating || !selectedRubric
          ? "/admin/rubrics"
          : `/admin/rubrics/${selectedRubric.id}`,
        {
          method: isCreating || !selectedRubric ? "POST" : "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (isCreating || !selectedRubric) {
        setRubrics((current) => [...current, saved].sort((left, right) => left.title.localeCompare(right.title)));
      } else {
        setRubrics((current) =>
          current
            .map((rubric) => (rubric.id === saved.id ? saved : rubric))
            .sort((left, right) => left.title.localeCompare(right.title))
        );
      }

      selectRubric(saved);
      handleRefresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to save rubric");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedRubric || !window.confirm("Delete this rubric?")) return;

    setSaving(true);
    setError(null);

    try {
      await requestJson<{ ok: true }>(`/admin/rubrics/${selectedRubric.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const nextRubrics = rubrics.filter((rubric) => rubric.id !== selectedRubric.id);
      setRubrics(nextRubrics);
      selectRubric(nextRubrics[0] ?? null);
      handleRefresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to delete rubric");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <SurfaceCard
        title="Rubrics"
        description="Create reusable essay and structured-answer rubrics that can be attached to questions and parts."
        action={
          <button type="button" onClick={() => selectRubric(null)} className={secondaryButtonClassName}>
            New Rubric
          </button>
        }
      >
        {loading ? (
          <p className="text-sm text-zinc-500">Loading rubrics...</p>
        ) : rubrics.length === 0 ? (
          <EmptyState title="No rubrics yet" description="Create the first rubric to support essay and structured marking." />
        ) : (
          <div className="flex flex-col gap-2">
            {rubrics.map((rubric) => {
              const active = rubric.id === selectedRubricId && !isCreating;
              return (
                <button
                  key={rubric.id}
                  type="button"
                  onClick={() => selectRubric(rubric)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    active
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-200 bg-zinc-50 text-zinc-900 hover:border-zinc-300 hover:bg-white"
                  }`}
                >
                  <p className="text-sm font-semibold">{rubric.title}</p>
                  <p className={`mt-1 text-xs ${active ? "text-zinc-300" : "text-zinc-500"}`}>
                    {rubric.rubric_code ?? "No code"} / {rubric.total_marks} marks / {rubric.essay_rubric_criteria.length} criteria
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </SurfaceCard>

      <SurfaceCard
        title={isCreating ? "Create Rubric" : selectedRubric?.title ?? "Rubric Editor"}
        description="Keep criterion bands concise and reusable across related paper questions."
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Rubric Code">
              <input
                value={draft.rubric_code}
                onChange={(event) => setDraft((current) => ({ ...current, rubric_code: event.target.value }))}
                className={inputClassName}
                placeholder="BIO-ESSAY-01"
              />
            </Field>
            <Field label="Subject">
              <select
                value={draft.subject_id}
                onChange={(event) => setDraft((current) => ({ ...current, subject_id: event.target.value }))}
                className={inputClassName}
              >
                <option value="">All subjects</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Title">
            <input
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              className={inputClassName}
            />
          </Field>

          <Field label="Description">
            <textarea
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              className={textAreaClassName}
            />
          </Field>

          <div className="flex flex-col gap-3">
            {draft.criteria.map((criterion, index) => (
              <div key={index} className="grid gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px_120px]">
                  <Field label="Criterion">
                    <input
                      value={criterion.criterion_name}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          criteria: current.criteria.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, criterion_name: event.target.value }
                              : item
                          ),
                        }))
                      }
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Max Marks">
                    <input
                      type="number"
                      value={criterion.max_marks}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          criteria: current.criteria.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, max_marks: Number(event.target.value) || 0 }
                              : item
                          ),
                        }))
                      }
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Order">
                    <input
                      type="number"
                      value={criterion.order_index}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          criteria: current.criteria.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, order_index: Number(event.target.value) || 0 }
                              : item
                          ),
                        }))
                      }
                      className={inputClassName}
                    />
                  </Field>
                </div>

                <Field label="Bands" hint="One band per line in the format label: description">
                  <textarea
                    value={criterion.mark_bands_text}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        criteria: current.criteria.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, mark_bands_text: event.target.value }
                            : item
                        ),
                      }))
                    }
                    className={textAreaClassName}
                  />
                </Field>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        criteria:
                          current.criteria.length === 1
                            ? [{ ...EMPTY_CRITERION }]
                            : current.criteria.filter((_, itemIndex) => itemIndex !== index),
                      }))
                    }
                    className={secondaryButtonClassName}
                  >
                    Remove Criterion
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                criteria: [
                  ...current.criteria,
                  { ...EMPTY_CRITERION, order_index: current.criteria.length },
                ],
              }))
            }
            className={secondaryButtonClassName}
          >
            Add Criterion
          </button>

          {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void handleSave()} disabled={saving} className={primaryButtonClassName}>
              {saving ? "Saving..." : isCreating ? "Create Rubric" : "Save Rubric"}
            </button>
            {!isCreating && selectedRubric ? (
              <button type="button" onClick={() => void handleDelete()} disabled={saving} className={secondaryButtonClassName}>
                Delete Rubric
              </button>
            ) : null}
          </div>

          {isPending ? <p className="text-xs text-zinc-400">Refreshing rubric data...</p> : null}
        </div>
      </SurfaceCard>
    </div>
  );
}
