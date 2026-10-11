"use client";

import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";
const KEY = "p2l-theme";
const CHANGED = "p2l-theme-change";
const NEXT: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };
const LABEL: Record<Theme, string> = { system: "Theme: same as device", light: "Theme: light", dark: "Theme: dark" };

/** Runs in <head> before the page paints, so a dark-mode visitor never sees a white flash. */
// It also switches to light while printing, so a printed explanation is never white text on white paper.
export const THEME_SCRIPT = `(()=>{var h=document.documentElement,w;try{var t=localStorage.getItem("${KEY}");h.classList.toggle("dark",t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches))}catch(e){}addEventListener("beforeprint",function(){w=h.classList.contains("dark");h.classList.remove("dark")});addEventListener("afterprint",function(){if(w)h.classList.add("dark")})})()`;

function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

/**
 * The theme switch, set as type: "Paper / Ink". The one in use is inked and underlined; while it follows the
 * device, the word in use is underlined with dots and marked "auto". Each press goes Auto, Paper, Ink, Auto.
 */
export function PaperInkSwitch() {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // Read after mounting: the server can't know what the browser saved.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(readTheme());
    setDark(document.documentElement.classList.contains("dark"));
    const media = matchMedia("(prefers-color-scheme: dark)");
    const follow = () => {
      if (readTheme() !== "system") return;
      apply("system");
      setDark(media.matches);
    };
    // Another switch on the page (the app has one in its phone menu too) changed the theme.
    const sync = () => {
      setTheme(readTheme());
      setDark(document.documentElement.classList.contains("dark"));
    };
    media.addEventListener("change", follow);
    window.addEventListener(CHANGED, sync);
    return () => {
      media.removeEventListener("change", follow);
      window.removeEventListener(CHANGED, sync);
    };
  }, []);

  function cycle() {
    const next = NEXT[theme ?? "system"];
    try {
      if (next === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {}
    apply(next);
    window.dispatchEvent(new Event(CHANGED));
  }

  const current = theme ?? "system";
  const auto = current === "system";
  const word = (on: boolean, text: string) => (
    <span
      className={
        on
          ? `text-foreground underline underline-offset-[5px] ${auto ? "decoration-dotted" : "decoration-1"}`
          : "text-muted"
      }
    >
      {text}
    </span>
  );
  return (
    <button
      type="button"
      onClick={cycle}
      title={LABEL[current]}
      aria-label={`${LABEL[current]}. Click to change.`}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 px-1.5 font-mono text-[0.75rem] whitespace-nowrap transition-colors hover:text-foreground"
    >
      {word(!dark, "Paper")}
      <span className="text-muted" aria-hidden>
        /
      </span>
      {word(dark, "Ink")}
      {auto && <sup className="-ml-0.5 text-[0.625rem] text-muted">auto</sup>}
    </button>
  );
}
