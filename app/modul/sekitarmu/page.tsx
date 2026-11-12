import type { Metadata } from "next";
import SekitarmuModule from "@/components/modul/sekitarmu/SekitarmuModule";
import { SEKITARMU_HOOK } from "@/config/modul/sekitarmu";

export const metadata: Metadata = {
  title: "Gambut di Sekitarmu — Emberguard",
  description: `${SEKITARMU_HOOK.setup} ${SEKITARMU_HOOK.question}`,
};

// Halaman Modul 01: satu layar penuh, tanpa gulir — sama seperti modul lain.
export default function SekitarmuPage() {
  return (
    <main className="h-[100dvh] overflow-hidden bg-black">
      <SekitarmuModule />
    </main>
  );
}
