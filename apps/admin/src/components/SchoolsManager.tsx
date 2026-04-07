"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { isSuperAdminRole } from "@/lib/admin";
import type { SchoolAdminDto } from "@/lib/content";
import { secondaryButtonClassName } from "@/components/AdminForm";
import { EmptyState, SurfaceCard } from "@/components/AdminUi";
import { SchoolForm } from "@/components/SchoolForm";

type Props = {
  token: string;
  role: string;
  schools: SchoolAdminDto[];
  paperCounts: Record<string, number>;
  userCounts: Record<string, number>;
};

export function SchoolsManager({ token, role, schools, paperCounts, userCounts }: Props) {
  const router = useRouter();
  const isSuperAdmin = isSuperAdminRole(role);
  const [isPending, startTransition] = useTransition();
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(schools[0]?.id ?? null);
  const [isCreating, setIsCreating] = useState(schools.length === 0);
  const selectedSchool = !isCreating
    ? schools.find((school) => school.id === selectedSchoolId) ?? schools[0] ?? null
    : null;

  function handleRefresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  function handleSaved() {
    setIsCreating(false);
    handleRefresh();
  }

  function handleDeleted() {
    setSelectedSchoolId(null);
    setIsCreating(schools.length <= 1);
    handleRefresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <SurfaceCard
        title="Schools"
        description="Schools are shared across exam levels and can be reused as paper sources or school-admin anchors."
        action={
          isSuperAdmin ? (
            <button
              type="button"
              onClick={() => {
                setSelectedSchoolId(null);
                setIsCreating(true);
              }}
              className={secondaryButtonClassName}
            >
              New School
            </button>
          ) : null
        }
      >
        {schools.length === 0 ? (
          <EmptyState
            title="No schools added"
            description="Create a school here before attaching school-based exam papers or school-admin accounts."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {schools.map((school) => {
              const isActive = !isCreating && school.id === selectedSchoolId;
              const paperCount = paperCounts[school.id] ?? 0;
              const userCount = userCounts[school.id] ?? 0;

              return (
                <button
                  key={school.id}
                  type="button"
                  onClick={() => {
                    setSelectedSchoolId(school.id);
                    setIsCreating(false);
                  }}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    isActive
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-200 bg-zinc-50 text-zinc-900 hover:border-zinc-300 hover:bg-white"
                  }`}
                >
                  <p className="text-sm font-semibold">{school.name}</p>
                  <p className={`mt-1 text-xs ${isActive ? "text-zinc-300" : "text-zinc-500"}`}>
                    {paperCount} paper{paperCount === 1 ? "" : "s"} / {userCount} user{userCount === 1 ? "" : "s"}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </SurfaceCard>

      <SurfaceCard
        title={isCreating ? "Create School" : selectedSchool?.name ?? "School Details"}
        description={
          isSuperAdmin
            ? "Deleting a school is blocked while users or exam papers still reference it."
            : "This view is read-only for your role."
        }
      >
        {!isSuperAdmin ? (
          <EmptyState
            title="Read-only access"
            description="School editing is limited to admin and super_admin accounts."
          />
        ) : (
          <SchoolForm token={token} school={selectedSchool} onSaved={handleSaved} onDeleted={handleDeleted} />
        )}

        {isPending ? <p className="mt-4 text-xs text-zinc-400">Refreshing school data...</p> : null}
      </SurfaceCard>
    </div>
  );
}
