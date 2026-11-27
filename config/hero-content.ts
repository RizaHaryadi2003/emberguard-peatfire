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

/**
 * Urutan teks saat beranda digulir (pola layar tertahan seperti acuan
 * frequencybreathwork.com): judul hero pergi → kalimat pembuka → kutipan →
 * satu paragraf penjelasan. Teks tampil di tengah garis lingkaran.
 */
export const SCROLL_STORY = {
  /** Kalimat pembuka (permintaan pengguna, sementara mengikuti acuan). */
  opening: "The Art and Science of Breathwork",
  /** Kutipan Friedrich Nietzsche (Der Wille zur Macht, catatan 822). */
  quote: {
    text: "We have art in order not to die of the truth.",
    author: "Friedrich Nietzsche",
  },
  /**
   * DRAF — PARAGRAF SEMENTARA TULISAN CLAUDE. Ganti sendiri bila kurang cocok.
   * Klaim "ribuan tahun" mengikuti laju tumbuh gambut ±1 mm/tahun
   * (acuan-modul-anatomi.md, Anshari dkk. 2026).
   */
  paragraph:
    "Di bawah kaki kita, gambut menyimpan air, karbon, dan sisa hutan dari ribuan tahun lalu. Saat ia mengering, satu percikan cukup untuk membakarnya dari dalam: diam, lama, dan sulit dipadamkan. Emberguard mengajakmu memahami cara kerja api itu, lewat sains dan cerita, sebelum bara menjadi bencana.",
};
