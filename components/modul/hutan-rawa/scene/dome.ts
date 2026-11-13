import { FOREST_ZONES, type ForestZone } from "@/config/modul/hutan-rawa";

// Bentuk dan isi diorama kubah gambut Modul Hutan Rawa Gambut. Berkas ini
// tidak memakai three.js, supaya semua angka penampang dapat diuji tanpa
// peramban.
//
// --- Skala ------------------------------------------------------------------
//
// Tegak dalam meter sungguhan: gambut 13 m, pohon 45 m, dan orang 1,7 m
// berdiri pada skala yang sama, karena justru ketiganya yang dibandingkan
// pembaca. Mendatar dimampatkan: 14 km penampang dijadikan 120 satuan, jadi
// satu satuan mendatar ≈ 117 m. Tanpa pemampatan ini kubahnya akan tampak
// sebagai garis datar sepanjang empat belas kilometer. Pemampatan itu ditulis
// di bawah gambar, tidak disembunyikan.

/** Panjang penampang (km), dari tepi hutan di sungai ke puncak kubah. */
export const SPAN_KM = 14;
/** Panjang diorama (satuan adegan) yang mewakili SPAN_KM. */
export const LENGTH = 120;
/** Tebal diorama ke belakang (satuan adegan). */
export const DEPTH = 18;
/** Tebal tanah mineral yang ikut terlihat di bawah gambut (m). */
export const MINERAL_M = 5;
/** Tinggi orang dewasa sebagai pejalan (m). */
export const PERSON_M = 1.7;

/**
 * Seberapa tinggi banjir naik di atas tepi sungai (m). Ilustratif: sumber
 * hanya menyebut "batas banjir sungai" tanpa angka, jadi batasnya dihitung
 * dari titik pertemuan muka banjir dengan lereng kubah, bukan ditulis sebagai
 * jarak.
 */
export const FLOOD_RISE_M = 3;

/**
 * Tebal gambut (m) pada jarak `km` dari tepi hutan.
 *
 * Titik 5,5 km (6 m), 10 km (10 m), dan puncak (13 m) mengikuti batas jenis
 * hutan di Husson dkk. (2018). Bagian tepi digambar dangkal tanpa angka,
 * sebab sumber hanya menyebutnya "paling dangkal".
 */
export function peatThicknessM(km: number): number {
  const pts: [number, number][] = [
    [0, 1],
    [2.5, 3],
    [5.5, 6],
    [10, 10],
    [12.5, 12.6],
    [14, 13],
  ];
  const k = Math.max(0, Math.min(SPAN_KM, km));
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    if (k <= x2) {
      const t = (k - x1) / (x2 - x1);
      const s = t * t * (3 - 2 * t);
      return y1 + (y2 - y1) * s;
    }
  }
  return pts[pts.length - 1][1];
}

/** Letak mendatar (satuan adegan) dari jarak `km`; kubah berpusat di x = 0. */
export function xOfKm(km: number): number {
  return -LENGTH / 2 + (km / SPAN_KM) * LENGTH;
}

/** Jarak (km) dari letak mendatar `x`. */
export function kmOfX(x: number): number {
  return ((x + LENGTH / 2) / LENGTH) * SPAN_KM;
}

/** Muka air banjir (m di atas dasar gambut) dan jarak pertemuannya dengan lereng. */
export const FLOOD_LEVEL_M = peatThicknessM(0) + FLOOD_RISE_M;
export const FLOOD_KM = (() => {
  for (let k = 0; k <= SPAN_KM; k += 0.01) if (peatThicknessM(k) >= FLOOD_LEVEL_M) return k;
  return SPAN_KM;
})();

export function zoneAt(km: number): ForestZone {
  return FOREST_ZONES.find((z) => km < z.toKm) ?? FOREST_ZONES[FOREST_ZONES.length - 1];
}

export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type TreeSpot = {
  km: number;
  x: number;
  z: number;
  /** Tinggi pohon (m). */
  heightM: number;
  zone: ForestZone["id"];
  /** Putaran pada sumbu tegak (radian). */
  yaw: number;
  /** Ragam model (dibagi rata di antara ragam yang ada). */
  variant: number;
};

/**
 * Jumlah pohon tiap jenis hutan, menurut mutu grafis.
 *
 * Tiap pohon pachira ±20–28 ribu segitiga, jadi jumlah inilah yang paling
 * menentukan beban. Hutan tiang memakai tajuk yang dijarangkan (pohonnya
 * memang kurus), jadi ia boleh lebih rapat dengan biaya yang sama.
 */
export const TREE_COUNT = {
  high: { campuran: 13, tiang: 22, tinggi: 11 },
  low: { campuran: 7, tiang: 11, tinggi: 6 },
} as const;

/**
 * Tanam pohon di sepanjang kubah. Letak dibagi rata per ruas lalu digoyang
 * sedikit, supaya hutannya tidak berbaris dan tidak pula menggumpal.
 */
export function plantTrees(quality: "high" | "low"): TreeSpot[] {
  const rand = seeded(20261113);
  const out: TreeSpot[] = [];
  for (const z of FOREST_ZONES) {
    const n = TREE_COUNT[quality][z.id];
    const span = z.toKm - z.fromKm;
    for (let i = 0; i < n; i++) {
      // Ujung kiri dijauhkan dari sungai, ujung kanan dari tepi diorama.
      const lo = z.fromKm + (z.id === "campuran" ? 0.35 : 0.1);
      const hi = z.toKm - 0.15;
      const km = Math.min(hi, Math.max(lo, z.fromKm + ((i + 0.2 + rand() * 0.6) / n) * span));
      // Selang-seling depan–belakang, supaya pohon depan tidak menutup semuanya.
      const row = i % 2 === 0 ? 0.25 + rand() * 0.25 : -0.05 - rand() * 0.35;
      const heightM = z.treeMinM + (z.treeMaxM - z.treeMinM) * Math.pow(rand(), z.id === "tinggi" ? 1.4 : 1);
      out.push({ km, x: xOfKm(km), z: row * DEPTH, heightM, zone: z.id, yaw: rand() * Math.PI * 2, variant: i });
    }
  }
  return out;
}

/** Jumlah pakis lantai hutan (±0,8–2,4 ribu segitiga tiap rumpun). */
export const FERN_COUNT = { high: 60, low: 0 } as const;

export type FernSpot = { km: number; x: number; z: number; scale: number; yaw: number; variant: number };

/** Pakis disebar di lantai hutan, lebih rapat di hutan campuran yang lembap. */
export function plantFerns(quality: "high" | "low"): FernSpot[] {
  const rand = seeded(7_2026);
  const out: FernSpot[] = [];
  for (let i = 0; i < FERN_COUNT[quality]; i++) {
    const km = 0.3 + Math.pow(rand(), 1.3) * (SPAN_KM - 0.5);
    out.push({ km, x: xOfKm(km), z: (rand() - 0.3) * DEPTH * 0.85, scale: 1.4 + rand() * 1.4, yaw: rand() * Math.PI * 2, variant: i });
  }
  return out;
}

/** Banyaknya siluet satwa menurut tingkat relatif di config (bukan hitungan). */
export const APE_COUNT: Record<string, number> = { rendah: 1, sedang: 2, tinggi: 4 };

export type ApeSpot = { x: number; y: number; z: number; kind: "orangutan" | "owa"; zone: ForestZone["id"] };

/**
 * Tempat siluet satwa: zona dibagi n ruas, dan satwa bergantung di bawah tajuk
 * pohon tertinggi pada tiap ruas — diutamakan pohon baris depan, supaya tidak
 * tertutup tajuk lain.
 */
export function apeSpots(trees: TreeSpot[]): ApeSpot[] {
  const out: ApeSpot[] = [];
  for (const z of FOREST_ZONES) {
    const n = APE_COUNT[z.apes] ?? 1;
    const span = (z.toKm - z.fromKm) / n;
    for (let i = 0; i < n; i++) {
      const from = z.fromKm + span * i;
      const inBin = trees.filter((t) => t.zone === z.id && t.km >= from && t.km < from + span);
      if (inBin.length === 0) continue;
      const score = (t: TreeSpot) => t.heightM + (t.z > 0 ? 20 : 0);
      const t = inBin.reduce((a, b) => (score(b) > score(a) ? b : a), inBin[0]);
      out.push({
        x: t.x,
        y: peatThicknessM(t.km) + t.heightM * 0.62,
        z: t.z + 1.5,
        kind: out.length % 2 === 0 ? "orangutan" : "owa",
        zone: z.id,
      });
    }
  }
  return out;
}
