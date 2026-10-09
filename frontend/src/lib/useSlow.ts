import { useEffect, useState } from "react";

/**
 * True once something has been loading for a while. The free API server sleeps when nobody uses
 * it, and the first request after that takes up to a minute, so pages say so instead of looking
 * stuck.
 */
export function useSlow(loading: boolean, after = 4000) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!loading) return;
    const timer = window.setTimeout(() => setSlow(true), after);
    return () => {
      window.clearTimeout(timer);
      setSlow(false);
    };
  }, [loading, after]);
  return loading && slow;
}

export const WAKING_UP = "Waking the server up after a quiet spell. This can take up to a minute the first time.";
