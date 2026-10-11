"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import type { Level, Reading } from "@/lib/api";
import { LEVELS } from "@/lib/level";
import { sentences, toSpeech } from "@/lib/speech";

interface Part {
  id: string;
  title: string;
  lines: string[];
}

/** The paper as something to listen to: the summary, then each section, at the chosen level. */
export function listeningParts(reading: Reading, level: Level): Part[] {
  const say = (text: string) => sentences(toSpeech(text, reading.equations));
  return [
    { id: "nutshell", title: "In a nutshell", lines: [reading.title + ".", ...say(reading.summary[level])] },
    ...reading.sections.map((section, i) => ({
      id: section.id,
      title: section.title,
      lines: [`Section ${i + 1}: ${section.title}.`, ...say(section.explanation[level])],
    })),
  ];
}

const SPEEDS = [1, 1.25, 1.5];

function subscribeNothing() {
  return () => {};
}

/**
 * "Listen": reads the explanation aloud with the browser's own voice (free, and nothing leaves
 * the device). A small player shows which section is being read, with pause, skip and speed.
 */
export function Listen({ reading, level }: { reading: Reading; level: Level }) {
  const supported = useSyncExternalStore(
    subscribeNothing,
    () => "speechSynthesis" in window,
    () => false,
  );
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [part, setPart] = useState(0);
  const [speed, setSpeed] = useState(1);
  const position = useRef({ part: 0, line: 0 });
  const session = useRef(0); // bumps on every restart, so callbacks from an old run are ignored
  const parts = listeningParts(reading, level);
  const partsRef = useRef(parts);
  useEffect(() => {
    partsRef.current = parts; // declared first, so it is up to date before the level effect below
  });

  const speak = useCallback(
    (from: { part: number; line: number }, rate: number) => {
      const synth = window.speechSynthesis;
      synth.cancel();
      const run = ++session.current;
      const next = (at: { part: number; line: number }) => {
        if (run !== session.current) return;
        const all = partsRef.current;
        if (at.part >= all.length) {
          setPlaying(false);
          position.current = { part: 0, line: 0 };
          setPart(0);
          return;
        }
        if (at.line >= all[at.part].lines.length) return next({ part: at.part + 1, line: 0 });
        position.current = at;
        setPart(at.part);
        const utterance = new SpeechSynthesisUtterance(all[at.part].lines[at.line]);
        utterance.lang = "en";
        utterance.rate = rate;
        utterance.onend = () => next({ part: at.part, line: at.line + 1 });
        utterance.onerror = (event) => {
          if (event.error !== "interrupted" && event.error !== "canceled") setPlaying(false);
        };
        synth.speak(utterance);
      };
      setPlaying(true);
      next(from);
    },
    [],
  );

  const stop = useCallback(() => {
    session.current++;
    window.speechSynthesis?.cancel();
    setPlaying(false);
  }, []);

  // Stop talking when leaving the page.
  useEffect(() => stop, [stop]);

  // A new level means new words: start the current section again in the new wording.
  const levelRef = useRef(level);
  useEffect(() => {
    if (levelRef.current === level) return;
    levelRef.current = level;
    if (playing) speak({ part: position.current.part, line: 0 }, speed);
  }, [level, playing, speak, speed]);

  if (!supported) return null;

  const levelLabel = LEVELS.find((l) => l.id === level)?.label.toLowerCase();
  const current = parts[part];

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => {
          setOpen(true);
          speak({ part: 0, line: 0 }, speed);
        }}
      >
        Listen
      </button>
    );
  }

  return (
    <div
      role="region"
      aria-label="Listening"
      className="paper-lift fixed bottom-20 left-4 z-30 flex max-w-[calc(100vw-2rem)] items-center gap-1 border border-rule bg-surface py-1.5 pr-2 pl-1.5 sm:bottom-4 sm:left-1/2 sm:-translate-x-1/2 print:hidden"
    >
      <button
        type="button"
        className="icon-btn"
        aria-label="Previous section"
        disabled={part === 0}
        onClick={() => speak({ part: Math.max(part - 1, 0), line: 0 }, speed)}
      >
        <span aria-hidden>Prev</span>
      </button>
      <button
        type="button"
        className="btn btn-primary btn-sm w-16 px-0"
        aria-label={playing ? "Pause" : "Play"}
        onClick={() => (playing ? stop() : speak({ part: position.current.part, line: position.current.line }, speed))}
      >
        <span aria-hidden>{playing ? "Pause" : "Play"}</span>
      </button>
      <button
        type="button"
        className="icon-btn"
        aria-label="Next section"
        disabled={part >= parts.length - 1}
        onClick={() => speak({ part: Math.min(part + 1, parts.length - 1), line: 0 }, speed)}
      >
        <span aria-hidden>Next</span>
      </button>
      <a
        href={`#${current.id}`}
        className="mx-2 min-w-0 flex-1 leading-tight sm:w-56 sm:flex-none"
        aria-live="polite"
      >
        <span className="block truncate font-serif text-[0.9375rem] italic">{current.title}</span>
        <span className="block font-mono text-[0.625rem] text-muted">
          {part + 1} of {parts.length} · {levelLabel} level
        </span>
      </a>
      <button
        type="button"
        className="border border-transparent px-2 py-1 font-mono text-[0.75rem] text-muted hover:border-line hover:text-foreground"
        aria-label={`Speed ${speed} times. Change speed`}
        onClick={() => {
          const faster = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
          setSpeed(faster);
          if (playing) speak({ ...position.current }, faster);
        }}
      >
        {speed}×
      </button>
      <button
        type="button"
        className="icon-btn"
        aria-label="Stop listening"
        onClick={() => {
          stop();
          position.current = { part: 0, line: 0 };
          setPart(0);
          setOpen(false);
        }}
      >
        <span aria-hidden>Stop</span>
      </button>
    </div>
  );
}
