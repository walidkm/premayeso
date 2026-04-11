import { AdminShell } from "@/components/AdminShell";
import { PageIntro } from "@/components/AdminUi";
import { TopicsManager } from "@/components/TopicsManager";
import { getAdminPageContext } from "@/lib/adminPage";
import type { ContentTreeSubjectDto } from "@/lib/content";

export const revalidate = 0;

export default async function TopicsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase, examPath, role, email, token } = await getAdminPageContext(searchParams, { area: "content" });

  const { data } = await supabase
    .from("subjects")
    .select("id, name, description, code, exam_path, order_index, topics(id, name, description, code, form_level, exam_path, order_index)")
    .eq("exam_path", examPath)
    .order("order_index");

  const subjects = ((data as ContentTreeSubjectDto[] | null) ?? []).map((subject) => ({
    ...subject,
    topics: (subject.topics ?? []).sort((left, right) => left.order_index - right.order_index),
  }));

  return (
    <AdminShell activePath="/topics" examPath={examPath} email={email} role={role}>
      <PageIntro
        eyebrow={`${examPath} Topics`}
        title="Topic management"
        description="Manage the topic structure under each subject. Topic exam level is always inherited from the selected subject to avoid cross-level mistakes."
      />
      <TopicsManager token={token} role={role} subjects={subjects} />
    </AdminShell>
  );
}
