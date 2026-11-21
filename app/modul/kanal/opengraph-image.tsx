import { KANAL_HOOK } from "@/config/modul/kanal";
import { modulePreview } from "@/lib/preview/previewImage";

// Gambar pratinjau tautan modul ini, dibuat sekali saat build.
export const alt = `${KANAL_HOOK.setup} ${KANAL_HOOK.question}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return modulePreview("/modul/kanal", KANAL_HOOK);
}
