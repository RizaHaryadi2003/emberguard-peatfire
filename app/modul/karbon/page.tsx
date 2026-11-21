import type { Metadata } from "next";
import KarbonModule from "@/components/modul/karbon/KarbonModule";
import { KARBON_HOOK } from "@/config/modul/karbon";

export const metadata: Metadata = {
  title: "Gudang Karbon — Emberguard",
  description: `${KARBON_HOOK.setup} ${KARBON_HOOK.question}`,
};

// Halaman Modul Karbon: satu layar penuh, tanpa gulir — sama seperti Modul Kanal
// dan Bara. Babaknya berpindah lewat tombol, jadi gulir hanya akan menyingkap pita
// hitam kosong di bawah bongkahan.
export default function KarbonPage() {
  return (
    <main className="h-[100dvh] overflow-hidden bg-black">
      <KarbonModule />
    </main>
  );
}
