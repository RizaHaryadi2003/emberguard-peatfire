import type { Metadata } from "next";
import { headers } from "next/headers";
import BaraModule from "@/components/gambut/bara/BaraModule";
import { BARA_HOOK } from "@/config/bara-content";
import { baraCardImagePath, parseSharedBurn } from "@/lib/baraCard";
import { CARD_SIZE } from "@/lib/resultCard";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// Pratinjau tautan memakai gambar kartu; media sosial mewajibkan alamat utuh.
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const requestHeaders = await headers();
  const protocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0] ?? "http";
  const image = `${protocol}://${requestHeaders.get("host")}${baraCardImagePath(parseSharedBurn(params.dalam, params.muncul), "og")}`;
  const title = "Bara di Bawah Tanah — Emberguard";
  const description = `${BARA_HOOK.setup} ${BARA_HOOK.question}`;
  return { title, description, openGraph: { title, description, images: [{ url: image, ...CARD_SIZE.og }] }, twitter: { card: "summary_large_image" } };
}

// Halaman Modul 03: satu layar penuh, tanpa gulir.
//
// Modul 01 memakai panggung `sticky` sehingga gulirnya adalah bagian dari
// cerita: tiap tahap terbuka saat pembaca menggulir. Modul 03 tidak begitu —
// babaknya berpindah lewat tombol, sehingga gulir hanya menyingkap pita hitam
// kosong di bawah adegan. Karena itu `ModuleFooter` tidak dipakai di sini dan
// halaman dikunci setinggi layar.
//
// Navigasi antarmodul tetap ada: lewat bilah di tepi atas, dan lewat kartu
// ringkasan yang muncul setelah bara berhasil dipadamkan.
export default async function BaraPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <main className="h-[100dvh] overflow-hidden bg-black">
      <BaraModule shared={parseSharedBurn(params.dalam, params.muncul)} />
    </main>
  );
}
