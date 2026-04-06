"use client";

import { FormEvent, useState } from "react";

export type SettingRow = {
  key: string;
  value: string;
  description: string | null;
  is_secret: boolean;
  updated_at: string;
};

type Section = {
  title: string;
  description: string;
  status: "live" | "coming-soon";
  keys: string[];
};

const SECTIONS: Section[] = [
  {
    title: "Africa's Talking — SMS",
    description:
      'Used to deliver OTP codes to users at login. Set at_enabled to "true" once your API key is live.',
    status: "live",
    keys: ["at_enabled", "at_api_key", "at_username"],
  },
  {
    title: "OTP settings",
    description: "Controls how OTP codes behave in development and production.",
    status: "live",
    keys: ["otp_ttl_mins", "otp_dev_log"],
  },
  {
    title: "Flutterwave — Payments",
    description: "Mobile money and card payments for Premium subscriptions. Available in Sprint 5.",
    status: "coming-soon",
    keys: ["fl_enabled", "fl_public_key", "fl_secret_key"],
  },
];

const LABELS: Record<string, string> = {
  at_enabled: "Enable SMS (true / false)",
  at_api_key: "API Key",
  at_username: "Username",
  otp_ttl_mins: "OTP expiry (minutes)",
  otp_dev_log: "Log OTP to console (true / false)",
  fl_enabled: "Enable Flutterwave (true / false)",
  fl_public_key: "Public key",
  fl_secret_key: "Secret key",
};

interface Props {
  initial: SettingRow[];
  apiUrl: string;
  token: string;
}

export function IntegrationsForm({ initial, apiUrl, token }: Props) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(initial.map((r) => [r.key, r.value]))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SMS test state
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleChange = (key: string, value: string) => {
    setSaved(false);
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const updates = Object.entries(values).map(([key, value]) => ({ key, value }));

    try {
      const res = await fetch(`${apiUrl}/admin/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save");
      }

      setSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const handleTestSms = async () => {
    if (!testPhone) return;
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch(`${apiUrl}/admin/settings/test-sms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone: testPhone }),
      });

      const body = await res.json();
      if (res.ok) {
        setTestResult("✓ Test message sent successfully");
      } else {
        setTestResult(`✗ ${body.error ?? "Failed"}`);
      }
    } catch {
      setTestResult("✗ Network error");
    } finally {
      setTesting(false);
    }
  };

  const isSecret = (key: string) =>
    initial.find((r) => r.key === key)?.is_secret ?? false;

  const descriptionOf = (key: string) =>
    initial.find((r) => r.key === key)?.description ?? "";

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-8">
      {SECTIONS.map((section) => (
        <div
          key={section.title}
          className={`rounded-2xl border p-6 ${
            section.status === "coming-soon"
              ? "border-zinc-100 bg-zinc-50 opacity-60"
              : "border-zinc-200 bg-white"
          }`}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">
                {section.title}
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500">{section.description}</p>
            </div>
            {section.status === "coming-soon" && (
              <span className="shrink-0 rounded-full bg-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-500">
                Coming soon
              </span>
            )}
          </div>

          <div className="flex flex-col gap-4">
            {section.keys.map((key) => (
              <label key={key} className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-zinc-700">
                  {LABELS[key] ?? key}
                </span>
                {descriptionOf(key) && (
                  <span className="text-xs text-zinc-400">{descriptionOf(key)}</span>
                )}
                <input
                  type={isSecret(key) ? "password" : "text"}
                  value={values[key] ?? ""}
                  onChange={(e) => handleChange(key, e.target.value)}
                  disabled={section.status === "coming-soon"}
                  placeholder={isSecret(key) ? "Enter to update…" : ""}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 font-mono text-sm text-zinc-800 outline-none transition focus:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
                />
              </label>
            ))}
          </div>

          {/* SMS test button — only for AT section */}
          {section.status === "live" && section.keys.includes("at_api_key") && (
            <div className="mt-5 flex flex-col gap-3 border-t border-zinc-100 pt-5">
              <p className="text-sm font-medium text-zinc-700">Test SMS delivery</p>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+265 999 000 001"
                  className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                />
                <button
                  type="button"
                  onClick={handleTestSms}
                  disabled={testing || !testPhone}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
                >
                  {testing ? "Sending…" : "Send test"}
                </button>
              </div>
              {testResult && (
                <p
                  className={`text-sm ${
                    testResult.startsWith("✓") ? "text-green-700" : "text-red-600"
                  }`}
                >
                  {testResult}
                </p>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Save bar */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-zinc-950 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
        {saved && <p className="text-sm text-green-700">✓ Settings saved</p>}
        {error && <p className="text-sm text-red-600">✗ {error}</p>}
      </div>
    </form>
  );
}
