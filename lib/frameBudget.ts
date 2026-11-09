// Aturan murni pembatas render adegan 3D. Dipisah dari komponen agar mudah
// diuji tanpa WebGL. Tujuannya mengurangi beban perangkat tanpa mengubah
// tampilan: gambar penuh saat pembaca berinteraksi, lebih jarang saat ia diam.

/** Batas gambar per detik saat pembaca berinteraksi dan saat ia diam. */
export const FRAME_CAP = { active: 60, idle: 30 } as const;

/**
 * Lama adegan dianggap masih aktif setelah masukan terakhir (ms). Dibuat cukup
 * panjang agar gerak yang berlanjut sesudah klik, yaitu perpindahan kamera dan
 * demo otomatis yang berjalan sampai ± 3,8 detik, tetap penuh dan tidak tersendat.
 */
export const ACTIVE_WINDOW_MS = 4000;

/** Kelonggaran agar gambar tidak terlewat karena waktu layar sedikit meleset (ms). */
const TIMING_TOLERANCE_MS = 2;

/** Di bawah bagian ini dari batasnya, kecepatan dianggap tersendat. */
const SLOW_RATIO = 0.9;

/** Di bawah kecepatan ini, perangkat sudah kewalahan walau resolusi terendah. */
export const OVERLOAD_FPS = 24;

/** Jumlah jendela pengukuran berturut-turut sebelum mutu grafis diturunkan. */
export const OVERLOAD_WINDOWS = 3;

const DPR_STEP = 0.25;

export function getFrameCap(msSinceInput: number): number {
  return msSinceInput < ACTIVE_WINDOW_MS ? FRAME_CAP.active : FRAME_CAP.idle;
}

/**
 * Apakah gambar berikutnya sudah waktunya, dan kapan gambar sesudahnya.
 * Jadwal dimajukan dari jadwal sebelumnya, bukan dari waktu sekarang, supaya
 * rata-ratanya tetap tepat pada layar 75 atau 100 Hz yang tidak habis dibagi.
 */
export function advanceFrameClock(now: number, nextAt: number, cap: number): { due: boolean; nextAt: number } {
  if (now < nextAt - TIMING_TOLERANCE_MS) return { due: false, nextAt };
  const interval = 1000 / cap;
  const following = nextAt + interval;
  // Setelah jeda panjang, jadwal dimulai lagi; gambar yang terlewat tidak dikejar.
  return { due: true, nextAt: following < now ? now + interval : following };
}

export type FrameJudgement = { dpr: number; slowWindows: number; overload: boolean };

/**
 * Tindakan setelah satu jendela pengukuran. Resolusi diturunkan lebih dulu
 * karena hampir tidak terlihat; mutu grafis baru diturunkan bila pada
 * resolusi terendah pun perangkat tetap kewalahan beberapa kali berturut-turut.
 */
export function judgeFrameWindow(fps: number, cap: number, dpr: number, slowWindows: number): FrameJudgement {
  if (fps >= cap * SLOW_RATIO) return { dpr, slowWindows: 0, overload: false };
  if (dpr > 1) return { dpr: Math.max(1, dpr - DPR_STEP), slowWindows: 0, overload: false };
  if (fps >= OVERLOAD_FPS) return { dpr, slowWindows: 0, overload: false };
  const windows = slowWindows + 1;
  return windows >= OVERLOAD_WINDOWS ? { dpr, slowWindows: 0, overload: true } : { dpr, slowWindows: windows, overload: false };
}
