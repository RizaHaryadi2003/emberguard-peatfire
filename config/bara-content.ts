/**
 * ============================================================================
 *  TEKS MODUL 02 — BARA DI BAWAH TANAH — GANTI DI SINI
 * ============================================================================
 *  Modul ini bukan cerita bergulir seperti Modul 01, melainkan ruang uji:
 *  pembaca menekan tombol, menyulut, memajukan waktu, mencoba memadamkan, lalu
 *  melihat akibatnya pada penampang gambut. Empat babak berurutan, dan tiap
 *  babak baru terbuka setelah pembaca melakukan tindakan yang diminta.
 * ============================================================================
 */

export type BaraAct = {
  /** Nomor babak yang tampil di antarmuka. */
  number: string;
  title: string;
  /** Kalimat pengantar babak. */
  body: string;
  /**
   * Inti penjelasan dalam dua baris, untuk layar yang tidak muat `body`.
   * Panjangnya dijaga agar tidak mendorong teks ke panel kendali.
   */
  lead: string;
  /** Tugas yang harus dilakukan pembaca agar babak berikutnya terbuka. */
  task: string;
  /** Angka kunci babak ini. */
  fact: { value: string; caption: string };
};

/**
 * Pembuka Modul 02. Berangkat dari yang sering dilihat pembaca saat musim kabut
 * asap: asap tebal tanpa api. Tidak memuat angka; klaim bahwa bara gambut
 * berasap tanpa nyala sama dengan isi Babak 01 dan Babak 03 di bawah.
 */
export const BARA_HOOK = {
  setup: "Tidak ada api yang terlihat.",
  question: "Asapnya dari mana?",
  cta: "Cari tahu",
  scrollHint: "atau gulir ke bawah",
  /** Pengantar untuk pembaca yang datang dari tautan kartu hasil temannya. */
  sharedLead: (cm: number) => `Bara temanmu sampai ${cm} cm di dalam gambut. Sekarang giliranmu.`,
};

export type BaraCardZone = "permukaan" | "dalam" | "lebih";

/**
 * Isi kartu hasil, menurut kedalaman bara yang dicapai pembaca. Pembagian
 * kedalamannya dari Usup dkk. (2004), hlm. 10–12. Kedalamannya sendiri hasil
 * simulasi, dan itu ditulis pada baris sumber.
 */
export const BARA_CARD_TEXT: Record<BaraCardZone, { zoneLabel: string; headline: string; note: string; challenge: string; source: string }> = {
  permukaan: {
    zoneLabel: "Bara permukaan",
    headline: "Baraku hanya sampai lapisan atas.",
    note: "Di Kalimantan Tengah, bara permukaan membakar 0–20 cm teratas.",
    challenge: "Asapnya dari mana? Coba sendiri.",
    source: "Simulasi Emberguard, kedalaman bara: Usup dkk. (2004)",
  },
  dalam: {
    zoneLabel: "Bara dalam",
    headline: "Baraku menembus lapisan dalam.",
    note: "Bara dalam teramati pada 20–50 cm, dan sulit padam walau hujan lebat.",
    challenge: "Asapnya dari mana? Coba sendiri.",
    source: "Simulasi Emberguard, kedalaman bara: Usup dkk. (2004)",
  },
  lebih: {
    zoneLabel: "Lebih dalam dari pengamatan",
    headline: "Baraku turun lebih dalam lagi.",
    note: "Melewati 20–50 cm yang teramati di Kalimantan Tengah, karena gambutnya makin kering.",
    challenge: "Bisa kamu jaga lebih basah? Coba sendiri.",
    source: "Simulasi Emberguard, kedalaman bara: Usup dkk. (2004)",
  },
};

/** Tambahan judul kartu bila bara muncul lagi di tempat lain. */
export const BARA_CARD_RESURFACED = "Lalu muncul lagi di tempat lain.";

export const BARA_ACTS: readonly BaraAct[] = [
  {
    number: "01",
    title: "Api yang tinggal cukup lama",
    body: "Kebakaran gambut paling sering berawal dari api pembukaan lahan. Api yang besar saja tidak cukup: titik panas di gambut baru berkembang bila panasnya bertahan satu sampai dua jam. Kalau tidak, titik itu hilang sendiri. Yang bertahan masuk ke gambut dan berubah menjadi bara.",
    // Usup dkk. (2004), hlm. 11.
    lead: "Api harus menahan panasnya 1–2 jam di satu titik. Kalau tidak, titik panas di gambut hilang sendiri.",
    task: "Pilih cara api membakar, lalu klik permukaan gambut.",
    // Suhu sulut arang: Usup dkk. (2004), Tabel 1. Puncak lapangan: Santoso dkk. (2022).
    fact: { value: "340–369 °C", caption: "Suhu arang gambut Kalimantan mulai menyala. Di dalam gambut, puncak terukurnya 470–700 °C (Usup dkk., 2004; Santoso dkk., 2022)" },
  },
  {
    number: "02",
    title: "Merambat dalam gelap",
    body: "Bara menjalar ke samping dan turun ke dalam. Mula-mula cepat di 20 cm teratas, lalu sebagian masuk ke lapisan dalam dan melambat sampai separuh atau sepertiganya. Majukan waktu dan geser muka air tanah untuk melihat sampai sedalam apa bara masih bisa hidup.",
    // Usup dkk. (2004), hlm. 10–13.
    lead: "Bara cepat di 20 cm teratas, lalu melambat di lapisan dalam. Ia berhenti di gambut yang masih basah.",
    task: "Majukan waktu sampai bara berumur dua hari.",
    fact: { value: "Berminggu-minggu", caption: "Lama bara gambut dapat bertahan di bawah permukaan, bahkan melewati hujan pertama (Santoso dkk., 2022)" },
  },
  {
    number: "03",
    title: "Tak terlihat dari atas",
    body: "Di permukaan, yang terlihat sering hanya asap yang keluar dari tanah. Menyiram sedikit membuat asap itu surut dan lahan tampak aman, padahal baranya masih hidup di bawah kaki kita, terus melebarkan rongga sampai atap tanahnya runtuh.",
    // Usup dkk. (2004), hlm. 13.
    lead: "Bara membakar di bawah dan menyisakan atap tanah. Atap bisa runtuh, dan bara muncul lagi di tempat lain.",
    task: "Siram permukaan, buka tampilan termal, lalu tunggu sampai bara muncul lagi.",
    // Usup dkk. (2004), hlm. 12.
    fact: { value: "Hujan lebat", caption: "Bara gambut dalam tetap sulit padam walau hujan lebat. Air lewat retakan tidak terserap gambut yang sudah kering (Usup dkk., 2004)" },
  },
  {
    number: "04",
    title: "Airnya harus sampai ke bara",
    body: "Bara berhenti bila air benar-benar sampai ke tempatnya. Di lahan gambut, rambatan bara dalam berhenti saat muka air tanah naik di akhir musim kering. Naikkan muka air tanah melewati kedalaman bara dan perhatikan baranya mati.",
    // Usup dkk. (2004), hlm. 12–13.
    lead: "Hujan saja sulit memadamkan bara dalam. Rambatannya berhenti saat muka air tanah naik sampai ke bara.",
    task: "Naikkan muka air tanah sampai seluruh bara padam.",
    fact: { value: "≤ 0,4 m", caption: "Muka air tanah yang wajib dijaga pada ekosistem gambut budidaya (PP 57/2016)" },
  },
];

/**
 * Dua cara api membakar saat lahan dibuka. Menurut Usup dkk. (2004, hlm. 10–11),
 * pembukaan lahan dengan api adalah penyebab utama, tetapi titik di gambut hanya
 * berkembang bila panasnya bertahan 1–2 jam. Kalau tidak, titik itu hilang sendiri.
 */
export type IgnitionSource = {
  id: "lintas" | "kayu";
  label: string;
  caption: string;
  /** Kalimat yang tampil setelah sumber ini dipakai menyulut. */
  after: string;
  /** Lama nyala di permukaan sebelum surut (detik animasi). */
  flameSeconds: number;
  /** Panasnya bertahan cukup lama untuk menyulut gambut. */
  holdsHeat: boolean;
};

export const IGNITION_SOURCES: readonly IgnitionSource[] = [
  {
    id: "lintas",
    label: "Api cepat lewat",
    caption: "Semak tebasan, habis dalam menit",
    after: "Apinya besar, tetapi cepat lewat. Panasnya tidak bertahan cukup lama, jadi titik di gambut itu perlahan hilang.",
    flameSeconds: 1,
    holdsHeat: false,
  },
  {
    id: "kayu",
    label: "Kayu terbakar lama",
    caption: "Panas 1–2 jam di satu titik",
    after: "Kayu sisa tebasan terbakar lama di satu titik. Panasnya masuk ke gambut, dan setelah apinya habis baranya tetap hidup.",
    flameSeconds: 2.6,
    holdsHeat: true,
  },
];

/** Pilihan kecepatan waktu simulasi (jam simulasi per detik nyata). */
export const TIME_SPEEDS: readonly { label: string; hoursPerSecond: number }[] = [
  { label: "Jeda", hoursPerSecond: 0 },
  { label: "Lambat", hoursPerSecond: 2 },
  { label: "Sedang", hoursPerSecond: 8 },
  { label: "Cepat", hoursPerSecond: 24 },
];

export const VIEW_TEXT = {
  permukaan: {
    label: "Permukaan",
    hint: "Yang terlihat oleh mata: hanya asap yang keluar dari tanah.",
  },
  termal: {
    label: "Termal",
    hint: "Yang sebenarnya terjadi di bawah: jaringan bara dan rongga abu.",
  },
} as const;

export type ViewMode = keyof typeof VIEW_TEXT;

/** Keterangan warna pada penampang. */
export const LEGEND_ITEMS: readonly { color: string; label: string; note: string }[] = [
  { color: "#ff7a24", label: "Bara aktif", note: "Gambut yang sedang terbakar tanpa nyala" },
  { color: "#2a2724", label: "Rongga abu", note: "Gambut yang sudah habis; permukaan di atasnya turun" },
  { color: "#5d5347", label: "Gambut hangus", note: "Sempat terbakar lalu padam oleh air" },
  { color: "#6fc7f0", label: "Gambut jenuh air", note: "Di bawah muka air tanah, tidak dapat terbakar" },
];

/** Pesan hasil percobaan pemadaman. */
export const SUPPRESSION_TEXT = {
  douse: {
    label: "Siram permukaan",
    running: "Air disemprotkan ke permukaan…",
    result:
      "Asap surut dan permukaan tampak padam. Namun siraman sedikit tidak sampai ke bara di lapisan dalam, dan bara itu tetap merambat setelah lapisan atas mengering.",
  },
  rewet: {
    label: "Pembasahan (naikkan muka air)",
    running: "Muka air tanah dinaikkan…",
    result:
      "Bara yang terkepung air jenuh mendingin dan mati, meninggalkan gambut hangus. Airnya sudah sampai ke tempat bara berada.",
  },
  collapse:
    "Rongga di bawahnya terlalu lebar, dan atap tanahnya runtuh. Di lahan yang terbakar, tanah seperti ini bisa amblas saat diinjak.",
  resurface:
    "Bara muncul lagi di tempat lain. Ia menyeberang di bawah tanah yang tidak terbakar, lalu naik dan memulai api baru di permukaan.",
} as const;

/** Kartu ringkasan yang muncul setelah bara berhasil dipadamkan. */
export const BARA_SUMMARY = {
  title: BARA_HOOK.question,
  /** Menjawab pertanyaan pembuka dengan kejadian yang baru saja dilihat pembaca. */
  answer: (depthCm: number, resurfaced: boolean) =>
    `Dari bara tanpa api, sedalam ${depthCm} cm di dalam gambut. Ia berhenti di gambut yang masih basah${
      resurfaced ? ", dan muncul lagi di tempat lain" : ""
    }.`,
  closing: "Makin kering gambutnya, makin dalam bara bisa hidup. Karena itu muka air tanah harus dijaga.",
} as const;

/** Nama keadaan sel untuk kartu pemeriksaan. */
export const CELL_STATE_TEXT: Record<number, { label: string; note: string }> = {
  0: { label: "Gambut utuh", note: "Belum tersentuh bara." },
  1: { label: "Sedang membara", note: "Bahan organik terbakar tanpa nyala; panasnya menjalar ke sel di sekitarnya." },
  2: { label: "Rongga abu", note: "Gambut sudah habis terbakar. Permukaan di atasnya kehilangan penopang." },
  3: { label: "Gambut hangus", note: "Pernah membara lalu padam oleh air; tidak habis, tetapi bahannya rusak." },
};
