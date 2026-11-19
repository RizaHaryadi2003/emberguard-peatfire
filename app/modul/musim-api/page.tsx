import type { Metadata } from "next";
import MusimApiModule from "@/components/modul/musim-api/MusimApiModule";
import { MUSIM_HOOK } from "@/config/modul/musim-api";

export const metadata: Metadata = {
  title: "Musim Api — Emberguard",
  description: `${MUSIM_HOOK.setup} ${MUSIM_HOOK.question}`,
};

// Halaman Modul 05: satu layar penuh, tanpa gulir — sama seperti modul lain.
export default function MusimApiPage() {
  return (
    <main className="h-[100dvh] overflow-hidden bg-black">
      <MusimApiModule />
    </main>
  );
}
