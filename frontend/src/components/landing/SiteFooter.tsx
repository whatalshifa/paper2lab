import Link from "next/link";

import { SAMPLE_IDS } from "@/lib/site";

import { Logo } from "../Logo";

export const ATTENTION_PATH = `/papers/${SAMPLE_IDS[0]}`;

/** The home page's footer. */
export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-sunken print:hidden">
      <div className="mx-auto flex max-w-[76rem] flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex flex-col gap-2">
          <Logo />
          <p className="max-w-md text-[0.8125rem] leading-relaxed text-muted">
            Explanations are written by AI and can be wrong. Each one shows the quote it&apos;s based on, so you can check.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[0.875rem]">
            <li>
              <Link href="/library" className="text-muted hover:text-foreground">
                Library
              </Link>
            </li>
            <li>
              <Link href={ATTENTION_PATH} className="text-muted hover:text-foreground">
                Sample paper
              </Link>
            </li>
            <li>
              <Link href="/accuracy" className="text-muted hover:text-foreground">
                Accuracy
              </Link>
            </li>
            <li>
              <a href="https://github.com/whatalshifa/paper2lab" className="text-muted hover:text-foreground">
                Source code
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
