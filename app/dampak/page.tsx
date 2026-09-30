import type { Metadata } from "next";
import ComingSoon from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Dampak — Emberguard" };

export default function DampakPage() {
  return (
    <ComingSoon
      eyebrow="Bagian 03"
      title="Dampak"
      description="Ikuti asap dari lahan yang terbakar hingga ke kota, udara, dan kesehatan kita."
    />
  );
}
