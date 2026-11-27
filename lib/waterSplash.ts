// Gerak percikan "plong" sesudah tetesan menyentuh air, untuk animasi beranda.
//
// Urutan yang tampak pada rekaman gerak lambat tetesan milimeter yang jatuh
// ke kolam dalam (jet Worthington):
//   1. Tetesan menyatu dan membuat kawah (dihitung lib/waterRipple.ts).
//   2. Kawah runtuh; gelombang kapiler memusat di dasarnya dan mendorong
//      kolam air naik dari tengah.
//   3. Ujung kolom menggembung lalu melepaskan satu butir air.
//   4. Butir melambung (jatuh bebas), kolom surut ke permukaan.
//   5. Butir jatuh kembali dan membuat percikan kedua yang lebih kecil.
//
// Gerak kolom memakai perlambatan tetap (gravitasi ditambah tarikan tegangan
// permukaan), butir memakai gravitasi murni. Angkanya disetel agar sesuai
// rekaman tetesan ±3,6 mm yang jatuh dari ±6 cm: kolom ±1,5 cm, butir
// ±1,5 mm, seluruh percikan ±0,2 detik.

import { GRAVITY } from "./waterRipple";

/** Kolom mulai muncul sesudah kawah runtuh (detik sejak menyentuh air). */
export const JET_START = 0.028;
/** Laju awal ujung kolom (m/s). */
const JET_SPEED = 0.8;
/** Perlambatan ujung kolom: gravitasi + tarikan tegangan permukaan (m/s²). */
const JET_DECEL = 20;
/** Lama sejak kolom muncul sampai butir di ujungnya lepas (detik). */
const PINCH_AFTER = 0.025;
/** Jari-jari butir yang lepas, jari-jari ujung kolom, dan jari-jari kakinya (m). */
export const BEAD_RADIUS = 1.5e-3;
const TIP_RADIUS = 1.1e-3;
const BASE_RADIUS = 3.6e-3;
/** Tinggi pelebaran kaki kolom (m). */
const BASE_HEIGHT = 2.4e-3;
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
export const SPLASH_END = 0.21;
