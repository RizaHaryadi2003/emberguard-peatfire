// Bentuk paru-paru sebagai fungsi jarak bertanda (SDF): negatif di dalam,
// positif di luar. Dipakai dua kali: untuk membangun permukaan paru-paru
// (surfaceNets.ts) dan untuk memastikan cabang bronkus tumbuh di dalamnya
// (airwayTree.ts).
//
// Satuan: 1 = 10 cm. Titik asal di karina (percabangan trakea), y ke atas,
// z ke depan (arah pembaca). Paru-paru KANAN pemilik tubuh berada di sisi
// KIRI layar (x < 0), seperti gambar anatomi yang dilihat dari depan.
//
// Ciri yang diikuti (Wikipedia: Lung, Respiratory system):
//   - paru kanan tiga lobus (atas, tengah, bawah) dipisah celah miring dan
//     celah mendatar; paru kiri dua lobus dipisah celah miring;
//   - paru kiri bertakik jantung (cardiac notch) di sisi depan-dalam;
//   - puncak (apex) meruncing, dasar cekung mengikuti kubah diafragma; kubah
//     kanan sedikit lebih tinggi;
//   - paru kanan lebih lebar dan sedikit lebih pendek.
// Ukurannya perkiraan bentuk, bukan hasil pengukuran satu tubuh.

export type Vec3 = [number, number, number];
/** −1: paru kanan (kiri layar), 1: paru kiri (kanan layar). */
export type Side = -1 | 1;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const len3 = (x: number, y: number, z: number) =>
  Math.sqrt(x * x + y * y + z * z);

/** Gabungan halus dua bentuk ("max" yang dibulatkan, lebar pembulatan k). */
function smax(a: number, b: number, k: number): number {
  const h = clamp(0.5 - (0.5 * (b - a)) / k, 0, 1);
  return b + (a - b) * h + k * h * (1 - h);
}

/** Lebar celah antarlobus (satuan 10 cm). */
export const FISSURE_W = 0.014;
/** Ketinggian celah mendatar paru kanan. */
const HORIZONTAL_Y = -0.22;

/**
 * Jarak bertanda ke celah miring, diukur pada bidang samping (y–z): positif
 * di sisi atas-depan (lobus atas, dan lobus tengah di paru kanan).
 */
function obliqueDistance(y: number, z: number): number {
  // Celah miring berjalan dari belakang-atas ke depan-bawah.
  const az = -0.8;
  const ay = 0.3;
  const nz = 1.75;
  const ny = 1.6;
  return ((z - az) * nz + (y - ay) * ny) / Math.hypot(nz, ny);
}

/** Jarak bertanda ke permukaan satu paru-paru di titik (x, y, z). */
export function lungSdf(
  x: number,
  y: number,
  z: number,
  side: Side,
  fissures = true,
): number {
  const right = side === -1;
  // Cermin: sisi dalam (mediastinum) selalu di qx kecil.
  const qx = side * x;
  const cx = 0.78;
  const cy = -0.5;
  const cz = 0.02;
  const dy = y - cy;
  // Makin ke atas makin ramping: puncak paru meruncing.
  const up = clamp(dy / 1.3, 0, 1);
  const f = 1 - 0.46 * up ** 1.25;
  const rx = (right ? 0.63 : 0.58) * f;
  const ry = 1.32;
  const rz = 0.86 * f;
  const k = len3((qx - cx) / rx, dy / ry, (z - cz) / rz);
  let d = (k - 1) * Math.min(rx, ry, rz);
  // Sisi dalam yang rata menghadap jantung dan pembuluh besar.
  d = smax(d, 0.2 - qx, 0.15);
  // Dasar cekung mengikuti kubah diafragma; kubah kanan lebih tinggi (hati).
  d = smax(d, -(len3(qx - 0.66, y - (right ? -2.5 : -2.65), z) - 1.25), 0.12);
  // Takik jantung di paru kiri, depan-dalam-bawah.
  if (!right) d = smax(d, -(len3(qx - 0.28, y + 0.8, z - 0.5) - 0.42), 0.1);
  if (fissures) {
    const dO = obliqueDistance(y, z);
    d = Math.max(d, FISSURE_W - Math.abs(dO));
    if (right) {
      // Celah mendatar hanya di bagian atas-depan celah miring.
      const carve = Math.max(Math.abs(y - HORIZONTAL_Y) - FISSURE_W, -dO);
      d = Math.max(d, -carve);
    }
  }
  return d;
}

/** Jarak ke paru-paru mana pun (kiri atau kanan). */
export function lungsSdf(
  x: number,
  y: number,
  z: number,
  fissures = true,
): number {
  return Math.min(
    lungSdf(x, y, z, -1, fissures),
    lungSdf(x, y, z, 1, fissures),
  );
}

export type Lobe = "atas" | "tengah" | "bawah";

/** Lobus tempat sebuah titik berada (untuk titik di dalam paru-paru). */
export function lobeOf(y: number, z: number, side: Side): Lobe {
  if (obliqueDistance(y, z) < 0) return "bawah";
  if (side === -1 && y < HORIZONTAL_Y) return "tengah";
  return "atas";
}

/** Kotak pembatas satu paru-paru (cukup longgar untuk seluruh bentuknya). */
export function lungBounds(side: Side): { min: Vec3; max: Vec3 } {
  const xs = [0.12 * side, 1.48 * side].sort((a, b) => a - b);
  return { min: [xs[0], -1.95, -0.98], max: [xs[1], 0.92, 0.98] };
}
