"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ApiError, api, type PaperSummary, type SiteConfig } from "@/lib/api";
import { useSlow, WAKING_UP } from "@/lib/useSlow";

import { AddPaper } from "./AddPaper";
import { Tex } from "./Tex";

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

/** A sample paper, listed like an entry in a journal's table of contents. */
function SampleEntry({ paper, number }: { paper: PaperSummary; number: number }) {
  return (
    <li>
      <Link
        href={`/papers/${paper.id}`}
        className="group grid gap-x-6 gap-y-1 border-b border-line py-6 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:items-baseline"
      >
        <span className="font-mono text-xs text-muted">No. {number}</span>
        <span>
          <span className="smallcaps block font-serif text-[0.95rem] text-accent">
            {paper.field} · {paper.year}
          </span>
          <span className="mt-1 block font-serif text-2xl leading-snug font-semibold tracking-tight text-balance group-hover:text-accent sm:text-[1.75rem]">
            {paper.title}
          </span>
          <span className="mt-1 block font-serif text-lg text-muted italic">{authorsLine(paper.authors)}</span>
        </span>
        <span className="mt-2 text-sm font-semibold text-accent sm:mt-0">Read it at your level →</span>
      </Link>
    </li>
  );
}

/** The same idea at all three reading levels: what the slider in the reader does, shown up front. */
const SPECIMEN = [
  {
    level: "New to this",
    text: (
      <>For every word, the model works out which other words in the sentence matter most to it, and leans on those.</>
    ),
  },
  {
    level: "Student",
    text: (
      <>
        Each word scores every other word for relevance, a softmax turns the scores into weights, and the word takes a
        weighted mix of their information.
      </>
    ),
  },
  {
    level: "Expert",
    text: (
      <>
        Scaled dot-product attention, <Tex latex="\mathrm{softmax}(QK^{\top}/\sqrt{d_k})\,V" />, run in parallel across
        several heads.
      </>
    ),
  },
];

function Specimen() {
  return (
    <figure className="border-y border-rule py-8">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="eyebrow">One idea, three readers</span>
        <span className="font-serif text-sm text-muted italic">
          Self-attention, from &ldquo;Attention Is All You Need&rdquo;
        </span>
      </figcaption>
      <dl className="mt-5 grid gap-6 md:grid-cols-3 md:gap-0 md:divide-x md:divide-line">
        {SPECIMEN.map((row, i) => (
          <div key={row.level} className={i === 0 ? "md:pr-6" : i === SPECIMEN.length - 1 ? "md:pl-6" : "md:px-6"}>
            <dt className="flex items-center gap-2 text-sm font-semibold">
              <span className="font-mono text-xs text-muted">{["I", "II", "III"][i]}</span>
              {row.level}
            </dt>
            <dd className="mt-2 font-serif text-[1.1rem] leading-relaxed">{row.text}</dd>
          </div>
        ))}
      </dl>
    </figure>
  );
}

function MyPaperRow({ paper }: { paper: PaperSummary }) {
  const status = STATUS[paper.status];
  return (
    <li>
      <Link
        href={`/papers/${paper.id}`}
        className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-sunken sm:px-2"
      >
        <span className="min-w-0">
          <span className="block font-serif text-lg font-medium break-words">
            {paper.title ?? paper.filename ?? "Untitled paper"}
          </span>
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
  {
    title: "Add a paper",
    text: "Upload a PDF or paste an arXiv link. Any field works.",
  },
  {
    title: "Claude reads all of it",
    text: "Every section, equation and result, in one careful pass.",
  },
  {
    title: "Read at your level",
    text: "Slide from beginner to expert. Hover any equation to see what it means.",
  },
  {
    title: "Check every claim",
    text: "Each explanation shows the quote it's based on, checked against the PDF.",
  },
];

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
    <div className="space-y-14">
      <section className="grid items-start gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
        <div className="pt-2">
          <p className="eyebrow">A reader&apos;s companion to research papers</p>
          <h1 className="mt-3 font-serif text-5xl leading-[1.02] font-medium tracking-tight text-balance sm:text-6xl">
            Read any research paper <em className="text-accent">at your level.</em>
          </h1>
          <p className="mt-6 max-w-xl font-serif text-xl leading-relaxed text-pretty text-muted">
            Paper2Lab explains every section in plain words, from &ldquo;new to this&rdquo; to expert. Hover an equation
            to see what each symbol means, and check every explanation against the paper&apos;s own words.
          </p>
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

      <Specimen />

      <section aria-labelledby="how-heading">
        <h2 id="how-heading" className="eyebrow">
          How it works
        </h2>
        <ol className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HOW.map((step, i) => (
            <li key={step.title} className="border-t border-line pt-4">
              <span className="font-serif text-3xl text-accent italic" aria-hidden>
                {["i", "ii", "iii", "iv"][i]}.
              </span>
              <span className="mt-1 block font-semibold">{step.title}</span>
              <span className="mt-1 block text-sm leading-relaxed text-muted">{step.text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section id="library" className="scroll-mt-20 space-y-12" aria-label="Library">
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
            <h2 className="font-serif text-3xl font-medium tracking-tight">Your papers</h2>
            <p className="mt-1 text-sm text-muted">Saved in this browser.</p>
            <ul className="mt-4 divide-y divide-line border-y border-rule">
              {papers.mine.map((paper) => (
                <MyPaperRow key={paper.id} paper={paper} />
              ))}
            </ul>
          </div>
        )}

        <div id="samples" className="scroll-mt-20">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-rule pb-3">
            <h2 className="font-serif text-3xl font-medium tracking-tight">Try a sample paper</h2>
            <p className="text-sm text-muted">Two famous papers, explained in advance so you can explore right away.</p>
          </div>
          {slow && (
            <p role="status" className="mt-3 text-sm text-muted">
              {WAKING_UP}
            </p>
          )}
          {papers ? (
            <ol>
              {papers.samples.map((paper, i) => (
                <SampleEntry key={paper.id} paper={paper} number={i + 1} />
              ))}
            </ol>
          ) : (
            !error && (
              <div className="mt-4 space-y-4">
                {[0, 1].map((i) => (
                  <div key={i} className="skeleton h-28" />
                ))}
              </div>
            )
          )}
        </div>
      </section>
    </div>
  );
}
