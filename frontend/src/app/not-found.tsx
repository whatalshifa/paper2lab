import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl card p-8 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted">That address doesn&apos;t lead anywhere on Paper2Lab.</p>
      <Link href="/" className="btn btn-primary mt-6">
        Go to the library
      </Link>
    </div>
  );
}
