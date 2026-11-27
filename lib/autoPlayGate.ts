// Aturan putar otomatis animasi air di beranda (useHeroScroll).
//
// Animasi air berjalan menurut waktu, bukan mengikuti gulir, agar gerak
// lambatnya selalu mulus. Ia dimulai saat pembaca menggulir melewati
// "gerbang" pada urutan beranda. Selama berjalan, halaman ditahan; gulir ke
// bawah mempercepatnya ke akhir, gulir ke atas memutarnya mundur.
// Aturan di sini murni (tanpa DOM) agar mudah diuji.

/** Kecepatan saat pembaca minta dilewati, dan saat diputar mundur. */
export const SKIP_SPEED = 5;
export const REWIND_SPEED = 3;
/** Lebih jauh dari ini (kelipatan tinggi layar) dari gerbang = lompat, bukan gulir biasa. */
export const FAR_SCREENS = 0.6;
/** Gerak roda/jempol lebih kecil dari ini (px) dianggap tidak sengaja. */
const MIN_DELTA = 4;

export type Intent = "skip" | "back" | null;

/** Maksud pembaca dari satu gerak roda tetikus atau usapan (px, positif = ke bawah). */
export function scrollIntent(deltaY: number): Intent {
  if (deltaY > MIN_DELTA) return "skip";
  if (deltaY < -MIN_DELTA) return "back";
  return null;
}

/** Maksud pembaca dari tombol papan ketik yang biasa dipakai menggulir. */
export function keyIntent(key: string): Intent {
  if (["ArrowDown", "PageDown", " ", "End"].includes(key)) return "skip";
  if (["ArrowUp", "PageUp", "Home"].includes(key)) return "back";
  return null;
}

export type GateAction = "play" | "finish" | "rewind" | "reset";

/**
 * Tindakan saat posisi gulir melintasi gerbang. `distance` = posisi gulir
 * dikurangi posisi gerbang (px). Melintas sedikit = gulir biasa → putar atau
 * mundur dengan animasi. Melintas jauh (bilah gulir diseret, halaman dimuat
 * ulang di tengah, lompat lewat tautan) → langsung ke keadaan akhir/awal.
 */
export function gateAction(direction: number, distance: number, viewportHeight: number): GateAction {
  const far = Math.abs(distance) > FAR_SCREENS * viewportHeight;
  if (direction >= 0) return far ? "finish" : "play";
  return far ? "reset" : "rewind";
}

/**
 * Penjaga tiap kali posisi gulir berubah: animasi tidak boleh tertinggal
 * dari posisi halaman. Jauh di depan gerbang → harus sudah selesai; jauh di
 * belakangnya → harus kembali ke awal. Selebihnya biarkan.
 */
export function guardAction(distance: number, viewportHeight: number, progress: number): "finish" | "reset" | null {
  if (distance > FAR_SCREENS * viewportHeight && progress < 1) return "finish";
  if (distance < -FAR_SCREENS * viewportHeight && progress > 0) return "reset";
  return null;
}
