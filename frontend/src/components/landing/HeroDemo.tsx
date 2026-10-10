"use client";

import { ArrowRight, CircleCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { LEVELS, useLevel } from "@/lib/level";

import { LevelSlider } from "../LevelSlider";
import { LogoMark } from "../Logo";
import { ReadingContext, RichText } from "../RichText";
import { ATTENTION_ID, useSample } from "./data";

/** The section the hero demo explains: "Scaled dot-product attention", the heart of the paper. */
const SECTION = "s3";

/** The opening of an explanation: whole sentences of its first paragraph, up to about 300 characters,
 * so the three levels are of a similar length. The full text is one click away in the reader. */
function opening(text: string) {
  const sentences = text.split(/\n\s*\n/)[0].split(/(?<=[.!?])\s+(?=[A-Z])/);
  let out = "";
  for (const sentence of sentences) {
    if (out && out.length + sentence.length > 320) break;
    out = out ? `${out} ${sentence}` : sentence;
  }
  return out;
}

function Skeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading the demo">
      <div className="skeleton h-4 w-11/12" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-4 w-4/5" />
      <div className="skeleton h-4 w-2/3" />
    </div>
  );
}

/**
 * The hero's live demo: a sentence from "Attention Is All You Need", the real reading-level
 * slider, and Paper2Lab's explanation of that section, which changes as the slider moves. The
 * level chosen here is the one the library opens with.
 */
export function HeroDemo() {
  const level = useLevel();
  const { data: paper, failed } = useSample(ATTENTION_ID);
  const reading = paper?.reading ?? null;
  const section = reading?.sections.find((s) => s.id === SECTION) ?? null;
  const quote = section?.quotes[0] ?? null;
  const context = useMemo(
    () => ({ equations: reading?.equations ?? [], concepts: reading?.concepts ?? [], level }),
    [reading, level],
  );
  const pageHref = paper?.pdf_url && quote ? `${paper.pdf_url}#page=${quote.page}` : null;
  const current = LEVELS.find((l) => l.id === level)!;

  return (
    <figure
      aria-label="Try it: one passage of Attention Is All You Need, explained at three levels"
      className="relative overflow-hidden rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_48px_-24px_rgb(46_11_18/0.28)] dark:shadow-[0_24px_48px_-24px_rgb(0_0_0/0.7)]"
    >
      {/* The paper: its own sentence, set like a printed page. */}
      <div className="border-b border-line bg-sunken/60 px-5 pt-4 pb-5 sm:px-7 sm:pt-5 sm:pb-6">
        <p className="flex items-center justify-between gap-3 font-mono text-[0.6875rem] text-muted">
          <span className="truncate">Vaswani et al. · Attention Is All You Need</span>
          <span className="shrink-0">§3.2{quote ? ` · p. ${quote.page}` : ""}</span>
        </p>
        <blockquote className="mt-3 font-serif text-[1.0625rem] leading-[1.6] sm:text-[1.1875rem]">
          {quote ? (
            <span className="bg-claret-100/70 box-decoration-clone px-0.5 dark:bg-claret-900/60">{quote.text}</span>
          ) : (
            <span className="block space-y-2">
              <span className="skeleton block h-4 w-full" />
              <span className="skeleton block h-4 w-3/4" />
            </span>
          )}
        </blockquote>
      </div>

      {/* The control. */}
      <div className="border-b border-line px-5 py-3.5 sm:px-7">
        <LevelSlider level={level} />
      </div>

      {/* Paper2Lab's explanation of that section, at the chosen level. */}
      <div className="px-5 pt-5 pb-6 sm:px-7 sm:pt-6 sm:pb-7">
        <p className="flex items-center gap-2 text-[0.75rem] font-semibold tracking-[0.08em] text-accent uppercase">
          <LogoMark className="h-4 w-4" />
          Paper2Lab explains{section ? `: ${section.title}` : ""}
        </p>
        <div className="mt-3">
          {section ? (
            <ReadingContext.Provider value={context}>
              {/* All three levels sit in the same spot, so the card keeps its size as the slider moves. */}
              <div className="grid" data-testid="hero-explanation">
                {LEVELS.map((l) => {
                  const active = l.id === level;
                  return (
                    <div
                      key={l.id}
                      aria-hidden={!active}
                      data-level={l.id}
                      className={`prose-reading col-start-1 row-start-1 transition-opacity duration-200 ${
                        active ? "opacity-100" : "invisible opacity-0"
                      }`}
                    >
                      <RichText text={opening(section.explanation[l.id])} />
                    </div>
                  );
                })}
              </div>
              <Link
                href={`/papers/${ATTENTION_ID}#${SECTION}`}
                className="link mt-3 inline-flex items-center gap-1 text-[0.875rem]"
              >
                Keep reading this section
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
              <p className="sr-only" aria-live="polite">
                Showing the {current.label} explanation.
              </p>
            </ReadingContext.Provider>
          ) : failed ? (
            <p className="text-[0.9375rem] text-muted">The live demo couldn&apos;t load just now. The library has the full paper.</p>
          ) : (
            <Skeleton />
          )}
        </div>
      </div>

      {quote?.verified && (
      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line bg-background/60 px-5 py-3 text-[0.8125rem] sm:px-7">
        <span className="inline-flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
          <CircleCheck className="h-3.5 w-3.5" aria-hidden />
          Quote found word for word in the PDF
        </span>
        {pageHref && quote && (
          <a href={pageHref} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1">
            Page {quote.page} of the paper
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        )}
      </figcaption>
      )}
    </figure>
  );
}
