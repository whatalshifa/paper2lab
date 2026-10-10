import { ArrowRight, BookOpen, MoveRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AnnotatedPage } from "@/components/landing/AnnotatedPage";
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

function Numeral({ children }: { children: string }) {
  return <p className="font-serif text-[1.125rem] text-accent italic">{children}</p>;
}

/** The home page: what Paper2Lab is, shown with the real product working on a real paper. */
export default function Page() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="w-full flex-1 overflow-x-clip">
        {/* Hero: the pitch on the left, the product working on the right. */}
        <section aria-labelledby="hero-title" className="relative">
          {/* A sunken bench behind the demo, running off the right edge on wide screens. */}
          <div
            className="absolute inset-y-0 right-0 hidden w-[46%] border-l border-line bg-sunken lg:block"
            aria-hidden
            style={{
              backgroundImage: "radial-gradient(color-mix(in srgb, var(--muted) 22%, transparent) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />
          <div className={`${WRAP} relative grid items-center gap-8 pt-8 pb-14 sm:gap-10 sm:pt-16 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:gap-16 lg:py-16 xl:grid-cols-[minmax(0,1fr)_minmax(0,36rem)]`}>
            <div className="max-w-xl">
              <p className="font-mono text-[0.75rem] tracking-[0.04em] text-muted">A reader for research papers</p>
              <h1
                id="hero-title"
                className="mt-3 font-serif text-[2.5rem] leading-[1.02] font-semibold tracking-[-0.025em] text-balance sm:text-[3.5rem] lg:text-[4rem]"
              >
                Read any research paper at <em className="text-accent">your</em> level.
              </h1>
              <p className="mt-5 max-w-[34rem] text-[1.0625rem] leading-relaxed text-muted sm:mt-6 sm:text-[1.1875rem]">
                Paper2Lab explains every section three ways, from new-to-this to expert, and pins each explanation to the
                sentence in the paper it came from.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-2.5 sm:mt-8 sm:gap-3">
                <Link href="/library" className="btn btn-primary sm:h-11 sm:px-5 sm:text-[0.9375rem]">
                  Open the library
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link href={ATTENTION_PATH} className="btn btn-secondary sm:h-11 sm:px-5 sm:text-[0.9375rem]">
                  <BookOpen className="h-4 w-4" aria-hidden />
                  Read a sample paper
                </Link>
              </div>
              <p className="mt-8 hidden items-center gap-2 font-serif text-[1.0625rem] text-muted italic lg:flex">
                Drag the slider on the right. The explanation rewrites itself.
                <MoveRight className="h-4 w-4 text-accent" aria-hidden />
              </p>
            </div>
            <div className="min-w-0">
              <p className="mb-2.5 font-serif text-[1rem] text-muted italic lg:hidden">Try it: drag the reading level.</p>
              <HeroDemo />
            </div>
          </div>
        </section>

        {/* I. The annotated page. */}
        <section id="the-page" aria-labelledby="page-title" className="scroll-mt-16 border-t border-line py-20 sm:py-28">
          <div className={WRAP}>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,40rem)_minmax(0,1fr)] lg:gap-x-14 xl:gap-x-20">
              <div>
                <Numeral>I</Numeral>
                <h2
                  id="page-title"
                  className="mt-3 font-serif text-[2.25rem] leading-[1.08] font-semibold tracking-[-0.02em] text-balance sm:text-[2.75rem]"
                >
                  The paper stays on the page. The help goes in the margin.
                </h2>
              </div>
              <p className="text-[1.0625rem] leading-relaxed text-muted lg:self-end">
                Paper2Lab never paraphrases a paper out of sight. Here is part of section 3 of <em>Attention Is All You
                Need</em>, with the notes the reader adds beside it. Hover the equation, follow a quote to its page, answer
                the question.
              </p>
            </div>
            <p className="mt-12 mb-4 font-mono text-[0.75rem] text-muted">
              Excerpts quoted word for word. Text between them is left out […].
            </p>
            <AnnotatedPage />
          </div>
        </section>

        {/* II. Trust, on the brand's own colour. */}
        <Trust />

        {/* III. The shelf. */}
        <section id="shelf" aria-labelledby="shelf-title" className="scroll-mt-16 py-20 sm:py-28">
          <div className={WRAP}>
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-20">
              <div>
                <Numeral>III</Numeral>
                <h2
                  id="shelf-title"
                  className="mt-3 font-serif text-[2.25rem] leading-[1.08] font-semibold tracking-[-0.02em] text-balance sm:text-[2.75rem]"
                >
                  A small shelf, read closely.
                </h2>
              </div>
              <p className="text-[1.0625rem] leading-relaxed text-muted lg:self-end">
                The demo library holds two landmark machine-learning papers, explained in advance so every feature works
                without an AI key: three reading levels, equations in words, figures, questions with answers, and a map of
                what to know first.
              </p>
            </div>
            <div className="mt-14 border-b-[6px] border-double border-line pb-10 sm:mt-16">
              <Shelf />
            </div>
          </div>
        </section>

        {/* IV. Demos. */}
        <section aria-labelledby="play-title" className="border-y border-line bg-sunken py-20 sm:py-28">
          <div className={WRAP}>
            <Playground />
          </div>
        </section>

        {/* Colophon: the fine print, kept short. */}
        <section id="colophon" aria-labelledby="colophon-title" className="scroll-mt-16 py-20 sm:py-28">
          <div className={WRAP}>
            <h2 id="colophon-title" className="text-[0.8125rem] font-semibold tracking-[0.1em] text-muted uppercase">
              Colophon
            </h2>
            <div className="mt-6 grid gap-10 border-t border-rule pt-8 md:grid-cols-3 md:gap-12">
              <div>
                <h3 className="font-serif text-[1.25rem] font-semibold">Your papers stay yours</h3>
                <p className="mt-2 text-[1rem] leading-relaxed text-muted">
                  There are no accounts. Papers you add belong to your browser, through a random key in a cookie that
                  scripts can&apos;t read. Nobody else can open, list or delete them.
                </p>
              </div>
              <div>
                <h3 className="font-serif text-[1.25rem] font-semibold">About this demo</h3>
                <p className="mt-2 text-[1rem] leading-relaxed text-muted">
                  The live demo runs without an AI key, so it shows two papers explained in advance. Every feature works on
                  them, including prepared answers to their suggested questions. Adding new papers is paused.
                </p>
              </div>
              <div>
                <h3 className="font-serif text-[1.25rem] font-semibold">Made in the open</h3>
                <p className="mt-2 text-[1rem] leading-relaxed text-muted">
                  Explanations are written by AI and can be wrong; that&apos;s why each one shows its quote. The code is
                  open source, built by{" "}
                  <a href="https://github.com/whatalshifa" className="link">
                    Alshifa
                  </a>
                  .
                </p>
              </div>
            </div>

            {/* Closing call to action. */}
            <div className="mt-24 flex flex-col items-start gap-8 border-t border-line pt-14 lg:flex-row lg:items-end lg:justify-between">
              <p className="max-w-3xl font-serif text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.025em] text-balance sm:text-[3.5rem]">
                Pick a paper. Pick your <em className="text-accent">level</em>.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/library" className="btn btn-primary btn-lg">
                  Open the library
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link href="/accuracy" className="btn btn-ghost btn-lg">
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
