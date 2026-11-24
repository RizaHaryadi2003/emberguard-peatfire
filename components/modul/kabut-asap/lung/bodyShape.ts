// Tubuh kaca tembus pandang yang membungkus saluran napas: kepala (dengan
// hidung, dagu, dan telinga), leher, bahu, dan dada. Gunanya memberi konteks:
// masker menempel di wajah, udara masuk lewat mulut dan hidung, turun lewat
// leher ke trakea, lalu ke paru-paru di dalam dada.
//
// Dibentuk dari fungsi jarak bertanda (SDF) seperti paru-paru, lalu dijaring
// dengan Surface Nets. Satuan dunia adegan (1 = 10 cm); bentuknya perkiraan,
// bukan pindaian tubuh.

import type { Vec3 } from "./lungShape";

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const len3 = (x: number, y: number, z: number) =>
  Math.sqrt(x * x + y * y + z * z);

/** Gabungan halus dua bentuk ("min" yang dibulatkan, lebar pembulatan k). */
function smin(a: number, b: number, k: number): number {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return b + (a - b) * h - k * h * (1 - h);
}

/** Jarak (perkiraan) ke elipsoid berpusat c dengan jari-jari r. */
function ellipsoid(x: number, y: number, z: number, c: Vec3, r: Vec3): number {
  const k = len3((x - c[0]) / r[0], (y - c[1]) / r[1], (z - c[2]) / r[2]);
  return (k - 1) * Math.min(r[0], r[1], r[2]);
}

/** Jarak ke kapsul (tabung berujung bulat) dari a ke b berjari-jari r. */
function capsule(
  x: number,
  y: number,
  z: number,
  a: Vec3,
  b: Vec3,
  r: number,
): number {
  const pa = [x - a[0], y - a[1], z - a[2]];
  const ba = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const h = clamp(
    (pa[0] * ba[0] + pa[1] * ba[1] + pa[2] * ba[2]) /
      (ba[0] * ba[0] + ba[1] * ba[1] + ba[2] * ba[2]),
    0,
    1,
  );
  return len3(pa[0] - ba[0] * h, pa[1] - ba[1] * h, pa[2] - ba[2] * h) - r;
}

/** Pusat masker di wajah, menutup hidung dan mulut. */
export const MASK_CENTER: Vec3 = [0, 1.05, 1.0];
/** Telinga kiri dan kanan: tempat tali masker dikaitkan. */
export const EARS: Vec3[] = [
  [-0.84, 1.42, -0.06],
  [0.84, 1.42, -0.06],
];
/** Batas bawah dada yang digambar. */
const TORSO_BOTTOM = -4.3;

export function bodySdf(x: number, y: number, z: number): number {
  // Kepala, dagu, hidung, telinga.
  let d = ellipsoid(x, y, z, [0, 1.48, 0.02], [0.8, 1.05, 0.95]);
  d = smin(d, ellipsoid(x, y, z, [0, 0.78, 0.32], [0.55, 0.42, 0.6]), 0.25);
  d = smin(d, ellipsoid(x, y, z, [0, 1.33, 0.98], [0.12, 0.25, 0.17]), 0.12);
  for (const e of EARS)
    d = smin(d, ellipsoid(x, y, z, e, [0.08, 0.25, 0.16]), 0.06);
  // Leher.
  d = smin(d, capsule(x, y, z, [0, -0.7, -0.05], [0, 0.75, -0.1], 0.48), 0.25);
  // Bahu dan dada; bagian bawah dipotong datar di luar bingkai.
  d = smin(
    d,
    capsule(x, y, z, [-1.9, -0.75, -0.05], [1.9, -0.75, -0.05], 0.48),
    0.45,
  );
  const torso = ellipsoid(x, y, z, [0, -2.35, 0], [2.2, 2.05, 1.38]);
  d = smin(d, torso, 0.5);
  return Math.max(d, TORSO_BOTTOM - y);
}

/** Kotak pembatas tubuh. */
export const BODY_BOUNDS: { min: Vec3; max: Vec3 } = {
  min: [-2.6, -4.4, -1.6],
  max: [2.6, 2.65, 1.4],
};
