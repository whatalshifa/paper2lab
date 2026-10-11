"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type MouseEvent, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { ApiError, api, type PaperDetail, type PaperSummary, type SiteConfig } from "@/lib/api";
import { useProgress } from "@/lib/progress";
import { useSlow, WAKING_UP } from "@/lib/useSlow";

import { Go, Mark } from "./Glyphs";

const WIDE = "(min-width: 1024px)";

// The selected paper's panes only show on wide screens, so they (and KaTeX, which draws their maths) are
// downloaded only there. Phones get the list, and a tap opens the reader.
const Preview = dynamic(() => import("./LibraryPreview").then((module) => module.Preview), {
  ssr: false,
  loading: () => <PreviewSkeleton />,
});
const PaperNotes = dynamic(() => import("./PaperNotes").then((module) => module.PaperNotes), { ssr: false });

function subscribeToWidth(onChange: () => void) {
  const media = matchMedia(WIDE);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** True on screens wide enough for the library's three panes. */
function useWide() {
  return useSyncExternalStore(subscribeToWidth, () => matchMedia(WIDE).matches, () => false);
}

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
        <div className="space-y-3 px-4 py-4 lg:px-5" role="status" aria-busy="true" aria-label="Loading the library">
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
            <Link href="/" prefetch={false} className="text-muted hover:text-foreground">
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
    <div className="mx-auto max-w-[40rem] space-y-4 px-8 pt-16" role="status" aria-busy="true" aria-label="Loading the paper">
      <div className="skeleton h-3 w-1/3" />
      <div className="skeleton h-9 w-4/5" />
      <div className="skeleton h-4 w-2/3" />
      <div className="skeleton mt-8 h-12 w-full" />
      <div className="skeleton h-40 w-full" />
    </div>
  );
}

/** The middle pane when there is nothing to show yet: the library or the paper couldn't load. */
function PreviewUnavailable({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="status" className="mx-auto max-w-[30rem] px-8 pt-24 text-center">
      <p className="eyebrow">Nothing open yet</p>
      <p className="mt-3 font-serif text-[1.25rem] leading-snug text-pretty italic">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-secondary btn-sm mt-6">
          Try again
        </button>
      )}
    </div>
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
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const wide = useWide();

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

  const loadDetail = useCallback((id: string) => {
    api.paper(id).then(
      (paper) => setDetails((current) => ({ ...current, [id]: paper })),
      () => setUnavailable(id),
    );
  }, []);
  useEffect(() => {
    if (!wide || !selectedId || details[selectedId]) return;
    loadDetail(selectedId);
  }, [wide, selectedId, details, loadDetail]);

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
      <div className="hidden min-w-0 bg-surface lg:block lg:h-[calc(100dvh-3.5rem)] lg:overflow-y-auto">
        {!wide ? null : selected ? (
          <Preview paper={selected} />
        ) : error ? (
          <PreviewUnavailable message="The papers will open here once the library loads." />
        ) : selectedId && unavailable === selectedId ? (
          <PreviewUnavailable message="This paper didn't load just now." onRetry={() => {
              setUnavailable(null);
              loadDetail(selectedId);
            }} />
        ) : (
          <PreviewSkeleton />
        )}
      </div>
      <aside
        aria-label="Margin notes"
        className="hidden lg:sticky lg:top-14 lg:block lg:h-[calc(100dvh-3.5rem)] lg:self-start lg:overflow-y-auto lg:border-l lg:border-line"
      >
        {!wide ? null : selected?.reading ? (
          <PaperNotes paper={selected} reading={selected.reading} aiEnabled={config?.ai_enabled ?? false} />
        ) : error || selected || unavailable === selectedId ? null : (
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
