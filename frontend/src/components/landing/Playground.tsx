"use client";

import Link from "next/link";
import { useState } from "react";

import { Demo } from "../demos";
import { Go } from "../Glyphs";
import { ArticleHead } from "./ArticleHead";
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
    <div>
      <ArticleHead numeral="IV" id="play-title" title="Equations you can push on.">
        Some ideas only click when you poke them. Key equations in the samples come with a small demo, right under the
        formula in the reader.
      </ArticleHead>
      <div className="mt-12 grid gap-10 lg:grid-cols-[7rem_minmax(0,18rem)_minmax(0,1fr)] lg:gap-0">
        <div aria-hidden className="hidden lg:block" />
        <div className="lg:pr-10">
          <div role="group" aria-label="Choose a demo" className="flex gap-6 border-b border-line font-mono text-[0.8125rem]">
            {DEMOS.map((d, i) => (
              <button
                key={d.kind}
                type="button"
                aria-pressed={i === index}
                onClick={() => setIndex(i)}
                className={`-mb-px h-10 border-b-2 transition-colors ${
                  i === index ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                <span className="mr-1.5 font-serif text-accent italic">{i === 0 ? "a." : "b."}</span>
                {d.label}
              </button>
            ))}
          </div>
          <p className="mt-5 font-serif text-[1.125rem] leading-relaxed">{demo.text}</p>
          <Link
            href={`/papers/${demo.paper}#${demo.anchor}`}
            className="mt-5 inline-flex items-center gap-1.5 font-mono text-[0.8125rem] text-accent underline underline-offset-[5px] hover:decoration-2"
          >
            See it in the reader
            <Go className="text-[1rem]" />
          </Link>
        </div>
        <div className="min-w-0 lg:border-l lg:border-line lg:pl-10">
          <Demo key={demo.kind} kind={demo.kind} />
        </div>
      </div>
    </div>
  );
}
