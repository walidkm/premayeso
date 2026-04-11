import { AdminShell } from "@/components/AdminShell";
import { PageIntro } from "@/components/AdminUi";
import { SchoolsManager } from "@/components/SchoolsManager";
import { getAdminPageContext } from "@/lib/adminPage";
import type { SchoolAdminDto } from "@/lib/content";

export const revalidate = 0;

export default async function SchoolsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase, examPath, role, email, token } = await getAdminPageContext(searchParams, { area: "platform" });

  const [{ data: schoolData }, { data: paperRows }, { data: userRows }] = await Promise.all([
    supabase.from("schools").select("id, name, created_at").order("name"),
    supabase.from("exam_papers").select("id, school_id").eq("exam_path", examPath).not("school_id", "is", null),
    supabase.from("users").select("id, school_id").not("school_id", "is", null),
  ]);

  const schools = (schoolData as SchoolAdminDto[] | null) ?? [];
  const paperCounts = Object.fromEntries(schools.map((school) => [school.id, 0]));
  const userCounts = Object.fromEntries(schools.map((school) => [school.id, 0]));

  for (const row of (paperRows as { school_id: string | null }[] | null) ?? []) {
    if (row.school_id) paperCounts[row.school_id] = (paperCounts[row.school_id] ?? 0) + 1;
  }

  for (const row of (userRows as { school_id: string | null }[] | null) ?? []) {
    if (row.school_id) userCounts[row.school_id] = (userCounts[row.school_id] ?? 0) + 1;
  }

  return (
    <AdminShell activePath="/schools" examPath={examPath} email={email} role={role}>
      <PageIntro
        eyebrow="Schools"
        title="School management"
        description="Maintain reusable school records that can be attached to school papers and school-admin accounts. The paper counts shown here are scoped to the active exam level."
      />
      <SchoolsManager token={token} role={role} schools={schools} paperCounts={paperCounts} userCounts={userCounts} />
    </AdminShell>
  );
}
