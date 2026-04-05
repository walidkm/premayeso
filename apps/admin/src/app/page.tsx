import { createClient } from "@/lib/supabase/server";
import { QuestionUploader } from "@/components/QuestionUploader";

export const revalidate = 0; // always fresh

export default async function Home() {
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
    <main className="max-w-3xl mx-auto py-12 px-6 flex flex-col gap-10">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">PreMayeso Admin</h1>
        <p className="text-sm text-zinc-500 mt-1">Content management · JCE-first v1.0</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "JCE Subjects", value: subjects?.length ?? 0 },
          { label: "JCE Topics", value: topicCount ?? 0 },
          { label: "Questions (approved)", value: questionCount ?? 0 },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-200 px-5 py-4">
            <p className="text-2xl font-bold tabular-nums">{s.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Upload widget */}
      <QuestionUploader />

      {/* Subjects list */}
      <section>
        <h2 className="text-base font-semibold mb-3">JCE Subjects</h2>
        {subjects && subjects.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {subjects.map((s) => (
              <li
                key={s.id}
                className="rounded-lg border border-zinc-200 px-4 py-3 flex items-center gap-3"
              >
                <span className="font-mono text-xs text-zinc-400 w-24 shrink-0">
                  {s.code}
                </span>
                <span className="font-medium text-sm">{s.name}</span>
                <span className="ml-auto text-xs text-zinc-400 bg-zinc-100 rounded px-2 py-0.5">
                  {s.exam_path}
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
