import { HUTAN_HOOK } from "@/config/modul/hutan-rawa";
import { modulePreview } from "@/lib/preview/previewImage";

// Gambar pratinjau tautan modul ini, dibuat sekali saat build.
export const alt = `${HUTAN_HOOK.setup} ${HUTAN_HOOK.question}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return modulePreview("/modul/hutan-rawa", HUTAN_HOOK);
}
