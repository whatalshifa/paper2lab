import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";
import Link from "next/link";

import { Logo } from "@/components/Logo";
import { SiteHeader } from "@/components/SiteHeader";
import { THEME_SCRIPT } from "@/components/ThemeToggle";
import { SITE_URL } from "@/lib/site";
import "katex/dist/katex.min.css";
import "./globals.css";

// IBM Plex Sans is the voice of the site: headings, controls and labels. Newsreader, a serif drawn for
// long reading on screens, has one job: the papers' titles and every explanation.
const serif = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], axes: ["opsz"], variable: "--font-newsreader" });
const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" });

const DESCRIPTION =
  "Upload a research paper or paste an arXiv link. Paper2Lab explains every section at the level you choose, shows what each equation means, and backs every explanation with a quote from the paper.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Paper2Lab: read any research paper at your level", template: "%s · Paper2Lab" },
  description: DESCRIPTION,
  applicationName: "Paper2Lab",
  openGraph: {
    type: "website",
    siteName: "Paper2Lab",
    title: "Paper2Lab: read any research paper at your level",
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf6" },
    { media: "(prefers-color-scheme: dark)", color: "#121113" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
          {children}
        </main>
        <footer className="mt-16 border-t border-line print:hidden">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,1.6fr)_1fr_1fr]">
            <div className="max-w-sm">
              <Logo />
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Research papers explained at three reading levels, with every explanation backed by a quote from the
                paper.
              </p>
            </div>
            <div>
              <h2 className="text-[0.8125rem] font-semibold">Read</h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/#samples" className="text-muted hover:text-foreground">
                    Sample papers
                  </Link>
                </li>
                <li>
                  <Link href="/accuracy" className="text-muted hover:text-foreground">
                    How quotes are checked
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="text-[0.8125rem] font-semibold">Project</h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <a href="https://github.com/whatalshifa/paper2lab" className="text-muted hover:text-foreground">
                    Source code
                  </a>
                </li>
                <li>
                  <a href="https://github.com/whatalshifa" className="text-muted hover:text-foreground">
                    Built by Alshifa
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="border-t border-line py-6 text-xs leading-relaxed text-muted">
              Explanations are written by AI and can be wrong. Every one shows the quote it&apos;s based on, so you can
              check.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
