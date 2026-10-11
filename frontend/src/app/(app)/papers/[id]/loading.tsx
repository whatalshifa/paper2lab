/** Shown at once when a paper is opened, while its page comes from the server; the page then loads the paper itself. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-[42rem] space-y-4 px-4 py-10 sm:px-8 lg:py-14" role="status" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-4 w-24" />
      <div className="skeleton h-10 w-4/5" />
      <div className="skeleton h-4 w-1/2" />
      <div className="skeleton mt-8 h-40 w-full" />
    </div>
  );
}
