"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { getApiUrl, requestJson } from "@/lib/adminApi";
import {
  getPersistedLessonBlocks,
  getVideoProviderLabel,
  inferVideoProviderFromUrl,
  synthesizeLegacyLessonBlocks,
  type LessonAdminDto,
  type LessonBlockAdminDto,
  type LessonBlockType,
} from "@/lib/content";
import {
  Field,
  dangerButtonClassName,
  inputClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/AdminForm";
import { Badge, EmptyState } from "@/components/AdminUi";

type Props = {
  token: string;
  lesson: LessonAdminDto;
  onChanged: () => void;
};

type BlockFormState = {
  mode: "create" | "edit";
  blockId: string | null;
  block_type: LessonBlockType;
  title: string;
  text_content: string;
  video_url: string;
};

function buildFormState(blockType: LessonBlockType, block?: LessonBlockAdminDto): BlockFormState {
  return {
    mode: block ? "edit" : "create",
    blockId: block?.id ?? null,
    block_type: block?.block_type ?? blockType,
    title: block?.title ?? "",
    text_content: block?.text_content ?? "",
    video_url: block?.video_url ?? "",
  };
}

function summarizeText(value: string | null): string {
  const compact = (value ?? "").replace(/\s+/g, " ").trim();
  if (!compact) return "No text content";
  return compact.length > 120 ? `${compact.slice(0, 117)}...` : compact;
}

function summarizeUrl(value: string | null): string {
  if (!value) return "No video URL";

  try {
    const parsed = new URL(value);
    const path = `${parsed.host}${parsed.pathname}`.replace(/\/$/, "");
    return path.length > 120 ? `${path.slice(0, 117)}...` : path;
  } catch {
    return value.length > 120 ? `${value.slice(0, 117)}...` : value;
  }
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const smallButtonClassName = `${secondaryButtonClassName} px-3 py-2 text-xs`;
const smallDangerButtonClassName = `${dangerButtonClassName} px-3 py-2 text-xs`;

export function LessonBlocksEditor({ token, lesson, onChanged }: Props) {
  const structuredBlocks = getPersistedLessonBlocks(lesson);
  const legacyBlocks = structuredBlocks.length === 0 ? synthesizeLegacyLessonBlocks(lesson) : [];
  const usesLegacyFallback = structuredBlocks.length === 0 && legacyBlocks.length > 0;
  const [form, setForm] = useState<BlockFormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [movingBlockId, setMovingBlockId] = useState<string | null>(null);
  const [deletingBlockId, setDeletingBlockId] = useState<string | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  function startCreate(blockType: LessonBlockType) {
    setError(null);
    setForm(buildFormState(blockType));
  }

  function startEdit(block: LessonBlockAdminDto) {
    setError(null);
    setForm(buildFormState(block.block_type, block));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;

    setSaving(true);
    setError(null);

    try {
      const body =
        form.block_type === "text"
          ? {
              block_type: "text",
              title: form.title,
              text_content: form.text_content,
            }
          : {
              block_type: "video",
              title: form.title,
              video_url: form.video_url,
              video_provider: inferVideoProviderFromUrl(form.video_url),
            };

      if (form.mode === "create") {
        await requestJson(`/admin/lessons/${lesson.id}/blocks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
      } else if (form.blockId) {
        await requestJson(`/admin/lesson-blocks/${form.blockId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
      }

      setForm(null);
      onChanged();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Lesson block save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(block: LessonBlockAdminDto) {
    if (!window.confirm("Delete this block? This cannot be undone.")) {
      return;
    }

    setDeletingBlockId(block.id);
    setError(null);

    try {
      await requestJson(`/admin/lesson-blocks/${block.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (form?.blockId === block.id) {
        setForm(null);
      }
      onChanged();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Lesson block delete failed");
    } finally {
      setDeletingBlockId(null);
    }
  }

  async function handleMove(blockId: string, direction: -1 | 1) {
    const currentIndex = structuredBlocks.findIndex((block) => block.id === blockId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= structuredBlocks.length) {
      return;
    }

    const nextOrder = structuredBlocks.map((block) => block.id);
    const [movedId] = nextOrder.splice(currentIndex, 1);
    if (!movedId) {
      return;
    }
    nextOrder.splice(targetIndex, 0, movedId);

    setMovingBlockId(blockId);
    setError(null);

    try {
      await requestJson(`/admin/lessons/${lesson.id}/blocks/reorder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ block_ids: nextOrder }),
      });
      onChanged();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Lesson block reorder failed");
    } finally {
      setMovingBlockId(null);
    }
  }

  async function handleImportLegacy() {
    setImporting(true);
    setError(null);

    try {
      await requestJson(`/admin/lessons/${lesson.id}/blocks/import-legacy`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setForm(null);
      onChanged();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Legacy block import failed");
    } finally {
      setImporting(false);
    }
  }

  async function handlePdfUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingPdf(true);
    setError(null);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("file", files[i]!);
      }

      const response = await fetch(
        getApiUrl(`/admin/lessons/${lesson.id}/blocks/upload-pdf`),
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error((payload as { error?: string }).error ?? "PDF upload failed");
      }

      const result = (await response.json()) as { errors?: string[] };
      if (result.errors && result.errors.length > 0) {
        setError(result.errors.join("; "));
      }

      onChanged();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "PDF upload failed");
    } finally {
      setUploadingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  }

  const detectedProvider =
    form?.block_type === "video" ? inferVideoProviderFromUrl(form.video_url) : null;

  return (
    <div className="mt-6 flex flex-col gap-6 border-t border-zinc-200 pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-base font-semibold text-zinc-950">Lesson blocks</h4>
          <p className="mt-1 text-sm text-zinc-500">
            Add ordered text and video sections inside this lesson container.
          </p>
        </div>
        {!usesLegacyFallback ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => startCreate("text")} className={secondaryButtonClassName}>
              Add text section
            </button>
            <button type="button" onClick={() => startCreate("video")} className={secondaryButtonClassName}>
              Add video section
            </button>
            <label className={`${secondaryButtonClassName} cursor-pointer`}>
              {uploadingPdf ? "Uploading..." : "Add PDF notes"}
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf"
                multiple
                onChange={handlePdfUpload}
                disabled={uploadingPdf}
                className="sr-only"
              />
            </label>
          </div>
        ) : null}
      </div>

      {usesLegacyFallback ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-amber-900">Legacy lesson content detected</p>
              <p className="mt-2 text-sm leading-6 text-amber-800">
                This lesson still renders from the legacy lesson fields. Import that content once to convert it into
                structured lesson blocks before adding new sections, so learner content does not get shadowed
                accidentally.
              </p>
            </div>
            <button
              type="button"
              onClick={handleImportLegacy}
              disabled={importing}
              className={primaryButtonClassName}
            >
              {importing ? "Importing..." : "Import legacy content"}
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {legacyBlocks.map((block) => (
              <div key={block.id} className="rounded-2xl border border-amber-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge tone="warning">{block.block_type}</Badge>
                    {block.block_type === "video" ? (
                      <span className="text-xs font-medium text-zinc-500">
                        {getVideoProviderLabel(block.video_provider)}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs text-zinc-400">Legacy preview</span>
                </div>
                <p className="mt-3 text-sm text-zinc-700">
                  {block.block_type === "text" ? summarizeText(block.text_content) : summarizeUrl(block.video_url)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : structuredBlocks.length === 0 ? (
        <EmptyState
          title="No blocks yet"
          description="Create the lesson container first, then add one or more text or video sections in the order learners should read them."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {structuredBlocks.map((block, index) => (
            <div
              key={block.id}
              className={`rounded-3xl border px-5 py-4 transition ${
                form?.blockId === block.id ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-zinc-50"
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={block.block_type === "video" ? "accent" : block.block_type === "pdf" ? "warning" : "neutral"}>{block.block_type}</Badge>
                    {block.block_type === "video" ? (
                      <Badge tone="accent">{getVideoProviderLabel(block.video_provider)}</Badge>
                    ) : null}
                    {block.block_type === "pdf" && block.file_size ? (
                      <span className={`text-xs ${form?.blockId === block.id ? "text-zinc-300" : "text-zinc-500"}`}>
                        {formatFileSize(block.file_size)}
                      </span>
                    ) : null}
                    <span className={`text-xs ${form?.blockId === block.id ? "text-zinc-300" : "text-zinc-400"}`}>
                      Section {index + 1}
                    </span>
                  </div>
                  <p className={`mt-3 text-sm font-semibold ${form?.blockId === block.id ? "text-white" : "text-zinc-950"}`}>
                    {block.title ?? (block.block_type === "text" ? "Untitled text section" : block.block_type === "pdf" ? (block.file_name ?? "Untitled PDF") : "Untitled video section")}
                  </p>
                  <p className={`mt-2 text-sm ${form?.blockId === block.id ? "text-zinc-300" : "text-zinc-600"}`}>
                    {block.block_type === "text" ? summarizeText(block.text_content) : block.block_type === "pdf" ? (block.file_name ?? "PDF file") : summarizeUrl(block.video_url)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleMove(block.id, -1)}
                    disabled={index === 0 || movingBlockId === block.id}
                    className={smallButtonClassName}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(block.id, 1)}
                    disabled={index === structuredBlocks.length - 1 || movingBlockId === block.id}
                    className={smallButtonClassName}
                  >
                    Down
                  </button>
                  {block.block_type !== "pdf" ? (
                    <button type="button" onClick={() => startEdit(block)} className={smallButtonClassName}>
                      Edit
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleDelete(block)}
                    disabled={deletingBlockId === block.id}
                    className={smallDangerButtonClassName}
                  >
                    {deletingBlockId === block.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {form ? (
        <form onSubmit={handleSubmit} className="rounded-3xl border border-zinc-200 bg-white p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h5 className="text-base font-semibold text-zinc-950">
                {form.mode === "create" ? "Add lesson block" : "Edit lesson block"}
              </h5>
              <p className="mt-1 text-sm text-zinc-500">
                {form.block_type === "text"
                  ? "Use text blocks for lesson explanations, steps, and notes."
                  : "Use video blocks for external YouTube, Vimeo, or direct-hosted video links."}
              </p>
            </div>
            <button type="button" onClick={() => setForm(null)} className={secondaryButtonClassName}>
              Cancel
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-4">
            <Field label="Block Type">
              <input value={form.block_type} readOnly className={`${inputClassName} bg-zinc-50 text-zinc-500`} />
            </Field>

            <Field label="Section Title" hint="Optional. Use this when the block needs its own heading.">
              <input
                value={form.title}
                onChange={(event) => setForm((current) => (current ? { ...current, title: event.target.value } : current))}
                className={inputClassName}
              />
            </Field>

            {form.block_type === "text" ? (
              <Field label="Text Content">
                <textarea
                  required
                  value={form.text_content}
                  onChange={(event) =>
                    setForm((current) => (current ? { ...current, text_content: event.target.value } : current))
                  }
                  className={`${inputClassName} min-h-56 resize-y font-mono text-xs`}
                />
              </Field>
            ) : (
              <div className="flex flex-col gap-4">
                <Field label="Video URL" hint="Paste a YouTube, Vimeo, or direct video link.">
                  <input
                    required
                    value={form.video_url}
                    onChange={(event) =>
                      setForm((current) => (current ? { ...current, video_url: event.target.value } : current))
                    }
                    className={inputClassName}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </Field>
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">Detected provider</p>
                  <p className="mt-2 text-sm font-semibold text-zinc-900">
                    {getVideoProviderLabel(detectedProvider)}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">{summarizeUrl(form.video_url)}</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={saving} className={primaryButtonClassName}>
                {saving ? "Saving..." : form.mode === "create" ? "Create block" : "Save block"}
              </button>
              <button type="button" onClick={() => setForm(null)} className={secondaryButtonClassName}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      ) : null}

      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
