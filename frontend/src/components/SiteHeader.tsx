"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/#library", label: "Library", match: (path: string) => path === "/" || path.startsWith("/papers") },
  { href: "/accuracy", label: "Accuracy", match: (path: string) => path.startsWith("/accuracy") },
];

/** The site header: the name, two places to go and the theme switch. On phones the places fold into a menu. */
export function SiteHeader() {
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
    <header className="border-b border-line print:hidden">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Paper2Lab home" className="rounded-md">
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
            {NAV.map((item) => {
              const active = item.match(path);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-sunken text-foreground" : "text-muted hover:text-foreground"
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
            className="icon-btn sm:hidden"
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label="Menu"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>
      <div id="site-menu" ref={panel} hidden={!open} className="border-t border-line sm:hidden">
        <nav aria-label="Main" className="mx-auto max-w-6xl px-4 py-2">
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
