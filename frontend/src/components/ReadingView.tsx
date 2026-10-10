"use client";

import {
  ArrowLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  ExternalLink,
  MessageSquare,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { Concept, PaperDetail, Quote, Reading, Section } from "@/lib/api";
import { useLevel } from "@/lib/level";

import { AskPanel } from "./AskPanel";
import { ConnectionsSection, hasLinks, useConnections } from "./Connections";
import { Demo } from "./demos";
import { EquationCard, equationLabel } from "./Equations";
import { FigureCard } from "./FigureCard";
import { LevelSlider } from "./LevelSlider";
import { Listen } from "./Listen";
import { asPrerequisites, PrerequisiteMap } from "./PrerequisiteMap";
import { type Answers, Quiz, quizScore, useQuizAnswers } from "./Quiz";
import { ReadingContext, RichText } from "./RichText";

const SOURCE_LINK =
  "inline-flex items-center gap-1 rounded-md font-medium text-muted underline-offset-4 hover:text-foreground hover:underline";

function pageLink(pdfUrl: string | null, page: number) {
  return pdfUrl ? `${pdfUrl}#page=${page}` : null;
}

function QuoteBlock({ quote, pdfUrl, isSample }: { quote: Quote; pdfUrl: string | null; isSample: boolean }) {
  const href = pageLink(pdfUrl, quote.page);
  return (
    <figure className="border-l-2 border-claret-700 py-1 pl-4 dark:border-claret-300">
      <blockquote className="font-serif text-[1.0625rem] leading-relaxed italic">&ldquo;{quote.text}&rdquo;</blockquote>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem]">
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1">
            Page {quote.page} of the paper
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        ) : (
          <span className="font-medium">Page {quote.page}</span>
        )}
        {quote.verified ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
            <CircleCheck className="h-3.5 w-3.5" aria-hidden />
            Found word for word in the PDF
          </span>
        ) : isSample ? (
          <span className="text-muted">Not yet checked against the PDF</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
            <CircleAlert className="h-3.5 w-3.5" aria-hidden />
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

/**
 * Notes in the margin beside a section, like the pencil notes in an annotated paper: the terms it
 * uses and the equations it introduces. Only on wide screens, where there's a margin to write in;
 * on smaller ones the same terms are still underlined in the text, with a definition on hover.
 */
function MarginNotes({
  section,
  terms,
  equations,
}: {
  section: Section;
  terms: Concept[];
  equations: { equation: Reading["equations"][number]; index: number }[];
}) {
  if (terms.length === 0 && equations.length === 0) return null;
  return (
    <aside aria-label={`Notes on ${section.title}`} className="hidden xl:block">
      <div className="space-y-4 border-l border-line pl-4 font-serif text-[0.9375rem] leading-snug">
        {terms.slice(0, 4).map((concept) => (
          <p key={concept.term}>
            <span className="font-semibold text-accent">
              {concept.term.charAt(0).toUpperCase() + concept.term.slice(1)}.
            </span>{" "}
            <span className="text-muted">{concept.meaning}</span>
          </p>
        ))}
        {equations.map(({ equation, index }) => (
          <p key={equation.id}>
            <a href={`#eq-${equation.id}`} className="font-semibold text-accent hover:underline">
              {equationLabel(equation, index)}
            </a>{" "}
            <span className="text-muted italic">{equation.name}</span>
          </p>
        ))}
      </div>
    </aside>
  );
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
  const terms = termsIn(section.explanation[level], reading.concepts);
  return (
    <section
      id={section.id}
      className="reading-section scroll-mt-28 border-t border-line pt-10 xl:grid xl:grid-cols-[minmax(0,40rem)_13rem] xl:gap-x-10"
      aria-labelledby={`${section.id}-title`}
    >
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-4">
          <h2
            id={`${section.id}-title`}
            className="text-[1.375rem] leading-snug font-semibold tracking-tight text-balance"
          >
            <span className="mr-2 font-medium text-muted tabular-nums">{number}.</span>
            {section.title}
          </h2>
          <span className="shrink-0 text-[0.8125rem] text-muted">Page {section.page}</span>
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
            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md text-sm font-medium text-muted select-none hover:text-foreground [&::-webkit-details-marker]:hidden">
              <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" aria-hidden />
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
      <MarginNotes section={section} terms={terms} equations={equations} />
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
  const authors =
    reading.authors.length > 4 ? `${reading.authors.slice(0, 3).join(", ")} and others` : reading.authors.join(", ");
  const verified = reading.sections.flatMap((s) => s.quotes).filter((q) => q.verified).length;
  const quotes = reading.sections.flatMap((s) => s.quotes).length;
  const hasMap = asPrerequisites(reading.prerequisites).some((p) => p.primer);
  const { answers, choose } = useQuizAnswers(paper.id);
  const score = quizScore(reading.sections, level, answers);
  const connections = useConnections(paper.id);
  const hasConnections = (connections?.references?.items.length ?? 0) > 0 || hasLinks(connections);

  return (
    <ReadingContext.Provider value={context}>
      <article>
        <header className="max-w-3xl">
          <Link
            href="/#library"
            className="-ml-1 inline-flex items-center gap-1.5 rounded-md px-1 text-sm font-medium text-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Library
          </Link>
          <p className="mt-8 text-[0.8125rem] font-medium text-accent">
            {[paper.is_sample ? "Sample paper" : null, reading.field, reading.year].filter(Boolean).join(" · ")}
          </p>
          <h1 className="mt-2 font-serif text-[1.875rem] leading-[1.15] font-semibold tracking-[-0.01em] text-balance sm:text-[2.375rem]">
            {reading.title}
          </h1>
          <p className="mt-3 text-[0.9375rem] text-muted">{authors}</p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setAsking(true)} className="btn btn-secondary btn-sm">
              <MessageSquare className="h-4 w-4" aria-hidden />
              Ask the paper
            </button>
            <Listen reading={reading} level={level} />
            {onDelete && (
              <button type="button" onClick={onDelete} className="btn btn-danger-quiet btn-sm ml-auto">
                <Trash2 className="h-4 w-4" aria-hidden />
                Delete
              </button>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {paper.pdf_url && (
              <a href={paper.pdf_url} target="_blank" rel="noopener noreferrer" className={SOURCE_LINK}>
                Open the PDF
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            )}
            {paper.arxiv_id && (
              <a
                href={`https://arxiv.org/abs/${paper.arxiv_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className={SOURCE_LINK}
              >
                arXiv:{paper.arxiv_id}
              </a>
            )}
            {connections && connections.code.length > 0 && (
              <a href={connections.code[0].url} target="_blank" rel="noopener noreferrer" className={SOURCE_LINK}>
                Code
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            )}
          </div>
          {paper.is_sample && (
            <p className="mt-5 text-sm text-muted">
              This sample was explained in advance, so you can try Paper2Lab without adding a paper.
            </p>
          )}
        </header>

        <div className="sticky top-0 z-30 -mx-4 mt-10 border-b border-line bg-background/90 px-4 py-3 backdrop-blur-md sm:mx-0 sm:px-0">
          <LevelSlider level={level} />
        </div>

        <div className="mt-10 lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-12">
          <nav aria-label="Sections" className="hidden lg:block">
            <div className="sticky top-28">
              <p className="text-[0.8125rem] font-semibold">Contents</p>
              <ol className="mt-3 border-l border-line text-sm">
                {hasMap && (
                  <li>
                    <a
                      href="#before-you-read"
                      className="-ml-px block border-l-2 border-transparent py-1.5 pl-3 text-muted hover:text-foreground"
                    >
                      Before you read
                    </a>
                  </li>
                )}
                {reading.sections.map((section, i) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      aria-current={active === section.id ? "location" : undefined}
                      className={`-ml-px block border-l-2 py-1.5 pl-3 leading-snug transition-colors ${
                        active === section.id
                          ? "border-claret-700 font-medium text-foreground dark:border-claret-300"
                          : "border-transparent text-muted hover:text-foreground"
                      }`}
                    >
                      {i + 1}. {section.title}
                    </a>
                  </li>
                ))}
                {hasConnections && (
                  <li>
                    <a href="#builds-on" className="-ml-px block border-l-2 border-transparent py-1.5 pl-3 text-muted hover:text-foreground">
                      What it connects to
                    </a>
                  </li>
                )}
                {reading.concepts.length > 0 && (
                  <li>
                    <a href="#glossary" className="-ml-px block border-l-2 border-transparent py-1.5 pl-3 text-muted hover:text-foreground">
                      Glossary
                    </a>
                  </li>
                )}
              </ol>
              {quotes > 0 && !(paper.is_sample && verified === 0) && (
                <p className="mt-6 text-[0.8125rem] leading-relaxed text-muted">
                  {verified} of {quotes} quotes found word for word in the PDF.{" "}
                  <Link href="/accuracy" className="link">
                    How we check
                  </Link>
                </p>
              )}
              {score.total > 0 && (
                <p className="mt-3 text-[0.8125rem] leading-relaxed text-muted">
                  {score.answered === 0
                    ? `${score.total} check-yourself questions at this level.`
                    : `Check yourself: ${score.right} of ${score.answered} right so far, ${score.total - score.answered} to go.`}
                </p>
              )}
            </div>
          </nav>

          <div className="max-w-3xl space-y-12 xl:max-w-none xl:[&>*:not(.reading-section)]:max-w-[40rem]">
            <section
              aria-labelledby="nutshell"
              className="border-l-2 border-claret-700 pl-5 dark:border-claret-300"
            >
              <h2 id="nutshell" className="eyebrow">
                In a nutshell
              </h2>
              <div className="prose-reading mt-2 sm:text-[1.1875rem]">
                <RichText text={reading.summary[level]} />
              </div>
            </section>

            {reading.contributions.length > 0 && (
              <section aria-labelledby="new">
                <h2 id="new" className="text-lg font-semibold tracking-tight">
                  What&apos;s new in this paper
                </h2>
                <ul className="mt-3 space-y-2.5 font-serif text-[1.0625rem] leading-relaxed sm:text-[1.125rem]">
                  {reading.contributions.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-[0.7em] h-1 w-1 shrink-0 rounded-full bg-claret-700 dark:bg-claret-300" aria-hidden />
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
              <section
                id="glossary"
                className="scroll-mt-28 border-t border-line pt-10"
                aria-labelledby="glossary-title"
              >
                <h2 id="glossary-title" className="text-[1.375rem] font-semibold tracking-tight">
                  Glossary
                </h2>
                <dl className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2">
                  {reading.concepts.map((concept) => (
                    <div key={concept.term}>
                      <dt className="font-serif text-[1.0625rem] font-semibold">{concept.term}</dt>
                      <dd className="mt-1 text-[0.9375rem] leading-relaxed text-muted">{concept.meaning}</dd>
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
          className="btn btn-primary fixed right-4 bottom-4 z-30 shadow-[0_4px_16px_rgb(0_0_0/0.18)] sm:right-6 sm:bottom-6 print:hidden"
        >
          <MessageSquare className="h-4 w-4" aria-hidden />
          Ask the paper
        </button>
      )}
      <AskPanel paper={paper} open={asking} onClose={() => setAsking(false)} />
    </ReadingContext.Provider>
  );
}
