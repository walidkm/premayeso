import Link from "next/link";
import type { ReactNode } from "react";
import { buildAdminHref, examPathLabel, isSuperAdminRole, type AdminUiExamPath } from "@/lib/admin";
import { SignOutButton } from "@/components/SignOutButton";
import { ExamPathSwitcher } from "@/components/ExamPathSwitcher";

type NavItem = {
  href: string;
  label: string;
  superAdminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard" },
  { href: "/subjects", label: "Subjects" },
  { href: "/topics", label: "Topics" },
  { href: "/lessons", label: "Lessons" },
  { href: "/exam-papers", label: "Exam Papers", superAdminOnly: true },
  { href: "/paper-links", label: "Paper Links", superAdminOnly: true },
  { href: "/rubrics", label: "Rubrics", superAdminOnly: true },
  { href: "/marking", label: "Marking", superAdminOnly: true },
  { href: "/schools", label: "Schools", superAdminOnly: true },
  { href: "/settings", label: "Settings", superAdminOnly: true },
];

export function AdminShell({
  children,
  activePath,
  examPath,
  email,
  role,
}: {
  children: ReactNode;
  activePath: string;
  examPath: AdminUiExamPath;
  email: string | null;
  role: string;
}) {
  const isSuperAdmin = isSuperAdminRole(role);

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link href={buildAdminHref("/", examPath)} className="inline-flex items-center gap-3">
                <span className="rounded-2xl bg-zinc-950 px-3 py-2 text-sm font-semibold text-white">
                  PM
                </span>
                <div>
                  <p className="text-sm font-semibold tracking-tight text-zinc-950">PreMayeso Admin</p>
                  <p className="text-xs text-zinc-500">
                    Content control panel for {examPathLabel(examPath)}
                  </p>
                </div>
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ExamPathSwitcher examPath={examPath} />
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                {role}
              </span>
              <span className="text-xs text-zinc-400">{email}</span>
              <SignOutButton />
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            {NAV_ITEMS.filter((item) => (item.superAdminOnly ? isSuperAdmin : true)).map((item) => {
              const isActive = activePath === item.href;
              return (
                <Link
                  key={item.href}
                  href={buildAdminHref(item.href, examPath)}
                  className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
