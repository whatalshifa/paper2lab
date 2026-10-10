"use client";

import { ArrowRight, BookOpen, FileUp, Quote, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useState } from "react";

import { ApiError, api, type PaperSummary, type SiteConfig } from "@/lib/api";
import { useSlow, WAKING_UP } from "@/lib/useSlow";

import { AddPaper } from "./AddPaper";
import { ReaderPreview } from "./ReaderPreview";

const STATUS: Record<PaperSummary["status"], { label: string; className: string }> = {
  queued: { label: "Waiting", className: "bg-sunken text-muted" },
  reading: { label: "Explaining…", className: "bg-accent-soft text-accent" },
  ready: {
    label: "Ready",
    className: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  failed: {
    label: "Failed",
    className: "bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
  },
};

function authorsLine(authors: string[] | null) {
  if (!authors?.length) return null;
  return authors.length > 2 ? `${authors[0]} and others` : authors.join(" and ");
}

/** A sample paper, as one row of the library. */
function SampleEntry({ paper }: { paper: PaperSummary }) {
  return (
    <li>
      <Link
        href={`/papers/${paper.id}`}
        className="group grid gap-x-8 gap-y-2 border-b border-line py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
      >
        <span className="min-w-0">
          <span className="block text-[0.8125rem] text-muted">{[paper.field, paper.year].filter(Boolean).join(" · ")}</span>
          <span className="mt-1 block font-serif text-[1.375rem] leading-snug font-semibold text-balance transition-colors group-hover:text-accent sm:text-2xl">
            {paper.title}
          </span>
          <span className="mt-1 block text-[0.9375rem] text-muted">{authorsLine(paper.authors)}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
          Read it at your level
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </Link>
    </li>
  );
}

function MyPaperRow({ paper }: { paper: PaperSummary }) {
  const status = STATUS[paper.status];
  return (
    <li>
      <Link
        href={`/papers/${paper.id}`}
        className="flex items-center justify-between gap-4 py-4 transition-colors hover:bg-sunken sm:px-3"
      >
        <span className="min-w-0">
          <span className="block font-serif text-lg font-semibold break-words">
            {paper.title ?? paper.filename ?? "Untitled paper"}
          </span>
          <span className="mt-0.5 block text-[0.8125rem] text-muted">
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
  {
    icon: FileUp,
    title: "Add a paper",
    text: "Upload a PDF or paste an arXiv link. Any field works.",
  },
  {
    icon: BookOpen,
    title: "Claude reads all of it",
    text: "Every section, equation and result, in one careful pass.",
  },
  {
    icon: SlidersHorizontal,
    title: "Read at your level",
    text: "Slide from beginner to expert. Hover any equation to see what it means.",
  },
  {
    icon: Quote,
    title: "Check every claim",
    text: "Each explanation shows the quote it's based on, checked against the PDF.",
  },
];

function SectionHeading({ id, title, children }: { id: string; title: string; children?: ReactNode }) {
  return (
    <div className="max-w-2xl">
      <h2 id={id} className="text-2xl font-semibold tracking-tight sm:text-[1.75rem] sm:leading-tight">
        {title}
      </h2>
      {children && <p className="mt-2 text-muted">{children}</p>}
    </div>
  );
}
export function Home() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [papers, setPapers] = useState<{
    samples: PaperSummary[];
    mine: PaperSummary[];
  } | null>(null);
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
    <div className="space-y-20 sm:space-y-28">
      <section className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <h1 className="text-[2.25rem] leading-[1.1] font-semibold tracking-[-0.025em] text-balance sm:text-5xl sm:leading-[1.08]">
            Read any research paper at your level.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-pretty text-muted">
            Paper2Lab explains every section in plain words, from &ldquo;new to this&rdquo; to expert. Hover an equation
            to see what each symbol means, and check every explanation against the paper&apos;s own words.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <a href="#samples" className="btn btn-primary btn-lg">
              Try a sample paper
              <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
            <Link href="/accuracy" className="link text-[0.9375rem]">
              How accurate is it?
            </Link>
          </div>
        </div>
        <ReaderPreview />
      </section>

      <section id="library" className="scroll-mt-8 space-y-16" aria-label="Library">
        {error && (
          <div
            role="alert"
            className="card flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <p>{error}</p>
            <button type="button" onClick={load} className="btn btn-secondary btn-sm">
              Try again
            </button>
          </div>
        )}

        {papers && papers.mine.length > 0 && (
          <div>
            <SectionHeading id="mine-heading" title="Your papers">
              Saved in this browser.
            </SectionHeading>
            <ul className="mt-6 divide-y divide-line border-y border-line">
              {papers.mine.map((paper) => (
                <MyPaperRow key={paper.id} paper={paper} />
              ))}
            </ul>
          </div>
        )}

        <div id="samples" className="scroll-mt-8">
          <SectionHeading id="samples-heading" title="Try a sample paper">
            Two famous papers, explained in advance so you can explore right away.
          </SectionHeading>
          {slow && (
            <p role="status" className="mt-4 text-sm text-muted">
              {WAKING_UP}
            </p>
          )}
          {papers ? (
            <ul className="mt-6 border-t border-line">
              {papers.samples.map((paper) => (
                <SampleEntry key={paper.id} paper={paper} />
              ))}
            </ul>
          ) : (
            !error && (
              <div className="mt-6 space-y-4">
                {[0, 1].map((i) => (
                  <div key={i} className="skeleton h-24" />
                ))}
              </div>
            )
          )}
        </div>
      </section>

      <section aria-labelledby="how-heading">
        <SectionHeading id="how-heading" title="How it works" />
        <ol className="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {HOW.map((step) => (
            <li key={step.title}>
              <step.icon className="h-5 w-5 text-accent" strokeWidth={1.75} aria-hidden />
              <span className="mt-3 block font-semibold">{step.title}</span>
              <span className="mt-1 block text-[0.9375rem] leading-relaxed text-muted">{step.text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section
        id="add"
        aria-labelledby="add-heading"
        className="grid gap-8 border-t border-line pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-16 sm:pt-20"
      >
        <SectionHeading id="add-heading" title="Add a paper">
          Upload a PDF or paste an arXiv link, and Paper2Lab explains it at all three levels in a few minutes. Your
          papers are saved in this browser.
        </SectionHeading>
        <AddPaper config={config} />
      </section>
    </div>
  );
}
