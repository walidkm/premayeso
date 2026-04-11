"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { EXAM_PATH_COPY, EXAM_PATHS, type ExamPath } from "@/lib/exam-paths";
import { useStudentSession } from "./StudentSessionProvider";

function navClassName(active: boolean) {
  return active
    ? "rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
    : "rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900";
}

export function StudentShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, signOut, setExamPath } = useStudentSession();

  if (state.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="rounded-[2rem] border border-border bg-white/85 px-8 py-6 text-sm text-slate-600">
          Loading your learner dashboard...
        </div>
      </div>
    );
  }

  if (state.status !== "authenticated") {
    return null;
  }

  const currentExamPath = (state.user.exam_path as ExamPath | null) ?? "JCE";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-4 sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <Link href="/app" className="flex items-center gap-3">
                <span className="rounded-full bg-brand px-3 py-1.5 text-sm font-semibold text-white">
                  PM
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">PreMayeso Learner</p>
                  <p className="text-xs text-slate-500">
                    {state.user.name ?? state.user.phone ?? "Student"} /{" "}
                    {state.user.subscription_status}
                  </p>
                </div>
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {EXAM_PATHS.map((path) => {
                const isCurrent = currentExamPath === path;
                const isLive = EXAM_PATH_COPY[path].status === "live";

                return (
                  <button
                    key={path}
                    type="button"
                    onClick={() => {
                      if (isCurrent) {
                        return;
                      }

                      if (isLive || isCurrent) {
                        void setExamPath(path);
                        return;
                      }

                      router.push(`/waitlist?exam_path=${path}`);
                    }}
                    className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                      isCurrent
                        ? "border-brand bg-brand text-white"
                        : isLive
                        ? "border-border bg-white text-slate-700 hover:border-brand hover:text-brand"
                        : "border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-400"
                    }`}
                  >
                    {path}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => void signOut()}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
              >
                Sign out
              </button>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            <Link href="/app" className={navClassName(pathname === "/app")}>
              Dashboard
            </Link>
            <Link
              href="/app/subjects"
              className={navClassName(pathname.startsWith("/app/subjects"))}
            >
              Subjects
            </Link>
            <Link href="/waitlist" className={navClassName(false)}>
              Waitlist
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 sm:px-8">
        {children}
      </main>
    </div>
  );
}
