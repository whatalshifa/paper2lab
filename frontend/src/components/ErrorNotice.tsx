import Link from "next/link";

/**
 * What a page shows when it breaks, set like an erratum slip: what happened, a way to try again and a
 * way out. Used by the error boundaries (app/error.tsx, app/(app)/error.tsx and app/global-error.tsx).
 */
export function ErrorNotice({ onRetry, digest }: { onRetry: () => void; digest?: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center sm:py-24" role="alert">
      <p className="eyebrow">Erratum</p>
      <h1 className="mt-2 font-serif text-[2.5rem] leading-tight font-normal italic">Something went wrong</h1>
      <p className="mt-3 text-muted">This page hit an error. Trying again usually fixes it.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={onRetry} className="btn btn-primary">
          Try again
        </button>
        <Link href="/library" className="btn btn-secondary">
          Go to the library
        </Link>
      </div>
      {digest && <p className="mt-8 font-mono text-[0.6875rem] text-muted">Error reference: {digest}</p>}
    </div>
  );
}
