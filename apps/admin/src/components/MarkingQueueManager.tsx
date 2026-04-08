"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestJson } from "@/lib/adminApi";
import type {
  MarkingDetailAdminDto,
  MarkingQueueItemAdminDto,
  PaperQuestionPartAdminDto,
  PaperStructureQuestionAdminDto,
} from "@/lib/content";
import { Field, inputClassName, primaryButtonClassName, secondaryButtonClassName, textAreaClassName } from "@/components/AdminForm";
import { EmptyState, SurfaceCard } from "@/components/AdminUi";

type DraftCriterion = {
  criterion_id: string | null;
  label: string;
  final_score: number | null;
  comment: string;
};

type ReviewDraft = {
  attempt_answer_id: string;
  paper_question_id: string | null;
  marker_mode: string;
  status: string;
  overall_comment: string;
  final_total: number | null;
  criterion_marks: DraftCriterion[];
};

type ManualEntry = {
  answerId: string;
  paperQuestionId: string;
  questionNumber: number | null;
  questionStem: string;
  questionType: string;
  part: PaperQuestionPartAdminDto | null;
  answerText: string;
  rubricId: string | null;
};

function renderAnswerValue(answer: MarkingDetailAdminDto["answers"][number]): string {
  if (answer.selected_option) return `Selected option: ${answer.selected_option}`;
  if (answer.text_answer) return answer.text_answer;
  if (answer.numeric_answer !== null && answer.numeric_answer !== undefined) return String(answer.numeric_answer);
  if (answer.answer_payload) return JSON.stringify(answer.answer_payload, null, 2);
  return "No response saved";
}

export function MarkingQueueManager({
  token,
  examPath,
}: {
  token: string;
  examPath: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [queue, setQueue] = useState<MarkingQueueItemAdminDto[]>([]);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MarkingDetailAdminDto | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingQueue(true);
    requestJson<MarkingQueueItemAdminDto[]>(`/admin/marking/queue?exam_path=${examPath}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((data) => {
        if (cancelled) return;
        setQueue(data);
        setSelectedAttemptId((current) => current ?? data[0]?.id ?? null);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "Failed to load marking queue");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingQueue(false);
      });

    return () => {
      cancelled = true;
    };
  }, [examPath, token]);

  useEffect(() => {
    if (!selectedAttemptId) {
      setDetail(null);
      setDrafts({});
      return;
    }

    let cancelled = false;
    setLoadingDetail(true);
    requestJson<MarkingDetailAdminDto>(`/admin/marking/attempts/${selectedAttemptId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        setDrafts(buildReviewDrafts(data));
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "Failed to load attempt detail");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedAttemptId, token]);

  const manualEntries = useMemo(() => {
    if (!detail) return [];
    return buildManualEntries(detail);
  }, [detail]);

  function refreshPage() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function saveReviews(status: "draft" | "finalized") {
    if (!selectedAttemptId) return;

    setSaving(true);
    setError(null);

    try {
      await requestJson(`/admin/marking/attempts/${selectedAttemptId}/review`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reviews: Object.values(drafts).map((draft) => ({
            ...draft,
            status,
            criterion_marks: draft.criterion_marks.map((criterion) => ({
              criterion_id: criterion.criterion_id,
              final_score: criterion.final_score,
              score: criterion.final_score,
              comment: criterion.comment || null,
            })),
          })),
        }),
      });

      const refreshedDetail = await requestJson<MarkingDetailAdminDto>(`/admin/marking/attempts/${selectedAttemptId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      setDetail(refreshedDetail);
      setDrafts(buildReviewDrafts(refreshedDetail));
      refreshPage();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to save marking review");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <SurfaceCard title="Marking Queue" description="Submitted attempts with pending manual work appear here for criterion-by-criterion review.">
        {loadingQueue ? (
          <p className="text-sm text-zinc-500">Loading queue...</p>
        ) : queue.length === 0 ? (
          <EmptyState title="No pending attempts" description="Manual marking work will appear here once learners submit hybrid or manual papers." />
        ) : (
          <div className="flex flex-col gap-2">
            {queue.map((item) => {
              const active = item.id === selectedAttemptId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedAttemptId(item.id)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    active
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-200 bg-zinc-50 text-zinc-900 hover:border-zinc-300 hover:bg-white"
                  }`}
                >
                  <p className="text-sm font-semibold">
                    {item.exam_papers?.title ?? "Untitled paper"}
                  </p>
                  <p className={`mt-1 text-xs ${active ? "text-zinc-300" : "text-zinc-500"}`}>
                    {item.users?.full_name ?? item.users?.phone ?? "Unknown learner"} / {item.marking_status}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </SurfaceCard>

      <SurfaceCard
        title={detail?.structure.paper.title ?? "Attempt Detail"}
        description={detail ? `Attempt ${detail.attempt.id} / ${detail.attempt.status}` : "Choose an attempt from the queue to mark it."}
      >
        {!selectedAttemptId ? (
          <EmptyState title="Choose an attempt" description="Select a queued attempt from the left to review essay and structured answers." />
        ) : loadingDetail ? (
          <p className="text-sm text-zinc-500">Loading attempt detail...</p>
        ) : !detail ? (
          <EmptyState title="Attempt detail unavailable" description="The attempt could not be loaded. Refresh and try again." />
        ) : manualEntries.length === 0 ? (
          <EmptyState title="No manual answers found" description="This attempt has no selected answers waiting for manual review." />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <Stat label="Learner" value={detail.attempt.user_id ?? "Unknown"} />
              <Stat label="Marking" value={detail.attempt.marking_status} />
              <Stat label="Objective" value={String(detail.attempt.objective_score ?? "-")} />
              <Stat label="Final" value={String(detail.attempt.final_score ?? "-")} />
            </div>

            {manualEntries.map((entry) => {
              const draft = drafts[entry.answerId];
              if (!draft) return null;

              return (
                <div key={entry.answerId} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                      Q{entry.questionNumber ?? "-"} {entry.part ? `/ Part ${entry.part.part_label}` : ""} / {entry.questionType}
                    </p>
                    <p className="text-sm font-semibold text-zinc-950">{entry.questionStem}</p>
                    {entry.part ? <p className="text-sm text-zinc-600">{entry.part.body}</p> : null}
                    <pre className="whitespace-pre-wrap rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">
                      {entry.answerText}
                    </pre>
                  </div>

                  <div className="mt-4 flex flex-col gap-3">
                    {draft.criterion_marks.map((criterion, index) => (
                      <div key={`${entry.answerId}-${criterion.criterion_id ?? index}`} className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 md:grid-cols-[minmax(0,1fr)_140px]">
                        <Field label={criterion.label}>
                          <textarea
                            value={criterion.comment}
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [entry.answerId]: {
                                  ...draft,
                                  criterion_marks: draft.criterion_marks.map((item, itemIndex) =>
                                    itemIndex === index ? { ...item, comment: event.target.value } : item
                                  ),
                                },
                              }))
                            }
                            className={textAreaClassName}
                          />
                        </Field>
                        <Field label="Score">
                          <input
                            type="number"
                            value={criterion.final_score ?? ""}
                            onChange={(event) =>
                              setDrafts((current) => {
                                const nextCriterionMarks = draft.criterion_marks.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, final_score: event.target.value ? Number(event.target.value) : null }
                                    : item
                                );
                                return {
                                  ...current,
                                  [entry.answerId]: {
                                    ...draft,
                                    final_total: nextCriterionMarks.reduce((sum, item) => sum + Number(item.final_score ?? 0), 0),
                                    criterion_marks: nextCriterionMarks,
                                  },
                                };
                              })
                            }
                            className={inputClassName}
                          />
                        </Field>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
                    <Field label="Total">
                      <input
                        type="number"
                        value={draft.final_total ?? ""}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [entry.answerId]: {
                              ...draft,
                              final_total: event.target.value ? Number(event.target.value) : null,
                            },
                          }))
                        }
                        className={inputClassName}
                      />
                    </Field>
                    <Field label="Overall Comment">
                      <textarea
                        value={draft.overall_comment}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [entry.answerId]: {
                              ...draft,
                              overall_comment: event.target.value,
                            },
                          }))
                        }
                        className={textAreaClassName}
                      />
                    </Field>
                  </div>
                </div>
              );
            })}

            {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

            <div className="flex flex-wrap gap-3">
              <button type="button" disabled={saving} onClick={() => void saveReviews("draft")} className={secondaryButtonClassName}>
                {saving ? "Saving..." : "Save Draft"}
              </button>
              <button type="button" disabled={saving} onClick={() => void saveReviews("finalized")} className={primaryButtonClassName}>
                {saving ? "Saving..." : "Finalize Marks"}
              </button>
            </div>

            {isPending ? <p className="text-xs text-zinc-400">Refreshing marking data...</p> : null}
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-zinc-950">{value}</p>
    </div>
  );
}

function buildManualEntries(detail: MarkingDetailAdminDto): ManualEntry[] {
  const questionByPaperQuestionId = new Map(
    detail.structure.questions.map((paperQuestion) => [paperQuestion.id, paperQuestion] as const)
  );

  return detail.answers
    .filter((answer) => answer.is_selected_for_marking)
    .map((answer) => {
      const paperQuestion = questionByPaperQuestionId.get(answer.paper_question_id);
      if (!paperQuestion) return null;

      const part =
        paperQuestion.questions.question_parts?.find((candidate) => candidate.id === answer.question_part_id) ?? null;
      const autoMode = part?.auto_marking_mode ?? paperQuestion.questions.auto_marking_mode ?? "manual";
      const isManual = autoMode === "manual" || autoMode === "hybrid" || paperQuestion.questions.type === "essay";
      if (!isManual) return null;

      return {
        answerId: answer.id,
        paperQuestionId: answer.paper_question_id,
        questionNumber: answer.paper_question_id ? paperQuestion.question_number : null,
        questionStem: paperQuestion.questions.stem,
        questionType: paperQuestion.questions.type,
        part,
        answerText: renderAnswerValue(answer),
        rubricId: part?.rubric_id ?? paperQuestion.questions.rubric_id ?? null,
      } satisfies ManualEntry;
    })
    .filter((entry): entry is ManualEntry => Boolean(entry));
}

function buildReviewDrafts(detail: MarkingDetailAdminDto): Record<string, ReviewDraft> {
  const entries = buildManualEntries(detail);
  const rubricsById = new Map(detail.rubrics.map((rubric) => [rubric.id, rubric] as const));
  const reviewsByAnswerId = new Map(detail.reviews.map((review) => [review.attempt_answer_id, review] as const));
  const marksByAnswerId = new Map<string, MarkingDetailAdminDto["marks"]>();

  for (const mark of detail.marks) {
    const bucket = marksByAnswerId.get(mark.attempt_answer_id) ?? [];
    bucket.push(mark);
    marksByAnswerId.set(mark.attempt_answer_id, bucket);
  }

  return Object.fromEntries(
    entries.map((entry) => {
      const rubric = entry.rubricId ? rubricsById.get(entry.rubricId) : null;
      const review = reviewsByAnswerId.get(entry.answerId);
      const marks = marksByAnswerId.get(entry.answerId) ?? [];
      const criterionMarks =
        rubric && rubric.essay_rubric_criteria.length > 0
          ? rubric.essay_rubric_criteria.map((criterion) => {
              const mark = marks.find((candidate) => candidate.criterion_id === criterion.id);
              return {
                criterion_id: criterion.id,
                label: `${criterion.criterion_name} / ${criterion.max_marks} marks`,
                final_score: mark?.final_score ?? null,
                comment: mark?.comment ?? "",
              };
            })
          : [
              {
                criterion_id: null,
                label: "Total score",
                final_score: marks[0]?.final_score ?? review?.final_total ?? null,
                comment: marks[0]?.comment ?? "",
              },
            ];

      return [
        entry.answerId,
        {
          attempt_answer_id: entry.answerId,
          paper_question_id: entry.paperQuestionId,
          marker_mode: review?.marker_mode ?? "manual",
          status: review?.status ?? "draft",
          overall_comment: review?.overall_comment ?? "",
          final_total:
            review?.final_total ??
            criterionMarks.reduce((sum, criterion) => sum + Number(criterion.final_score ?? 0), 0),
          criterion_marks: criterionMarks,
        } satisfies ReviewDraft,
      ] as const;
    })
  );
}
