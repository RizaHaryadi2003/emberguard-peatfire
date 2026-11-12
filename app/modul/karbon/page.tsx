import type { Metadata } from "next";
import KarbonModule from "@/components/modul/karbon/KarbonModule";

export const metadata: Metadata = { title: "Gudang Karbon — Emberguard" };

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
