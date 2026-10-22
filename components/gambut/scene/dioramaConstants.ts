// Ukuran, rupa, dan penempatan diorama gambut yang dipakai bersama oleh semua
// modul section Gambut, sehingga bongkahan tanah pada Modul 01 dan Modul 02
// benar-benar sama dan dapat dibandingkan langsung oleh pembaca.

import type { PeatLayerId } from "@/lib/peat";

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
 * Rona pengali warna tekstur tiap lapisan.
 *
 * Satu daftar untuk semua modul. Modul 02 dahulu memakai daftarnya sendiri
 * yang lebih gelap — hemik dan terutama saprik diturunkan agar strata terbaca
 * pada satu bidang datar. Akibatnya bongkahan yang seharusnya sama justru
 * tampak sebagai dua tanah yang berbeda, dan separuh bawah penampang jatuh ke
 * hampir hitam. Pemisah antarlapisan di Modul 02 sekarang dikerjakan oleh
 * garis batas dan guratan pengendapan pada peneduhnya, bukan dengan
 * menggelapkan tanahnya.
 */
export const PEAT_LAYER_TINT: Record<PeatLayerId, [number, number, number]> = {
  fibrik: [1.0, 0.8, 0.62],
  hemik: [0.86, 0.72, 0.6],
  saprik: [0.46, 0.36, 0.28],
  mineral: [0.8, 0.82, 0.84],
};

/** Gambut basah tampak lebih gelap dan berkilap daripada gambut kering. */
export const WET_DARKEN = 0.5;

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
 * - `anisotropy` : penyaringan anisotropik tekstur tanah (1 = mati).
 * - `envHz`      : frekuensi maksimum pembuatan ulang peta lingkungan langit.
 * - `simSteps`   : batas langkah simulasi per bingkai (mencegah bingkai macet).
 * - `fieldHz`    : frekuensi penyalinan hasil simulasi ke tekstur penampang.
 * - `subsideSec` : jeda minimum antar pembentukan ulang geometri permukaan.
 * - `understory` : jumlah tumbuhan bawah yang ditanam di permukaan.
 * - `smoke`      : jumlah kepulan asap (tiap kepulan satu panggilan gambar).
 */
export const QUALITY_PROFILE = {
  high: {
    maxDpr: 1.5,
    shadowSize: 1024,
    softShadow: true,
    antialias: true,
    anisotropy: 8,
    envHz: 4,
    simSteps: 24,
    fieldHz: 30,
    subsideSec: 0.5,
    understory: 10,
    smoke: 30,
  },
  low: {
    maxDpr: 1,
    shadowSize: 512,
    softShadow: false,
    antialias: false,
    // Penyaringan 8× pada dua belas tekstur tanah adalah biaya yang nyata di
    // pengolah grafis ponsel, sementara di sana diorama tampil kecil sehingga
    // perbedaannya hampir tidak terlihat.
    anisotropy: 2,
    envHz: 1.5,
    simSteps: 8,
    fieldHz: 15,
    subsideSec: 1.2,
    understory: 5,
    // Tiap kepulan asap adalah satu sprite dengan materialnya sendiri, jadi
    // satu panggilan gambar; jumlahnya dipotong hampir separuh di ponsel.
    smoke: 14,
  },
} as const satisfies Record<Quality, Record<string, number | boolean>>;
