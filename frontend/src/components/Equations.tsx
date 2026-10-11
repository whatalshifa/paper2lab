"use client";

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
      <p className="font-serif text-[1.0625rem] font-medium">{equation.name}</p>
      {showFormula && (
        <div className="tex-scroll overflow-x-auto border-y border-line px-3 py-2" tabIndex={0} role="group" aria-label="Formula">
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
      <p className="font-mono text-[0.6875rem] text-muted">From page {equation.page} of the paper</p>
    </div>
  );
}

/** An equation drawn in full. Hover it (or tap it) to see what it means. */
export function EquationCard({ equation, index, level }: { equation: Equation; index: number; level: Level }) {
  const label = equationLabel(equation, index);
  return (
    <figure id={`eq-${equation.id}`} className="scroll-mt-32">
      <Hovercard
        label={`${label}, ${equation.name}: what it means`}
        block
        triggerClassName="tex-scroll group w-full overflow-x-auto border-y border-rule px-1 py-4 text-left transition-colors hover:bg-accent-soft/50 aria-expanded:bg-accent-soft/50"
        trigger={
          <>
            <span className="mb-2 flex items-center justify-between gap-3 font-mono text-[0.6875rem]">
              <span className="text-muted">
                {label} · {equation.name}
              </span>
              <span className="flex items-center gap-1 text-accent">
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
      triggerClassName="mx-0.5 inline-flex translate-y-[-1px] items-center border-b border-accent px-0.5 py-0 font-mono text-[0.75em] text-accent hover:bg-accent-soft aria-expanded:bg-accent-soft"
      trigger={label}
    >
      <Meaning equation={equation} level={level} showFormula />
    </Hovercard>
  );
}
