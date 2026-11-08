import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import ResultCardArt from "@/components/gambut/anatomi/ResultCardArt";
import { CARD_SIZE, parseCardFormat, parseSharedWaterCm } from "@/lib/resultCard";

// Font tidak bergantung pada permintaan, jadi cukup dibaca sekali.
const fontPath = (name: string) => join(process.cwd(), "assets/fonts", name);
const [playfair, inter, interSemi] = await Promise.all([
  readFile(fontPath("playfair-display-latin-500-italic.woff")),
  readFile(fontPath("inter-latin-400-normal.woff")),
  readFile(fontPath("inter-latin-600-normal.woff")),
]);

/**
 * Gambar kartu hasil Modul 01 (PNG). Satu sumber untuk pratinjau di dialog,
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
    fonts: [
      { name: "Playfair", data: playfair, weight: 500, style: "italic" },
      { name: "Inter", data: inter, weight: 400, style: "normal" },
      { name: "Inter", data: interSemi, weight: 600, style: "normal" },
    ],
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
