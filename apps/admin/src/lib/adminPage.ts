import { redirect } from "next/navigation";
import { getAdminSessionState } from "@/lib/auth";
import { normalizeAdminExamPath, type AdminUiExamPath } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

type SearchParamsInput =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>
  | undefined;

export type AdminPageContext = {
  examPath: AdminUiExamPath;
  role: string;
  email: string | null;
  token: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

export async function getAdminPageContext(searchParamsInput?: SearchParamsInput): Promise<AdminPageContext> {
  const adminSession = await getAdminSessionState();
  if (!adminSession.user) redirect("/login");
  if (!adminSession.isAdmin) redirect("/");
  if (adminSession.user.role === "family_admin") redirect("/");

  const searchParams = searchParamsInput ? await searchParamsInput : {};
  const examPath = normalizeAdminExamPath(searchParams.exam_path);
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    examPath,
    role: adminSession.user.role,
    email: adminSession.user.email,
    token: session?.access_token ?? "",
    supabase,
  };
}
