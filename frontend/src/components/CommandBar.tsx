"use client";

import { ArrowRight, CornerDownLeft, FileText, FileUp, Info, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { ApiError, api, type PaperSummary, type SiteConfig } from "@/lib/api";

/** An arXiv link or id: "https://arxiv.org/abs/1706.03762", "1706.03762v7" or an old-style "hep-th/9901001". */
const ARXIV = /^(?:https?:\/\/)?(?:www\.)?(?:arxiv\.org\/(?:abs|pdf)\/)?(\d{4}\.\d{4,5}(?:v\d+)?|[a-z-]+(?:\.[a-z]{2})?\/\d{7}(?:v\d+)?)(?:\.pdf)?\/?$/i;

function isTyping(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  return !!element && (element.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName));
}

function byline(paper: PaperSummary) {
  const first = paper.authors?.[0]?.split(" ").at(-1);
  const who = first ? (paper.authors!.length > 1 ? `${first} et al.` : first) : null;
  return [who, paper.year].filter(Boolean).join(", ");
}

/**
 * The command bar: the one way in for a new paper, shaped like a search field. Paste an arXiv link
 * and press Enter, choose or drop a PDF, or type a few words to jump to a paper in the library.
 * "/" or Ctrl/⌘ K focuses it from anywhere. In demo mode it says, quietly, that adding is paused.
 */
export function CommandBar() {
  const router = useRouter();
  const path = usePathname();
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [papers, setPapers] = useState<PaperSummary[] | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const off = config !== null && !config.ai_enabled;
  const disabled = off || busy || config === null;
  const arxiv = ARXIV.exec(query.trim())?.[1] ?? null;
  const words = query.trim().toLowerCase();
  const matches = (papers ?? [])
    .filter(
      (paper) =>
        !words ||
        arxiv ||
        [paper.title, paper.filename, paper.field, ...(paper.authors ?? [])]
          .filter(Boolean)
          .some((text) => text!.toLowerCase().includes(words)),
    )
    .slice(0, 6);

  useEffect(() => {
    api.config().then(setConfig, () => {});
  }, []);

  // The library is fetched when the bar first opens, for the "jump to a paper" list.
  useEffect(() => {
    if (open && papers === null) api.papers().then((lists) => setPapers([...lists.mine, ...lists.samples]), () => {});
  }, [open, papers]);

  // A new page closes the bar.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the route changed, so the bar has done its job
    setOpen(false);
    setQuery("");
  }, [path]);

  // "/" or Ctrl/⌘ K from anywhere; Escape or a click elsewhere closes it.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const shortcut =
        (event.key === "/" && !isTyping(event.target)) || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k");
      if (shortcut) {
        event.preventDefault();
        input.current?.focus();
        setOpen(true);
      } else if (event.key === "Escape" && root.current?.contains(document.activeElement)) {
        setOpen(false);
        input.current?.blur();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, []);

  async function send(action: () => Promise<{ id: string }>) {
    setBusy(true);
    setError(null);
    try {
      const paper = await action();
      router.push(`/papers/${paper.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function pick(chosen: File | undefined) {
    if (!chosen || disabled) return;
    setOpen(true);
    if (config && chosen.size > config.max_upload_mb * 1_000_000) {
      setError(`That file is over ${config.max_upload_mb} MB.`);
      return;
    }
    send(() => api.upload(chosen));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (arxiv && !disabled) send(() => api.addArxiv(query.trim()));
    else if (!arxiv && words && matches.length > 0) router.push(`/papers/${matches[0].id}`);
  }

  return (
    <div
      ref={root}
      className="relative w-full max-w-xl"
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        if (event.relatedTarget && !root.current?.contains(event.relatedTarget as Node)) setOpen(false);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        pick(event.dataTransfer.files[0]);
      }}
    >
      <form
        role="search"
        aria-label="Add or find a paper"
        onSubmit={submit}
        className={`flex h-9 items-center gap-2 rounded-md border bg-surface pr-1.5 pl-2.5 transition-[border-color,box-shadow] ${
          open || dragging
            ? "border-claret-500 ring-4 ring-claret-500/15"
            : "border-line hover:border-muted/50"
        }`}
      >
        <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
        <label htmlFor="command" className="sr-only">
          Paste an arXiv link, or search your library
        </label>
        <input
          id="command"
          ref={input}
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setError(null);
            setOpen(true);
          }}
          placeholder="Paste an arXiv link or upload a PDF"
          aria-controls="command-panel"
          autoComplete="off"
          spellCheck={false}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
        />
        {off && (
          <span className="hidden shrink-0 items-center gap-1 text-xs whitespace-nowrap text-muted lg:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
            Adding paused on this demo
          </span>
        )}
        <kbd className="hidden h-5 min-w-5 shrink-0 items-center justify-center rounded border border-line bg-background px-1 font-mono text-[0.6875rem] text-muted sm:inline-flex">
          /
        </kbd>
      </form>

      <div
        id="command-panel"
        hidden={!open}
        className="fixed inset-x-0 top-12 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-line bg-surface shadow-xl shadow-black/10 sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:left-0 sm:mt-1.5 sm:min-w-[30rem] sm:rounded-lg sm:border dark:shadow-black/40"
      >
        {off && (
          <p className="flex gap-2.5 border-b border-line bg-sunken/60 px-4 py-3 text-[0.8125rem] leading-relaxed text-muted">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              Explaining new papers is paused on this demo, so adding a paper is switched off. The two sample papers
              show everything Paper2Lab does.
            </span>
          </p>
        )}

        {arxiv && (
          <div className="border-b border-line p-1.5">
            <button
              type="button"
              disabled={disabled}
              onClick={() => send(() => api.addArxiv(query.trim()))}
              className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
            >
              <ArrowRight className="h-4 w-4 shrink-0 text-accent" aria-hidden />
              <span className="flex-1">
                {busy ? "Adding…" : "Explain"} <span className="font-mono text-[0.8125rem]">arXiv:{arxiv}</span>
              </span>
              <CornerDownLeft className="h-3.5 w-3.5 text-muted" aria-hidden />
            </button>
          </div>
        )}

        {!arxiv && (
          <div className="border-b border-line p-1.5">
            <p className="px-2.5 pt-1.5 pb-1 text-[0.6875rem] font-semibold tracking-[0.06em] text-muted uppercase">
              {words ? "Matching papers" : "Jump to a paper"}
            </p>
            {papers === null ? (
              <p className="px-2.5 py-2 text-sm text-muted">Loading the library…</p>
            ) : matches.length === 0 ? (
              <p className="px-2.5 py-2 text-sm text-muted">No paper in your library matches &ldquo;{query.trim()}&rdquo;.</p>
            ) : (
              <ul>
                {matches.map((paper) => (
                  <li key={paper.id}>
                    <Link
                      href={`/papers/${paper.id}`}
                      className="flex items-center gap-3 rounded-md px-2.5 py-2 hover:bg-sunken"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                      <span className="min-w-0 flex-1 truncate font-serif text-[0.9375rem] font-medium">
                        {paper.title ?? paper.filename ?? "Untitled paper"}
                      </span>
                      <span className="shrink-0 text-xs text-muted">{byline(paper)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <FileUp className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
            <p className="text-[0.8125rem] leading-snug text-muted">
              <span className="font-medium text-foreground">Upload a PDF</span>, or drop one on this bar.
              <span className="block text-xs">
                Up to {config?.max_upload_mb ?? 20} MB and {config?.max_pages ?? 60} pages. Or paste an arXiv link above.
              </span>
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm shrink-0 self-start sm:self-auto"
            disabled={disabled}
            onClick={() => file.current?.click()}
          >
            {busy ? "Uploading…" : "Choose a PDF"}
          </button>
          <input
            ref={file}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              pick(event.target.files?.[0]);
              event.target.value = ""; // so the same file can be picked again after an error
            }}
          />
        </div>

        {error && (
          <p role="alert" className="mx-4 mb-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </p>
        )}

        <p className="hidden items-center gap-4 border-t border-line px-4 py-2 text-[0.6875rem] text-muted sm:flex">
          <span>
            <kbd className="font-mono">/</kbd> or <kbd className="font-mono">Ctrl K</kbd> to open
          </span>
          <span>
            <kbd className="font-mono">Enter</kbd> to explain a link or open the first match
          </span>
          <span>
            <kbd className="font-mono">Esc</kbd> to close
          </span>
        </p>
      </div>
    </div>
  );
}
