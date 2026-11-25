import type { Metadata } from "next";
import SuksesiGagalModule from "@/components/modul/suksesi-gagal/SuksesiGagalModule";
import { SUKSESI_HOOK } from "@/config/modul/suksesi-gagal";

export const metadata: Metadata = {
  title: "Suksesi Gagal — Emberguard",
  description: `${SUKSESI_HOOK.setup} ${SUKSESI_HOOK.question}`,
};

// Halaman Modul 10: satu layar penuh, tanpa gulir — sama seperti modul lain.
export default function SuksesiGagalPage() {
  return (
    <main className="h-[100dvh] overflow-hidden bg-black">
      <SuksesiGagalModule />
    </main>
  );
}
