// Jangkauan lahan rawan dari kanal, dinyatakan dalam lapangan bola.
// Dipakai peta lahan dan kartu tugas babak 02 Modul Kanal.

import { COLUMNS, TRANSECT_LENGTH_M } from "./drainage";

/**
 * Lapangan sepak bola menurut ukuran FIFA (m): 105 × 68 m, 7.140 m².
 * Patokan ukuran yang dipakai peta lahan dan kartu tugas babak 02.
 */
export const FIELD_LENGTH_M = 105;
export const FIELD_WIDTH_M = 68;
export const FIELD_AREA_M2 = FIELD_LENGTH_M * FIELD_WIDTH_M;

/** Luas lahan rawan di kedua sisi sepanjang 1 km kanal, dalam lapangan bola. */
export function fieldsFor(reachM: number): number {
  return (2 * Math.min(reachM, TRANSECT_LENGTH_M) * 1000) / FIELD_AREA_M2;
}

/**
 * Jangkauan sudah mencapai ujung penampang 1 km: angkanya hanya batas bawah.
 *
 * Simulasi mencatat jangkauan pada titik tengah kolomnya, dan kolom terakhir
 * berpusat setengah lebar kolom sebelum 1.000 m (997,5 m). Ambang "kurang
 * satu meter" karena itu tidak pernah tercapai, dan kanal sedalam 3 m
 * sempat tertulis "279 lapangan" alih-alih "lebih dari 280".
 */
export function reachesBeyond(reachM: number): boolean {
  return reachM >= TRANSECT_LENGTH_M - TRANSECT_LENGTH_M / COLUMNS;
}

/** Jumlah lapangan bola sebagai teks: "59", atau "lebih dari 280". */
export function fieldsText(reachM: number): string {
  const n = fieldsFor(reachM);
  return reachesBeyond(reachM)
    ? `lebih dari ${Math.floor(fieldsFor(TRANSECT_LENGTH_M))}`
    : `${Math.max(1, Math.round(n))}`;
}
