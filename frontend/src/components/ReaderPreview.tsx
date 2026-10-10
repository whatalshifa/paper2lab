"use client";

import { CircleCheck } from "lucide-react";
import type { ReactNode } from "react";

import type { Level } from "@/lib/api";
import { LEVELS, setLevel, useLevel } from "@/lib/level";

import { Tex } from "./Tex";

/** The same idea at all three reading levels: what the control in the reader does, shown up front. */
const TEXT: Record<Level, ReactNode> = {
  beginner: (
    <>
      For every word in a sentence, the model works out which other words matter most to it, and leans on those to
      understand it.
    </>
  ),
  student: (
    <>
      Each word scores every other word for relevance. A softmax turns the scores into weights, and the word takes a
      weighted mix of their information.
    </>
  ),
  expert: (
    <>
      Scaled dot-product attention, <Tex latex="\mathrm{softmax}(QK^{\top}/\sqrt{d_k})\,V" />, run in parallel across
      several heads so each can attend to a different subspace.
    </>
  ),
};

/**
 * A working miniature of the reader for the home page: the reading-level control and one explained
 * paragraph with its quote. Choosing a level here also sets it for the real reader.
 */
export function ReaderPreview() {
  const level = useLevel();
  return (
    <figure className="card overflow-hidden shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)]">
      <figcaption className="border-b border-line px-5 py-4 sm:px-6">
        <span className="block font-serif text-[1.0625rem] font-semibold">Attention Is All You Need</span>
        <span className="mt-0.5 block text-[0.8125rem] text-muted">Section 3 · Scaled dot-product attention</span>
      </figcaption>
      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span id="preview-level" className="text-[0.8125rem] font-medium text-muted">
            Reading level
          </span>
          <div role="group" aria-labelledby="preview-level" className="flex rounded-md bg-sunken p-0.5">
            {LEVELS.map((l) => (
              <button
                key={l.id}
                type="button"
                aria-pressed={l.id === level}
                onClick={() => setLevel(l.id)}
                className={`h-8 rounded-[5px] px-3 text-[0.8125rem] font-medium transition-colors ${
                  l.id === level
                    ? "bg-surface text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.08)] ring-1 ring-line"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-5 min-h-[6.75rem] font-serif text-[1.0625rem] leading-[1.65] text-pretty" aria-live="polite">
          {TEXT[level]}
        </p>
        <blockquote className="mt-5 border-l-2 border-claret-700 pl-4 dark:border-claret-300">
          <p className="font-serif text-[0.9375rem] leading-relaxed text-muted italic">
            &ldquo;An attention function can be described as mapping a query and a set of key-value pairs to an
            output, where the query, keys, values, and output are all vectors.&rdquo;
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
            <CircleCheck className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden />
            Found word for word in the PDF · page 3
          </p>
        </blockquote>
      </div>
    </figure>
  );
}
