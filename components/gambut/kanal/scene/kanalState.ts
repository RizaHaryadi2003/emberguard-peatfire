import type { Quality } from "@/components/gambut/scene/dioramaConstants";

export { QUALITY_PROFILE, type Quality } from "@/components/gambut/scene/dioramaConstants";

/**
 * Keadaan yang dibagi antara antarmuka (DOM) dan adegan 3D.
 *
 * Disimpan dalam ref dan dibaca tiap bingkai, sehingga menggeser pengatur
 * kedalaman kanal tidak memicu render ulang seluruh kanvas — pola yang sama
 * dengan `BaraState` pada Modul 02.
 */
export type KanalState = {
  /** Babak aktif (0-3). */
  act: number;
  /** Kedalaman kanal yang diminta pembaca (m). */
  canalDepthM: number;
  /** Kecepatan waktu (tahun simulasi per detik nyata). */
  yearsPerSecond: number;
  /** Kanal sudah disekat. */
  blocked: boolean;
  /** Pengguna meminta gerak dikurangi. */
  reducedMotion: boolean;
  /**
   * Kedalaman kanal yang sedang digambar, dihaluskan sendiri oleh adegan.
   *
   * Dipisahkan dari `canalDepthM` supaya menggeser pengatur tidak membuat
   * dinding kanal melompat: yang digeser pembaca nilai sasarannya, dan yang
   * digambar nilai inilah.
   */
  drawnCanalDepthM: number;
  /** Kekuatan penandaan daerah rawan (0-1), dihaluskan oleh adegan. */
  riskTint: number;
  /**
   * Tingkat bahaya kebakaran (0-1), dibaca `SkyLighting` untuk menyetel langit.
   *
   * Diambil dari bagian penampang yang muka airnya sudah melewati batas 40 cm.
   * Jadi langit di modul ini menguning bukan karena ada yang terbakar —
   * tidak ada api di sini — melainkan karena lahannya sudah siap terbakar.
   * Itu disengaja: inilah sambungan ke Modul 02, dan pembaca melihatnya di
   * langit sebelum ia membacanya di mana pun.
   */
  danger: number;
};

/** Keadaan awal modul: gambut yang belum tersentuh kanal. */
export function createKanalState(): KanalState {
  return {
    act: 0,
    canalDepthM: 0,
    yearsPerSecond: 0,
    blocked: false,
    reducedMotion: false,
    drawnCanalDepthM: 0,
    riskTint: 1,
    danger: 0,
  };
}

/** Mutu grafis yang dipakai adegan ini. */
export type KanalQuality = Quality;
