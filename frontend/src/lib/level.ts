"use client";

import { useSyncExternalStore } from "react";

import type { Level } from "./api";

export const LEVELS: { id: Level; label: string; hint: string }[] = [
  { id: "beginner", label: "New to this", hint: "No jargon, everyday words" },
  { id: "student", label: "Student", hint: "Key terms, briefly explained" },
  { id: "expert", label: "Expert", hint: "Precise, the paper's own terms" },
];

const KEY = "p2l-level";
const listeners = new Set<() => void>();

function read(): Level {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "beginner" || saved === "student" || saved === "expert") return saved;
  } catch {}
  return "student";
}

export function setLevel(level: Level) {
  try {
    localStorage.setItem(KEY, level);
  } catch {}
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changing the level moves this one too.
  const onStorage = (event: StorageEvent) => event.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The reading level the visitor picked last, remembered on this device. "student" until then. */
export function useLevel(): Level {
  return useSyncExternalStore(subscribe, read, () => "student");
}
