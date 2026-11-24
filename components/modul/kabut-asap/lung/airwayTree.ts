// Pohon saluran napas: trakea, dua bronkus utama, lalu percabangan berulang
// sampai bronkiolus terkecil. Dibangun dengan cara "mengisi ruang" yang
// dipakai pemodel paru-paru (Tawhai dkk.; mirip Kitaoka dkk.):
//   1. Sebar ribuan titik benih di dalam tiap paru-paru (wilayah yang harus
//      dilayani udara).
//   2. Setiap cabang membelah titik-titik wilayahnya menjadi dua kelompok
//      sama banyak, dipotong tegak lurus arah sebaran terlebarnya.
//   3. Dua cabang anak tumbuh ke arah pusat masing-masing kelompok, sepanjang
//      40 % jaraknya, dan tidak berbelok lebih dari 60° dari induknya.
//   4. Jari-jari anak mengikuti hukum Murray (r³ induk = r³ anak₁ + r³ anak₂),
//      dibagi menurut banyaknya wilayah yang dilayani.
//   5. Berhenti bila wilayahnya tinggal satu titik: di situ ujung bronkiolus
//      dan gugus alveolus.
//
// Angka anatomi (Wikipedia: Trachea, Bronchus, Respiratory system): trakea
// panjang ±10–11 cm dan diameter ±1,8 cm; bronkus utama berdiameter 1–1,4 cm;
// bronkus utama kanan lebih lebar, lebih pendek, dan lebih tegak, bronkus
// kiri ±5 cm. Sudut 25° (kanan) dan 45° (kiri) dari garis tegak adalah nilai
// buku ajar yang lazim. Paru-paru sungguhan bercabang ±23 generasi; model ini
// berhenti lebih awal (bronkiolus ±1 mm) karena cabang yang lebih kecil tidak
// akan terlihat di layar.

import { lungSdf, lungBounds, type Side, type Vec3 } from "./lungShape";

export type Segment = {
  a: Vec3;
  b: Vec3;
  /** Jari-jari (satuan 10 cm). */
  r: number;
  /** Generasi: 0 trakea, 1 bronkus utama, dst. */
  gen: number;
  /** Indeks segmen induk, −1 untuk trakea. */
  parent: number;
  /** 0 trakea, −1 paru kanan, 1 paru kiri. */
  side: 0 | Side;
};

export type Airway = {
  segments: Segment[];
  /** Indeks segmen yang menjadi ujung (bronkiolus terminal). */
  terminals: number[];
};

/** Puncak trakea dan karina. */
export const TRACHEA_TOP: Vec3 = [0, 1.05, 0];
export const CARINA: Vec3 = [0, 0, 0];
/** Jari-jari trakea: diameter ±1,8 cm. */
export const TRACHEA_R = 0.09;
/** Jari-jari terkecil yang masih digambar: bronkiolus ±1 mm. */
export const MIN_R = 0.005;
/** Sudut belok terbesar cabang anak dari induknya. */
const MAX_TURN = (60 * Math.PI) / 180;

/** Bilangan acak berbenih tetap. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const length = (a: Vec3) => Math.sqrt(dot(a, a));
const norm = (a: Vec3): Vec3 => scale(a, 1 / (length(a) || 1));

/** Dua vektor satuan yang tegak lurus `d` dan satu sama lain. */
function basis(d: Vec3): [Vec3, Vec3] {
  const helper: Vec3 = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const e1 = norm(cross(d, helper));
  return [e1, cross(d, e1)];
}

/** Sebar titik benih merata di dalam satu paru-paru. */
export function seedPoints(
  side: Side,
  count: number,
  rand: () => number,
): Vec3[] {
  const { min, max } = lungBounds(side);
  const out: Vec3[] = [];
  while (out.length < count) {
    const p: Vec3 = [
      min[0] + rand() * (max[0] - min[0]),
      min[1] + rand() * (max[1] - min[1]),
      min[2] + rand() * (max[2] - min[2]),
    ];
    if (lungSdf(p[0], p[1], p[2], side) < -0.03) out.push(p);
  }
  return out;
}

export function buildAirway({
  seedsRight = 2300,
  seedsLeft = 1900,
  seed = 5,
} = {}): Airway {
  const rand = mulberry32(seed);
  const segments: Segment[] = [
    { a: TRACHEA_TOP, b: CARINA, r: TRACHEA_R, gen: 0, parent: -1, side: 0 },
  ];
  const terminals: number[] = [];

  const grow = (index: number, points: Vec3[], side: Side) => {
    const seg = segments[index];
    const d = norm(sub(seg.b, seg.a));
    if (points.length < 2) {
      terminals.push(index);
      return;
    }
    // Belah wilayah tegak lurus arah sebarannya yang terlebar.
    const [e1, e2] = basis(d);
    const c = scale(points.reduce(add, [0, 0, 0] as Vec3), 1 / points.length);
    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    for (const p of points) {
      const q = sub(p, c);
      const u = dot(q, e1);
      const v = dot(q, e2);
      sxx += u * u;
      syy += v * v;
      sxy += u * v;
    }
    const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    const axis = add(scale(e1, Math.cos(th)), scale(e2, Math.sin(th)));
    const sorted = [...points].sort((p, q) => dot(p, axis) - dot(q, axis));
    const half = Math.floor(sorted.length / 2);
    const groups = [sorted.slice(0, half), sorted.slice(half)];

    for (const group of groups) {
      const share = group.length / points.length;
      const r = seg.r * Math.cbrt(share);
      if (r < MIN_R) {
        terminals.push(index);
        continue;
      }
      const centroid = scale(
        group.reduce(add, [0, 0, 0] as Vec3),
        1 / group.length,
      );
      const toC = sub(centroid, seg.b);
      let dir = norm(toC);
      // Batasi belokan: cabang paru tidak pernah berbalik arah.
      const ang = Math.acos(Math.max(-1, Math.min(1, dot(dir, d))));
      if (ang > MAX_TURN) {
        const t = MAX_TURN / ang;
        dir = norm(add(scale(d, 1 - t), scale(dir, t)));
      }
      let L = Math.max(0.4 * length(toC), r * 3);
      let end = add(seg.b, scale(dir, L));
      // Ujung cabang harus tetap di dalam paru-paru.
      let tries = 0;
      while (lungSdf(end[0], end[1], end[2], side) > -r && tries < 5) {
        L *= 0.6;
        end = add(seg.b, scale(dir, L));
        tries++;
      }
      if (tries === 5) {
        terminals.push(index);
        continue;
      }
      segments.push({
        a: seg.b,
        b: end,
        r,
        gen: seg.gen + 1,
        parent: index,
        side,
      });
      grow(segments.length - 1, group, side);
    }
  };

  // Bronkus utama: kanan lebih tegak (25°) dan pendek, kiri lebih landai (45°) dan ±5 cm.
  const mains: {
    side: Side;
    angle: number;
    len: number;
    r: number;
    seeds: number;
  }[] = [
    { side: -1, angle: 25, len: 0.25, r: 0.068, seeds: seedsRight },
    { side: 1, angle: 45, len: 0.5, r: 0.058, seeds: seedsLeft },
  ];
  for (const m of mains) {
    const a = (m.angle * Math.PI) / 180;
    const dir: Vec3 = [m.side * Math.sin(a), -Math.cos(a), 0];
    segments.push({
      a: CARINA,
      b: scale(dir, m.len),
      r: m.r,
      gen: 1,
      parent: 0,
      side: m.side,
    });
    grow(segments.length - 1, seedPoints(m.side, m.seeds, rand), m.side);
  }
  return { segments, terminals };
}

/** Rangkaian segmen dari trakea sampai segmen `index` (urut dari atas). */
export function pathFromTrachea(airway: Airway, index: number): number[] {
  const path: number[] = [];
  for (let i = index; i >= 0; i = airway.segments[i].parent) path.push(i);
  return path.reverse();
}
