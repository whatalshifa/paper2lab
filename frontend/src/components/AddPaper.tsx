"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

import { ApiError, api, type SiteConfig } from "@/lib/api";

type Tab = "upload" | "arxiv";

/** Add a paper: drop or pick a PDF, or paste an arXiv link. Opens the paper's page straight away. */
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
    `-mb-px border-b-2 px-0.5 pb-2 text-sm font-semibold transition-colors ${
      tab === t ? "border-claret-700 text-foreground dark:border-claret-300" : "border-transparent text-muted hover:text-foreground"
    }`;

  return (
    <div className="card p-5 sm:p-6">
      <h2 className="font-serif text-2xl font-semibold tracking-tight">Add a paper</h2>
      <div role="tablist" aria-label="How to add a paper" className="mt-4 flex gap-6 border-b border-line">
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
          className={`mt-4 flex flex-col items-center rounded-md border-2 border-dashed px-4 py-8 text-center transition-colors ${
            dragging ? "border-claret-500 bg-accent-soft" : "border-line"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-accent" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 3.5h7L19 8.5v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 3.5v5h5M12 17v-6m-2.5 2.5L12 11l2.5 2.5" />
          </svg>
          <p className="mt-3 text-sm font-medium">Drop a paper here, or</p>
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
        <form onSubmit={submitLink} className="mt-4">
          <label htmlFor="arxiv" className="text-sm font-medium">
            arXiv link or id
          </label>
          <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
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
            <button type="submit" className="btn btn-primary min-h-11" disabled={disabled || !link.trim()}>
              {busy ? "Adding…" : "Explain it"}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">We fetch the PDF from arxiv.org for you.</p>
        </form>
      )}

      {off && (
        <p className="mt-4 rounded-sm bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Explaining new papers is paused on this demo. Open one of the sample papers below to see how it works.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-sm bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </p>
      )}
    </div>
  );
}
