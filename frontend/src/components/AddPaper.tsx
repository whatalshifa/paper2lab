"use client";

import { FileUp, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

import { ApiError, api, type SiteConfig } from "@/lib/api";

type Tab = "upload" | "arxiv";

/** Add a paper: drop or pick a PDF, or paste an arXiv link. Opens the paper's page straight away.
 * In demo mode it says so once, calmly, and the controls stay visible but switched off. */
export function AddPaper({ config }: { config: SiteConfig | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("upload");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const off = config !== null && !config.ai_enabled;
  const disabled = off || busy || config === null;

  async function send(action: () => Promise<{ id: string }>) {
    setBusy(true);
    setError(null);
    try {
      const paper = await action();
      router.push(`/papers/${paper.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  function pick(file: File | undefined) {
    if (!file) return;
    if (config && file.size > config.max_upload_mb * 1_000_000) {
      setError(`That file is over ${config.max_upload_mb} MB.`);
      return;
    }
    send(() => api.upload(file));
  }

  function submitLink(event: FormEvent) {
    event.preventDefault();
    if (link.trim()) send(() => api.addArxiv(link.trim()));
  }

  const tabClass = (t: Tab) =>
    `-mb-px border-b-2 px-0.5 pb-2.5 text-sm font-medium transition-colors ${
      tab === t ? "border-claret-700 text-foreground dark:border-claret-300" : "border-transparent text-muted hover:text-foreground"
    }`;

  return (
    <div className="card p-5 sm:p-6">
      {off && (
        <p className="mb-5 flex gap-2.5 rounded-md bg-sunken px-4 py-3 text-sm leading-relaxed text-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Explaining new papers is paused on this demo, so adding a paper is switched off. The sample papers above
            show everything Paper2Lab does.
          </span>
        </p>
      )}
      <div role="tablist" aria-label="How to add a paper" className="flex gap-6 border-b border-line">
        <button role="tab" type="button" aria-selected={tab === "upload"} className={tabClass("upload")} onClick={() => setTab("upload")}>
          Upload a PDF
        </button>
        <button role="tab" type="button" aria-selected={tab === "arxiv"} className={tabClass("arxiv")} onClick={() => setTab("arxiv")}>
          arXiv link
        </button>
      </div>

      {tab === "upload" ? (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (!disabled) pick(event.dataTransfer.files[0]);
          }}
          className={`mt-5 flex flex-col items-center rounded-md border border-dashed px-4 py-8 text-center transition-colors ${
            dragging ? "border-claret-500 bg-accent-soft" : "border-line"
          }`}
        >
          <FileUp className="h-6 w-6 text-muted" strokeWidth={1.75} aria-hidden />
          <p className="mt-3 text-sm text-muted">Drop a PDF here, or</p>
          <button type="button" className="btn btn-primary mt-3" disabled={disabled} onClick={() => input.current?.click()}>
            {busy ? "Uploading…" : "Choose a PDF"}
          </button>
          <input
            ref={input}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              pick(event.target.files?.[0]);
              event.target.value = ""; // so the same file can be picked again after an error
            }}
          />
          <p className="mt-3 text-xs text-muted">
            PDF up to {config?.max_upload_mb ?? 20} MB and {config?.max_pages ?? 60} pages
          </p>
        </div>
      ) : (
        <form onSubmit={submitLink} className="mt-5">
          <label htmlFor="arxiv" className="text-sm font-medium">
            arXiv link or id
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id="arxiv"
              className="input"
              placeholder="https://arxiv.org/abs/1706.03762"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              disabled={disabled}
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className="btn btn-primary h-11" disabled={disabled || !link.trim()}>
              {busy ? "Adding…" : "Explain it"}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">We fetch the PDF from arxiv.org for you.</p>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </p>
      )}
    </div>
  );
}
