import { createClient } from "@/lib/supabase/server";

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

  const { data: profileData } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  const profile = profileData as UserRoleRow | null;

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    isAdmin: profile?.role === "admin",
  };
}
