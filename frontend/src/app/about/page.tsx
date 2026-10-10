import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "Paper2Lab explains research papers at three reading levels, shows what each equation means, and backs every explanation with a quote checked against the PDF.",
};

const WHAT = [
  {
    term: "Read at your level",
    text: "Every section is explained three ways, from “new to this” to expert. One slider rewrites the whole paper.",
  },
  {
    term: "Equations in words",
    text: "Hover or tap any equation to see what it says and what each symbol means. Key ones come with a demo to play with.",
  },
  {
    term: "Check every claim",
    text: "Each explanation shows the sentence from the paper it rests on. Plain code looks for that sentence in the PDF, word for word.",
  },
  {
    term: "Ask the paper",
    text: "Questions are answered from the paper alone, each sentence marked with the passage and page it comes from.",
  },
];

/** The pitch, kept off the home page: what Paper2Lab is, how it keeps itself honest, and whose papers are whose. */
export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8 sm:py-16">
      <p className="text-[0.8125rem] font-medium text-accent">About</p>
      <h1 className="mt-2 font-serif text-[2.25rem] leading-[1.1] font-semibold tracking-[-0.01em] text-balance sm:text-[2.75rem]">
        Read any research paper at your level.
      </h1>
      <p className="prose-reading mt-5 text-muted">
        Upload a PDF or paste an arXiv link. Paper2Lab reads the whole paper once and explains every section in plain
        words, with the paper&apos;s own sentences beside each explanation so you can trust it or catch it out.
      </p>

      <dl className="mt-10 grid gap-x-10 gap-y-6 border-t border-line pt-8 sm:grid-cols-2">
        {WHAT.map((item) => (
          <div key={item.term}>
            <dt className="font-semibold">{item.term}</dt>
            <dd className="mt-1 text-[0.9375rem] leading-relaxed text-muted">{item.text}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-10 space-y-6 border-t border-line pt-8 text-[0.9375rem] leading-relaxed">
        <div>
          <h2 className="font-semibold">Your papers stay yours</h2>
          <p className="mt-1 text-muted">
            There are no accounts. Papers you add belong to your browser, through a random key in a cookie that scripts
            can&apos;t read. Nobody else can open, list or delete them.
          </p>
        </div>
        <div>
          <h2 className="font-semibold">This demo</h2>
          <p className="mt-1 text-muted">
            The live demo runs without an AI key, so it shows two famous papers, <em>Attention Is All You Need</em> and{" "}
            <em>Adam</em>, explained in advance. Every feature works on them, including prepared answers to their
            suggested questions. Adding new papers is paused.
          </p>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-8">
        <Link href="/" className="btn btn-primary">
          Try a sample paper
        </Link>
        <Link href="/accuracy" className="link text-[0.9375rem]">
          How accurate is it?
        </Link>
        <a href="https://github.com/whatalshifa/paper2lab" className="link text-[0.9375rem]">
          Source code
        </a>
      </div>
      <p className="mt-10 text-xs leading-relaxed text-muted">
        Built by{" "}
        <a href="https://github.com/whatalshifa" className="underline underline-offset-2 hover:text-foreground">
          Alshifa
        </a>
        . Explanations are written by AI and can be wrong. Every one shows the quote it&apos;s based on, so you can check.
      </p>
    </div>
  );
}
