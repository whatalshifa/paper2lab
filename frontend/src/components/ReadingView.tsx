"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { PaperDetail, Quote, Reading, Section } from "@/lib/api";
import { useLevel } from "@/lib/level";

import { AskPanel } from "./AskPanel";
import { EquationCard } from "./Equations";
import { FigureCard } from "./FigureCard";
import { LevelSlider } from "./LevelSlider";
import { asPrerequisites, PrerequisiteMap } from "./PrerequisiteMap";
import { ReadingContext, RichText } from "./RichText";

function pageLink(pdfUrl: string | null, page: number) {
  return pdfUrl ? `${pdfUrl}#page=${page}` : null;
}

function QuoteBlock({ quote, pdfUrl, isSample }: { quote: Quote; pdfUrl: string | null; isSample: boolean }) {
  const href = pageLink(pdfUrl, quote.page);
  return (
    <figure className="rounded-xl border-l-4 border-indigo-300 bg-sunken/70 px-4 py-3 dark:border-indigo-700">
      <blockquote className="font-serif text-[0.95rem] leading-relaxed italic">&ldquo;{quote.text}&rdquo;</blockquote>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="link">
            Page {quote.page} of the paper ↗
          </a>
        ) : (
          <span className="font-medium">Page {quote.page}</span>
        )}
        {quote.verified ? (
          <span className="badge bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
              <path d="M8.1 13.6 4.5 10l1.2-1.2 2.4 2.4 6.2-6.2 1.2 1.2Z" />
            </svg>
            Found word for word in the PDF
          </span>
        ) : isSample ? (
          <span className="badge bg-sunken text-muted">Not yet checked against the PDF</span>
        ) : (
          <span className="badge bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
            Couldn&apos;t find this exact wording in the PDF
          </span>
        )}
      </figcaption>
    </figure>
  );
}

function SectionBlock({
  section,
  number,
  paper,
  reading,
}: {
  section: Section;
  number: number;
  paper: PaperDetail;
  reading: Reading;
}) {
  const level = useLevel();
  const equations = reading.equations
    .map((equation, index) => ({ equation, index }))
    .filter(({ equation }) => equation.section_id === section.id);
  const figures = (reading.figures ?? []).filter((figure) => figure.section_id === section.id);
  return (
    <section id={section.id} className="scroll-mt-32 border-t border-line pt-8" aria-labelledby={`${section.id}-title`}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={`${section.id}-title`} className="text-xl font-semibold tracking-tight text-balance">
          <span className="mr-2 text-muted tabular-nums">{number}.</span>
          {section.title}
        </h2>
        <span className="shrink-0 text-xs text-muted">p. {section.page}</span>
      </div>
      <div className="prose-reading mt-4">
        <RichText text={section.explanation[level]} />
      </div>
      {equations.length > 0 && (
        <div className="mt-6 space-y-3">
          {equations.map(({ equation, index }) => (
            <EquationCard key={equation.id} equation={equation} index={index} level={level} />
          ))}
        </div>
      )}
      {figures.length > 0 && (
        <div className="mt-6 space-y-4">
          {figures.map((figure) => (
            <FigureCard key={figure.id} figure={figure} paperId={paper.id} pdfUrl={paper.pdf_url} level={level} />
          ))}
        </div>
      )}
      {section.quotes.length > 0 && (
        <details className="group mt-6" open>
          <summary className="cursor-pointer list-none text-sm font-semibold text-muted select-none hover:text-foreground">
            <span className="inline-block transition-transform group-open:rotate-90" aria-hidden>
              ›
            </span>{" "}
            What the paper says {section.quotes.length > 1 ? `(${section.quotes.length} quotes)` : ""}
          </summary>
          <div className="mt-3 space-y-3">
            {section.quotes.map((quote) => (
              <QuoteBlock key={quote.text} quote={quote} pdfUrl={paper.pdf_url} isSample={paper.is_sample} />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

/** The section being read: the last one whose heading has scrolled past the top third of the screen. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        let current: string | null = null;
        for (const id of ids) {
          const element = document.getElementById(id);
          if (element && element.getBoundingClientRect().top <= window.innerHeight * 0.35) current = id;
        }
        setActive(current);
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [ids]);
  return active;
}

export function ReadingView({
  paper,
  reading,
  onDelete,
}: {
  paper: PaperDetail;
  reading: Reading;
  onDelete?: () => void;
}) {
  const level = useLevel();
  const ids = useMemo(() => reading.sections.map((s) => s.id), [reading.sections]);
  const active = useActiveSection(ids);
  const [asking, setAsking] = useState(false);
  const context = useMemo(
    () => ({ equations: reading.equations, concepts: reading.concepts, level }),
    [reading.equations, reading.concepts, level],
  );
  const authors = reading.authors.length > 4 ? `${reading.authors.slice(0, 3).join(", ")} and others` : reading.authors.join(", ");
  const verified = reading.sections.flatMap((s) => s.quotes).filter((q) => q.verified).length;
  const quotes = reading.sections.flatMap((s) => s.quotes).length;
  const hasMap = asPrerequisites(reading.prerequisites).some((p) => p.primer);

  return (
    <ReadingContext.Provider value={context}>
      <article>
        <header className="max-w-3xl">
          <Link href="/#library" className="text-sm font-medium text-accent hover:underline">
            ← Library
          </Link>
          <p className="mt-6 flex flex-wrap items-center gap-2 text-xs">
            {paper.is_sample && <span className="badge bg-accent-soft text-accent">Sample paper</span>}
            <span className="badge bg-sunken text-muted">{reading.field}</span>
            {reading.year && <span className="text-muted">{reading.year}</span>}
          </p>
          <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{reading.title}</h1>
          <p className="mt-3 text-muted">{authors}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {paper.pdf_url && (
              <a href={paper.pdf_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                Open the PDF ↗
              </a>
            )}
            {paper.arxiv_id && (
              <a
                href={`https://arxiv.org/abs/${paper.arxiv_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
              >
                arXiv:{paper.arxiv_id}
              </a>
            )}
            <button type="button" onClick={() => setAsking(true)} className="btn btn-primary btn-sm">
              Ask the paper
            </button>
            {onDelete && (
              <button type="button" onClick={onDelete} className="btn btn-danger-quiet btn-sm">
                Delete
              </button>
            )}
          </div>
          {paper.is_sample && (
            <p className="mt-4 text-sm text-muted">
              This sample was explained in advance, so you can try Paper2Lab without adding a paper.
            </p>
          )}
        </header>

        <div className="sticky top-0 z-30 -mx-4 mt-8 border-y border-line bg-background/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
          <LevelSlider level={level} />
        </div>

        <div className="mt-8 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
          <nav aria-label="Sections" className="hidden lg:block">
            <div className="sticky top-28">
              <p className="eyebrow">Contents</p>
              <ol className="mt-3 space-y-1 text-sm">
                {hasMap && (
                  <li>
                    <a href="#before-you-read" className="block rounded-lg px-2 py-1.5 text-muted hover:text-foreground">
                      Before you read
                    </a>
                  </li>
                )}
                {reading.sections.map((section, i) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      aria-current={active === section.id ? "location" : undefined}
                      className={`block rounded-lg px-2 py-1.5 leading-snug transition-colors ${
                        active === section.id ? "bg-accent-soft font-medium text-accent" : "text-muted hover:text-foreground"
                      }`}
                    >
                      {i + 1}. {section.title}
                    </a>
                  </li>
                ))}
                {reading.concepts.length > 0 && (
                  <li>
                    <a href="#glossary" className="block rounded-lg px-2 py-1.5 text-muted hover:text-foreground">
                      Glossary
                    </a>
                  </li>
                )}
              </ol>
              {quotes > 0 && !(paper.is_sample && verified === 0) && (
                <p className="mt-6 text-xs leading-relaxed text-muted">
                  {verified} of {quotes} quotes found word for word in the PDF.
                </p>
              )}
            </div>
          </nav>

          <div className="max-w-3xl space-y-10">
            <section aria-labelledby="nutshell" className="card bg-accent-soft/40 p-5 sm:p-6">
              <h2 id="nutshell" className="eyebrow">
                In a nutshell
              </h2>
              <div className="prose-reading mt-3">
                <RichText text={reading.summary[level]} />
              </div>
            </section>

            {reading.contributions.length > 0 && (
              <section className="card p-5 sm:p-6" aria-labelledby="new">
                <h2 id="new" className="text-sm font-semibold">
                  What&apos;s new in this paper
                </h2>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed">
                  {reading.contributions.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {reading.prerequisites.length > 0 && <PrerequisiteMap items={reading.prerequisites} />}

            {reading.sections.map((section, i) => (
              <SectionBlock key={section.id} section={section} number={i + 1} paper={paper} reading={reading} />
            ))}

            {reading.concepts.length > 0 && (
              <section id="glossary" className="scroll-mt-32 border-t border-line pt-8" aria-labelledby="glossary-title">
                <h2 id="glossary-title" className="text-xl font-semibold tracking-tight">
                  Glossary
                </h2>
                <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  {reading.concepts.map((concept) => (
                    <div key={concept.term}>
                      <dt className="font-semibold">{concept.term}</dt>
                      <dd className="mt-0.5 text-sm leading-relaxed text-muted">{concept.meaning}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>
        </div>
      </article>

      {!asking && (
        <button
          type="button"
          onClick={() => setAsking(true)}
          className="btn btn-primary fixed right-4 bottom-4 z-30 rounded-full px-5 shadow-lg shadow-indigo-900/20 print:hidden"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
            <path strokeLinejoin="round" d="M4 4.5h12v8H9l-3.5 3v-3H4Z" />
          </svg>
          Ask the paper
        </button>
      )}
      <AskPanel paper={paper} open={asking} onClose={() => setAsking(false)} />
    </ReadingContext.Provider>
  );
}
