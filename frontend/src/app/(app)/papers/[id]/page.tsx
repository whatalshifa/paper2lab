import type { Metadata } from "next";

import { PaperPage } from "@/components/PaperPage";
import { isPaperId, pageMetadata, SAMPLES } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/papers/[id]">): Promise<Metadata> {
  const { id } = await params;
  if (!isPaperId(id)) return { title: "Paper not found" };
  const sample = SAMPLES.find((s) => s.id === id);
  if (sample) return pageMetadata({ title: sample.title, description: sample.description, path: `/papers/${id}` });
  // Anyone else's paper is private to the browser that added it (the API answers 404 to everyone else), so
  // search engines are kept out. The tab shows the paper's title once it has loaded.
  return { title: "Paper", robots: { index: false, follow: false } };
}

export default async function Page({ params }: PageProps<"/papers/[id]">) {
  const { id } = await params;
  return <PaperPage id={id} />;
}
