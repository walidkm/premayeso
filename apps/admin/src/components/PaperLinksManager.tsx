"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { isSuperAdminRole } from "@/lib/admin";
import { requestJson } from "@/lib/adminApi";
import type {
  ContentTreeSubjectDto,
  ExamPaperAdminDto,
  PaperQuestionAdminDto,
  QuestionAdminDto,
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
          section,
        }),
      });
      setOrderIndex(0);
      setSection("");
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
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_120px_120px_auto]">
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
                <Field label="Section">
                  <input value={section} onChange={(event) => setSection(event.target.value)} className={inputClassName} />
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
                  <PaperLinkRow key={link.id} token={token} link={link} onChanged={handleRefresh} />
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
  onChanged,
}: {
  token: string;
  link: PaperQuestionAdminDto;
  onChanged: () => void;
}) {
  const [orderIndex, setOrderIndex] = useState(link.order_index);
  const [section, setSection] = useState(link.section ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await requestJson(`/admin/paper-questions/${link.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ order_index: orderIndex, section }),
      });
      onChanged();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Update failed");
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
            {link.questions?.question_no ?? link.question_id}
          </p>
          <p className="mt-1 text-sm leading-6 text-zinc-600">{link.questions?.stem ?? "Question unavailable"}</p>
          <p className="mt-2 text-xs text-zinc-400">
            {link.questions?.type ?? "unknown"} / {link.questions?.difficulty ?? "unknown"} / {link.questions?.marks ?? 0} marks
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[110px_140px_auto_auto] lg:w-auto">
          <Field label="Order">
            <input
              type="number"
              value={orderIndex}
              onChange={(event) => setOrderIndex(Number(event.target.value) || 0)}
              className={inputClassName}
            />
          </Field>
          <Field label="Section">
            <input value={section} onChange={(event) => setSection(event.target.value)} className={inputClassName} />
          </Field>
          <div className="flex items-end">
            <button type="button" onClick={handleSave} disabled={saving} className={`${primaryButtonClassName} w-full`}>
              {saving ? "Saving..." : "Save"}
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

      {error ? <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
