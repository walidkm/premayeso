"use client";

import { type FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { isSuperAdminRole } from "@/lib/admin";
import { requestJson } from "@/lib/adminApi";
import {
  QUESTION_AUTO_MARKING_MODE_OPTIONS,
  type EssayRubricAdminDto,
  type ContentTreeSubjectDto,
  type ExamPaperAdminDto,
  type PaperQuestionAdminDto,
  type PaperQuestionPartAdminDto,
  type PaperSectionAdminDto,
  type PaperStructureAdminDto,
  type PaperStructureQuestionAdminDto,
  type QuestionAdminDto,
} from "@/lib/content";
import { Field, inputClassName, primaryButtonClassName } from "@/components/AdminForm";
import { EmptyState, SurfaceCard } from "@/components/AdminUi";

type Props = {
  token: string;
  role: string;
  subjects: ContentTreeSubjectDto[];
  papers: ExamPaperAdminDto[];
  questions: QuestionAdminDto[];
  links: PaperQuestionAdminDto[];
};

export function PaperLinksManager({ token, role, subjects, papers, questions, links }: Props) {
  const router = useRouter();
  const isSuperAdmin = isSuperAdminRole(role);
  const [isPending, startTransition] = useTransition();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(subjects[0]?.id ?? null);
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const [questionId, setQuestionId] = useState("");
  const [orderIndex, setOrderIndex] = useState(0);
  const [section, setSection] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [questionNumber, setQuestionNumber] = useState<number | "">("");
  const [sections, setSections] = useState<PaperSectionAdminDto[]>([]);
  const [structure, setStructure] = useState<PaperStructureAdminDto | null>(null);
  const [rubrics, setRubrics] = useState<EssayRubricAdminDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId) ?? subjects[0] ?? null;
  const subjectTopicIds = new Set(selectedSubject?.topics.map((topic) => topic.id) ?? []);
  const subjectQuestions = questions.filter((question) => question.topic_id && subjectTopicIds.has(question.topic_id));
  const subjectPapers = papers.filter((paper) => paper.subject_id === selectedSubject?.id);
  const selectedPaper = subjectPapers.find((paper) => paper.id === selectedPaperId) ?? subjectPapers[0] ?? null;
  const paperLinks = links
    .filter((link) => link.exam_paper_id === selectedPaper?.id)
    .slice()
    .sort((left, right) => left.order_index - right.order_index);
  const linkedQuestionIds = new Set(paperLinks.map((link) => link.question_id));
  const candidateQuestions = subjectQuestions.filter((question) => !linkedQuestionIds.has(question.id));
  const activeQuestionId = candidateQuestions.some((question) => question.id === questionId)
    ? questionId
    : candidateQuestions[0]?.id ?? "";
  const activeSectionCode = sections.find((candidate) => candidate.id === sectionId)?.section_code ?? section;

  useEffect(() => {
    let cancelled = false;

    if (!selectedPaper?.id) {
      setSections([]);
      setStructure(null);
      setRubrics([]);
      return;
    }

    Promise.all([
      requestJson<PaperSectionAdminDto[]>(`/admin/exam-papers/${selectedPaper.id}/sections`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }),
      requestJson<PaperStructureAdminDto>(`/admin/exam-papers/${selectedPaper.id}/structure`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }),
      requestJson<EssayRubricAdminDto[]>(`/admin/rubrics?subject_id=${selectedPaper.subject_id ?? ""}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(([nextSections, nextStructure, nextRubrics]) => {
        if (cancelled) return;
        setSections(nextSections);
        setStructure(nextStructure);
        setRubrics(nextRubrics);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "Failed to load paper structure");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPaper?.id, selectedPaper?.subject_id, token]);

  function handleRefresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleLinkSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPaper || !activeQuestionId) return;

    setSaving(true);
    setError(null);
    try {
      await requestJson(`/admin/exam-papers/${selectedPaper.id}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question_id: activeQuestionId,
          order_index: orderIndex,
          section: activeSectionCode,
          section_id: sectionId || null,
          question_number: questionNumber === "" ? null : questionNumber,
        }),
      });
      setOrderIndex(0);
      setSection("");
      setSectionId("");
      setQuestionNumber("");
      handleRefresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Link failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <SurfaceCard title="Paper Links" description="Attach approved questions to the correct paper without mixing subjects or exam levels.">
        {subjects.length === 0 ? (
          <EmptyState
            title="No subjects available"
            description="Create subjects, topics, questions, and papers first. Then come back here to build paper layouts."
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {subjects.map((subject) => (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => {
                    setSelectedSubjectId(subject.id);
                    setSelectedPaperId(null);
                    setQuestionId("");
                    setError(null);
                  }}
                  className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                    subject.id === selectedSubjectId
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-950"
                  }`}
                >
                  {subject.name}
                </button>
              ))}
            </div>

            {subjectPapers.length === 0 ? (
              <EmptyState
                title={`No papers for ${selectedSubject?.name ?? "this subject"}`}
                description="Create an exam paper first. Paper links are managed paper by paper."
              />
            ) : (
              <div className="flex flex-col gap-2">
                {subjectPapers.map((paper) => {
                  const isActive = paper.id === selectedPaper?.id;
                  return (
                    <button
                      key={paper.id}
                      type="button"
                      onClick={() => {
                        setSelectedPaperId(paper.id);
                        setError(null);
                      }}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        isActive
                          ? "border-zinc-950 bg-zinc-950 text-white"
                          : "border-zinc-200 bg-zinc-50 text-zinc-900 hover:border-zinc-300 hover:bg-white"
                      }`}
                    >
                      <p className="text-sm font-semibold">{paper.title ?? "Untitled paper"}</p>
                      <p className={`mt-1 text-xs ${isActive ? "text-zinc-300" : "text-zinc-500"}`}>
                        {paper.year ?? "No year"} / {paper.question_count ?? 0} linked questions
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </SurfaceCard>

      <SurfaceCard
        title={selectedPaper?.title ?? "Paper Link Editor"}
        description={
          selectedPaper
            ? `Only questions from ${selectedSubject?.name ?? "the selected subject"} can be linked here.`
            : "Choose a paper from the left to manage its linked questions."
        }
      >
        {!selectedPaper ? (
          <EmptyState
            title="Choose a paper"
            description="Select an exam paper from the left to add, reorder, or remove linked questions."
          />
        ) : !isSuperAdmin ? (
          <EmptyState
            title="Read-only access"
            description="Paper-question linking is limited to admin and super_admin accounts."
          />
        ) : (
          <div className="flex flex-col gap-6">
            <form onSubmit={handleLinkSubmit} className="grid gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_100px_120px_160px_auto]">
                <Field label="Question">
                  <select
                    value={activeQuestionId}
                    onChange={(event) => setQuestionId(event.target.value)}
                    className={inputClassName}
                  >
                    {candidateQuestions.map((question) => (
                      <option key={question.id} value={question.id}>
                        {(question.question_no ?? question.id).slice(0, 18)} - {question.stem.slice(0, 80)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Order">
                  <input
                    type="number"
                    value={orderIndex}
                    onChange={(event) => setOrderIndex(Number(event.target.value) || 0)}
                    className={inputClassName}
                  />
                </Field>
                <Field label="Question No.">
                  <input
                    type="number"
                    value={questionNumber}
                    onChange={(event) => setQuestionNumber(event.target.value ? Number(event.target.value) : "")}
                    className={inputClassName}
                  />
                </Field>
                <Field label="Section">
                  {sections.length > 0 ? (
                    <select value={sectionId} onChange={(event) => setSectionId(event.target.value)} className={inputClassName}>
                      <option value="">No section</option>
                      {sections.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.section_code} - {candidate.title ?? "Untitled section"}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input value={section} onChange={(event) => setSection(event.target.value)} className={inputClassName} />
                  )}
                </Field>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={saving || !activeQuestionId}
                    className={`${primaryButtonClassName} w-full`}
                  >
                    {saving ? "Linking..." : "Add Link"}
                  </button>
                </div>
              </div>
              {candidateQuestions.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  Every available question for this subject is already linked to the selected paper.
                </p>
              ) : null}
            </form>

            {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

            {paperLinks.length === 0 ? (
              <EmptyState
                title="No linked questions yet"
                description="Use the form above to start building the paper layout."
              />
            ) : (
              <div className="flex flex-col gap-3">
                {paperLinks.map((link) => (
                  <PaperLinkRow
                    key={link.id}
                    token={token}
                    link={link}
                    sections={sections}
                    structureQuestion={structure?.questions.find((question) => question.id === link.id) ?? null}
                    rubrics={rubrics}
                    onChanged={handleRefresh}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {isPending ? <p className="mt-4 text-xs text-zinc-400">Refreshing paper links...</p> : null}
      </SurfaceCard>
    </div>
  );
}

function PaperLinkRow({
  token,
  link,
  sections,
  structureQuestion,
  rubrics,
  onChanged,
}: {
  token: string;
  link: PaperQuestionAdminDto;
  sections: PaperSectionAdminDto[];
  structureQuestion: PaperStructureQuestionAdminDto | null;
  rubrics: EssayRubricAdminDto[];
  onChanged: () => void;
}) {
  const [orderIndex, setOrderIndex] = useState(link.order_index);
  const [section, setSection] = useState(link.section ?? "");
  const [sectionId, setSectionId] = useState(link.section_id ?? "");
  const [questionNumber, setQuestionNumber] = useState<number | "">(link.question_number ?? "");
  const [editorOpen, setEditorOpen] = useState(false);
  const [questionDraft, setQuestionDraft] = useState({
    stem: structureQuestion?.questions.stem ?? link.questions?.stem ?? "",
    type: structureQuestion?.questions.type ?? link.questions?.type ?? "short_answer",
    marks: structureQuestion?.questions.marks ?? link.questions?.marks ?? 0,
    explanation: structureQuestion?.questions.explanation ?? "",
    expected_answer: structureQuestion?.questions.expected_answer ?? "",
    rubric_id: structureQuestion?.questions.rubric_id ?? "",
    auto_marking_mode: structureQuestion?.questions.auto_marking_mode ?? "manual",
  });
  const [partsDraft, setPartsDraft] = useState<PaperQuestionPartAdminDto[]>(
    structureQuestion?.questions.question_parts?.map((part) => ({ ...part })) ?? []
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOrderIndex(link.order_index);
    setSection(link.section ?? "");
    setSectionId(link.section_id ?? "");
    setQuestionNumber(link.question_number ?? "");
  }, [link]);

  useEffect(() => {
    setQuestionDraft({
      stem: structureQuestion?.questions.stem ?? link.questions?.stem ?? "",
      type: structureQuestion?.questions.type ?? link.questions?.type ?? "short_answer",
      marks: structureQuestion?.questions.marks ?? link.questions?.marks ?? 0,
      explanation: structureQuestion?.questions.explanation ?? "",
      expected_answer: structureQuestion?.questions.expected_answer ?? "",
      rubric_id: structureQuestion?.questions.rubric_id ?? "",
      auto_marking_mode: structureQuestion?.questions.auto_marking_mode ?? "manual",
    });
    setPartsDraft(structureQuestion?.questions.question_parts?.map((part) => ({ ...part })) ?? []);
  }, [link.questions?.marks, link.questions?.stem, link.questions?.type, structureQuestion]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const resolvedSectionCode = sections.find((candidate) => candidate.id === sectionId)?.section_code ?? section;
      await requestJson(`/admin/paper-questions/${link.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          order_index: orderIndex,
          section: resolvedSectionCode,
          section_id: sectionId || null,
          question_number: questionNumber === "" ? null : questionNumber,
        }),
      });
      onChanged();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleQuestionSave() {
    setSaving(true);
    setError(null);

    try {
      await requestJson(`/admin/questions/${link.question_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...questionDraft,
          rubric_id: questionDraft.rubric_id || null,
          explanation: questionDraft.explanation || null,
          expected_answer: questionDraft.expected_answer || null,
        }),
      });

      await requestJson(`/admin/questions/${link.question_id}/parts`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          parts: partsDraft.map((part, index) => ({
            part_label: part.part_label,
            body: part.body,
            marks: part.marks,
            expected_answer: part.expected_answer || null,
            rubric_id: part.rubric_id || null,
            auto_marking_mode: part.auto_marking_mode,
            order_index: part.order_index ?? index,
          })),
        }),
      });

      onChanged();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Question update failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Remove this question from the paper?")) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await requestJson(`/admin/paper-questions/${link.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      onChanged();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900">
            {link.question_number ?? "-"} / {link.questions?.question_no ?? link.question_id}
          </p>
          <p className="mt-1 text-sm leading-6 text-zinc-600">{link.questions?.stem ?? "Question unavailable"}</p>
          <p className="mt-2 text-xs text-zinc-400">
            {link.questions?.type ?? "unknown"} / {link.questions?.difficulty ?? "unknown"} / {link.questions?.marks ?? 0} marks / {(sections.find((candidate) => candidate.id === (sectionId || link.section_id))?.section_code ?? section) || "No section"}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[100px_120px_160px_auto_auto_auto] lg:w-auto">
          <Field label="Order">
            <input
              type="number"
              value={orderIndex}
              onChange={(event) => setOrderIndex(Number(event.target.value) || 0)}
              className={inputClassName}
            />
          </Field>
          <Field label="Question No.">
            <input
              type="number"
              value={questionNumber}
              onChange={(event) => setQuestionNumber(event.target.value ? Number(event.target.value) : "")}
              className={inputClassName}
            />
          </Field>
          <Field label="Section">
            {sections.length > 0 ? (
              <select value={sectionId} onChange={(event) => setSectionId(event.target.value)} className={inputClassName}>
                <option value="">No section</option>
                {sections.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.section_code} - {candidate.title ?? "Untitled section"}
                  </option>
                ))}
              </select>
            ) : (
              <input value={section} onChange={(event) => setSection(event.target.value)} className={inputClassName} />
            )}
          </Field>
          <div className="flex items-end">
            <button type="button" onClick={handleSave} disabled={saving} className={`${primaryButtonClassName} w-full`}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setEditorOpen((current) => !current)}
              className="w-full rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              {editorOpen ? "Close Editor" : "Edit Question"}
            </button>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="w-full rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? "Removing..." : "Remove"}
            </button>
          </div>
        </div>
      </div>

      {editorOpen ? (
        <div className="mt-4 grid gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Stem">
              <textarea
                value={questionDraft.stem}
                onChange={(event) => setQuestionDraft((current) => ({ ...current, stem: event.target.value }))}
                className={`${inputClassName} min-h-28 resize-y`}
              />
            </Field>
            <div className="grid gap-4">
              <Field label="Type">
                <input
                  value={questionDraft.type}
                  onChange={(event) => setQuestionDraft((current) => ({ ...current, type: event.target.value }))}
                  className={inputClassName}
                />
              </Field>
              <Field label="Marks">
                <input
                  type="number"
                  value={questionDraft.marks}
                  onChange={(event) => setQuestionDraft((current) => ({ ...current, marks: Number(event.target.value) || 0 }))}
                  className={inputClassName}
                />
              </Field>
              <Field label="Auto Marking">
                <select
                  value={questionDraft.auto_marking_mode}
                  onChange={(event) => setQuestionDraft((current) => ({ ...current, auto_marking_mode: event.target.value as (typeof QUESTION_AUTO_MARKING_MODE_OPTIONS)[number] }))}
                  className={inputClassName}
                >
                  {QUESTION_AUTO_MARKING_MODE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Rubric">
                <select
                  value={questionDraft.rubric_id}
                  onChange={(event) => setQuestionDraft((current) => ({ ...current, rubric_id: event.target.value }))}
                  className={inputClassName}
                >
                  <option value="">No rubric</option>
                  {rubrics.map((rubric) => (
                    <option key={rubric.id} value={rubric.id}>
                      {rubric.title}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Expected Answer">
              <textarea
                value={questionDraft.expected_answer}
                onChange={(event) => setQuestionDraft((current) => ({ ...current, expected_answer: event.target.value }))}
                className={`${inputClassName} min-h-24 resize-y`}
              />
            </Field>
            <Field label="Explanation">
              <textarea
                value={questionDraft.explanation}
                onChange={(event) => setQuestionDraft((current) => ({ ...current, explanation: event.target.value }))}
                className={`${inputClassName} min-h-24 resize-y`}
              />
            </Field>
          </div>

          <div className="flex flex-col gap-3">
            {partsDraft.map((part, index) => (
              <div key={`${part.part_label}-${index}`} className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-4 lg:grid-cols-[120px_minmax(0,1fr)_100px_180px]">
                <Field label="Part">
                  <input
                    value={part.part_label}
                    onChange={(event) =>
                      setPartsDraft((current) =>
                        current.map((item, itemIndex) => itemIndex === index ? { ...item, part_label: event.target.value } : item)
                      )
                    }
                    className={inputClassName}
                  />
                </Field>
                <Field label="Body">
                  <textarea
                    value={part.body}
                    onChange={(event) =>
                      setPartsDraft((current) =>
                        current.map((item, itemIndex) => itemIndex === index ? { ...item, body: event.target.value } : item)
                      )
                    }
                    className={`${inputClassName} min-h-24 resize-y`}
                  />
                </Field>
                <Field label="Marks">
                  <input
                    type="number"
                    value={part.marks}
                    onChange={(event) =>
                      setPartsDraft((current) =>
                        current.map((item, itemIndex) => itemIndex === index ? { ...item, marks: Number(event.target.value) || 0 } : item)
                      )
                    }
                    className={inputClassName}
                  />
                </Field>
                <Field label="Rubric / Auto">
                  <div className="grid gap-2">
                    <select
                      value={part.rubric_id ?? ""}
                      onChange={(event) =>
                        setPartsDraft((current) =>
                          current.map((item, itemIndex) => itemIndex === index ? { ...item, rubric_id: event.target.value || null } : item)
                        )
                      }
                      className={inputClassName}
                    >
                      <option value="">No rubric</option>
                      {rubrics.map((rubric) => (
                        <option key={rubric.id} value={rubric.id}>
                          {rubric.title}
                        </option>
                      ))}
                    </select>
                    <select
                      value={part.auto_marking_mode}
                      onChange={(event) =>
                        setPartsDraft((current) =>
                          current.map((item, itemIndex) => itemIndex === index ? { ...item, auto_marking_mode: event.target.value as PaperQuestionPartAdminDto["auto_marking_mode"] } : item)
                        )
                      }
                      className={inputClassName}
                    >
                      {QUESTION_AUTO_MARKING_MODE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </Field>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                setPartsDraft((current) => [
                  ...current,
                  {
                    part_label: String.fromCharCode(97 + current.length),
                    body: "",
                    marks: 0,
                    expected_answer: null,
                    rubric_id: null,
                    auto_marking_mode: "manual",
                    order_index: current.length,
                  },
                ])
              }
              className="rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
            >
              Add Part
            </button>
            <button type="button" onClick={handleQuestionSave} disabled={saving} className={primaryButtonClassName}>
              {saving ? "Saving..." : "Save Question"}
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
