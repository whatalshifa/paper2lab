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
      <p className="font-semibold">{item.topic}</p>
      <p className="leading-relaxed">{item.primer}</p>
      {item.why && (
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-[0.8rem] leading-relaxed">
          <span className="font-semibold text-accent">In this paper: </span>
          {item.why}
        </p>
      )}
      {after.length > 0 && <p className="text-xs text-muted">Builds on {after.join(" and ")}.</p>}
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
      <section className="card p-5" aria-labelledby="before-you-read-title" id="before-you-read">
        <h2 id="before-you-read-title" className="text-sm font-semibold">
          Helps to know
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {prerequisites.map((item) => (
            <li key={item.id} className="badge bg-sunken py-1 font-medium text-foreground">
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
      <h2 id="before-you-read-title" className="text-lg font-semibold tracking-tight">
        Before you read
      </h2>
      <p className="mt-1 text-sm text-muted">
        New to the field? Start at the top. Each step builds on the one above it. Hover or tap an idea for a
        quick primer.
      </p>
      <ol className="mt-5">
        {steps.map((step, i) => (
          <li key={i} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3">
            <div className="flex flex-col items-center">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface text-xs font-semibold text-muted tabular-nums">
                {i + 1}
              </span>
              <span className="w-px flex-1 bg-line" aria-hidden />
            </div>
            <ul className="flex flex-wrap gap-2 pt-0.5 pb-5" aria-label={`Step ${i + 1}`}>
              {step.map((item) => (
                <li key={item.id}>
                  <Hovercard
                    label={`${item.topic}: a quick primer`}
                    triggerClassName="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:border-indigo-300 hover:bg-accent-soft aria-expanded:border-indigo-400 aria-expanded:bg-accent-soft dark:hover:border-indigo-800"
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
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-700 text-white" aria-hidden>
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
              <path d="M5 3.5h7l3 3v10H5Zm2 5v1.5h6V8.5Zm0 3v1.5h6v-1.5Z" />
            </svg>
          </span>
          <p className="pt-1 text-sm font-semibold">Then this paper</p>
        </li>
      </ol>
    </section>
  );
}
