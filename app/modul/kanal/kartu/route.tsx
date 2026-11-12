import { ImageResponse } from "next/og";
import KanalCardArt from "@/components/modul/kanal/KanalCardArt";
import { parseSharedCanal } from "@/lib/kanalCard";
import { CARD_FONTS } from "@/lib/cardFonts";
import { CARD_SIZE, parseCardFormat } from "@/lib/resultCard";

/** Gambar kartu hasil Modul 02 (PNG), sumber yang sama dengan Modul 01 dan 03. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const format = parseCardFormat(params.get("format"));
  const shared = parseSharedCanal(params.get("kanal"), params.get("tebak"));
  const host = request.headers.get("host") ?? "";

  return new ImageResponse(<KanalCardArt shared={shared} format={format} host={host} />, {
    ...CARD_SIZE[format],
    fonts: [...CARD_FONTS],
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
