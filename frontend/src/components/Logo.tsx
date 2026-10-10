/** The Paper2Lab mark: a page whose bottom corner turns into a lab flask, in the journal's claret. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <rect width="32" height="32" rx="5" className="fill-claret-700" />
      <path d="M9 6.5h9.5L23 11v6.5H9Z" fill="white" />
      <path d="M18.5 6.5V11H23" fill="none" stroke="#ecc5c8" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M11.5 10h4.5M11.5 13h7" stroke="#b0444f" strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M13.5 17.5v3l-4 5.2a.8.8 0 0 0 .6 1.3h11.8a.8.8 0 0 0 .6-1.3l-4-5.2v-3"
        fill="white"
        stroke="white"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M11.3 24h9.4l1.3 1.9H10Z" fill="#dd9ca1" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="font-serif text-[1.45rem] font-semibold tracking-tight">
        Paper<span className="text-accent italic">2</span>Lab
      </span>
    </span>
  );
}
