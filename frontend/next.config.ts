import type { NextConfig } from "next";

const apiUrl = process.env.API_URL ?? "http://localhost:8000";
const isDev = process.env.NODE_ENV === "development";

// What the pages may load: only this website's own scripts, styles, fonts and images. Inline
// scripts and styles are allowed because Next and KaTeX use them; nothing from other sites is.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Produces a small self-contained server, used by the Docker image.
  output: "standalone",
  experimental: {
    // Forwarded uploads are buffered up to this size; papers can be 20 MB plus form overhead.
    proxyClientMaxBodySize: "25mb",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
      {
        // Pages only: PDFs and figures from /api open in the browser's own viewer, which the
        // policy would block.
        source: "/((?!api/).*)",
        headers: [{ key: "Content-Security-Policy", value: contentSecurityPolicy }],
      },
    ];
  },
  // The browser calls /api/* on the website's own address and Next forwards it to FastAPI.
  // One address means the library cookie is first-party and there is no CORS to configure.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
