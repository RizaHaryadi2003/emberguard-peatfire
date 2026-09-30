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

export const BARA_ACTS: readonly BaraAct[] = [
  {
    number: "01",
    title: "Satu sulutan kecil",
    body: "Kebakaran gambut hampir selalu berawal di permukaan, dari sesuatu yang tampak sepele. Nyala di rumput kering hanya bertahan beberapa menit, tetapi panasnya cukup untuk menyulut gambut kering di bawahnya. Sejak titik itu api tidak lagi butuh nyala: ia berubah menjadi bara.",
    task: "Pilih satu sumber sulutan, lalu klik permukaan gambut untuk menyulutnya.",
    fact: { value: "± 500 °C", caption: "Suhu bara gambut. Tanpa lidah api, tetapi cukup panas untuk terus membakar bahan organik di sekitarnya" },
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
    body: "Di permukaan, kebakaran gambut sering hanya berupa asap tipis yang keluar dari tanah. Menyiram permukaan membuat asap itu hilang dan lahan tampak aman, padahal baranya masih hidup beberapa puluh sentimeter di bawah kaki kita, terus melebarkan rongga sampai permukaannya ambruk.",
    task: "Siram permukaan, lalu bandingkan tampilan permukaan dengan tampilan termal.",
    fact: { value: "0 asap", caption: "Bukan berarti padam. Bara di bawah muka tanah tidak menghasilkan asap yang terlihat jika lapisan atasnya basah" },
  },
  {
    number: "04",
    title: "Satu-satunya jalan: basahi kembali",
    body: "Bara hanya berhenti bila gambut di sekelilingnya kembali jenuh air. Karena itu pemadaman kebakaran gambut berarti menaikkan muka air tanah, bukan menyiram permukaan: air harus sampai ke kedalaman tempat bara berada. Naikkan muka air tanah melewati kedalaman bara dan perhatikan baranya mati.",
    task: "Naikkan muka air tanah sampai seluruh bara padam.",
    fact: { value: "≤ 0,4 m", caption: "Muka air tanah yang wajib dijaga pada ekosistem gambut budidaya (PP 57/2016) — sekaligus kunci agar bara tidak mungkin hidup" },
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
    hint: "Yang terlihat oleh mata: hanya asap tipis dari tanah.",
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
      "Asap hilang dan permukaan tampak padam. Namun air hanya meresap beberapa sentimeter; bara di bawahnya tidak tersentuh dan akan muncul kembali setelah lapisan atas mengering.",
  },
  rewet: {
    label: "Pembasahan (naikkan muka air)",
    running: "Muka air tanah dinaikkan…",
    result:
      "Bara yang terkepung air jenuh mendingin dan mati, meninggalkan gambut hangus. Inilah pemadaman yang benar-benar menghentikan kebakaran gambut.",
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
