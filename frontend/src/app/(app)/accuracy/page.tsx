import { AccuracyPage } from "@/components/AccuracyPage";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "How accurate is Paper2Lab?",
  description:
    "Every quote Paper2Lab shows is checked word for word against the paper's PDF. Here are the numbers, across every paper explained.",
  path: "/accuracy",
});

export default function Page() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8 sm:py-14">
      <AccuracyPage />
    </div>
  );
}
