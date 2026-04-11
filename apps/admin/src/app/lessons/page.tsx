import { AdminShell } from "@/components/AdminShell";
import { PageIntro } from "@/components/AdminUi";
import { LessonsManager } from "@/components/LessonsManager";
import { getAdminPageContext } from "@/lib/adminPage";
import { sortLessonBlocks, type ContentTreeSubjectDto, type LessonAdminDto } from "@/lib/content";

export const revalidate = 0;

export default async function LessonsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase, examPath, role, email, token } = await getAdminPageContext(searchParams, { area: "content" });

  const [{ data: subjectData }, lessonQueryResult] = await Promise.all([
    supabase
      .from("subjects")
      .select("id, name, description, code, exam_path, order_index, topics(id, name, description, code, form_level, exam_path, order_index)")
      .eq("exam_path", examPath)
      .order("order_index"),
    supabase
      .from("lessons")
      .select(
        "id, topic_id, title, content, video_url, content_type, tier_gate, is_free_preview, order_index, exam_path, lesson_blocks(id, lesson_id, block_type, title, text_content, video_url, video_provider, file_path, file_name, file_size, order_index, created_at, updated_at)"
      )
      .eq("exam_path", examPath)
      .order("order_index"),
  ]);

  const { data: fallbackLessonData } =
    lessonQueryResult.error
      ? await supabase
          .from("lessons")
          .select("*")
          .eq("exam_path", examPath)
          .order("order_index")
      : { data: null };

  const subjects = ((subjectData as ContentTreeSubjectDto[] | null) ?? []).map((subject) => ({
    ...subject,
    topics: (subject.topics ?? []).sort((left, right) => left.order_index - right.order_index),
  }));
  const lessons = (((lessonQueryResult.data ?? fallbackLessonData) as LessonAdminDto[] | null) ?? []).map((lesson) => ({
    ...lesson,
    lesson_blocks: sortLessonBlocks(lesson.lesson_blocks),
  }));

  return (
    <AdminShell activePath="/lessons" examPath={examPath} email={email} role={role}>
      <PageIntro
        eyebrow={`${examPath} Lessons`}
        title="Lesson management"
        description="Edit lesson content within the correct topic and subject context. The API derives lesson exam level from the parent topic to keep the hierarchy consistent."
      />
      <LessonsManager token={token} role={role} subjects={subjects} lessons={lessons} />
    </AdminShell>
  );
}
