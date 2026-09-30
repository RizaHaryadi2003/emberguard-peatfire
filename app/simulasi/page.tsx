import type { Metadata } from "next";
import ComingSoon from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Simulasi — Emberguard" };

export default function SimulasiPage() {
  return (
    <ComingSoon
      eyebrow="Bagian 02"
      title="Simulasi"
      description="Atur angin, kelembapan, dan kekeringan, lalu coba hentikan api sebelum meluas."
    />
  );
}
