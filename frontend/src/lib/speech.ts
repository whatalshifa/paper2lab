/** Turning an explanation into words a speech voice can say. */

import type { Equation } from "./api";

const SPOKEN: [RegExp, string][] = [
  [/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "$1 over $2"],
  [/\\sqrt\{([^{}]*)\}/g, "the square root of $1"],
  [/\\(?:hat|bar|tilde)\{?([A-Za-z])\}?/g, "$1"],
  [/\\(alpha|beta|gamma|delta|epsilon|theta|lambda|mu|sigma|pi|eta)\b/g, "$1"],
  [/\\(cdot|times)/g, " times "],
  [/\\approx/g, " about "],
  [/\\(leq|le)\b/g, " at most "],
  [/\\(geq|ge)\b/g, " at least "],
  [/\^\{?T\}?/g, " transposed"],
  [/\^\{?2\}?/g, " squared"],
  [/_\{?([A-Za-z0-9]+)\}?/g, " $1"],
  [/\^\{?([A-Za-z0-9-]+)\}?/g, " to the $1"],
  [/\\[a-zA-Z]+/g, " "],
  [/[{}\\]/g, ""],
  [/=/g, " equals "],
  [/\+/g, " plus "],
];

/** Says simple maths in words ("d_k" becomes "d k", "\sqrt{d_k}" "the square root of d k"). */
export function sayMaths(latex: string): string {
  let text = latex;
  for (const [pattern, words] of SPOKEN) text = text.replace(pattern, words);
  return text.replace(/\s+/g, " ").trim();
}

/** An explanation as plain speech: maths in words, equation marks named, bold marks dropped. */
export function toSpeech(text: string, equations: Equation[]): string {
  return text
    .replace(/\$([^$\n]+)\$/g, (_, latex: string) => sayMaths(latex))
    .replace(/\[(e\d+)\]/g, (_, id: string) => {
      const index = equations.findIndex((e) => e.id === id);
      return index < 0 ? "" : `(equation ${equations[index].number?.replace(/[()]/g, "") ?? index + 1})`;
    })
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Splits text into sentences. Some browsers stop reading long passages part-way, so each sentence
 * is spoken on its own. */
export function sentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) ?? []).map((s) => s.trim()).filter(Boolean);
}
