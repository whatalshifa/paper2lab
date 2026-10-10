import { Suspense } from "react";

import { Library } from "@/components/Library";

export default function Page() {
  // The library reads which paper is selected from the address (?paper=...), so it renders in the browser.
  return (
    <Suspense>
      <Library />
    </Suspense>
  );
}
