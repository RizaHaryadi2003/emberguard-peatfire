import type { Metadata } from "next";
import BaraModule from "@/components/gambut/bara/BaraModule";

export const metadata: Metadata = { title: "Bara di Bawah Tanah — Emberguard" };

// Halaman Modul 02: satu layar penuh, tanpa gulir.
//
// Modul 01 memakai panggung `sticky` sehingga gulirnya adalah bagian dari
// cerita: tiap tahap terbuka saat pembaca menggulir. Modul 02 tidak begitu —
// babaknya berpindah lewat tombol, sehingga gulir hanya menyingkap pita hitam
// kosong di bawah adegan. Karena itu `ModuleFooter` tidak dipakai di sini dan
// halaman dikunci setinggi layar.
//
// Navigasi antarmodul tetap ada: lewat bilah di tepi atas, dan lewat kartu
// ringkasan yang muncul setelah bara berhasil dipadamkan.
export default function BaraPage() {
  return (
    <main className="h-[100dvh] overflow-hidden bg-black">
      <BaraModule />
    </main>
  );
}
