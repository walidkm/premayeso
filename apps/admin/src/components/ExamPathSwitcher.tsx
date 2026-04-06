"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ChangeEvent, useTransition } from "react";
import { ADMIN_UI_EXAM_PATHS, type AdminUiExamPath } from "@/lib/admin";

type Props = {
  examPath: AdminUiExamPath;
};

export function ExamPathSwitcher({ examPath }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextExamPath = event.target.value as AdminUiExamPath;
    startTransition(() => {
      router.push(`${pathname}?exam_path=${nextExamPath}`);
    });
  }

  return (
    <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
        Level
      </span>
      <select
        value={examPath}
        onChange={handleChange}
        disabled={isPending}
        className="bg-transparent text-sm font-semibold text-zinc-900 outline-none"
      >
        {ADMIN_UI_EXAM_PATHS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
