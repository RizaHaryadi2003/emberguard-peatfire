import type { Metadata } from "next";
import QuizRunner from "@/components/kuis/QuizRunner";
import { MAIN_QUIZ } from "@/config/kuis";

export const metadata: Metadata = { title: "Kuis — Emberguard" };

// Kuis utama: 10 soal dari kelima bagian (Bab III). Soalnya di config/kuis.ts.
export default function KuisPage() {
  return <QuizRunner items={MAIN_QUIZ} />;
}
