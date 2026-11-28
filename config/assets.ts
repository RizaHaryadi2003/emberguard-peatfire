/**
 * ============================================================================
 *  ASET BERANDA & NAVIGASI — GANTI DI SINI
 * ============================================================================
 *  Semua video dan suara halaman awal dikumpulkan di berkas ini supaya mudah
 *  diganti.
 *
 *  Cara mengisi:
 *  - Berkas lokal : taruh di `public/videos/` atau `public/audio/`, lalu tulis
 *                   jalurnya diawali "/", mis. "/videos/gambut-pagi.mp4".
 *  - Berkas daring: tempel URL lengkap.
 *
 *  Saran video: 2–3 klip pendek (8–15 detik), MP4 (H.264) tanpa suara, tiap
 *  klip dalam dua ukuran: 2560×1440 untuk laptop (±13–16 MB) dan 1280×720
 *  untuk ponsel (±3–5 MB). Klip diputar bergiliran; bila hanya satu, klip
 *  itu diulang.
 * ============================================================================
 */

/** Satu klip video latar dalam dua ukuran. */
export type HeroClip = {
  /** Untuk layar lebar (laptop): 2560 × 1440, tajam di layar Retina. */
  large: string;
  /** Untuk ponsel dan tablet: 1280 × 720, ringan dimuat. */
  small: string;
};

/**
 * Video latar beranda, diputar bergiliran. Biarkan kosong bila belum ada:
 * beranda memakai latar abu-abu bergradasi dengan garis gelap.
 */
export const HERO_VIDEOS: HeroClip[] = [
  // Tampak atas sungai di hutan rawa lebat — Tom Fisk, Pexels (sumber: data/SUMBER.md).
  { large: "/videos/hutan-rawa-sungai-1440.mp4", small: "/videos/hutan-rawa-sungai-720.mp4" },
  // Hutan hujan berkabut tebal — Vũ Ngọc Long, Pexels.
  { large: "/videos/hutan-kabut-1440.mp4", small: "/videos/hutan-kabut-720.mp4" },
];

/**
 * Gambar diam yang tampil selagi video pertama dimuat (opsional),
 * mis. "/images/hero/poster.webp".
 */
export const HERO_POSTER: string = "/images/hero/poster-hutan-rawa.jpg";

/**
 * Suara latar untuk tombol "Suara" di navigasi (MP3/OGG, diputar berulang).
 * Biarkan kosong bila belum ada: tombolnya tetap tampil tetapi tidak bersuara.
 */
export const SITE_SOUND: string = "";
