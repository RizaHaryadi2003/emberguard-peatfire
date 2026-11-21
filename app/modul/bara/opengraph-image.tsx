import { BARA_HOOK } from "@/config/modul/bara";
import { modulePreview } from "@/lib/preview/previewImage";

// Gambar pratinjau tautan modul ini, dibuat sekali saat build.
export const alt = `${BARA_HOOK.setup} ${BARA_HOOK.question}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return modulePreview("/modul/bara", BARA_HOOK);
}
