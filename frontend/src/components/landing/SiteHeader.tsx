import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Logo } from "../Logo";
import { ThemeToggle } from "../ThemeToggle";

const LINKS = [
  { href: "#the-page", label: "How it reads" },
  { href: "#accuracy", label: "Accuracy" },
  { href: "#shelf", label: "Papers" },
  { href: "#colophon", label: "About" },
];

/** The home page's own header: lighter than the app bar, with a way into the app. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-background/90 backdrop-blur-md print:hidden">
      <div className="mx-auto flex h-16 max-w-[76rem] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Paper2Lab home" className="flex h-10 shrink-0 items-center rounded-md">
          <Logo />
        </Link>
        <nav aria-label="On this page" className="ml-6 hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-[0.875rem] font-medium text-muted transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <Link href="/library" className="btn btn-primary btn-sm px-3.5 sm:px-4">
            Open the library
            <ArrowRight className="hidden h-4 w-4 sm:block" aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  );
}
