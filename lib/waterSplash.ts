// Kolom air di tengah sesudah kawah runtuh (jet Worthington), untuk animasi
// beranda. Mahkota dan kawah sebelumnya ada di lib/waterCrown.ts.
//
// Urutan sesudah mahkota tenggelam:
//   1. Kawah runtuh; aliran yang memusat mendorong air naik dari tengah.
//   2. Ujung kolom menggembung lalu melepaskan satu butir air.
//   3. Butir melambung (jatuh bebas), kolom surut ke permukaan.
//   4. Butir jatuh kembali dan membuat percikan kedua yang lebih kecil.
//
// Pada Froude besar (±500) kolom yang terbentuk tebal dan lambat (Michon,
// Josserand & Séon 2017), dan mulai tumbuh ketika t/t_maks kawah ±1,5
// (Lherm & Deguen 2023). Gerak kolom memakai perlambatan tetap (gravitasi
// ditambah tarikan tegangan permukaan), butir memakai gravitasi murni.
// Ukuran kolom disetel, bukan diukur.

import { GRAVITY } from "./waterRipple";
import { CRATER_PEAK, CROWN_END } from "./waterCrown";

/** Kolom mulai muncul saat kawah runtuh (detik sejak menyentuh air). */
export const JET_START = CRATER_PEAK * 1.5;
/** Laju awal ujung kolom (m/s). */
const JET_SPEED = 0.75;
/** Perlambatan ujung kolom: gravitasi + tarikan tegangan permukaan (m/s²). */
const JET_DECEL = 20;
/** Lama sejak kolom muncul sampai butir di ujungnya lepas (detik). */
const PINCH_AFTER = 0.025;
/** Jari-jari butir yang lepas, jari-jari ujung kolom, dan jari-jari kakinya (m). */
export const BEAD_RADIUS = 1.8e-3;
const TIP_RADIUS = 1.4e-3;
const BASE_RADIUS = 4.8e-3;
/** Tinggi pelebaran kaki kolom (m). */
const BASE_HEIGHT = 3.0e-3;
/** Laju dan perlambatan kolom yang surut sesudah butir lepas. */
const RETRACT_SPEED = 0.1;
const RETRACT_DECEL = 15;
/** Besar percikan kedua terhadap yang pertama. */
export const SECOND_SCALE = 0.35;

export type Jet = {
  /** Tinggi ujung kolom (m); 0 bila tidak ada kolom. */
  height: number;
  tipRadius: number;
  baseRadius: number;
  baseHeight: number;
  /** Gembung di ujung kolom sebelum lepas; jari-jari 0 bila tidak ada. */
  bulbZ: number;
  bulbRadius: number;
};

export type Bead = { z: number; radius: number; /** Regangan tegak (1 = bulat). */ stretch: number };

export type Splash = { jets: Jet[]; bead: Bead | null; /** Waktu butir mendarat (detik). */ landing: number };

const NO_JET: Jet = { height: 0, tipRadius: TIP_RADIUS, baseRadius: BASE_RADIUS, baseHeight: BASE_HEIGHT, bulbZ: 0, bulbRadius: 0 };

function smooth(x: number) {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
}

/** Tinggi ujung kolom saat naik, τ detik sejak muncul. */
function rise(tau: number, scale: number) {
  const v = JET_SPEED * Math.sqrt(scale);
  return v * tau - 0.5 * JET_DECEL * tau * tau;
}

/** Kolom pada τ detik sejak muncul; `withBead` = ujungnya melepas butir. */
function jetAt(tau: number, scale: number, withBead: boolean): Jet {
  if (tau <= 0) return NO_JET;
  const tip = TIP_RADIUS * Math.sqrt(scale);
  const base = { tipRadius: tip, baseRadius: BASE_RADIUS * Math.sqrt(scale), baseHeight: BASE_HEIGHT * scale };
  if (!withBead || tau < PINCH_AFTER) {
    // Naik; ujungnya makin menggembung menjelang lepas.
    const h = rise(tau, scale);
    if (h <= 0) return NO_JET;
    const grow = withBead ? smooth(tau / PINCH_AFTER) : 0;
    const bulbRadius = withBead ? tip + (BEAD_RADIUS - tip) * grow : 0;
    return { ...base, height: h, bulbZ: h - bulbRadius, bulbRadius };
  }
  // Sesudah butir lepas, sisa kolom surut kembali ke permukaan.
  const t = tau - PINCH_AFTER;
  const h = rise(PINCH_AFTER, scale) - 2 * BEAD_RADIUS + RETRACT_SPEED * t - 0.5 * RETRACT_DECEL * t * t;
  return h > 0 ? { ...base, height: h, bulbZ: 0, bulbRadius: 0 } : NO_JET;
}

/** Saat butir lepas: tinggi pusat dan laju naiknya. */
function pinch() {
  const z = rise(PINCH_AFTER, 1) - BEAD_RADIUS;
  const v = JET_SPEED - JET_DECEL * PINCH_AFTER;
  return { z, v };
}

/** Waktu (detik sejak tetesan pertama) saat butir menyentuh air kembali. */
export function beadLanding(): number {
  const { z, v } = pinch();
  // z + v·t − ½g·t² = jari-jari butir (bagian bawah butir menyentuh air).
  const c = z - BEAD_RADIUS;
  const fly = (v + Math.sqrt(v * v + 2 * GRAVITY * c)) / GRAVITY;
  return JET_START + PINCH_AFTER + fly;
}

/** Keadaan percikan t detik sejak tetesan pertama menyentuh air. */
export function splashAt(t: number): Splash {
  const landing = beadLanding();
  const jets = [jetAt(t - JET_START, 1, true)];
  let bead: Bead | null = null;
  const flown = t - JET_START - PINCH_AFTER;
  if (flown >= 0 && t < landing) {
    const { z, v } = pinch();
    // Butir yang baru lepas masih memanjang lalu bergetar ke bentuk bulat.
    const stretch = 1 + 0.28 * Math.exp(-flown / 0.012) * Math.sin((2 * Math.PI * flown) / 0.016);
    bead = { z: z + v * flown - 0.5 * GRAVITY * flown * flown, radius: BEAD_RADIUS, stretch };
  }
  // Percikan kedua: kolom kecil tanpa butir.
  jets.push(jetAt(t - landing - JET_START * SECOND_SCALE, SECOND_SCALE, false));
  return { jets, bead, landing };
}

/** Sesudah waktu ini (detik) semua kolom dan butir sudah kembali ke air. */
export const SPLASH_END = JET_START + 0.19;

// --- Pemutaran -------------------------------------------------------------
// Percikan diputar sendiri dalam gerak lambat begitu tetesan menyentuh air.
// Seperti rekaman kamera kecepatan tinggi, kecepatannya dinaikkan (speed
// ramp): mahkota yang hanya ±28 ms diperlambat paling banyak, kolom dan butir
// sesudahnya lebih cepat.

/** Lama pemutaran percikan (detik nyata). */
export const PLAY_SECONDS = 5;
/** Bagian pemutaran untuk mahkota, dan waktu fisik yang dicakupnya. */
const SLOW_SHARE = 0.5;
const SLOW_UNTIL = CROWN_END + 0.004;

const PLAY_STEPS = 1000;

function buildPlayback() {
  const rate = (u: number, k: number) => {
    const x = Math.min(1, Math.max(0, (u - (SLOW_SHARE - 0.08)) / 0.16));
    return 1 + (k - 1) * x * x * (3 - 2 * x);
  };
  const integrate = (k: number) => {
    const acc = new Float64Array(PLAY_STEPS + 1);
    for (let i = 1; i <= PLAY_STEPS; i++) acc[i] = acc[i - 1] + rate((i - 0.5) / PLAY_STEPS, k);
    return acc;
  };
  // Cari perbandingan cepat/lambat agar separuh pertama tepat mencakup mahkota.
  let lo = 1;
  let hi = 200;
  for (let n = 0; n < 50; n++) {
    const k = (lo + hi) / 2;
    const acc = integrate(k);
    const share = acc[Math.round(SLOW_SHARE * PLAY_STEPS)] / acc[PLAY_STEPS];
    if (share * SPLASH_END > SLOW_UNTIL) lo = k;
    else hi = k;
  }
  const acc = integrate((lo + hi) / 2);
  return acc.map((a) => (a / acc[PLAY_STEPS]) * SPLASH_END);
}

const PLAYBACK = buildPlayback();

/** Waktu fisik percikan (detik) pada kemajuan pemutaran u (0..1). */
export function playbackTime(u: number): number {
  const x = Math.min(1, Math.max(0, u)) * PLAY_STEPS;
  const i = Math.min(Math.floor(x), PLAY_STEPS - 1);
  return PLAYBACK[i] + (PLAYBACK[i + 1] - PLAYBACK[i]) * (x - i);
}
