"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { isSuperAdminRole, type AdminUiExamPath } from "@/lib/admin";
import type { ContentTreeSubjectDto } from "@/lib/content";
import { secondaryButtonClassName } from "@/components/AdminForm";
import { SubjectForm } from "@/components/SubjectForm";
import { EmptyState, SurfaceCard } from "@/components/AdminUi";

type Props = {
  token: string;
  role: string;
  examPath: AdminUiExamPath;
  subjects: ContentTreeSubjectDto[];
};

export function SubjectsManager({ token, role, examPath, subjects }: Props) {
  const router = useRouter();
  const isSuperAdmin = isSuperAdminRole(role);
  const [isPending, startTransition] = useTransition();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(subjects[0]?.id ?? null);
  const [isCreating, setIsCreating] = useState(subjects.length === 0);
  const selectedSubject = !isCreating
    ? subjects.find((subject) => subject.id === selectedSubjectId) ?? subjects[0] ?? null
    : null;

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
    setSelectedSubjectId(null);
    setIsCreating(subjects.length <= 1);
    handleRefresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <SurfaceCard
        title="Subjects"
        description="Keep each catalog clean by managing subjects inside the active exam level."
        action={
          isSuperAdmin ? (
            <button
              type="button"
              onClick={() => {
                setIsCreating(true);
                setSelectedSubjectId(null);
              }}
              className={secondaryButtonClassName}
            >
              New Subject
            </button>
          ) : null
        }
      >
        {subjects.length === 0 ? (
          <EmptyState
            title={`No ${examPath} subjects yet`}
            description="Create the first subject for this exam level to start organizing topics, lessons, and papers."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {subjects.map((subject) => {
              const isActive = !isCreating && subject.id === selectedSubjectId;
              return (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setSelectedSubjectId(subject.id);
                  }}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    isActive
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-200 bg-zinc-50 text-zinc-900 hover:border-zinc-300 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{subject.name}</p>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${isActive ? "bg-white/15 text-white" : "bg-white text-zinc-500"}`}>
                      {subject.code ?? "No code"}
                    </span>
                  </div>
                  <p className={`mt-2 text-xs ${isActive ? "text-zinc-300" : "text-zinc-500"}`}>
                    {subject.topics.length} topic{subject.topics.length === 1 ? "" : "s"} in {examPath}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </SurfaceCard>

      <SurfaceCard
        title={isCreating ? "Create Subject" : selectedSubject ? selectedSubject.name : "Subject Details"}
        description={
          isSuperAdmin
            ? "Use stable names and codes so uploads, topics, and papers stay easy to manage."
            : "This view is read-only for your role."
        }
      >
        {!isSuperAdmin ? (
          <EmptyState
            title="Read-only access"
            description="Subject editing is limited to admin and super_admin accounts."
          />
        ) : (
          <SubjectForm
            token={token}
            examPath={examPath}
            subject={selectedSubject}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
          />
        )}

        {isPending ? <p className="mt-4 text-xs text-zinc-400">Refreshing subject data...</p> : null}
      </SurfaceCard>
    </div>
  );
}
