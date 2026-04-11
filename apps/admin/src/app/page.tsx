import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { EmptyState, PageIntro, StatCard, SurfaceCard } from "@/components/AdminUi";
import { QuestionUploader } from "@/components/QuestionUploader";
import {
  buildAdminHref,
  hasContentAccess,
  hasPlatformAccess,
  hasReviewerAccess,
  roleLabel,
} from "@/lib/admin";
import { getAdminPageContext } from "@/lib/adminPage";

export const revalidate = 0;

const QUICK_LINKS = [
  { href: "/subjects", label: "Manage Subjects", description: "Keep each exam level catalog clean and searchable.", area: "content" as const },
  { href: "/topics", label: "Manage Topics", description: "Organize topics under the correct subject and exam level.", area: "content" as const },
  { href: "/lessons", label: "Manage Lessons", description: "Edit lesson content, video support, and preview access.", area: "content" as const },
  { href: "/exam-papers", label: "Manage Exam Papers", description: "Create past papers and school papers without cross-level mixing.", area: "platform" as const },
  { href: "/paper-links", label: "Manage Paper Links", description: "Attach questions to papers with order and section control.", area: "platform" as const },
  { href: "/rubrics", label: "Manage Rubrics", description: "Create reusable criterion-based rubrics for essays and structured parts.", area: "platform" as const },
  { href: "/marking", label: "Marking Queue", description: "Review pending essay and structured submissions before final scores are released.", area: "review" as const },
  { href: "/schools", label: "Manage Schools", description: "Maintain reusable school records for school papers and admins.", area: "platform" as const },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase, examPath, role, email } = await getAdminPageContext(searchParams);
  const canAuthorContent = hasContentAccess(role);
  const canReview = hasReviewerAccess(role);
  const canManagePlatform = hasPlatformAccess(role);

  const [
    { count: subjectCount },
    { count: topicCount },
    { count: lessonCount },
    { count: questionCount },
    { count: paperCount },
    { count: schoolCount },
    { data: subjectRows },
  ] = await Promise.all([
    supabase.from("subjects").select("id", { count: "exact", head: true }).eq("exam_path", examPath),
    supabase.from("topics").select("id", { count: "exact", head: true }).eq("exam_path", examPath),
    supabase.from("lessons").select("id", { count: "exact", head: true }).eq("exam_path", examPath),
    supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("exam_path", examPath)
      .eq("is_approved", true),
    supabase.from("exam_papers").select("id", { count: "exact", head: true }).eq("exam_path", examPath),
    supabase.from("schools").select("id", { count: "exact", head: true }),
    supabase
      .from("subjects")
      .select("id, name, code, order_index")
      .eq("exam_path", examPath)
      .order("order_index")
      .limit(6),
  ]);

  return (
    <AdminShell activePath="/" examPath={examPath} email={email} role={role}>
      <PageIntro
        eyebrow={`${examPath} Control Panel`}
        title={`${examPath} admin workspace`}
        description={`Signed in as ${roleLabel(role)}. Use the level switcher to stay inside the correct catalog without mixing authoring, review work, and platform controls.`}
        actions={
          <>
            {canAuthorContent ? (
              <Link
                href={buildAdminHref("/subjects", examPath)}
                className="rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Open Subjects
              </Link>
            ) : null}
            {canReview ? (
              <Link
                href={buildAdminHref("/marking", examPath)}
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                Open Marking
              </Link>
            ) : null}
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Subjects" value={subjectCount ?? 0} hint={`${examPath} catalog`} />
        <StatCard label="Topics" value={topicCount ?? 0} hint="Filtered by exam level" />
        <StatCard label="Lessons" value={lessonCount ?? 0} hint="Visible lesson catalog" />
        <StatCard label="Approved Questions" value={questionCount ?? 0} hint="Ready for quiz and papers" />
        <StatCard label="Exam Papers" value={paperCount ?? 0} hint="Past and school papers" />
        <StatCard label="Schools" value={schoolCount ?? 0} hint="Global reusable records" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <SurfaceCard title="Management Areas" description="Jump straight to the area you need without digging through a single content tree.">
          <div className="grid gap-3 md:grid-cols-2">
            {QUICK_LINKS.filter((link) => {
              if (link.area === "content") return canAuthorContent;
              if (link.area === "review") return canReview;
              return canManagePlatform;
            }).map((link) => (
              <Link
                key={link.href}
                href={buildAdminHref(link.href, examPath)}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 transition hover:border-zinc-300 hover:bg-white"
              >
                <p className="text-sm font-semibold text-zinc-950">{link.label}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{link.description}</p>
              </Link>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          title={`${examPath} subject snapshot`}
          description="A quick check of the first subjects in this exam level."
        >
          {!subjectRows || subjectRows.length === 0 ? (
            <EmptyState
              title={`No ${examPath} subjects yet`}
              description="Create the first subject to unlock level-scoped topic, lesson, and paper management."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {subjectRows.map((subject) => (
                <div key={subject.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <p className="text-sm font-semibold text-zinc-950">{subject.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">{subject.code ?? "No code"} / order {subject.order_index}</p>
                </div>
              ))}
            </div>
          )}
        </SurfaceCard>
      </div>

      {canManagePlatform ? (
        <SurfaceCard
          title="Bulk Question Upload"
          description="Use the existing spreadsheet import flow without leaving the dashboard."
        >
          <QuestionUploader />
        </SurfaceCard>
      ) : (
        <SurfaceCard title="Your Access" description="This account only sees the admin areas granted by its role. Platform-wide upload actions stay restricted.">
          <p className="text-sm leading-6 text-zinc-600">
            Signed in as {email ?? "an admin account"} with the role <span className="font-semibold text-zinc-900">{roleLabel(role)}</span>.
          </p>
        </SurfaceCard>
      )}
    </AdminShell>
  );
}
