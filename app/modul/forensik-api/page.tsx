import type { Metadata } from "next";
import ForensikModule from "@/components/modul/forensik-api/ForensikModule";
import { FORENSIK_HOOK } from "@/config/modul/forensik-api";

export const metadata: Metadata = {
  title: "Forensik Api — Emberguard",
  description: `${FORENSIK_HOOK.setup} ${FORENSIK_HOOK.question}`,
};

// Halaman Modul 06: satu layar penuh, tanpa gulir — sama seperti modul lain.
export default function ForensikApiPage() {
  return (
    <main className="h-[100dvh] overflow-hidden bg-black">
      <ForensikModule />
    </main>
  );
}
