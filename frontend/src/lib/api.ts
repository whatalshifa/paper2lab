/** Types for what the API sends, and small helpers to call it. Every call goes to /api/* on this
 * same website, which Next forwards to the FastAPI backend (see next.config.ts). */

export type Level = "beginner" | "student" | "expert";
export type Leveled = Record<Level, string>;

export interface Quote {
  page: number;
  text: string;
  verified: boolean;
}

export interface Section {
  id: string;
  title: string;
  page: number;
  explanation: Leveled;
  quotes: Quote[];
}

export interface Symbol {
  latex: string;
  meaning: string;
}

export interface Equation {
  id: string;
  number: string | null;
  name: string;
  latex: string;
  in_words: Leveled;
  symbols: Symbol[];
  section_id: string | null;
  page: number;
}

export interface Concept {
  term: string;
  meaning: string;
}

export interface Reading {
  title: string;
  authors: string[];
  year: number | null;
  field: string;
  summary: Leveled;
  contributions: string[];
  prerequisites: string[];
  sections: Section[];
  equations: Equation[];
  concepts: Concept[];
  has_text_layer: boolean;
}

export type Status = "queued" | "reading" | "ready" | "failed";

export interface PaperSummary {
  id: string;
  title: string | null;
  authors: string[] | null;
  year: number | null;
  field: string | null;
  status: Status;
  error: string | null;
  source: "upload" | "arxiv" | "sample";
  arxiv_id: string | null;
  filename: string | null;
  page_count: number | null;
  is_sample: boolean;
  created_at: string;
}

export interface PaperDetail extends PaperSummary {
  reading: Reading | null;
  pdf_url: string | null;
}

export interface SiteConfig {
  ai_enabled: boolean;
  max_upload_mb: number;
  max_pages: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, cache: "no-store" });
  } catch {
    throw new ApiError("Couldn't reach Paper2Lab. Check your connection and try again.", 0);
  }
  if (!response.ok) {
    let message = "Something went wrong. Please try again.";
    try {
      const body = await response.json();
      if (typeof body.detail === "string") message = body.detail;
    } catch {}
    if (response.status >= 502 && response.status <= 504) {
      message = "The server is waking up. Please try again in a few seconds.";
    }
    throw new ApiError(message, response.status);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export const api = {
  config: () => call<SiteConfig>("/api/config"),
  papers: () => call<{ samples: PaperSummary[]; mine: PaperSummary[] }>("/api/papers"),
  paper: (id: string) => call<PaperDetail>(`/api/papers/${encodeURIComponent(id)}`),
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return call<PaperSummary>("/api/papers", { method: "POST", body: form });
  },
  addArxiv: (link: string) =>
    call<PaperSummary>("/api/papers/arxiv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ link }),
    }),
  retry: (id: string) => call<PaperSummary>(`/api/papers/${encodeURIComponent(id)}/retry`, { method: "POST" }),
  remove: (id: string) => call<void>(`/api/papers/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
