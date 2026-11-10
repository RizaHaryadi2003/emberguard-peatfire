import { ImageResponse } from "next/og";
import BaraCardArt from "@/components/gambut/bara/BaraCardArt";
import { parseSharedBurn } from "@/lib/baraCard";
import { CARD_FONTS } from "@/lib/cardFonts";
import { CARD_SIZE, parseCardFormat } from "@/lib/resultCard";

/** Gambar kartu hasil Modul 02 (PNG), sumber yang sama dengan Modul 01. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const format = parseCardFormat(params.get("format"));
  const shared = parseSharedBurn(params.get("dalam"), params.get("muncul"));
  const host = request.headers.get("host") ?? "";

  return new ImageResponse(<BaraCardArt shared={shared} format={format} host={host} />, {
    ...CARD_SIZE[format],
    fonts: [...CARD_FONTS],
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
