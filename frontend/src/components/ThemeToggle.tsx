"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";
const KEY = "p2l-theme";
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

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    // Read after mounting: the server can't know what the browser saved.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(readTheme());
    const media = matchMedia("(prefers-color-scheme: dark)");
    const follow = () => readTheme() === "system" && apply("system");
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  }, []);

  function cycle() {
    const next = NEXT[theme ?? "system"];
    try {
      if (next === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {}
    apply(next);
    setTheme(next);
  }

  const current = theme ?? "system";
  return (
    <button
      type="button"
      onClick={cycle}
      title={LABEL[current]}
      aria-label={`${LABEL[current]}. Click to change.`}
      className="icon-btn"
    >
      {current === "light" && <Sun className="h-5 w-5" aria-hidden />}
      {current === "dark" && <Moon className="h-5 w-5" aria-hidden />}
      {current === "system" && <Monitor className="h-5 w-5" aria-hidden />}
    </button>
  );
}
