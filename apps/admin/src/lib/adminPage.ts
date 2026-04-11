import { redirect } from "next/navigation";
import { getAdminSessionState } from "@/lib/auth";
import {
  buildAdminHref,
  getDefaultAdminPath,
  hasAdminAreaAccess,
  normalizeAdminExamPath,
  normalizeAdminRole,
  type AdminAccessArea,
  type AdminRole,
  type AdminUiExamPath,
} from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

type SearchParamsInput =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>
  | undefined;

export type AdminPageContext = {
  examPath: AdminUiExamPath;
  role: AdminRole;
  email: string | null;
  token: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

export async function getAdminPageContext(
  searchParamsInput?: SearchParamsInput,
  options?: { area?: AdminAccessArea }
): Promise<AdminPageContext> {
  const searchParams = searchParamsInput ? await searchParamsInput : {};
  const examPath = normalizeAdminExamPath(searchParams.exam_path);
  const adminSession = await getAdminSessionState();
  if (!adminSession.user) redirect("/login");
  if (!adminSession.isAdmin) redirect("/login");

  const role = normalizeAdminRole(adminSession.user.role);
  if (!role) redirect("/login");

  const requiredArea = options?.area ?? "any";
  if (!hasAdminAreaAccess(role, requiredArea)) {
    redirect(buildAdminHref(getDefaultAdminPath(role), examPath));
  }

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    examPath,
    role,
    email: adminSession.user.email,
    token: session?.access_token ?? "",
    supabase,
  };
}
