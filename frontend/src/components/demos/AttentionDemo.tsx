"use client";

import { useId, useMemo, useState } from "react";

const WORDS = ["The", "animal", "didn't", "cross", "street"];
const DIMS = [4, 8, 16, 32, 64, 128, 256, 512];
const MAX_DIM = DIMS[DIMS.length - 1];

/** A tiny seeded random number generator (mulberry32), so every reader sees the same vectors. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random vectors with mean 0 and variance 1 per component, the paper's assumption. */
function gaussianVectors(count: number, seed: number) {
  const random = seeded(seed);
  return Array.from({ length: count }, () =>
    Array.from({ length: MAX_DIM }, () => {
      const u = 1 - random(); // avoid log(0)
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
    }),
  );
}

function softmax(scores: number[]) {
  const top = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - top));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

/** One query word attends to five key words. Turn up d_k and switch the √d_k scaling off to see softmax saturate. */
export function AttentionDemo() {
  const id = useId();
  const [dimIndex, setDimIndex] = useState(5);
  const [scaled, setScaled] = useState(true);
  const [query, setQuery] = useState(1);
  const [seed, setSeed] = useState(7);

  const dk = DIMS[dimIndex];
  // Queries and keys are made once per seed at full size; a smaller d_k uses the first components.
  const queries = useMemo(() => gaussianVectors(WORDS.length, seed), [seed]);
  const keys = useMemo(() => gaussianVectors(WORDS.length, seed + 1000), [seed]);

  const { scores, weights } = useMemo(() => {
    const q = queries[query];
    const scores = keys.map((k) => {
      let dot = 0;
      for (let i = 0; i < dk; i++) dot += q[i] * k[i];
      return scaled ? dot / Math.sqrt(dk) : dot;
    });
    return { scores, weights: softmax(scores) };
  }, [queries, keys, query, dk, scaled]);

  const top = weights.indexOf(Math.max(...weights));
  const topWeight = weights[top];
  // How strongly the winning weight still reacts to its score: p(1 − p), at most 0.25.
  const slope = topWeight * (1 - topWeight);
  const percent = (w: number) => (w > 0.999 ? ">99.9" : w < 0.001 ? "<0.1" : (w * 100).toFixed(1));

  let message: string;
  if (topWeight > 0.97) {
    message = `${scaled ? "Even with" : "Without"} scaling, “${WORDS[top]}” takes ${percent(topWeight)}% of the attention: softmax is saturated, so its gradient is tiny and learning almost stops.`;
  } else if (topWeight > 0.8) {
    message = `“${WORDS[top]}” takes ${percent(topWeight)}% of the attention. Softmax is close to saturating, so gradients are getting small.`;
  } else {
    message = `${scaled ? "With" : "Even without"} scaling, attention is spread out (the top word gets ${percent(topWeight)}%), so the gradients are healthy and it can still learn.`;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <label htmlFor={`${id}-dk`} className="font-semibold">
              Key size d<sub>k</sub>
            </label>
            <span className="font-mono text-muted">{dk}</span>
          </div>
          <input
            id={`${id}-dk`}
            type="range"
            min={0}
            max={DIMS.length - 1}
            step={1}
            value={dimIndex}
            onChange={(event) => setDimIndex(Number(event.target.value))}
            aria-valuetext={`d_k = ${dk}`}
            className="level-range mt-2"
          />
        </div>
        <div>
          <label htmlFor={`${id}-query`} className="text-sm font-semibold">
            Query word
          </label>
          <div className="mt-1 flex gap-2">
            <select
              id={`${id}-query`}
              value={query}
              onChange={(event) => setQuery(Number(event.target.value))}
              className="input min-h-10 flex-1 py-1.5 text-sm"
            >
              {WORDS.map((word, i) => (
                <option key={word} value={i}>
                  {word}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn-secondary btn-sm min-h-10" onClick={() => setSeed((s) => s + 1)}>
              Shuffle
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <input
          id={`${id}-scaled`}
          type="checkbox"
          checked={scaled}
          onChange={(event) => setScaled(event.target.checked)}
          className="h-4 w-4 accent-indigo-700 dark:accent-indigo-300"
        />
        <label htmlFor={`${id}-scaled`} className="font-semibold">
          Divide by √d<sub>k</sub>
        </label>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted">
          How much “{WORDS[query]}” attends to each word
        </p>
        <ul className="mt-2 space-y-2">
          {WORDS.map((word, i) => (
            <li key={word} className="grid grid-cols-[4.5rem_1fr_3.75rem] items-center gap-2 text-sm">
              <span className={i === top ? "font-semibold" : undefined}>{word}</span>
              <span className="h-3 overflow-hidden rounded-full bg-sunken" aria-hidden>
                <span
                  className="block h-full rounded-full bg-accent transition-[width] duration-300"
                  style={{ width: `${Math.max(weights[i] * 100, 0.5)}%` }}
                />
              </span>
              <span className="text-right font-mono tabular-nums">{percent(weights[i])}%</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">
          Scores {scaled ? "q·k/√d_k" : "q·k"}:{" "}
          <span className="font-mono">{scores.map((s) => s.toFixed(1)).join(", ")}</span> · softmax slope at the top word{" "}
          <span className="font-mono">{slope.toFixed(3)}</span> (max 0.250)
        </p>
      </div>

      <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm leading-relaxed" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
