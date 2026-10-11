"use client";

import { ErrorNotice } from "@/components/ErrorNotice";

/** An error in one of the app's pages: the notice under the app bar, which keeps working. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorNotice onRetry={reset} digest={error.digest} />;
}
