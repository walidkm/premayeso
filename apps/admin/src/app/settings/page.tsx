import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminSessionState } from "@/lib/auth";
import { IntegrationsForm, type SettingRow } from "@/components/IntegrationsForm";
import { SignOutButton } from "@/components/SignOutButton";

export const revalidate = 0;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default async function SettingsPage() {
  const adminSession = await getAdminSessionState();
  if (!adminSession.user) redirect("/login");
  if (!adminSession.isAdmin) redirect("/");

  // Get the Supabase session JWT to use as Bearer token for API calls
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? "";

  // Fetch current settings from the API
  let settings: SettingRow[] = [];
  if (token) {
    try {
      const res = await fetch(`${API_URL}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        settings = await res.json();
      }
    } catch {
      // Settings table may not exist yet — show empty form
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <span className="text-sm font-bold tracking-tight text-zinc-900">PreMayeso Admin</span>
            <nav className="flex items-center gap-1">
              <Link href="/" className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition">
                Dashboard
              </Link>
              <Link href="/settings" className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-900 bg-zinc-100">
                Integrations
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400">{adminSession.user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Configure SMS, payments, and other third-party services.
          Secret values are masked after saving.
        </p>
      </div>

      {settings.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm font-semibold text-amber-900">Settings table not found</p>
          <p className="mt-1 text-sm text-amber-800">
            Run migration <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">007_settings.sql</code> in
            Supabase SQL Editor first, then reload this page.
          </p>
        </div>
      ) : (
        <IntegrationsForm
          initial={settings}
          apiUrl={API_URL}
          token={token}
        />
      )}
    </main>
    </div>
  );
}
