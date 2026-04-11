import { LoginForm } from "@/components/LoginForm";
import { SignOutButton } from "@/components/SignOutButton";
import { getAdminSessionState } from "@/lib/auth";
import { getDefaultAdminPath } from "@/lib/admin";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function LoginPage() {
  const adminSession = await getAdminSessionState();
  if (adminSession.isAdmin) {
    redirect(getDefaultAdminPath(adminSession.user?.role));
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-400">PreMayeso Admin</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950">Admin Sign In</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Use an email/password account with an admin role such as
          <code className="ml-1 rounded bg-zinc-100 px-1 py-0.5 text-xs">content_author</code>,
          <code className="ml-1 rounded bg-zinc-100 px-1 py-0.5 text-xs">reviewer</code>, or
          <code className="ml-1 rounded bg-zinc-100 px-1 py-0.5 text-xs">platform_admin</code>.
        </p>
      </div>

      {adminSession.user && !adminSession.isAdmin ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">This signed-in account is not an admin.</p>
          <p className="mt-1 text-amber-800">
            {adminSession.user.email ?? "Current account"} belongs on the learner side of PreMayeso, not the admin CMS.
          </p>
          <div className="mt-4">
            <SignOutButton />
          </div>
        </div>
      ) : null}

      <LoginForm />
    </main>
  );
}
