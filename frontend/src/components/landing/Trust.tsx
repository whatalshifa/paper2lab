"use client";

import Link from "next/link";

import { Go, Mark } from "../Glyphs";
import { ArticleHead } from "./ArticleHead";
import { useAccuracy } from "./data";

function Figure({ found, total, label }: { found: number; total: number; label: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t-[3px] border-double border-claret-300/70 pt-4">
      <p className="font-serif text-[4rem] leading-none font-normal tracking-[-0.03em] whitespace-nowrap [font-variant-numeric:lining-nums] sm:text-[4.5rem]">
        {found}
        <span className="text-claret-200"> of {total}</span>
      </p>
      <p className="font-serif text-[1.125rem] text-claret-100 italic">{label}</p>
    </div>
  );
}

/**
 * "Every claim shows its quote": the brand's full-bleed claret band, with the live accuracy numbers
 * from /api/accuracy and how the check works.
 */
export function Trust() {
  const { data: report, failed } = useAccuracy();
  const updated = report ? new Date(report.updated_at).toLocaleDateString("en-GB", { dateStyle: "long", timeZone: "UTC" }) : null;

  return (
    <section
      id="accuracy"
      aria-labelledby="accuracy-title"
      className="scroll-mt-4 bg-claret-900 text-white dark:bg-claret-950 dark:text-claret-50"
    >
      <div className="mx-auto max-w-[76rem] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <ArticleHead numeral="II" id="accuracy-title" title="Every claim shows its quote." tone="plate">
          Any AI can sound sure of itself. Paper2Lab has to quote the paper for every explanation, and a short Python
          program, not the AI, looks for each quote in the PDF&apos;s own text, word for word. Figure captions are
          checked the same way.
        </ArticleHead>
      <div className="mt-14 grid gap-14 lg:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)] lg:gap-0">
        <div aria-hidden className="hidden lg:block" />
        <div className="lg:pr-10">
          {/* What a reader sees next to each quote, both outcomes, set as two footnotes. */}
          <p className="smallcaps font-serif text-[1rem] text-claret-200">Beside every quote, one of two marks</p>
          <div className="mt-3 border-t border-claret-300/40">
            <p className="flex items-start gap-4 border-b border-claret-300/40 py-4 text-[1.0625rem]">
              <Mark className="w-5 shrink-0 text-center text-[1.25rem] leading-6 text-emerald-200">✓</Mark>
              <span>
                <span className="font-medium">Found word for word in the PDF.</span>{" "}
                <span className="text-claret-100">The quote links to its page, so you can read it in context.</span>
              </span>
            </p>
            <p className="flex items-start gap-4 border-b border-claret-300/40 py-4 text-[1.0625rem]">
              <Mark className="w-5 shrink-0 text-center text-[1.5rem] leading-6 text-amber-200">†</Mark>
              <span>
                <span className="font-medium">Couldn&apos;t find this exact wording in the PDF.</span>{" "}
                <span className="text-claret-100">A quote that fails the check stays on the page, marked, never hidden.</span>
              </span>
            </p>
          </div>
        </div>

<div className="lg:border-l lg:border-claret-300/40 lg:pl-8">
          {report ? (
            <>
              <div className="grid gap-8">
                <Figure found={report.quotes_found} total={report.quotes} label="quotes found word for word" />
                <Figure found={report.captions_found} total={report.captions} label="figure captions found" />
              </div>
              {report.samples.length > 0 && (
                <div className="mt-12">
                  <h3 className="smallcaps font-serif text-[1rem] text-claret-200">By paper</h3>
                  <ul className="mt-3 divide-y divide-claret-300/40 border-y border-claret-300/40">
                    {report.samples.map((sample) => (
                      <li key={sample.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                        <span className="font-serif text-[1.0625rem] font-medium">{sample.title}</span>
                        <span className="shrink-0 font-mono text-[0.75rem] text-claret-100">
                          {sample.quotes_found}/{sample.quotes} quotes · {sample.captions_found}/{sample.captions} captions
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="mt-5 font-serif text-[0.9375rem] leading-relaxed text-claret-100 italic">
                Live numbers across all {report.papers} {report.papers === 1 ? "paper" : "papers"} explained on this site
                {updated ? `, as of ${updated}` : ""}. A found quote proves the paper says it, not that the explanation
                reads it correctly: that&apos;s why the quote sits beside it.
              </p>
            </>
          ) : failed ? (
            <p className="text-claret-100">The numbers couldn&apos;t load just now.</p>
          ) : (
            <div className="grid gap-10 sm:grid-cols-2" aria-busy="true" aria-label="Loading the numbers">
              <div className="h-32 animate-pulse bg-white/10" />
              <div className="h-32 animate-pulse bg-white/10" />
            </div>
          )}
          <Link
            href="/accuracy"
            className="mt-8 inline-flex items-center gap-1.5 font-mono text-[0.8125rem] text-white underline decoration-white/50 underline-offset-[5px] hover:decoration-white"
          >
            How accuracy is measured
            <Go className="text-[1rem]" />
          </Link>
        </div>
      </div>
      </div>
    </section>
  );
}
