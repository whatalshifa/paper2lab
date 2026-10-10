"use client";

import { ArrowRight, FilePlus2 } from "lucide-react";
import Link from "next/link";

import type { PaperDetail } from "@/lib/api";

import { Tex } from "../Tex";
import { ADAM_ID, ATTENTION_ID, useConfig, useSample } from "./data";

/** Each sample's cover: its colours, and the equation from the paper printed on it. */
const COVERS = [
  {
    id: ATTENTION_ID,
    equation: "e1",
    cover: "bg-claret-800 text-claret-50 ring-claret-900",
    faint: "text-claret-200",
  },
  {
    id: ADAM_ID,
    equation: "e3",
    cover: "bg-[#1f1d1b] text-[#f3f0e8] ring-black/40 dark:bg-[#2b2826] dark:ring-white/10",
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
        className={`group relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-r-md rounded-l-[3px] p-5 shadow-[0_24px_40px_-20px_rgb(0_0_0/0.45)] ring-1 transition-transform duration-300 hover:-translate-y-1.5 sm:p-7 ${cover}`}
      >
        {/* The spine's crease. */}
        <span className="absolute inset-y-0 left-2.5 w-px bg-white/15" aria-hidden />
        <span className={`flex items-center justify-between gap-3 font-mono text-[0.6875rem] ${faint}`}>
          <span>arXiv:{paper.arxiv_id?.replace(/v\d+$/, "")}</span>
          <span>{reading.year}</span>
        </span>
        {eq && (
          <span className="pointer-events-none my-4 hidden overflow-hidden text-[1rem] opacity-90 sm:block" aria-hidden>
            <Tex latex={eq.latex} display />
          </span>
        )}
        <span>
          <span className="block font-serif text-[1.375rem] leading-[1.08] font-semibold tracking-[-0.01em] text-balance sm:text-[1.875rem]">
            {reading.title}
          </span>
          <span className={`mt-3 block font-serif text-[0.9375rem] italic ${faint}`}>{shortAuthors(reading.authors)}</span>
        </span>
      </Link>
      <p className="mt-5 text-[0.8125rem] leading-relaxed text-muted">{facts.join(" · ")}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.9375rem]">
        <Link href={`/papers/${paper.id}`} className="link inline-flex items-center gap-1">
          Read it
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <Link href={`/library?paper=${paper.id}`} className="text-muted underline-offset-4 hover:text-foreground hover:underline">
          Preview
        </Link>
      </div>
    </li>
  );
}

function Slot({ paused }: { paused: boolean | null }) {
  return (
    <li className="col-span-2 flex flex-col sm:col-span-1">
      <div className="flex flex-1 flex-col justify-between rounded-md border-2 border-dashed border-line p-5 sm:aspect-[3/4] sm:p-7">
        <FilePlus2 className="h-6 w-6 text-accent" aria-hidden />
        <div className="mt-6">
          <p className="font-serif text-[1.375rem] leading-tight font-semibold sm:text-[1.625rem]">Your paper, next.</p>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">
            Paste an arXiv link or drop in a PDF. It&apos;s read once, explained section by section, and kept in this
            browser only. No account.
          </p>
          {paused && (
            <p className="mt-3 text-[0.8125rem] font-medium text-accent">Paused on this demo, which runs without an AI key.</p>
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
