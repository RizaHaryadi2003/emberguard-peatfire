// Sikap terbang rangkong 3D pada pembuka.
//
// Koordinat badan rangkong: x ke depan (arah paruh), y ke atas, z ke sayap
// kanan. Lintasan terbang di layar (lib/introFlight.ts) diubah menjadi sikap:
// arah hadap (termasuk saat menjauh atau mendekat), angguk, dan miring ke
// dalam belokan. Model 3D-nya ada di components/intro/hornbill3d.

export type Vec3 = [number, number, number];

/**
 * Sikap terbang (radian): arah hadap (yaw), angguk (pitch), dan miring (roll).
 * Roll positif menurunkan sayap kanan (sisi +z badan).
 */
export type Attitude = { yaw: number; pitch: number; roll: number };

/** Matriks rotasi 3×3 (baris demi baris) dari sikap: R = Ry(yaw) · Rz(pitch) · Rx(roll). */
export function rotation({ yaw, pitch, roll }: Attitude): number[] {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const cr = Math.cos(roll), sr = Math.sin(roll);
  // Rx(roll)
  const rx = [1, 0, 0, 0, cr, -sr, 0, sr, cr];
  // Rz(pitch): hidung naik bila pitch positif
  const rz = [cp, -sp, 0, sp, cp, 0, 0, 0, 1];
  // Ry(yaw): yaw 0 menghadap +x (kanan layar), yaw π menghadap kiri
  const ry = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
  return mul3(ry, mul3(rz, rx));
}

function mul3(a: number[], b: number[]): number[] {
  const m = new Array(9).fill(0);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) m[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
  return m;
}

export function apply(m: number[], [x, y, z]: Vec3): Vec3 {
  return [m[0] * x + m[1] * y + m[2] * z, m[3] * x + m[4] * y + m[5] * z, m[6] * x + m[7] * y + m[8] * z];
}

/**
 * Sikap dari gerak di layar.
 * - Arah hadap dari kecepatan mendatar (vx) dan kecepatan menjauh/mendekat
 *   (vz, dari perubahan skala): saat berbalik, rangkong melewati sudut
 *   menghadap/membelakangi penonton, bukan sekadar dibalik.
 * - Angguk dari kecepatan tegak: hidung naik saat menanjak.
 * - Miring dari laju belok: makin tajam belokan, makin dalam badan miring,
 *   memperlihatkan punggung atau perut dan sayapnya.
 */
export function attitudeFrom(
  v: { vx: number; vy: number; vz: number },
  yawRate: number,
): Attitude {
  const yaw = Math.atan2(-v.vz, v.vx);
  const horiz = Math.hypot(v.vx, v.vz);
  const pitch = clamp(Math.atan2(-v.vy, horiz + 60) * 0.55, -0.45, 0.45);
  // Miring ke dalam belokan: berbelok ke kanan badannya (yaw berkurang saat
  // menghadap kiri, bertambah saat menghadap kanan) menurunkan sayap kanan.
  const roll = clamp(-yawRate * 0.42, -1.15, 1.15);
  return { yaw, pitch, roll };
}

/** Selisih sudut terpendek b − a dalam (−π, π]. */
export function angleDelta(a: number, b: number): number {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Sudut sayap (radian, 0 = terbentang datar, positif = terangkat) dari fase
 * kepakan. Saat badan miring tajam rangkong meluncur: kepakan mengecil dan
 * sayap terbentang lebar.
 */
export function wingAngle(phase: number, roll: number): number {
  const glide = clamp(Math.abs(roll) / 0.9, 0, 1);
  const amp = (55 * (1 - 0.75 * glide) * Math.PI) / 180;
  const base = ((12 - 4 * glide) * Math.PI) / 180;
  return base + amp * Math.cos(phase);
}

/** Kecepatan menjauh/mendekat per satuan laju perubahan skala (px/detik). */
export const DEPTH_K = 900;

type FlightSampler = (t: number) => { vx: number; vy: number; vs: number };

/**
 * Sikap dan laju belok dari lintasan pada waktu t. Laju belok dihitung dari
 * selisih arah hadap ±0,12 detik, jadi miringnya badan berubah halus.
 */
export function attitudeAlong(sample: FlightSampler, t: number): { att: Attitude; yawRate: number } {
  const yawOf = (q: ReturnType<FlightSampler>) => Math.atan2(-q.vs * DEPTH_K, q.vx);
  const p = sample(t);
  const h = 0.12;
  const yawRate = clamp(angleDelta(yawOf(sample(t - h)), yawOf(sample(t + h))) / (2 * h), -12, 12);
  return { att: attitudeFrom({ vx: p.vx, vy: p.vy, vz: p.vs * DEPTH_K }, yawRate), yawRate };
}
