// Rangkong "3D" yang digambar sebagai siluet 2D.
//
// Rangkong disusun sebagai model 3D sederhana dalam koordinat badannya
// sendiri: x ke depan (arah paruh), y ke atas, z ke sayap kanan. Bagian-
// bagiannya:
//   - bidang tegak (bidang simetri badan): profil badan, leher, ekor, dan
//     kepala — terlihat penuh dari samping, menipis bila dilihat dari depan;
//   - bola-bola sepanjang tulang punggung: memberi badan volume dari sudut
//     mana pun (proyeksi bola selalu lingkaran);
//   - bidang ekor mendatar dan dua bidang sayap yang berengsel di bahu.
// Setiap bingkai model diputar (arah hadap, angguk, miring) lalu diproyeksi
// tegak lurus ke layar. Karena bidang datar yang diproyeksi tegak lurus
// selalu menjadi transformasi afin 2D, tiap bidang cukup digambar dengan satu
// matriks kanvas. Hasilnya siluet hitam yang tampak berputar dalam ruang.

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

/** Proyeksi tegak lurus ke layar: x tetap, y dibalik (kanvas ke bawah), dikali skala px. */
export const project = (w: Vec3, k: number): [number, number] => [w[0] * k, -w[1] * k];

/**
 * Matriks kanvas (a, b, c, d, e, f) untuk sebuah bidang: titik (p, q) pada
 * bidang = asal + p·U + q·V (koordinat badan). Hasil:
 * layar = (a·p + c·q + e, b·p + d·q + f), relatif terhadap pusat rangkong.
 */
export function planeMatrix(m: number[], origin: Vec3, U: Vec3, V: Vec3, k: number): [number, number, number, number, number, number] {
  const [a, b] = project(apply(m, U), k);
  const [c, d] = project(apply(m, V), k);
  const [e, f] = project(apply(m, origin), k);
  return [a, b, c, d, e, f];
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
