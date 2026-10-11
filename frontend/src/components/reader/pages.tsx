"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { Back, Go } from "../Glyphs";

export const OVERVIEW = "overview";

/** One page of the reader: the overview, a section, what the paper connects to, or the glossary. */
export type ReaderPage = { key: string; href: string; label: string };

/** The reader page that holds the element with this id, if any. */
function pageHolding(id: string) {
  if (!id) return null;
  return document.getElementById(id)?.closest<HTMLElement>("[data-page]")?.dataset.page ?? null;
}

/**
 * The reader shows one page of the paper at a time, like turning the pages of a journal: the overview,
 * one section, what the paper connects to, or the glossary. The address picks the page. Any id inside it
 * works, so #s3, #eq-… and #fig-… all open the right page and scroll to that spot, and the back button
 * turns back a page. Pages not shown are hidden "until found", so the browser's find in page still
 * searches the whole paper and opens the page with the match. Also says how far through the paper the
 * reader is (0 to 1).
 */
export function useReaderPage(pages: ReaderPage[]) {
  const [page, setPage] = useState(OVERVIEW);
  const [jump, setJump] = useState<{ id: string } | null>(null);
  const [within, setWithin] = useState(0);
  const keys = pages.map((p) => p.key).join(" ");
  const waiting = useRef(false);
  const pagesRef = useRef(pages);
  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  // Follow the address now and whenever its #hash changes. A hash for a page that isn't there yet
  // (what the paper connects to is looked up after the page opens) is followed once it appears.
  const follow = useCallback(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    const key = id ? pageHolding(id) : OVERVIEW;
    waiting.current = !key;
    if (!key) return;
    setPage(key);
    setJump({ id });
  }, []);
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the address when the page opens, before it paints
    follow();
    window.addEventListener("hashchange", follow);
    return () => window.removeEventListener("hashchange", follow);
  }, [follow]);
  useEffect(() => {
    if (waiting.current) follow();
  }, [keys, follow]);

  // Show the current page only.
  useLayoutEffect(() => {
    for (const element of document.querySelectorAll<HTMLElement>("[data-page]")) {
      if (element.dataset.page === page) element.removeAttribute("hidden");
      else element.setAttribute("hidden", "until-found");
    }
  }, [page, keys]);

  // Then scroll to the spot the address names, or to the top for the overview.
  useLayoutEffect(() => {
    if (!jump) return;
    const target = jump.id && jump.id !== "nutshell" ? document.getElementById(jump.id) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [jump]);

  // Find in page found a match on a hidden page: the browser shows it; keep the address in step.
  useEffect(() => {
    const found = (event: Event) => {
      const key = (event.target as HTMLElement).closest<HTMLElement>("[data-page]")?.dataset.page;
      const href = pagesRef.current.find((p) => p.key === key)?.href;
      if (!key || !href) return;
      setPage(key);
      window.history.replaceState(window.history.state, "", href);
    };
    document.addEventListener("beforematch", found);
    return () => document.removeEventListener("beforematch", found);
  }, []);

  // How far down the current page the reader has scrolled.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const room = document.documentElement.scrollHeight - window.innerHeight;
        const value = room > 0 ? Math.min(Math.max(window.scrollY / room, 0), 1) : page === OVERVIEW ? 0 : 1;
        setWithin((current) => (Math.abs(current - value) < 0.002 ? current : value));
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [page]);

  const index = Math.max(
    0,
    pages.findIndex((p) => p.key === page),
  );
  return { page, index, progress: pages.length > 0 ? Math.min((index + within) / pages.length, 1) : 0 };
}

/** The previous and next pages of the reader, at the foot of the page. */
export function Pager({ pages, index }: { pages: ReaderPage[]; index: number }) {
  const previous = pages[index - 1];
  const next = pages[index + 1];
  if (!previous && !next) return null;
  return (
    <nav aria-label="Pages" className="mt-12 grid grid-cols-2 gap-4 border-t-[3px] border-double border-rule pt-4">
      {previous ? (
        <a href={previous.href} className="group min-w-0 py-1">
          <span className="flex items-center gap-1.5 font-mono text-[0.6875rem] text-muted">
            <Back />
            Previous
          </span>
          <span className="mt-1 block font-serif text-[1.0625rem] leading-snug group-hover:text-accent group-hover:underline group-hover:underline-offset-4">
            {previous.label}
          </span>
        </a>
      ) : (
        <span />
      )}
      {next && (
        <a href={next.href} className="group col-start-2 min-w-0 py-1 text-right">
          <span className="flex items-center justify-end gap-1.5 font-mono text-[0.6875rem] text-muted">
            Next
            <Go />
          </span>
          <span className="mt-1 block font-serif text-[1.0625rem] leading-snug group-hover:text-accent group-hover:underline group-hover:underline-offset-4">
            {next.label}
          </span>
        </a>
      )}
    </nav>
  );
}
