"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { isSuperAdminRole } from "@/lib/admin";
import type { ContentTreeSubjectDto, ContentTreeTopicDto } from "@/lib/content";
import { secondaryButtonClassName } from "@/components/AdminForm";
import { EmptyState, SurfaceCard } from "@/components/AdminUi";
import { TopicForm } from "@/components/TopicForm";

type Props = {
  token: string;
  role: string;
  subjects: ContentTreeSubjectDto[];
};

export function TopicsManager({ token, role, subjects }: Props) {
  const router = useRouter();
  const isSuperAdmin = isSuperAdminRole(role);
  const [isPending, startTransition] = useTransition();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(subjects[0]?.id ?? null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(subjects[0]?.topics[0]?.id ?? null);
  const [isCreating, setIsCreating] = useState(subjects.length > 0 && subjects[0].topics.length === 0);
  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId) ?? subjects[0] ?? null;
  const selectedTopic =
    !isCreating && selectedSubject && selectedTopicId
      ? selectedSubject.topics.find((topic) => topic.id === selectedTopicId) ?? selectedSubject.topics[0] ?? null
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
    setSelectedTopicId(null);
    setIsCreating(selectedSubject ? selectedSubject.topics.length <= 1 : false);
    handleRefresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <SurfaceCard title="Topics" description="Select a subject first, then manage the topics that belong to that exam-level catalog.">
        {subjects.length === 0 ? (
          <EmptyState
            title="No subjects available"
            description="Create subjects in this exam level first, then come back here to add topics."
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {subjects.map((subject) => {
                const isActive = subject.id === selectedSubjectId;
                return (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => {
                      setSelectedSubjectId(subject.id);
                      setSelectedTopicId(subject.topics[0]?.id ?? null);
                      setIsCreating(subject.topics.length === 0);
                    }}
                    className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-950"
                    }`}
                  >
                    {subject.name}
                  </button>
                );
              })}
            </div>

            {!selectedSubject ? null : selectedSubject.topics.length === 0 ? (
              <EmptyState
                title={`No topics in ${selectedSubject.name}`}
                description="Use the panel on the right to create the first topic under this subject."
              />
            ) : (
              <div className="flex flex-col gap-2">
                {selectedSubject.topics
                  .slice()
                  .sort((left, right) => left.order_index - right.order_index)
                  .map((topic) => {
                    const isActive = !isCreating && topic.id === selectedTopicId;
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => {
                          setIsCreating(false);
                          setSelectedTopicId(topic.id);
                        }}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          isActive
                            ? "border-zinc-950 bg-zinc-950 text-white"
                            : "border-zinc-200 bg-zinc-50 text-zinc-900 hover:border-zinc-300 hover:bg-white"
                        }`}
                      >
                        <p className="text-sm font-semibold">{topic.name}</p>
                        <p className={`mt-1 text-xs ${isActive ? "text-zinc-300" : "text-zinc-500"}`}>
                          {topic.form_level ?? "No form level"} / {topic.code ?? "No code"}
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
        title={isCreating ? "Create Topic" : selectedTopic?.name ?? "Topic Details"}
        description={
          selectedSubject
            ? `Topics under ${selectedSubject.name} automatically stay in ${selectedSubject.exam_path ?? "the current"} exam level.`
            : "Choose a subject to begin."
        }
        action={
          isSuperAdmin && selectedSubject ? (
            <button
              type="button"
              onClick={() => {
                setSelectedTopicId(null);
                setIsCreating(true);
              }}
              className={secondaryButtonClassName}
            >
              New Topic
            </button>
          ) : null
        }
      >
        {!selectedSubject ? (
          <EmptyState
            title="Choose a subject"
            description="The topic editor becomes available after you pick a subject from the list."
          />
        ) : !isSuperAdmin ? (
          <EmptyState
            title="Read-only access"
            description="Topic editing is limited to admin and super_admin accounts."
          />
        ) : (
          <TopicForm
            token={token}
            subjectId={selectedSubject.id}
            subjectName={selectedSubject.name}
            subjectExamPath={selectedSubject.exam_path ?? ""}
            topic={selectedTopic as ContentTreeTopicDto | null}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
          />
        )}

        {isPending ? <p className="mt-4 text-xs text-zinc-400">Refreshing topic data...</p> : null}
      </SurfaceCard>
    </div>
  );
}
