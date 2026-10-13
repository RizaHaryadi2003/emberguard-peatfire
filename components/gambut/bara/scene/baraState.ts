import { BLOCK_WIDTH } from "@/components/gambut/scene/dioramaConstants";
import { CELL_W, GRID_COLS, type SmolderSim } from "@/lib/smolder";
import type { ViewMode } from "@/config/bara-content";

// Ukuran diorama & arah matahari dipakai bersama dengan Modul 01 supaya
// bongkahan gambut pada kedua modul benar-benar sama.
export {
  BLOCK_DEPTH,
  BLOCK_WIDTH,
  DIORAMA_Y,
  QUALITY_PROFILE,
  SUN_DIRECTION,
  type Quality,
} from "@/components/gambut/scene/dioramaConstants";

/**
 * Keadaan yang dibagi antara antarmuka (DOM) dan adegan 3D. Disimpan dalam ref
 * dan dibaca tiap bingkai, sehingga menggeser pengatur tidak memicu render
 * ulang seluruh kanvas.
 */
export type BaraState = {
  /** Babak aktif (0–3). */
  act: number;
  /** Tampilan penampang: nyata atau citra termal. */
  view: ViewMode;
  /** Kecepatan waktu simulasi (jam simulasi per detik nyata). */
  hoursPerSecond: number;
  /** Muka air tanah yang dituju (m di bawah permukaan). */
  waterM: number;
  /** Pengguna meminta gerak dikurangi. */
  reducedMotion: boolean;
  /** Kekuatan nyala di permukaan saat penyulutan (0–1). */
  flame: number;
  /** Berapa cepat nyala itu surut tiap detik (1 / lama nyala). */
  flameDecay: number;
  /** Posisi sulutan pada lebar bongkahan (0–1). */
  flameX: number;
  /** Animasi semburan air ke permukaan (0–1). */
  spray: number;
  /** Putaran diorama ke kiri/kanan oleh seretan pembaca (radian). */
  rotation: number;
  /** Jungkitan diorama ke atas/bawah oleh seretan pembaca (radian). */
  tilt: number;
  /**
   * Jarak tempuh seretan terakhir dalam piksel. Dipakai untuk membedakan
   * seretan dari klik: tanpa ini, memutar bongkahan akan sekaligus menyulut
   * atau memeriksa titik yang kebetulan berada di bawah kursor saat dilepas.
   */
  dragMoved: number;
  /** Nilai yang dihaluskan oleh adegan sendiri. */
  thermal: number;
  danger: number;
};

/**
 * Putaran kiri/kanan tidak dibatasi: diorama dapat diputar penuh satu putaran.
 *
 * Bongkahan ini dipotong separuh, jadi dari belakang yang terlihat hanya
 * dinding tanah tanpa penampang. Itu bukan kerusakan — badannya tertutup
 * rapat oleh dinding dan kedua tutupnya — melainkan sisi lain benda yang sama,
 * dan memang berguna untuk memastikan bentuknya. Yang perlu diurus hanyalah
 * keterangan: lihat SceneLabels, yang menyembunyikan dirinya begitu bidang
 * potong berpaling dari kamera.
 */

/**
 * Batas jungkitan ke atas dan ke bawah (radian).
 *
 * Tidak simetris, karena kedua arah tidak sama gunanya. Menunduk sampai 0,55
 * radian memperlihatkan permukaan tanah dari atas — justru itu yang dibahas
 * babak 03: dari atas, kebakaran ini nyaris tidak terlihat. Menengadah hanya
 * memperlihatkan dasar bongkahan yang tidak menyimpan apa pun, jadi cukup
 * sedikit saja agar bentuknya tetap terasa tiga dimensi.
 */
export const BARA_MAX_TILT_DOWN = 0.7;
export const BARA_MAX_TILT_UP = 0.35;

/** Seretan dianggap putaran, bukan klik, setelah melewati jarak ini (piksel). */
export const DRAG_THRESHOLD = 5;

/** Keadaan awal modul. */
export function createBaraState(waterM: number): BaraState {
  return {
    act: 0,
    view: "permukaan",
    hoursPerSecond: 0,
    waterM,
    reducedMotion: false,
    flame: 0,
    flameDecay: 1,
    flameX: 0.5,
    spray: 0,
    rotation: 0,
    tilt: 0,
    dragMoved: 0,
    thermal: 0,
    danger: 0,
  };
}

/** Penurunan permukaan per kolom, dihitung ulang berkala dari simulasi. */
export type Subsidence = {
  /** Penurunan permukaan (m) pada posisi x (meter, 0 di tengah bongkahan). */
  fn: (x: number) => number;
  /** Bertambah setiap kali nilainya berubah, agar geometri tahu harus dibentuk ulang. */
  version: number;
  /** Hitung ulang dari keadaan simulasi sekarang. */
  refresh: () => void;
};

/**
 * Pelacak penurunan permukaan. Nilai per kolom dihaluskan dengan rata-rata
 * bergerak agar permukaan melesak mulus, bukan bergerigi mengikuti kisi.
 */
export function createSubsidence(sim: SmolderSim): Subsidence {
  const raw = new Float32Array(GRID_COLS);
  const smooth = new Float32Array(GRID_COLS);
  const tracker: Subsidence = {
    version: 0,
    fn: (x: number) => {
      const f = (x + BLOCK_WIDTH / 2) / CELL_W - 0.5;
      const i = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(f)));
      const j = Math.min(GRID_COLS - 1, i + 1);
      const t = Math.max(0, Math.min(1, f - i));
      return smooth[i] + (smooth[j] - smooth[i]) * t;
    },
    refresh: () => {
      for (let col = 0; col < GRID_COLS; col++) raw[col] = sim.subsidenceAt(col);
      // Jari-jari perataan. Tiga kolom hanya setara 14 cm pada bongkahan
      // selebar 4,4 m, sehingga tepi kawah menjadi tebing hampir tegak dan
      // hamparan permukaan di atasnya terlihat seperti papan tipis yang
      // dilihat dari samping. Sebelas kolom (± 50 cm) membuat tanah di sekitar
      // rongga melandai, seperti tanah yang ambles sungguhan.
      const radius = 11;
      for (let col = 0; col < GRID_COLS; col++) {
        let sum = 0;
        let n = 0;
        for (let k = col - radius; k <= col + radius; k++) {
          if (k < 0 || k >= GRID_COLS) continue;
          sum += raw[k];
          n++;
        }
        smooth[col] = sum / n;
      }
      tracker.version++;
    },
  };
  return tracker;
}

/**
 * Simpangan pandang yang masih dianggap "menghadap penampang" (radian).
 *
 * Putaran dibatasi lebih ketat daripada jungkitan karena keduanya tidak sama
 * akibatnya: memutar sedikit saja sudah memiringkan bidang potong sehingga
 * kedalaman tidak lagi terbaca jujur, sedangkan menunduk justru dianjurkan
 * pada babak 03 — dari atas, kebakaran ini nyaris tidak terlihat.
 */
export const FACING_YAW_TOLERANCE = 0.18;
export const FACING_TILT_TOLERANCE = 0.3;

const TAU = Math.PI * 2;

/**
 * Benarkah diorama sudah dipalingkan jauh dari hadapan penampang?
 *
 * Dipakai untuk memunculkan tombol "Kembali ke penampang". Tanpa tombol itu
 * pembaca yang memutar bongkahan sampai melihat punggungnya harus menyeret
 * balik dengan jarak yang sama persis untuk menemukan penampangnya lagi —
 * dan karena putaran tidak dibatasi, ia bisa tersesat beberapa putaran jauhnya.
 */
export function isTurnedAway(s: BaraState): boolean {
  return Math.abs(signedYaw(s.rotation)) > FACING_YAW_TOLERANCE || Math.abs(s.tilt) > FACING_TILT_TOLERANCE;
}

/**
 * Putaran terdekat yang menghadapkan penampang kembali ke kamera.
 *
 * Putaran penuh bukan simpangan: pada 2π penampang sudah menghadap kamera
 * lagi. Yang dicari karena itu bukan nol, melainkan kelipatan 2π terdekat,
 * supaya diorama berputar balik lewat jalan terpendek alih-alih memutar
 * mundur sebanyak putaran yang sudah ditempuh pembaca.
 */
export function nearestFacing(rotation: number): number {
  return Math.round(rotation / TAU) * TAU;
}

/** Sisa putaran terhadap kelipatan 2π terdekat, dalam rentang −π…π. */
function signedYaw(rotation: number): number {
  return rotation - nearestFacing(rotation);
}
