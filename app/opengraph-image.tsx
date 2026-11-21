import { HEADING } from "@/config/hero-content";
import { previewImage } from "@/lib/preview/previewImage";

// Gambar pratinjau tautan untuk seluruh situs, dibuat sekali saat build.
// Halaman modul punya gambarnya sendiri (app/modul/<nama>/opengraph-image.tsx).
export const alt = `Emberguard: ${HEADING.line1} ${HEADING.line2}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return previewImage({ kicker: "Media edukasi pencegahan karhutla", setup: HEADING.line1, question: HEADING.line2 });
}
