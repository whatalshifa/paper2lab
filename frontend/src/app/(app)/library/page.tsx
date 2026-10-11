import { Suspense } from "react";

import { Library } from "@/components/Library";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Library",
  description: "The Paper2Lab library: sample papers explained at three reading levels, and the papers you add.",
  path: "/library",
});

export default function Page() {
  // The library reads which paper is selected from the address (?paper=...), so it renders in the browser.
  return (
    <Suspense>
      <Library />
    </Suspense>
  );
}
