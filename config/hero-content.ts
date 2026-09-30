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
  { label: "Gambut", href: "/gambut" },
  { label: "Simulasi", href: "/simulasi" },
  { label: "Dampak", href: "/dampak" },
  { label: "Pencegahan", href: "/pencegahan" },
] as const;

export const HEADING = {
  line1: "Sebelum bara",
  line2: "menjadi bencana",
};

export const PARAGRAPH_LEFT =
  "Di bawah permukaan gambut, api bisa menyala diam-diam selama berminggu-minggu, lalu naik menjadi kabut asap yang menyelimuti kota.";

export const PARAGRAPH_RIGHT =
  "Telusuri bagaimana api bermula, menjalar, dan dapat dihentikan, lewat simulasi interaktif yang bisa kamu sentuh dan kendalikan sendiri.";
