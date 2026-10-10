import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";
import Link from "next/link";

import { Logo } from "@/components/Logo";
import { THEME_SCRIPT, ThemeToggle } from "@/components/ThemeToggle";
import { SITE_URL } from "@/lib/site";
import "katex/dist/katex.min.css";
import "./globals.css";

// Newsreader is a serif drawn for long reading on screens; it carries the headlines and every
// explanation. IBM Plex is the plain, technical voice of the controls, and its mono sets the numbers.
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
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-sm focus:bg-surface focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <header className="print:hidden">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
            <Link href="/" aria-label="Paper2Lab home">
              <Logo />
            </Link>
            <nav className="flex items-center gap-1 font-serif text-[1.05rem]">
              <Link href="/#library" className="smallcaps px-2.5 py-1 text-muted hover:text-foreground">
                Library
              </Link>
              <Link href="/accuracy" className="smallcaps px-2.5 py-1 text-muted hover:text-foreground">
                Accuracy
              </Link>
              <ThemeToggle />
            </nav>
          </div>
          <div className="mx-auto max-w-6xl px-4">
            <div className="double-rule" />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">
          {children}
        </main>
        <footer className="mx-auto w-full max-w-6xl px-4 print:hidden">
          <div className="flex flex-col gap-3 border-t border-rule py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              Explanations are written by AI and can be wrong. Every one shows the quote it&apos;s based on, so you can
              check.{" "}
              <Link href="/accuracy" className="underline hover:text-foreground">
                See how accurate it is
              </Link>
              .
            </p>
            <p className="flex shrink-0 gap-4">
              <span>
                Built by{" "}
                <a href="https://github.com/whatalshifa" className="underline hover:text-foreground">
                  Alshifa
                </a>
              </span>
              <a href="https://github.com/whatalshifa/paper2lab" className="underline hover:text-foreground">
                Source code
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
