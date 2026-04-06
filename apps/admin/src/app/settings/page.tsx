import { AdminShell } from "@/components/AdminShell";
import { EmptyState, PageIntro, SurfaceCard } from "@/components/AdminUi";
import { IntegrationsForm, type SettingRow } from "@/components/IntegrationsForm";
import { getAdminPageContext } from "@/lib/adminPage";
import { isSuperAdminRole } from "@/lib/admin";

export const revalidate = 0;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { examPath, role, email, token } = await getAdminPageContext(searchParams);
  const isSuperAdmin = isSuperAdminRole(role);

  let settings: SettingRow[] = [];
  if (token && isSuperAdmin) {
    try {
      const response = await fetch(`${API_URL}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (response.ok) {
        settings = (await response.json()) as SettingRow[];
      }
    } catch {
      settings = [];
    }
  }

  return (
    <AdminShell activePath="/settings" examPath={examPath} email={email} role={role}>
      <PageIntro
        eyebrow="Settings"
        title="Admin settings and integrations"
        description="Keep third-party configuration separate from content management. The level switcher still stays global in the header so you can move back to content without losing context."
      />

      {!isSuperAdmin ? (
        <SurfaceCard title="Read-only access" description="Integration settings remain limited to admin and super_admin accounts.">
          <EmptyState
            title="No settings access"
            description="This account can manage content where permitted, but integration credentials and feature toggles stay restricted."
          />
        </SurfaceCard>
      ) : settings.length === 0 ? (
        <SurfaceCard title="Settings table missing" description="The integrations UI depends on the existing settings migration.">
          <EmptyState
            title="No settings rows found"
            description="Run migration 007_settings.sql in Supabase, then reload this page to configure SMS and related services."
          />
        </SurfaceCard>
      ) : (
        <SurfaceCard
          title="Integrations"
          description="Configure SMS and related services without leaving the admin shell."
        >
          <IntegrationsForm initial={settings} apiUrl={API_URL} token={token} />
        </SurfaceCard>
      )}
    </AdminShell>
  );
}
