import type { MetadataRoute } from "next";

import { SAMPLE_IDS, SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, priority: 1 },
    { url: `${SITE_URL}/accuracy`, priority: 0.6 },
    ...SAMPLE_IDS.map((id) => ({ url: `${SITE_URL}/papers/${id}`, priority: 0.8 })),
  ];
}
