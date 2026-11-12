/**
 * ============================================================================
 *  TEKS MODUL 02 — KANAL & PENGERINGAN — GANTI DI SINI
 * ============================================================================
 *  Modul ini penampang lanskap, bukan bongkahan: satu kilometer gambut yang
 *  dipotong kanal. Pembaca menggali kanalnya sendiri, memajukan tahun, lalu
 *  mencoba memperbaikinya dengan sekat — dan menemukan bahwa yang kembali
 *  hanya airnya.
 *
 *  Angka pada `fact` dikutip dari acuan di docs/md/acuan-modul-02.md
 *  (Wösten dkk. 2008, Ritzema dkk. 2014, Hooijer dkk. 2012). Tetapan model di
 *  `lib/drainage.ts` belum dikalibrasi ulang; lihat bagian 7 dokumen itu.
 * ============================================================================
 */

/** Layar pembuka: pertanyaan yang dijawab oleh babak 01. */
export const KANAL_HOOK = {
  setup: "Parit di sekitar rumahmu terus mengalirkan air, bahkan di musim kemarau.",
  question: "Dari mana air itu datang?",
  cta: "Cari tahu",
  scrollHint: "atau gulir ke bawah",
};

export type KanalAct = {
  number: string;
  title: string;
  /** Kalimat pengantar babak. */
  body: string;
  /**
   * Tugas yang harus dilakukan pembaca agar babak berikutnya terbuka.
   *
   * Ditulis sebagai perintah yang menyebut nama alatnya persis seperti
   * tulisan pada alat itu, supaya pembaca tidak perlu menebak apa yang harus
   * disentuh. Alat yang dimaksud juga disorot selama tugasnya belum selesai.
   */
  task: string;
  /**
   * Yang harus diperhatikan sesudah tugasnya selesai.
   *
   * Inilah "sesudah" dari aksi babak ini: tanpa kalimat ini pembaca tahu ia
   * sudah boleh lanjut, tetapi tidak tahu apa yang baru saja ia lihat.
   */
  observe: string;
  /**
   * Satu istilah yang dipakai babak ini, dijelaskan dalam satu kalimat.
   *
   * Pembaca 17 tahun belum tentu tahu apa itu "muka air tanah" atau "sekat
   * kanal", padahal seluruh babak bertumpu pada istilah itu. Ditampilkan
   * kecil di bawah cerita, jadi tidak bersaing dengan judul atau tugas.
   */
  term: { word: string; meaning: string };
  /**
   * Petunjuk yang muncul saat pembaca mencoba melompat ke babak yang masih
   * terkunci. Satu kalimat perintah, bukan penjelasan.
   */
  hint: string;
  /** Angka kunci babak ini. */
  fact: { value: string; caption: string };
};

export const KANAL_ACTS: readonly KanalAct[] = [
  {
    number: "01",
    title: "Satu kanal",
    body: "Kanal digali untuk mengeringkan lahan. Begitu terbuka, air di dalam gambut mengalir keluar sendiri — tanpa pompa, hanya gravitasi. Makin dalam kanalnya, makin dalam muka air tanah di sekitarnya turun.",
    task: "Geser Kedalaman kanal di panel bawah sampai 100 cm.",
    observe: "Lihat garis biru di gambar: muka air tanah turun paling dalam di tepi kanal, lalu melandai menjauhinya. Tanah di atas garis itu kini kering.",
    hint: "Gali kanalnya sampai sedalam satu meter untuk melanjutkan.",
    term: { word: "Muka air tanah", meaning: "batas atas air yang tersimpan di dalam tanah. Gambut di bawahnya basah, gambut di atasnya kering." },
    fact: {
      value: "40 cm",
      caption: "Muka air lebih dalam dari ini menaikkan risiko kebakaran gambut (Wösten dkk., 2008), dan kini menjadi batas PP 57/2016",
    },
  },
  {
    number: "02",
    title: "Jauh dari tepi",
    // Tidak menyebut jaraknya: paragraf ini terbaca sebelum pembaca menebak,
    // dan menuliskan "ratusan meter" di sini berarti memberinya jawaban.
    body: "Tanah di tepi kanal sudah kering. Tetapi air mengalir ke kanal dari tanah di sekitarnya juga. Seberapa jauh dari kanal tanah ikut mengering sampai mudah terbakar?",
    // Tebak dulu, baru lihat. Pembaca hampir selalu mengira yang kering hanya
    // tepi kanal; jarak sebenarnya baru terasa mengejutkan bila ia sempat
    // menebak lebih dulu. Tugas sebelumnya — menyeret penanda ke perpotongan
    // dua garis pada grafik — hanya latihan membaca grafik, dan pembaca tidak
    // tahu untuk apa ia mengerjakannya.
    task: "Tebak dulu: sampai sejauh mana dari kanal lahan ini ikut kering dan rawan terbakar?",
    observe: "Warna jingga menandai lahan yang rawan terbakar. Di gambar besar ia sudah melewati ujung petak; peta lahan memperlihatkan sampai mana sebenarnya. Satu kanal mengeringkan lahan jauh lebih luas daripada galiannya.",
    hint: "Pilih tebakanmu untuk melanjutkan.",
    term: { word: "Rawan terbakar", meaning: "muka air lebih dalam dari 40 cm, sehingga lapisan gambut di atasnya cukup kering untuk menyala." },
    // Angka kunci babak ini sengaja bukan jarak tepi daerah rawan. Jarak itu
    // justru yang sedang dicari pembaca pada grafik, dan mencetaknya di panel
    // yang sama berarti menjawabnya untuk dia. Yang ditampilkan panjang
    // peluruhannya — tetapan yang membuat jaraknya sejauh itu, bukan jaraknya.
    fact: {
      value: "1 km",
      caption: "Di Kalampangan, Kalimantan Tengah, muka air sejauh ini dari kanal masih 40–50 cm lebih dangkal daripada di tepinya (Ritzema dkk., 2014)",
    },
  },
  {
    number: "03",
    title: "Tahun demi tahun",
    body: "Gambut kering menyusut sendiri, tanpa api sama sekali. Permukaannya turun beberapa sentimeter tiap tahun, dan karbon yang tersimpan ribuan tahun terlepas ke udara. Tidak terlihat karena terlalu lambat.",
    task: "Pilih Sedang atau Cepat pada Waktu berjalan, lalu tunggu sampai permukaan turun 50 cm.",
    observe: "Garis putus-putus menandai permukaan semula. Tanahnya turun tanpa api sama sekali, dan karbon yang tersimpan di dalamnya terlepas ke udara.",
    hint: "Jalankan waktu sampai permukaannya turun setengah meter.",
    term: { word: "Lesak (subsidensi)", meaning: "permukaan gambut turun karena gambut yang kering mengempis dan perlahan terurai menjadi gas karbon." },
    fact: {
      value: "7 cm/tahun",
      caption: "Lesak hutan gambut yang dikeringkan untuk tiap satu meter muka air turun, dan terus berlangsung selama drainasenya dijaga (Hooijer dkk., 2012)",
    },
  },
  {
    number: "04",
    title: "Yang kembali hanya airnya",
    body: "Sekat menahan air, muka airnya naik, dan lahan ini tidak lagi rawan terbakar. Tetapi tanah yang sudah melesak tidak ikut naik. Garis putus-putus menunjukkan setinggi mana tanah ini dahulu. Airnya bisa dikembalikan, tanahnya tidak.",
    task: "Tekan Pasang sekat kanal, lalu bandingkan permukaan tanah dengan garis putus-putus.",
    observe:
      "Muka air sudah pulih dan lahan ini tidak lagi rawan terbakar. Tetapi permukaannya tetap di tempatnya yang baru, di bawah garis putus-putus. Airnya bisa dikembalikan, tanahnya tidak.",
    hint: "Pasang sekat kanalnya.",
    term: { word: "Sekat kanal", meaning: "bendung kecil di dalam kanal yang menahan air agar tidak terus mengalir keluar dari gambut." },
    fact: {
      value: "± 400 m",
      caption: "Jangkauan sekat kanal menaikkan muka air di kiri dan kanan kanal Kalampangan (Ritzema dkk., 2014)",
    },
  },
];

/**
 * Pilihan tebakan babak 02: sejauh mana lahan rawan terbakar dari kanal.
 *
 * Tiga pilihan, masing-masing satu besaran — tepi, puluhan, ratusan — sebab
 * yang diuji adalah besarannya, bukan angkanya sampai meter. `m` adalah
 * jarak yang digambar sebagai garis "tebakanmu" pada grafik.
 */
export const REACH_GUESSES: readonly { id: string; label: string; note: string; m: number }[] = [
  { id: "tepi", label: "± 5 m", note: "hanya tepi kanal", m: 5 },
  { id: "puluhan", label: "± 50 m", note: "setengah lapangan bola", m: 50 },
  { id: "ratusan", label: "Ratusan meter", note: "beberapa kali panjang lapangan bola", m: 300 },
];

export const GUESS_TEXT = {
  chartLabel: "tebakanmu",
  yours: "Tebakanmu",
  actual: "Kenyataannya",
  right: "Tebakanmu tepat. Kebanyakan orang mengira hanya tepinya.",
  noCanal: "Kanalnya sedang tidak digali, jadi tidak ada lahan yang rawan. Gali lagi untuk melihatnya.",
  locked: "Tebak dulu di panel kiri. Peta ini akan menjawabnya.",
  /** Pengganti angka kunci babak 02 sebelum menebak: angka itu petunjuk jawaban. */
  factHidden: { value: "?", caption: "Angka kunci babak ini muncul setelah kamu menebak." },
};

/** Pilihan kecepatan waktu. */
export const TIME_SPEEDS: readonly { label: string; yearsPerSecond: number }[] = [
  { label: "Henti", yearsPerSecond: 0 },
  { label: "Lambat", yearsPerSecond: 0.5 },
  { label: "Sedang", yearsPerSecond: 2 },
  { label: "Cepat", yearsPerSecond: 6 },
];

export const CANAL_TEXT = {
  depthLabel: "Kedalaman kanal",
  blockLabel: "Pasang sekat kanal",
  blockedLabel: "Sekat terpasang",
  resetLabel: "Mulai dari awal",
  summaryLabel: "Lihat ringkasan",
};

export const CHART_TEXT = {
  canal: "kanal",
  /** Jangkauan rawan di satu sisi kanal. */
  reach: (m: string) => `${m} ke kiri dan ke kanan kanal`,
  allReach: "lebih dari 1 km ke kiri dan ke kanan kanal",
  /** Kalimat besar di bawah peta. */
  fields: (n: string) => `± ${n} lapangan bola`,
  fieldsLead: "lahan rawan terbakar di sepanjang tiap 1 km kanal",
  noneRisky: "Belum ada lahan yang rawan terbakar.",
  legendRisky: "rawan terbakar",
  legendSafe: "gambut masih basah",
  legendField: "lapangan bola, skala sama",
  scale: "1 km",
};

/**
 * Keterangan yang menjelaskan hubungan dua gambar di layar.
 *
 * Modul ini memperlihatkan dua hal sekaligus dengan skala yang berbeda seribu
 * kali: bongkahan tanah selebar 36 m tiap sisi, dan grafik sepanjang 1 km.
 * Tanpa dikatakan, pembaca mengira keduanya memperlihatkan hal yang sama dan
 * tidak dapat memahami satu pun — dan itu memang yang terjadi.
 */
export const FIGURE_NOTE = {
  block: (lengthM: number) => `Gambar: ${lengthM} m dari tepi kanal`,
  chart: "Dilihat dari atas",
  chartLead: "Kanal di tengah. Jingga = lahan di kiri-kanannya yang ikut kering dan rawan terbakar.",
  window: (lengthM: number) => `Gambar besar hanya memperlihatkan ${lengthM} m pertama; peta lahan memperlihatkan seluruhnya`,
};

/** Keterangan skala yang wajib tampil pada gambar. */
export const SCALE_NOTE = {
  exaggeration: (times: number) => `Tegak dibesarkan ${times}×`,
  canal: (widthM: number) => `Lebar kanal ${widthM} m, menurut skala`,
  // Pohon sengaja tidak ikut dibesarkan tegaknya; ia patokan ukuran, jadi ia
  // harus setinggi pohon sungguhan. Alasannya ada di `scene/vegetation.ts`.
  trees: "Pohon menurut tinggi sebenarnya",
  near: (lengthM: number) => `Petak dekat kanal, ${lengthM} m tiap sisi`,
};

/**
 * Kartu penutup yang muncul setelah sekat dipasang di babak 04.
 *
 * Menjawab pertanyaan pembuka ("Dari mana air itu datang?") dengan angka yang
 * baru saja dilihat pembaca sendiri, lalu meninggalkan satu kesimpulan yang
 * dapat ia bawa pulang: air dapat dikembalikan, tanah tidak.
 */
export const KANAL_SUMMARY = {
  title: KANAL_HOOK.question,
  answer: (depthCm: number, reach: string, fields: string) =>
    `Dari dalam gambut di sekitarnya. Kanal sedalam ${depthCm} cm menguras air sampai ${reach} ke kiri dan kanannya: ± ${fields} lapangan bola lahan menjadi rawan terbakar di sepanjang tiap 1 km kanal.`,
  closing:
    "Sekat mengembalikan airnya, tetapi tidak tanahnya. Karena itu menjaga gambut tetap basah sejak awal jauh lebih murah daripada memperbaikinya.",
  next: "Gambut yang kering inilah yang menjadi bahan bakar di modul berikutnya.",
  rows: {
    reach: "Lahan rawan dari kanal",
    fields: "Setara, tiap 1 km kanal",
    drop: "Permukaan turun",
    carbon: "Karbon terlepas",
  },
  share: "Buat kartu hasilmu",
  reset: "Coba lagi dari awal",
  close: "Lihat lahannya lagi",
};

/** Teks kartu hasil yang dibagikan ke media sosial. */
export const KANAL_CARD_TEXT = {
  brand: "EMBERGUARD · KANAL & PENGERINGAN",
  fieldsUnit: "lapangan bola",
  fieldsLead: "lahan gambut jadi rawan terbakar oleh tiap 1 km kanal",
  headline: (depthCm: number) => `Kanal sedalam ${depthCm} cm mengeringkan lahan jauh melewati tepinya.`,
  guessLine: (guess: string, reach: string) => `Tebakanku ${guess}. Ternyata ${reach} ke tiap sisi.`,
  note: "Airnya bisa dikembalikan dengan sekat. Tanah yang sudah melesak tidak.",
  challenge: "Menurutmu sejauh apa? Tebak sendiri.",
  source: "Simulasi Emberguard, dikalibrasi ke Hooijer dkk. (2012)",
};
