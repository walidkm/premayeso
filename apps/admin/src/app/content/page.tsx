import { redirect } from "next/navigation";
import { buildAdminHref, getDefaultAdminPath, normalizeAdminExamPath } from "@/lib/admin";
import { getAdminPageContext } from "@/lib/adminPage";

export const revalidate = 0;

export default async function LegacyContentPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const examPath = normalizeAdminExamPath(params.exam_path);
  const { role } = await getAdminPageContext(params);
  redirect(buildAdminHref(getDefaultAdminPath(role), examPath));
}
