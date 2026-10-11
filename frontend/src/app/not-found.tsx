import type { Metadata } from "next";
import Link from "next/link";

import { AppBar } from "@/components/AppBar";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <>
      <AppBar />
      <main id="main" className="w-full flex-1">
        <div className="mx-auto max-w-md px-4 py-16 text-center sm:py-24">
          <p className="eyebrow">Erratum · 404</p>
          <h1 className="mt-2 font-serif text-[2.5rem] leading-tight font-normal italic">Page not found</h1>
          <p className="mt-3 text-muted">That address doesn&apos;t lead anywhere on Paper2Lab.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <Link href="/library" className="btn btn-primary">
              Go to the library
            </Link>
            <Link href="/" className="btn btn-secondary">
              Front page
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
