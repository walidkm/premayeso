"use client";

import { FormEvent, useEffect, useState } from "react";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

type SubjectData = {
  id?: string;
  name: string;
  description: string;
  code: string;
  exam_path: string;
  order_index: number;
};

type Props = {
  subjectId: string | null; // null = new
  token: string;
  onSaved: () => void;
  onDeleted?: () => void;
};

export function SubjectForm({ subjectId, token, onSaved, onDeleted }: Props) {
  const isNew = subjectId === null;
  const [form, setForm] = useState<SubjectData>({
    name: "",
    description: "",
    code: "",
    exam_path: "",
    order_index: 0,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!subjectId) return;
    fetch(`${API_URL}/admin/content/tree`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data: SubjectData[]) => {
        const found = data.find((s: SubjectData) => s.id === subjectId);
        if (found) {
          setForm({
            name: found.name ?? "",
            description: (found as any).description ?? "",
            code: found.code ?? "",
            exam_path: (found as any).exam_path ?? "",
            order_index: found.order_index ?? 0,
          });
        }
      })
      .catch(() => {});
  }, [subjectId, token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const url = isNew ? `${API_URL}/admin/subjects` : `${API_URL}/admin/subjects/${subjectId}`;
    const method = isNew ? "POST" : "PATCH";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError((body as any).error ?? "Save failed");
    } else {
      onSaved();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!subjectId || !confirm("Delete this subject and ALL its topics and lessons? This cannot be undone.")) return;
    setDeleting(true);
    const res = await fetch(`${API_URL}/admin/subjects/${subjectId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError((body as any).error ?? "Delete failed");
    } else {
      onDeleted?.();
    }
    setDeleting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-zinc-900">{isNew ? "New Subject" : "Edit Subject"}</h2>

      <Field label="Name *">
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={inputCls} />
      </Field>
      <Field label="Description">
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3} className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Code">
          <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
            className={inputCls} />
        </Field>
        <Field label="Exam Path">
          <input value={form.exam_path} onChange={(e) => setForm({ ...form, exam_path: e.target.value })}
            placeholder="jce / msce / pslce" className={inputCls} />
        </Field>
      </div>
      <Field label="Order Index">
        <input type="number" value={form.order_index}
          onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })}
          className={inputCls} />
      </Field>

      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50">
          {saving ? "Saving…" : "Save Subject"}
        </button>
        {!isNew && (
          <button type="button" onClick={handleDelete} disabled={deleting}
            className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
      {label}
      {children}
    </label>
  );
}

const inputCls =
  "rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 w-full";
