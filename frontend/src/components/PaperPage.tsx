"use client";

import { Check, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ApiError, api, type PaperDetail } from "@/lib/api";
import { useSlow, WAKING_UP } from "@/lib/useSlow";

import { ReadingView } from "./ReadingView";

const STEPS = [
  { status: "queued", label: "Getting the PDF" },
  { status: "reading", label: "Reading the whole paper and writing three levels of explanation" },
  { status: "ready", label: "Checking every quote against the PDF" },
];

function Working({ paper }: { paper: PaperDetail }) {
  const current = paper.status === "queued" ? 0 : 1;
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:py-16">
      <div className="card p-6 sm:p-8" role="status" aria-live="polite">
        <p className="eyebrow">Explaining your paper</p>
        <h1 className="mt-2 font-serif text-[1.75rem] leading-tight font-semibold text-balance">
          {paper.title ?? "Your paper"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          This usually takes one to three minutes. You can leave this page; the paper will be in your library.
        </p>
        <ol className="mt-6 space-y-4">
          {STEPS.map((step, i) => (
            <li key={step.label} className="flex items-start gap-3 text-sm">
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  i < current ? "bg-claret-700 text-white" : i === current ? "border-2 border-claret-600" : "border-2 border-line"
                }`}
                aria-hidden
              >
                {i < current ? <Check className="h-3 w-3" strokeWidth={3} /> : i === current ? <span className="h-2 w-2 animate-pulse rounded-full bg-claret-600" /> : null}
              </span>
              <span className={i > current ? "text-muted" : ""}>{step.label}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Failed({ paper, onRetry, onDelete }: { paper: PaperDetail; onRetry: () => void; onDelete: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:py-16">
      <div className="card p-6 sm:p-8" role="alert">
        <p className="eyebrow text-rose-700 dark:text-rose-300">Couldn&apos;t explain this paper</p>
        <h1 className="mt-2 font-serif text-[1.75rem] leading-tight font-semibold text-balance">
          {paper.title ?? "Your paper"}
        </h1>
        <p className="mt-3">{paper.error}</p>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button type="button" onClick={onRetry} className="btn btn-primary">
            Try again
          </button>
          <Link href="/" className="btn btn-secondary">
            Back to the library
          </Link>
          <button type="button" onClick={onDelete} className="btn btn-danger-quiet sm:ml-auto">
            <Trash2 className="h-4 w-4" aria-hidden />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="mx-auto max-w-[42rem] space-y-4 px-4 py-10 sm:px-8 lg:py-14" aria-busy="true" aria-label="Loading the paper">
      <div className="skeleton h-4 w-24" />
      <div className="skeleton h-10 w-4/5" />
      <div className="skeleton h-4 w-1/2" />
      <div className="skeleton mt-8 h-16 w-full" />
      <div className="skeleton h-40 w-full" />
    </div>
  );
}

export function PaperPage({ id }: { id: string }) {
  const router = useRouter();
  const [paper, setPaper] = useState<PaperDetail | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const load = useCallback(async () => {
    try {
      setPaper(await api.paper(id));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError("Something went wrong.", 0));
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading data when the page opens
    load();
  }, [load]);

  // The tab (and the browser history) shows which paper this is.
  const title = paper?.title;
  useEffect(() => {
    if (title) document.title = `${title} · Paper2Lab`;
  }, [title]);
  const slow = useSlow(!paper && !error);

  // While the paper is being read, check again every few seconds.
  const working = paper?.status === "queued" || paper?.status === "reading";
  useEffect(() => {
    if (!working) return;
    const timer = window.setInterval(load, 3000);
    return () => window.clearInterval(timer);
  }, [working, load]);

  async function retry() {
    try {
      await api.retry(id);
      await load();
    } catch (err) {
      if (err instanceof ApiError) alert(err.message);
    }
  }

  async function remove() {
    if (!confirm("Delete this paper and its explanation? This can't be undone.")) return;
    try {
      await api.remove(id);
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError) alert(err.message);
    }
  }

  if (error && !paper) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:py-24">
        <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight">
          {error.status === 404 ? "Paper not found" : "Couldn't load this paper"}
        </h1>
        <p className="mt-3 text-muted">
          {error.status === 404
            ? "It may have been deleted, or it was added from another browser."
            : error.message}
        </p>
        <div className="mt-8 flex justify-center gap-2">
          {error.status !== 404 && (
            <button type="button" onClick={load} className="btn btn-primary">
              Try again
            </button>
          )}
          <Link href="/" className="btn btn-secondary">
            Back to the library
          </Link>
        </div>
      </div>
    );
  }
  if (!paper)
    return (
      <>
        {slow && (
          <p role="status" className="mx-auto max-w-[42rem] px-4 pt-6 text-sm text-muted sm:px-8">
            {WAKING_UP}
          </p>
        )}
        <Skeleton />
      </>
    );
  if (paper.status === "failed") return <Failed paper={paper} onRetry={retry} onDelete={remove} />;
  if (paper.status !== "ready" || !paper.reading) return <Working paper={paper} />;
  return <ReadingView paper={paper} reading={paper.reading} onDelete={paper.is_sample ? undefined : remove} />;
}
