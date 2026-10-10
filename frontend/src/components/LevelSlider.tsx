"use client";

import { useId } from "react";

import type { Level } from "@/lib/api";
import { LEVELS, setLevel } from "@/lib/level";

/**
 * The reading-level slider, the reader's main control: a hairline track with a stop at each level
 * and a claret marker, with the levels named underneath.
 * Three stops, remembered on this device. Arrow keys work too.
 * `compact` is the one-line version for a toolbar: the label, the track and the level's name.
 */
export function LevelSlider({ level, compact = false }: { level: Level; compact?: boolean }) {
  const id = useId();
  const index = LEVELS.findIndex((l) => l.id === level);
  const current = LEVELS[index];
  const share = (index / (LEVELS.length - 1)) * 100;
  const track = (
    <div className="relative">
      {/* The track: a hairline, a claret stretch up to the marker, and a tick at each level. */}
      <div className="pointer-events-none absolute inset-x-[9px] top-1/2 h-[3px] -translate-y-1/2 rounded-full" aria-hidden>
        <div className="absolute inset-0 rounded-full bg-line" />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-claret-700 dark:bg-claret-300"
          style={{ width: `${share}%` }}
        />
        {LEVELS.map((l, i) => (
          <span
            key={l.id}
            className={`absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
              i <= index ? "bg-claret-700 dark:bg-claret-300" : "bg-line"
            }`}
            style={{ left: `${(i / (LEVELS.length - 1)) * 100}%` }}
          />
        ))}
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={LEVELS.length - 1}
        step={1}
        value={index}
        onChange={(event) => setLevel(LEVELS[Number(event.target.value)].id)}
        aria-valuetext={`${current.label}: ${current.hint}`}
        className="level-range relative"
      />
    </div>
  );
  if (compact) {
    return (
      <div className="flex w-full items-center gap-3">
        <label htmlFor={id} className="shrink-0 text-[0.8125rem] font-semibold">
          Reading level
        </label>
        <div className="min-w-[6rem] flex-1">{track}</div>
        <span className="w-[5.5rem] shrink-0 text-right text-[0.8125rem] font-medium text-accent" title={current.hint} aria-hidden>
          {current.label}
        </span>
      </div>
    );
  }
  return (
    <div className="flex w-full flex-col gap-1 sm:flex-row sm:items-center sm:gap-8">
      <div className="flex shrink-0 items-baseline justify-between gap-3 sm:block sm:w-44">
        <label htmlFor={id} className="block text-[0.8125rem] font-semibold">
          Reading level
        </label>
        <p className="text-[0.8125rem] text-muted sm:mt-0.5" aria-live="polite">
          {current.hint}
        </p>
      </div>
      <div className="flex-1">
        {track}
        <div className="grid grid-cols-3 text-[0.8125rem]" aria-hidden>
          {LEVELS.map((l, i) => (
            <button
              key={l.id}
              type="button"
              tabIndex={-1}
              onClick={() => setLevel(l.id)}
              className={`${i === 0 ? "text-left" : i === LEVELS.length - 1 ? "text-right" : "text-center"} ${
                l.id === level ? "font-semibold text-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
