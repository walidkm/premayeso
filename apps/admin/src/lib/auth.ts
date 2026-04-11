import { createClient } from "@/lib/supabase/server";
import { isAdminRole, normalizeAdminRole } from "@/lib/admin";

type UserRoleRow = {
  role: string | null;
};

export type AdminSessionState =
  | {
      user: null;
      isAdmin: false;
    }
  | {
      user: {
        id: string;
        email: string | null;
        role: string;
      };
      isAdmin: boolean;
    };

export async function getAdminSessionState(): Promise<AdminSessionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, isAdmin: false };
  }

  const { data: profileData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileData as UserRoleRow | null;
  const role = normalizeAdminRole(profile?.role) ?? profile?.role ?? "";

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
      role,
    },
    isAdmin: isAdminRole(role),
  };
}
