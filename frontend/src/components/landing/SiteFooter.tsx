import Link from "next/link";

import { SAMPLE_IDS } from "@/lib/site";

import { Out } from "../Glyphs";
import { Wordmark } from "../Wordmark";

export const ATTENTION_PATH = `/papers/${SAMPLE_IDS[0]}`;

/** The home page's footer, set as a colophon: centred, in small serif, saying how the thing was made. */
export function SiteFooter() {
  return (
    <footer className="print:hidden">
      <div className="mx-auto max-w-[76rem] px-4 sm:px-6 lg:px-8">
        <div className="double-rule" />
        <div className="mx-auto flex max-w-[36rem] flex-col items-center py-14 text-center sm:py-16">
          <p className="font-serif text-[1.125rem] text-accent" aria-hidden>
            ❦
          </p>
          <div className="mt-4">
            <Wordmark size="colophon" />
          </div>
          <p className="mt-5 font-serif text-[0.9375rem] leading-relaxed text-muted italic">
            Set in Newsreader, a serif drawn by Production Type for reading on screens, with IBM Plex Mono for the
            controls. Papers are quoted from arXiv. Explanations are written by AI and can be wrong; each one shows
            the quote it&apos;s based on, so you can check.
          </p>
          <nav aria-label="Footer" className="mt-7">
            <ul className="flex flex-wrap justify-center gap-x-1 gap-y-1 font-mono text-[0.75rem]">
              {[
                { href: "/library", label: "Library" },
                { href: ATTENTION_PATH, label: "Sample paper" },
                { href: "/accuracy", label: "Accuracy" },
              ].map((item) => (
                <li key={item.href} className="flex items-center">
                  <Link href={item.href} className="px-1.5 py-1.5 text-muted underline-offset-[5px] hover:text-foreground hover:underline">
                    {item.label}
                  </Link>
                  <span aria-hidden className="font-serif text-muted">
                    ·
                  </span>
                </li>
              ))}
              <li>
                <a
                  href="https://github.com/whatalshifa/paper2lab"
                  className="inline-flex items-center gap-1 px-1.5 py-1.5 text-muted underline-offset-[5px] hover:text-foreground hover:underline"
                >
                  Source code
                  <Out />
                </a>
              </li>
            </ul>
          </nav>
          <p className="mt-6 font-mono text-[0.6875rem] text-muted">Open source · no accounts · made by Alshifa</p>
        </div>
      </div>
    </footer>
  );
}
