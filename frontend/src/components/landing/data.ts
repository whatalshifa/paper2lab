"use client";

import { createContext, useContext, useEffect, useState } from "react";

import { type AccuracyReport, api, type PaperDetail, type SiteConfig } from "@/lib/api";
import { SAMPLE_IDS } from "@/lib/site";

export const [ATTENTION_ID, ADAM_ID] = SAMPLE_IDS;

/**
 * What the server already fetched when it built the page (see lib/server-api.ts), by request key. A
 * section whose data is here draws straight away, in the page's HTML, even while the API sleeps.
 */
const Prefetched = createContext<Record<string, unknown>>({});
export const PrefetchedData = Prefetched.Provider;

// Several sections of the home page show the same sample papers, so each request is made once.
const requests = new Map<string, Promise<unknown>>();

function once<T>(key: string, load: () => Promise<T>): Promise<T> {
  let request = requests.get(key) as Promise<T> | undefined;
  if (!request) {
    request = load();
    // A failed request is forgotten, so the next visit to the page tries again.
    request.catch(() => requests.delete(key));
    requests.set(key, request);
  }
  return request;
}

type State<T> = { data: T | null; failed: boolean };

function useOnce<T>(key: string, load: () => Promise<T>): State<T> {
  const prefetched = (useContext(Prefetched)[key] as T | undefined) ?? null;
  const [state, setState] = useState<State<T>>({ data: prefetched, failed: false });
  useEffect(() => {
    if (prefetched) return;
    let live = true;
    once(key, load).then(
      (data) => live && setState({ data, failed: false }),
      () => live && setState({ data: null, failed: true }),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `load` is a fresh arrow each render; the key names the request
  }, [key]);
  return state;
}

/** A sample paper, with its whole explanation, straight from the API. */
export function useSample(id: string) {
  return useOnce<PaperDetail>(`paper:${id}`, () => api.paper(id));
}

/** The public accuracy numbers (the same ones /accuracy shows). */
export function useAccuracy() {
  return useOnce<AccuracyReport>("accuracy", () => api.accuracy());
}

/** What this site can do right now (in the demo, the AI is off and adding papers is paused). */
export function useConfig() {
  return useOnce<SiteConfig>("config", () => api.config());
}
