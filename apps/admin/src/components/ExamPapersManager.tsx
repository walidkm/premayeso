"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { hasPlatformAccess, type AdminRole, type AdminUiExamPath } from "@/lib/admin";
import type { ContentTreeSubjectDto, ExamPaperAdminDto, SchoolAdminDto } from "@/lib/content";
import { secondaryButtonClassName } from "@/components/AdminForm";
import { EmptyState, SurfaceCard } from "@/components/AdminUi";
import { ExamPaperForm } from "@/components/ExamPaperForm";
import { PaperSectionsEditor } from "@/components/PaperSectionsEditor";
import { PaperWorkbookImporter } from "@/components/PaperWorkbookImporter";

type Props = {
  token: string;
  role: AdminRole;
  examPath: AdminUiExamPath;
  subjects: ContentTreeSubjectDto[];
  schools: SchoolAdminDto[];
  papers: ExamPaperAdminDto[];
};

export function ExamPapersManager({ token, role, examPath, subjects, schools, papers }: Props) {
  const router = useRouter();
  const canManagePapers = hasPlatformAccess(role);
  const [isPending, startTransition] = useTransition();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(subjects[0]?.id ?? null);
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId) ?? subjects[0] ?? null;
  const filteredPapers = selectedSubject ? papers.filter((paper) => paper.subject_id === selectedSubject.id) : [];
  const selectedPaper =
    !isCreating && selectedPaperId ? filteredPapers.find((paper) => paper.id === selectedPaperId) ?? filteredPapers[0] ?? null : filteredPapers[0] ?? null;

  function handleRefresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  function handleSaved() {
    setIsCreating(false);
    handleRefresh();
  }

  function handleDeleted() {
    setSelectedPaperId(null);
    setIsCreating(filteredPapers.length <= 1);
    handleRefresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <SurfaceCard title="Exam Papers" description="Keep papers scoped to a subject and exam level so learners only see the right paper sets.">
        {subjects.length === 0 ? (
          <EmptyState
            title={`No ${examPath} subjects available`}
            description="Create a subject before adding exam papers for this level."
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
                    setIsCreating(false);
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

            {filteredPapers.length === 0 ? (
              <EmptyState
                title={`No exam papers for ${selectedSubject?.name ?? "this subject"}`}
                description="Use the editor on the right to create the first paper or upload a paper-backed question set."
              />
            ) : (
              <div className="flex flex-col gap-2">
                {filteredPapers.map((paper) => {
                  const isActive = !isCreating && paper.id === selectedPaperId;
                  return (
                    <button
                      key={paper.id}
                      type="button"
                      onClick={() => {
                        setIsCreating(false);
                        setSelectedPaperId(paper.id);
                      }}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        isActive
                          ? "border-zinc-950 bg-zinc-950 text-white"
                          : "border-zinc-200 bg-zinc-50 text-zinc-900 hover:border-zinc-300 hover:bg-white"
                      }`}
                    >
                      <p className="text-sm font-semibold">{paper.title ?? "Untitled paper"}</p>
                      <p className={`mt-1 text-xs ${isActive ? "text-zinc-300" : "text-zinc-500"}`}>
                        {paper.year ?? "No year"} / {paper.paper_type} / {paper.question_count ?? 0} linked questions
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
        title={isCreating ? "Create Exam Paper" : selectedPaper?.title ?? "Exam Paper Details"}
        description={
          selectedSubject
            ? `${selectedSubject.name} / ${examPath}`
            : "Choose a subject to manage papers."
        }
        action={
          canManagePapers && selectedSubject ? (
            <button
              type="button"
              onClick={() => {
                setSelectedPaperId(null);
                setIsCreating(true);
              }}
              className={secondaryButtonClassName}
            >
              New Exam Paper
            </button>
          ) : null
        }
      >
        {!selectedSubject ? (
          <EmptyState
            title="Choose a subject"
            description="Exam papers are always tied to a subject. Pick one from the left to continue."
          />
        ) : !canManagePapers ? (
          <EmptyState
            title="Read-only access"
            description="Exam paper editing is limited to platform-admin and super-admin accounts."
          />
        ) : (
          <div className="flex flex-col gap-6">
            <ExamPaperForm
              token={token}
              subjectId={selectedSubject.id}
              subjectName={selectedSubject.name}
              examPath={examPath}
              paper={selectedPaper}
              schools={schools}
              onSaved={handleSaved}
              onDeleted={handleDeleted}
            />

            <PaperWorkbookImporter token={token} onPublished={handleRefresh} />

            {selectedPaper ? (
              <PaperSectionsEditor token={token} paperId={selectedPaper.id} onChanged={handleRefresh} />
            ) : null}
          </div>
        )}

        {isPending ? <p className="mt-4 text-xs text-zinc-400">Refreshing paper data...</p> : null}
      </SurfaceCard>
    </div>
  );
}
