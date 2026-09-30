// Ukuran dan penempatan diorama gambut yang dipakai bersama oleh semua modul
// section Gambut, sehingga bongkahan tanah pada Modul 01 dan Modul 02 benar-benar
// berukuran sama dan dapat dibandingkan langsung oleh pembaca.

/** Mutu grafis: "low" untuk ponsel/perangkat lemah (resolusi & bayangan lebih rendah). */
export type Quality = "high" | "low";

/** Ukuran balok tanah (m). */
export const BLOCK_WIDTH = 4.4;
export const BLOCK_DEPTH = 2.6;

/** Posisi diorama dalam dunia (puncak balok = permukaan gambut). */
export const DIORAMA_Y = 0.2;

/** Batas putaran balok ke kiri/kanan oleh seretan pengguna (radian). */
export const MAX_ROTATION = 0.9;

/**
 * Arah datangnya sinar matahari (dinormalkan saat dipakai): rendah dari sisi
 * kanan-depan, sehingga sisi potongan yang menghadap kamera tetap terang dan
 * bayangan memanjang ke belakang.
 */
export const SUN_DIRECTION: [number, number, number] = [0.72, 0.36, 0.42];

/**
 * Keadaan minimum yang dibutuhkan langit & pencahayaan: tingkat bahaya
 * kebakaran 0–1. Tiap modul memakai tipe keadaannya sendiri yang memuat
 * bidang ini, sehingga `SkyLighting` dapat dipakai oleh modul mana pun.
 */
export type AtmosphereState = { danger: number };

/**
 * Anggaran grafis per tingkat mutu. Nilainya dipakai bersama oleh semua modul
 * section Gambut agar perangkat lemah mendapat perlakuan yang seragam.
 *
 * - `maxDpr`     : batas atas resolusi render (piksel perangkat per piksel CSS).
 * - `shadowSize` : sisi peta bayangan; 2048² terlalu mahal untuk ponsel.
 * - `softShadow` : bayangan lunak (PCSS) hanya untuk perangkat kuat.
 * - `antialias`  : penghalusan tepi MSAA; di ponsel biayanya tidak sebanding.
 * - `envHz`      : frekuensi maksimum pembuatan ulang peta lingkungan langit.
 * - `simSteps`   : batas langkah simulasi per bingkai (mencegah bingkai macet).
 * - `fieldHz`    : frekuensi penyalinan hasil simulasi ke tekstur penampang.
 * - `subsideSec` : jeda minimum antar pembentukan ulang geometri permukaan.
 * - `understory` : jumlah tumbuhan bawah yang ditanam di permukaan.
 */
export const QUALITY_PROFILE = {
  high: {
    maxDpr: 1.5,
    shadowSize: 1024,
    softShadow: true,
    antialias: true,
    envHz: 4,
    simSteps: 24,
    fieldHz: 30,
    subsideSec: 0.5,
    understory: 10,
  },
  low: {
    maxDpr: 1,
    shadowSize: 512,
    softShadow: false,
    antialias: false,
    envHz: 1.5,
    simSteps: 8,
    fieldHz: 15,
    subsideSec: 1.2,
    understory: 5,
  },
} as const satisfies Record<Quality, Record<string, number | boolean>>;
