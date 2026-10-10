import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center sm:py-24">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 text-[1.75rem] leading-tight font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 text-muted">That address doesn&apos;t lead anywhere on Paper2Lab.</p>
      <Link href="/" className="btn btn-primary mt-8">
        Go to the library
      </Link>
    </div>
  );
}
