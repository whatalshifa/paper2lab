"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { PaperDetail, Reading } from "@/lib/api";
import { useLevel } from "@/lib/level";
import { saveProgress } from "@/lib/progress";

import { AskPanel } from "./AskPanel";
import { ConnectionsSection, hasLinks, useConnections } from "./Connections";
import { Back, Mark, Out } from "./Glyphs";
import { LevelSlider } from "./LevelSlider";
import { Listen } from "./Listen";
import { asPrerequisites, PrerequisiteMap } from "./PrerequisiteMap";
import { quizScore, useQuizAnswers } from "./Quiz";
import { Contents } from "./reader/Contents";
import { OVERVIEW, Pager, type ReaderPage, useReaderPage } from "./reader/pages";
import { SectionBlock } from "./reader/SectionBlock";
import { SectionNotes } from "./reader/SectionNotes";
import { ReadingContext, RichText } from "./RichText";
import { Sheet } from "./Sheet";

const SOURCE_LINK =
  "inline-flex items-center gap-1 font-mono text-[0.75rem] text-muted underline-offset-4 hover:text-foreground hover:underline";

/**
 * The reader, laid out like a reading app: the contents and your progress on the left, the paper's
 * explanation in the middle under a reading-level toolbar, and margin notes for the section you're
 * on at the right. Phones get the paper alone, with contents, notes and questions in a bottom bar.
 */
export function ReadingView({
  paper,
  reading,
  onDelete,
}: {
  paper: PaperDetail;
  reading: Reading;
  onDelete?: () => void;
}) {
  const level = useLevel();
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"contents" | "notes" | null>(null);
  const closeSheet = useCallback(() => setSheet(null), []);
  const context = useMemo(
    () => ({ equations: reading.equations, concepts: reading.concepts, level }),
    [reading.equations, reading.concepts, level],
  );
  const authors =
    reading.authors.length > 4 ? `${reading.authors.slice(0, 3).join(", ")} and others` : reading.authors.join(", ");
  const verified = reading.sections.flatMap((s) => s.quotes).filter((q) => q.verified).length;
  const quotes = reading.sections.flatMap((s) => s.quotes).length;
  const hasMap = asPrerequisites(reading.prerequisites).some((p) => p.primer);
  const { answers, choose } = useQuizAnswers(paper.id);
  const score = quizScore(reading.sections, level, answers);
  const connections = useConnections(paper.id);
  const hasConnections = (connections?.references?.items.length ?? 0) > 0 || hasLinks(connections);
  const pages = useMemo<ReaderPage[]>(
    () => [
      { key: OVERVIEW, href: "#nutshell", label: "Overview" },
      ...reading.sections.map((section, i) => ({ key: section.id, href: `#${section.id}`, label: `${i + 1}. ${section.title}` })),
      ...(hasConnections ? [{ key: "builds-on", href: "#builds-on", label: "What it connects to" }] : []),
      ...(reading.concepts.length > 0 ? [{ key: "glossary", href: "#glossary", label: "Glossary" }] : []),
    ],
    [reading.sections, reading.concepts.length, hasConnections],
  );
  const { page, index, progress } = useReaderPage(pages);
  const activeIndex = reading.sections.findIndex((s) => s.id === page);
  const active = activeIndex >= 0 ? page : null;
  const overview = page === OVERVIEW;

  useEffect(() => {
    if (progress > 0) saveProgress(paper.id, progress);
  }, [paper.id, progress]);

  // "?ask=..." (from the library's margin notes) opens the ask panel, with that question if there is one.
  useEffect(() => {
    const ask = new URLSearchParams(window.location.search).get("ask");
    if (ask === null) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the address once, when the page opens
    setQuestion(ask || null);
    setAsking(true);
  }, []);

  const ask = useCallback((text?: string) => {
    setSheet(null);
    setQuestion(text ?? null);
    setAsking(true);
  }, []);

  return (
    <ReadingContext.Provider value={context}>
      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_19rem]">
        <aside
          aria-label="Contents and progress"
          className="hidden lg:sticky lg:top-14 lg:block lg:h-[calc(100dvh-3.5rem)] lg:self-start lg:overflow-y-auto lg:border-r lg:border-line"
        >
          <div className="flex min-h-full flex-col px-4 py-5">
            <Link
              href="/library"
              className="-ml-1 inline-flex items-center gap-1.5 self-start px-1 font-mono text-[0.75rem] text-muted hover:text-foreground"
            >
              <Back />
              Library
            </Link>
            <p className="mt-5 line-clamp-3 font-serif text-[1.125rem] leading-snug italic">{reading.title}</p>
            <p className="mt-1 font-mono text-[0.6875rem] text-muted">{[reading.year, paper.page_count && `${paper.page_count} pages`].filter(Boolean).join(" · ")}</p>

            <nav aria-label="Sections" className="mt-6">
              <p className="eyebrow mb-1.5">Contents</p>
              <Contents reading={reading} active={page} hasMap={hasMap} hasConnections={hasConnections} />
            </nav>

            <div className="mt-auto space-y-3 border-t border-line pt-4 text-[0.875rem] leading-relaxed text-muted">
              <div>
                <div className="flex justify-between font-mono text-[0.6875rem]">
                  <span>Read so far</span>
                  <span>{Math.round(progress * 100)}%</span>
                </div>
                <div className="mt-1.5 h-px bg-line" aria-hidden>
                  <div className="h-[3px] -translate-y-px bg-claret-700 dark:bg-claret-300" style={{ width: `${progress * 100}%` }} />
                </div>
              </div>
              {quotes > 0 && !(paper.is_sample && verified === 0) && (
                <p>
                  {verified} of {quotes} quotes found word for word in the PDF.{" "}
                  <Link href="/accuracy" className="link">
                    How we check
                  </Link>
                </p>
              )}
              {score.total > 0 && (
                <p>
                  {score.answered === 0
                    ? `${score.total} check-yourself questions at this level.`
                    : `Check yourself: ${score.right} of ${score.answered} right so far, ${score.total - score.answered} to go.`}
                </p>
              )}
            </div>
          </div>
        </aside>

        <article className="min-w-0 bg-surface lg:min-h-[calc(100dvh-3.5rem)]">
          <header className="mx-auto max-w-[42rem] px-4 pt-5 sm:px-8 lg:pt-10">
            <Link
              href="/library"
              className="-ml-1 inline-flex items-center gap-1.5 px-1 font-mono text-[0.75rem] text-muted hover:text-foreground lg:hidden"
            >
              <Back />
              Library
            </Link>
            <p className="mt-5 border-b border-line pb-2 font-mono text-[0.6875rem] text-muted lg:mt-0">
              {[
                paper.is_sample ? "Sample paper" : null,
                paper.arxiv_id ? `arXiv:${paper.arxiv_id}` : null,
                reading.field,
                reading.year,
              ]
                .filter(Boolean)
                .join("  ·  ")}
            </p>
            {/* Past the overview the title block shrinks to a running head, so the section starts higher. */}
            <h1
              className={`font-serif font-normal tracking-[-0.02em] text-balance ${
                overview
                  ? "mt-5 text-[2.125rem] leading-[1.08] sm:text-[2.875rem]"
                  : "mt-3 text-[1.5rem] leading-[1.15] sm:text-[1.75rem]"
              }`}
            >
              {reading.title}
            </h1>
            {overview && <p className="mt-3 font-serif text-[1.0625rem] text-muted italic">{authors}</p>}
            <div className={`${overview ? "mt-6" : "mt-3"} flex flex-wrap items-center gap-2`}>
              <button type="button" onClick={() => ask()} className="btn btn-secondary btn-sm">
                Ask the paper
              </button>
              <Listen reading={reading} level={level} />
              {paper.pdf_url && (
                <a href={paper.pdf_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                  Open the PDF
                  <Out />
                </a>
              )}
              {onDelete && (
                <button type="button" onClick={onDelete} className="btn btn-danger-quiet btn-sm ml-auto">
                  Delete
                </button>
              )}
            </div>
            {overview && (paper.arxiv_id || (connections && connections.code.length > 0)) && (
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                {paper.arxiv_id && (
                  <a
                    href={`https://arxiv.org/abs/${paper.arxiv_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={SOURCE_LINK}
                  >
                    arxiv.org/abs/{paper.arxiv_id}
                  </a>
                )}
                {connections && connections.code.length > 0 && (
                  <a href={connections.code[0].url} target="_blank" rel="noopener noreferrer" className={SOURCE_LINK}>
                    Code
                    <Out />
                  </a>
                )}
              </div>
            )}
            {overview && paper.is_sample && (
              <p className="mt-4 font-serif text-[0.9375rem] text-muted italic">
                This sample was explained in advance, so you can try Paper2Lab without adding a paper.
              </p>
            )}
          </header>

          <div className={`sticky top-14 z-30 ${overview ? "mt-6" : "mt-4"} border-b border-line bg-surface`}>
            <div className="mx-auto flex max-w-[42rem] items-center gap-6 px-4 py-1.5 sm:px-8">
              <div className="min-w-0 flex-1">
                <LevelSlider level={level} compact />
              </div>
              <p className="hidden w-44 truncate text-right font-serif text-[0.875rem] text-muted italic md:block" aria-hidden>
                {activeIndex >= 0 ? `§\u2009${activeIndex + 1}. ${reading.sections[activeIndex].title}` : "Overview"}
              </p>
            </div>
            <div className="absolute inset-x-0 -bottom-px h-[2px]" aria-hidden>
              <div className="h-full bg-claret-700 dark:bg-claret-300" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>

          {/* One page at a time (see useReaderPage). The pages are plain boxes, so hidden ones take no room. */}
          <div className={`mx-auto max-w-[42rem] px-4 ${overview ? "pt-10" : "pt-6"} pb-28 sm:px-8 lg:pb-20`}>
            <div data-page={OVERVIEW} className="space-y-12">
              <section aria-labelledby="nutshell" className="scroll-mt-32">
                <h2 id="nutshell" className="eyebrow scroll-mt-32">
                  In a nutshell
                </h2>
                <div className="prose-reading mt-2 first-letter:float-left first-letter:mt-1 first-letter:mr-1.5 first-letter:font-serif first-letter:text-[3.6em] first-letter:leading-[0.8] first-letter:text-accent sm:text-[1.1875rem]">
                  <RichText text={reading.summary[level]} />
                </div>
              </section>

              {reading.contributions.length > 0 && (
                <section aria-labelledby="new">
                  <h2 id="new" className="eyebrow">
                    What&apos;s new in this paper
                  </h2>
                  <ul className="mt-3 space-y-2.5 font-serif text-[1.0625rem] leading-relaxed sm:text-[1.125rem]">
                    {reading.contributions.map((item) => (
                      <li key={item} className="flex gap-3">
                        <Mark className="shrink-0 text-accent">§</Mark>
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {reading.prerequisites.length > 0 && <PrerequisiteMap items={reading.prerequisites} />}
            </div>

            {reading.sections.map((section, i) => (
              <div key={section.id} data-page={section.id}>
                <SectionBlock
                  section={section}
                  number={i + 1}
                  paper={paper}
                  reading={reading}
                  answers={answers}
                  onChoose={choose}
                />
              </div>
            ))}

            {hasConnections && (
              <div data-page="builds-on">
                <ConnectionsSection connections={connections} />
              </div>
            )}

            {reading.concepts.length > 0 && (
              <div data-page="glossary">
                <section id="glossary" className="scroll-mt-32 border-t border-rule pt-8" aria-labelledby="glossary-title">
                  <h2 id="glossary-title" className="font-serif text-[1.875rem] font-normal tracking-[-0.01em] italic">
                    Glossary
                  </h2>
                  <dl className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2">
                    {reading.concepts.map((concept) => (
                      <div key={concept.term}>
                        <dt className="font-serif text-[1.0625rem] font-medium italic">{concept.term}</dt>
                        <dd className="mt-1 text-[0.9375rem] leading-relaxed text-muted">{concept.meaning}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              </div>
            )}

            <Pager pages={pages} index={index} />
          </div>
        </article>

        <aside
          aria-label="Margin notes"
          className="hidden xl:sticky xl:top-14 xl:block xl:h-[calc(100dvh-3.5rem)] xl:self-start xl:overflow-y-auto xl:border-l xl:border-line"
        >
          <div className="px-5 py-5">
            <SectionNotes reading={reading} active={active} onAsk={ask} />
          </div>
        </aside>
      </div>

      {/* Phones and tablets: the reader's tools in a bar along the bottom, opening sheets. */}
      <nav
        aria-label="Reader tools"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 divide-x divide-line border-t-[3px] border-double border-rule bg-background pb-[env(safe-area-inset-bottom)] lg:hidden print:hidden"
      >
        {[
          { label: "Contents", mark: "§", onClick: () => setSheet("contents") },
          { label: "Notes", mark: "¶", onClick: () => setSheet("notes") },
          { label: "Ask", mark: "?", onClick: () => ask() },
        ].map((tool) => (
          <button
            key={tool.label}
            type="button"
            onClick={tool.onClick}
            className="flex h-14 items-center justify-center gap-2 font-mono text-[0.75rem] text-muted hover:text-foreground"
          >
            <Mark className="text-[1.125rem] text-accent">{tool.mark}</Mark>
            {tool.label}
          </button>
        ))}
      </nav>
      {sheet === "contents" && (
        <Sheet title="Contents" onClose={closeSheet}>
          <Contents reading={reading} active={page} hasMap={hasMap} hasConnections={hasConnections} onNavigate={closeSheet} />
          <p className="mt-4 font-mono text-[0.6875rem] text-muted">{Math.round(progress * 100)}% read</p>
        </Sheet>
      )}
      {sheet === "notes" && (
        <Sheet title="Notes" onClose={closeSheet}>
          <SectionNotes reading={reading} active={active} onAsk={ask} onNavigate={closeSheet} />
        </Sheet>
      )}

      <AskPanel
        paper={paper}
        open={asking}
        initialQuestion={question}
        onClose={() => {
          setAsking(false);
          setQuestion(null);
        }}
      />
    </ReadingContext.Provider>
  );
}
