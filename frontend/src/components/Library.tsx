"use client";

import { BookOpen, ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type MouseEvent, useCallback, useEffect, useMemo, useState } from "react";

import { ApiError, api, type PaperDetail, type PaperSummary, type SiteConfig } from "@/lib/api";
import { useLevel } from "@/lib/level";
import { useProgress } from "@/lib/progress";
import { useSlow, WAKING_UP } from "@/lib/useSlow";

import { LevelSlider } from "./LevelSlider";
import { PaperNotes } from "./PaperNotes";
import { ReadingContext, RichText } from "./RichText";

const WIDE = "(min-width: 1024px)";

const STATUS: Record<PaperSummary["status"], { label: string; dot: string }> = {
  queued: { label: "Waiting", dot: "bg-line" },
  reading: { label: "Explaining…", dot: "bg-amber-500" },
  ready: { label: "Ready", dot: "bg-emerald-600 dark:bg-emerald-400" },
  failed: { label: "Failed", dot: "bg-rose-600 dark:bg-rose-400" },
};

function shortAuthors(authors: string[] | null) {
  if (!authors?.length) return null;
  const last = (name: string) => name.split(" ").at(-1);
  if (authors.length === 1) return authors[0];
  if (authors.length === 2) return `${last(authors[0])} and ${last(authors[1])}`;
  return `${last(authors[0])} et al.`;
}

function source(paper: PaperSummary) {
  if (paper.arxiv_id) return `arXiv:${paper.arxiv_id.replace(/v\d+$/, "")}`;
  return paper.filename ?? "PDF";
}

/** One paper in the library list. On wide screens a click shows it in the panes beside the list;
 * on phones (and with a modifier key, or a double click) it opens the reader. */
function Entry({
  paper,
  selected,
  onSelect,
}: {
  paper: PaperSummary;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const router = useRouter();
  const status = STATUS[paper.status];
  const read = Math.round(useProgress(paper.id) * 100);
  function click(event: MouseEvent) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !matchMedia(WIDE).matches) return;
    event.preventDefault();
    onSelect(paper.id);
  }
  return (
    <li>
      <Link
        href={`/papers/${paper.id}`}
        onClick={click}
        onDoubleClick={() => router.push(`/papers/${paper.id}`)}
        aria-current={selected ? "true" : undefined}
        className={`group relative flex items-start gap-3 border-b border-line px-4 py-4 transition-colors lg:mx-2 lg:rounded-md lg:border-0 lg:px-3 lg:py-2.5 ${
          selected ? "lg:bg-surface lg:shadow-[0_1px_2px_rgb(0_0_0/0.06)] lg:ring-1 lg:ring-line" : "hover:bg-sunken"
        }`}
      >
        {selected && (
          <span className="absolute top-3 bottom-3 left-0 hidden w-[3px] rounded-full bg-claret-700 lg:block dark:bg-claret-300" aria-hidden />
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 font-mono text-[0.6875rem] text-muted">
            <span className="truncate">{source(paper)}</span>
            {paper.status !== "ready" && (
              <span className="inline-flex shrink-0 items-center gap-1 font-sans">
                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden />
                {status.label}
              </span>
            )}
          </span>
          <span className="mt-1 line-clamp-3 block font-serif text-[1.0625rem] leading-snug font-semibold text-pretty group-hover:text-accent lg:line-clamp-2 lg:text-[0.9375rem] lg:group-hover:text-foreground">
            {paper.title ?? paper.filename ?? "Untitled paper"}
          </span>
          <span className="mt-1 block truncate text-[0.8125rem] text-muted lg:text-xs">
            {[shortAuthors(paper.authors), paper.year, paper.page_count ? `${paper.page_count} pages` : null]
              .filter(Boolean)
              .join(" · ")}
          </span>
          {read > 0 && (
            <span className="mt-1.5 flex items-center gap-2 text-[0.6875rem] text-muted">
              <span className="h-[3px] w-16 rounded-full bg-line" aria-hidden>
                <span className="block h-full rounded-full bg-claret-700 dark:bg-claret-300" style={{ width: `${read}%` }} />
              </span>
              {read >= 98 ? "Finished" : `${read}% read`}
            </span>
          )}
        </span>
        <ChevronRight className="mt-6 h-4 w-4 shrink-0 text-muted lg:hidden" aria-hidden />
      </Link>
    </li>
  );
}

function Group({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="mt-2 lg:mt-4">
      <h2 className="flex items-baseline justify-between bg-sunken px-4 py-2 text-xs font-semibold tracking-[0.06em] text-muted uppercase lg:bg-transparent lg:px-5 lg:py-1.5 lg:text-[0.6875rem]">
        {title}
        {count !== undefined && <span className="font-normal tabular-nums">{count}</span>}
      </h2>
      {children}
    </div>
  );
}

/** The library: on wide screens the left rail, on phones the whole home page. */
function Rail({
  lists,
  config,
  error,
  slow,
  selectedId,
  onSelect,
  onRetry,
}: {
  lists: { samples: PaperSummary[]; mine: PaperSummary[] } | null;
  config: SiteConfig | null;
  error: string | null;
  slow: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRetry: () => void;
}) {
  const fields = useMemo(() => {
    const byField = new Map<string, PaperSummary[]>();
    for (const paper of lists?.samples ?? []) {
      const field = paper.field ?? "Other";
      byField.set(field, [...(byField.get(field) ?? []), paper]);
    }
    return [...byField.entries()];
  }, [lists]);
  const total = lists ? lists.samples.length + lists.mine.length : null;

  return (
    <div className="flex min-h-[calc(100dvh-3rem)] flex-col lg:sticky lg:top-12 lg:h-[calc(100dvh-3rem)] lg:min-h-0 lg:self-start lg:overflow-y-auto lg:border-r lg:border-line">
      <div className="px-4 pt-6 pb-3 lg:px-5 lg:pt-5 lg:pb-1">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight lg:text-[0.9375rem]">Library</h1>
          {total !== null && (
            <span className="text-[0.8125rem] text-muted tabular-nums lg:text-xs">
              {total} {total === 1 ? "paper" : "papers"}
            </span>
          )}
        </div>
        {config && !config.ai_enabled && (
          <p className="mt-1.5 text-[0.8125rem] leading-snug text-muted lg:hidden">
            A sample library: adding new papers is paused on this demo.
          </p>
        )}
      </div>

      {error && (
        <div role="alert" className="mx-4 my-3 rounded-md border border-line bg-surface p-4 text-sm">
          <p>{error}</p>
          <button type="button" onClick={onRetry} className="btn btn-secondary btn-sm mt-3">
            Try again
          </button>
        </div>
      )}
      {slow && (
        <p role="status" className="px-4 py-2 text-[0.8125rem] text-muted lg:px-5">
          {WAKING_UP}
        </p>
      )}
      {!lists && !error && (
        <div className="space-y-3 px-4 py-4 lg:px-5" aria-busy="true" aria-label="Loading the library">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-16" />
          ))}
        </div>
      )}

      {lists && (
        <>
          <Group title="Your papers" count={lists.mine.length}>
            {lists.mine.length > 0 ? (
              <ul>
                {lists.mine.map((paper) => (
                  <Entry key={paper.id} paper={paper} selected={paper.id === selectedId} onSelect={onSelect} />
                ))}
              </ul>
            ) : (
              <p className="border-b border-line px-4 py-3 text-[0.8125rem] leading-relaxed text-muted lg:border-0 lg:px-5 lg:py-1.5 lg:text-xs">
                Papers you add are saved in this browser. Paste an arXiv link in the bar above, or press{" "}
                <kbd className="rounded border border-line px-1 font-mono text-[0.6875rem]">/</kbd>.
              </p>
            )}
          </Group>
          {fields.map(([field, papers]) => (
            <Group key={field} title={`Samples · ${field}`} count={papers.length}>
              <ul>
                {papers.map((paper) => (
                  <Entry key={paper.id} paper={paper} selected={paper.id === selectedId} onSelect={onSelect} />
                ))}
              </ul>
            </Group>
          ))}
        </>
      )}

      <div className="mt-auto px-4 pt-10 pb-6 lg:px-5 lg:pt-8 lg:pb-5">
        <ul className="space-y-1.5 text-[0.8125rem] lg:text-xs">
          <li>
            <Link href="/accuracy" className="text-muted hover:text-foreground">
              How quotes are checked
            </Link>
          </li>
          <li>
            <Link href="/about" className="text-muted hover:text-foreground">
              About Paper2Lab
            </Link>
          </li>
          <li>
            <a href="https://github.com/whatalshifa/paper2lab" className="text-muted hover:text-foreground">
              Source code
            </a>
          </li>
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-muted lg:text-[0.6875rem]">
          Explanations are written by AI and can be wrong. Each shows the quote it&apos;s based on, so you can check.
        </p>
      </div>
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <div className="mx-auto max-w-[40rem] space-y-4 px-8 pt-16" aria-busy="true" aria-label="Loading the paper">
      <div className="skeleton h-3 w-1/3" />
      <div className="skeleton h-9 w-4/5" />
      <div className="skeleton h-4 w-2/3" />
      <div className="skeleton mt-8 h-12 w-full" />
      <div className="skeleton h-40 w-full" />
    </div>
  );
}

/** The selected paper's first page: what it is, what it says in a nutshell, and what's in it. */
function Preview({ paper }: { paper: PaperDetail }) {
  const level = useLevel();
  const reading = paper.reading;
  const context = useMemo(
    () => ({ equations: reading?.equations ?? [], concepts: reading?.concepts ?? [], level }),
    [reading, level],
  );
  const title = reading?.title ?? paper.title ?? paper.filename ?? "Untitled paper";
  const meta = [
    paper.arxiv_id ? `arXiv:${paper.arxiv_id}` : paper.filename,
    reading?.field ?? paper.field,
    reading?.year ?? paper.year,
    paper.page_count ? `${paper.page_count} pages` : null,
  ].filter(Boolean);

  return (
    <ReadingContext.Provider value={context}>
      <div className="sticky top-12 z-20 flex h-11 items-center justify-between gap-4 border-b border-line bg-surface px-6">
        <p className="flex min-w-0 items-center gap-1 text-[0.8125rem] text-muted">
          <span className="shrink-0">Library</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="shrink-0">{paper.is_sample ? "Samples" : "Your papers"}</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate text-foreground">{title}</span>
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {paper.pdf_url && (
            <a href={paper.pdf_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm h-8 px-2.5">
              PDF
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          )}
          <Link href={`/papers/${paper.id}`} className="btn btn-primary btn-sm h-8 px-3">
            <BookOpen className="h-4 w-4" aria-hidden />
            Open in reader
          </Link>
        </div>
      </div>

      <article className="mx-auto max-w-[40rem] px-8 pt-10 pb-20">
        <p className="font-mono text-xs text-muted">{meta.join("  ·  ")}</p>
        <h2 className="mt-3 font-serif text-[2.125rem] leading-[1.12] font-semibold tracking-[-0.01em] text-balance">{title}</h2>
        {reading && <p className="mt-3 font-serif text-[1.0625rem] leading-snug text-muted italic">{reading.authors.join(", ")}</p>}

        {!reading ? (
          <div className="mt-10 rounded-md border border-line bg-background px-5 py-4 text-sm">
            {paper.status === "failed" ? (
              <p>Paper2Lab couldn&apos;t explain this paper. {paper.error}</p>
            ) : (
              <p role="status">Paper2Lab is still reading this paper. It usually takes one to three minutes.</p>
            )}
            <Link href={`/papers/${paper.id}`} className="link mt-2 inline-block">
              Open it
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8 rounded-md border border-line bg-background px-4 py-2.5">
              <LevelSlider level={level} compact />
            </div>

            <section aria-labelledby="preview-nutshell" className="mt-8">
              <h3 id="preview-nutshell" className="text-[0.75rem] font-semibold tracking-[0.08em] text-accent uppercase">
                In a nutshell
              </h3>
              <div className="prose-reading mt-2">
                <RichText text={reading.summary[level]} />
              </div>
            </section>

            {reading.contributions.length > 0 && (
              <div className="mt-8">
                <h3 className="text-[0.75rem] font-semibold tracking-[0.08em] text-muted uppercase">What&apos;s new</h3>
                <ul className="mt-2 space-y-2 font-serif text-[1.0625rem] leading-relaxed">
                  {reading.contributions.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-[0.7em] h-1 w-1 shrink-0 rounded-full bg-claret-700 dark:bg-claret-300" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <nav aria-label="Contents" className="mt-10">
              <h3 className="text-[0.75rem] font-semibold tracking-[0.08em] text-muted uppercase">Contents</h3>
              <ol className="mt-2 border-t border-line">
                {reading.sections.map((section, i) => (
                  <li key={section.id}>
                    <Link
                      href={`/papers/${paper.id}#${section.id}`}
                      className="group flex items-baseline gap-3 border-b border-line py-2.5 text-[0.9375rem]"
                    >
                      <span className="w-5 shrink-0 text-right text-[0.8125rem] text-muted tabular-nums">{i + 1}</span>
                      <span className="font-serif font-medium group-hover:text-accent">{section.title}</span>
                      <span className="mx-1 flex-1 translate-y-[-0.2em] border-b border-dotted border-line" aria-hidden />
                      <span className="shrink-0 text-[0.8125rem] text-muted tabular-nums">p. {section.page}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link href={`/papers/${paper.id}`} className="link inline-flex items-center gap-1 text-[0.9375rem]">
                Continue in the reader
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
              {paper.is_sample && (
                <span className="text-[0.8125rem] text-muted">Explained in advance, so every feature works on this demo.</span>
              )}
            </div>
          </>
        )}
      </article>
    </ReadingContext.Provider>
  );
}

/**
 * The home page is the library, laid out like a reading app. Wide screens get three panes: the
 * library list, the selected paper's first page, and its margin notes (terms, equations, questions).
 * Phones get the list on its own; a tap opens the reader.
 */
export function Library() {
  const router = useRouter();
  const params = useSearchParams();
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [lists, setLists] = useState<{ samples: PaperSummary[]; mine: PaperSummary[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, PaperDetail>>({});

  const load = useCallback(async () => {
    try {
      const [siteConfig, papers] = await Promise.all([api.config(), api.papers()]);
      setConfig(siteConfig);
      setLists(papers);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load the library.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading data when the page opens
    load();
  }, [load]);
  const slow = useSlow(!lists && !error);

  const all = useMemo(() => (lists ? [...lists.mine, ...lists.samples] : []), [lists]);
  const requested = params.get("paper");
  const selectedId =
    all.find((p) => p.id === requested)?.id ?? lists?.mine.find((p) => p.status === "ready")?.id ?? lists?.samples[0]?.id ?? null;
  const selected = selectedId ? details[selectedId] : undefined;

  useEffect(() => {
    if (!selectedId || details[selectedId]) return;
    api.paper(selectedId).then(
      (paper) => setDetails((current) => ({ ...current, [selectedId]: paper })),
      () => {},
    );
  }, [selectedId, details]);

  const select = useCallback((id: string) => router.replace(`/?paper=${id}`, { scroll: false }), [router]);

  return (
    <div className="lg:grid lg:min-h-[calc(100dvh-3rem)] lg:grid-cols-[16.5rem_minmax(0,1fr)_19rem] xl:grid-cols-[17.5rem_minmax(0,1fr)_21rem]">
      <Rail
        lists={lists}
        config={config}
        error={error}
        slow={slow}
        selectedId={selectedId}
        onSelect={select}
        onRetry={load}
      />
      <div className="hidden min-w-0 bg-surface lg:block">{selected ? <Preview paper={selected} /> : !error && <PreviewSkeleton />}</div>
      <aside
        aria-label="Margin notes"
        className="hidden lg:sticky lg:top-12 lg:block lg:h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto lg:border-l lg:border-line"
      >
        {selected?.reading ? (
          <PaperNotes paper={selected} reading={selected.reading} aiEnabled={config?.ai_enabled ?? false} />
        ) : (
          <div className="space-y-3 px-5 py-6">
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-24" />
            <div className="skeleton h-24" />
          </div>
        )}
      </aside>
    </div>
  );
}
