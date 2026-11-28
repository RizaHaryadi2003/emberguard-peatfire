// Percikan mahkota: tetesan yang menghantam kolam dalam cukup cepat membuka
// kawah, melempar dinding air tipis (mahkota) ke atas, bibir mahkota pecah
// menjadi jari-jari berbutir, lalu kawah runtuh dan kolom air naik di tengah
// (kolom ada di lib/waterSplash.ts).
//
// Semua keadaan dihitung dari waktu t (bukan simulasi langkah demi langkah),
// jadi animasi bisa diputar maju, mundur, atau dilompati tanpa galat menumpuk.
// Yang dihitung dari hukum fisika:
//   - Kawah: kekekalan energi (Lherm dkk. 2022; Lherm & Deguen 2023). Bagian φ
//     energi gerak tetesan menjadi energi gerak air di sekitar kawah setengah
//     bola, energi potensial rongga, dan energi permukaan.
//   - Bentuk kawah: pipih → memanjang → setengah bola → pipih saat runtuh,
//     mengikuti koefisien Legendre terukur (Lherm & Deguen 2023, gambar 4).
//   - Bibir mahkota: naik karena diumpan kawah yang membuka, ditarik turun
//     gravitasi dan tegangan permukaan (laju Taylor–Culick √(2σ/ρh)).
//   - Jari: ketidakstabilan Rayleigh–Plateau pada bibir. Panjang gelombang
//     paling tumbuh ≈ 9,02 × jari-jari bibir, jarak antarjari acak karena
//     berasal dari gangguan acak yang diperkuat (Deegan, Brunet & Eggers 2008).
//   - Butir: volume satu panjang gelombang bibir, lalu jatuh bebas.
// Koefisien yang disetel (bukan diukur) ditandai "disetel".

import { DROP_RADIUS, GRAVITY } from "./waterRipple";

/** Massa jenis (kg/m³) dan tegangan permukaan (N/m) air ±25 °C. */
const RHO = 998;
const SIGMA = 0.0728;

/** Laju tetesan saat menghantam air (m/s); setara jatuh ±46 cm. */
export const IMPACT_SPEED = 3.0;
/** Bilangan tak berdimensi tumbukan (jari-jari tetesan sebagai panjang). */
export const FROUDE = (IMPACT_SPEED * IMPACT_SPEED) / (GRAVITY * DROP_RADIUS);
export const WEBER = (RHO * IMPACT_SPEED * IMPACT_SPEED * DROP_RADIUS) / SIGMA;

/** Bagian energi gerak tetesan yang menjadi kawah (disetel; Lherm 2022: ±0,2 pada Fr ±500). */
const ENERGY_SHARE = 0.2;
/** Koreksi energi gerak air di sekitar kawah (Lherm dkk. 2022). */
const KINETIC_CORRECTION = 0.34;
/** Runtuh lebih cepat dari membuka karena gaya apung (disetel; Lherm & Deguen 2023). */
const COLLAPSE_SPEEDUP = 1.55;

const dropEnergy = 0.5 * ((4 / 3) * Math.PI * DROP_RADIUS ** 3 * RHO) * IMPACT_SPEED ** 2;

/** Energi potensial + permukaan rongga setengah bola berjari-jari R (J). */
function cavityEnergy(r: number) {
  return (Math.PI / 4) * RHO * GRAVITY * r ** 4 + Math.PI * SIGMA * r * r;
}

/** Jari-jari kawah terbesar: semua energi kawah menjadi energi rongga. */
function solveMaxRadius() {
  let lo = 0;
  let hi = 0.05;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (cavityEnergy(mid) < ENERGY_SHARE * dropEnergy) lo = mid;
    else hi = mid;
  }
  return lo;
}

export const CRATER_MAX = solveMaxRadius();

/**
 * Tabel jari-jari kawah saat membuka, R(t), dari dR/dt =
 * √((φE − E_rongga(R)) / (ξπρR³)). Dimulai dari jari-jari tetesan.
 */
function buildOpening() {
  const ts: number[] = [0];
  const rs: number[] = [DROP_RADIUS * 0.6];
  let r = rs[0];
  let t = 0;
  const target = CRATER_MAX * 0.9995;
  while (r < target) {
    const spare = Math.max(ENERGY_SHARE * dropEnergy - cavityEnergy(r), 0);
    // Pada tetesan dan kolam berzat sama, dasar kawah mula-mula turun dengan
    // laju U/2; rumus energi baru berlaku setelah kawah lebih besar dari tetesan.
    const v = Math.min(Math.sqrt(spare / (KINETIC_CORRECTION * Math.PI * RHO * r ** 3)), IMPACT_SPEED / 2);
    // Langkah jari-jari kecil di awal, langkah waktu dibatasi di dekat puncak.
    const dr = Math.min(CRATER_MAX * 2e-4, v * 2e-6 + 1e-9);
    t += dr / Math.max(v, 1e-3);
    r += dr;
    ts.push(t);
    rs.push(Math.min(r, CRATER_MAX));
  }
  return { ts, rs, tMax: t };
}

const OPENING = buildOpening();
/** Waktu kawah mencapai ukuran terbesar (s). */
export const CRATER_PEAK = OPENING.tMax;
/** Waktu kawah habis runtuh (s); kolom tengah mulai naik sedikit sebelumnya. */
export const CRATER_END = CRATER_PEAK * (1 + 1 / COLLAPSE_SPEEDUP);

function openingRadius(t: number) {
  const { ts, rs } = OPENING;
  if (t <= 0) return rs[0];
  if (t >= OPENING.tMax) return CRATER_MAX;
  let lo = 0;
  let hi = ts.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (ts[mid] <= t) lo = mid;
    else hi = mid;
  }
  const f = (t - ts[lo]) / (ts[hi] - ts[lo]);
  return rs[lo] + (rs[hi] - rs[lo]) * f;
}

/** Jari-jari rata-rata kawah R₀(t) (m). */
export function craterRadius(t: number): number {
  if (t <= 0 || t >= CRATER_END) return 0;
  // Runtuh: kebalikan waktu membuka, dipercepat gaya apung.
  const r = t <= CRATER_PEAK ? openingRadius(t) : openingRadius(CRATER_PEAK - (t - CRATER_PEAK) * COLLAPSE_SPEEDUP);
  // Tabel dimulai dari jari-jari tetesan; digeser agar kawah tumbuh dari nol
  // dan habis tepat di nol (tanpa lompatan di awal dan akhir).
  const r0 = OPENING.rs[0];
  return ((r - r0) / (CRATER_MAX - r0)) * CRATER_MAX;
}

function lerpTable(xs: number[], ys: number[], x: number) {
  if (x <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i++) {
    if (x <= xs[i]) {
      const f = (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
      const s = f * f * (3 - 2 * f);
      return ys[i - 1] + (ys[i] - ys[i - 1]) * s;
    }
  }
  return ys[ys.length - 1];
}

/**
 * Perbandingan R₁/R₀ (simpangan dari setengah bola; + memanjang ke bawah,
 * − pipih) terhadap t/t_maks, dibaca dari gambar 4b Lherm & Deguen 2023.
 */
const SHAPE_AT = [0, 0.25, 0.5, 1, 1.35, 1 + 1 / COLLAPSE_SPEEDUP];
const SHAPE_K = [-0.2, 0, 0.08, 0, -0.22, -0.35];

export type Crater = {
  /** Kedalaman dasar (m, positif ke bawah). */
  depth: number;
  /** Jari-jari mulut di permukaan (m). */
  mouth: number;
};

/** Kawah pada t detik sejak tetesan menyentuh air. */
export function craterAt(t: number): Crater {
  const r0 = craterRadius(t);
  if (r0 <= 0) return { depth: 0, mouth: 0 };
  const k = lerpTable(SHAPE_AT, SHAPE_K, t / CRATER_PEAK);
  return { depth: r0 * (1 + k), mouth: r0 * (1 - 0.5 * k) };
}

// --- Dinding mahkota -------------------------------------------------------

/**
 * Dinding mahkota melebar ke atas seperti kelopak: separuh bawah condong
 * sedikit, separuh atas condong jauh ke luar (dari tegak, rad), seperti
 * pada foto percikan mahkota.
 */
export const LEAN_LOW = (10 * Math.PI) / 180;
export const LEAN_HIGH = (38 * Math.PI) / 180;
const CROWN_LEAN = LEAN_HIGH;
/** Pergeseran mendatar bibir per tinggi mahkota. */
const RIM_SPREAD = 0.5 * Math.tan(LEAN_LOW) + 0.5 * Math.tan(LEAN_HIGH);
/** Bibir naik sebanding laju membukanya kawah (disetel agar tinggi mahkota ≈ jari-jari kawah). */
const CROWN_FEED = 1.35;
/** Tebal lembar mahkota di pangkal dan di dekat bibir (m), dan jari-jari bibir. */
export const SHEET_BASE = 3.6e-4;
export const SHEET_TOP = 1.4e-4;
const RIM_START = 1.2e-4;
const RIM_END = 2.2e-4;

/** Laju Taylor–Culick: bibir lembar setebal h tertarik tegangan permukaan (m/s). */
export function taylorCulick(h: number): number {
  return Math.sqrt((2 * SIGMA) / (RHO * h));
}

/**
 * Tinggi bibir mahkota H(t), dihitung sekali sebagai tabel:
 * dH/dt = κ·max(dR₀/dt, 0) − g·t − ramp·v_TC. Bibir yang diumpan kawah naik
 * cepat; begitu kawah melambat, gravitasi dan tegangan permukaan menariknya
 * kembali sampai mahkota tenggelam.
 */
function buildCrown() {
  const dt = 2e-5;
  const ts: number[] = [];
  const hs: number[] = [];
  const vs: number[] = [];
  let h = 0;
  let t = 0;
  const vtc = taylorCulick(SHEET_TOP);
  while (t < CRATER_END * 1.6) {
    const dR = (craterRadius(t + dt) - craterRadius(t)) / dt;
    // Tarikan tegangan permukaan baru penuh sesudah lembar menipis (±1 ms).
    const pull = vtc * 0.25 * (1 - Math.exp(-t / 1e-3));
    const v = CROWN_FEED * Math.max(dR, 0) - GRAVITY * t - pull;
    ts.push(t);
    hs.push(h);
    vs.push(v);
    h = Math.max(h + v * dt, 0);
    t += dt;
    if (h === 0 && t > CRATER_PEAK) break;
  }
  return { ts, hs, vs, dt, end: t };
}

const CROWN = buildCrown();
/** Tinggi mahkota tertinggi (m) dan saatnya (s). */
export const CROWN_PEAK_HEIGHT = Math.max(...CROWN.hs);
export const CROWN_PEAK_AT = CROWN.hs.indexOf(CROWN_PEAK_HEIGHT) * CROWN.dt;
/** Waktu mahkota habis tenggelam kembali (s). */
export const CROWN_END = CROWN.end;

export type Crown = {
  /** Tinggi bibir di atas permukaan (m); 0 bila tidak ada mahkota. */
  height: number;
  /** Jari-jari pangkal dinding (m), di mulut kawah. */
  base: number;
  /** Jari-jari bibir di puncak (m). */
  rim: number;
  /** Jari-jari tabung bibir (m). */
  rimRadius: number;
  /** Laju bibir (m/s): ke luar dan ke atas. */
  vr: number;
  vz: number;
};

const NO_CROWN: Crown = { height: 0, base: 0, rim: 0, rimRadius: 0, vr: 0, vz: 0 };

export function crownAt(t: number): Crown {
  if (t <= 0 || t >= CROWN_END) return NO_CROWN;
  const i = Math.min(Math.floor(t / CROWN.dt), CROWN.hs.length - 2);
  const f = t / CROWN.dt - i;
  const height = CROWN.hs[i] + (CROWN.hs[i + 1] - CROWN.hs[i]) * f;
  if (height <= 0) return NO_CROWN;
  const vz = CROWN.vs[i];
  // Sesudah kawah runtuh, pangkal mahkota tetap di tempat terakhirnya.
  const mouth = Math.max(craterAt(Math.min(t, CRATER_PEAK)).mouth, craterAt(t).mouth);
  const base = mouth + SHEET_BASE;
  const lean = RIM_SPREAD;
  const grow = Math.min(t / CRATER_PEAK, 1);
  const dR = (craterRadius(t + 1e-5) - craterRadius(t)) / 1e-5;
  return {
    height,
    base,
    rim: base + height * lean,
    // Saat mahkota tenggelam, bibirnya ikut menyatu ke permukaan, bukan
    // tertinggal sebagai cincin.
    rimRadius: (RIM_START + (RIM_END - RIM_START) * grow) * (t > CRATER_PEAK * 0.5 ? Math.min(1, height / 1.5e-3) : 1),
    vr: Math.max(dR, 0) + Math.max(vz, 0) * lean,
    vz,
  };
}

// --- Jari dan butir --------------------------------------------------------

/** Panjang gelombang Rayleigh paling tumbuh per jari-jari tabung (2π/0,697). */
export const RAYLEIGH_WAVELENGTH = 9.02;
/** Jari mulai tampak sesudah sekian bagian waktu kawah membuka (disetel). */
const FINGER_ONSET = 0.14;
/** Waktu tumbuh jari (s); Deegan dkk. 2008 mengukur 0,6–1,1 ms. */
const FINGER_GROWTH = 0.9e-3;
/** Simpangan awal jari terhadap jari-jari bibir. */
const FINGER_SEED = 0.05;
/** Arah jari: dinding mahkota ditambah tekukan ke luar (rad). */
const FINGER_BEND = (18 * Math.PI) / 180;

/** Pembangkit acak tetap (mulberry32) agar percikan sama tiap diputar. */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

type FingerPlan = {
  angle: number;
  /** Pengali laju tumbuh (spektrum lebar → tidak seragam). */
  rate: number;
  /** Panjang saat butir pertama lepas (m). */
  pinch: number;
  /** Jari-jari butir pertama dan kedua (0 = tidak ada butir kedua). */
  bead: number;
  bead2: number;
  /** Arah ke luar tambahan (rad). */
  bend: number;
};

/** Saat jari mulai tumbuh: keliling bibir dibagi panjang gelombang. */
const ONSET_T = CRATER_PEAK * FINGER_ONSET;

function planFingers(): FingerPlan[] {
  const rand = random(20261128);
  const c = crownAt(ONSET_T);
  const n = Math.max(6, Math.round((2 * Math.PI * c.rim) / (RAYLEIGH_WAVELENGTH * RIM_END)));
  const wavelength = (2 * Math.PI * c.rim) / n;
  const plans: FingerPlan[] = [];
  for (let i = 0; i < n; i++) {
    // Volume satu panjang gelombang tabung bibir menjadi satu butir:
    // (4/3)πr³ = λ·πa²  →  r = (¾·λ·a²)^⅓.
    const base = Math.cbrt(0.75 * wavelength * RIM_END * RIM_END);
    const size = 0.7 + 0.6 * rand();
    plans.push({
      angle: ((i + (rand() - 0.5) * 0.55) / n) * 2 * Math.PI,
      rate: 0.75 + 0.5 * rand(),
      pinch: 2.0e-3 + 2.4e-3 * rand(),
      bead: base * size,
      bead2: rand() < 0.45 ? base * size * (0.45 + 0.25 * rand()) : 0,
      bend: FINGER_BEND * (0.6 + 0.8 * rand()),
    });
  }
  return plans;
}

export const FINGERS = planFingers();

export type Finger = {
  angle: number;
  /** Panjang dari bibir (m) dan arah tekukan ke luar dari dinding (rad). */
  length: number;
  bend: number;
  /** Jari-jari ujung yang menggembung (m). */
  tip: number;
};

export type Droplet = { x: number; y: number; z: number; r: number };

/** Panjang jari tanpa memperhitungkan lepasnya butir (tumbuh eksponensial). */
function rawLength(plan: FingerPlan, t: number) {
  const tau = t - ONSET_T;
  if (tau <= 0) return 0;
  return FINGER_SEED * RIM_END * Math.exp((tau * plan.rate) / FINGER_GROWTH);
}

/** Saat panjang jari mencapai L (s). */
function timeForLength(plan: FingerPlan, len: number) {
  return ONSET_T + (FINGER_GROWTH / plan.rate) * Math.log(len / (FINGER_SEED * RIM_END));
}

/** Titik dan laju ujung jari pada saat t, sebagai butir yang lepas. */
function tipState(plan: FingerPlan, t: number, len: number) {
  const c = crownAt(t);
  const dir = CROWN_LEAN + plan.bend;
  const out = c.rim + Math.sin(dir) * len;
  const z = c.height + Math.cos(dir) * len;
  const grow = (len * plan.rate) / FINGER_GROWTH;
  // Ujung jari bergerak bersama bibir, ditambah laju tumbuh jari, dikurangi
  // tarikan kapiler ke arah pangkal (butir lepas sedikit melambat).
  const v = grow * 0.25;
  return {
    pos: [Math.cos(plan.angle) * out, Math.sin(plan.angle) * out, z],
    vel: [Math.cos(plan.angle) * (c.vr + Math.sin(dir) * v), Math.sin(plan.angle) * (c.vr + Math.sin(dir) * v), c.vz + Math.cos(dir) * v],
  };
}

/** Butir yang terbang: jatuh bebas dari saat lepas; tenggelam di bawah air. */
function flying(start: { pos: number[]; vel: number[] }, since: number, r: number): Droplet | null {
  const z = start.pos[2] + start.vel[2] * since - 0.5 * GRAVITY * since * since;
  if (z < -r) return null;
  return { x: start.pos[0] + start.vel[0] * since, y: start.pos[1] + start.vel[1] * since, z, r };
}

export type CrownState = {
  crater: Crater;
  crown: Crown;
  fingers: Finger[];
  droplets: Droplet[];
};

/** Lama jari menarik diri sesudah butir lepas sebelum tumbuh lagi (s). */
const RECOIL = 0.8e-3;

/** Seluruh keadaan percikan mahkota pada t detik sejak menyentuh air. */
export function crownStateAt(t: number): CrownState {
  const crater = craterAt(t);
  const crown = crownAt(t);
  const fingers: Finger[] = [];
  const droplets: Droplet[] = [];
  for (const plan of FINGERS) {
    const t1 = timeForLength(plan, plan.pinch);
    const t2 = timeForLength(plan, plan.pinch * 1.9) + RECOIL;
    let len = rawLength(plan, t);
    let tip = 0;
    if (t < t1) {
      // Ujung menggembung menjelang butir pertama lepas.
      tip = plan.bead * Math.min(1, len / plan.pinch);
    } else if (plan.bead2 > 0 && t < t2) {
      // Sesudah lepas jari memendek, lalu tumbuh lagi untuk butir kedua.
      const back = Math.min((t - t1) / RECOIL, 1);
      const regrow = rawLength(plan, t - RECOIL) - plan.pinch * 0.9;
      len = Math.max(plan.pinch * (1 - 0.55 * back), regrow);
      tip = plan.bead2 * Math.min(1, Math.max(0, (t - t1) / (t2 - t1)));
    } else {
      // Jari habis dan surut ke bibir.
      const tEnd = plan.bead2 > 0 ? t2 : t1;
      len = plan.pinch * 0.45 * Math.exp(-(t - tEnd) / 1.5e-3);
      tip = 0;
    }
    if (crown.height > 0 && len > 1e-5) fingers.push({ angle: plan.angle, length: len, bend: plan.bend + CROWN_LEAN, tip: Math.max(tip, crown.rimRadius * 0.6) });
    if (t >= t1) {
      const d = flying(tipState(plan, t1, plan.pinch), t - t1, plan.bead);
      if (d) droplets.push(d);
    }
    if (plan.bead2 > 0 && t >= t2) {
      const d = flying(tipState(plan, t2, plan.pinch * 0.95), t - t2, plan.bead2);
      if (d) droplets.push(d);
    }
  }
  return { crater, crown, fingers, droplets };
}

/** Batas atas jumlah jari dan butir yang dikirim ke shader. */
export const MAX_FINGERS = 40;
export const MAX_DROPLETS = 80;
