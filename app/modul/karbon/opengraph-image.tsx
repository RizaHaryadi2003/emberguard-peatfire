import { KARBON_HOOK } from "@/config/modul/karbon";
import { modulePreview } from "@/lib/preview/previewImage";

// Gambar pratinjau tautan modul ini, dibuat sekali saat build.
export const alt = `${KARBON_HOOK.setup} ${KARBON_HOOK.question}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return modulePreview("/modul/karbon", KARBON_HOOK);
}
