"use client";

import type { PaperDetail, Quote, Reading, Section } from "@/lib/api";
import { useLevel } from "@/lib/level";

import { Demo } from "../demos";
import { EquationCard } from "../Equations";
import { FigureCard } from "../FigureCard";
import { Mark, Out } from "../Glyphs";
import { type Answers, Quiz } from "../Quiz";
import { RichText } from "../RichText";

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

/** One section of the paper: its explanation at the reader's level, then its equations, figures, quotes and quiz. */
export function SectionBlock({
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
