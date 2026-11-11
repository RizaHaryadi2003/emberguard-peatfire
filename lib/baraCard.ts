// Logika murni kartu hasil Modul 03: membaca nilai dari tautan, memilih isi
// kartu, dan menyusun alamatnya. Dipisah dari komponen agar mudah diuji.

import { BARA_CARD_TEXT, type BaraCardZone } from "@/config/bara-content";
import type { CardFormat } from "./resultCard";

export const BARA_PATH = "/gambut/bara";
export const BARA_CARD_PATH = `${BARA_PATH}/kartu`;

/** Batas bara gambut permukaan dan bara gambut dalam (cm); Usup dkk. (2004). */
export const SURFACE_LIMIT_CM = 20;
export const DEEP_LIMIT_CM = 50;

/** Kedalaman terbesar yang diterima dari tautan, sama dengan tinggi penampang kartu (cm). */
export const MAX_SHARED_DEPTH_CM = 120;

export type SharedBurn = { cm: number; resurfaced: boolean };

export type BaraCard = SharedBurn & {
  depth: string;
  zone: BaraCardZone;
  zoneLabel: string;
  headline: string;
  note: string;
  challenge: string;
  source: string;
};

/**
 * Baca hasil pembaca dari parameter tautan. Tautan bisa diubah siapa saja, jadi
 * hanya bilangan bulat di dalam rentang yang diterima; selain itu hasilnya
 * `null` dan pembaca mendapat pembuka biasa.
 */
export function parseSharedBurn(depth: string | string[] | null | undefined, resurfaced: string | string[] | null | undefined): SharedBurn | null {
  if (typeof depth !== "string" || !/^\d{1,3}$/.test(depth)) return null;
  const cm = Number(depth);
  if (cm < 1 || cm > MAX_SHARED_DEPTH_CM) return null;
  return { cm, resurfaced: resurfaced === "1" };
}

export function zoneOf(cm: number): BaraCardZone {
  if (cm <= SURFACE_LIMIT_CM) return "permukaan";
  return cm <= DEEP_LIMIT_CM ? "dalam" : "lebih";
}

/** Isi kartu untuk kedalaman bara yang dicapai pembaca (cm). */
export function getBaraCard(shared: SharedBurn): BaraCard {
  const cm = Math.round(shared.cm);
  const zone = zoneOf(cm);
  return { cm, resurfaced: shared.resurfaced, depth: `${cm} cm`, zone, ...BARA_CARD_TEXT[zone] };
}

const query = (shared: SharedBurn) => `dalam=${shared.cm}${shared.resurfaced ? "&muncul=1" : ""}`;

/** Alamat gambar kartu. Tanpa nilai, gambarnya berisi pertanyaan pembuka. */
export function baraCardImagePath(shared: SharedBurn | null, format: CardFormat): string {
  return `${BARA_CARD_PATH}?format=${format}${shared ? `&${query(shared)}` : ""}`;
}

/** Tautan yang dibagikan bersama kartu. */
export function baraShareLink(origin: string, shared: SharedBurn): string {
  return `${origin}${BARA_PATH}?${query(shared)}`;
}
