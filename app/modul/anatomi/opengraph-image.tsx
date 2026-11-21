import { ANATOMI_HOOK } from "@/config/modul/anatomi";
import { modulePreview } from "@/lib/preview/previewImage";

// Gambar pratinjau tautan modul ini, dibuat sekali saat build.
export const alt = `${ANATOMI_HOOK.setup} ${ANATOMI_HOOK.question}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return modulePreview("/modul/anatomi", ANATOMI_HOOK);
}
