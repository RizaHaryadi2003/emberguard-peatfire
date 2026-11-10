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
};

export const BARA_ACTS: readonly BaraAct[] = [
  {
    number: "01",
    title: "Satu sulutan kecil",
    body: "Kebakaran gambut hampir selalu berawal di permukaan, dari sesuatu yang tampak sepele. Nyala di rumput kering hanya bertahan beberapa menit, tetapi panasnya cukup untuk menyulut gambut kering di bawahnya. Sejak titik itu api tidak lagi butuh nyala: ia berubah menjadi bara.",
    task: "Pilih satu sumber sulutan, lalu klik permukaan gambut untuk menyulutnya.",
    // Suhu sulut arang: Usup dkk. (2004), Tabel 1. Puncak lapangan: Santoso dkk. (2022).
    fact: { value: "340–369 °C", caption: "Suhu arang gambut Kalimantan mulai menyala. Di dalam gambut, puncak terukurnya 470–700 °C" },
  },
  {
    number: "02",
    title: "Merambat dalam gelap",
    body: "Bara menjalar ke samping dan turun ke dalam, mengikuti gambut yang kering. Ia tidak butuh angin dan tidak butuh banyak oksigen, jadi ia bekerja siang dan malam. Majukan waktu dan geser muka air tanah untuk melihat apa yang menentukan seberapa dalam dan seberapa cepat bara merambat.",
    task: "Majukan waktu sampai bara berumur dua hari.",
    fact: { value: "Berminggu-minggu", caption: "Lama bara gambut dapat bertahan di bawah permukaan, bahkan melewati hujan pertama" },
  },
  {
    number: "03",
    title: "Tak terlihat dari atas",
    body: "Di permukaan, yang terlihat sering hanya asap yang keluar dari tanah. Menyiram sedikit membuat asap itu surut dan lahan tampak aman, padahal baranya masih hidup di bawah kaki kita, terus melebarkan rongga sampai atap tanahnya runtuh.",
    task: "Siram permukaan, lalu bandingkan tampilan permukaan dengan tampilan termal.",
    // Usup dkk. (2004), hlm. 12.
    fact: { value: "Hujan lebat", caption: "Bara gambut dalam tetap sulit padam walau hujan lebat. Air lewat retakan tidak terserap gambut yang sudah kering" },
  },
  {
    number: "04",
    title: "Airnya harus sampai ke bara",
    body: "Bara berhenti bila air benar-benar sampai ke tempatnya. Di lahan gambut, rambatan bara dalam berhenti saat muka air tanah naik di akhir musim kering. Naikkan muka air tanah melewati kedalaman bara dan perhatikan baranya mati.",
    task: "Naikkan muka air tanah sampai seluruh bara padam.",
    fact: { value: "≤ 0,4 m", caption: "Muka air tanah yang wajib dijaga pada ekosistem gambut budidaya (PP 57/2016)" },
  },
];

export type IgnitionSource = {
  id: "puntung" | "pembakaran" | "percikan";
  label: string;
  caption: string;
  /** Kalimat yang tampil setelah sumber ini dipakai menyulut. */
  after: string;
  /** Lama nyala di permukaan sebelum berubah menjadi bara (detik animasi). */
  flameSeconds: number;
};

export const IGNITION_SOURCES: readonly IgnitionSource[] = [
  {
    id: "puntung",
    label: "Puntung rokok",
    caption: "Dibuang dari jalan setapak",
    after: "Puntung rokok jatuh di serasah kering. Nyalanya kecil dan hanya sebentar, tetapi panasnya sudah cukup menyulut gambut di bawahnya.",
    flameSeconds: 1.6,
  },
  {
    id: "pembakaran",
    label: "Pembakaran lahan",
    caption: "Membuka lahan dengan api",
    after: "Api pembakaran lahan padam setelah rumputnya habis. Yang tertinggal adalah bara di dalam gambut, yang justru baru mulai bekerja.",
    flameSeconds: 2.6,
  },
  {
    id: "percikan",
    label: "Percikan mesin",
    caption: "Dari alat berat atau mesin pompa",
    after: "Satu percikan dari mesin mendarat di gambut kering yang terbuka. Tidak ada nyala besar, langsung menjadi bara.",
    flameSeconds: 1,
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
    "Rongga abu di bawah pohon itu terlalu lebar. Permukaannya ambruk dan pohonnya tumbang — bahaya yang sering menimpa petugas di lahan gambut yang terbakar.",
} as const;

/** Kartu ringkasan yang muncul setelah bara berhasil dipadamkan. */
export const BARA_SUMMARY = {
  title: "Yang tersisa",
  lead: "Bara berhasil dipadamkan. Ini jejak yang ditinggalkannya pada satu bongkahan gambut selebar 4,4 meter:",
  closing:
    "Semua ini dimulai dari satu sulutan di permukaan dan berlanjut karena gambutnya kering. Menjaga gambut tetap basah jauh lebih murah daripada memadamkannya.",
} as const;

/** Nama keadaan sel untuk kartu pemeriksaan. */
export const CELL_STATE_TEXT: Record<number, { label: string; note: string }> = {
  0: { label: "Gambut utuh", note: "Belum tersentuh bara." },
  1: { label: "Sedang membara", note: "Bahan organik terbakar tanpa nyala; panasnya menjalar ke sel di sekitarnya." },
  2: { label: "Rongga abu", note: "Gambut sudah habis terbakar. Permukaan di atasnya kehilangan penopang." },
  3: { label: "Gambut hangus", note: "Pernah membara lalu padam oleh air; tidak habis, tetapi bahannya rusak." },
};
