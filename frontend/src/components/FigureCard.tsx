"use client";

import { ExternalLink } from "lucide-react";
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
    <figure id={`fig-${figure.id}`} className="card scroll-mt-28 overflow-hidden">
      <div className="border-b border-line bg-white">
        {state === "failed" ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center text-sm text-muted">
            <p>This picture couldn&apos;t be loaded just now.</p>
            {pageHref && (
              <a href={pageHref} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1">
                See it on page {figure.page} of the PDF
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            )}
          </div>
        ) : (
          <a href={src} target="_blank" rel="noopener noreferrer" className="relative block" aria-label={`Open ${figure.label} full size`}>
            {state === "loading" && (
              <span className="block w-full animate-pulse bg-sunken" style={{ aspectRatio: ratio }} aria-hidden />
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
      <figcaption className="p-5 sm:p-6">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem]">
          <span className="font-semibold">{figure.label}</span>
          <span className="text-muted">page {figure.page}</span>
          {figure.caption_verified && (
            <span className="text-emerald-800 dark:text-emerald-300">Caption found in the PDF</span>
          )}
        </p>
        <p className="mt-2 font-serif text-[0.9375rem] leading-relaxed text-muted italic">&ldquo;{figure.caption}&rdquo;</p>
        <div className="prose-reading mt-4">
          <RichText text={figure.explanation[level]} />
        </div>
        <dl className="mt-5 grid gap-x-8 gap-y-4 border-t border-line pt-5 text-[0.9375rem] leading-relaxed sm:grid-cols-2">
          <div>
            <dt className="text-[0.8125rem] font-semibold text-muted">How to read it</dt>
            <dd className="mt-1">{figure.how_to_read}</dd>
          </div>
          <div>
            <dt className="text-[0.8125rem] font-semibold text-accent">The takeaway</dt>
            <dd className="mt-1">{figure.takeaway}</dd>
          </div>
        </dl>
      </figcaption>
    </figure>
  );
}
