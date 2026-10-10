"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Demo } from "../demos";
import { ADAM_ID, ATTENTION_ID } from "./data";

const DEMOS = [
  {
    kind: "attention-scaling",
    label: "Attention",
    paper: ATTENTION_ID,
    anchor: "eq-e1",
    text: "Turn the key size up and switch the scaling off: the softmax piles all its weight on one word, which is exactly the problem the paper's √dₖ fixes.",
  },
  {
    kind: "adam-optimizer",
    label: "Adam",
    paper: ADAM_ID,
    anchor: "eq-e3",
    text: "Press play and race Adam against plain gradient descent down a narrow valley, from the same start with the same learning rate.",
  },
];

/** The key equations come with something to play with. The demos here are the reader's own. */
export function Playground() {
  const [index, setIndex] = useState(0);
  const demo = DEMOS[index];
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
      <div>
        <p className="font-serif text-[1.125rem] text-accent italic">IV</p>
        <h2 id="play-title" className="mt-3 font-serif text-[2.25rem] leading-[1.08] font-semibold tracking-[-0.02em] text-balance sm:text-[2.75rem]">
          Equations you can push on.
        </h2>
        <p className="mt-5 text-[1.0625rem] leading-relaxed text-muted">
          Some ideas only click when you poke them. Key equations in the samples come with a small demo, right under the
          formula in the reader.
        </p>
        <div role="group" aria-label="Choose a demo" className="mt-8 inline-flex rounded-md border border-line bg-surface p-1">
          {DEMOS.map((d, i) => (
            <button
              key={d.kind}
              type="button"
              aria-pressed={i === index}
              onClick={() => setIndex(i)}
              className={`h-9 rounded px-4 text-[0.875rem] font-medium transition-colors ${
                i === index ? "bg-claret-700 text-white" : "text-muted hover:text-foreground"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <p className="mt-5 font-serif text-[1.0625rem] leading-relaxed">{demo.text}</p>
        <Link href={`/papers/${demo.paper}#${demo.anchor}`} className="link mt-5 inline-flex items-center gap-1">
          See it in the reader
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <div className="min-w-0 [&>section]:shadow-[0_24px_48px_-28px_rgb(46_11_18/0.3)]">
        <Demo key={demo.kind} kind={demo.kind} />
      </div>
    </div>
  );
}
