import type { ReactNode } from "react";

/**
 * An article head, set on the press's column grid: the roman numeral in the margin column, the title in
 * the main column, the standfirst in the side column, with hairline rules between them.
 */
export function ArticleHead({
  numeral,
  id,
  title,
  children,
  tone = "page",
}: {
  numeral: string;
  id: string;
  title: ReactNode;
  children: ReactNode;
  tone?: "page" | "plate";
}) {
  const plate = tone === "plate";
  return (
    <div
      className={`grid gap-y-4 border-t pt-6 lg:grid-cols-[7rem_minmax(0,1fr)_minmax(0,22rem)] lg:pt-8 ${
        plate ? "border-claret-300/60" : "border-rule"
      }`}
    >
      <p
        aria-hidden
        className={`font-serif text-[2.25rem] leading-none italic lg:text-[3.25rem] ${plate ? "text-claret-200" : "text-accent"}`}
      >
        {numeral}.
      </p>
      <h2
        id={id}
        className="font-serif text-[2.25rem] leading-[1.06] font-normal tracking-[-0.02em] text-balance sm:text-[2.875rem] lg:pr-10"
      >
        {title}
      </h2>
      <div
        className={`text-[1.0625rem] leading-relaxed lg:border-l lg:pl-8 ${
          plate ? "text-claret-100 lg:border-claret-300/40" : "text-muted lg:border-line"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
