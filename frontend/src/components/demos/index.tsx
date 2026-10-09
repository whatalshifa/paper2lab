"use client";

import type { ReactNode } from "react";

import { AdamDemo } from "./AdamDemo";
import { AttentionDemo } from "./AttentionDemo";

export const DEMO_KINDS = ["attention-scaling", "adam-optimizer"];

const DEMOS: Record<string, { title: string; note: string; body: () => ReactNode }> = {
  "attention-scaling": {
    title: "Why divide by √d_k?",
    note: "Queries and keys are random numbers with mean 0 and variance 1, as in the paper's footnote, so a dot product of d_k of them has variance d_k.",
    body: () => <AttentionDemo />,
  },
  "adam-optimizer": {
    title: "Adam and plain SGD on a narrow valley",
    note: "Same start and same learning rate for both, 60 steps, ε = 10⁻⁸ as in the paper. The minimum is at the centre.",
    body: () => <AdamDemo />,
  },
};

/** A small hands-on demo that sits under an equation. Unknown kinds draw nothing. */
export function Demo({ kind }: { kind: string }) {
  const demo = DEMOS[kind];
  if (!demo) return null;
  return (
    <section className="card p-4 sm:p-5" aria-label={`Play with it: ${demo.title}`}>
      <p className="eyebrow">Play with it</p>
      <h3 className="mt-1 text-base font-semibold">{demo.title}</h3>
      <div className="mt-4">{demo.body()}</div>
      <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-muted">{demo.note}</p>
    </section>
  );
}
