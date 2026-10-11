import { ImageResponse } from "next/og";

// The picture shown when a link to Paper2Lab is shared (LinkedIn, Slack, WhatsApp, …): the journal's
// title page. The masthead centred over a double rule, the promise in the serif, the levels in the typewriter.
export const alt = "Paper2Lab: read any research paper at your level";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#f6f1e7";
const INK = "#1c1814";
const CLARET = "#7d2230";
const MUTED = "#5b5349";

/** Fetches one cut of a Google font as TrueType, which is what the image renderer reads. */
async function font(family: string, axes: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}:${axes}`, { headers: { "User-Agent": "curl" } })).text();
    const url = /src: url\((https:[^)]+\.ttf)\)/.exec(css)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function Image() {
  const [roman, italic, mono] = await Promise.all([
    font("Newsreader", "opsz,wght@72,500"),
    font("Newsreader", "ital,opsz,wght@1,72,500"),
    font("IBM+Plex+Mono", "wght@400"),
  ]);
  const fonts = [
    roman && { name: "Newsreader", data: roman, style: "normal" as const, weight: 500 as const },
    italic && { name: "Newsreader", data: italic, style: "italic" as const, weight: 500 as const },
    mono && { name: "Plex Mono", data: mono, style: "normal" as const, weight: 400 as const },
  ].filter((f) => !!f);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "56px 80px",
          background: PAPER,
          color: INK,
          fontFamily: "Newsreader",
        }}
      >
        <div style={{ display: "flex", width: "100%", justifyContent: "space-between", fontFamily: "Plex Mono", fontSize: 20, color: MUTED }}>
          <span>A reader for research papers</span>
          <span>paper2lab</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", marginTop: 28, fontSize: 112, letterSpacing: -3, lineHeight: 1 }}>
          <span>Paper</span>
          <span style={{ fontSize: 56, color: CLARET, marginTop: 6, marginLeft: 2 }}>2</span>
          <span style={{ fontStyle: "italic", marginLeft: 4 }}>Lab</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: 5, marginTop: 30 }}>
          <div style={{ display: "flex", height: 2, background: INK }} />
          <div style={{ display: "flex", height: 1, background: INK }} />
        </div>
        <div style={{ display: "flex", marginTop: 40, fontSize: 58, fontStyle: "italic", lineHeight: 1.1, textAlign: "center" }}>
          Read any research paper at your level.
        </div>
        <div style={{ display: "flex", marginTop: 18, fontSize: 28, lineHeight: 1.35, color: MUTED, textAlign: "center", maxWidth: 900 }}>
          Every section explained three ways, and every explanation pinned to the paper&apos;s own words.
        </div>
        <div style={{ display: "flex", marginTop: "auto", gap: 40, fontFamily: "Plex Mono", fontSize: 24 }}>
          <span style={{ color: MUTED }}>i. new to this</span>
          <span style={{ color: CLARET, borderBottom: `2px solid ${CLARET}`, paddingBottom: 4 }}>ii. student</span>
          <span style={{ color: MUTED }}>iii. expert</span>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
