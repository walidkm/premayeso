"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface UploadResult {
  imported: number;
  errors: number;
  total: number;
  errorDetails: { row: number; reason: string }[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Network error";
}

function getResponseError(payload: unknown): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const { error } = payload as { error?: unknown };
    if (typeof error === "string" && error.trim().length > 0) {
      return error;
    }
  }

  return "Upload failed";
}

function isUploadResult(payload: unknown): payload is UploadResult {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<UploadResult>;
  return (
    typeof candidate.imported === "number" &&
    typeof candidate.errors === "number" &&
    typeof candidate.total === "number" &&
    Array.isArray(candidate.errorDetails)
  );
}

export function QuestionUploader({ onSuccess }: { onSuccess?: () => void }) {
  const supabase = createClient();
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
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setErrorMsg("Your admin session has expired. Please sign in again.");
        setStatus("error");
        return;
      }

      const res = await fetch(`${API_URL}/admin/questions/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: form,
      });

      const json = (await res.json()) as unknown;

      if (!res.ok) {
        setErrorMsg(getResponseError(json));
        setStatus("error");
        return;
      }

      if (!isUploadResult(json)) {
        setErrorMsg("Upload succeeded, but the server returned an unexpected response.");
        setStatus("error");
        return;
      }

      setResult(json);
      setStatus("done");
      if (fileRef.current) {
        fileRef.current.value = "";
      }
      onSuccess?.();
    } catch (error: unknown) {
      setErrorMsg(getErrorMessage(error));
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-6">
      <div>
        <h2 className="text-base font-semibold">Bulk Question Upload</h2>
        <p className="mt-0.5 text-sm text-zinc-500">
          Upload a filled{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs font-mono">question_upload_template_v3.xlsx</code>{" "}
          file. Subject and topic codes must match the catalog exactly.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          disabled={status === "uploading"}
          className="text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-700 disabled:opacity-50"
        />
        <button
          onClick={handleUpload}
          disabled={status === "uploading"}
          className="shrink-0 rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          {status === "uploading" ? "Uploading..." : "Upload"}
        </button>
      </div>

      {status === "done" && result ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm">
          <p className="font-medium text-green-800">
            Imported {result.imported} question{result.imported !== 1 ? "s" : ""}
            {result.errors > 0 ? (
              <span className="text-amber-700"> - {result.errors} skipped</span>
            ) : null}
            <span className="font-normal text-zinc-500"> ({result.total} rows total)</span>
          </p>
          {result.errorDetails.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-0.5 text-amber-700">
              {result.errorDetails.slice(0, 10).map((errorDetail, index) => (
                <li key={index}>
                  Row {errorDetail.row}: {errorDetail.reason}
                </li>
              ))}
              {result.errorDetails.length > 10 ? (
                <li>...and {result.errorDetails.length - 10} more</li>
              ) : null}
            </ul>
          ) : null}
        </div>
      ) : null}

      {status === "error" && errorMsg ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      ) : null}
    </div>
  );
}
