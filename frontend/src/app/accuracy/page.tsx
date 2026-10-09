import type { Metadata } from "next";

import { AccuracyPage } from "@/components/AccuracyPage";

export const metadata: Metadata = {
  title: "How accurate is Paper2Lab?",
  description:
    "Every quote Paper2Lab shows is checked word for word against the paper's PDF. Here are the numbers, across every paper explained.",
};

export default function Page() {
  return <AccuracyPage />;
}
