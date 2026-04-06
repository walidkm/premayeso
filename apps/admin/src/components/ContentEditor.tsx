"use client";

import { type Selection } from "./ContentSidebar";
import { SubjectForm } from "./SubjectForm";
import { TopicForm } from "./TopicForm";
import { LessonEditor } from "./LessonEditor";

type Props = {
  token: string;
  role: string;
  selection: Selection | null;
  onSaved: () => void;
};

export function ContentEditor({ token, role, selection, onSaved }: Props) {
  if (!selection) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-400">
        <span className="text-4xl">📝</span>
        <p className="text-sm">Select an item from the tree to edit, or create a new one.</p>
      </div>
    );
  }

  const isSuperAdmin = role === "admin" || role === "super_admin";

  if (selection.type === "new-subject") {
    if (!isSuperAdmin) return <Forbidden />;
    return (
      <SubjectForm
        key="new-subject"
        subjectId={null}
        token={token}
        onSaved={onSaved}
      />
    );
  }

  if (selection.type === "subject") {
    if (!isSuperAdmin) return <ReadOnly label="Subject" />;
    return (
      <SubjectForm
        key={`subject-${selection.id}`}
        subjectId={selection.id}
        token={token}
        onSaved={onSaved}
        onDeleted={onSaved}
      />
    );
  }

  if (selection.type === "new-topic") {
    if (!isSuperAdmin) return <Forbidden />;
    return (
      <TopicForm
        key={`new-topic-${selection.subjectId}`}
        topicId={null}
        subjectId={selection.subjectId}
        token={token}
        onSaved={onSaved}
      />
    );
  }

  if (selection.type === "topic") {
    if (!isSuperAdmin) return <ReadOnly label="Topic" />;
    return (
      <TopicForm
        key={`topic-${selection.id}`}
        topicId={selection.id}
        subjectId={selection.subjectId}
        token={token}
        onSaved={onSaved}
        onDeleted={onSaved}
      />
    );
  }

  if (selection.type === "new-lesson") {
    return (
      <LessonEditor
        key={`new-lesson-${selection.topicId}`}
        lessonId={null}
        topicId={selection.topicId}
        token={token}
        onSaved={onSaved}
      />
    );
  }

  if (selection.type === "lesson") {
    return (
      <LessonEditor
        key={`lesson-${selection.id}`}
        lessonId={selection.id}
        topicId={selection.topicId}
        token={token}
        onSaved={onSaved}
        onDeleted={onSaved}
      />
    );
  }

  return null;
}

function Forbidden() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-400">
      <span className="text-4xl">🔒</span>
      <p className="text-sm">You do not have permission to edit this.</p>
    </div>
  );
}

function ReadOnly({ label }: { label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-400">
      <span className="text-4xl">👁</span>
      <p className="text-sm">{label} editing is restricted to super admins.</p>
    </div>
  );
}
