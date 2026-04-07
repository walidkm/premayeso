import type { ReactNode } from "react";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
      <span>{label}</span>
      {children}
      {hint ? <span className="text-xs font-normal text-zinc-400">{hint}</span> : null}
    </label>
  );
}

export const inputClassName =
  "w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-400";

export const textAreaClassName = `${inputClassName} min-h-28 resize-y`;

export const secondaryButtonClassName =
  "rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50";

export const primaryButtonClassName =
  "rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50";

export const dangerButtonClassName =
  "rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50";
