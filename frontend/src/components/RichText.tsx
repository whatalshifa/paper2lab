"use client";

import { createContext, type ReactNode, useContext } from "react";

import type { Concept, Equation, Level } from "@/lib/api";

import { EquationChip, equationLabel } from "./Equations";
import { Hovercard } from "./Hovercard";
import { Tex } from "./Tex";

/** What explanations need from the paper around them: its equations, glossary and the chosen level. */
export const ReadingContext = createContext<{ equations: Equation[]; concepts: Concept[]; level: Level }>({
  equations: [],
  concepts: [],
  level: "student",
});

// Inline maths ($...$), equation references ([e3]) and bold (**...**), in the order they appear.
const TOKENS = /(\$[^$\n]+\$|\[e\d+\]|\*\*[^*\n]+\*\*)/g;

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Term({ concept, children }: { concept: Concept; children: ReactNode }) {
  return (
    <Hovercard
      label={`${concept.term}: definition`}
      triggerClassName="cursor-help font-[inherit] underline decoration-claret-400/70 decoration-dotted decoration-2 underline-offset-4 hover:decoration-claret-500"
      trigger={children}
    >
      <p className="font-semibold">{concept.term}</p>
      <p className="mt-1 leading-relaxed text-muted">{concept.meaning}</p>
    </Hovercard>
  );
}

/**
 * Turns an explanation's text into paragraphs with drawn maths, equation chips, bold phrases and
 * glossary terms (only the first time each term appears in a block, so the text stays calm).
 * With `inline`, it stays plain (no chips or terms): used inside the hover cards themselves.
 */
export function RichText({ text, inline = false }: { text: string; inline?: boolean }) {
  const { equations, concepts, level } = useContext(ReadingContext);
  const used = new Set<string>();
  const termPattern =
    !inline && concepts.length
      ? new RegExp(
          `\\b(${[...concepts]
            .map((c) => c.term)
            .sort((a, b) => b.length - a.length)
            .map(escapeRegExp)
            .join("|")})\\b`,
          "gi",
        )
      : null;

  function withTerms(plain: string, key: string): ReactNode[] {
    if (!termPattern) return [plain];
    const out: ReactNode[] = [];
    let last = 0;
    for (const match of plain.matchAll(termPattern)) {
      const concept = concepts.find((c) => c.term.toLowerCase() === match[0].toLowerCase());
      if (!concept || used.has(concept.term.toLowerCase())) continue;
      used.add(concept.term.toLowerCase());
      out.push(plain.slice(last, match.index));
      out.push(
        <Term key={`${key}-${match.index}`} concept={concept}>
          {match[0]}
        </Term>,
      );
      last = match.index + match[0].length;
    }
    out.push(plain.slice(last));
    return out;
  }

  function renderParagraph(paragraph: string, p: number): ReactNode[] {
    return paragraph.split(TOKENS).flatMap((part, i): ReactNode[] => {
      const key = `${p}-${i}`;
      if (!part) return [];
      if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
        return [<Tex key={key} latex={part.slice(1, -1)} />];
      }
      const ref = /^\[(e\d+)\]$/.exec(part);
      if (ref) {
        const index = equations.findIndex((e) => e.id === ref[1]);
        if (index < 0) return [];
        if (inline) return [equationLabel(equations[index], index)];
        return [<EquationChip key={key} equation={equations[index]} index={index} level={level} />];
      }
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        return [<strong key={key}>{withTerms(part.slice(2, -2), key)}</strong>];
      }
      return withTerms(part, key);
    });
  }

  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim());
  if (inline) return <>{paragraphs.map((p, i) => <span key={i}>{renderParagraph(p, i)} </span>)}</>;
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i}>{renderParagraph(p, i)}</p>
      ))}
    </>
  );
}
