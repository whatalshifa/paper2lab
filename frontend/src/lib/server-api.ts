import type { AccuracyReport, PaperDetail, SiteConfig } from "./api";
import { SAMPLE_IDS } from "./site";

/** How often the server asks the API again for public data, such as the sample papers. */
export const PUBLIC_DATA_SECONDS = 600;

/**
 * Reads public data from the API on the server, for pages that are built ahead of time. The API's free
 * server sleeps when idle, so a slow or failed answer gives null rather than holding the page up: the
 * page then loads that part in the browser instead, as before.
 */
async function fromApi<T>(path: string): Promise<T | null> {
  const base = process.env.API_URL ?? "http://localhost:8000";
  const secret = process.env.API_PROXY_SECRET;
  try {
    const response = await fetch(`${base}${path}`, {
      headers: secret ? { "x-p2l-proxy": secret } : undefined,
      next: { revalidate: PUBLIC_DATA_SECONDS },
      signal: AbortSignal.timeout(8000),
    });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

/** What the home page shows: the sample papers, the accuracy numbers and the site's settings. Each
 * entry is keyed the way the home page's components ask for it (see components/landing/data.ts). */
export async function landingData(): Promise<Record<string, unknown>> {
  const [samples, accuracy, config] = await Promise.all([
    Promise.all(SAMPLE_IDS.map((id) => fromApi<PaperDetail>(`/api/papers/${id}`))),
    fromApi<AccuracyReport>("/api/accuracy"),
    fromApi<SiteConfig>("/api/config"),
  ]);
  const entries: [string, unknown][] = [
    ...SAMPLE_IDS.map((id, i): [string, unknown] => [`paper:${id}`, samples[i]]),
    ["accuracy", accuracy],
    ["config", config],
  ];
  return Object.fromEntries(entries.filter(([, value]) => value !== null));
}
