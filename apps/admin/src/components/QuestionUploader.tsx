"use client";

import { useRef, useState } from "react";

interface UploadResult {
  imported: number;
  errors: number;
  total: number;
  errorDetails: { row: number; reason: string }[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "premayeso-admin-dev";

export function QuestionUploader({ onSuccess }: { onSuccess?: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setStatus("uploading");
    setResult(null);
    setErrorMsg(null);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch(`${API_URL}/admin/questions/upload`, {
        method: "POST",
        headers: { "x-admin-secret": ADMIN_SECRET },
        body: form,
      });

      const json = await res.json();

      if (!res.ok) {
        setErrorMsg(json.error ?? "Upload failed");
        setStatus("error");
        return;
      }

      setResult(json);
      setStatus("done");
      if (fileRef.current) fileRef.current.value = "";
      onSuccess?.();
    } catch (e: any) {
      setErrorMsg(e.message ?? "Network error");
      setStatus("error");
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-6 flex flex-col gap-4">
      <div>
        <h2 className="font-semibold text-base">Bulk Question Upload</h2>
        <p className="text-sm text-zinc-500 mt-0.5">
          Upload a filled <code className="font-mono text-xs bg-zinc-100 px-1 py-0.5 rounded">question_upload_template_v3.xlsx</code> file.
          Questions are inserted immediately and marked as approved.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          disabled={status === "uploading"}
          className="text-sm text-zinc-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-zinc-900 file:text-white hover:file:bg-zinc-700 disabled:opacity-50"
        />
        <button
          onClick={handleUpload}
          disabled={status === "uploading"}
          className="shrink-0 rounded-lg bg-zinc-900 text-white text-sm font-medium px-4 py-1.5 hover:bg-zinc-700 disabled:opacity-50 transition-colors"
        >
          {status === "uploading" ? "Uploading…" : "Upload"}
        </button>
      </div>

      {/* Result banner */}
      {status === "done" && result && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm">
          <p className="font-medium text-green-800">
            ✓ {result.imported} question{result.imported !== 1 ? "s" : ""} imported
            {result.errors > 0 && (
              <span className="text-amber-700"> · {result.errors} skipped</span>
            )}
            <span className="text-zinc-500 font-normal"> ({result.total} rows total)</span>
          </p>
          {result.errorDetails.length > 0 && (
            <ul className="mt-2 flex flex-col gap-0.5 text-amber-700">
              {result.errorDetails.slice(0, 10).map((e, i) => (
                <li key={i}>Row {e.row}: {e.reason}</li>
              ))}
              {result.errorDetails.length > 10 && (
                <li>…and {result.errorDetails.length - 10} more</li>
              )}
            </ul>
          )}
        </div>
      )}

      {status === "error" && errorMsg && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          ✗ {errorMsg}
        </div>
      )}
    </div>
  );
}
