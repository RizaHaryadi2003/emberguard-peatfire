/**
 * ============================================================================
 *  TEKS HALAMAN AWAL — GANTI DI SINI
 * ============================================================================
 */

export const BRAND_NAME = "Emberguard";

/**
 * Menu navigasi. Setiap butir adalah satu halaman (section) tersendiri;
 * menu aktif ditentukan otomatis dari alamat halaman.
 */
export const NAV_LINKS = [
  { label: "Beranda", href: "/" },
  { label: "Modul", href: "/modul" },
  { label: "Simulasi", href: "/simulasi" },
  { label: "Kuis", href: "/kuis" },
] as const;

/** Label kecil di atas judul: awalan tetap, kata terakhir bergantian. */
export const EYEBROW = {
  prefix: "Saatnya",
  words: ["memahami", "mencegah", "bertindak"],
};

/** Dua tombol di bawah judul: utama (padat) dan kedua (bergaris tepi). */
export const HERO_ACTIONS = {
  primary: { label: "Mulai Modul", href: "/modul" },
  secondary: { label: "Coba Simulasi", href: "/simulasi" },
};

export const HEADING = {
  line1: "Sebelum bara",
  line2: "menjadi bencana",
};

export const PARAGRAPH_LEFT =
  "Di bawah permukaan gambut, api bisa menyala diam-diam selama berminggu-minggu, lalu naik menjadi kabut asap yang menyelimuti kota.";

export const PARAGRAPH_RIGHT =
  "Telusuri bagaimana api bermula, menjalar, dan dapat dihentikan, lewat simulasi interaktif yang bisa kamu sentuh dan kendalikan sendiri.";
