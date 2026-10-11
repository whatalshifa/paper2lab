import type { Metadata } from "next";

/** The site's public address: SITE_URL if set, else the address Vercel gives the production site. */
export const SITE_URL =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

/** The sample papers everyone can open (backend/app/samples), with what a shared link to one says. */
export const SAMPLES = [
  {
    id: "00000000-0000-4000-8000-000000001706",
    title: "Attention Is All You Need",
    description:
      "Vaswani et al. (2017), the Transformer paper, explained section by section at three reading levels, with every equation in words and every explanation backed by a quote from the PDF.",
  },
  {
    id: "00000000-0000-4000-8000-000000001412",
    title: "Adam: A Method for Stochastic Optimization",
    description:
      "Kingma and Ba (2015), the Adam optimizer, explained section by section at three reading levels, with every equation in words and every explanation backed by a quote from the PDF.",
  },
];

export const SAMPLE_IDS = SAMPLES.map((sample) => sample.id);

/** Every paper's id is a UUID; any other address under /papers/ can't be a paper. */
export function isPaperId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/** The link preview every page shares (app/opengraph-image.tsx). */
const PREVIEW = { url: "/opengraph-image", width: 1200, height: 630, alt: "Paper2Lab: read any research paper at your level" };

/** A page's title, description, canonical address and link preview, in one place. */
export function pageMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  const shared = `${title} · Paper2Lab`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: "Paper2Lab", title: shared, description, url: path, images: [PREVIEW] },
    twitter: { card: "summary_large_image", title: shared, description, images: [PREVIEW] },
  };
}
