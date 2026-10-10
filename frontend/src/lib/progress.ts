"use client";

import { useSyncExternalStore } from "react";

/** How far down each paper this browser has read (0 to 1, the furthest point), for the library list. */
const key = (id: string) => `p2l-read:${id}`;

export function saveProgress(id: string, progress: number) {
  try {
    const before = Number(localStorage.getItem(key(id)) ?? 0);
    if (progress > before + 0.01) localStorage.setItem(key(id), progress.toFixed(2));
  } catch {}
}

function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  return () => window.removeEventListener("storage", listener);
}

export function useProgress(id: string): number {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return Number(localStorage.getItem(key(id)) ?? 0) || 0;
      } catch {
        return 0;
      }
    },
    () => 0,
  );
}
