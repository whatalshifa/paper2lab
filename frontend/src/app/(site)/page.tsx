import type { Metadata } from "next";
import Link from "next/link";

import { Go } from "@/components/Glyphs";
import { AnnotatedPage } from "@/components/landing/AnnotatedPage";
import { ArticleHead } from "@/components/landing/ArticleHead";
import { ATTENTION_PATH, SiteFooter } from "@/components/landing/SiteFooter";
import { HeroDemo } from "@/components/landing/HeroDemo";
import { Playground } from "@/components/landing/Playground";
import { Shelf } from "@/components/landing/Shelf";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { Trust } from "@/components/landing/Trust";

export const metadata: Metadata = {
  title: { absolute: "Paper2Lab: read any research paper at your level" },
  alternates: { canonical: "/" },
};

const WRAP = "mx-auto max-w-[76rem] px-4 sm:px-6 lg:px-8";

/** What's in this issue: the home page's sections, listed like a journal's contents. */
const CONTENTS = [
  { numeral: "I", href: "#the-page", title: "The paper stays on the page", folio: "the margin notes" },
  { numeral: "II", href: "#accuracy", title: "Every claim shows its quote", folio: "the check" },
  { numeral: "III", href: "#shelf", title: "A small shelf, read closely", folio: "two papers" },
  { numeral: "IV", href: "#play", title: "Equations you can push on", folio: "two demos" },
];

/** The home page: an issue of a small journal about one product, with the product working on a real paper. */
export default function Page() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="w-full flex-1 overflow-x-clip">
        {/* The lead: the promise in the main column, the working reader as Plate I beside it. */}
        <section aria-labelledby="hero-title">
          <div
            className={`${WRAP} grid gap-7 pt-6 pb-16 sm:gap-8 sm:pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,35rem)] lg:gap-0 lg:pt-14 lg:pb-24`}
          >
            <div className="flex flex-col lg:pr-14">
              <p className="eyebrow">The lead</p>
              <h1
                id="hero-title"
                className="mt-2 font-serif text-[2.625rem] leading-[1] font-normal tracking-[-0.03em] text-balance sm:text-[3.75rem] lg:text-[4.25rem] xl:text-[4.5rem]"
              >
                Read any research paper at <em className="text-accent">your</em> level.
              </h1>
              <p className="mt-4 max-w-[34rem] text-[1.0625rem] leading-[1.5] sm:mt-7 sm:text-[1.3125rem] sm:leading-[1.55]">
                <span className="float-left mt-[0.08em] mr-2 font-serif text-[3.4em] leading-[0.8] text-accent">P</span>
                aper2Lab explains every section three ways, from new-to-this to expert, and pins each explanation to the
                sentence in the paper it came from.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 sm:mt-8 sm:gap-x-5">
                <Link href="/library" className="btn btn-primary h-11 sm:h-12 sm:px-6 sm:text-[0.875rem]">
                  Open the library
                  <Go className="text-[1rem]" />
                </Link>
                <Link href={ATTENTION_PATH} className="btn btn-ghost h-11 sm:h-12 sm:text-[0.875rem]">
                  Read a sample paper
                </Link>
              </div>

              {/* Contents of this issue. */}
              <nav aria-label="Contents" className="mt-auto hidden pt-10 lg:block">
                <p className="smallcaps border-b border-rule pb-2 font-serif text-[0.9375rem] text-muted">In this issue</p>
                <ol>
                  {CONTENTS.map((item) => (
                    <li key={item.href} className="border-b border-line">
                      <a href={item.href} className="group flex items-baseline gap-4 py-2.5">
                        <span className="w-8 shrink-0 font-serif text-accent italic">{item.numeral}.</span>
                        <span className="font-serif text-[1.125rem] group-hover:underline group-hover:underline-offset-4">
                          {item.title}
                        </span>
                        <span aria-hidden className="mx-1 min-w-6 flex-1 translate-y-[-0.3em] border-b border-dotted border-muted/60" />
                        <span className="shrink-0 font-mono text-[0.6875rem] text-muted">{item.folio}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
            <div className="min-w-0 lg:border-l lg:border-rule lg:pl-10">
              <p className="mb-3 flex items-baseline justify-between gap-3 font-mono text-[0.6875rem] text-muted">
                <span>
                  <span className="font-serif text-[0.875rem] text-foreground italic">Plate I.</span> The reader, working
                </span>
                <span>drag the level</span>
              </p>
              <HeroDemo />
            </div>
          </div>
        </section>

        {/* I. The annotated page. */}
        <section id="the-page" aria-labelledby="page-title" className="scroll-mt-4 pb-20 sm:pb-28">
          <div className={WRAP}>
            <ArticleHead numeral="I" id="page-title" title="The paper stays on the page. The help goes in the margin.">
              Paper2Lab never paraphrases a paper out of sight. Here is part of section 3 of <em>Attention Is All You
              Need</em>, with the notes the reader adds beside it. Hover the equation, follow a quote to its page, answer
              the question.
            </ArticleHead>
            <p className="mt-12 mb-4 font-mono text-[0.6875rem] text-muted">
              Excerpts quoted word for word. Text between them is left out […].
            </p>
            <AnnotatedPage />
          </div>
        </section>

        {/* II. Trust, printed as a plate in the second ink. */}
        <Trust />

        {/* III. The shelf. */}
        <section id="shelf" aria-labelledby="shelf-title" className="scroll-mt-4 py-20 sm:py-28">
          <div className={WRAP}>
            <ArticleHead numeral="III" id="shelf-title" title="A small shelf, read closely.">
              The demo library holds two landmark machine-learning papers, explained in advance so every feature works
              without an AI key: three reading levels, equations in words, figures, questions with answers, and a map of
              what to know first.
            </ArticleHead>
            <div className="mt-14 sm:mt-16">
              <Shelf />
            </div>
          </div>
        </section>

        {/* IV. Demos. */}
        <section id="play" aria-labelledby="play-title" className="scroll-mt-4 bg-sunken py-20 sm:py-28">
          <div className={WRAP}>
            <Playground />
          </div>
        </section>

        {/* Notes to the reader: the fine print, kept short. */}
        <section id="colophon" aria-labelledby="colophon-title" className="scroll-mt-4 py-20 sm:py-28">
          <div className={WRAP}>
            <h2 id="colophon-title" className="smallcaps border-b border-rule pb-2 text-center font-serif text-[1.125rem]">
              Notes to the reader
            </h2>
            <div className="grid md:grid-cols-3">
              {[
                {
                  mark: "*",
                  title: "Your papers stay yours",
                  body: (
                    <>
                      There are no accounts. Papers you add belong to your browser, through a random key in a cookie that
                      scripts can&apos;t read. Nobody else can open, list or delete them.
                    </>
                  ),
                },
                {
                  mark: "†",
                  title: "About this demo",
                  body: (
                    <>
                      The live demo runs without an AI key, so it shows two papers explained in advance. Every feature
                      works on them, including prepared answers to their suggested questions. Adding new papers is paused.
                    </>
                  ),
                },
                {
                  mark: "‡",
                  title: "Made in the open",
                  body: (
                    <>
                      Explanations are written by AI and can be wrong; that&apos;s why each one shows its quote. The code
                      is open source, built by{" "}
                      <a href="https://github.com/whatalshifa" className="link">
                        Alshifa
                      </a>
                      .
                    </>
                  ),
                },
              ].map((note, i) => (
                <div key={note.title} className={`py-8 md:px-8 ${i > 0 ? "border-t border-line md:border-t-0 md:border-l" : "md:pl-0"} ${i === 2 ? "md:pr-0" : ""}`}>
                  <h3 className="font-serif text-[1.25rem] font-medium">
                    <span aria-hidden className="mr-2 text-accent">
                      {note.mark}
                    </span>
                    {note.title}
                  </h3>
                  <p className="mt-2 text-[1rem] leading-relaxed text-muted">{note.body}</p>
                </div>
              ))}
            </div>

            {/* Closing call to action, centred like the last line of an issue. */}
            <div className="mt-20 flex flex-col items-center border-t border-rule pt-16 text-center">
              <p className="max-w-3xl font-serif text-[2.5rem] leading-[1.05] font-normal tracking-[-0.025em] text-balance sm:text-[4rem]">
                Pick a paper. Pick your <em className="text-accent">level</em>.
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                <Link href="/library" className="btn btn-primary btn-lg">
                  Open the library
                  <Go className="text-[1rem]" />
                </Link>
                <Link href="/accuracy" className="btn btn-ghost h-12 text-[0.875rem]">
                  How accurate is it?
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
