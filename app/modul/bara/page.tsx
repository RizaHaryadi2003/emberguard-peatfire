import type { Metadata } from "next";
import BaraModule from "@/components/modul/bara/BaraModule";
import { BARA_HOOK } from "@/config/modul/bara";

export const metadata: Metadata = {
  title: "Bara di Bawah Tanah — Emberguard",
  description: `${BARA_HOOK.setup} ${BARA_HOOK.question}`,
};

// Halaman Modul Bara: satu layar penuh, tanpa gulir.
//
// Modul Anatomi memakai panggung `sticky` sehingga gulirnya adalah bagian dari
// cerita: tiap tahap terbuka saat pembaca menggulir. Modul Bara tidak begitu —
// babaknya berpindah lewat tombol, sehingga gulir hanya menyingkap pita hitam
// kosong di bawah adegan. Karena itu `ModuleFooter` tidak dipakai di sini dan
// halaman dikunci setinggi layar.
//
// Navigasi antarmodul tetap ada: lewat bilah di tepi atas, dan lewat panah
// "Modul berikutnya" di babak terakhir.
export default function BaraPage() {
  return (
    <main className="h-[100dvh] overflow-hidden bg-black">
      <BaraModule />
    </main>
  );
}
