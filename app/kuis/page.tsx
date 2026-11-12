import type { Metadata } from "next";
import ComingSoon from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Kuis — Emberguard" };

export default function KuisPage() {
  return (
    <ComingSoon
      eyebrow="Kuis"
      title="Kuis"
      description="Uji pemahamanmu tentang gambut, api, dampak, dan pencegahannya, lalu bagikan hasilmu."
    />
  );
}
