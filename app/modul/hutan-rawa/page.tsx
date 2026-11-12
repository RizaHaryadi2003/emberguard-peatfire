import type { Metadata } from "next";
import HutanModule from "@/components/modul/hutan-rawa/HutanModule";
import { HUTAN_HOOK } from "@/config/modul/hutan-rawa";

export const metadata: Metadata = {
  title: "Hutan Rawa Gambut — Emberguard",
  description: `${HUTAN_HOOK.setup} ${HUTAN_HOOK.question}`,
};

// Halaman Modul 03: satu layar penuh, tanpa gulir — sama seperti modul lain.
export default function HutanRawaPage() {
  return (
    <main className="h-[100dvh] overflow-hidden bg-black">
      <HutanModule />
    </main>
  );
}
