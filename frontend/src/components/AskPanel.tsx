"use client";

import { type FormEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { type AnswerPart, ApiError, api, type Citation, type Level, type PaperDetail, type Question } from "@/lib/api";
import { LEVELS, useLevel } from "@/lib/level";

import { RichText } from "./RichText";

/** A question shown in the panel: one asked through the API, or a sample's prepared answer. */
type Entry = Pick<Question, "id" | "text" | "level" | "status" | "error" | "answer"> & { prepared?: boolean };

const CITE = /\[\[cite:([\d,]+)\]\]/g;

function pageLabel(c: Citation) {
  return c.start_page === c.end_page ? `Page ${c.start_page}` : `Pages ${c.start_page} to ${c.end_page}`;
}

/** The answer's text with numbered citation marks, and below it the numbered passages from the paper. */
function AnswerView({
  id,
  parts,
  pdfUrl,
  prepared,
}: {
  id: string;
  parts: AnswerPart[];
  pdfUrl: string | null;
  prepared: boolean;
}) {
  // Number each distinct passage in the order it is first used.
  const sources: Citation[] = [];
  const numberOf = (c: Citation) => {
    let index = sources.findIndex((s) => s.quote === c.quote && s.start_page === c.start_page);
    if (index < 0) index = sources.push(c) - 1;
    return index + 1;
  };
  const text = parts
    .map((part) => {
      const numbers = [...new Set(part.citations.map(numberOf))];
      return numbers.length ? `${part.text}[[cite:${numbers.join(",")}]]` : part.text;
    })
    .join("");

  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim());
  return (
    <div>
      <div className="space-y-3 font-serif text-[0.98rem] leading-relaxed">
        {paragraphs.map((paragraph, p) => {
          const nodes: ReactNode[] = [];
          let last = 0;
          for (const match of paragraph.matchAll(CITE)) {
            nodes.push(<RichText key={`t${match.index}`} text={paragraph.slice(last, match.index)} inline />);
            nodes.push(
              <sup key={`c${match.index}`} className="ml-0.5 font-sans text-[0.7em] font-semibold text-accent">
                {match[1].split(",").map((n, i) => (
                  <a key={n} href={`#${id}-src-${n}`} className="hover:underline" aria-label={`Source ${n}`}>
                    {i > 0 ? "," : ""}[{n}]
                  </a>
                ))}
              </sup>,
            );
            last = match.index + match[0].length;
          }
          nodes.push(<RichText key="end" text={paragraph.slice(last)} inline />);
          return <p key={p}>{nodes}</p>;
        })}
      </div>
      {sources.length > 0 && (
        <ol className="mt-3 space-y-2 border-t border-line pt-3">
          {sources.map((source, i) => {
            const href = pdfUrl ? `${pdfUrl}#page=${source.start_page}` : null;
            return (
              <li key={i} id={`${id}-src-${i + 1}`} className="flex gap-2 text-xs">
                <span className="font-semibold text-accent">[{i + 1}]</span>
                <span>
                  <span className="font-serif text-[0.85rem] italic">&ldquo;{source.quote}&rdquo;</span>{" "}
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="link whitespace-nowrap">
                      {pageLabel(source)} ↗
                    </a>
                  ) : (
                    <span className="text-muted">{pageLabel(source)}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      <p className="mt-3 text-xs text-muted">
        {!prepared
          ? "Every marked passage was copied out of the PDF by the AI service itself."
          : sources.length > 0 && sources.every((s) => s.verified)
            ? "Prepared in advance for this sample. Every quote was found word for word in the PDF."
            : "Prepared in advance for this sample. Its quotes haven't all been checked against the PDF yet."}
      </p>
    </div>
  );
}

function EntryView({ entry, pdfUrl, onRetry }: { entry: Entry; pdfUrl: string | null; onRetry: (text: string) => void }) {
  const levelLabel = LEVELS.find((l) => l.id === entry.level)?.label;
  return (
    <li className="space-y-3">
      <div className="ml-8 rounded-md rounded-br-md bg-claret-700 px-4 py-2.5 text-sm text-white">{entry.text}</div>
      <div className="mr-2 rounded-md rounded-bl-md border border-line bg-surface px-4 py-3">
        {entry.status === "ready" && entry.answer ? (
          <AnswerView id={entry.id} parts={entry.answer.parts} pdfUrl={pdfUrl} prepared={!!entry.prepared} />
        ) : entry.status === "failed" ? (
          <div role="alert" className="text-sm">
            <p>{entry.error}</p>
            <button type="button" onClick={() => onRetry(entry.text)} className="btn btn-secondary btn-sm mt-3">
              Ask again
            </button>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted" role="status">
            <span className="h-2 w-2 animate-pulse rounded-full bg-claret-600" aria-hidden />
            Reading the paper to answer{levelLabel ? ` (${levelLabel.toLowerCase()} level)` : ""}…
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * "Ask the paper": a side panel (a full-screen sheet on phones) where questions about this paper are
 * answered from the paper alone, each sentence marked with the passages it rests on.
 */
export function AskPanel({ paper, open, onClose }: { paper: PaperDetail; open: boolean; onClose: () => void }) {
  const level = useLevel();
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const loaded = useRef(false);
  const listEnd = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const reading = paper.reading;
  const prepared = reading?.prepared_answers ?? [];

  useEffect(() => {
    if (!open || loaded.current) return;
    loaded.current = true;
    api.config().then((c) => setAiEnabled(c.ai_enabled), () => setAiEnabled(false));
    api.questions(paper.id).then(setEntries, () => {});
  }, [open, paper.id]);

  useEffect(() => {
    if (open) textarea.current?.focus();
  }, [open]);

  useEffect(() => {
    listEnd.current?.scrollIntoView({ block: "end" });
  }, [entries.length]);

  // Check unfinished answers every two seconds.
  const pending = entries.filter((e) => !e.prepared && (e.status === "queued" || e.status === "answering"));
  const pendingIds = pending.map((e) => e.id).join(",");
  const refresh = useCallback(async () => {
    const ids = pendingIds.split(",").filter(Boolean);
    const updated = await Promise.all(ids.map((id) => api.question(id).catch(() => null)));
    setEntries((current) => current.map((e) => updated.find((u) => u?.id === e.id) ?? e));
  }, [pendingIds]);
  useEffect(() => {
    if (!pendingIds) return;
    const timer = window.setInterval(refresh, 2000);
    return () => window.clearInterval(timer);
  }, [pendingIds, refresh]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed || sending) return;
    const ready = prepared.find((p) => p.question === trimmed);
    if (ready && !aiEnabled) {
      setEntries((current) => [
        ...current,
        {
          id: `prepared-${current.length}`,
          text: ready.question,
          level: "student" as Level,
          status: "ready",
          error: null,
          answer: { parts: ready.parts },
          prepared: true,
        },
      ]);
      return;
    }
    setSending(true);
    setError(null);
    try {
      const asked = await api.ask(paper.id, trimmed, level);
      setEntries((current) => [...current, asked]);
      setText("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    send(text);
  }

  const suggestions = (reading?.suggested_questions ?? []).filter((q) => !entries.some((e) => e.text === q));
  const canType = aiEnabled === true;

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="presentation">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="ask-title"
        className="relative flex h-full w-full flex-col border-l border-line bg-background shadow-2xl sm:max-w-md"
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 id="ask-title" className="font-serif text-2xl font-semibold tracking-tight">
              Ask the paper
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Answers come only from this paper, with the passages they rest on.
            </p>
          </div>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="Close the panel">
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
              <path strokeLinecap="round" d="m5 5 10 10M15 5 5 15" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {entries.length === 0 && (
            <p className="text-sm text-muted">
              Ask anything this paper covers: why a step works, what a result means, how it compares. Answers
              follow your reading level ({LEVELS.find((l) => l.id === level)?.label.toLowerCase()}).
            </p>
          )}
          <ul className="space-y-6">
            {entries.map((entry) => (
              <EntryView key={entry.id} entry={entry} pdfUrl={paper.pdf_url} onRetry={send} />
            ))}
          </ul>
          <div ref={listEnd} />
        </div>

        <div className="border-t border-line px-5 py-4">
          {suggestions.length > 0 && (aiEnabled || prepared.length > 0) && (
            <div className="mb-3">
              <p className="mb-2 text-xs font-semibold text-muted">Try asking</p>
              <div className="flex flex-wrap gap-2">
                {suggestions
                  .filter((q) => aiEnabled || prepared.some((p) => p.question === q))
                  .map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => send(q)}
                      disabled={sending}
                      className="rounded-full border border-line bg-surface px-3 py-1.5 text-left text-xs font-medium hover:border-claret-300 hover:bg-accent-soft"
                    >
                      {q}
                    </button>
                  ))}
              </div>
            </div>
          )}
          <form onSubmit={submit} className="flex items-end gap-2">
            <label htmlFor="ask-input" className="sr-only">
              Your question
            </label>
            <textarea
              id="ask-input"
              ref={textarea}
              rows={2}
              maxLength={500}
              value={text}
              disabled={!canType}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send(text);
                }
              }}
              placeholder={canType ? "Ask a question about this paper…" : "Questions are paused on this demo"}
              className="input min-h-0 resize-none py-2.5 text-sm"
            />
            <button type="submit" className="btn btn-primary" disabled={!canType || sending || text.trim().length < 3}>
              Ask
            </button>
          </form>
          {aiEnabled === false && (
            <p className="mt-2 text-xs text-muted">
              {prepared.length > 0
                ? "The AI is off on this demo, so only the suggested questions above have answers, prepared in advance."
                : "The AI is off on this demo, so new questions can't be answered."}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-2 text-sm text-rose-700 dark:text-rose-300">
              {error}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
