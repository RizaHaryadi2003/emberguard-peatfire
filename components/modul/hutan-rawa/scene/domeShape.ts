import { DEPTH, LENGTH, kmOfX, peatThicknessM, seeded, xOfKm } from "./dome";

// Bentuk alami bongkahan kubah gambut. Berkas ini tidak memakai three.js,
// supaya sambungan antarbidang dapat diuji tanpa peramban.
//
// Rancangan sebelumnya mengekstrusi satu garis kubah ke belakang: muka depan
// rata seperti tembok, alas gambut lurus seperti penggaris, dan tanah mineral
// berupa kotak. Di sini setiap bidang dibentuk dari fungsi derau yang sama:
//
//   - muka depan berelief seperti tanah yang digali (menonjol dan cekung),
//   - permukaan atas bergundukan kecil seperti lantai hutan rawa,
//   - batas gambut dengan tanah mineral bergelombang,
//   - sungai mengalir di alur yang tergerus ke dalam tanah mineral.
//
// Semua relief adalah hiasan bentuk, bukan data. Ukurannya dijaga kecil
// (puluhan sentimeter) supaya tebal gambut yang dibaca pembaca tetap angka
// dari kurva kubah Husson dkk. (2018) di dome.ts.

/** Ujung kiri kubah (tepi hutan di sungai) dan ujung kanannya (puncak). */
export const X_LEFT = xOfKm(0);
export const X_RIGHT = LENGTH / 2;
/** Muka depan nominal. */
export const Z_FRONT = DEPTH / 2;
export const Z_BACK = -DEPTH / 2;

/** Lebar alur sungai di kiri kubah (satuan adegan). */
export const RIVER_WIDTH = 9;
export const X_RIVER = X_LEFT - RIVER_WIDTH;
/** Muka air sungai (m di atas dasar gambut): sedikit di bawah tepi hutan. */
export const RIVER_LEVEL = peatThicknessM(0) - 0.45;
/** Dasar alur sungai terdalam (m). */
export const RIVER_BED_M = -2.2;

/** Besar tonjolan muka depan (satuan adegan) dan gundukan permukaan (m). */
export const FACE_RELIEF = 0.05;
export const HUMMOCK_M = 0.04;

// ---------------------------------------------------------------------------
//  Derau nilai deterministik
// ---------------------------------------------------------------------------

const PERM = (() => {
  const rand = seeded(1914);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  return [...p, ...p];
})();

const fade = (t: number) => t * t * (3 - 2 * t);

/** Derau nilai 2D, keluaran 0..1. */
export function noise2(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const h = (i: number, j: number) => PERM[(PERM[(xi + i) & 255] + yi + j) & 255] / 255;
  const u = fade(xf);
  const v = fade(yf);
  const a = h(0, 0) + (h(1, 0) - h(0, 0)) * u;
  const b = h(0, 1) + (h(1, 1) - h(0, 1)) * u;
  return a + (b - a) * v;
}

/** Derau berlapis tiga, keluaran kira-kira −1..1. */
export function fbm2(x: number, y: number): number {
  return (noise2(x, y) * 0.55 + noise2(x * 2.1 + 17, y * 2.1 + 5) * 0.3 + noise2(x * 4.3 + 41, y * 4.3 + 29) * 0.15) * 2 - 1;
}

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// ---------------------------------------------------------------------------
//  Permukaan dan batas
// ---------------------------------------------------------------------------

/**
 * Gundukan lantai hutan (m). Mereda di dekat ujung kiri dan kanan supaya
 * sambungan dengan muka samping tetap rapi.
 */
export function hummock(x: number, z: number): number {
  const edge = smooth(X_LEFT, X_LEFT + 2, x) * smooth(X_RIGHT, X_RIGHT - 2, x);
  return HUMMOCK_M * fbm2(x * 0.42 + 3.3, z * 0.42) * edge;
}

/** Tinggi permukaan gambut (m di atas dasar gambut) di titik (x, z). */
export function surfaceY(x: number, z: number): number {
  return peatThicknessM(kmOfX(x)) + hummock(x, z);
}

/**
 * Batas gambut dengan tanah mineral (m). Bergelombang ±25 cm, dan terangkat
 * sedikit di ujung kiri tempat gambut paling tipis, supaya batasnya tidak
 * menembus permukaan.
 */
export function peatBaseY(x: number): number {
  return 0.25 * fbm2(x * 0.09 + 7.1, 2.3);
}

/** Dasar alur sungai (m): melengkung dari tepi diorama ke kaki kubah. */
export function riverBedY(x: number): number {
  const t = Math.min(1, Math.max(0, (x - X_RIVER) / RIVER_WIDTH));
  const dip = Math.pow(Math.sin(Math.PI * t), 0.6);
  // Di kaki kubah dasarnya bertemu batas gambut, di tepi diorama sedikit
  // di bawah muka air.
  const ends = (1 - t) * (RIVER_LEVEL - 0.7) + t * peatBaseY(X_LEFT);
  return ends + (RIVER_BED_M - ends) * dip;
}

/** Atap tanah mineral: dasar sungai di alur, batas gambut di bawah kubah. */
export function mineralTopY(x: number): number {
  return x <= X_LEFT ? riverBedY(x) : peatBaseY(x);
}

/**
 * Muka depan (z) pada titik (x, y). Relief dibuat dari derau yang
 * diregangkan mendatar, seperti bekas cangkul yang menyapu tanah, dan sedikit
 * condong ke belakang di bagian atas supaya bibir permukaan tidak menggantung.
 */
export function frontZ(x: number, y: number): number {
  const relief = FACE_RELIEF * fbm2(x * 0.32 + 11, y * 0.55);
  const clump = 0.2 * fbm2(x * 1.3 + 2, y * 1.6 + 9);
  return Z_FRONT + relief + clump;
}

/** Muka samping (x) pada titik (z, y) di ujung `side`. */
export function sideX(side: "left" | "right", z: number, y: number): number {
  const base = side === "left" ? X_LEFT : X_RIGHT;
  const sign = side === "left" ? -1 : 1;
  // Mereda ke tepi depan supaya bertemu muka depan tanpa celah.
  const edge = smooth(Z_FRONT, Z_FRONT - 1.2, z) * smooth(Z_BACK, Z_BACK + 1.2, z);
  return base + sign * (0.3 * fbm2(z * 0.5 + (side === "left" ? 3 : 8), y * 0.6)) * edge;
}

/** Kedalaman di bawah permukaan (m) untuk titik muka depan pada (x, y). */
export function depthBelowSurface(x: number, y: number, z = Z_FRONT): number {
  return Math.max(0, surfaceY(x, z) - y);
}

// ---------------------------------------------------------------------------
//  Kisi bidang
// ---------------------------------------------------------------------------

export type Grid = {
  positions: Float32Array;
  uvs: Float32Array;
  /** Kedalaman di bawah permukaan gambut (m), dibaca peneduh. */
  depths: Float32Array;
  /** Tinggi di atas batas gambut-mineral (m), dibaca peneduh. */
  heights: Float32Array;
  indices: Uint32Array;
  cols: number;
  rows: number;
};

/**
 * Kisi umum `cols × rows`. `at(i, j)` memberi titik, kedalaman, tinggi di
 * atas alas gambut, dan koordinat tekstur. Segitiga dibuat menghadap ke arah
 * yang ditentukan `flip`.
 */
export function buildGrid(
  cols: number,
  rows: number,
  at: (i: number, j: number) => { p: [number, number, number]; uv: [number, number]; depth: number; height: number },
  flip = false,
): Grid {
  const n = (cols + 1) * (rows + 1);
  const positions = new Float32Array(n * 3);
  const uvs = new Float32Array(n * 2);
  const depths = new Float32Array(n);
  const heights = new Float32Array(n);
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const k = j * (cols + 1) + i;
      const v = at(i, j);
      positions.set(v.p, k * 3);
      uvs.set(v.uv, k * 2);
      depths[k] = v.depth;
      heights[k] = v.height;
    }
  }
  const indices = new Uint32Array(cols * rows * 6);
  let q = 0;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i;
      const b = a + 1;
      const c = a + cols + 1;
      const d = c + 1;
      if (flip) indices.set([a, c, b, b, c, d], q);
      else indices.set([a, b, c, b, d, c], q);
      q += 6;
    }
  }
  return { positions, uvs, depths, heights, indices, cols, rows };
}

/** Kerapatan kisi menurut mutu grafis. */
export const GRID_DENSITY = {
  high: { along: 360, down: 30, across: 18 },
  low: { along: 180, down: 16, across: 10 },
} as const;

/** Muka depan gambut: dari batas mineral sampai permukaan. */
export function peatFrontGrid(q: keyof typeof GRID_DENSITY): Grid {
  const { along, down } = GRID_DENSITY[q];
  return buildGrid(along, down, (i, j) => {
    const x = X_LEFT + ((X_RIGHT - X_LEFT) * i) / along;
    const yb = peatBaseY(x);
    const yt = surfaceY(x, Z_FRONT);
    const y = yb + ((yt - yb) * j) / down;
    // Baris teratas tidak diberi relief: ia harus berimpit tepat dengan tepi
    // depan permukaan atas.
    const z = j === down ? frontZ(x, yt) : frontZ(x, y);
    return { p: [x, y, z], uv: [x * 0.5, y * 0.5], depth: yt - y, height: y - yb };
  });
}

/** Muka depan tanah mineral: dari alas diorama sampai dasar sungai/batas gambut. */
export function mineralFrontGrid(q: keyof typeof GRID_DENSITY, bottom: number): Grid {
  const { along, down } = GRID_DENSITY[q];
  const cols = Math.round(along * 1.08);
  const rows = Math.max(6, Math.round(down / 2));
  return buildGrid(cols, rows, (i, j) => {
    const x = X_RIVER + ((X_RIGHT - X_RIVER) * i) / cols;
    // Di bawah kubah, atapnya sedikit masuk ke balik muka gambut supaya
    // kedua kisi yang titiknya tidak berimpit tidak menyisakan celah.
    const yt = mineralTopY(x) + (x > X_LEFT ? 0.06 : 0);
    const y = bottom + ((yt - bottom) * j) / rows;
    return { p: [x, y, frontZ(x, y)], uv: [x * 0.35, y * 0.35], depth: 99, height: y - yt };
  });
}

/** Permukaan atas kubah: gundukan lantai hutan, dari belakang ke tepi depan. */
export function peatTopGrid(q: keyof typeof GRID_DENSITY): Grid {
  const { along, across } = GRID_DENSITY[q];
  return buildGrid(
    along,
    across,
    (i, j) => {
      const x = X_LEFT + ((X_RIGHT - X_LEFT) * i) / along;
      // Baris terakhir adalah tepi depan, yang memakai titik muka depan.
      const zNominal = Z_BACK + ((Z_FRONT - Z_BACK) * j) / across;
      const y = surfaceY(x, zNominal);
      const z = j === across ? frontZ(x, surfaceY(x, Z_FRONT)) : zNominal;
      return { p: [x, j === across ? surfaceY(x, Z_FRONT) : y, z], uv: [x * 0.16, z * 0.16], depth: 0, height: 99 };
    },
    true,
  );
}

/** Muka samping gambut di ujung kiri (tepi sungai) atau kanan (puncak). */
export function peatSideGrid(side: "left" | "right", q: keyof typeof GRID_DENSITY): Grid {
  const { across, down } = GRID_DENSITY[q];
  const x0 = side === "left" ? X_LEFT : X_RIGHT;
  return buildGrid(
    across,
    down,
    (i, j) => {
      const zNominal = Z_BACK + ((Z_FRONT - Z_BACK) * i) / across;
      const yb = peatBaseY(x0);
      const yt = surfaceY(x0, zNominal);
      const y = yb + ((yt - yb) * j) / down;
      // Kolom terdepan berimpit dengan kolom pertama/terakhir muka depan.
      const front = i === across;
      const z = front ? frontZ(x0, j === down ? yt : y) : zNominal;
      const x = front || j === down ? x0 : sideX(side, zNominal, y);
      return { p: [x, y, z], uv: [z * 0.5, y * 0.5], depth: yt - y, height: y - yb };
    },
    side === "right",
  );
}

/** Muka samping tanah mineral di tepi diorama kiri (bawah sungai) atau kanan. */
export function mineralSideGrid(side: "left" | "right", q: keyof typeof GRID_DENSITY, bottom: number): Grid {
  const { across } = GRID_DENSITY[q];
  const rows = 6;
  const x0 = side === "left" ? X_RIVER : X_RIGHT;
  return buildGrid(
    across,
    rows,
    (i, j) => {
      const zNominal = Z_BACK + ((Z_FRONT - Z_BACK) * i) / across;
      const yt = mineralTopY(x0);
      const y = bottom + ((yt - bottom) * j) / rows;
      const z = i === across ? frontZ(x0, y) : zNominal;
      return { p: [x0, y, z], uv: [z * 0.35, y * 0.35], depth: 99, height: y - yt };
    },
    side === "right",
  );
}

/** Dasar alur sungai, terlihat menembus air. */
export function riverBedGrid(q: keyof typeof GRID_DENSITY): Grid {
  const cols = q === "high" ? 40 : 20;
  const { across } = GRID_DENSITY[q];
  return buildGrid(
    cols,
    across,
    (i, j) => {
      const x = X_RIVER + (RIVER_WIDTH * i) / cols;
      const zNominal = Z_BACK + ((Z_FRONT - Z_BACK) * j) / across;
      const y = riverBedY(x);
      const z = j === across ? frontZ(x, y) : zNominal;
      return { p: [x, y, z], uv: [x * 0.35, z * 0.35], depth: 99, height: 0 };
    },
    true,
  );
}
