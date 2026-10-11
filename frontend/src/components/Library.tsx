"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type MouseEvent, useCallback, useEffect, useMemo, useState } from "react";

import { ApiError, api, type PaperDetail, type PaperSummary, type SiteConfig } from "@/lib/api";
import { useLevel } from "@/lib/level";
import { useProgress } from "@/lib/progress";
import { useSlow, WAKING_UP } from "@/lib/useSlow";

import { Go, Mark, Out } from "./Glyphs";
import { LevelSlider } from "./LevelSlider";
import { PaperNotes } from "./PaperNotes";
import { ReadingContext, RichText } from "./RichText";

const WIDE = "(min-width: 1024px)";

const STATUS: Record<PaperSummary["status"], { label: string; tone: string }> = {
  queued: { label: "Waiting", tone: "text-muted" },
  reading: { label: "Explaining…", tone: "text-amber-800 dark:text-amber-300" },
  ready: { label: "Ready", tone: "text-emerald-800 dark:text-emerald-300" },
  failed: { label: "Failed", tone: "text-rose-800 dark:text-rose-300" },
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
        className={`group relative flex items-start gap-3 border-b border-line px-4 py-4 transition-colors lg:px-5 lg:py-3 ${
          selected ? "lg:bg-surface" : "hover:bg-sunken"
        }`}
      >
        {selected && (
          <Mark className="absolute top-[2.15rem] left-1.5 hidden text-[0.875rem] leading-none text-accent lg:block">¶</Mark>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 font-mono text-[0.6875rem] text-muted">
            <span className="truncate">{source(paper)}</span>
            {paper.status !== "ready" && (
              <span className={`shrink-0 border border-current px-1 ${status.tone}`}>{status.label}</span>
            )}
          </span>
          <span className="mt-1 line-clamp-3 block font-serif text-[1.1875rem] leading-snug font-medium text-pretty group-hover:text-accent lg:line-clamp-2 lg:text-[1.0625rem]">
            {paper.title ?? paper.filename ?? "Untitled paper"}
          </span>
          <span className="mt-1 block truncate font-serif text-[0.9375rem] text-muted italic lg:text-[0.875rem]">
            {[shortAuthors(paper.authors), paper.year, paper.page_count ? `${paper.page_count} pages` : null]
              .filter(Boolean)
              .join(" · ")}
          </span>
          {read > 0 && (
            <span className="mt-1.5 flex items-center gap-2 font-mono text-[0.6875rem] text-muted">
              <span className="h-px w-16 bg-line" aria-hidden>
                <span className="block h-full bg-claret-700 dark:bg-claret-300" style={{ width: `${read}%` }} />
              </span>
              {read >= 98 ? "Finished" : `${read}% read`}
            </span>
          )}
        </span>
        <Go className="mt-6 shrink-0 text-muted lg:hidden" />
      </Link>
    </li>
  );
}

function Group({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="mt-2 lg:mt-5">
      <h2 className="smallcaps mx-4 flex items-baseline justify-between border-b border-rule py-1.5 font-serif text-[1rem] text-muted italic lg:mx-5">
        {title}
        {count !== undefined && <span className="font-mono text-[0.6875rem] not-italic [font-variant-caps:normal]">{count}</span>}
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
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)] lg:min-h-0 lg:self-start lg:overflow-y-auto lg:border-r lg:border-line">
      <div className="px-4 pt-6 pb-3 lg:px-5 lg:pt-5 lg:pb-1">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="font-serif text-[2.25rem] leading-none font-normal tracking-[-0.02em] italic lg:text-[1.75rem]">Library</h1>
          {total !== null && (
            <span className="font-mono text-[0.6875rem] text-muted">
              {total} {total === 1 ? "paper" : "papers"}
            </span>
          )}
        </div>
        {config && !config.ai_enabled && (
          <p className="mt-2 text-[0.9375rem] leading-snug text-muted lg:hidden">
            A sample library: adding new papers is paused on this demo.
          </p>
        )}
      </div>

      {error && (
        <div role="alert" className="mx-4 my-3 border border-line bg-surface p-4 text-[0.9375rem]">
          <p>{error}</p>
          <button type="button" onClick={onRetry} className="btn btn-secondary btn-sm mt-3">
            Try again
          </button>
        </div>
      )}
      {slow && (
        <p role="status" className="px-4 py-2 text-[0.9375rem] text-muted lg:px-5">
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
              <p className="border-b border-line px-4 py-3 text-[0.9375rem] leading-relaxed text-muted lg:border-0 lg:px-5 lg:py-2 lg:text-[0.875rem]">
                Papers you add are saved in this browser. Paste an arXiv link in the bar above, or press{" "}
                <kbd className="border border-line px-1 font-mono text-[0.6875rem]">/</kbd>.
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
        <ul className="space-y-1.5 border-t border-line pt-3 font-mono text-[0.75rem] lg:text-[0.6875rem]">
          <li>
            <Link href="/accuracy" className="text-muted hover:text-foreground">
              How quotes are checked
            </Link>
          </li>
          <li>
            <Link href="/" className="text-muted hover:text-foreground">
              About Paper2Lab
            </Link>
          </li>
          <li>
            <a href="https://github.com/whatalshifa/paper2lab" className="text-muted hover:text-foreground">
              Source code
            </a>
          </li>
        </ul>
        <p className="mt-4 font-serif text-[0.875rem] leading-relaxed text-muted italic lg:text-[0.8125rem]">
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
      <div className="sticky top-0 z-20 flex h-11 items-center justify-between gap-4 border-b border-line bg-surface px-6">
        <p className="flex min-w-0 items-center gap-1.5 font-mono text-[0.6875rem] text-muted">
          <span className="shrink-0">Library</span>
          <Mark className="shrink-0">/</Mark>
          <span className="shrink-0">{paper.is_sample ? "Samples" : "Your papers"}</span>
          <Mark className="shrink-0">/</Mark>
          <span className="truncate font-serif text-[0.875rem] text-foreground italic">{title}</span>
        </p>
        <div className="flex shrink-0 items-center gap-3">
          {paper.pdf_url && (
            <a href={paper.pdf_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm h-8">
              PDF
              <Out />
            </a>
          )}
          <Link href={`/papers/${paper.id}`} className="btn btn-primary btn-sm h-8 px-3">
            Open in reader
            <Go className="text-[0.9375rem]" />
          </Link>
        </div>
      </div>

      <article className="mx-auto max-w-[40rem] px-8 pt-10 pb-20">
        <p className="border-b border-line pb-2 font-mono text-[0.6875rem] text-muted">{meta.join("  ·  ")}</p>
        <h2 className="mt-5 font-serif text-[2.5rem] leading-[1.06] font-normal tracking-[-0.02em] text-balance">{title}</h2>
        {reading && <p className="mt-3 font-serif text-[1.0625rem] leading-snug text-muted italic">{reading.authors.join(", ")}</p>}

        {!reading ? (
          <div className="mt-10 border border-line bg-background px-5 py-4 text-[0.9375rem]">
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
            <div className="mt-8 border-y border-rule bg-background px-1 py-2.5">
              <LevelSlider level={level} compact />
            </div>

            <section aria-labelledby="preview-nutshell" className="mt-8">
              <h3 id="preview-nutshell" className="eyebrow">
                In a nutshell
              </h3>
              <div className="prose-reading mt-2">
                <RichText text={reading.summary[level]} />
              </div>
            </section>

            {reading.contributions.length > 0 && (
              <div className="mt-8">
                <h3 className="eyebrow">What&apos;s new</h3>
                <ul className="mt-2 space-y-2 font-serif text-[1.0625rem] leading-relaxed">
                  {reading.contributions.map((item) => (
                    <li key={item} className="flex gap-3">
                      <Mark className="shrink-0 text-accent">§</Mark>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <nav aria-label="Contents" className="mt-10">
              <h3 className="eyebrow">Contents</h3>
              <ol className="mt-2 border-t border-rule">
                {reading.sections.map((section, i) => (
                  <li key={section.id}>
                    <Link
                      href={`/papers/${paper.id}#${section.id}`}
                      className="group flex items-baseline gap-3 border-b border-line py-2.5 text-[0.9375rem]"
                    >
                      <span className="w-6 shrink-0 text-right font-serif text-[0.9375rem] text-accent italic">{i + 1}.</span>
                      <span className="font-serif text-[1.0625rem] group-hover:underline group-hover:underline-offset-4">{section.title}</span>
                      <span className="mx-1 flex-1 translate-y-[-0.2em] border-b border-dotted border-muted/50" aria-hidden />
                      <span className="shrink-0 font-mono text-[0.6875rem] text-muted">p. {section.page}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link href={`/papers/${paper.id}`} className="inline-flex items-center gap-1.5 font-mono text-[0.8125rem] text-accent underline underline-offset-[5px] hover:decoration-2">
                Continue in the reader
                <Go className="text-[1rem]" />
              </Link>
              {paper.is_sample && (
                <span className="font-serif text-[0.9375rem] text-muted italic">Explained in advance, so every feature works on this demo.</span>
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
 * The window doesn't scroll there; each pane scrolls on its own. Phones get the list on its own; a tap
 * opens the reader.
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

  const select = useCallback((id: string) => router.replace(`/library?paper=${id}`, { scroll: false }), [router]);

  return (
    <div className="lg:grid lg:h-[calc(100dvh-3.5rem)] lg:grid-cols-[16.5rem_minmax(0,1fr)_19rem] xl:grid-cols-[17.5rem_minmax(0,1fr)_21rem]">
      <Rail
        lists={lists}
        config={config}
        error={error}
        slow={slow}
        selectedId={selectedId}
        onSelect={select}
        onRetry={load}
      />
      <div className="hidden min-w-0 bg-surface lg:block lg:h-[calc(100dvh-3.5rem)] lg:overflow-y-auto">{selected ? <Preview paper={selected} /> : !error && <PreviewSkeleton />}</div>
      <aside
        aria-label="Margin notes"
        className="hidden lg:sticky lg:top-14 lg:block lg:h-[calc(100dvh-3.5rem)] lg:self-start lg:overflow-y-auto lg:border-l lg:border-line"
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
