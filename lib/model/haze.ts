// Model Modul 09 · Kabut Asap.
// Semua angka berasal dari docs/md/acuan-modul/acuan-modul-kabut-asap.md:
//   US EPA, PM Basics              — ukuran partikel dan rambut (babak 01)
//   Permen LHK P.14/2020 Lampiran  — konversi PM2.5 ↔ ISPU dan kategorinya (babak 02)
//   Kodros dkk. (2021)             — faktor perlindungan masker terhadap asap (babak 03)

/* ============================================================================
 *  BABAK 01 · SEKECIL APA — ukuran partikel (µm)
 * ========================================================================== */

/** Diameter rata-rata sehelai rambut (µm), US EPA. */
export const HAIR_UM = 70;

/** Batas atas partikel kasar dan partikel halus (µm), US EPA. */
export const PM10_UM = 10;
export const PM25_UM = 2.5;

/** Berapa butir PM2.5 terbesar berjajar selebar sehelai rambut. */
export const PM25_PER_HAIR = Math.round(HAIR_UM / PM25_UM);

/**
 * Perbesaran mikroskop (kali) agar benda berdiameter `um` tampak selebar
 * `px` piksel di layar, dengan anggapan 1 µm pada perbesaran 1× = 0,0038 px
 * (satu piksel layar laptop kira-kira 0,26 mm). Dipakai untuk menentukan
 * kapan sebuah benda mulai terlihat saat diperbesar.
 */
export const PX_PER_UM_AT_1X = 0.0038;

/** Lebar benda berdiameter `um` di layar (px) pada perbesaran `zoom`. */
export function screenPx(um: number, zoom: number): number {
  return um * PX_PER_UM_AT_1X * zoom;
}

/* ============================================================================
 *  BABAK 02 · JENDELA PONTIANAK — ISPU (Permen LHK P.14/2020)
 * ========================================================================== */

/**
 * Titik konversi PM2.5 rata-rata 24 jam (µg/m³) ↔ ISPU, Lampiran I bagian A.
 * Baris ">300" ditulis 500 µg/m³; pasangannya dipakai sebagai ISPU 500.
 */
export const PM25_BREAKPOINTS: readonly { ispu: number; pm25: number }[] = [
  { ispu: 0, pm25: 0 },
  { ispu: 50, pm25: 15.5 },
  { ispu: 100, pm25: 55.4 },
  { ispu: 200, pm25: 150.4 },
  { ispu: 300, pm25: 250.4 },
  { ispu: 500, pm25: 500 },
];

/** Interpolasi lurus antara dua titik konversi (Lampiran I bagian B, persamaan 1). */
function interpolate(x: number, from: "pm25" | "ispu", to: "pm25" | "ispu"): number {
  const b = PM25_BREAKPOINTS;
  const v = Math.max(0, x);
  for (let i = 1; i < b.length; i++) {
    if (v <= b[i][from] || i === b.length - 1) {
      const lo = b[i - 1];
      const hi = b[i];
      return lo[to] + ((hi[to] - lo[to]) / (hi[from] - lo[from])) * (Math.min(v, hi[from]) - lo[from]);
    }
  }
  return b[b.length - 1][to];
}

/** ISPU dari konsentrasi PM2.5 24 jam (µg/m³). */
export function ispuFromPm25(pm25: number): number {
  return interpolate(pm25, "pm25", "ispu");
}

/** Konsentrasi PM2.5 24 jam (µg/m³) yang setara dengan nilai ISPU. */
export function pm25FromIspu(ispu: number): number {
  return interpolate(ispu, "ispu", "pm25");
}

export type IspuCategory = "baik" | "sedang" | "tidakSehat" | "sangatTidakSehat" | "berbahaya";

/** Kategori ISPU, Lampiran II bagian A: 1–50, 51–100, 101–200, 201–300, ≥ 301. */
export function ispuCategory(ispu: number): IspuCategory {
  const v = Math.round(ispu);
  if (v <= 50) return "baik";
  if (v <= 100) return "sedang";
  if (v <= 200) return "tidakSehat";
  if (v <= 300) return "sangatTidakSehat";
  return "berbahaya";
}

/** Status warna tiap kategori (Lampiran II bagian A), dalam warna layar. */
export const CATEGORY_COLOR: Record<IspuCategory, string> = {
  baik: "#3fb950",
  sedang: "#4f9bff",
  tidakSehat: "#f2c230",
  sangatTidakSehat: "#e5484d",
  berbahaya: "#111111",
};

/** Dua hari sungguhan Agustus 2026 di Kota Pontianak. */
export const REAL_DAYS = [
  // AQMS Pontianak Tenggara, 8 Agustus 2026 pukul 09.00 (Pontianak Post, 9 Agustus 2026).
  { id: "8agt", date: "8 Agustus 2026", time: "09.00", ispu: 88 },
  // ISPUnet, 27 Agustus 2026 pukul 08.00 WIB (RRI Pontianak, 27 Agustus 2026).
  { id: "27agt", date: "27 Agustus 2026", time: "08.00", ispu: 312 },
] as const;

export type RealDayId = (typeof REAL_DAYS)[number]["id"];

/** Batas atas penggeser ISPU di layar. */
export const ISPU_MAX = 350;

/**
 * Kepekatan kabut di jendela (0–1) untuk ISPU tertentu. **Ilustratif**:
 * hanya naik searah ISPU, dan jenuh di ambang Berbahaya.
 */
export function hazeLevel(ispu: number): number {
  const k = Math.min(1, Math.max(0, ispu / 320));
  return Math.pow(k, 0.85);
}

/* ============================================================================
 *  BABAK 03 · SATU TARIKAN NAPAS — masker (Kodros dkk., 2021)
 * ========================================================================== */

export type Mask = "tanpa" | "kain" | "sintetis" | "medis" | "n95";

/**
 * Faktor perlindungan terhadap sebaran ukuran asap kebakaran (Tabel 2) dan
 * kebocoran bawaan di tepi masker (Tabel 1). "Tanpa masker" = 1, tanpa kebocoran.
 */
export const MASKS: Record<Mask, { protection: number; leak: number }> = {
  tanpa: { protection: 1, leak: 0 },
  kain: { protection: 1.4, leak: 0.05 },
  sintetis: { protection: 2.2, leak: 0.05 },
  medis: { protection: 1.9, leak: 0.5 },
  n95: { protection: 16.2, leak: 0.05 },
};

/** Porsi asap yang tetap terhirup (0–1) = 1 ÷ faktor perlindungan. */
export function passThrough(mask: Mask): number {
  return 1 / MASKS[mask].protection;
}

/**
 * Dari yang lolos, porsi yang lewat celah tepi masker (bukan menembus kain),
 * dijepit 0–1. Untuk masker medis hampir semuanya lewat celah.
 */
export function gapShare(mask: Mask): number {
  const pass = passThrough(mask);
  return mask === "tanpa" ? 0 : Math.min(1, MASKS[mask].leak / pass);
}

/** Nasib satu butir asap dalam satu tarikan napas. */
export type Fate = "celah" | "kain" | "tertahan";

/** Bilangan acak berbenih tetap (mulberry32), supaya tiap napas selalu sama. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Nasib `n` butir asap untuk satu masker. Jumlah yang lolos dibulatkan dari
 * `passThrough`; yang lolos dibagi antara celah dan kain menurut `gapShare`
 * (ilustratif). Urutannya diacak berbenih supaya butir yang lolos tersebar.
 */
export function breath(mask: Mask, n = 100, seed = 9): Fate[] {
  const pass = Math.round(n * passThrough(mask));
  const viaGap = Math.round(pass * gapShare(mask));
  const fates: Fate[] = Array.from({ length: n }, (_, i) => (i < viaGap ? "celah" : i < pass ? "kain" : "tertahan"));
  const rand = seeded(seed);
  for (let i = fates.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [fates[i], fates[j]] = [fates[j], fates[i]];
  }
  return fates;
}

/** Jumlah butir yang terhirup (lewat kain atau celah). */
export function inhaled(fates: readonly Fate[]): number {
  return fates.filter((f) => f !== "tertahan").length;
}
