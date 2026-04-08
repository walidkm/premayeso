import { AdminShell } from "@/components/AdminShell";
import { MarkingQueueManager } from "@/components/MarkingQueueManager";
import { PageIntro } from "@/components/AdminUi";
import { getAdminPageContext } from "@/lib/adminPage";

export const revalidate = 0;

export default async function MarkingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { examPath, role, email, token } = await getAdminPageContext(searchParams);

  return (
    <AdminShell activePath="/marking" examPath={examPath} email={email} role={role}>
      <PageIntro
        eyebrow={`${examPath} Marking`}
        title="Manual marking queue"
        description="Review rubric-based essay and structured responses, save draft marks, and finalize scores when moderation is complete."
      />
      <MarkingQueueManager token={token} examPath={examPath} />
    </AdminShell>
  );
}
