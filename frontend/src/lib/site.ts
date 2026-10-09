/** The site's public address: SITE_URL if set, else the address Vercel gives the production site. */
export const SITE_URL =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const SAMPLE_IDS = ["00000000-0000-4000-8000-000000001706", "00000000-0000-4000-8000-000000001412"];
