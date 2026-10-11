import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Newsreader } from "next/font/google";

import { THEME_SCRIPT } from "@/components/PaperInk";
import { SITE_URL } from "@/lib/site";
import "katex/dist/katex.min.css";
import "./globals.css";

// Set like a small press: Newsreader, a serif drawn for long reading on screens, carries every word, from the
// masthead to the footnotes. IBM Plex Mono is the press's typewriter, for the controls, labels and metadata.
// There is no sans-serif anywhere.
const serif = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], axes: ["opsz"], variable: "--font-newsreader" });
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
    url: "/",
    title: "Paper2Lab: read any research paper at your level",
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f1e7" },
    { media: "(prefers-color-scheme: dark)", color: "#15110e" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${serif.variable} ${mono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:border focus:border-rule focus:bg-surface focus:px-3 focus:py-2 focus:font-mono focus:text-[0.8125rem]"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
