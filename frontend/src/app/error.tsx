"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center sm:py-24" role="alert">
      <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-3 text-muted">This page hit an error. Trying again usually fixes it.</p>
      <button type="button" onClick={reset} className="btn btn-primary mt-8">
        Try again
      </button>
    </div>
  );
}
