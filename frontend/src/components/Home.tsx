"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ApiError, api, type PaperSummary, type SiteConfig } from "@/lib/api";
import { useSlow, WAKING_UP } from "@/lib/useSlow";

import { AddPaper } from "./AddPaper";

const STATUS: Record<PaperSummary["status"], { label: string; className: string }> = {
  queued: { label: "Waiting", className: "bg-sunken text-muted" },
  reading: { label: "Explaining…", className: "bg-accent-soft text-accent" },
  ready: { label: "Ready", className: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300" },
  failed: { label: "Failed", className: "bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300" },
};

function authorsLine(authors: string[] | null) {
  if (!authors?.length) return null;
  return authors.length > 2 ? `${authors[0]} and others` : authors.join(" and ");
}

function SampleCard({ paper }: { paper: PaperSummary }) {
  return (
    <Link
      href={`/papers/${paper.id}`}
      className="card group flex flex-col p-5 transition-colors hover:border-indigo-300 dark:hover:border-indigo-800"
    >
      <span className="flex items-center gap-2 text-xs text-muted">
        <span className="badge bg-accent-soft text-accent">Sample</span>
        {paper.field} · {paper.year}
      </span>
      <span className="mt-3 font-serif text-xl font-semibold tracking-tight text-balance group-hover:text-accent">
        {paper.title}
      </span>
      <span className="mt-1 text-sm text-muted">{authorsLine(paper.authors)}</span>
      <span className="mt-4 text-sm font-semibold text-accent">Read it at your level →</span>
    </Link>
  );
}

function MyPaperRow({ paper }: { paper: PaperSummary }) {
  const status = STATUS[paper.status];
  return (
    <li>
      <Link
        href={`/papers/${paper.id}`}
        className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-sunken sm:px-5"
      >
        <span className="min-w-0">
          <span className="block font-medium break-words">{paper.title ?? paper.filename ?? "Untitled paper"}</span>
          <span className="block text-xs text-muted">
            {[authorsLine(paper.authors), paper.year, new Date(paper.created_at).toLocaleDateString()]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
        <span className={`badge shrink-0 ${status.className}`}>{status.label}</span>
      </Link>
    </li>
  );
}

const HOW = [
  { title: "Add a paper", text: "Upload a PDF or paste an arXiv link. Any field works." },
  { title: "Claude reads all of it", text: "Every section, equation and result, in one careful pass." },
  { title: "Read at your level", text: "Slide from beginner to expert. Hover any equation to see what it means." },
  { title: "Check every claim", text: "Each explanation shows the quote it's based on, checked against the PDF." },
];

export function Home() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [papers, setPapers] = useState<{ samples: PaperSummary[]; mine: PaperSummary[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [siteConfig, lists] = await Promise.all([api.config(), api.papers()]);
      setConfig(siteConfig);
      setPapers(lists);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load the library.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading data when the page opens
    load();
  }, [load]);
  const slow = useSlow(!papers && !error);

  return (
    <div className="space-y-16">
      <section className="grid items-start gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="pt-2">
          <p className="eyebrow">Research papers, explained</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Read any research paper at your level.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-pretty text-muted">
            Paper2Lab explains every section in plain words, from &ldquo;new to this&rdquo; to expert. Hover an equation
            to see what each symbol means, and check every explanation against the paper&apos;s own words.
          </p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2">
            {HOW.map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                  {i + 1}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{step.title}</span>
                  <span className="block text-sm text-muted">{step.text}</span>
                </span>
              </li>
            ))}
          </ol>
          {config && !config.ai_enabled && (
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#samples" className="btn btn-primary">
                Try a sample paper
              </a>
              <Link href="/accuracy" className="btn btn-secondary">
                How accurate is it?
              </Link>
            </div>
          )}
        </div>
        <AddPaper config={config} />
      </section>

      <section id="library" className="scroll-mt-20 space-y-10" aria-label="Library">
        {error && (
          <div role="alert" className="card flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p>{error}</p>
            <button type="button" onClick={load} className="btn btn-secondary btn-sm">
              Try again
            </button>
          </div>
        )}

        {papers && papers.mine.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Your papers</h2>
            <p className="mt-1 text-sm text-muted">Saved in this browser.</p>
            <ul className="card mt-4 divide-y divide-line overflow-hidden">
              {papers.mine.map((paper) => (
                <MyPaperRow key={paper.id} paper={paper} />
              ))}
            </ul>
          </div>
        )}

        <div id="samples" className="scroll-mt-20">
          <h2 className="text-xl font-semibold tracking-tight">Try a sample paper</h2>
          <p className="mt-1 text-sm text-muted">Two famous papers, explained in advance so you can explore right away.</p>
          {slow && (
            <p role="status" className="mt-3 text-sm text-muted">
              {WAKING_UP}
            </p>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {papers
              ? papers.samples.map((paper) => <SampleCard key={paper.id} paper={paper} />)
              : !error && [0, 1].map((i) => <div key={i} className="skeleton h-44" />)}
          </div>
        </div>
      </section>
    </div>
  );
}
