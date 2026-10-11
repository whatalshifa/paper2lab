import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Paper not found" };

/** An address under /papers/ that can't be a paper. (A real paper this browser can't open says so in PaperPage.) */
export default function PaperNotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center sm:py-24">
      <p className="eyebrow">Erratum · 404</p>
      <h1 className="mt-2 font-serif text-[2.25rem] leading-tight font-normal italic">Paper not found</h1>
      <p className="mt-3 text-muted">That link doesn&apos;t point to a paper. It may have been copied only in part.</p>
      <Link href="/library" className="btn btn-primary mt-8">
        Back to the library
      </Link>
    </div>
  );
}
