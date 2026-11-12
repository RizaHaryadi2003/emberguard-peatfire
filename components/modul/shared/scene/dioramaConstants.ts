// Ukuran, rupa, dan penempatan diorama gambut yang dipakai bersama oleh semua
// modul 3D, sehingga bongkahan tanah pada Modul Anatomi dan Modul Bara
// benar-benar sama dan dapat dibandingkan langsung oleh pembaca.

import type { PeatLayerId } from "@/lib/model/peat";

/** Mutu grafis: "low" untuk ponsel/perangkat lemah (resolusi & bayangan lebih rendah). */
export type Quality = "high" | "low";

/** Ukuran balok tanah (m). */
export const BLOCK_WIDTH = 4.4;
export const BLOCK_DEPTH = 2.6;

/** Posisi diorama dalam dunia (puncak balok = permukaan gambut). */
export const DIORAMA_Y = 0.2;

/** Batas putaran balok ke kiri/kanan oleh seretan pengguna (radian). */
export const MAX_ROTATION = 0.9;

/** Sudut hadap awal diorama pada sumbu tegak (radian), sebelum diseret. */
export const DIORAMA_BASE_YAW = -0.18;

/** Posisi kamera & titik bidik tiap tahap, dipakai bersama Modul Anatomi dan Modul Bara. */
export const DIORAMA_CAMERA_POSES: { pos: [number, number, number]; target: [number, number, number] }[] = [
  { pos: [8.6, 3.2, 10.6], target: [0, -0.8, 0] },
  { pos: [7.8, 1.4, 11.8], target: [0, -0.5, 0] },
  { pos: [7.2, 1.2, 9.8], target: [0, -1.0, 0] },
  { pos: [7.6, 2.6, 9.4], target: [0, -0.6, 0] },
];

/** Eksposur kamera diorama. */
export const DIORAMA_EXPOSURE = 0.9;

/** Cahaya pantul lembut dari langit dan tanah: warna atas, warna bawah, kekuatan. */
export const DIORAMA_HEMISPHERE: [string, string, number] = ["#cfdcec", "#2a2116", 0.12];

/** Letak tetap pohon: [x, z, tinggi target (m), rotasi]. */
export const DIORAMA_TREE_SPOTS: [number, number, number, number][] = [
  [-1.45, -0.55, 2.6, 0.3],
  [0.55, -0.7, 2.2, 2.1],
  [1.55, 0.35, 1.8, 4.2],
  [-0.4, 0.55, 1.5, 1.2],
];

/** Letak tetap tumbuhan bawah: [x, z, jenis, tinggi target (m)]. */
export const DIORAMA_UNDERSTORY_SPOTS: [number, number, "fern" | "calathea" | "anthurium", number][] = [
  [-1.8, 0.7, "fern", 0.75],
  [-0.9, -0.1, "fern", 0.6],
  [0.2, 0.2, "calathea", 0.55],
  [1.05, -0.2, "fern", 0.7],
  [1.9, -0.8, "anthurium", 0.55],
  [-1.95, -0.85, "calathea", 0.5],
  [0.95, 0.9, "fern", 0.55],
  [-0.2, -0.95, "anthurium", 0.5],
  [1.85, 0.95, "calathea", 0.45],
  [-1.1, 0.95, "anthurium", 0.45],
  [-0.55, 0.15, "fern", 0.5],
  [0.35, 0.95, "fern", 0.6],
  [1.45, -0.95, "fern", 0.55],
  [-1.5, 0.1, "calathea", 0.4],
  [0.9, 0.35, "calathea", 0.4],
  [-0.95, -0.9, "fern", 0.55],
  [1.95, 0.25, "fern", 0.5],
  [-2.0, 0.05, "fern", 0.5],
  [0.05, -0.45, "calathea", 0.35],
  [-0.35, 1.05, "calathea", 0.35],
];

/**
 * Rona pengali warna tekstur tiap lapisan.
 *
 * Satu daftar untuk semua modul. Modul Bara dahulu memakai daftarnya sendiri
 * yang lebih gelap — hemik dan terutama saprik diturunkan agar strata terbaca
 * pada satu bidang datar. Akibatnya bongkahan yang seharusnya sama justru
 * tampak sebagai dua tanah yang berbeda, dan separuh bawah penampang jatuh ke
 * hampir hitam. Pemisah antarlapisan di Modul Bara sekarang dikerjakan oleh
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
 * modul 3D agar perangkat lemah mendapat perlakuan yang seragam.
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
