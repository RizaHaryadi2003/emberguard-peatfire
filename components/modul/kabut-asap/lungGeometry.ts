// Geometri gambar paru-paru Babak 03 (2D, vektor). Semua titik memakai
// koordinat ilustrasi sistem pernapasan Wikipedia (907 × 966) agar paru-paru
// buatan ini menyambung dengan kepala dan leher dari ilustrasi tersebut, dan
// agar lintasan butir di BreathView tetap tepat di atas anatominya.
//
// Bentuknya sengaja disederhanakan (bukan atlas): paru kanan tiga lobus, paru
// kiri dua lobus dengan lekuk jantung, trakea bercincin tulang rawan, dan
// pohon bronkus beberapa generasi pertama saja (aslinya ±23 generasi).

export type Pt = { x: number; y: number };

/** Paru kanan pemilik tubuh (tampak di kiri gambar): tiga lobus. */
export const LUNG_R_PATH =
  "M384 404 C350 408 302 466 274 552 C252 620 238 700 240 770 " +
  "C242 794 264 802 292 794 C332 782 380 772 418 780 " +
  "C434 782 440 766 436 740 L430 646 C428 612 434 582 424 556 " +
  "C416 530 422 488 420 452 C418 420 406 402 384 404 Z";

/** Paru kiri (tampak di kanan gambar): dua lobus dan lekuk jantung. */
export const LUNG_L_PATH =
  "M502 404 C532 404 582 456 612 542 C638 618 654 700 652 772 " +
  "C650 796 626 804 600 796 C570 786 542 780 522 788 " +
  "C506 792 492 778 500 752 C512 722 530 692 520 666 " +
  "C508 642 476 642 470 612 C466 582 468 560 466 530 " +
  "C464 480 478 404 502 404 Z";

/** Celah antarlobus (garis tipis): dua di paru kanan, satu di paru kiri. */
export const FISSURES = [
  "M428 520 C380 580 320 650 262 722",
  "M424 612 C380 606 320 602 262 612",
  "M474 500 C520 580 580 660 640 744",
];

/** Diafragma: lengkung tipis di bawah kedua paru. */
export const DIAPHRAGM_PATH =
  "M232 804 C270 770 330 782 380 790 C420 796 440 808 452 812 " +
  "C466 806 492 792 530 794 C580 790 628 776 662 806";

/** Garis tengah trakea dari leher sampai karina (percabangan). */
export const TRACHEA = [
  { x: 414, y: 362 },
  { x: 416, y: 390 },
  { x: 424, y: 430 },
  { x: 432, y: 472 },
  { x: 440, y: 516 },
];
export const CARINA: Pt = { x: 444, y: 532 };

/** Bronkus utama: kanan lebih pendek, lebar, dan tegak daripada kiri. */
export const BRONCHI = {
  R: [CARINA, { x: 424, y: 556 }, { x: 404, y: 590 }],
  L: [CARINA, { x: 470, y: 552 }, { x: 502, y: 580 }],
};

/** Titik pada paru kiri yang diperbesar di lensa alveolus. */
export const ZOOM_SPOT: Pt = { x: 590, y: 640 };
/** Lensa alveolus (lingkaran sisipan). */
export const LENS = { cx: 728, cy: 196, r: 128 };

export type Branch = {
  a: Pt;
  b: Pt;
  /** Kendali kurva kuadrat, agar cabang sedikit melengkung. */
  c: Pt;
  width: number;
  gen: number;
};

/** Bilangan semu 0–1 yang tetap untuk masukan yang sama. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Pohon bronkus satu paru: tiap cabang membelah dua (dikotomi) dengan sudut
 * dan panjang yang sedikit acak tetapi tetap (benih). `fan` mengarahkan
 * cabang menyebar ke bawah-luar, mengikuti bentuk paru.
 */
export function bronchialTree(
  start: Pt,
  angle: number,
  length: number,
  width: number,
  generations: number,
  seed: number,
): Branch[] {
  const out: Branch[] = [];
  const grow = (a: Pt, ang: number, len: number, w: number, gen: number, s: number) => {
    const b = { x: a.x + Math.cos(ang) * len, y: a.y + Math.sin(ang) * len };
    const bend = (hash(s * 3.7) - 0.5) * len * 0.25;
    const c = {
      x: (a.x + b.x) / 2 - Math.sin(ang) * bend,
      y: (a.y + b.y) / 2 + Math.cos(ang) * bend,
    };
    out.push({ a, b, c, width: w, gen });
    if (gen + 1 >= generations) return;
    const spread = 0.38 + hash(s * 1.9) * 0.22;
    const tilt = (hash(s * 5.3) - 0.5) * 0.3;
    for (const side of [-1, 1]) {
      const k = 0.68 + hash(s * 7.1 + side) * 0.14;
      grow(b, ang + side * spread + tilt, len * k, w * 0.72, gen + 1, s * 2 + (side > 0 ? 1 : 0) + 0.37);
    }
  };
  grow(start, angle, length, width, 0, seed);
  return out;
}

/** Pohon bronkus kedua paru, dimulai dari ujung bronkus utama. */
export const TREES = {
  R: [
    ...bronchialTree(BRONCHI.R[2], -2.2, 46, 6, 6, 11),
    ...bronchialTree(BRONCHI.R[2], 1.95, 58, 7, 7, 23),
    ...bronchialTree(BRONCHI.R[2], 2.75, 44, 5, 6, 37),
  ],
  L: [
    ...bronchialTree(BRONCHI.L[2], -1.05, 50, 6, 6, 41),
    ...bronchialTree(BRONCHI.L[2], 1.2, 60, 7, 7, 53),
    ...bronchialTree(BRONCHI.L[2], 0.35, 46, 5, 6, 67),
  ],
};

/** Kantong alveolus di dalam lensa: gugus anggur di ujung bronkiolus. */
export type Sac = { x: number; y: number; r: number };
export const BRONCHIOLE: Pt[] = [
  { x: 640, y: 300 },
  { x: 676, y: 262 },
  { x: 706, y: 228 },
];
const CLUSTERS = [
  { x: 690, y: 160, n: 7, r: 46 },
  { x: 782, y: 150, n: 8, r: 50 },
  { x: 786, y: 252, n: 7, r: 46 },
];
export const CLUSTER_STEMS = CLUSTERS.map((c) => ({ x: c.x, y: c.y }));

/** Kantong-kantong alveolus: satu kantong di pusat gugus, sisanya melingkar. */
export const SACS: Sac[] = CLUSTERS.flatMap((c, ci) => {
  const sacs: Sac[] = [{ x: c.x, y: c.y, r: 19 }];
  for (let k = 0; k < c.n - 1; k++) {
    const a = (k / (c.n - 1)) * Math.PI * 2 + ci * 0.6;
    const d = c.r * (0.52 + hash(ci * 10 + k) * 0.08);
    sacs.push({
      x: c.x + Math.cos(a) * d,
      y: c.y + Math.sin(a) * d,
      r: 15 + hash(ci * 20 + k) * 5,
    });
  }
  return sacs;
});
