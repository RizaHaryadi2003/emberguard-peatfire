// Logika murni kartu hasil Modul Kanal: membaca nilai dari tautan, menghitung isi
// kartu, dan menyusun alamatnya. Dipisah dari komponen agar mudah diuji.

import { KANAL_CARD_TEXT, REACH_GUESSES } from "@/config/kanal-content";
import { CANAL_DEPTH_MAX_M, COLUMNS, DrainageSim, TRANSECT_LENGTH_M } from "./drainage";
import type { CardFormat } from "./resultCard";

export const KANAL_PATH = "/modul/kanal";
export const KANAL_CARD_PATH = `${KANAL_PATH}/kartu`;

/**
 * Lapangan sepak bola menurut ukuran FIFA (m): 105 × 68 m, 7.140 m².
 * Patokan ukuran yang dipakai peta lahan, kartu tugas babak 02, dan kartu ini.
 */
export const FIELD_LENGTH_M = 105;
export const FIELD_WIDTH_M = 68;
export const FIELD_AREA_M2 = FIELD_LENGTH_M * FIELD_WIDTH_M;

/** Kedalaman kanal terdangkal yang diterima dari tautan (cm). */
export const MIN_SHARED_CANAL_CM = 10;

export type SharedCanal = {
  /** Kedalaman kanal (cm). */
  cm: number;
  /** Tebakan babak 02 (indeks pada REACH_GUESSES), bila ada. */
  guess: number | null;
};

/**
 * Baca hasil pembaca dari parameter tautan. Tautan bisa diubah siapa saja, jadi
 * hanya bilangan bulat di dalam rentang pengatur yang diterima; selain itu
 * hasilnya `null` dan pembaca mendapat pembuka biasa. Tebakan yang tidak sah
 * hanya dibuang, tidak membatalkan kedalamannya.
 */
export function parseSharedCanal(
  depth: string | string[] | null | undefined,
  guess: string | string[] | null | undefined,
): SharedCanal | null {
  if (typeof depth !== "string" || !/^\d{1,3}$/.test(depth)) return null;
  const cm = Number(depth);
  if (cm < MIN_SHARED_CANAL_CM || cm > CANAL_DEPTH_MAX_M * 100) return null;
  const g = typeof guess === "string" && /^\d$/.test(guess) && Number(guess) < REACH_GUESSES.length ? Number(guess) : null;
  return { cm, guess: g };
}

/**
 * Jangkauan lahan rawan terbakar (m dari kanal) untuk kanal sedalam `cm`,
 * pada tahun pertama dan tanpa sekat — hitungan yang sama persis dengan
 * simulasi modulnya, sebab yang dipakai simulasinya sendiri.
 */
export function riskReachFor(cm: number): number {
  const sim = new DrainageSim();
  sim.setCanalDepth(cm / 100);
  sim.collect();
  return sim.stats.riskReachM;
}

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

/** Jangkauan sebagai teks: "209 m", atau "lebih dari 1 km". */
export function reachText(reachM: number): string {
  return reachesBeyond(reachM) ? "lebih dari 1 km" : `${Math.round(reachM)} m`;
}

export type KanalCard = SharedCanal & {
  depth: string;
  reachM: number;
  reach: string;
  fields: string;
  /** Kalimat tebakan, bila pembaca menebak. */
  guessLine: string | null;
  headline: string;
  note: string;
  challenge: string;
  source: string;
};

/** Isi kartu untuk kedalaman kanal yang dipilih pembaca. */
export function getKanalCard(shared: SharedCanal): KanalCard {
  const reachM = riskReachFor(shared.cm);
  const guessLine =
    shared.guess === null ? null : KANAL_CARD_TEXT.guessLine(REACH_GUESSES[shared.guess].label, reachText(reachM));
  return {
    ...shared,
    depth: `${shared.cm} cm`,
    reachM,
    reach: reachText(reachM),
    fields: fieldsText(reachM),
    guessLine,
    headline: KANAL_CARD_TEXT.headline(shared.cm),
    note: KANAL_CARD_TEXT.note,
    challenge: KANAL_CARD_TEXT.challenge,
    source: KANAL_CARD_TEXT.source,
  };
}

const query = (shared: SharedCanal) => `kanal=${shared.cm}${shared.guess !== null ? `&tebak=${shared.guess}` : ""}`;

/** Alamat gambar kartu. Tanpa nilai, gambarnya berisi pertanyaan pembuka. */
export function kanalCardImagePath(shared: SharedCanal | null, format: CardFormat): string {
  return `${KANAL_CARD_PATH}?format=${format}${shared ? `&${query(shared)}` : ""}`;
}

/** Tautan yang dibagikan bersama kartu. */
export function kanalShareLink(origin: string, shared: SharedCanal): string {
  return `${origin}${KANAL_PATH}?${query(shared)}`;
}
