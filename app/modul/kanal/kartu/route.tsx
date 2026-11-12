import { ImageResponse } from "next/og";
import KanalCardArt from "@/components/modul/kanal/KanalCardArt";
import { parseSharedCanal } from "@/lib/kartu/kanalCard";
import { CARD_FONTS } from "@/lib/kartu/cardFonts";
import { CARD_SIZE, parseCardFormat } from "@/lib/kartu/anatomiCard";

/** Gambar kartu hasil Modul Kanal (PNG), sumber yang sama dengan Modul Anatomi dan Bara. */
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
