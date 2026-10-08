"use client";

import { type ReactNode, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const WIDTH = 352; // px, 22rem
const GAP = 8;
const EDGE = 12;

/**
 * A card that appears next to its trigger: on hover with a mouse, on keyboard focus, and on a tap
 * (which also keeps it open until you tap elsewhere or press Escape). Used for equations, equation
 * references and glossary terms, so all three behave the same on a laptop and a phone.
 *
 * The card is drawn at the end of <body> and placed by measuring the trigger, so it is never cut off
 * by a scrolling box and never pushes past the screen edge.
 */
export function Hovercard({
  trigger,
  children,
  label,
  triggerClassName,
  block = false,
}: {
  trigger: ReactNode;
  children: ReactNode;
  label: string;
  triggerClassName?: string;
  block?: boolean;
}) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const viewport = document.documentElement.clientWidth;
    const width = Math.min(WIDTH, viewport - 2 * EDGE);
    const left = Math.min(Math.max(rect.left, EDGE), viewport - width - EDGE);
    setPosition({ top: rect.bottom + window.scrollY + GAP, left: left + window.scrollX, width });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { passive: true });
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place);
    };
  }, [open, place]);

  useEffect(() => {
    if (!pinned) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !cardRef.current?.contains(target)) {
        setPinned(false);
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [pinned]);

  const show = () => {
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hideSoon = () => {
    if (pinned) return;
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  };
  const close = () => {
    setPinned(false);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={label}
        className={triggerClassName}
        style={block ? { display: "block", width: "100%" } : undefined}
        onPointerEnter={(event) => event.pointerType === "mouse" && show()}
        onPointerLeave={(event) => event.pointerType === "mouse" && hideSoon()}
        onFocus={show}
        onBlur={(event) => {
          if (!cardRef.current?.contains(event.relatedTarget as Node)) hideSoon();
        }}
        onClick={() => {
          if (pinned) close();
          else {
            setPinned(true);
            show();
          }
        }}
        onKeyDown={(event) => event.key === "Escape" && close()}
      >
        {trigger}
      </button>
      {open &&
        position &&
        createPortal(
          <div
            ref={cardRef}
            id={id}
            role="dialog"
            aria-label={label}
            className="card absolute z-50 p-4 text-left text-sm shadow-xl shadow-black/10 dark:shadow-black/40"
            style={{ top: position.top, left: position.left, width: position.width }}
            onPointerEnter={(event) => event.pointerType === "mouse" && show()}
            onPointerLeave={(event) => event.pointerType === "mouse" && hideSoon()}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                close();
                triggerRef.current?.focus();
              }
            }}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}
