import { redirect } from "next/navigation";
import { normalizeAdminExamPath } from "@/lib/admin";

export const revalidate = 0;

export default async function LegacyContentPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const examPath = normalizeAdminExamPath(params.exam_path);
  redirect(`/subjects?exam_path=${examPath}`);
}
