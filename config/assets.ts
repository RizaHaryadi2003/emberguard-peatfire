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
 *  Saran video: 2–3 klip pendek (8–15 detik), MP4 (H.264) tanpa suara,
 *  1920×1080 atau lebih kecil, masing-masing di bawah ±5 MB. Klip diputar
 *  bergiliran; bila hanya satu, klip itu diulang.
 * ============================================================================
 */

/**
 * Video latar beranda. Biarkan kosong bila belum ada: beranda memakai latar
 * abu-abu bergradasi dengan garis gelap.
 */
export const HERO_VIDEOS: string[] = [];

/**
 * Gambar diam yang tampil selagi video pertama dimuat (opsional),
 * mis. "/images/hero/poster.webp".
 */
export const HERO_POSTER: string = "";

/**
 * Suara latar untuk tombol "Suara" di navigasi (MP3/OGG, diputar berulang).
 * Biarkan kosong bila belum ada: tombolnya tetap tampil tetapi tidak bersuara.
 */
export const SITE_SOUND: string = "";
