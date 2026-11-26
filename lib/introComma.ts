// Koreografi kursor → bola → titik → koma pada pembuka, mengikuti urutan di
// halaman acuan (lovefrom.com) yang direkam per ±33 ms:
//   1. kursor menyusut dari bawah ke atas;
//   2. sisa kursor menjadi bola kecil yang terlempar ke atas sambil membesar,
//      melayang sebentar di puncak, lalu jatuh di samping huruf terakhir;
//   3. bola menyentuh garis dasar sekejap, memantul ke puncak tangkai huruf
//      terakhir, diam, lalu meluncur turun di sisinya menjadi titik;
//   4. titik menumbuhkan ekor menjadi koma;
//   5. koma menggelinding ke kanan sambil berputar, diam, lalu menggelinding
//      kembali dan duduk di tempatnya.
//
// Satuan: 100 = 1 em dari ukuran huruf; asal (0, 0) di garis dasar tepat di
// kanan huruf terakhir; y ke bawah (negatif = di atas garis dasar).

/** Jari-jari bola/titik dan posisi akhir koma. */
export const DOT_R = 6.4;
export const REST_X = 7;

/** Keadaan yang dianimasikan. */
export type CommaState = {
  /** Ujung bawah garis kursor (naik saat kursor menyusut). */
  cursorBottom: number;
  /** Bola: posisi pusat, jari-jari, putaran (derajat, searah jarum jam), dan tumbuhnya ekor 0..1. */
  x: number;
  y: number;
  r: number;
  rot: number;
  tail: number;
};

/** Keadaan awal: kursor utuh, bola belum ada (di puncak kursor, jari-jari 0). */
export const COMMA_START: CommaState = { cursorBottom: 24, x: 4, y: -80, r: 0, rot: 0, tail: 0 };

/** Satu langkah: mulai `at` detik sesudah ketikan selesai, selama `dur`, menuju nilai `to`. */
export type CommaStep = { at: number; dur: number; to: Partial<CommaState>; ease: string };

export const COMMA_STEPS: CommaStep[] = [
  // 1. Kursor menyusut ke atas.
  { at: 0.35, dur: 0.2, to: { cursorBottom: -78 }, ease: "power2.in" },
  // 2. Bola terlempar ke atas sambil membesar, melayang, lalu jatuh di samping huruf.
  { at: 0.55, dur: 0.25, to: { x: 14, y: -150, r: DOT_R }, ease: "power2.out" },
  { at: 0.8, dur: 0.3, to: { x: 17, y: -156 }, ease: "sine.inOut" },
  { at: 1.1, dur: 0.35, to: { x: 15, y: -32 }, ease: "power2.in" },
  // 3. Sentuh garis dasar, memantul ke puncak tangkai, diam, lalu meluncur turun.
  { at: 1.45, dur: 0.06, to: { y: -DOT_R }, ease: "power1.in" },
  { at: 1.51, dur: 0.14, to: { x: -1, y: -76 }, ease: "power2.out" },
  { at: 2.18, dur: 0.07, to: { x: REST_X - 1 }, ease: "sine.in" },
  { at: 2.25, dur: 0.25, to: { x: REST_X, y: -DOT_R }, ease: "power2.in" },
  // 4. Ekor tumbuh: titik menjadi koma.
  { at: 2.55, dur: 0.12, to: { tail: 1 }, ease: "power2.out" },
  // 5. Menggelinding ke kanan, diam sejenak, lalu kembali dan duduk.
  { at: 2.7, dur: 0.24, to: { x: REST_X + 28, rot: 105 }, ease: "power1.out" },
  { at: 2.94, dur: 0.5, to: { rot: 99 }, ease: "sine.inOut" },
  { at: 3.44, dur: 0.4, to: { x: REST_X, rot: 0 }, ease: "back.out(1.6)" },
];

/** Lama seluruh koreografi (detik sesudah ketikan selesai). */
export const COMMA_DURATION = Math.max(...COMMA_STEPS.map((s) => s.at + s.dur));

/** Keadaan akhir bila semua langkah dijalankan berurutan. */
export function finalCommaState(): CommaState {
  return COMMA_STEPS.reduce((st, s) => ({ ...st, ...s.to }), { ...COMMA_START });
}
