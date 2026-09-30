// Logika murni efek sorot kursor, dipisah dari komponen agar bisa diuji.

/** Jari-jari lingkaran sorot dalam piksel. */
export const SPOTLIGHT_R = 260;

/** Faktor penghalusan gerak kursor per bingkai (0–1; makin kecil makin lambat). */
export const SMOOTHING = 0.1;

export type Point = { x: number; y: number };

/**
 * Titik henti gradien radial: [posisi 0–1, opasitas 0–1].
 * Tengah pekat, lalu memudar lembut ke tepi sehingga tepi lingkaran tidak tajam.
 */
export const SPOTLIGHT_STOPS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [0.4, 1],
  [0.6, 0.75],
  [0.75, 0.4],
  [0.88, 0.12],
  [1, 0],
];

/** Interpolasi linear: geser `current` sebagian (`factor`) menuju `target`. */
export function lerp(current: number, target: number, factor: number): number {
  return current + (target - current) * factor;
}

/** Satu langkah penghalusan posisi kursor untuk satu bingkai animasi. */
export function smoothStep(smooth: Point, target: Point, factor = SMOOTHING): Point {
  return {
    x: lerp(smooth.x, target.x, factor),
    y: lerp(smooth.y, target.y, factor),
  };
}
