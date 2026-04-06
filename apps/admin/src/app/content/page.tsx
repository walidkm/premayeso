import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSessionState } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { ContentPageClient } from "@/components/ContentPageClient";

export const revalidate = 0;

export default async function ContentPage() {
  const adminSession = await getAdminSessionState();
  if (!adminSession.user) redirect("/login");
  if (!adminSession.isAdmin) redirect("/");

  const role = adminSession.user.role;
  // family_admin has no content access
  if (role === "family_admin") redirect("/");

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? "";

  return (
    <div className="flex h-screen flex-col bg-zinc-50">
      {/* Nav */}
      <header className="shrink-0 sticky top-0 z-10 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-full items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <span className="text-sm font-bold tracking-tight text-zinc-900">PreMayeso Admin</span>
            <nav className="flex items-center gap-1">
              <Link href="/" className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition">
                Dashboard
              </Link>
              <Link href="/content" className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-900 bg-zinc-100">
                Content
              </Link>
              {(role === "admin" || role === "super_admin") && (
                <Link href="/settings" className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition">
                  Integrations
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400">{adminSession.user.email}</span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">{role}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <ContentPageClient token={token} role={role} />
    </div>
  );
}
