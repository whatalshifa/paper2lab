import katex from "katex";
import { useMemo } from "react";

/**
 * Draws LaTeX with KaTeX. The LaTeX comes from the AI reading a PDF, so it is untrusted:
 * KaTeX escapes all text, and with trust off it refuses \href, \url and raw HTML. maxExpand
 * stops a macro loop from freezing the page. A formula KaTeX can't draw shows as red source
 * text instead of breaking the page.
 */
export function Tex({ latex, display = false, className }: { latex: string; display?: boolean; className?: string }) {
  const html = useMemo(
    () =>
      katex.renderToString(latex, {
        displayMode: display,
        throwOnError: false,
        trust: false,
        strict: "ignore",
        maxExpand: 300,
        maxSize: 20,
        output: "htmlAndMathml",
      }),
    [latex, display],
  );
  // Always a span (block-level when displayed), so formulas can sit inside buttons.
  return (
    <span
      className={display ? `block ${className ?? ""}` : className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
