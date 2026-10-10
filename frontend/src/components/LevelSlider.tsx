"use client";

import type { Level } from "@/lib/api";
import { LEVELS, setLevel } from "@/lib/level";

/**
 * The reading-level slider, the reader's main control. It's drawn like a ruler: a hairline with a
 * tick at each level and a claret marker, with the levels named underneath in the reading serif.
 * Three stops, remembered on this device. Arrow keys work too.
 */
export function LevelSlider({ level }: { level: Level }) {
  const index = LEVELS.findIndex((l) => l.id === level);
  const current = LEVELS[index];
  const share = (index / (LEVELS.length - 1)) * 100;
  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
      <div className="shrink-0 sm:w-36">
        <label htmlFor="level" className="eyebrow block leading-none">
          Reading level
        </label>
        <p className="mt-1 hidden font-serif text-sm text-muted italic sm:block" aria-live="polite">
          {current.hint}
        </p>
      </div>
      <div className="flex-1">
        <div className="relative">
          {/* The ruler: a hairline, a claret stretch up to the marker, and a tick at each level. */}
          <div className="pointer-events-none absolute inset-x-[7px] top-1/2 h-[3px] -translate-y-1/2" aria-hidden>
            <div className="absolute inset-0 bg-line" />
            <div
              className="absolute inset-y-0 left-0 bg-claret-700 dark:bg-claret-300"
              style={{ width: `${share}%` }}
            />
            {LEVELS.map((l, i) => (
              <span
                key={l.id}
                className={`absolute top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 ${
                  i <= index ? "bg-claret-700 dark:bg-claret-300" : "bg-muted"
                }`}
                style={{ left: `${(i / (LEVELS.length - 1)) * 100}%` }}
              />
            ))}
          </div>
          <input
            id="level"
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
        <div className="grid grid-cols-3 font-serif" aria-hidden>
          {LEVELS.map((l, i) => (
            <button
              key={l.id}
              type="button"
              tabIndex={-1}
              onClick={() => setLevel(l.id)}
              className={`text-[1.02rem] ${i === 0 ? "text-left" : i === LEVELS.length - 1 ? "text-right" : "text-center"} ${
                l.id === level ? "font-semibold text-accent" : "text-muted hover:text-foreground"
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
