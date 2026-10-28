import type { Quality } from "@/components/gambut/scene/dioramaConstants";

export { QUALITY_PROFILE, type Quality } from "@/components/gambut/scene/dioramaConstants";

/**
 * Keadaan yang dibagi antara antarmuka (DOM) dan adegan 3D.
 *
 * Disimpan dalam ref dan dibaca tiap bingkai, sehingga menggeser pengatur
 * kedalaman bakar tidak memicu render ulang seluruh kanvas — pola yang sama
 * dengan `BaraState` pada Modul 02 dan `KanalState` pada Modul 03.
 */
export type KarbonState = {
  /** Babak aktif (0-3). */
  act: number;
  /** Kedalaman bakar yang diminta pembaca (m). */
  burnDepthM: number;
  /**
   * Kedalaman bakar yang sedang digambar, dihaluskan sendiri oleh adegan.
   *
   * Dipisahkan dari `burnDepthM` supaya menggeser pengatur tidak membuat
   * permukaan melompat: yang digeser pembaca nilai sasarannya, dan yang
   * digambar nilai inilah.
   */
  drawnBurnM: number;
  /** Tebal timbunan baru yang sedang digambar (m), juga dihaluskan. */
  drawnRegrownM: number;
  /** Kecepatan waktu pemulihan (tahun per detik nyata). */
  yearsPerSecond: number;
  /**
   * Kedalaman penanda pembaca (m), atau null bila belum menandai.
   *
   * Tugas babak 01. Dikirim ke peneduh sebagai angka negatif bila null,
   * sebab GLSL tidak punya null — dan penjagaannya ada di satu tempat saja,
   * di `KarbonScene`, supaya tidak ada yang lupa menerjemahkannya.
   */
  probeDepthM: number | null;
  /**
   * Kekuatan penggaris abad (0-1), dihaluskan oleh adegan.
   *
   * Dinyalakan penuh pada babak 01 — babak yang memang tentang umur — lalu
   * diredupkan, tidak dimatikan, pada babak-babak sesudahnya. Dimatikan sama
   * sekali, bidang potongnya kembali menjadi tanah biasa dan pembaca
   * kehilangan satu-satunya hal yang membuat "50 cm" berarti "lima ratus
   * tahun" pada babak 02.
   */
  calendar: number;
  /**
   * Tingkat bahaya kebakaran (0-1), dibaca `SkyLighting` untuk menyetel
   * langit.
   *
   * Di sini ia diambil dari dalamnya kebakaran. Jadi langit modul ini
   * menguning karena gambutnya sedang habis terbakar — sambungan langsung ke
   * Modul 02, tempat pembaca pertama kali melihat langit yang sama menguning
   * oleh asap bara di bawah tanah.
   */
  danger: number;
  /** Pengguna meminta gerak dikurangi. */
  reducedMotion: boolean;
};

/** Keadaan awal modul: gambut utuh yang belum tersentuh api. */
export function createKarbonState(): KarbonState {
  return {
    act: 0,
    burnDepthM: 0,
    drawnBurnM: 0,
    drawnRegrownM: 0,
    yearsPerSecond: 0,
    probeDepthM: null,
    calendar: 0,
    danger: 0,
    reducedMotion: false,
  };
}

/** Mutu grafis yang dipakai adegan ini. */
export type KarbonQuality = Quality;
