"use client";

import type { Level } from "@/lib/api";
import { LEVELS, setLevel } from "@/lib/level";

/** The reading-level slider: three stops, remembered on this device. Arrow keys work too. */
export function LevelSlider({ level }: { level: Level }) {
  const index = LEVELS.findIndex((l) => l.id === level);
  const current = LEVELS[index];
  return (
    <div className="flex w-full flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
      <label htmlFor="level" className="shrink-0 text-sm font-semibold">
        Reading level
      </label>
      <div className="flex-1">
        <input
          id="level"
          type="range"
          min={0}
          max={LEVELS.length - 1}
          step={1}
          value={index}
          onChange={(event) => setLevel(LEVELS[Number(event.target.value)].id)}
          aria-valuetext={`${current.label}: ${current.hint}`}
          className="level-range"
          style={{
            background: `linear-gradient(to right, var(--accent) ${(index / (LEVELS.length - 1)) * 100}%, var(--sunken) 0)`,
          }}
        />
        <div className="mt-1 grid grid-cols-3 text-xs" aria-hidden>
          {LEVELS.map((l, i) => (
            <button
              key={l.id}
              type="button"
              tabIndex={-1}
              onClick={() => setLevel(l.id)}
              className={`${i === 0 ? "text-left" : i === LEVELS.length - 1 ? "text-right" : "text-center"} ${
                l.id === level ? "font-semibold text-accent" : "text-muted hover:text-foreground"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <p className="hidden w-48 shrink-0 text-xs text-muted lg:block" aria-live="polite">
        {current.hint}
      </p>
    </div>
  );
}
