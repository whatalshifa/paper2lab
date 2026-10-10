"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";

/** A bottom sheet for phones: slides up over the page, closes with Escape, a tap outside or its button. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const id = useId();
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
      <button type="button" aria-label="Close" tabIndex={-1} className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className="absolute inset-x-0 bottom-0 flex max-h-[80dvh] flex-col rounded-t-xl border-t border-line bg-background shadow-2xl"
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line" aria-hidden />
        <div className="flex items-center justify-between gap-4 border-b border-line px-4 pt-1 pb-2">
          <h2 id={id} className="text-[0.9375rem] font-semibold">
            {title}
          </h2>
          <button ref={close} type="button" onClick={onClose} className="icon-btn -mr-2" aria-label={`Close ${title.toLowerCase()}`}>
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="overflow-y-auto px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}
