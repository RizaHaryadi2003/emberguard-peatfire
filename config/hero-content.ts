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
   * Paragraf ini menjembatani ke roda faktor (FACTOR_WHEEL) di bawah.
   */
  paragraph:
    "Kebakaran hutan dan lahan tidak pernah punya satu penyebab. Api memang berawal dari satu percikan, tetapi ia tumbuh karena banyak hal sekaligus: lahan yang dikeringkan, kemarau yang memanjang, aturan yang lemah, dan pengetahuan yang belum sampai. Untuk mencegahnya, kita perlu melihat semuanya.",
};

/**
 * Roda faktor karhutla (pola lingkaran "Frequency" pada acuan
 * frequencybreathwork.com): judul di tengah, delapan faktor di sekeliling
 * lingkaran, dimulai dari atas searah jarum jam. Setelah semua muncul, gulir
 * berikutnya memperbesar ke faktor `focus`.
 *
 * DRAF — DAFTAR FAKTOR SEMENTARA. Isi dan urutannya boleh diganti; jumlah
 * yang paling rapi tetap delapan. Sumber riset tiap faktor belum dicatat.
 */
export const FACTOR_WHEEL = {
  center: "Faktor",
  factors: [
    "Ekonomi",
    "Politik",
    "Edukasi",
    "Hukum",
    "Iklim",
    "Kanal & Drainase",
    "Budaya Membakar",
    "Sengketa Lahan",
  ],
  /** Faktor yang diperbesar di akhir; harus sama persis dengan salah satu di atas. */
  focus: "Edukasi",
};
