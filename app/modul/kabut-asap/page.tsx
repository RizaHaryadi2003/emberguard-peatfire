import type { Metadata } from "next";
import KabutAsapModule from "@/components/modul/kabut-asap/KabutAsapModule";
import { KABUT_HOOK } from "@/config/modul/kabut-asap";

export const metadata: Metadata = {
  title: "Kabut Asap — Emberguard",
  description: `${KABUT_HOOK.setup} ${KABUT_HOOK.question}`,
};

// Halaman Modul 09: satu layar penuh, tanpa gulir — sama seperti modul lain.
export default function KabutAsapPage() {
  return (
    <main className="h-[100dvh] overflow-hidden bg-black">
      <KabutAsapModule />
    </main>
  );
}
