// Model riak tetesan air untuk animasi beranda: logo navigasi jatuh sebagai
// tetesan ke permukaan air, lalu riaknya melebar menjadi lingkaran faktor.
//
// Riak dihitung dengan teori gelombang linear (masalah Cauchy–Poisson) untuk
// air dalam, termasuk tegangan permukaan dan kekentalan:
//
//   ω(k)² = g·k + (σ/ρ)·k³                (relasi dispersi kapiler-gravitasi)
//   η(r,t) = ∫ Φ(k) · (k/ω) · sin(ωt) · e^(−2νk²t) · J₀(kr) · k dk
//
// Φ(k) adalah dorongan awal tetesan (Gaussian selebar tetesan), J₀ fungsi
// Bessel orde nol. Karena gelombang pendek (kapiler) lebih cepat dari
// gelombang panjang, riak terluar lebih rapat dan riak di dalam lebih
// renggang, persis seperti pada foto tetesan sungguhan. Di dekat titik jatuh
// (kawah, mahkota, kolom) gerak air tidak linear, jadi bagian itu digambar
// dari lib/waterCrown.ts dan lib/waterSplash.ts; model linear ini dipakai
// untuk riak yang sudah menjauh.
//
// Semua besaran dalam satuan SI (meter, detik). Gambar di layar hanya
// mengalikan jarak dengan skala piksel per meter.

/** Percepatan gravitasi (m/s²). */
export const GRAVITY = 9.81;
/** Tegangan permukaan dibagi massa jenis air pada ±25 °C (m³/s²). */
export const SURFACE_TENSION = 7.2e-5;
/** Kekentalan kinematik air (m²/s). */
export const VISCOSITY = 1.0e-6;
/** Jari-jari tetesan (m): tetesan kecil dari ujung pipet. */
export const DROP_RADIUS = 1.8e-3;
/** Lebar dorongan awal di permukaan, sebanding kawah mahkota (lib/waterCrown.ts) (m). */
export const IMPACT_WIDTH = 4.5e-3;
/** Simpangan pusat terdalam pada riak (m); kawah sesungguhnya digambar dari lib/waterCrown.ts. */
export const CRATER_DEPTH = 2.0e-3;
/** Jari-jari lingkaran faktor dalam ukuran nyata (m). */
export const RING_RADIUS = 0.12;
/** Jangkauan riak yang dihitung, kelipatan jari-jari lingkaran. */
export const FIELD_EXTENT = 2.2;

/** Jumlah titik jari-jari dan bilangan gelombang pada perhitungan. */
const RADIAL_SAMPLES = 2048;
const WAVE_SAMPLES = 200;
const K_MAX = 3200;
/** Bagian kemiringan riak terkuat yang masih dihitung sebagai muka riak. */
const FRONT_SHARE = 0.25;

/** Frekuensi sudut gelombang berbilangan gelombang k (rad/s). */
export function omega(k: number): number {
  return Math.sqrt(GRAVITY * k + SURFACE_TENSION * k * k * k);
}

/** Kecepatan kelompok dω/dk (m/s): laju rambat sebuah riak. */
export function groupVelocity(k: number): number {
  return (GRAVITY + 3 * SURFACE_TENSION * k * k) / (2 * omega(k));
}

// Pendekatan rasional fungsi Bessel J₀ dan J₁ (Numerical Recipes, bab 6.5),
// galat < 1e-7 di seluruh rentang.

export function besselJ0(x: number): number {
  const ax = Math.abs(x);
  if (ax < 8) {
    const y = x * x;
    const a =
      57568490574.0 + y * (-13362590354.0 + y * (651619640.7 + y * (-11214424.18 + y * (77392.33017 + y * -184.9052456))));
    const b = 57568490411.0 + y * (1029532985.0 + y * (9494680.718 + y * (59272.64853 + y * (267.8532712 + y))));
    return a / b;
  }
  const z = 8 / ax;
  const y = z * z;
  const xx = ax - 0.785398164;
  const p = 1 + y * (-0.1098628627e-2 + y * (0.2734510407e-4 + y * (-0.2073370639e-5 + y * 0.2093887211e-6)));
  const q = -0.1562499995e-1 + y * (0.1430488765e-3 + y * (-0.6911147651e-5 + y * (0.7621095161e-6 - y * 0.934935152e-7)));
  return Math.sqrt(0.636619772 / ax) * (Math.cos(xx) * p - z * Math.sin(xx) * q);
}

export function besselJ1(x: number): number {
  const ax = Math.abs(x);
  if (ax < 8) {
    const y = x * x;
    const a =
      x * (72362614232.0 + y * (-7895059235.0 + y * (242396853.1 + y * (-2972611.439 + y * (15704.4826 + y * -30.16036606)))));
    const b = 144725228442.0 + y * (2300535178.0 + y * (18583304.74 + y * (99447.43394 + y * (376.9991397 + y))));
    return a / b;
  }
  const z = 8 / ax;
  const y = z * z;
  const xx = ax - 2.356194491;
  const p = 1 + y * (0.183105e-2 + y * (-0.3516396496e-4 + y * (0.2457520174e-5 + y * -0.240337019e-6)));
  const q = 0.04687499995 + y * (-0.2002690873e-3 + y * (0.8449199096e-5 + y * (-0.88228987e-6 + y * 0.105787412e-6)));
  const ans = Math.sqrt(0.636619772 / ax) * (Math.cos(xx) * p - z * Math.sin(xx) * q);
  return x < 0 ? -ans : ans;
}

export type RippleField = {
  /** Jumlah titik jari-jari pada profil. */
  samples: number;
  /** Jari-jari terjauh profil (m). */
  extent: number;
  /**
   * Profil riak pada waktu t (detik sejak menyentuh air), ditulis ke `out`
   * (panjang 4 × samples): per titik [tinggi η, kemiringan ∂η/∂r,
   * kelengkungan ∇²η, 0]. Satuan m, tanpa satuan, dan 1/m.
   */
  evaluate(t: number, out: Float32Array): Float32Array;
  /**
   * Jari-jari (m) muka riak: riak terluar yang kemiringannya masih seperempat
   * riak terkuat. Inilah tepi lingkaran air yang tertangkap mata.
   */
  crestRadius(t: number): number;
};

/**
 * Menyiapkan medan riak. Tabel J₀(kr) dan J₁(kr) dihitung sekali, jadi tiap
 * bingkai cukup menjumlah tabel dengan bobot waktu (±0,4 juta perkalian).
 */
export function createRippleField(): RippleField {
  const extent = RING_RADIUS * FIELD_EXTENT;
  const dr = extent / (RADIAL_SAMPLES - 1);
  const dk = K_MAX / WAVE_SAMPLES;
  const ks = new Float64Array(WAVE_SAMPLES);
  const ws = new Float64Array(WAVE_SAMPLES);
  const shape = new Float64Array(WAVE_SAMPLES);
  const j0 = new Float32Array(WAVE_SAMPLES * RADIAL_SAMPLES);
  const j1 = new Float32Array(WAVE_SAMPLES * RADIAL_SAMPLES);
  for (let i = 0; i < WAVE_SAMPLES; i++) {
    const k = (i + 0.5) * dk;
    ks[i] = k;
    ws[i] = omega(k);
    // Dorongan Gaussian ke bawah; faktor k·dk dari integral Hankel.
    shape[i] = -Math.exp((-k * k * IMPACT_WIDTH * IMPACT_WIDTH) / 4) * (k / ws[i]) * k * dk;
    for (let j = 0; j < RADIAL_SAMPLES; j++) {
      j0[i * RADIAL_SAMPLES + j] = besselJ0(k * j * dr);
      j1[i * RADIAL_SAMPLES + j] = besselJ1(k * j * dr);
    }
  }

  // Tinggi di pusat (J₀(0) = 1) cukup dijumlah bobotnya, jadi kedalaman kawah
  // terdalam murah dicari, lalu dipakai untuk menyetel besar dorongan.
  const centerHeight = (t: number) => {
    let s = 0;
    for (let i = 0; i < WAVE_SAMPLES; i++) s += shape[i] * Math.sin(ws[i] * t) * Math.exp(-2 * VISCOSITY * ks[i] * ks[i] * t);
    return s;
  };
  let deepest = 0;
  for (let n = 1; n <= 400; n++) deepest = Math.min(deepest, centerHeight(n * 1e-4));
  const amp = CRATER_DEPTH / Math.max(-deepest, 1e-12);

  const wH = new Float64Array(WAVE_SAMPLES);
  const evaluate = (t: number, out: Float32Array) => {
    for (let i = 0; i < WAVE_SAMPLES; i++) {
      wH[i] = t <= 0 ? 0 : amp * shape[i] * Math.sin(ws[i] * t) * Math.exp(-2 * VISCOSITY * ks[i] * ks[i] * t);
    }
    for (let j = 0; j < RADIAL_SAMPLES; j++) {
      let h = 0;
      let slope = 0;
      let lap = 0;
      for (let i = 0; i < WAVE_SAMPLES; i++) {
        const w = wH[i];
        const b0 = j0[i * RADIAL_SAMPLES + j];
        h += w * b0;
        // d/dr J₀(kr) = −k·J₁(kr);  ∇² J₀(kr) = −k²·J₀(kr)
        slope -= w * ks[i] * j1[i * RADIAL_SAMPLES + j];
        lap -= w * ks[i] * ks[i] * b0;
      }
      out[4 * j] = h;
      out[4 * j + 1] = slope;
      out[4 * j + 2] = lap;
      out[4 * j + 3] = 0;
    }
    return out;
  };

  const scratch = new Float32Array(4 * RADIAL_SAMPLES);
  const crestRadius = (t: number) => {
    evaluate(t, scratch);
    // Abaikan sekitar titik jatuh; yang dicari gelombang yang sudah lepas.
    const from = Math.ceil((3 * IMPACT_WIDTH) / dr);
    let peak = 0;
    for (let j = from; j < RADIAL_SAMPLES; j++) peak = Math.max(peak, Math.abs(scratch[4 * j + 1]));
    let front = from;
    for (let j = from; j < RADIAL_SAMPLES; j++) if (Math.abs(scratch[4 * j + 1]) >= FRONT_SHARE * peak) front = j;
    return front * dr;
  };

  return { samples: RADIAL_SAMPLES, extent, evaluate, crestRadius };
}

/**
 * Waktu (detik) saat puncak riak tiba di jari-jari lingkaran faktor. Puncak
 * dicari maju selangkah demi selangkah (riak yang sudah keluar dari medan
 * tidak boleh ikut terhitung), lalu dipertajam dengan bagi dua.
 */
export function crestArrivalTime(field: RippleField, radius = RING_RADIUS): number {
  const step = 0.005;
  let hi = step;
  while (hi < 1 && field.crestRadius(hi) < radius) hi += step;
  let lo = hi - step;
  for (let n = 0; n < 16; n++) {
    const mid = (lo + hi) / 2;
    if (field.crestRadius(mid) < radius) lo = mid;
    else hi = mid;
  }
  // hi selalu titik yang muka riaknya sudah sampai.
  return hi;
}

/**
 * Tinggi tetesan selama jatuh bebas dari diam, 1 di awal dan 0 saat
 * menyentuh air: z = 1 − u², dengan u kemajuan waktu jatuh 0..1.
 */
export function fallHeight(u: number): number {
  const c = Math.min(1, Math.max(0, u));
  return 1 - c * c;
}

let shared: { field: RippleField; crest: number } | null = null;

/**
 * Medan riak bersama untuk kanvas dan urutan gulir, dibuat sekali saat
 * pertama diminta (±20 ms) agar tabel Bessel tidak dihitung dua kali.
 */
export function sharedRipple(): { field: RippleField; crest: number } {
  if (!shared) {
    const field = createRippleField();
    shared = { field, crest: crestArrivalTime(field) };
  }
  return shared;
}
