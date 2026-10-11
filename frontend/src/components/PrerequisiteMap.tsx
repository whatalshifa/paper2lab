"use client";


import type { Prerequisite } from "@/lib/api";

import { Hovercard } from "./Hovercard";

/** Papers read before the map existed only have topic names; give them the map's shape. */
export function asPrerequisites(items: (string | Prerequisite)[]): Prerequisite[] {
  return items.map((item, i) =>
    typeof item === "string" ? { id: `p${i + 1}`, topic: item, primer: "", why: "", builds_on: [] } : item,
  );
}

/** Groups ideas into steps: an idea goes one step below the deepest idea it builds on. */
export function layers(items: Prerequisite[]): Prerequisite[][] {
  const depth = new Map<string, number>();
  for (const item of items) {
    // The server only lets an idea build on ideas listed before it, so one pass is enough.
    const below = item.builds_on.map((id) => depth.get(id)).filter((d): d is number => d !== undefined);
    depth.set(item.id, below.length ? Math.max(...below) + 1 : 0);
  }
  const steps: Prerequisite[][] = [];
  for (const item of items) (steps[depth.get(item.id)!] ??= []).push(item);
  return steps.filter(Boolean);
}

function Primer({ item, names }: { item: Prerequisite; names: Map<string, string> }) {
  const after = item.builds_on.map((id) => names.get(id)).filter(Boolean);
  return (
    <div className="space-y-2">
      <p className="font-serif text-[1.0625rem] font-medium">{item.topic}</p>
      <p className="leading-relaxed">{item.primer}</p>
      {item.why && (
        <p className="border-l-2 border-accent bg-accent-soft px-3 py-2 text-[0.9375rem] leading-relaxed">
          <span className="font-medium text-accent italic">In this paper: </span>
          {item.why}
        </p>
      )}
      {after.length > 0 && <p className="font-mono text-[0.6875rem] text-muted">Builds on {after.join(" and ")}.</p>}
    </div>
  );
}

/**
 * "Before you read": what helps to know first, as steps from the most basic idea down to the
 * paper itself. Each idea opens a short primer on hover or tap.
 */
export function PrerequisiteMap({ items }: { items: (string | Prerequisite)[] }) {
  const prerequisites = asPrerequisites(items);
  const hasPrimers = prerequisites.some((p) => p.primer);
  const names = new Map(prerequisites.map((p) => [p.id, p.topic]));

  if (!hasPrimers) {
    return (
      <section className="card p-5 sm:p-6" aria-labelledby="before-you-read-title" id="before-you-read">
        <h2 id="before-you-read-title" className="eyebrow">
          Helps to know
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {prerequisites.map((item) => (
            <li key={item.id} className="border border-line px-2.5 py-1 font-serif text-[1rem] italic">
              {item.topic}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const steps = layers(prerequisites);
  return (
    <section
      id="before-you-read"
      className="card scroll-mt-32 p-5 sm:p-6"
      aria-labelledby="before-you-read-title"
    >
      <h2 id="before-you-read-title" className="font-serif text-[1.5rem] font-normal italic">
        Before you read
      </h2>
      <p className="mt-1 text-[0.9375rem] text-muted">
        New to the field? Start at the top. Each step builds on the one above it. Hover or tap an idea for a
        quick primer.
      </p>
      <ol className="mt-5">
        {steps.map((step, i) => (
          <li key={i} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3">
            <div className="flex flex-col items-center">
              <span className="flex h-7 w-7 items-center justify-center font-serif text-[1rem] text-accent italic">
                {["i", "ii", "iii", "iv", "v", "vi", "vii", "viii"][i] ?? i + 1}.
              </span>
              <span className="w-px flex-1 bg-line" aria-hidden />
            </div>
            <ul className="flex flex-wrap gap-2 pt-0.5 pb-5" aria-label={`Step ${i + 1}`}>
              {step.map((item) => (
                <li key={item.id}>
                  <Hovercard
                    label={`${item.topic}: a quick primer`}
                    triggerClassName="border border-line bg-surface px-3 py-1.5 font-serif text-[1rem] transition-colors hover:border-rule hover:bg-accent-soft aria-expanded:border-rule aria-expanded:bg-accent-soft"
                    trigger={item.topic}
                  >
                    <Primer item={item} names={names} />
                  </Hovercard>
                </li>
              ))}
            </ul>
          </li>
        ))}
        <li className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3">
          <span className="flex h-7 w-7 items-center justify-center font-serif text-[1.125rem] text-accent" aria-hidden>
            ¶
          </span>
          <p className="pt-1 font-serif text-[1rem] font-medium italic">Then this paper</p>
        </li>
      </ol>
    </section>
  );
}
