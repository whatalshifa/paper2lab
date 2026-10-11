"use client";

import type { Concept, Reading } from "@/lib/api";
import { useLevel } from "@/lib/level";

import { equationLabel } from "../Equations";
import { Mark } from "../Glyphs";

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
 * Notes in the margin for the section being read, like the pencil notes in an annotated paper: the
 * terms it uses, the equations and figures it introduces, how its quotes checked out, and questions
 * to ask. Before the first section, the paper's key terms.
 */
export function SectionNotes({
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
