import { AdminShell } from "@/components/AdminShell";
import { PageIntro } from "@/components/AdminUi";
import { SubjectsManager } from "@/components/SubjectsManager";
import { getAdminPageContext } from "@/lib/adminPage";
import type { ContentTreeSubjectDto } from "@/lib/content";

export const revalidate = 0;

export default async function SubjectsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase, examPath, role, email, token } = await getAdminPageContext(searchParams);

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
    <AdminShell activePath="/subjects" examPath={examPath} email={email} role={role}>
      <PageIntro
        eyebrow={`${examPath} Subjects`}
        title="Subject management"
        description="Create and maintain the top-level subject structure for the active exam level. Topics, lessons, and papers all inherit their catalog context from here."
      />
      <SubjectsManager token={token} role={role} examPath={examPath} subjects={subjects} />
    </AdminShell>
  );
}
