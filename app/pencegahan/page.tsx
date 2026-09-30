import type { Metadata } from "next";
import ComingSoon from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Pencegahan — Emberguard" };

export default function PencegahanPage() {
  return (
    <ComingSoon
      eyebrow="Bagian 04"
      title="Pencegahan"
      description="Pilih tindakan yang tepat dan lihat langsung bagaimana lahan gambut terlindungi."
    />
  );
}
