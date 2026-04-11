"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { canEditLessons, type AdminRole } from "@/lib/admin";
import {
  getLessonContentMode,
  getPersistedLessonBlocks,
  type ContentTreeSubjectDto,
  type LessonAdminDto,
} from "@/lib/content";
import { secondaryButtonClassName } from "@/components/AdminForm";
import { EmptyState, SurfaceCard } from "@/components/AdminUi";
import { LessonEditor } from "@/components/LessonEditor";

type Props = {
  token: string;
  role: AdminRole;
  subjects: ContentTreeSubjectDto[];
  lessons: LessonAdminDto[];
};

export function LessonsManager({ token, role, subjects, lessons }: Props) {
  const router = useRouter();
  const canEdit = canEditLessons(role);
  const [isPending, startTransition] = useTransition();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(subjects[0]?.id ?? null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(subjects[0]?.topics[0]?.id ?? null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId) ?? subjects[0] ?? null;
  const selectedTopic = selectedSubject?.topics.find((topic) => topic.id === selectedTopicId) ?? selectedSubject?.topics[0] ?? null;
  const topicLessons = selectedTopic ? lessons.filter((lesson) => lesson.topic_id === selectedTopic.id) : [];
  const selectedLesson = !isCreating
    ? topicLessons.find((lesson) => lesson.id === selectedLessonId) ?? topicLessons[0] ?? null
    : null;

  function handleRefresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  function handleSaved(savedLesson: LessonAdminDto) {
    setSelectedLessonId(savedLesson.id);
    setIsCreating(false);
    handleRefresh();
  }

  function handleDeleted() {
    setSelectedLessonId(null);
    setIsCreating(topicLessons.length <= 1);
    handleRefresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <SurfaceCard title="Lessons" description="Move from subject to topic, then manage the lessons attached to that topic.">
        {subjects.length === 0 ? (
          <EmptyState
            title="No subjects available"
            description="Create subjects and topics first. Lessons are always created under a topic."
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
                    setSelectedTopicId(subject.topics[0]?.id ?? null);
                    setSelectedLessonId(null);
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

            {!selectedSubject || selectedSubject.topics.length === 0 ? (
              <EmptyState
                title="No topics available"
                description="Create a topic under this subject before adding lessons."
              />
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {selectedSubject.topics.map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => {
                        setSelectedTopicId(topic.id);
                        setSelectedLessonId(null);
                        setIsCreating(false);
                      }}
                      className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                        topic.id === selectedTopicId
                          ? "border-zinc-950 bg-zinc-950 text-white"
                          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-950"
                      }`}
                    >
                      {topic.name}
                    </button>
                  ))}
                </div>

                {topicLessons.length === 0 ? (
                  <EmptyState
                    title={`No lessons in ${selectedTopic?.name ?? "this topic"}`}
                    description="Use the editor on the right to create the first lesson."
                  />
                ) : (
                  <div className="flex flex-col gap-2">
                    {topicLessons
                      .slice()
                      .sort((left, right) => left.order_index - right.order_index)
                      .map((lesson) => {
                        const blockCount = getPersistedLessonBlocks(lesson).length;
                        const contentMode = getLessonContentMode(lesson);
                        const contentLabel =
                          contentMode === "structured"
                            ? `${blockCount} block${blockCount === 1 ? "" : "s"}`
                            : contentMode === "legacy"
                            ? `legacy ${lesson.content_type ?? "text"}`
                            : "empty";
                        const isActive = !isCreating && lesson.id === selectedLesson?.id;
                        return (
                          <button
                            key={lesson.id}
                            type="button"
                            onClick={() => {
                              setIsCreating(false);
                              setSelectedLessonId(lesson.id);
                            }}
                            className={`rounded-2xl border px-4 py-3 text-left transition ${
                              isActive
                                ? "border-zinc-950 bg-zinc-950 text-white"
                                : "border-zinc-200 bg-zinc-50 text-zinc-900 hover:border-zinc-300 hover:bg-white"
                            }`}
                          >
                            <p className="text-sm font-semibold">{lesson.title}</p>
                            <p className={`mt-1 text-xs ${isActive ? "text-zinc-300" : "text-zinc-500"}`}>
                              {contentLabel} / {lesson.tier_gate ?? "free"}
                            </p>
                          </button>
                        );
                      })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </SurfaceCard>

      <SurfaceCard
        title={isCreating ? "Create Lesson" : selectedLesson?.title ?? "Lesson Details"}
        description={selectedTopic ? `${selectedSubject?.name} / ${selectedTopic.name}` : "Choose a topic to begin."}
        action={
          canEdit && selectedTopic ? (
            <button
              type="button"
              onClick={() => {
                setSelectedLessonId(null);
                setIsCreating(true);
              }}
              className={secondaryButtonClassName}
            >
              New Lesson
            </button>
          ) : null
        }
      >
        {!selectedTopic ? (
          <EmptyState
            title="Choose a topic"
            description="Lessons are always attached to a topic. Select a topic from the left to begin."
          />
        ) : !canEdit ? (
          <EmptyState
            title="Read-only access"
            description="Lesson editing is limited to content-author, school-admin, platform-admin, and super-admin accounts."
          />
        ) : (
          <LessonEditor
            token={token}
            topicId={selectedTopic.id}
            topicName={selectedTopic.name}
            subjectName={selectedSubject?.name ?? ""}
            examPath={selectedSubject?.exam_path ?? ""}
            lesson={selectedLesson}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
          />
        )}

        {isPending ? <p className="mt-4 text-xs text-zinc-400">Refreshing lesson data...</p> : null}
      </SurfaceCard>
    </div>
  );
}
