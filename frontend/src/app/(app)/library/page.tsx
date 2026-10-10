import type { Metadata } from "next";
import { Suspense } from "react";

import { Library } from "@/components/Library";

export const metadata: Metadata = {
  title: "Library",
  description: "The Paper2Lab library: sample papers explained at three reading levels, and the papers you add.",
};

export default function Page() {
  // The library reads which paper is selected from the address (?paper=...), so it renders in the browser.
  return (
    <Suspense>
      <Library />
    </Suspense>
  );
}
