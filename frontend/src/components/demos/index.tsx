"use client";

import type { ReactNode } from "react";

import { Mark } from "../Glyphs";
import { AdamDemo } from "./AdamDemo";
import { AttentionDemo } from "./AttentionDemo";

const DEMOS: Record<string, { title: string; note: ReactNode; body: () => ReactNode }> = {
  "attention-scaling": {
    title: "Why divide by the square root of the key size?",
    note: (
      <>
        Queries and keys are random numbers with mean 0 and variance 1, as in the paper&apos;s footnote, so a dot
        product of d<sub>k</sub> of them has variance d<sub>k</sub>.
      </>
    ),
    body: () => <AttentionDemo />,
  },
  "adam-optimizer": {
    title: "Adam and plain SGD on a narrow valley",
    note: "Same start and same learning rate for both, 60 steps, ε = 10⁻⁸ as in the paper. The minimum is at the centre.",
    body: () => <AdamDemo />,
  },
};

/**
 * A small hands-on demo that sits under an equation, folded shut until the reader opens it so the
 * section reads straight through. Unknown kinds draw nothing.
 */
export function Demo({ kind }: { kind: string }) {
  const demo = DEMOS[kind];
  if (!demo) return null;
  return (
    <details className="group border border-rule bg-surface">
      <summary className="flex cursor-pointer list-none items-baseline justify-between gap-4 px-5 py-4 select-none hover:bg-sunken sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="eyebrow block">Play with it</span>
          <span className="mt-1 block font-serif text-[1.375rem] leading-snug font-normal">{demo.title}</span>
        </span>
        <span className="shrink-0 font-mono text-[0.75rem] text-muted" aria-hidden>
          <Mark className="mr-1.5 text-accent group-open:hidden">+</Mark>
          <Mark className="mr-1.5 hidden text-accent group-open:inline">−</Mark>
          <span className="group-open:hidden">Open</span>
          <span className="hidden group-open:inline">Close</span>
        </span>
      </summary>
      <section className="border-t border-line px-5 pt-4 pb-5 sm:px-6 sm:pb-6" aria-label={`Play with it: ${demo.title}`}>
        <div>{demo.body()}</div>
        <p className="mt-4 border-t border-line pt-3 font-serif text-[0.875rem] leading-relaxed text-muted italic">{demo.note}</p>
      </section>
    </details>
  );
}
