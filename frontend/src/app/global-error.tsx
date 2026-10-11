"use client";

import "./globals.css";

import { ErrorNotice } from "@/components/ErrorNotice";

/** The last resort, when the root layout itself fails: it has to draw its own <html> and <body>. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <main id="main" className="w-full flex-1">
          <ErrorNotice onRetry={reset} digest={error.digest} />
        </main>
      </body>
    </html>
  );
}
