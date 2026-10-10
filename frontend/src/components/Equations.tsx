"use client";

import { Info } from "lucide-react";

import type { Equation, Level } from "@/lib/api";

import { Hovercard } from "./Hovercard";
import { RichText } from "./RichText";
import { Tex } from "./Tex";

export function equationLabel(equation: Equation, index: number) {
  return equation.number ? `Eq. ${equation.number.replace(/[()]/g, "")}` : `Eq. ${index + 1}`;
}

/** What shows when you hover or tap an equation: what it says, and every symbol in it. */
function Meaning({ equation, level, showFormula }: { equation: Equation; level: Level; showFormula: boolean }) {
  return (
    <div className="space-y-3">
      <p className="font-semibold">{equation.name}</p>
      {showFormula && (
        <div className="tex-scroll overflow-x-auto rounded-md bg-sunken px-3 py-2" tabIndex={0} role="group" aria-label="Formula">
          <Tex latex={equation.latex} display />
        </div>
      )}
      <div className="leading-relaxed">
        <RichText text={equation.in_words[level]} inline />
      </div>
      {equation.symbols.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1.5 border-t border-line pt-3">
          {equation.symbols.map((symbol) => (
            <div key={symbol.latex} className="contents">
              <dt className="text-right">
                <Tex latex={symbol.latex} />
              </dt>
              <dd className="text-muted">{symbol.meaning}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="text-xs text-muted">From page {equation.page} of the paper</p>
    </div>
  );
}

/** An equation drawn in full. Hover it (or tap it) to see what it means. */
export function EquationCard({ equation, index, level }: { equation: Equation; index: number; level: Level }) {
  const label = equationLabel(equation, index);
  return (
    <figure id={`eq-${equation.id}`} className="scroll-mt-28">
      <Hovercard
        label={`${label}, ${equation.name}: what it means`}
        block
        triggerClassName="tex-scroll group w-full overflow-x-auto rounded-lg border border-line bg-surface px-5 py-4 text-left transition-colors hover:border-claret-300 hover:bg-accent-soft/40 aria-expanded:border-claret-400 dark:hover:border-claret-800"
        trigger={
          <>
            <span className="mb-2 flex items-center justify-between gap-3 text-[0.8125rem]">
              <span className="font-medium text-muted">
                {label} · {equation.name}
              </span>
              <span className="flex items-center gap-1 font-medium text-accent">
                <Info className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">Hover to explain</span>
                <span className="sm:hidden">Tap to explain</span>
              </span>
            </span>
            <Tex latex={equation.latex} display className="text-foreground" />
          </>
        }
      >
        <Meaning equation={equation} level={level} showFormula={false} />
      </Hovercard>
    </figure>
  );
}

/** "[e2]" inside an explanation: a small chip that previews the equation. */
export function EquationChip({ equation, index, level }: { equation: Equation; index: number; level: Level }) {
  const label = equationLabel(equation, index);
  return (
    <Hovercard
      label={`${label}, ${equation.name}`}
      triggerClassName="mx-0.5 inline-flex translate-y-[-1px] items-center rounded bg-accent-soft px-1.5 py-0 font-sans text-[0.8em] font-semibold text-accent hover:ring-1 hover:ring-claret-300 aria-expanded:ring-1 aria-expanded:ring-claret-400"
      trigger={label}
    >
      <Meaning equation={equation} level={level} showFormula />
    </Hovercard>
  );
}
