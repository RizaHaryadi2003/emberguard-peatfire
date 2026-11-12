import { ImageResponse } from "next/og";
import ResultCardArt from "@/components/modul/anatomi/ResultCardArt";
import { CARD_FONTS } from "@/lib/cardFonts";
import { CARD_SIZE, parseCardFormat, parseSharedWaterCm } from "@/lib/resultCard";

/**
 * Gambar kartu hasil Modul Anatomi (PNG). Satu sumber untuk pratinjau di dialog,
 * berkas unduhan, dan pratinjau tautan di media sosial, sehingga ketiganya
 * selalu sama. Isinya hanya bergantung pada alamat, jadi aman disimpan lama.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const format = parseCardFormat(params.get("format"));
  const waterCm = parseSharedWaterCm(params.get("muka"));
  const host = request.headers.get("host") ?? "";

  return new ImageResponse(<ResultCardArt waterCm={waterCm} format={format} host={host} />, {
    ...CARD_SIZE[format],
    fonts: [...CARD_FONTS],
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
