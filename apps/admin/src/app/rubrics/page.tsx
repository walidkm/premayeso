import { AdminShell } from "@/components/AdminShell";
import { PageIntro } from "@/components/AdminUi";
import { RubricsManager } from "@/components/RubricsManager";
import { getAdminPageContext } from "@/lib/adminPage";
import type { ContentTreeSubjectDto } from "@/lib/content";

export const revalidate = 0;

export default async function RubricsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase, examPath, role, email, token } = await getAdminPageContext(searchParams, { area: "platform" });

  const { data: subjectData } = await supabase
    .from("subjects")
    .select("id, name, description, code, exam_path, order_index, topics(id, name, description, code, form_level, exam_path, order_index)")
    .eq("exam_path", examPath)
    .order("order_index");

  const subjects = ((subjectData as ContentTreeSubjectDto[] | null) ?? []).map((subject) => ({
    ...subject,
    topics: (subject.topics ?? []).sort((left, right) => left.order_index - right.order_index),
  }));

  return (
    <AdminShell activePath="/rubrics" examPath={examPath} email={email} role={role}>
      <PageIntro
        eyebrow={`${examPath} Rubrics`}
        title="Rubric management"
        description="Create reusable criterion-based rubrics for essays and structured responses, then attach them to paper questions and parts."
      />
      <RubricsManager token={token} examPath={examPath} subjects={subjects} />
    </AdminShell>
  );
}
