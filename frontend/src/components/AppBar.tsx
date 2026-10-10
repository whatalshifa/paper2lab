"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { CommandBar } from "./CommandBar";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/library", label: "Library", match: (path: string) => path.startsWith("/library") || path.startsWith("/papers") },
  { href: "/accuracy", label: "Accuracy", match: (path: string) => path.startsWith("/accuracy") },
  { href: "/", label: "About", match: (path: string) => path === "/" },
];

/**
 * The app bar: one thin row across the top of every page, like a reading app's toolbar. The mark,
 * the command bar (add a paper or find one in the library), three places to go and the theme switch.
 * On phones the places fold into a menu.
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
    <header className="sticky top-0 z-40 border-b border-line bg-background print:hidden">
      <div className="flex h-12 items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <Link href="/library" aria-label="Paper2Lab library" className="flex h-9 shrink-0 items-center rounded-md lg:w-[15.5rem]">
          <Logo compact />
        </Link>
        <div className="flex min-w-0 flex-1 justify-center">
          <CommandBar />
        </div>
        <nav aria-label="Main" className="hidden items-center md:flex">
          {NAV.map((item) => {
            const active = item.match(path);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-2.5 py-1.5 text-[0.8125rem] font-medium transition-colors ${
                  active ? "text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <ThemeToggle />
        <button
          ref={button}
          type="button"
          className="icon-btn -mr-1 md:hidden"
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label="Menu"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </div>
      <div id="site-menu" ref={panel} hidden={!open} className="border-t border-line md:hidden">
        <nav aria-label="Main" className="px-3 py-2">
          <ul>
            {NAV.map((item) => {
              const active = item.match(path);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={`flex h-11 items-center rounded-md px-3 text-[0.9375rem] font-medium ${
                      active ? "bg-sunken text-foreground" : "text-muted hover:bg-sunken hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
