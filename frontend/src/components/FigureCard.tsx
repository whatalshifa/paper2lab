"use client";

import { useEffect, useRef, useState } from "react";

import { api, type Figure, type Level } from "@/lib/api";

import { RichText } from "./RichText";

const A4 = 842 / 595; // most papers are A4 or US Letter, close enough for a placeholder

/** A figure or table cut out of the paper, with what it shows at the reader's level. */
export function FigureCard({
  figure,
  paperId,
  pdfUrl,
  level,
}: {
  figure: Figure;
  paperId: string;
  pdfUrl: string | null;
  level: Level;
}) {
  const src = api.figureUrl(paperId, figure.id);
  const image = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  // The picture may finish loading before React is listening for it.
  useEffect(() => {
    const element = image.current;
    if (element?.complete) setState(element.naturalWidth > 0 ? "ready" : "failed");
  }, []);

  const pageHref = pdfUrl ? `${pdfUrl}#page=${figure.page}` : null;
  const ratio = 1 / Math.max((figure.bottom - figure.top) * A4, 0.2);

  return (
    <figure id={`fig-${figure.id}`} className="card scroll-mt-32 overflow-hidden">
      <div className="border-b border-line bg-white">
        {state === "failed" ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center text-sm text-slate-600">
            <p>This picture couldn&apos;t be loaded just now.</p>
            {pageHref && (
              <a href={pageHref} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-700 hover:underline">
                See it on page {figure.page} of the PDF ↗
              </a>
            )}
          </div>
        ) : (
          <a href={src} target="_blank" rel="noopener noreferrer" className="relative block" aria-label={`Open ${figure.label} full size`}>
            {state === "loading" && (
              <span className="block w-full animate-pulse bg-slate-100" style={{ aspectRatio: ratio }} aria-hidden />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element -- drawn by our API, already sized */}
            <img
              ref={image}
              src={src}
              alt={`${figure.label}: ${figure.caption}`}
              loading="lazy"
              onLoad={() => setState("ready")}
              onError={() => setState("failed")}
              className={state === "ready" ? "mx-auto block max-h-[32rem] w-auto max-w-full" : "absolute h-px w-px opacity-0"}
            />
          </a>
        )}
      </div>
      <figcaption className="p-4 sm:p-5">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="font-semibold">{figure.label}</span>
          <span className="text-muted">page {figure.page}</span>
          {figure.caption_verified && (
            <span className="badge bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
              Caption found in the PDF
            </span>
          )}
        </p>
        <p className="mt-1.5 font-serif text-[0.9rem] leading-relaxed text-muted italic">&ldquo;{figure.caption}&rdquo;</p>
        <div className="prose-reading mt-3">
          <RichText text={figure.explanation[level]} />
        </div>
        <dl className="mt-4 grid gap-3 text-sm leading-relaxed sm:grid-cols-2">
          <div className="rounded-xl bg-sunken px-4 py-3">
            <dt className="text-xs font-semibold text-muted">How to read it</dt>
            <dd className="mt-1">{figure.how_to_read}</dd>
          </div>
          <div className="rounded-xl bg-accent-soft px-4 py-3">
            <dt className="text-xs font-semibold text-accent">The takeaway</dt>
            <dd className="mt-1">{figure.takeaway}</dd>
          </div>
        </dl>
      </figcaption>
    </figure>
  );
}
