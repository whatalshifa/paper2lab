"use client";

import { ChevronRight, MessageSquare } from "lucide-react";
import Link from "next/link";
import { type KeyboardEvent, useId, useMemo, useRef, useState } from "react";

import type { PaperDetail, Reading } from "@/lib/api";
import { useLevel } from "@/lib/level";

import { AnswerView } from "./AskPanel";
import { equationLabel } from "./Equations";
import { ReadingContext, RichText } from "./RichText";
import { Tex } from "./Tex";

type Tab = "terms" | "equations" | "ask";

/**
 * The margin notes for one paper, beside its first page in the library: the terms it uses, its key
 * equations explained at the chosen level, and questions to ask it (answered right here when the
 * answer was prepared in advance, otherwise in the reader).
 */
export function PaperNotes({
  paper,
  reading,
  aiEnabled,
}: {
  paper: PaperDetail;
  reading: Reading;
  aiEnabled: boolean;
}) {
  const level = useLevel();
  const base = useId();
  const [tab, setTab] = useState<Tab>("terms");
  const [asked, setAsked] = useState<string | null>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const context = useMemo(
    () => ({ equations: reading.equations, concepts: reading.concepts, level }),
    [reading.equations, reading.concepts, level],
  );
  const prepared = reading.prepared_answers ?? [];
  const answer = prepared.find((p) => p.question === asked);
  const items: { id: Tab; label: string; count?: number }[] = [
    { id: "terms", label: "Terms", count: reading.concepts.length },
    { id: "equations", label: "Equations", count: reading.equations.length },
    { id: "ask", label: "Ask" },
  ];

  function onKey(event: KeyboardEvent, index: number) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + items.length) % items.length;
    setTab(items[next].id);
    tabs.current[next]?.focus();
  }

  return (
    <ReadingContext.Provider value={context}>
      <div className="sticky top-0 z-10 border-b border-line bg-background px-5 pt-4">
        <p className="text-[0.6875rem] font-semibold tracking-[0.06em] text-muted uppercase">Margin notes</p>
        <div role="tablist" aria-label="Margin notes" className="mt-2 flex gap-5">
          {items.map((item, i) => (
            <button
              key={item.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              id={`${base}-${item.id}-tab`}
              role="tab"
              type="button"
              aria-selected={tab === item.id}
              aria-controls={`${base}-${item.id}`}
              tabIndex={tab === item.id ? 0 : -1}
              onClick={() => setTab(item.id)}
              onKeyDown={(event) => onKey(event, i)}
              className={`-mb-px border-b-2 pb-2 text-[0.8125rem] font-medium transition-colors ${
                tab === item.id
                  ? "border-claret-700 text-foreground dark:border-claret-300"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {item.label}
              {item.count !== undefined && <span className="ml-1 text-muted tabular-nums">{item.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Every panel is in the page (inactive ones hidden), so each tab's aria-controls points somewhere. */}
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${base}-${item.id}`}
          aria-labelledby={`${base}-${item.id}-tab`}
          hidden={tab !== item.id}
          tabIndex={0}
          className="px-5 py-4 focus-visible:outline-offset-[-2px]"
        >
          {item.id === "terms" && (
            <dl className="divide-y divide-line">
              {reading.concepts.map((concept) => (
                <div key={concept.term} className="py-3 first:pt-1">
                  <dt className="font-serif text-[0.9375rem] font-semibold">
                    {concept.term.charAt(0).toUpperCase() + concept.term.slice(1)}
                  </dt>
                  <dd className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted">{concept.meaning}</dd>
                </div>
              ))}
              {reading.concepts.length === 0 && <p className="text-sm text-muted">No glossary for this paper.</p>}
            </dl>
          )}

          {item.id === "equations" && (
            <ol className="space-y-5">
              {reading.equations.map((equation, index) => (
                <li key={equation.id}>
                  <p className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="font-semibold text-accent">{equationLabel(equation, index)}</span>
                    <span className="text-muted">p. {equation.page}</span>
                  </p>
                  <p className="mt-0.5 font-serif text-[0.9375rem] font-semibold">{equation.name}</p>
                  <div
                    className="tex-scroll mt-2 overflow-x-auto rounded-md border border-line bg-surface px-3 py-2 text-[0.875rem]"
                    tabIndex={0}
                    role="group"
                    aria-label={`${equationLabel(equation, index)} formula`}
                  >
                    <Tex latex={equation.latex} display />
                  </div>
                  <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">
                    <RichText text={equation.in_words[level]} inline />
                  </p>
                  <Link
                    href={`/papers/${paper.id}#eq-${equation.id}`}
                    className="mt-1 inline-flex items-center gap-0.5 text-xs font-medium text-accent hover:underline"
                  >
                    In the reader
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </li>
              ))}
              {reading.equations.length === 0 && <p className="text-sm text-muted">This paper has no key equations.</p>}
            </ol>
          )}

          {item.id === "ask" && (
            <div>
              <p className="text-[0.8125rem] leading-relaxed text-muted">
                Questions are answered from this paper alone, each sentence marked with the passage it rests on.
              </p>
              <ul className="mt-3 space-y-1.5">
                {(reading.suggested_questions ?? []).map((question) => {
                  const ready = prepared.some((p) => p.question === question);
                  const className =
                    "flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left text-[0.8125rem] font-medium transition-colors";
                  return (
                    <li key={question}>
                      {ready && !aiEnabled ? (
                        <button
                          type="button"
                          aria-pressed={asked === question}
                          onClick={() => setAsked(question)}
                          className={`${className} ${
                            asked === question
                              ? "border-claret-300 bg-accent-soft dark:border-claret-800"
                              : "border-line bg-surface hover:border-claret-300"
                          }`}
                        >
                          <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
                          {question}
                        </button>
                      ) : (
                        <Link
                          href={`/papers/${paper.id}?ask=${encodeURIComponent(question)}`}
                          className={`${className} border-line bg-surface hover:border-claret-300`}
                        >
                          <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
                          {question}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
              {answer && (
                <div className="mt-4 rounded-md border border-line bg-surface px-3.5 py-3" aria-live="polite">
                  <AnswerView id={`notes-${paper.id}`} parts={answer.parts} pdfUrl={paper.pdf_url} prepared />
                </div>
              )}
              <Link
                href={`/papers/${paper.id}?ask=`}
                className="mt-4 inline-flex items-center gap-0.5 text-xs font-medium text-accent hover:underline"
              >
                {aiEnabled ? "Ask your own question in the reader" : "Open the ask panel in the reader"}
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          )}
        </div>
      ))}
    </ReadingContext.Provider>
  );
}
