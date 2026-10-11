/** Types for what the API sends, and small helpers to call it. Every call goes to /api/* on this
 * same website, which Next forwards to the FastAPI backend (see next.config.ts). */

export type Level = "beginner" | "student" | "expert";
export type Leveled = Record<Level, string>;

export interface Quote {
  page: number;
  text: string;
  verified: boolean;
}

/** A check-yourself question. quote points into its section's quotes, or is null when the
 * answer comes from the section's explanation rather than one quote. */
export interface QuizQuestion {
  id: string;
  question: string;
  choices: string[];
  answer: number;
  why: string;
  quote: number | null;
}

export interface Section {
  id: string;
  title: string;
  page: number;
  explanation: Leveled;
  quotes: Quote[];
  quiz?: Record<Level, QuizQuestion[]>;
}

export interface EquationSymbol {
  latex: string;
  meaning: string;
}

export interface Equation {
  id: string;
  number: string | null;
  name: string;
  latex: string;
  in_words: Leveled;
  symbols: EquationSymbol[];
  section_id: string | null;
  page: number;
  /** A hands-on demo drawn under the equation (see components/demos). */
  demo?: string;
}

export interface Concept {
  term: string;
  meaning: string;
}

export interface Figure {
  id: string;
  label: string;
  kind: "figure" | "table";
  page: number;
  caption: string;
  caption_verified: boolean;
  top: number;
  bottom: number;
  explanation: Leveled;
  how_to_read: string;
  takeaway: string;
  section_id: string | null;
}

export interface Prerequisite {
  id: string;
  topic: string;
  primer: string;
  why: string;
  builds_on: string[];
}

export interface Citation {
  quote: string;
  start_page: number;
  end_page: number;
  verified?: boolean;
}

export interface AnswerPart {
  text: string;
  citations: Citation[];
}

export interface PreparedAnswer {
  question: string;
  parts: AnswerPart[];
}

export interface Question {
  id: string;
  paper_id: string;
  text: string;
  level: Level;
  status: "queued" | "answering" | "ready" | "failed";
  error: string | null;
  answer: { parts: AnswerPart[] } | null;
  created_at: string;
}

export interface Reading {
  title: string;
  authors: string[];
  year: number | null;
  field: string;
  summary: Leveled;
  contributions: string[];
  /** Plain strings in papers read before the prerequisite map existed. */
  prerequisites: (string | Prerequisite)[];
  sections: Section[];
  equations: Equation[];
  figures?: Figure[];
  concepts: Concept[];
  has_text_layer: boolean;
  suggested_questions?: string[];
  prepared_answers?: PreparedAnswer[];
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

export interface SampleAccuracy {
  id: string;
  title: string;
  quotes: number;
  quotes_found: number;
  captions: number;
  captions_found: number;
}

export interface AccuracyReport {
  papers: number;
  scanned_papers: number;
  quotes: number;
  quotes_found: number;
  captions: number;
  captions_found: number;
  samples: SampleAccuracy[];
  updated_at: string;
}

export interface Reference {
  title: string;
  year: number | null;
  authors: string[];
  more_authors: boolean;
  url: string | null;
  tldr: string | null;
  context: string | null;
  influential: boolean;
  citations: number;
}

export interface HubItem {
  id: string;
  url: string;
  downloads: number;
}

export interface Connections {
  references: { items: Reference[]; total: number } | null;
  code: { url: string; label: string }[];
  models: HubItem[];
  datasets: HubItem[];
  complete: boolean;
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
    if (isWaking(response.status)) {
      message = "The server is still waking up. Please try again in a few seconds.";
    }
    throw new ApiError(message, response.status);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

/** The API's free server sleeps when idle and takes about 50 seconds to wake. Until it does, the
 * website's forward to it fails with a gateway error (or the request doesn't get through at all). */
function isWaking(status: number) {
  return status === 0 || (status >= 502 && status <= 504);
}

/** How long a page keeps trying while the server wakes, before it shows "try again". */
const WAKE_WAIT_MS = 75_000;

/**
 * Reads that a page needs to show anything: tried again, with growing pauses, while the server is
 * waking, so a visitor sees "waking up" (see useSlow) and then the page, not an error. Writes are
 * never repeated, and other errors (a 404, a refusal) come back at once.
 */
async function patiently<T>(path: string): Promise<T> {
  const deadline = Date.now() + WAKE_WAIT_MS;
  for (let pause = 1500; ; pause = Math.min(pause * 2, 10_000)) {
    try {
      return await call<T>(path);
    } catch (err) {
      if (!(err instanceof ApiError) || !isWaking(err.status) || Date.now() + pause > deadline) throw err;
      await new Promise((resolve) => setTimeout(resolve, pause));
    }
  }
}

export const api = {
  config: () => patiently<SiteConfig>("/api/config"),
  papers: () => patiently<{ samples: PaperSummary[]; mine: PaperSummary[] }>("/api/papers"),
  paper: (id: string) => patiently<PaperDetail>(`/api/papers/${encodeURIComponent(id)}`),
  /** The paper's latest state, asked for once: for checking every few seconds while it's being read. */
  paperNow: (id: string) => call<PaperDetail>(`/api/papers/${encodeURIComponent(id)}`),
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
  questions: (paperId: string) => call<Question[]>(`/api/papers/${encodeURIComponent(paperId)}/questions`),
  ask: (paperId: string, text: string, level: Level) =>
    call<Question>(`/api/papers/${encodeURIComponent(paperId)}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, level }),
    }),
  question: (id: string) => call<Question>(`/api/questions/${encodeURIComponent(id)}`),
  figureUrl: (paperId: string, figureId: string) =>
    `/api/papers/${encodeURIComponent(paperId)}/figures/${encodeURIComponent(figureId)}.png`,
  /** A sample paper's figure, shipped with the website (see public/figures/README.md). */
  sampleFigureUrl: (paperId: string, figureId: string) =>
    `/figures/${encodeURIComponent(paperId)}/${encodeURIComponent(figureId)}.png`,
  connections: (paperId: string) => call<Connections>(`/api/papers/${encodeURIComponent(paperId)}/connections`),
  accuracy: () => patiently<AccuracyReport>("/api/accuracy"),
  remove: (id: string) => call<void>(`/api/papers/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
