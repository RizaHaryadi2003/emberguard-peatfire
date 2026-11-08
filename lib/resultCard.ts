// Logika murni kartu hasil Modul 01: membaca nilai dari tautan, memilih isi
// kartu, dan menyusun alamatnya. Dipisah dari komponen agar mudah diuji.

import { RESULT_CARD_TEXT, WATER_STATUS_TEXT } from "@/config/gambut-content";
import { formatWaterDepth, getWaterStatus, WATER_MAX_CM, WATER_MIN_CM, type WaterStatus } from "./peat";

export const ANATOMI_PATH = "/gambut/anatomi";
export const RESULT_CARD_PATH = `${ANATOMI_PATH}/kartu`;

export type CardFormat = "story" | "og";

/** Ukuran gambar: Story untuk diunggah, og untuk pratinjau tautan. */
export const CARD_SIZE: Record<CardFormat, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  og: { width: 1200, height: 630 },
};

export type ResultCard = {
  cm: number;
  depth: string;
  status: WaterStatus;
  statusLabel: string;
  headline: string;
  note: string;
  challenge: string;
  source: string;
};

/**
 * Baca muka air dari parameter tautan. Tautan bisa diubah siapa saja, jadi
 * hanya bilangan bulat di dalam rentang pengatur yang diterima; selain itu
 * hasilnya `null` dan pembaca mendapat pembuka biasa.
 */
export function parseSharedWaterCm(value: string | string[] | null | undefined): number | null {
  if (typeof value !== "string" || !/^\d{1,3}$/.test(value)) return null;
  const cm = Number(value);
  return cm >= WATER_MIN_CM && cm <= WATER_MAX_CM ? cm : null;
}

export function parseCardFormat(value: string | null): CardFormat {
  return value === "story" ? "story" : "og";
}

/** Isi kartu untuk muka air pilihan pembaca (cm di bawah permukaan). */
export function getResultCard(waterCm: number): ResultCard {
  const cm = Math.round(waterCm);
  const status = getWaterStatus(cm);
  return {
    cm,
    depth: formatWaterDepth(cm),
    status,
    statusLabel: WATER_STATUS_TEXT[status].label,
    ...RESULT_CARD_TEXT[status],
  };
}

/** Alamat gambar kartu. Tanpa nilai muka air, gambarnya berisi pertanyaan pembuka. */
export function cardImagePath(cm: number | null, format: CardFormat): string {
  const query = new URLSearchParams({ format });
  if (cm !== null) query.set("muka", String(cm));
  return `${RESULT_CARD_PATH}?${query}`;
}

/** Tautan yang dibagikan bersama kartu. */
export function shareLink(origin: string, cm: number): string {
  return `${origin}${ANATOMI_PATH}?muka=${cm}`;
}
