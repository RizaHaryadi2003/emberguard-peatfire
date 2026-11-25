import { SUKSESI_HOOK } from "@/config/modul/suksesi-gagal";
import { modulePreview } from "@/lib/preview/previewImage";

// Gambar pratinjau tautan modul ini, dibuat sekali saat build.
export const alt = `${SUKSESI_HOOK.setup} ${SUKSESI_HOOK.question}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return modulePreview("/modul/suksesi-gagal", SUKSESI_HOOK);
}
