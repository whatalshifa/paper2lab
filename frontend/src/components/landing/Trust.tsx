"use client";

import { ArrowRight, CircleAlert, CircleCheck } from "lucide-react";
import Link from "next/link";

import { useAccuracy } from "./data";

function Figure({ found, total, label }: { found: number; total: number; label: string }) {
  return (
    <div className="border-t border-white/25 pt-5">
      <p className="font-serif text-[3.5rem] leading-none font-medium tracking-[-0.02em] whitespace-nowrap tabular-nums sm:text-[4rem]">
        {found}
        <span className="text-claret-200"> of {total}</span>
      </p>
      <p className="mt-3 text-[1rem] text-claret-100">{label}</p>
    </div>
  );
}

/**
 * "Every claim shows its quote": the brand's full-bleed claret band, with the live accuracy numbers
 * from /api/accuracy and how the check works.
 */
export function Trust() {
  const { data: report, failed } = useAccuracy();
  const updated = report ? new Date(report.updated_at).toLocaleDateString("en-GB", { dateStyle: "long" }) : null;

  return (
    <section
      id="accuracy"
      aria-labelledby="accuracy-title"
      className="scroll-mt-16 bg-claret-900 text-white dark:bg-claret-950"
    >
      <div className="mx-auto grid max-w-[76rem] gap-14 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20 lg:px-8">
        <div>
          <p className="font-serif text-[1.125rem] text-claret-200 italic">II</p>
          <h2
            id="accuracy-title"
            className="mt-3 font-serif text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.02em] text-balance sm:text-[3.25rem]"
          >
            Every claim shows its quote.
          </h2>
          <p className="mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-claret-100 sm:text-[1.125rem]">
            Any AI can sound sure of itself. Paper2Lab has to quote the paper for every explanation, and a short Python
            program, not the AI, looks for each quote in the PDF&apos;s own text, word for word. Figure captions are
            checked the same way.
          </p>

          {/* What a reader sees next to each quote, both outcomes. */}
          <div className="mt-8 max-w-xl space-y-3">
            <p className="flex items-start gap-3 rounded-md bg-white/[0.07] px-4 py-3 text-[0.9375rem] ring-1 ring-white/15">
              <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
              <span>
                <span className="font-semibold">Found word for word in the PDF.</span>{" "}
                <span className="text-claret-100">The quote links to its page, so you can read it in context.</span>
              </span>
            </p>
            <p className="flex items-start gap-3 rounded-md bg-white/[0.07] px-4 py-3 text-[0.9375rem] ring-1 ring-white/15">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
              <span>
                <span className="font-semibold">Couldn&apos;t find this exact wording in the PDF.</span>{" "}
                <span className="text-claret-100">A quote that fails the check stays on the page, marked, never hidden.</span>
              </span>
            </p>
          </div>
        </div>

        <div className="lg:pt-10">
          {report ? (
            <>
              <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <Figure found={report.quotes_found} total={report.quotes} label="quotes found word for word" />
                <Figure found={report.captions_found} total={report.captions} label="figure captions found" />
              </div>
              {report.samples.length > 0 && (
                <div className="mt-12">
                  <h3 className="text-[0.8125rem] font-semibold tracking-[0.08em] text-claret-200 uppercase">By paper</h3>
                  <ul className="mt-3 divide-y divide-white/15 border-y border-white/15">
                    {report.samples.map((sample) => (
                      <li key={sample.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                        <span className="font-serif text-[1.0625rem] font-medium">{sample.title}</span>
                        <span className="shrink-0 text-[0.9375rem] text-claret-100 tabular-nums">
                          {sample.quotes_found}/{sample.quotes} quotes · {sample.captions_found}/{sample.captions} captions
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="mt-5 text-[0.875rem] leading-relaxed text-claret-200">
                Live numbers across all {report.papers} {report.papers === 1 ? "paper" : "papers"} explained on this site
                {updated ? `, as of ${updated}` : ""}. A found quote proves the paper says it, not that the explanation
                reads it correctly: that&apos;s why the quote sits beside it.
              </p>
            </>
          ) : failed ? (
            <p className="text-claret-100">The numbers couldn&apos;t load just now.</p>
          ) : (
            <div className="grid gap-10 sm:grid-cols-2" aria-busy="true" aria-label="Loading the numbers">
              <div className="h-32 animate-pulse rounded-md bg-white/10" />
              <div className="h-32 animate-pulse rounded-md bg-white/10" />
            </div>
          )}
          <Link
            href="/accuracy"
            className="mt-8 inline-flex items-center gap-1.5 font-medium text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
          >
            How accuracy is measured
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
