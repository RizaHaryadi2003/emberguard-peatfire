// Suasana langit & cahaya yang berubah mengikuti tingkat bahaya kebakaran.
// Saat gambut terbakar, kabut asap membuat langit jingga keruh dan matahari
// meredup; nilai-nilai ini menerjemahkan hal itu ke parameter adegan 3D.

export type RGB = [number, number, number];

export type Atmosphere = {
  /** Parameter model langit fisik (three.js Sky). */
  turbidity: number;
  rayleigh: number;
  mieCoefficient: number;
  mieDirectionalG: number;
  /** Warna & kerapatan kabut (FogExp2). */
  fogColor: RGB;
  fogDensity: number;
  /** Warna & kekuatan cahaya matahari. */
  sunColor: RGB;
  sunIntensity: number;
  /**
   * Kekuatan cahaya pantul langit (lingkungan) & kecerahan latar langit.
   * Langit berasap jauh lebih terang secara fisik, jadi keduanya diredam
   * agar adegan tidak "silau" dan tetap terasa gelap-muram.
   */
  environmentIntensity: number;
  backgroundIntensity: number;
  /** Seberapa tebal kubah asap menutupi langit (0 = langit terlihat, 1 = tertutup). */
  smokeCover: number;
};

/** Pagi cerah berkabut tipis di hutan rawa gambut. */
export const CLEAR_ATMOSPHERE: Atmosphere = {
  turbidity: 4,
  rayleigh: 1.4,
  mieCoefficient: 0.004,
  mieDirectionalG: 0.82,
  fogColor: [0.6, 0.64, 0.62],
  fogDensity: 0.012,
  sunColor: [1.0, 0.86, 0.68],
  sunIntensity: 3.6,
  environmentIntensity: 0.28,
  backgroundIntensity: 0.5,
  smokeCover: 0,
};

/** Langit tertutup kabut asap karhutla. */
export const HAZE_ATMOSPHERE: Atmosphere = {
  turbidity: 16,
  rayleigh: 3.2,
  mieCoefficient: 0.05,
  mieDirectionalG: 0.9,
  fogColor: [0.52, 0.34, 0.2],
  fogDensity: 0.035,
  sunColor: [1.0, 0.52, 0.24],
  sunIntensity: 1.6,
  environmentIntensity: 0.06,
  backgroundIntensity: 0.12,
  smokeCover: 0.92,
};

/** Kurva halus 0–1 (awal & akhir melambat). */
export function smoothstep01(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mixRGB(a: RGB, b: RGB, t: number): RGB {
  return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
}

/** Suasana untuk tingkat bahaya 0 (aman) sampai 1 (rawan terbakar parah). */
export function getAtmosphere(danger: number): Atmosphere {
  const t = smoothstep01(danger);
  const a = CLEAR_ATMOSPHERE;
  const b = HAZE_ATMOSPHERE;
  return {
    turbidity: mix(a.turbidity, b.turbidity, t),
    rayleigh: mix(a.rayleigh, b.rayleigh, t),
    mieCoefficient: mix(a.mieCoefficient, b.mieCoefficient, t),
    mieDirectionalG: mix(a.mieDirectionalG, b.mieDirectionalG, t),
    fogColor: mixRGB(a.fogColor, b.fogColor, t),
    fogDensity: mix(a.fogDensity, b.fogDensity, t),
    sunColor: mixRGB(a.sunColor, b.sunColor, t),
    sunIntensity: mix(a.sunIntensity, b.sunIntensity, t),
    environmentIntensity: mix(a.environmentIntensity, b.environmentIntensity, t),
    backgroundIntensity: mix(a.backgroundIntensity, b.backgroundIntensity, t),
    smokeCover: mix(a.smokeCover, b.smokeCover, t),
  };
}
