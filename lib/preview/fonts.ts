import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Fon gambar pratinjau tautan. Gambarnya dibuat sekali saat build, jadi fon
// cukup dibaca sekali dari assets/fonts.
const fontPath = (name: string) => join(process.cwd(), "assets/fonts", name);

const [playfair, inter, interSemi] = await Promise.all([
  readFile(fontPath("playfair-display-latin-500-italic.woff")),
  readFile(fontPath("inter-latin-400-normal.woff")),
  readFile(fontPath("inter-latin-600-normal.woff")),
]);

export const PREVIEW_FONTS = [
  { name: "Playfair", data: playfair, weight: 500, style: "italic" },
  { name: "Inter", data: inter, weight: 400, style: "normal" },
  { name: "Inter", data: interSemi, weight: 600, style: "normal" },
] as const;
