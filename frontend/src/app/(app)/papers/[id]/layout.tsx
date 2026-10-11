import { notFound } from "next/navigation";

import { isPaperId } from "@/lib/site";

/**
 * Turns away addresses that can't be a paper with a real 404 (see ../not-found.tsx). The check sits in a
 * layout, above the page's loading skeleton, so it runs before anything is sent.
 */
export default async function PaperLayout({ children, params }: LayoutProps<"/papers/[id]">) {
  const { id } = await params;
  if (!isPaperId(id)) notFound();
  return children;
}
