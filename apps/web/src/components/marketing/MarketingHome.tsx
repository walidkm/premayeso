import Link from "next/link";
import { getAdminUrl } from "@/lib/app-config";
import { EXAM_PATH_COPY } from "@/lib/exam-paths";

const faqs = [
  {
    question: "What is PreMayeso?",
    answer:
      "PreMayeso is a Malawi-focused MANEB exam preparation platform built for learners first. It combines lessons, revision guidance, and past-paper support in a mobile-first experience.",
  },
  {
    question: "Which exam path is available now?",
    answer:
      "JCE is the first live rollout. MSCE and PSLCE are being prepared next, and learners can already join the waitlist for launch updates.",
  },
  {
    question: "What is included on the free plan?",
    answer:
      "Free learners can explore the platform, open selected lessons, and see how the subject pathway works before choosing whether to upgrade.",
  },
  {
    question: "What changes on Premium?",
    answer:
      "Premium unlocks more guided revision support, deeper practice coverage, and broader access to premium-gated learning content as it becomes available.",
  },
];

export function MarketingHome() {
  const adminLoginHref = getAdminUrl("/login");

  return (
    <main className="pb-16">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 pt-5 sm:px-8">
        <header className="flex items-center justify-between rounded-full border border-border/80 bg-white/80 px-5 py-3 backdrop-blur">
          <Link href="/" className="flex items-center gap-3">
            <span className="rounded-full bg-brand px-3 py-1.5 text-sm font-semibold text-white">
              PM
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">PreMayeso</p>
              <p className="text-xs text-slate-500">Malawi MANEB exam preparation</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 text-sm text-slate-600 md:flex">
            <a href="#how-it-works" className="transition hover:text-foreground">
              How it works
            </a>
            <a href="#exam-paths" className="transition hover:text-foreground">
              Exam paths
            </a>
            <a href="#plans" className="transition hover:text-foreground">
              Free vs Premium
            </a>
            <a href="#faq" className="transition hover:text-foreground">
              FAQ
            </a>
          </nav>
        </header>

        <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
          <div className="rounded-[2.25rem] border border-border/80 bg-surface/90 p-7 shadow-[0_24px_90px_rgba(15,35,52,0.08)] sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand">
              Public learner platform
            </p>
            <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
              Malawi MANEB exam preparation built for learners first.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              PreMayeso helps learners study with lessons, past papers,
              explanations, and revision guidance that work well on phones and
              low-bandwidth connections. JCE is live first, with MSCE and PSLCE
              already open for waitlist interest.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/login"
                className="rounded-full bg-brand px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-brand-strong"
              >
                Start Learning
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-border bg-white px-6 py-3 text-center text-sm font-semibold text-foreground transition hover:border-slate-400 hover:bg-slate-50"
              >
                Student Login
              </Link>
              <Link
                href="/login?next=%2Fapp%2Fsubjects"
                className="rounded-full border border-slate-300/80 px-6 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
              >
                Explore Subjects
              </Link>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                "JCE is the first live learner experience.",
                "Mobile-first and low-bandwidth friendly by design.",
                "Free learners can start immediately and upgrade later.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-border bg-white/70 px-4 py-4 text-sm leading-6 text-slate-600"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[2rem] border border-amber-200 bg-amber-50/90 p-6 sm:col-span-2">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-700">
                JCE live now
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-amber-950">
                Start today with structured JCE learning paths.
              </p>
              <p className="mt-3 text-sm leading-7 text-amber-900/80">
                Open the learner app, choose your subject, and move from topic to lesson
                with a clear and consistent revision flow.
              </p>
            </div>

            {(["MSCE", "PSLCE"] as const).map((examPath) => (
              <div
                key={examPath}
                className="rounded-[2rem] border border-border bg-white/85 p-6"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {examPath}
                </p>
                <p className="mt-3 text-xl font-semibold text-foreground">
                  {EXAM_PATH_COPY[examPath].label}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {EXAM_PATH_COPY[examPath].description}
                </p>
                <Link
                  href={`/waitlist?exam_path=${examPath}`}
                  className="mt-5 inline-flex rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand"
                >
                  Join {examPath} waitlist
                </Link>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section id="how-it-works" className="mx-auto mt-6 grid w-full max-w-7xl gap-5 px-5 sm:px-8 lg:grid-cols-3">
        {[
          {
            title: "1. Start on your phone",
            copy: "Use the student login, choose your exam path, and open the learner dashboard without getting pulled into admin routes.",
          },
          {
            title: "2. Follow subject pathways",
            copy: "Move from subjects to topics and lessons with content grouped around MANEB preparation rather than CMS workflows.",
          },
          {
            title: "3. Revise with confidence",
            copy: "Use explanations, guided lesson structure, and past-paper context to prepare more consistently over time.",
          },
        ].map((item) => (
          <article
            key={item.title}
            className="rounded-[2rem] border border-border bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,35,52,0.05)]"
          >
            <p className="text-lg font-semibold text-foreground">{item.title}</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">{item.copy}</p>
          </article>
        ))}
      </section>

      <section
        id="exam-paths"
        className="mx-auto mt-20 w-full max-w-7xl px-5 sm:px-8"
      >
        <div className="rounded-[2.5rem] border border-border bg-surface/90 p-7 shadow-[0_18px_50px_rgba(15,35,52,0.05)] sm:p-10">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand">
              Exam paths
            </p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              One identity, clear routing, and separate exam-path support.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Learner identity is separate from exam path and subscription status.
              A student stays a student, while content stays correctly routed by JCE,
              MSCE, or PSLCE.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {Object.entries(EXAM_PATH_COPY).map(([code, item]) => (
              <article
                key={code}
                className="rounded-[1.75rem] border border-border bg-white/80 p-6"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-lg font-semibold text-foreground">{code}</p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                      item.status === "live"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {item.status === "live" ? "Live" : "Waitlist"}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium text-slate-900">{item.label}</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-20 grid w-full max-w-7xl gap-5 px-5 sm:px-8 lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
        <div className="rounded-[2rem] border border-border bg-white/80 p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand">
            Why PreMayeso
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
            A learner-first information architecture.
          </h2>
          <div className="mt-6 space-y-4 text-sm leading-7 text-slate-600">
            <p>
              Students get a dedicated login, a dedicated learner app, and a focused
              route structure under <code className="rounded bg-slate-100 px-1.5 py-0.5">/app</code>.
              The public landing page explains the product clearly without mixing in
              admin or content-management flows.
            </p>
            <p>
              Admin access lives on a separate domain and is intentionally unreachable
              from learner routes. That keeps the root experience public, keeps learner
              navigation clear, and makes the platform easy to explain to schools,
              parents, and students.
            </p>
          </div>
        </div>

        <div id="plans" className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-[2rem] border border-border bg-white/90 p-7">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
              Free
            </p>
            <h3 className="mt-4 text-2xl font-semibold text-foreground">Start with the basics</h3>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              <li>Open the learner dashboard and move through core subject routes.</li>
              <li>Preview free learning content before deciding to upgrade.</li>
              <li>Use a phone-friendly study flow that is easier to return to daily.</li>
            </ul>
          </article>

          <article className="rounded-[2rem] border border-brand/30 bg-brand/5 p-7">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand">
              Premium
            </p>
            <h3 className="mt-4 text-2xl font-semibold text-foreground">
              Deeper revision support
            </h3>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-700">
              <li>Unlock premium-gated lessons and deeper revision resources.</li>
              <li>Follow a clearer study path from exploration to consistent practice.</li>
              <li>Stay ready as more papers, guidance, and premium pathways go live.</li>
            </ul>
          </article>
        </div>
      </section>

      <section id="faq" className="mx-auto mt-20 w-full max-w-7xl px-5 sm:px-8">
        <div className="rounded-[2.5rem] border border-border bg-white/85 p-7 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand">
            FAQ
          </p>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {faqs.map((item) => (
              <article
                key={item.question}
                className="rounded-[1.75rem] border border-border bg-surface/70 p-6"
              >
                <p className="text-lg font-semibold text-foreground">{item.question}</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto mt-20 w-full max-w-7xl px-5 pb-6 sm:px-8">
        <div className="flex flex-col gap-4 rounded-[2rem] border border-border bg-white/80 px-6 py-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>PreMayeso helps Malawi learners prepare for MANEB exams with a cleaner public-first experience.</p>
          <a
            href={adminLoginHref}
            className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 transition hover:text-slate-700"
          >
            Admin Login
          </a>
        </div>
      </footer>
    </main>
  );
}
