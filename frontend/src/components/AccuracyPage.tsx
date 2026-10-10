"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { type AccuracyReport, ApiError, api } from "@/lib/api";
import { useSlow, WAKING_UP } from "@/lib/useSlow";

function percent(found: number, total: number) {
  return total === 0 ? "–" : `${Math.round((found / total) * 1000) / 10}%`;
}

function Stat({ value, label, detail }: { value: string; label: string; detail: string }) {
  return (
    <div className="border-t border-line pt-5">
      <p className="text-[2.25rem] leading-none font-semibold tracking-tight text-accent tabular-nums">{value}</p>
      <p className="mt-3 font-medium">{label}</p>
      <p className="mt-1 text-sm text-muted">{detail}</p>
    </div>
  );
}

const STEPS = [
  {
    title: "Claude has to quote the paper",
    text: "Every section's explanation comes with the sentences from the paper it leans on, copied word for word, with the page.",
  },
  {
    title: "Plain code checks every quote",
    text: "Not the AI: a short Python program looks for that exact wording in the PDF's own text, ignoring only spaces and punctuation. Figure captions are checked the same way.",
  },
  {
    title: "Nothing fails silently",
    text: "A quote the check can't find stays on the page, marked “Couldn't find this exact wording in the PDF”, so you know to read that part with care.",
  },
];

/** The public accuracy numbers, and how they're made. */
export function AccuracyPage() {
  const [report, setReport] = useState<AccuracyReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setReport(await api.accuracy());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load the numbers.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading data when the page opens
    load();
  }, [load]);
  const slow = useSlow(!report && !error);

  return (
    <div className="max-w-4xl space-y-16">
      <header>
        <h1 className="text-[1.875rem] leading-tight font-semibold tracking-[-0.02em] text-balance sm:text-[2.25rem]">
          How accurate is Paper2Lab?
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-pretty text-muted">
          Any AI can sound sure of itself. Paper2Lab backs every explanation with the paper&apos;s own words and checks
          each quote against the PDF. These are the results, across every paper it has explained.
        </p>
      </header>

      {error && (
        <div role="alert" className="card flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p>{error}</p>
          <button type="button" onClick={load} className="btn btn-secondary btn-sm">
            Try again
          </button>
        </div>
      )}

      {report ? (
        <section aria-label="The numbers" className="space-y-4">
          <div className="grid gap-8 sm:grid-cols-3">
            <Stat
              value={percent(report.quotes_found, report.quotes)}
              label="of quotes found word for word"
              detail={`${report.quotes_found.toLocaleString()} of ${report.quotes.toLocaleString()} quotes`}
            />
            <Stat
              value={percent(report.captions_found, report.captions)}
              label="of figure captions found"
              detail={`${report.captions_found.toLocaleString()} of ${report.captions.toLocaleString()} captions`}
            />
            <Stat
              value={report.papers.toLocaleString()}
              label={report.papers === 1 ? "paper checked" : "papers checked"}
              detail="Including the sample papers"
            />
          </div>
          <p className="text-[0.8125rem] text-muted">
            Updated {new Date(report.updated_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}.
            {report.scanned_papers > 0 &&
              ` ${report.scanned_papers} scanned ${report.scanned_papers === 1 ? "paper has" : "papers have"} no text to check against, so ${
                report.scanned_papers === 1 ? "it isn't" : "they aren't"
              } counted.`}
          </p>
        </section>
      ) : (
        !error && (
          <div className="space-y-3">
            {slow && (
              <p role="status" className="text-sm text-muted">
                {WAKING_UP}
              </p>
            )}
            <div className="grid gap-8 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-28" />)}</div>
          </div>
        )
      )}

      <section aria-labelledby="how" className="space-y-6">
        <h2 id="how" className="text-2xl font-semibold tracking-tight">
          How the check works
        </h2>
        <ol className="grid gap-8 pt-2 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <span className="text-[0.8125rem] font-semibold text-accent tabular-nums">Step {i + 1}</span>
              <p className="mt-1 font-semibold">{step.title}</p>
              <p className="mt-1 text-[0.9375rem] leading-relaxed text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
        <p className="max-w-2xl border-t border-line pt-6 text-[0.9375rem] leading-relaxed text-muted">
          What this proves, and what it doesn&apos;t: a quote found word for word shows the paper really says it. It
          doesn&apos;t prove the explanation reads that sentence correctly, which is why the quote sits right next to
          it, with a link to its page, for you to judge.
        </p>
      </section>

      {report && report.samples.length > 0 && (
        <section aria-labelledby="samples" className="space-y-4">
          <h2 id="samples" className="text-2xl font-semibold tracking-tight">
            The sample papers
          </h2>
          <p className="text-[0.9375rem] text-muted">
            Other people&apos;s papers are counted above but never listed. The samples are public, so here they are.
          </p>
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-left text-[0.9375rem]">
              <thead className="border-b border-line bg-sunken text-[0.8125rem] text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Paper
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Quotes found
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Captions found
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {report.samples.map((sample) => (
                  <tr key={sample.id}>
                    <th scope="row" className="px-4 py-3 font-serif font-semibold">
                      <Link href={`/papers/${sample.id}`} className="hover:text-accent hover:underline">
                        {sample.title}
                      </Link>
                    </th>
                    <td className="px-4 py-3 tabular-nums">
                      {sample.quotes_found} of {sample.quotes}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {sample.captions_found} of {sample.captions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
