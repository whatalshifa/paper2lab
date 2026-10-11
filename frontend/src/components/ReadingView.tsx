"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { Concept, PaperDetail, Quote, Reading, Section } from "@/lib/api";
import { useLevel } from "@/lib/level";
import { saveProgress } from "@/lib/progress";

import { AskPanel } from "./AskPanel";
import { ConnectionsSection, hasLinks, useConnections } from "./Connections";
import { Demo } from "./demos";
import { EquationCard, equationLabel } from "./Equations";
import { FigureCard } from "./FigureCard";
import { Back, Mark, Out } from "./Glyphs";
import { LevelSlider } from "./LevelSlider";
import { Listen } from "./Listen";
import { asPrerequisites, PrerequisiteMap } from "./PrerequisiteMap";
import { type Answers, Quiz, quizScore, useQuizAnswers } from "./Quiz";
import { ReadingContext, RichText } from "./RichText";
import { Sheet } from "./Sheet";

const SOURCE_LINK =
  "inline-flex items-center gap-1 font-mono text-[0.75rem] text-muted underline-offset-4 hover:text-foreground hover:underline";

function pageLink(pdfUrl: string | null, page: number) {
  return pdfUrl ? `${pdfUrl}#page=${page}` : null;
}

function QuoteBlock({ quote, pdfUrl, isSample }: { quote: Quote; pdfUrl: string | null; isSample: boolean }) {
  const href = pageLink(pdfUrl, quote.page);
  return (
    <figure className="border-l border-rule py-1 pl-5">
      <blockquote className="font-serif text-[1.0625rem] leading-relaxed italic">&ldquo;{quote.text}&rdquo;</blockquote>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[0.6875rem]">
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1">
            Page {quote.page} of the paper
            <Out />
          </a>
        ) : (
          <span className="font-medium">Page {quote.page}</span>
        )}
        {quote.verified ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
            <Mark className="text-[0.875rem]">✓</Mark>
            Found word for word in the PDF
          </span>
        ) : isSample ? (
          <span className="text-muted">Not yet checked against the PDF</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
            <Mark className="text-[0.875rem]">†</Mark>
            Couldn&apos;t find this exact wording in the PDF
          </span>
        )}
      </figcaption>
    </figure>
  );
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The glossary terms an explanation uses, in the order they first appear. */
function termsIn(text: string, concepts: Concept[]) {
  return concepts
    .map((concept) => ({
      concept,
      at: text.search(new RegExp(`\\b${escapeRegExp(concept.term)}\\b`, "i")),
    }))
    .filter(({ at }) => at >= 0)
    .sort((a, b) => a.at - b.at)
    .map(({ concept }) => concept);
}

function SectionBlock({
  section,
  number,
  paper,
  reading,
  answers,
  onChoose,
}: {
  section: Section;
  number: number;
  paper: PaperDetail;
  reading: Reading;
  answers: Answers;
  onChoose: (questionId: string, choice: number | null) => void;
}) {
  const level = useLevel();
  const equations = reading.equations
    .map((equation, index) => ({ equation, index }))
    .filter(({ equation }) => equation.section_id === section.id);
  const figures = (reading.figures ?? []).filter((figure) => figure.section_id === section.id);
  return (
    <section
      id={section.id}
      className="scroll-mt-32 border-t border-rule pt-8"
      aria-labelledby={`${section.id}-title`}
    >
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-4">
          <h2
            id={`${section.id}-title`}
            className="font-serif text-[1.625rem] leading-snug font-normal tracking-[-0.01em] text-balance sm:text-[1.875rem]"
          >
            <span className="mr-3 text-accent italic">{number}.</span>
            {section.title}
          </h2>
          <span className="shrink-0 font-mono text-[0.6875rem] text-muted">Page {section.page}</span>
        </div>
        <div className="prose-reading mt-4">
          <RichText text={section.explanation[level]} />
        </div>
        {equations.length > 0 && (
          <div className="mt-8 space-y-6">
            {equations.map(({ equation, index }) => (
              <div key={equation.id} className="space-y-4">
                <EquationCard equation={equation} index={index} level={level} />
                {equation.demo && <Demo kind={equation.demo} />}
              </div>
            ))}
          </div>
        )}
        {figures.length > 0 && (
          <div className="mt-8 space-y-6">
            {figures.map((figure) => (
              <FigureCard key={figure.id} figure={figure} paperId={paper.id} pdfUrl={paper.pdf_url} level={level} />
            ))}
          </div>
        )}
        {section.quotes.length > 0 && (
          <details className="group mt-8" open>
            <summary className="inline-flex cursor-pointer list-none items-center gap-2 font-mono text-[0.75rem] text-muted select-none hover:text-foreground [&::-webkit-details-marker]:hidden">
              <Mark className="w-3 text-center text-accent group-open:hidden">+</Mark>
              <Mark className="hidden w-3 text-center text-accent group-open:inline">−</Mark>
              What the paper says {section.quotes.length > 1 ? `(${section.quotes.length} quotes)` : ""}
            </summary>
            <div className="mt-4 space-y-4">
              {section.quotes.map((quote) => (
                <QuoteBlock key={quote.text} quote={quote} pdfUrl={paper.pdf_url} isSample={paper.is_sample} />
              ))}
            </div>
          </details>
        )}
        <Quiz section={section} level={level} pdfUrl={paper.pdf_url} answers={answers} onChoose={onChoose} />
      </div>
    </section>
  );
}


/** Where the reader is: the section whose heading last scrolled past the top third of the screen,
 * and how far down the paper they are (0 to 1). */
function useReadingPosition(ids: string[]) {
  const [position, setPosition] = useState<{ active: string | null; progress: number }>({ active: null, progress: 0 });
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        let active: string | null = null;
        for (const id of ids) {
          const element = document.getElementById(id);
          if (element && element.getBoundingClientRect().top <= window.innerHeight * 0.35) active = id;
        }
        const room = document.documentElement.scrollHeight - window.innerHeight;
        const progress = room > 0 ? Math.min(Math.max(window.scrollY / room, 0), 1) : 0;
        setPosition((current) =>
          current.active === active && Math.abs(current.progress - progress) < 0.002 ? current : { active, progress },
        );
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
  return position;
}

const CONTENTS_LINK = "block py-1.5 leading-snug transition-colors";

/** The paper's table of contents, with the section being read marked. */
function Contents({
  reading,
  active,
  hasMap,
  hasConnections,
  onNavigate,
}: {
  reading: Reading;
  active: string | null;
  hasMap: boolean;
  hasConnections: boolean;
  onNavigate?: () => void;
}) {
  const quiet = `${CONTENTS_LINK} pl-6 text-muted hover:text-foreground`;
  return (
    <ol className="border-t border-rule font-serif text-[0.9375rem]">
      <li>
        <a href="#nutshell" onClick={onNavigate} className={quiet}>
          Overview
        </a>
      </li>
      {hasMap && (
        <li>
          <a href="#before-you-read" onClick={onNavigate} className={quiet}>
            Before you read
          </a>
        </li>
      )}
      {reading.sections.map((section, i) => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            onClick={onNavigate}
            aria-current={active === section.id ? "location" : undefined}
            className={`${CONTENTS_LINK} flex gap-2 ${
              active === section.id
                ? "text-foreground italic"
                : "text-muted hover:text-foreground"
            }`}
          >
            <span className={`w-4 shrink-0 text-right ${active === section.id ? "text-accent" : ""}`}>{i + 1}</span>
            <span>{section.title}</span>
          </a>
        </li>
      ))}
      {hasConnections && (
        <li>
          <a href="#builds-on" onClick={onNavigate} className={quiet}>
            What it connects to
          </a>
        </li>
      )}
      {reading.concepts.length > 0 && (
        <li>
          <a href="#glossary" onClick={onNavigate} className={quiet}>
            Glossary
          </a>
        </li>
      )}
    </ol>
  );
}

/**
 * Notes in the margin for the section being read, like the pencil notes in an annotated paper: the
 * terms it uses, the equations and figures it introduces, how its quotes checked out, and questions
 * to ask. Before the first section, the paper's key terms.
 */
function SectionNotes({
  reading,
  active,
  onAsk,
  onNavigate,
}: {
  reading: Reading;
  active: string | null;
  onAsk: (question?: string) => void;
  onNavigate?: () => void;
}) {
  const level = useLevel();
  const index = reading.sections.findIndex((s) => s.id === active);
  const section = index >= 0 ? reading.sections[index] : null;
  const terms = section ? termsIn(section.explanation[level], reading.concepts) : reading.concepts.slice(0, 8);
  const equations = reading.equations
    .map((equation, i) => ({ equation, i }))
    .filter(({ equation }) => section && equation.section_id === section.id);
  const figures = (reading.figures ?? []).filter((figure) => section && figure.section_id === section.id);
  const found = section?.quotes.filter((q) => q.verified).length ?? 0;
  const label = "eyebrow";

  return (
    <div className="space-y-6">
      <div>
        <p className={label}>{section ? `Section ${index + 1} · page ${section.page}` : "Overview"}</p>
        <p className="mt-1 font-serif text-[1.25rem] leading-snug font-normal">
          {section ? section.title : "Key terms in this paper"}
        </p>
      </div>

      {terms.length > 0 && (
        <div>
          {section && <p className={label}>Terms</p>}
          <dl className="mt-2 space-y-3">
            {terms.map((concept) => (
              <div key={concept.term}>
                <dt className="font-serif text-[1rem] font-medium italic">
                  {concept.term.charAt(0).toUpperCase() + concept.term.slice(1)}
                </dt>
                <dd className="text-[0.9375rem] leading-relaxed text-muted">{concept.meaning}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {equations.length > 0 && (
        <div>
          <p className={label}>Equations</p>
          <ul className="mt-2 space-y-2">
            {equations.map(({ equation, i }) => (
              <li key={equation.id} className="text-[0.9375rem] leading-snug">
                <a href={`#eq-${equation.id}`} onClick={onNavigate} className="font-mono text-[0.75rem] text-accent underline underline-offset-4 hover:decoration-2">
                  {equationLabel(equation, i)}
                </a>{" "}
                <span className="text-muted">{equation.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {figures.length > 0 && (
        <div>
          <p className={label}>Figures</p>
          <ul className="mt-2 space-y-2">
            {figures.map((figure) => (
              <li key={figure.id} className="text-[0.9375rem] leading-snug">
                <a href={`#fig-${figure.id}`} onClick={onNavigate} className="font-mono text-[0.75rem] text-accent underline underline-offset-4 hover:decoration-2">
                  {figure.label}
                </a>{" "}
                <span className="text-muted">page {figure.page}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {section && section.quotes.length > 0 && found > 0 && (
        <p className="flex items-start gap-1.5 font-mono text-[0.6875rem] leading-snug text-emerald-800 dark:text-emerald-300">
          <Mark className="text-[0.875rem]">✓</Mark>
          {found} of {section.quotes.length} {section.quotes.length === 1 ? "quote" : "quotes"} found word for word in the PDF
        </p>
      )}

      {(reading.suggested_questions?.length ?? 0) > 0 && (
        <div className="border-t border-line pt-5">
          <p className={label}>Ask this paper</p>
          <ul className="mt-2 border-t border-line">
            {reading.suggested_questions!.map((question) => (
              <li key={question}>
                <button
                  type="button"
                  onClick={() => onAsk(question)}
                  className="w-full border-b border-line px-1 py-2.5 text-left font-serif text-[1rem] leading-snug italic hover:bg-accent-soft"
                >
                  {question}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * The reader, laid out like a reading app: the contents and your progress on the left, the paper's
 * explanation in the middle under a reading-level toolbar, and margin notes for the section you're
 * on at the right. Phones get the paper alone, with contents, notes and questions in a bottom bar.
 */
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
  const { active, progress } = useReadingPosition(ids);
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"contents" | "notes" | null>(null);
  const closeSheet = useCallback(() => setSheet(null), []);
  const context = useMemo(
    () => ({ equations: reading.equations, concepts: reading.concepts, level }),
    [reading.equations, reading.concepts, level],
  );
  const authors =
    reading.authors.length > 4 ? `${reading.authors.slice(0, 3).join(", ")} and others` : reading.authors.join(", ");
  const verified = reading.sections.flatMap((s) => s.quotes).filter((q) => q.verified).length;
  const quotes = reading.sections.flatMap((s) => s.quotes).length;
  const hasMap = asPrerequisites(reading.prerequisites).some((p) => p.primer);
  const { answers, choose } = useQuizAnswers(paper.id);
  const score = quizScore(reading.sections, level, answers);
  const connections = useConnections(paper.id);
  const hasConnections = (connections?.references?.items.length ?? 0) > 0 || hasLinks(connections);
  const activeIndex = reading.sections.findIndex((s) => s.id === active);

  useEffect(() => {
    if (progress > 0) saveProgress(paper.id, progress);
  }, [paper.id, progress]);

  // "?ask=..." (from the library's margin notes) opens the ask panel, with that question if there is one.
  useEffect(() => {
    const ask = new URLSearchParams(window.location.search).get("ask");
    if (ask === null) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the address once, when the page opens
    setQuestion(ask || null);
    setAsking(true);
  }, []);

  const ask = useCallback((text?: string) => {
    setSheet(null);
    setQuestion(text ?? null);
    setAsking(true);
  }, []);

  return (
    <ReadingContext.Provider value={context}>
      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_19rem]">
        <aside
          aria-label="Contents and progress"
          className="hidden lg:sticky lg:top-14 lg:block lg:h-[calc(100dvh-3.5rem)] lg:self-start lg:overflow-y-auto lg:border-r lg:border-line"
        >
          <div className="flex min-h-full flex-col px-4 py-5">
            <Link
              href="/library"
              className="-ml-1 inline-flex items-center gap-1.5 self-start px-1 font-mono text-[0.75rem] text-muted hover:text-foreground"
            >
              <Back />
              Library
            </Link>
            <p className="mt-5 line-clamp-3 font-serif text-[1.125rem] leading-snug italic">{reading.title}</p>
            <p className="mt-1 font-mono text-[0.6875rem] text-muted">{[reading.year, paper.page_count && `${paper.page_count} pages`].filter(Boolean).join(" · ")}</p>

            <nav aria-label="Sections" className="mt-6">
              <p className="eyebrow mb-1.5">Contents</p>
              <Contents reading={reading} active={active} hasMap={hasMap} hasConnections={hasConnections} />
            </nav>

            <div className="mt-auto space-y-3 border-t border-line pt-4 text-[0.875rem] leading-relaxed text-muted">
              <div>
                <div className="flex justify-between font-mono text-[0.6875rem]">
                  <span>Read so far</span>
                  <span>{Math.round(progress * 100)}%</span>
                </div>
                <div className="mt-1.5 h-px bg-line" aria-hidden>
                  <div className="h-[3px] -translate-y-px bg-claret-700 dark:bg-claret-300" style={{ width: `${progress * 100}%` }} />
                </div>
              </div>
              {quotes > 0 && !(paper.is_sample && verified === 0) && (
                <p>
                  {verified} of {quotes} quotes found word for word in the PDF.{" "}
                  <Link href="/accuracy" className="link">
                    How we check
                  </Link>
                </p>
              )}
              {score.total > 0 && (
                <p>
                  {score.answered === 0
                    ? `${score.total} check-yourself questions at this level.`
                    : `Check yourself: ${score.right} of ${score.answered} right so far, ${score.total - score.answered} to go.`}
                </p>
              )}
            </div>
          </div>
        </aside>

        <article className="min-w-0 bg-surface lg:min-h-[calc(100dvh-3.5rem)]">
          <header className="mx-auto max-w-[42rem] px-4 pt-5 sm:px-8 lg:pt-10">
            <Link
              href="/library"
              className="-ml-1 inline-flex items-center gap-1.5 px-1 font-mono text-[0.75rem] text-muted hover:text-foreground lg:hidden"
            >
              <Back />
              Library
            </Link>
            <p className="mt-5 border-b border-line pb-2 font-mono text-[0.6875rem] text-muted lg:mt-0">
              {[
                paper.is_sample ? "Sample paper" : null,
                paper.arxiv_id ? `arXiv:${paper.arxiv_id}` : null,
                reading.field,
                reading.year,
              ]
                .filter(Boolean)
                .join("  ·  ")}
            </p>
            <h1 className="mt-5 font-serif text-[2.125rem] leading-[1.08] font-normal tracking-[-0.02em] text-balance sm:text-[2.875rem]">
              {reading.title}
            </h1>
            <p className="mt-3 font-serif text-[1.0625rem] text-muted italic">{authors}</p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => ask()} className="btn btn-secondary btn-sm">
                Ask the paper
              </button>
              <Listen reading={reading} level={level} />
              {paper.pdf_url && (
                <a href={paper.pdf_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                  Open the PDF
                  <Out />
                </a>
              )}
              {onDelete && (
                <button type="button" onClick={onDelete} className="btn btn-danger-quiet btn-sm ml-auto">
                  Delete
                </button>
              )}
            </div>
            {(paper.arxiv_id || (connections && connections.code.length > 0)) && (
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                {paper.arxiv_id && (
                  <a
                    href={`https://arxiv.org/abs/${paper.arxiv_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={SOURCE_LINK}
                  >
                    arxiv.org/abs/{paper.arxiv_id}
                  </a>
                )}
                {connections && connections.code.length > 0 && (
                  <a href={connections.code[0].url} target="_blank" rel="noopener noreferrer" className={SOURCE_LINK}>
                    Code
                    <Out />
                  </a>
                )}
              </div>
            )}
            {paper.is_sample && (
              <p className="mt-4 font-serif text-[0.9375rem] text-muted italic">
                This sample was explained in advance, so you can try Paper2Lab without adding a paper.
              </p>
            )}
          </header>

          <div className="sticky top-14 z-30 mt-6 border-b border-line bg-surface">
            <div className="mx-auto flex max-w-[42rem] items-center gap-6 px-4 py-1.5 sm:px-8">
              <div className="min-w-0 flex-1">
                <LevelSlider level={level} compact />
              </div>
              <p className="hidden w-44 truncate text-right font-serif text-[0.875rem] text-muted italic md:block" aria-hidden>
                {activeIndex >= 0 ? `§\u2009${activeIndex + 1}. ${reading.sections[activeIndex].title}` : "Overview"}
              </p>
            </div>
            <div className="absolute inset-x-0 -bottom-px h-[2px]" aria-hidden>
              <div className="h-full bg-claret-700 dark:bg-claret-300" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>

          <div className="mx-auto max-w-[42rem] space-y-12 px-4 pt-10 pb-28 sm:px-8 lg:pb-20">
            <section aria-labelledby="nutshell" className="scroll-mt-32">
              <h2 id="nutshell" className="eyebrow scroll-mt-32">
                In a nutshell
              </h2>
              <div className="prose-reading mt-2 first-letter:float-left first-letter:mt-1 first-letter:mr-1.5 first-letter:font-serif first-letter:text-[3.6em] first-letter:leading-[0.8] first-letter:text-accent sm:text-[1.1875rem]">
                <RichText text={reading.summary[level]} />
              </div>
            </section>

            {reading.contributions.length > 0 && (
              <section aria-labelledby="new">
                <h2 id="new" className="eyebrow">
                  What&apos;s new in this paper
                </h2>
                <ul className="mt-3 space-y-2.5 font-serif text-[1.0625rem] leading-relaxed sm:text-[1.125rem]">
                  {reading.contributions.map((item) => (
                    <li key={item} className="flex gap-3">
                      <Mark className="shrink-0 text-accent">§</Mark>
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {reading.prerequisites.length > 0 && <PrerequisiteMap items={reading.prerequisites} />}

            {reading.sections.map((section, i) => (
              <SectionBlock
                key={section.id}
                section={section}
                number={i + 1}
                paper={paper}
                reading={reading}
                answers={answers}
                onChoose={choose}
              />
            ))}

            <ConnectionsSection connections={connections} />

            {reading.concepts.length > 0 && (
              <section id="glossary" className="scroll-mt-32 border-t border-rule pt-8" aria-labelledby="glossary-title">
                <h2 id="glossary-title" className="font-serif text-[1.875rem] font-normal tracking-[-0.01em] italic">
                  Glossary
                </h2>
                <dl className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2">
                  {reading.concepts.map((concept) => (
                    <div key={concept.term}>
                      <dt className="font-serif text-[1.0625rem] font-medium italic">{concept.term}</dt>
                      <dd className="mt-1 text-[0.9375rem] leading-relaxed text-muted">{concept.meaning}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>
        </article>

        <aside
          aria-label="Margin notes"
          className="hidden xl:sticky xl:top-14 xl:block xl:h-[calc(100dvh-3.5rem)] xl:self-start xl:overflow-y-auto xl:border-l xl:border-line"
        >
          <div className="px-5 py-5">
            <SectionNotes reading={reading} active={active} onAsk={ask} />
          </div>
        </aside>
      </div>

      {/* Phones and tablets: the reader's tools in a bar along the bottom, opening sheets. */}
      <nav
        aria-label="Reader tools"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 divide-x divide-line border-t-[3px] border-double border-rule bg-background pb-[env(safe-area-inset-bottom)] lg:hidden print:hidden"
      >
        {[
          { label: "Contents", mark: "§", onClick: () => setSheet("contents") },
          { label: "Notes", mark: "¶", onClick: () => setSheet("notes") },
          { label: "Ask", mark: "?", onClick: () => ask() },
        ].map((tool) => (
          <button
            key={tool.label}
            type="button"
            onClick={tool.onClick}
            className="flex h-14 items-center justify-center gap-2 font-mono text-[0.75rem] text-muted hover:text-foreground"
          >
            <Mark className="text-[1.125rem] text-accent">{tool.mark}</Mark>
            {tool.label}
          </button>
        ))}
      </nav>
      {sheet === "contents" && (
        <Sheet title="Contents" onClose={closeSheet}>
          <Contents reading={reading} active={active} hasMap={hasMap} hasConnections={hasConnections} onNavigate={closeSheet} />
          <p className="mt-4 font-mono text-[0.6875rem] text-muted">{Math.round(progress * 100)}% read</p>
        </Sheet>
      )}
      {sheet === "notes" && (
        <Sheet title="Notes" onClose={closeSheet}>
          <SectionNotes reading={reading} active={active} onAsk={ask} onNavigate={closeSheet} />
        </Sheet>
      )}

      <AskPanel
        paper={paper}
        open={asking}
        initialQuestion={question}
        onClose={() => {
          setAsking(false);
          setQuestion(null);
        }}
      />
    </ReadingContext.Provider>
  );
}
