import type { PeatLayerId } from "@/lib/peat";

// Ukuran diorama, arah matahari, dan batas putaran dipakai bersama dengan modul
// lain; diteruskan di sini agar berkas Modul 01 cukup mengimpor dari satu tempat.
export {
  BLOCK_DEPTH,
  BLOCK_WIDTH,
  DIORAMA_Y,
  MAX_ROTATION,
  QUALITY_PROFILE,
  SUN_DIRECTION,
  type Quality,
} from "@/components/gambut/scene/dioramaConstants";

/**
 * Keadaan yang dibagi antara antarmuka (DOM) dan adegan 3D.
 * Disimpan dalam ref dan dibaca tiap bingkai oleh `useFrame`, sehingga
 * menggeser pengatur tidak memicu render ulang seluruh kanvas.
 */
export type SceneState = {
  /** Tahap cerita aktif (0–3). */
  step: number;
  /** Kedalaman muka air tanah yang dituju (cm di bawah permukaan). */
  waterCm: number;
  /** Lapisan yang sedang disorot (dari kursor di 3D atau di legenda). */
  hovered: PeatLayerId | null;
  /** Lapisan yang dipilih (diklik) pada tahap lapisan terurai; maju ke depan kamera. */
  focused: PeatLayerId | null;
  /** Pengguna meminta gerak dikurangi. */
  reducedMotion: boolean;
  /** Putaran balok hasil seret pengguna (radian, sumbu Y). */
  rotation: number;
  /**
   * Nilai yang dihitung adegan sendiri tiap bingkai lalu dibagikan antar-komponen
   * 3D: tingkat urai lapisan (0–1) dan tingkat bahaya yang sudah dihaluskan (0–1).
   */
  explode: number;
  danger: number;
};

/** Jarak renggang antarlapisan saat tampilan "diurai" (m). */
export const EXPLODE_GAP = 0.34;

/** Tahap yang memakai tampilan lapisan terurai. */
export const EXPLODE_STEP = 1;

/** Tahap yang memberi kendali muka air kepada pengguna. */
export const INTERACTIVE_STEP = 3;
