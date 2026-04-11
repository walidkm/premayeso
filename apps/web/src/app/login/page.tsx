import type { Metadata } from "next";
import { StudentLoginCard } from "@/components/auth/StudentLoginCard";
import { getAdminUrl } from "@/lib/app-config";

export const metadata: Metadata = {
  title: "Student login",
  description:
    "Sign in to the PreMayeso learner app with your phone number and continue your MANEB revision.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const requested = Array.isArray(params.next) ? params.next[0] : params.next;
  const nextPath = requested?.startsWith("/app") ? requested : "/app";
  const adminLoginUrl = getAdminUrl("/login");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-5 py-10 sm:px-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_420px]">
        <section className="rounded-[2rem] border border-border/80 bg-surface/90 p-8 shadow-[0_24px_90px_rgba(15,35,52,0.08)] sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand">
            Student login
          </p>
          <h1 className="mt-4 max-w-xl text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Start learning with the learner app, not the admin panel.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            PreMayeso is built first for Malawi learners preparing for MANEB exams.
            Use your phone number to sign in, continue with JCE today, and join the
            waitlist if you want early access to MSCE or PSLCE next.
          </p>
          <p className="mt-4 text-sm leading-6 text-slate-500">
            Admins should sign in through{" "}
            <a href={adminLoginUrl} className="font-semibold text-brand hover:text-brand-strong">
              the admin login
            </a>
            , not the learner app.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "JCE live first",
                copy: "Lessons, subject navigation, and learner access are ready for the current JCE rollout.",
              },
              {
                title: "Low-bandwidth friendly",
                copy: "The platform is designed to work well on everyday phones and unstable connections.",
              },
              {
                title: "Free to Premium",
                copy: "Start free, then unlock deeper revision support and premium-only learning when you need it.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-border bg-white/80 p-5"
              >
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.copy}</p>
              </div>
            ))}
          </div>
        </section>

        <StudentLoginCard nextPath={nextPath} />
      </div>
    </main>
  );
}
