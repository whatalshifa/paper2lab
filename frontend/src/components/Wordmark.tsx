/**
 * The Paper2Lab wordmark: pure type, no mark. "Paper" in roman, the 2 as a true superscript in claret
 * (the paper squared: read once, then read again at your level), "Lab" in italic. Set in Newsreader.
 *
 * `masthead` is the large centred title of the home page, `running` the one-line running head of the app,
 * `colophon` the size it is set at in the footer.
 */
type Size = "masthead" | "running" | "colophon";

const SIZES: Record<Size, string> = {
  masthead: "text-[2.375rem] sm:text-[3.25rem] lg:text-[3.75rem]",
  running: "text-[1.375rem]",
  colophon: "text-[2rem]",
};

export function Wordmark({ size = "running" }: { size?: Size }) {
  return (
    <span
      className={`inline-block font-serif leading-none font-medium whitespace-nowrap tracking-[-0.02em] [font-variation-settings:'opsz'_72] ${SIZES[size]}`}
    >
      Paper
      <span className="relative -top-[0.72em] mx-[0.03em] align-baseline text-[0.48em] font-semibold text-accent">2</span>
      <span className="italic">Lab</span>
    </span>
  );
}

/** The monogram, "P²", for places too small for the whole name: the favicon and the corner of a sample. */
export function Monogram({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`inline-block font-serif leading-none font-medium whitespace-nowrap ${className}`}>
      P<span className="relative -top-[0.7em] ml-[0.04em] align-baseline text-[0.55em] font-semibold text-accent">2</span>
    </span>
  );
}
