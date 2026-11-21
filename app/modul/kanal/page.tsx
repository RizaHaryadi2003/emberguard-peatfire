import type { Metadata } from "next";
import KanalModule from "@/components/modul/kanal/KanalModule";
import { KANAL_HOOK } from "@/config/modul/kanal";

export const metadata: Metadata = {
  title: "Kanal & Pengeringan — Emberguard",
  description: `${KANAL_HOOK.setup} ${KANAL_HOOK.question}`,
};

// Halaman Modul Kanal: satu layar penuh, tanpa gulir — sama seperti Modul Bara.
// Babaknya berpindah lewat tombol, jadi gulir hanya akan menyingkap pita hitam
// kosong di bawah penampang.
export default function KanalPage() {
  return (
    <main className="h-[100dvh] overflow-hidden bg-black">
      <KanalModule />
    </main>
  );
}
