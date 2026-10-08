import { PaperPage } from "@/components/PaperPage";

export default async function Page({ params }: PageProps<"/papers/[id]">) {
  const { id } = await params;
  return <PaperPage id={id} />;
}
