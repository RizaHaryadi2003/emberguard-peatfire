import type { Metadata } from "next";
import { headers } from "next/headers";
import KanalModule from "@/components/modul/kanal/KanalModule";
import { KANAL_HOOK } from "@/config/modul/kanal";
import { kanalCardImagePath, parseSharedCanal } from "@/lib/kartu/kanalCard";
import { CARD_SIZE } from "@/lib/kartu/anatomiCard";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// Pratinjau tautan memakai gambar kartu; media sosial mewajibkan alamat utuh.
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const requestHeaders = await headers();
  const protocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0] ?? "http";
  const image = `${protocol}://${requestHeaders.get("host")}${kanalCardImagePath(parseSharedCanal(params.kanal, params.tebak), "og")}`;
  const title = "Kanal & Pengeringan — Emberguard";
  const description = `${KANAL_HOOK.setup} ${KANAL_HOOK.question}`;
  return { title, description, openGraph: { title, description, images: [{ url: image, ...CARD_SIZE.og }] }, twitter: { card: "summary_large_image" } };
}

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
