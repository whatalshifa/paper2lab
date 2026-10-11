/**
 * The press has no icon set. Where another site would draw an icon, Paper2Lab sets a character from the
 * type: an arrow for "go on", a north-east arrow for "leaves this site", a pilcrow, a section sign, a dagger.
 * They are decoration for sighted readers, so screen readers skip them; the words beside them carry the meaning.
 */
export function Go({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`font-serif not-italic ${className}`}>
      →
    </span>
  );
}

export function Out({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`font-serif text-[0.9em] not-italic ${className}`}>
      ↗
    </span>
  );
}

export function Back({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`font-serif not-italic ${className}`}>
      ←
    </span>
  );
}

/** Any other single character used as a mark: ¶, §, †, ‡, ✓, ✗, ·. */
export function Mark({ children, className = "" }: { children: string; className?: string }) {
  return (
    <span aria-hidden className={`font-serif not-italic ${className}`}>
      {children}
    </span>
  );
}
