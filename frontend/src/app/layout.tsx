import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import Link from "next/link";

import { Logo } from "@/components/Logo";
import { THEME_SCRIPT, ThemeToggle } from "@/components/ThemeToggle";
import "@fontsource-variable/source-serif-4";
import "katex/dist/katex.min.css";
import "./globals.css";

const DESCRIPTION =
  "Upload a research paper or paste an arXiv link. Paper2Lab explains every section at the level you choose, shows what each equation means, and backs every explanation with a quote from the paper.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: { default: "Paper2Lab: read any research paper at your level", template: "%s · Paper2Lab" },
  description: DESCRIPTION,
  applicationName: "Paper2Lab",
  openGraph: {
    type: "website",
    siteName: "Paper2Lab",
    title: "Paper2Lab: read any research paper at your level",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0c12" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${GeistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <header className="border-b border-line bg-background/85 backdrop-blur print:hidden">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <Link href="/" aria-label="Paper2Lab home">
              <Logo />
            </Link>
            <nav className="flex items-center gap-1">
              <Link href="/#library" className="btn btn-ghost btn-sm">
                Library
              </Link>
              <Link href="/accuracy" className="btn btn-ghost btn-sm">
                Accuracy
              </Link>
              <ThemeToggle />
            </nav>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">
          {children}
        </main>
        <footer className="border-t border-line print:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              Explanations are written by AI and can be wrong. Every one shows the quote it&apos;s based on, so you can
              check.{" "}
              <Link href="/accuracy" className="underline hover:text-foreground">
                See how accurate it is
              </Link>
              .
            </p>
            <a href="https://github.com/whatalshifa/paper2lab" className="hover:text-foreground">
              Source code
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
