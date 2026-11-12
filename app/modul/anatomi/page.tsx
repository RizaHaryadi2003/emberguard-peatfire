import type { Metadata } from "next";
import { headers } from "next/headers";
import AnatomiModule from "@/components/gambut/anatomi/AnatomiModule";
import ModuleFooter from "@/components/gambut/ModuleFooter";
import { ANATOMI_HOOK } from "@/config/gambut-content";
import { CARD_SIZE, cardImagePath, parseSharedWaterCm } from "@/lib/resultCard";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// Pratinjau tautan memakai gambar kartu; media sosial mewajibkan alamat utuh.
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const waterCm = parseSharedWaterCm((await searchParams).muka);
  const requestHeaders = await headers();
  const protocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0] ?? "http";
  const image = `${protocol}://${requestHeaders.get("host")}${cardImagePath(waterCm, "og")}`;
  const description = `${ANATOMI_HOOK.setup} ${ANATOMI_HOOK.question}`;
  return {
    title: "Anatomi Gambut — Emberguard",
    description,
    openGraph: { title: "Anatomi Gambut — Emberguard", description, images: [{ url: image, ...CARD_SIZE.og }] },
    twitter: { card: "summary_large_image" },
  };
}

// Halaman Modul 01: diorama interaktif, lalu navigasi antarmodul.
export default async function AnatomiPage({ searchParams }: Props) {
  const sharedWaterCm = parseSharedWaterCm((await searchParams).muka);
  return (
    <main className="bg-black">
      <AnatomiModule sharedWaterCm={sharedWaterCm} />
      <ModuleFooter href="/modul/anatomi" />
    </main>
  );
}
