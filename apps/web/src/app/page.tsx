import type { Metadata } from "next";
import { MarketingHome } from "@/components/marketing/MarketingHome";

export const metadata: Metadata = {
  title: "Malawi MANEB exam preparation",
  description:
    "PreMayeso helps Malawi learners prepare for MANEB exams with JCE lessons, revision support, past papers, and a clear Free to Premium path.",
};

export default function HomePage() {
  return <MarketingHome />;
}
