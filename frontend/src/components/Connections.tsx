"use client";

import { useEffect, useState } from "react";

import { api, type Connections, type HubItem, type Reference } from "@/lib/api";

import { Out } from "./Glyphs";

/** What the paper connects to (references, code, models, datasets). Looked up by the API the
 * first time anyone opens the paper; missing parts simply aren't shown. */
export function useConnections(paperId: string) {
  const [connections, setConnections] = useState<Connections | null>(null);
  useEffect(() => {
    let live = true;
    api
      .connections(paperId)
      .then((result) => live && setConnections(result))
      .catch(() => {}); // extra information: without it the page is still complete
    return () => {
      live = false;
    };
  }, [paperId]);
  return connections;
}

export function hasLinks(connections: Connections | null) {
  return Boolean(connections && connections.code.length + connections.models.length + connections.datasets.length > 0);
}

function ReferenceItem({ reference }: { reference: Reference }) {
  const authors = reference.authors.join(", ") + (reference.more_authors ? " and others" : "");
  return (
    <li className="space-y-1.5 py-4">
      <p className="flex flex-wrap items-center gap-2">
        {reference.url ? (
          <a href={reference.url} target="_blank" rel="noopener noreferrer" className="font-serif text-[1.0625rem] font-medium italic hover:text-accent hover:underline">
            {reference.title}
          </a>
        ) : (
          <span className="font-serif text-[1.0625rem] font-medium italic">{reference.title}</span>
        )}
        {reference.influential && <span className="badge text-accent">Key reference</span>}
      </p>
      <p className="font-mono text-[0.6875rem] text-muted">{[authors, reference.year].filter(Boolean).join(" · ")}</p>
      {reference.tldr && <p className="text-sm leading-relaxed">{reference.tldr}</p>}
      {reference.context && (
        <p className="text-sm leading-relaxed text-muted">
          Cited where this paper says: <span className="font-serif italic">&ldquo;{reference.context}&rdquo;</span>
        </p>
      )}
    </li>
  );
}

function HubList({ title, items }: { title: string; items: HubItem[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="eyebrow">{title}</h3>
      <ul className="mt-2 space-y-1 font-mono text-[0.75rem]">
        {items.map((item) => (
          <li key={item.id}>
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="link break-all">
              {item.id}
              <Out className="ml-1" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** "Papers this one builds on" and "Code, models and data", near the end of the reading. */
export function ConnectionsSection({ connections }: { connections: Connections | null }) {
  const references = connections?.references?.items ?? [];
  if (!connections || (references.length === 0 && !hasLinks(connections))) return null;
  return (
    <section id="builds-on" className="scroll-mt-32 space-y-8 border-t border-rule pt-8" aria-labelledby="builds-on-title">
      <h2 id="builds-on-title" className="font-serif text-[1.875rem] font-normal tracking-[-0.01em] italic">
        What this paper connects to
      </h2>
      {references.length > 0 && (
        <div>
          <h3 className="eyebrow">Papers it builds on</h3>
          <p className="mt-1 text-sm text-muted">
            The most important of its {connections.references?.total} references first, each with a one-line summary.
            From{" "}
            <a href="https://www.semanticscholar.org" target="_blank" rel="noopener noreferrer" className="link">
              Semantic Scholar
            </a>
            .
          </p>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {references.map((reference) => (
              <ReferenceItem key={`${reference.title}-${reference.year}`} reference={reference} />
            ))}
          </ul>
        </div>
      )}
      {hasLinks(connections) && (
        <div className="grid gap-6 sm:grid-cols-3">
          {connections.code.length > 0 && (
            <div>
              <h3 className="eyebrow">Code</h3>
              <ul className="mt-2 space-y-1 font-mono text-[0.75rem]">
                {connections.code.map((link) => (
                  <li key={link.url}>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="link break-all">
                      {link.label}
                      <Out className="ml-1" />
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-1 font-serif text-[0.875rem] text-muted italic">Linked in the paper itself.</p>
            </div>
          )}
          <HubList title="Models on Hugging Face" items={connections.models} />
          <HubList title="Datasets on Hugging Face" items={connections.datasets} />
        </div>
      )}
    </section>
  );
}
