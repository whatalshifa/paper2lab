"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { CommandBar } from "./CommandBar";
import { PaperInkSwitch } from "./PaperInk";
import { Wordmark } from "./Wordmark";

// The home page is rarely where a reader goes next, and it is the heaviest page to fetch ahead (it carries
// the sample papers), so the app doesn't prefetch it.
const NAV = [
  { href: "/library", label: "Library", prefetch: true, match: (path: string) => path.startsWith("/library") || path.startsWith("/papers") },
  { href: "/accuracy", label: "Accuracy", prefetch: true, match: (path: string) => path.startsWith("/accuracy") },
  { href: "/", label: "About", prefetch: false, match: (path: string) => path === "/" },
];

/**
 * The app's masthead, folded to one line: the wordmark as a running head, the command bar (add a paper or
 * find one in the library), three places to go in the typewriter face and the Paper / Ink switch, over a
 * double rule. On phones the places fold into a menu.
 */
export function AppBar() {
  const path = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  // Close the menu after navigating.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the route changed, so the menu has done its job
    setOpen(false);
  }, [path]);

  // Escape closes the menu and puts focus back on its button; opening it moves focus to the first link.
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-double border-rule bg-background print:hidden">
      <div className="flex h-[calc(3.5rem-3px)] items-center gap-2 px-3 sm:gap-4 sm:px-5">
        <Link href="/library" aria-label="Paper2Lab library" className="flex h-10 shrink-0 items-center lg:w-[15rem]">
          <Wordmark size="running" />
        </Link>
        <div className="flex min-w-0 flex-1 justify-center">
          <CommandBar />
        </div>
        <nav aria-label="Main" className="hidden items-center gap-1 font-mono text-[0.75rem] md:flex">
          {NAV.map((item) => {
            const active = item.match(path);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={item.prefetch ? undefined : false}
                aria-current={active ? "page" : undefined}
                className={`px-2 py-1.5 underline-offset-[6px] transition-colors ${
                  active ? "text-foreground underline decoration-accent decoration-2" : "text-muted hover:text-foreground hover:underline"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <span aria-hidden className="hidden h-5 w-px bg-line md:block" />
        <div className="hidden md:block">
          <PaperInkSwitch />
        </div>
        <button
          ref={button}
          type="button"
          className="icon-btn -mr-1 w-14 border-line md:hidden"
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label="Menu"
          onClick={() => setOpen((value) => !value)}
        >
          <span aria-hidden>{open ? "Close" : "Menu"}</span>
        </button>
      </div>
      <div id="site-menu" ref={panel} hidden={!open} className="border-t border-rule md:hidden">
        <nav aria-label="Main" className="px-3 py-2">
          <ul>
            {NAV.map((item) => {
              const active = item.match(path);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch={item.prefetch ? undefined : false}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={`flex h-12 items-baseline gap-3 border-b border-line px-1 pt-3 font-serif text-[1.25rem] ${
                      active ? "text-foreground italic" : "text-muted hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="flex items-center justify-between px-4 pb-3 font-mono text-[0.75rem] text-muted">
          <span>Theme</span>
          <PaperInkSwitch />
        </div>
      </div>
    </header>
  );
}
