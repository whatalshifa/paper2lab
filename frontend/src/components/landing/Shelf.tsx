"use client";

import Link from "next/link";

import type { PaperDetail } from "@/lib/api";

import { Go } from "../Glyphs";
import { Tex } from "../Tex";
import { ADAM_ID, ATTENTION_ID, useConfig, useSample } from "./data";

/** Each sample's cover: its colours, and the equation from the paper printed on it. */
const COVERS = [
  {
    id: ATTENTION_ID,
    equation: "e1",
    cover: "bg-claret-800 text-claret-50 border-claret-950",
    faint: "text-claret-200",
  },
  {
    id: ADAM_ID,
    equation: "e3",
    cover: "bg-[#1f1a16] text-[#f3ece0] border-black dark:bg-[#2a231e] dark:border-[#4a4037]",
    faint: "text-[#c9c2b6]",
  },
];

function shortAuthors(authors: string[]) {
  if (authors.length <= 2) return authors.join(" and ");
  return `${authors[0].split(" ").at(-1)} et al.`;
}

function Cover({ paper, equation, cover, faint }: { paper: PaperDetail; equation: string; cover: string; faint: string }) {
  const reading = paper.reading!;
  const eq = reading.equations.find((e) => e.id === equation);
  const questions = reading.sections.reduce((sum, s) => sum + (s.quiz?.student.length ?? 0), 0);
  const facts = [
    paper.page_count && `${paper.page_count} pages`,
    `${reading.sections.length} sections`,
    `${reading.equations.length} equations`,
    `${questions} questions per level`,
  ].filter(Boolean);

  return (
    <li className="flex flex-col">
      <Link
        href={`/papers/${paper.id}`}
        aria-label={`Read ${reading.title}`}
        className={`group relative flex aspect-[3/4] flex-col justify-between overflow-hidden border p-5 transition-transform duration-300 hover:-translate-y-1.5 sm:p-7 ${cover}`}
      >
        {/* A cover printed like a journal's: a ruled frame inside the edge. */}
        <span className="pointer-events-none absolute inset-2.5 border border-current opacity-25" aria-hidden />
        <span className={`relative flex items-center justify-between gap-3 font-mono text-[0.6875rem] ${faint}`}>
          <span>arXiv:{paper.arxiv_id?.replace(/v\d+$/, "")}</span>
          <span>{reading.year}</span>
        </span>
        {eq && (
          <span className="pointer-events-none my-4 hidden overflow-hidden text-[1rem] opacity-90 sm:block" aria-hidden>
            <Tex latex={eq.latex} display />
          </span>
        )}
        <span className="relative">
          <span className="block font-serif text-[1.375rem] leading-[1.08] font-normal tracking-[-0.015em] text-balance sm:text-[2rem]">
            {reading.title}
          </span>
          <span className={`mt-3 block font-serif text-[0.9375rem] italic ${faint}`}>{shortAuthors(reading.authors)}</span>
        </span>
      </Link>
      <p className="mt-5 font-mono text-[0.6875rem] leading-relaxed text-muted">{facts.join(" · ")}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[0.8125rem]">
        <Link href={`/papers/${paper.id}`} className="inline-flex items-center gap-1.5 text-accent underline underline-offset-[5px] hover:decoration-2">
          Read it
          <Go className="text-[1rem]" />
        </Link>
        <Link href={`/library?paper=${paper.id}`} className="text-muted underline-offset-[5px] hover:text-foreground hover:underline">
          Preview
        </Link>
      </div>
    </li>
  );
}

function Slot({ paused }: { paused: boolean | null }) {
  return (
    <li className="col-span-2 flex flex-col sm:col-span-1">
      <div className="flex flex-1 flex-col justify-between border border-dashed border-muted/60 p-5 sm:aspect-[3/4] sm:p-7">
        <span className="font-mono text-[0.6875rem] text-muted">arXiv:____.____</span>
        <div className="mt-6">
          <p className="font-serif text-[1.375rem] leading-tight italic sm:text-[1.75rem]">Your paper, next.</p>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">
            Paste an arXiv link or drop in a PDF. It&apos;s read once, explained section by section, and kept in this
            browser only. No account.
          </p>
          {paused && (
            <p className="mt-3 font-mono text-[0.75rem] text-accent">Paused on this demo, which runs without an AI key.</p>
          )}
        </div>
      </div>
    </li>
  );
}

/** The sample library as a shelf of covers, with an empty slot for the visitor's own paper. */
export function Shelf() {
  const attention = useSample(ATTENTION_ID);
  const adam = useSample(ADAM_ID);
  const { data: config } = useConfig();
  const papers = [attention.data, adam.data];

  return (
    <div>
      <ul className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 sm:gap-x-8 lg:gap-x-12">
        {COVERS.map((cover, i) => {
          const paper = papers[i];
          return paper?.reading ? (
            <Cover key={cover.id} paper={paper} equation={cover.equation} cover={cover.cover} faint={cover.faint} />
          ) : (
            <li key={cover.id} aria-hidden>
              <div className="skeleton aspect-[3/4]" />
            </li>
          );
        })}
        <Slot paused={config ? !config.ai_enabled : null} />
      </ul>
    </div>
  );
}
