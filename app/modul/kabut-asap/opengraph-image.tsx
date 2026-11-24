import { KABUT_HOOK } from "@/config/modul/kabut-asap";
import { modulePreview } from "@/lib/preview/previewImage";

// Gambar pratinjau tautan modul ini, dibuat sekali saat build.
export const alt = `${KABUT_HOOK.setup} ${KABUT_HOOK.question}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return modulePreview("/modul/kabut-asap", KABUT_HOOK);
}
