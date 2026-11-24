// Keadaan tiap petak peta Modul Forensik Api pada satu saat: masih panas,
// sudah padam (bekas terbakar), atau belum tersentuh api.
//
// Bagian ini murni (tanpa React dan three.js) supaya bisa diuji, dan dipakai
// bersama oleh adegan 3D dan panel teks, jadi keduanya tidak pernah berselisih.

import { BURNS, BURN_SITES, GRID_W, escapedFire, type Detection } from "@/lib/model/ignition";

/**
 * Berapa hari sebuah petak masih terlihat panas sesudah api tiba. Satelit
 * melihat petak yang terbakar sebagai titik api selama apinya masih aktif;
 * sesudahnya petak itu menjadi bekas terbakar. Dua hari dipilih untuk
 * tampilan saja (ilustratif): cukup untuk melihat garis depan api bergerak.
 */
export const HOT_DAYS = 2;

/** Lama satu hari dalam animasi api pembersih lahan (milidetik). */
export const BURN_MS_PER_DAY = 550;

export type CellFire = "hot" | "scar";

/** Nomor petak di larik datar peta. */
export const cellIndex = (x: number, y: number) => y * GRID_W + x;

/** Keadaan petak-petak kebakaran `fire` pada hari ke-`day` (boleh pecahan). */
export function fireAt(fire: readonly Detection[], day: number, out = new Map<number, CellFire>()): Map<number, CellFire> {
  for (const d of fire) {
    if (d.day > day) continue;
    out.set(cellIndex(d.x, d.y), day - d.day < HOT_DAYS ? "hot" : "scar");
  }
  return out;
}

/** Jalannya api pembersih lahan ke-`i` (0 = pertama). */
export function burnFire(i: number): Detection[] {
  if (BURNS[i].escaped) return escapedFire();
  const s = BURN_SITES[i];
  return [{ x: s.x, y: s.y, day: 0 }];
}

/** Lama animasi api ke-`i` (milidetik): sepanjang umurnya, lalu sehari untuk padam. */
export function burnAnimMs(i: number): number {
  return (BURNS[i].days + 1) * BURN_MS_PER_DAY;
}

/**
 * Keadaan peta babak 03: api yang sudah selesai menjadi bekas terbakar; api
 * yang sedang dianimasikan (`animIndex`, sudah berjalan `elapsedMs`) menyala
 * mengikuti harinya. Api yang tidak lolos tetap panas sepanjang umurnya lalu
 * padam di petaknya.
 */
export function burnsAt(lit: number, animIndex: number | null, elapsedMs: number): Map<number, CellFire> {
  const out = new Map<number, CellFire>();
  for (let i = 0; i < lit; i++) {
    const fire = burnFire(i);
    if (i !== animIndex || elapsedMs >= burnAnimMs(i)) {
      for (const d of fire) out.set(cellIndex(d.x, d.y), "scar");
      continue;
    }
    const day = elapsedMs / BURN_MS_PER_DAY;
    if (BURNS[i].escaped) fireAt(fire, day, out);
    else for (const d of fire) out.set(cellIndex(d.x, d.y), day < BURNS[i].days ? "hot" : "scar");
  }
  return out;
}
