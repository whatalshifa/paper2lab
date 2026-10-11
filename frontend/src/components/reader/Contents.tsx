import type { Reading } from "@/lib/api";

import { OVERVIEW } from "./pages";

const CONTENTS_LINK = "block py-1.5 leading-snug transition-colors";

/** The paper's table of contents, with the page being read marked. Each entry opens its page. */
export function Contents({
  reading,
  active,
  hasMap,
  hasConnections,
  onNavigate,
}: {
  reading: Reading;
  active: string | null;
  hasMap: boolean;
  hasConnections: boolean;
  onNavigate?: () => void;
}) {
  const quiet = `${CONTENTS_LINK} pl-6 text-muted hover:text-foreground`;
  // The overview, what it connects to and the glossary are pages of their own too.
  const pageLink = (key: string) => ({
    "aria-current": active === key ? ("page" as const) : undefined,
    className: active === key ? `${CONTENTS_LINK} pl-6 text-foreground italic` : quiet,
  });
  return (
    <ol className="border-t border-rule font-serif text-[0.9375rem]">
      <li>
        <a href="#nutshell" onClick={onNavigate} {...pageLink(OVERVIEW)}>
          Overview
        </a>
      </li>
      {hasMap && (
        <li>
          <a href="#before-you-read" onClick={onNavigate} className={quiet}>
            Before you read
          </a>
        </li>
      )}
      {reading.sections.map((section, i) => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            onClick={onNavigate}
            aria-current={active === section.id ? "page" : undefined}
            className={`${CONTENTS_LINK} flex gap-2 ${
              active === section.id
                ? "text-foreground italic"
                : "text-muted hover:text-foreground"
            }`}
          >
            <span className={`w-4 shrink-0 text-right ${active === section.id ? "text-accent" : ""}`}>{i + 1}</span>
            <span>{section.title}</span>
          </a>
        </li>
      ))}
      {hasConnections && (
        <li>
          <a href="#builds-on" onClick={onNavigate} {...pageLink("builds-on")}>
            What it connects to
          </a>
        </li>
      )}
      {reading.concepts.length > 0 && (
        <li>
          <a href="#glossary" onClick={onNavigate} {...pageLink("glossary")}>
            Glossary
          </a>
        </li>
      )}
    </ol>
  );
}
