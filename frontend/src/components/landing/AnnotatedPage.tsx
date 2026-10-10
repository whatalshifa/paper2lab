"use client";

import { CircleCheck, ExternalLink, MousePointerClick } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

import type { Equation, PaperDetail, Quote } from "@/lib/api";
import { useLevel } from "@/lib/level";

import { Hovercard } from "../Hovercard";
import { Question } from "../Quiz";
import { ReadingContext, RichText } from "../RichText";
import { Tex } from "../Tex";
import { ATTENTION_ID, useSample } from "./data";

/** The numbered dot that ties a passage on the page to its note in the margin. */
function Marker({ n }: { n: number }) {
  return (
    <span
      className="mx-0.5 inline-flex h-[1.15rem] w-[1.15rem] -translate-y-[0.35em] items-center justify-center rounded-full bg-claret-700 align-baseline font-sans text-[0.6875rem] leading-none font-semibold text-white not-italic dark:bg-claret-300 dark:text-claret-950"
      aria-hidden
    >
      {n}
    </span>
  );
}

function PageTag({ page, top = "lg:top-1" }: { page: number; top?: string }) {
  return (
    <span className={`absolute left-3 hidden w-8 text-right font-mono text-[0.6875rem] text-muted lg:block ${top}`}>
      p.&nbsp;{page}
    </span>
  );
}

function Highlight({ children }: { children: ReactNode }) {
  return <mark className="bg-claret-100/80 box-decoration-clone px-0.5 text-inherit dark:bg-claret-900/70">{children}</mark>;
}

function Heading({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 font-serif text-[1.0625rem] font-bold tracking-[-0.005em]">{children}</h3>;
}

/** On wide screens, the room a passage's note takes is filled with faint lines: the paper's text
 * that is left out here, drawn as type-shaped rules rather than invented words. */
function Omitted() {
  return (
    <span
      className="mt-6 hidden min-h-0 flex-1 lg:block"
      aria-hidden
      style={{
        backgroundImage: "repeating-linear-gradient(to bottom, transparent 0 18px, var(--sunken) 18px 26px)",
        maskImage: "linear-gradient(to right, black 0 72%, transparent 92%), linear-gradient(to bottom, black, transparent)",
        maskComposite: "intersect",
        WebkitMaskComposite: "source-in",
      }}
    />
  );
}

function Gap() {
  return <span className="text-muted"> […] </span>;
}

function Note({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <aside aria-label={`Note ${n}: ${title}`} className="relative">
      <p className="flex items-center gap-2 text-[0.8125rem] font-semibold">
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-claret-700 text-[0.6875rem] text-white dark:bg-claret-300 dark:text-claret-950"
          aria-hidden
        >
          {n}
        </span>
        {title}
      </p>
      <div className="mt-2 text-[0.9375rem] leading-relaxed text-muted">{children}</div>
    </aside>
  );
}

function PageLink({ pdfUrl, page, children }: { pdfUrl: string | null; page: number; children: ReactNode }) {
  if (!pdfUrl) return <span className="font-medium">{children}</span>;
  return (
    <a href={`${pdfUrl}#page=${page}`} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1">
      {children}
      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
    </a>
  );
}

/** The equation as the paper prints it, with its number. Hover or tap: what it means, symbol by symbol. */
function PaperEquation({ equation }: { equation: Equation }) {
  const level = useLevel();
  return (
    <Hovercard
      label={`Equation ${equation.number ?? ""} ${equation.name}: what it means`}
      block
      triggerClassName="tex-scroll group relative my-3 w-full overflow-x-auto rounded-md px-2 py-3 text-center outline-offset-2 transition-colors hover:bg-accent-soft/60 aria-expanded:bg-accent-soft/60"
      trigger={
        <span className="flex items-center justify-center gap-3">
          <span className="min-w-0 flex-1">
            <Tex latex={equation.latex} display />
          </span>
          <span className="shrink-0 font-serif text-[0.9375rem]">{equation.number}</span>
          <Marker n={2} />
        </span>
      }
    >
      <p className="font-semibold">{equation.name}</p>
      <div className="mt-2 leading-relaxed">
        <RichText text={equation.in_words[level]} inline />
      </div>
      <p className="mt-3 text-xs text-muted">From page {equation.page} of the paper</p>
    </Hovercard>
  );
}

function Rows({ paper }: { paper: PaperDetail }) {
  const level = useLevel();
  const reading = paper.reading!;
  const [answer, setAnswer] = useState<number | undefined>(undefined);
  const context = useMemo(() => ({ equations: reading.equations, concepts: reading.concepts, level }), [reading, level]);

  const s3 = reading.sections.find((s) => s.id === "s3");
  const s4 = reading.sections.find((s) => s.id === "s4");
  const equation = reading.equations.find((e) => e.id === "e1");
  const prepared = reading.prepared_answers?.find((a) => /square root of d_k/.test(a.question));
  const definition: Quote | undefined = s3?.quotes[0];
  const heads: Quote | undefined = s4?.quotes[0];
  const scaling = prepared?.parts[0]?.citations[0];
  if (!s3 || !s4 || !equation || !prepared || !definition || !heads || !scaling) return null;

  // A check-yourself question about multi-head attention, at the visitor's level: one that points
  // at the quote on this page if there is one.
  const questions = s4.quiz?.[level] ?? [];
  const question = questions.find((q) => q.quote === 0) ?? questions[0];

  // On phones each passage is its own small sheet with its note under it; on wide screens the
  // passages join into one page (drawn once behind them) with the notes beside it.
  const sheet = "relative rounded-lg border border-line bg-surface px-5 py-6 sm:px-14 lg:flex lg:flex-col lg:rounded-none lg:border-0 lg:bg-transparent lg:py-0";
  const note = "mb-8 ml-4 mt-0 border-l-2 border-claret-200 pt-4 pl-4 sm:ml-8 lg:m-0 lg:border-0 lg:p-0 dark:border-claret-900";

  return (
    <ReadingContext.Provider value={context}>
      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,40rem)_minmax(0,1fr)] lg:grid-rows-[auto_auto_auto_auto] lg:gap-x-14 xl:gap-x-20">
        {/* The sheet's shadow and edges, drawn once behind all of its rows. */}
        <div
          className="pointer-events-none hidden rounded-lg border border-line bg-surface shadow-[0_30px_60px_-30px_rgb(46_11_18/0.35)] lg:col-start-1 lg:row-[1/-1] lg:block dark:shadow-[0_30px_60px_-30px_rgb(0_0_0/0.8)]"
          aria-hidden
        />

        {/* 1. The definition of attention, and the check behind it. */}
        <div className={`${sheet} lg:col-start-1 lg:row-start-1 lg:pt-8 lg:pb-6`}>
          <p className="mb-6 flex items-baseline justify-between gap-4 border-b border-line pb-3 font-serif text-[0.8125rem] text-muted italic">
            <span>{reading.title}</span>
            <span className="not-italic">{reading.year}</span>
          </p>
          <div>
            <PageTag page={definition.page} top="lg:top-[5.15rem]" />
          <Heading>3.2&ensp;Attention</Heading>
          <p className="font-serif text-[1.0625rem] leading-[1.7]">
            <Highlight>{definition.text}</Highlight>
            <Marker n={1} />
          </p>
          </div>
          <Omitted />
        </div>
        <div className={`${note} lg:col-start-2 lg:row-start-1 lg:self-start lg:pt-[5rem] lg:pb-10`}>
          <Note n={1} title="Every claim is checked against the PDF">
            <p>
              This is the sentence Paper2Lab&apos;s explanation of the section rests on. Plain code, not the AI, found it
              in the PDF word for word.
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem]">
              {definition.verified && (
                <span className="inline-flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                  <CircleCheck className="h-3.5 w-3.5" aria-hidden />
                  Found word for word
                </span>
              )}
              <PageLink pdfUrl={paper.pdf_url} page={definition.page}>
                Page {definition.page} of the paper
              </PageLink>
            </p>
          </Note>
        </div>

        {/* 2. Equation (1), explained symbol by symbol. */}
        <div className={`${sheet} lg:col-start-1 lg:row-start-2 lg:pb-4`}>
          <PageTag page={equation.page} />
          <Heading>3.2.1&ensp;Scaled Dot-Product Attention</Heading>
          <PaperEquation equation={equation} />
          <Omitted />
        </div>
        <div className={`${note} lg:col-start-2 lg:row-start-2 lg:self-start lg:pb-10`}>
          <Note n={2} title="Equations, in words">
            <p className="flex items-start gap-1.5">
              <MousePointerClick className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden />
              <span>Hover or tap the equation for what it says. Every symbol comes with its meaning:</span>
            </p>
            <dl className="mt-3 grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 text-[0.875rem]">
              {equation.symbols.slice(0, 5).map((symbol) => (
                <div key={symbol.latex} className="contents">
                  <dt className="text-right text-foreground">
                    <Tex latex={symbol.latex} />
                  </dt>
                  <dd>{symbol.meaning}</dd>
                </div>
              ))}
            </dl>
          </Note>
        </div>

        {/* 3. Why divide by √d_k: a prepared answer, with its source. */}
        <div className={`${sheet} lg:col-start-1 lg:row-start-3 lg:pb-6`}>
          <PageTag page={scaling.start_page} />
          <p className="font-serif text-[1.0625rem] leading-[1.7]">
            <Gap />
            <Highlight>{scaling.quote}</Highlight> <Tex latex="1/\sqrt{d_k}" />.
            <Marker n={3} />
          </p>
          <Omitted />
        </div>
        <div className={`${note} lg:col-start-2 lg:row-start-3 lg:self-start lg:pb-10`}>
          <Note n={3} title="Ask the paper">
            <p className="font-serif text-[1.0625rem] text-foreground italic">&ldquo;{prepared.question}&rdquo;</p>
            <div className="mt-2">
              <RichText text={prepared.parts[0].text} inline />{" "}
              <PageLink pdfUrl={paper.pdf_url} page={scaling.start_page}>
                Page {scaling.start_page}
              </PageLink>
            </div>
            <p className="mt-2 text-[0.8125rem]">Answers come only from the paper, each sentence tied to its page.</p>
          </Note>
        </div>

        {/* 4. Multi-head attention, and a question to check it sank in. */}
        <div className={`${sheet} lg:col-start-1 lg:row-start-4 lg:pb-12`}>
          <PageTag page={heads.page} />
          <Heading>3.2.2&ensp;Multi-Head Attention</Heading>
          <p className="font-serif text-[1.0625rem] leading-[1.7]">
            <Gap />
            <Highlight>{heads.text}</Highlight>
            <Marker n={4} />
          </p>
          <Omitted />
        </div>
        <div className={`${note} pb-0 lg:col-start-2 lg:row-start-4 lg:self-start`}>
          <Note n={4} title="Check yourself">
            {question ? (
              <div className="text-foreground">
                <Question
                  question={question}
                  number={1}
                  quote={question.quote === null ? null : (s4.quotes[question.quote] ?? null)}
                  pdfUrl={paper.pdf_url}
                  chosen={answer}
                  onChoose={(choice) => setAnswer(choice ?? undefined)}
                />
              </div>
            ) : null}
          </Note>
        </div>
      </div>
    </ReadingContext.Provider>
  );
}

/**
 * The signature figure: a page of "Attention Is All You Need" with Paper2Lab's notes in the margin,
 * the way Distill sets its side notes. Every passage on the page is quoted word for word from the
 * sample data; the text between passages is left out and marked […].
 */
export function AnnotatedPage() {
  const { data: paper, failed } = useSample(ATTENTION_ID);
  if (failed) {
    return <p className="text-muted">The annotated page couldn&apos;t load just now. Open the library to read the paper.</p>;
  }
  if (!paper?.reading) {
    return (
      <div className="grid gap-10 lg:grid-cols-[minmax(0,40rem)_minmax(0,1fr)]" aria-busy="true" aria-label="Loading the page">
        <div className="skeleton h-[34rem]" />
        <div className="space-y-6">
          <div className="skeleton h-28" />
          <div className="skeleton h-40" />
          <div className="skeleton h-28" />
        </div>
      </div>
    );
  }
  return <Rows paper={paper} />;
}
