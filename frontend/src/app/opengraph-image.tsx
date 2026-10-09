import { ImageResponse } from "next/og";

// The picture shown when a link to Paper2Lab is shared (LinkedIn, Slack, WhatsApp, …).
export const alt = "Paper2Lab: read any research paper at your level";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const LEVELS = ["New to this", "Student", "Expert"];

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#faf9f6",
          color: "#1c1917",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="72" height="72" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="9" fill="#4338ca" />
            <path d="M9 6.5h9.5L23 11v6.5H9Z" fill="#fff" />
            <path d="M11.5 10h4.5M11.5 13h7" stroke="#6366f1" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M13.5 17.5v3l-4 5.2a.8.8 0 0 0 .6 1.3h11.8a.8.8 0 0 0 .6-1.3l-4-5.2v-3" fill="#fff" />
            <path d="M11.3 24h9.4l1.3 1.9H10Z" fill="#a5b4fc" />
          </svg>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>Paper2Lab</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
            Read any research paper at your level.
          </div>
          <div style={{ fontSize: 32, color: "#57534e" }}>
            Every section explained, every equation decoded, every claim backed by the paper&apos;s own words.
          </div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {LEVELS.map((level, i) => (
            <div
              key={level}
              style={{
                display: "flex",
                padding: "12px 28px",
                borderRadius: 999,
                fontSize: 28,
                fontWeight: 600,
                background: i === 1 ? "#4338ca" : "#eef2ff",
                color: i === 1 ? "#fff" : "#4338ca",
              }}
            >
              {level}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
