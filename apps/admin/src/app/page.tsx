import { QuestionUploader } from "@/components/QuestionUploader";
import { SignOutButton } from "@/components/SignOutButton";
import { getAdminSessionState } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function Home() {
  const adminSession = await getAdminSessionState();
  if (!adminSession.user) {
    redirect("/login");
  }

  if (!adminSession.isAdmin) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm font-medium text-amber-900">Admin access required</p>
          <p className="mt-2 text-sm text-amber-800">
            Signed in as {adminSession.user.email ?? "this account"}, but this user does not have
            the <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">admin</code> role.
          </p>
        </div>
        <SignOutButton />
      </main>
    );
  }

  const supabase = await createClient();
  const [
    { data: subjects },
    { count: questionCount },
    { count: topicCount },
  ] = await Promise.all([
    supabase
      .from("subjects")
      .select("id, name, code, exam_path, order_index")
      .order("order_index"),
    supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("is_approved", true),
    supabase
      .from("topics")
      .select("id", { count: "exact", head: true })
      .eq("exam_path", "JCE"),
  ]);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">PreMayeso Admin</h1>
          <p className="mt-1 text-sm text-zinc-500">Content management for the JCE-first catalog.</p>
          <p className="mt-2 text-xs text-zinc-400">Signed in as {adminSession.user.email ?? "admin"}</p>
        </div>
        <SignOutButton />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "JCE Subjects", value: subjects?.length ?? 0 },
          { label: "JCE Topics", value: topicCount ?? 0 },
          { label: "Questions (approved)", value: questionCount ?? 0 },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-zinc-200 px-5 py-4">
            <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <QuestionUploader />

      <section>
        <h2 className="mb-3 text-base font-semibold">JCE Subjects</h2>
        {subjects && subjects.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {subjects.map((subject) => (
              <li
                key={subject.id}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3"
              >
                <span className="w-32 shrink-0 font-mono text-xs text-zinc-400">{subject.code}</span>
                <span className="text-sm font-medium">{subject.name}</span>
                <span className="ml-auto rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-400">
                  {subject.exam_path}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">No subjects found.</p>
        )}
      </section>
    </main>
  );
}
