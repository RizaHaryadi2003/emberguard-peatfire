import type { Metadata } from "next";
import KanalModule from "@/components/gambut/kanal/KanalModule";

export const metadata: Metadata = { title: "Kanal & Pengeringan — Emberguard" };

// Halaman Modul 02: satu layar penuh, tanpa gulir — sama seperti Modul 03.
// Babaknya berpindah lewat tombol, jadi gulir hanya akan menyingkap pita hitam
// kosong di bawah penampang.
export default function KanalPage() {
  return (
    <main className="h-[100dvh] overflow-hidden bg-black">
      <KanalModule />
    </main>
  );
}
