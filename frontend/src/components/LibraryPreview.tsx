"use client";

import Link from "next/link";
import { useMemo } from "react";

import type { PaperDetail } from "@/lib/api";
import { useLevel } from "@/lib/level";

import { Go, Mark, Out } from "./Glyphs";
import { LevelSlider } from "./LevelSlider";
import { ReadingContext, RichText } from "./RichText";

/** The selected paper's first page: what it is, what it says in a nutshell, and what's in it. */
export function Preview({ paper }: { paper: PaperDetail }) {
  const level = useLevel();
  const reading = paper.reading;
  const context = useMemo(
    () => ({ equations: reading?.equations ?? [], concepts: reading?.concepts ?? [], level }),
    [reading, level],
  );
  const title = reading?.title ?? paper.title ?? paper.filename ?? "Untitled paper";
  const meta = [
    paper.arxiv_id ? `arXiv:${paper.arxiv_id}` : paper.filename,
    reading?.field ?? paper.field,
    reading?.year ?? paper.year,
    paper.page_count ? `${paper.page_count} pages` : null,
  ].filter(Boolean);

  return (
    <ReadingContext.Provider value={context}>
      <div className="sticky top-0 z-20 flex h-11 items-center justify-between gap-4 border-b border-line bg-surface px-6">
        <p className="flex min-w-0 items-center gap-1.5 font-mono text-[0.6875rem] text-muted">
          <span className="shrink-0">Library</span>
          <Mark className="shrink-0">/</Mark>
          <span className="shrink-0">{paper.is_sample ? "Samples" : "Your papers"}</span>
          <Mark className="shrink-0">/</Mark>
          <span className="truncate font-serif text-[0.875rem] text-foreground italic">{title}</span>
        </p>
        <div className="flex shrink-0 items-center gap-3">
          {paper.pdf_url && (
            <a href={paper.pdf_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm h-8">
              PDF
              <Out />
            </a>
          )}
          <Link href={`/papers/${paper.id}`} className="btn btn-primary btn-sm h-8 px-3">
            Open in reader
            <Go className="text-[0.9375rem]" />
          </Link>
        </div>
      </div>

      <article className="mx-auto max-w-[40rem] px-8 pt-10 pb-20">
        <p className="border-b border-line pb-2 font-mono text-[0.6875rem] text-muted">{meta.join("  ·  ")}</p>
        <h2 className="mt-5 font-serif text-[2.5rem] leading-[1.06] font-normal tracking-[-0.02em] text-balance">{title}</h2>
        {reading && <p className="mt-3 font-serif text-[1.0625rem] leading-snug text-muted italic">{reading.authors.join(", ")}</p>}

        {!reading ? (
          <div className="mt-10 border border-line bg-background px-5 py-4 text-[0.9375rem]">
            {paper.status === "failed" ? (
              <p>Paper2Lab couldn&apos;t explain this paper. {paper.error}</p>
            ) : (
              <p role="status">Paper2Lab is still reading this paper. It usually takes one to three minutes.</p>
            )}
            <Link href={`/papers/${paper.id}`} className="link mt-2 inline-block">
              Open it
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8 border-y border-rule bg-background px-1 py-2.5">
              <LevelSlider level={level} compact />
            </div>

            <section aria-labelledby="preview-nutshell" className="mt-8">
              <h3 id="preview-nutshell" className="eyebrow">
                In a nutshell
              </h3>
              <div className="prose-reading mt-2">
                <RichText text={reading.summary[level]} />
              </div>
            </section>

            {reading.contributions.length > 0 && (
              <div className="mt-8">
                <h3 className="eyebrow">What&apos;s new</h3>
                <ul className="mt-2 space-y-2 font-serif text-[1.0625rem] leading-relaxed">
                  {reading.contributions.map((item) => (
                    <li key={item} className="flex gap-3">
                      <Mark className="shrink-0 text-accent">§</Mark>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <nav aria-label="Contents" className="mt-10">
              <h3 className="eyebrow">Contents</h3>
              <ol className="mt-2 border-t border-rule">
                {reading.sections.map((section, i) => (
                  <li key={section.id}>
                    <Link
                      href={`/papers/${paper.id}#${section.id}`}
                      className="group flex items-baseline gap-3 border-b border-line py-2.5 text-[0.9375rem]"
                    >
                      <span className="w-6 shrink-0 text-right font-serif text-[0.9375rem] text-accent italic">{i + 1}.</span>
                      <span className="font-serif text-[1.0625rem] group-hover:underline group-hover:underline-offset-4">{section.title}</span>
                      <span className="mx-1 flex-1 translate-y-[-0.2em] border-b border-dotted border-muted/50" aria-hidden />
                      <span className="shrink-0 font-mono text-[0.6875rem] text-muted">p. {section.page}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link href={`/papers/${paper.id}`} className="inline-flex items-center gap-1.5 font-mono text-[0.8125rem] text-accent underline underline-offset-[5px] hover:decoration-2">
                Continue in the reader
                <Go className="text-[1rem]" />
              </Link>
              {paper.is_sample && (
                <span className="font-serif text-[0.9375rem] text-muted italic">Explained in advance, so every feature works on this demo.</span>
              )}
            </div>
          </>
        )}
      </article>
    </ReadingContext.Provider>
  );
}
