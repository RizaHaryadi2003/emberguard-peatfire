import type { Metadata } from "next";
import AnatomiModule from "@/components/modul/anatomi/AnatomiModule";
import ModuleFooter from "@/components/modul/shared/ModuleFooter";
import { ANATOMI_HOOK } from "@/config/modul/anatomi";

export const metadata: Metadata = {
  title: "Anatomi Gambut — Emberguard",
  description: `${ANATOMI_HOOK.setup} ${ANATOMI_HOOK.question}`,
};

// Halaman Modul Anatomi: diorama interaktif, lalu navigasi antarmodul.
export default function AnatomiPage() {
  return (
    <main className="bg-black">
      <AnatomiModule />
      <ModuleFooter href="/modul/anatomi" />
    </main>
  );
}
