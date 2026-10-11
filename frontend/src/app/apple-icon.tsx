import { ImageResponse } from "next/og";

// The home-screen icon on iPhones and iPads: the favicon's "P²" monogram (app/icon.svg), drawn larger.
// iOS rounds the corners itself, so the square stays square here.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f6f1e7" }}>
        <svg width="180" height="180" viewBox="-4 -4 40 40">
          <path
            fill="#1c1814"
            fillRule="evenodd"
            d="M3 6h10.5c5 0 7.5 2.4 7.5 5.8 0 3.6-2.6 6-7.5 6H10v6.5h2.6V26H3v-1.7h2.6V7.7H3ZM10 7.7h3c2.8 0 3.8 1.7 3.8 4.1 0 2.5-1 4.3-3.8 4.3H10Z"
          />
          <path
            fill="none"
            stroke="#7d2230"
            strokeWidth="1.7"
            strokeLinejoin="miter"
            d="M22.6 7.2c0-1.9 1.3-3 3-3s2.9 1 2.9 2.6c0 2-2 3.4-5.6 6.4h6"
          />
        </svg>
      </div>
    ),
    size,
  );
}
