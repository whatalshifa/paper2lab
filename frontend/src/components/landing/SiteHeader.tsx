import Link from "next/link";

import { Go } from "../Glyphs";
import { PaperInkSwitch } from "../PaperInk";
import { Wordmark } from "../Wordmark";

const LINKS = [
  { href: "#the-page", label: "How it reads" },
  { href: "#accuracy", label: "Accuracy" },
  { href: "#shelf", label: "Papers" },
  { href: "#colophon", label: "About" },
];

/**
 * The home page's masthead, set the way a journal sets its title: a line of small print, the name
 * centred, a double rule, then one row of contents in the typewriter face, ending with the way in.
 */
export function SiteHeader() {
  return (
    <header className="print:hidden">
      <div className="mx-auto max-w-[76rem] px-4 sm:px-6 lg:px-8">
        {/* The line above the title: what this is, and the Paper / Ink switch. */}
        <div className="flex h-11 items-center justify-between gap-4 font-mono text-[0.6875rem] text-muted">
          <span className="hidden md:inline">A reader for research papers</span>
          <Link
            href="/library"
            className="inline-flex items-center gap-1.5 py-2 text-[0.75rem] font-medium text-accent underline decoration-1 underline-offset-[5px] md:hidden"
          >
            Open the library
            <Go className="text-[0.9375rem]" />
          </Link>
          <span className="hidden md:inline">Explained at three levels · every claim quoted</span>
          <PaperInkSwitch />
        </div>

        <div className="flex justify-center pb-3 sm:pt-2 sm:pb-5">
          <Link href="/" aria-label="Paper2Lab home" className="inline-flex px-2">
            <Wordmark size="masthead" />
          </Link>
        </div>

        <div className="double-rule" />
        <nav aria-label="On this page" className="hidden border-b border-rule md:block">
          <ul className="flex h-12 items-center justify-center gap-x-1 font-mono text-[0.75rem] sm:gap-x-3">
            {LINKS.map((link, i) => (
              <li key={link.href} className="hidden items-center md:flex">
                {i > 0 && (
                  <span aria-hidden className="mr-1 font-serif text-muted sm:mr-3">
                    ·
                  </span>
                )}
                <a href={link.href} className="px-1.5 py-2 text-muted transition-colors hover:text-foreground hover:underline hover:underline-offset-[5px]">
                  {link.label}
                </a>
              </li>
            ))}
            <li className="ml-4 flex items-center border-l border-line pl-6">
              <Link
                href="/library"
                className="inline-flex items-center gap-1.5 px-1.5 py-2 font-medium text-accent underline decoration-1 underline-offset-[5px] hover:decoration-2"
              >
                Open the library
                <Go className="text-[0.9375rem]" />
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
