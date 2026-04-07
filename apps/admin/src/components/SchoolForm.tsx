"use client";

import { type FormEvent, useEffect, useState } from "react";
import { requestJson } from "@/lib/adminApi";
import type { SchoolAdminDto } from "@/lib/content";
import {
  Field,
  dangerButtonClassName,
  inputClassName,
  primaryButtonClassName,
} from "@/components/AdminForm";

type Props = {
  token: string;
  school: SchoolAdminDto | null;
  onSaved: () => void;
  onDeleted: () => void;
};

export function SchoolForm({ token, school, onSaved, onDeleted }: Props) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(school?.name ?? "");
    setError(null);
  }, [school]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await requestJson(school ? `/admin/schools/${school.id}` : "/admin/schools", {
        method: school ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      onSaved();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!school || !window.confirm("Delete this school? This is blocked if content or users still reference it.")) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await requestJson(`/admin/schools/${school.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      onDeleted();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold tracking-tight text-zinc-950">
          {school ? "Edit School" : "Create School"}
        </h3>
        <p className="mt-1 text-sm text-zinc-500">Schools stay global and can be reused across exam levels.</p>
      </div>

      <Field label="School Name">
        <input value={name} onChange={(event) => setName(event.target.value)} className={inputClassName} />
      </Field>

      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button type="submit" disabled={saving} className={primaryButtonClassName}>
          {saving ? "Saving..." : school ? "Save School" : "Create School"}
        </button>
        {school ? (
          <button type="button" disabled={deleting} onClick={handleDelete} className={dangerButtonClassName}>
            {deleting ? "Deleting..." : "Delete School"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
