import { ImageResponse } from "next/og";
import BaraCardArt from "@/components/modul/bara/BaraCardArt";
import { parseSharedBurn } from "@/lib/kartu/baraCard";
import { CARD_FONTS } from "@/lib/kartu/cardFonts";
import { CARD_SIZE, parseCardFormat } from "@/lib/kartu/anatomiCard";

/** Gambar kartu hasil Modul Bara (PNG), sumber yang sama dengan Modul Anatomi. */
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
