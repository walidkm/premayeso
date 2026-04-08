"use client";

import { useRef, useState } from "react";
import { requestMultipartJson } from "@/lib/adminApi";
import { primaryButtonClassName, secondaryButtonClassName } from "@/components/AdminForm";

type WorkbookIssue = {
  level: "error" | "warning";
  sheet: string;
  row: number | null;
  field: string | null;
  message: string;
};

type WorkbookPreview = {
  paper: {
    title: string;
    paperCode: string;
    subjectCode: string;
    examPath: string | null;
  } | null;
  summary: {
    questionCount: number;
    partCount: number;
    sectionCount: number;
    rubricCount: number;
    totalQuestionMarks: number;
    totalSectionMarks: number;
  };
  issues: WorkbookIssue[];
  existingPaper: {
    id: string;
    title: string | null;
    status: string | null;
    paper_code: string | null;
    attemptCount: number;
  } | null;
  canPublish: boolean;
};

type PublishResult = {
  examPaperId: string;
  questionCount: number;
  preview: WorkbookPreview;
};

export function PaperWorkbookImporter({
  token,
  onPublished,
}: {
  token: string;
  onPublished?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [status, setStatus] = useState<"idle" | "previewing" | "publishing">("idle");
  const [error, setError] = useState<string | null>(null);

  async function withSelectedFile<T>(handler: (form: FormData) => Promise<T>) {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      throw new Error("Choose a workbook file first");
    }

    const form = new FormData();
    form.append("file", file);
    return handler(form);
  }

  async function handlePreview() {
    setStatus("previewing");
    setError(null);

    try {
      const nextPreview = await withSelectedFile((form) =>
        requestMultipartJson<WorkbookPreview>("/admin/exam-papers/import/preview", token, "POST", form)
      );
      setPreview(nextPreview);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Preview failed");
    } finally {
      setStatus("idle");
    }
  }

  async function handlePublish() {
    setStatus("publishing");
    setError(null);

    try {
      const result = await withSelectedFile((form) =>
        requestMultipartJson<PublishResult>("/admin/exam-papers/import/publish", token, "POST", form)
      );
      setPreview(result.preview);
      onPublished?.();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Publish failed");
    } finally {
      setStatus("idle");
    }
  }

  const issueCount = preview?.issues.length ?? 0;
  const errorCount = preview?.issues.filter((issue) => issue.level === "error").length ?? 0;
  const warningCount = preview ? issueCount - errorCount : 0;

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
      <div>
        <h3 className="text-base font-semibold text-zinc-950">Workbook Import</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Upload the structured multi-sheet workbook, preview the parsed paper, then publish only when reconciliation is clean.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="text-sm text-zinc-600 file:mr-3 file:rounded-xl file:border-0 file:bg-zinc-950 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-800"
        />
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => void handlePreview()} disabled={status !== "idle"} className={secondaryButtonClassName}>
            {status === "previewing" ? "Previewing..." : "Preview workbook"}
          </button>
          <button
            type="button"
            onClick={() => void handlePublish()}
            disabled={status !== "idle" || !preview?.canPublish}
            className={primaryButtonClassName}
          >
            {status === "publishing" ? "Publishing..." : "Publish workbook"}
          </button>
        </div>
      </div>

      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      {preview ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Paper</p>
              <p className="mt-2 text-sm font-semibold text-zinc-900">
                {preview.paper?.title ?? "Unknown paper"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {preview.paper?.paperCode ?? "No paper code"} / {preview.paper?.subjectCode ?? "No subject code"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Counts</p>
              <p className="mt-2 text-sm text-zinc-700">
                {preview.summary.questionCount} questions / {preview.summary.partCount} parts / {preview.summary.sectionCount} sections
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {preview.summary.rubricCount} rubrics / {preview.summary.totalQuestionMarks} question marks
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Diagnostics</p>
              <p className="mt-2 text-sm text-zinc-700">
                {errorCount} errors / {warningCount} warnings
              </p>
              <p className={`mt-1 text-xs font-medium ${preview.canPublish ? "text-emerald-600" : "text-amber-600"}`}>
                {preview.canPublish ? "Ready to publish" : "Resolve blocking errors before publishing"}
              </p>
            </div>
          </div>

          {preview.existingPaper ? (
            <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Existing paper: {preview.existingPaper.title ?? preview.existingPaper.paper_code ?? "Untitled"} / status {preview.existingPaper.status ?? "unknown"} / attempts {preview.existingPaper.attemptCount}
            </div>
          ) : null}

          {preview.issues.length > 0 ? (
            <div className="flex flex-col gap-2">
              {preview.issues.slice(0, 20).map((issue, index) => (
                <div
                  key={`${issue.sheet}-${issue.row}-${index}`}
                  className={`rounded-2xl px-4 py-3 text-sm ${issue.level === "error" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}
                >
                  <span className="font-semibold">{issue.sheet}</span>
                  {issue.row ? ` row ${issue.row}` : ""}:
                  {" "}
                  {issue.message}
                </div>
              ))}
              {preview.issues.length > 20 ? (
                <p className="text-xs text-zinc-500">Showing the first 20 issues only.</p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-emerald-700">No validation issues were found.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
