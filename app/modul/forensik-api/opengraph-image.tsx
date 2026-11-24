import { FORENSIK_HOOK } from "@/config/modul/forensik-api";
import { modulePreview } from "@/lib/preview/previewImage";

// Gambar pratinjau tautan modul ini, dibuat sekali saat build.
export const alt = `${FORENSIK_HOOK.setup} ${FORENSIK_HOOK.question}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return modulePreview("/modul/forensik-api", FORENSIK_HOOK);
}
