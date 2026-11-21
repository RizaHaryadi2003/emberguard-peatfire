import { SEKITARMU_HOOK } from "@/config/modul/sekitarmu";
import { modulePreview } from "@/lib/preview/previewImage";

// Gambar pratinjau tautan modul ini, dibuat sekali saat build.
export const alt = `${SEKITARMU_HOOK.setup} ${SEKITARMU_HOOK.question}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return modulePreview("/modul/sekitarmu", SEKITARMU_HOOK);
}
