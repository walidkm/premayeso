import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  const { data: subjects, error } = await supabase
    .from("subjects")
    .select("id, name, description")
    .order("name");

  return (
    <main className="max-w-2xl mx-auto py-16 px-6">
      <h1 className="text-2xl font-bold mb-8">PreMayeso Admin</h1>

      <section>
        <h2 className="text-lg font-semibold mb-4">Subjects</h2>

        {error && (
          <p className="text-red-500">Error loading subjects: {error.message}</p>
        )}

        {!error && subjects?.length === 0 && (
          <p className="text-zinc-500">No subjects yet.</p>
        )}

        {subjects && subjects.length > 0 && (
          <ul className="flex flex-col gap-3">
            {subjects.map((subject) => (
              <li
                key={subject.id}
                className="rounded-xl border border-zinc-200 px-5 py-4"
              >
                <p className="font-medium">{subject.name}</p>
                {subject.description && (
                  <p className="text-sm text-zinc-500 mt-1">
                    {subject.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
