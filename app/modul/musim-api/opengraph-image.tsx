import { MUSIM_HOOK } from "@/config/modul/musim-api";
import { modulePreview } from "@/lib/preview/previewImage";

// Gambar pratinjau tautan modul ini, dibuat sekali saat build.
export const alt = `${MUSIM_HOOK.setup} ${MUSIM_HOOK.question}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return modulePreview("/modul/musim-api", MUSIM_HOOK);
}
