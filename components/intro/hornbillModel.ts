// Model 3D rangkong badak untuk pembuka (lihat lib/bird3d.ts).
//
// Koordinat badan: x ke depan, y ke atas, z ke sayap kanan. Bentuk profil
// (HORNBILL_BODY, HORNBILL_HEAD, HORNBILL_WING) tetap ditulis dalam
// koordinat gambar samping (y ke bawah) dan dipasang ke bidangnya di sini.

import { angleDelta, apply, attitudeFrom, clamp, planeMatrix, rotation, wingAngle, type Attitude, type Vec3 } from "@/lib/bird3d";
import { HORNBILL_BODY, HORNBILL_HEAD, HORNBILL_WING, WING_PIVOT } from "./hornbillShape";

/** Bola-bola tulang punggung: [x, y gambar (ke bawah), jari-jari]. Memberi badan volume. */
const SPINE: [number, number, number][] = [
  [-44, -3, 11],
  [-28, -5, 16],
  [-10, -6, 19],
  [8, -7, 20],
  [24, -10, 17],
  [40, -17, 13],
  [54, -24, 12],
  [66, -32, 12],
  [74, -42, 15],
];

/** Ekor mendatar (bidang x–z), sedikit melebar ke ujung. */
const TAIL_FAN =
  "M -46 -8 C -80 -13 -110 -18 -132 -20 C -137 -20 -138 -17 -138 -13 L -138 13 " +
  "C -138 17 -137 20 -132 20 C -110 18 -80 13 -46 8 Z";

/** Bahu: jarak ke samping dari bidang tengah, dan pemanjang rentang sayap. */
const SHOULDER_Z = 5;
const WING_SPAN = 1.2;

/** Path2D dibuat sekali (hanya di peramban). */
let paths: { body: Path2D; head: Path2D; wing: Path2D; tail: Path2D } | null = null;
function getPaths() {
  paths ??= {
    body: new Path2D(HORNBILL_BODY),
    head: new Path2D(HORNBILL_HEAD.d),
    wing: new Path2D(HORNBILL_WING),
    tail: new Path2D(TAIL_FAN),
  };
  return paths;
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];

export type HornbillPose = {
  /** Pusat rangkong (bahu) di layar, px CSS. */
  x: number;
  y: number;
  /** Piksel per satuan model (sudah termasuk kedalaman). */
  k: number;
  att: Attitude;
  /** Sudut sayap (radian), lihat wingAngle. */
  wing: number;
};

/**
 * Menggambar siluet rangkong pada kanvas. `base` adalah matriks dasar kanvas
 * (mis. skala DPR); semua bagian diisi hitam, jadi urutan gambar tidak penting.
 */
export function drawHornbill(ctx: CanvasRenderingContext2D, base: DOMMatrix, pose: HornbillPose) {
  const P = getPaths();
  const m = rotation(pose.att);
  const k = pose.k;
  const at = (mat: [number, number, number, number, number, number]) => {
    ctx.setTransform(base);
    ctx.translate(pose.x, pose.y);
    ctx.transform(...mat);
  };
  ctx.fillStyle = "#0a0a0a";

  // Bidang tengah: profil badan + ekor, lalu kepala (dipotong dari siluet CC0).
  const sagittal = planeMatrix(m, [0, 0, 0], [1, 0, 0], [0, -1, 0], k);
  at(sagittal);
  ctx.fill(P.body);
  const H = HORNBILL_HEAD.place;
  ctx.save();
  ctx.translate(H.x, H.y);
  ctx.rotate((H.rotate * Math.PI) / 180);
  ctx.scale(H.scale, H.scale);
  ctx.translate(-H.ox, -H.oy);
  const c = HORNBILL_HEAD.clip;
  ctx.beginPath();
  ctx.rect(c.x, c.y, c.w, c.h);
  ctx.clip();
  ctx.translate(0, 1536);
  ctx.scale(0.1, -0.1);
  ctx.fill(P.head);
  ctx.restore();

  // Ekor mendatar.
  at(planeMatrix(m, [0, 2, 0], [1, 0, 0], [0, 0, 1], k));
  ctx.fill(P.tail);

  // Sayap kanan (+z) dan kiri (−z), berengsel di bahu.
  const u: Vec3 = [1, 0, 0];
  for (const side of [1, -1]) {
    const shoulder: Vec3 = [WING_PIVOT.x, -WING_PIVOT.y, side * SHOULDER_Z];
    const d: Vec3 = scale([0, Math.sin(pose.wing), side * Math.cos(pose.wing)], WING_SPAN);
    // Titik jalur sayap (wx, wy) → bahu + (wx − px)·u − (wy − py)·d
    const origin = sub(sub(shoulder, scale(u, WING_PIVOT.x)), scale(d, -WING_PIVOT.y));
    at(planeMatrix(m, origin, u, scale(d, -1), k));
    ctx.fill(P.wing);
  }

  // Bola-bola badan (proyeksi bola = lingkaran).
  ctx.setTransform(base);
  ctx.beginPath();
  for (const [sx, sy, r] of SPINE) {
    const w = apply(m, [sx, -sy, 0]);
    const px = pose.x + w[0] * k;
    const py = pose.y - w[1] * k;
    ctx.moveTo(px + r * k, py);
    ctx.arc(px, py, r * k, 0, Math.PI * 2);
  }
  ctx.fill();
}

/** Satuan skala kedalaman → kecepatan menjauh/mendekat (px per detik per satuan skala/detik). */
const DEPTH_K = 900;

type Sampler = (t: number) => { x: number; y: number; s: number; vx: number; vy: number; vs: number };

/** Sikap dari lintasan pada waktu t: arah, angguk, dan miring (laju belok dihaluskan ±0,12 detik). */
export function attitudeAt(sample: Sampler, t: number): Attitude {
  const yawOf = (q: ReturnType<Sampler>) => Math.atan2(-q.vs * DEPTH_K, q.vx);
  const p = sample(t);
  const h = 0.12;
  const yawRate = angleDelta(yawOf(sample(t - h)), yawOf(sample(t + h))) / (2 * h);
  return attitudeFrom({ vx: p.vx, vy: p.vy, vz: p.vs * DEPTH_K }, clamp(yawRate, -12, 12));
}

export { wingAngle };
