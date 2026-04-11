"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Phase = "phone" | "otp";

export function StudentLoginCard({ nextPath }: { nextPath: string }) {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleRequestOtp() {
    setError(null);
    setInfo(null);
    const cleaned = phone.trim().replace(/\s/g, "");
    if (!/^\+?\d{7,15}$/.test(cleaned)) {
      setError("Enter a valid phone number, for example +265 999 000 001.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleaned }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not send the login code.");
      }

      setPhone(cleaned);
      setPhase("otp");
      setInfo("Your login code has been sent. New learners can add their name below before continuing.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not send the login code."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setError(null);
    const cleanedOtp = otp.trim();
    if (!/^\d{6}$/.test(cleanedOtp)) {
      setError("Enter the 6-digit code sent to your phone.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          otp: cleanedOtp,
          name: name.trim() || undefined,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not verify the login code.");
      }

      router.replace(nextPath);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not verify the login code."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-border/80 bg-white/90 p-6 shadow-[0_24px_90px_rgba(15,35,52,0.08)] sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand">
        Learner access
      </p>
      <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
        Continue to your student dashboard
      </h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        Student login stays separate from admin access. Use the number you learn with every day.
      </p>

      <div className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Phone number
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            disabled={phase === "otp"}
            placeholder="+265 999 000 001"
            className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand"
          />
        </label>

        {phase === "otp" ? (
          <>
            <label className="block text-sm font-medium text-slate-700">
              Your name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Optional if you already have an account"
                className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              6-digit code
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                placeholder="000000"
                className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-center font-mono text-lg tracking-[0.5em] text-foreground outline-none transition focus:border-brand"
              />
            </label>
          </>
        ) : null}
      </div>

      {info ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {info}
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3">
        {phase === "phone" ? (
          <button
            type="button"
            onClick={() => void handleRequestOtp()}
            disabled={loading}
            className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending code..." : "Send login code"}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void handleVerifyOtp()}
              disabled={loading}
              className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Verify and continue"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPhase("phone");
                setOtp("");
                setInfo(null);
                setError(null);
              }}
              disabled={loading}
              className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
            >
              Use a different number
            </button>
          </>
        )}
      </div>
    </section>
  );
}
