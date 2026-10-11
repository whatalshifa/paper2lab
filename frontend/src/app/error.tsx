"use client";

import Link from "next/link";

import { ErrorNotice } from "@/components/ErrorNotice";
import { Wordmark } from "@/components/Wordmark";

/** An error outside the app's pages (the home page): the notice under the wordmark. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="w-full flex-1">
      <div className="border-b-[3px] border-double border-rule py-4 text-center">
        <Link href="/" aria-label="Paper2Lab home">
          <Wordmark size="running" />
        </Link>
      </div>
      <ErrorNotice onRetry={reset} digest={error.digest} />
    </main>
  );
}
