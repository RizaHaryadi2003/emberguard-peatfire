/**
 * ============================================================================
 *  TEKS MODUL 04 — GUDANG KARBON — GANTI DI SINI
 * ============================================================================
 *  Modul ini membaca bidang potong gambut yang sudah dikenal pembaca sejak
 *  Modul 01 sebagai dua hal sekaligus: sebuah kalender (satu milimeter satu
 *  tahun) dan sebuah gudang (lima puluh lima kilogram karbon tiap meter
 *  kubik). Keduanya bertemu pada satu kalimat — yang lepas dalam beberapa
 *  minggu dikumpulkan selama berabad-abad.
 *
 *  Angka pada `fact` mengikuti tetapan di `lib/carbon.ts`, yang semuanya
 *  masih menunggu sumber. Periksa ulang sebelum dipakai di naskah.
 * ============================================================================
 */

import {
  AREA_MAX_HA,
  BURN_DEPTH_MAX_M,
  HEADLINE_FIRE,
  NARROW_AREA_HA,
  RECOVERY_MAX_YEARS,
} from "@/lib/carbon";

export type KarbonAct = {
  number: string;
  title: string;
  /** Kalimat pengantar babak. */
  body: string;
  /** Tugas yang harus dilakukan pembaca agar babak berikutnya terbuka. */
  task: string;
  /**
   * Petunjuk yang muncul saat pembaca mencoba melompat ke babak yang masih
   * terkunci. Satu kalimat perintah, bukan penjelasan.
   */
  hint: string;
  /** Angka kunci babak ini. */
  fact: { value: string; caption: string };
};

/**
 * Patokan sejarah untuk babak 01.
 *
 * Satu saja, bukan daftar. Tugas babak itu mengubah tahun menjadi kedalaman,
 * dan satu patokan yang benar-benar dikenal semua orang Indonesia lebih
 * berguna daripada lima patokan yang harus dibaca dulu satu per satu.
 *
 * Angkanya dibulatkan dengan sengaja: Borobudur dibangun pada pertengahan
 * abad ke-8 sampai awal abad ke-9, jadi "sekitar 1.200 tahun lalu" benar
 * tanpa harus memilih satu tahun yang tidak pernah pasti.
 */
export const ANCHOR = {
  name: "Borobudur",
  years: 1200,
  /** Kalimat lengkapnya, untuk kartu babak 01. */
  note: "Candi Borobudur dibangun sekitar 1.200 tahun yang lalu.",
  /** Selisih yang masih diterima sebagai jawaban benar (m). */
  toleranceM: 0.1,
};

export const KARBON_ACTS: readonly KarbonAct[] = [
  {
    number: "01",
    title: "Arsip di bawah kaki",
    body: "Gambut menumpuk satu milimeter setahun, dan tidak pernah lebih cepat. Artinya bidang potong ini bukan sekadar tanah bertingkat: ia sebuah kalender. Satu meter ke bawah berarti seribu tahun ke belakang, dan setiap lapisan di dalamnya adalah hutan yang pernah berdiri di tempat yang sama.",
    task: `Geser penanda sampai menemukan gambut yang seumur ${ANCHOR.name}.`,
    hint: `Tandai kedalaman gambut yang seumur ${ANCHOR.name} untuk melanjutkan.`,
    fact: {
      value: "1 mm/tahun",
      caption: "Laju penumpukan gambut tropis — seribu tahun untuk satu meter",
    },
  },
  {
    number: "02",
    title: "Sekali bakar",
    body: "Yang terbakar pada kebakaran gambut bukan hanya yang di permukaan. Api masuk ke dalam dan menghabiskan lapisan demi lapisan, dan setiap sentimeter yang hilang adalah sepuluh tahun penimbunan yang lepas ke udara sebagai karbon dioksida.",
    task: "Bakar gambutnya sampai sedalam 50 cm, lalu baca yang hilang.",
    hint: "Bakar gambutnya sampai sedalam setengah meter.",
    fact: {
      value: "± 2.000 t",
      caption: "CO₂ yang lepas dari satu hektare gambut yang terbakar sedalam satu meter",
    },
  },
  {
    number: "03",
    title: "Hektare bukan ukurannya",
    body: "Berita kebakaran selalu menyebut luasnya dalam hektare, dan hampir tidak pernah menyebut sedalam apa gambutnya terbakar. Padahal keduanya masuk dengan bobot yang persis sama: lahan sepersepuluh luas yang terbakar sepuluh kali lebih dalam melepaskan karbon yang sama banyaknya.",
    task: `Setel luas dan kedalaman sampai karbonnya sama besar, dengan luas di bawah ${NARROW_AREA_HA} ha.`,
    hint: "Samakan karbonnya dengan kebakaran yang diberitakan, tetapi pada lahan yang jauh lebih sempit.",
    fact: {
      value: `${HEADLINE_FIRE.areaHa} ha`,
      caption: "Yang tertulis di berita — tanpa satu pun keterangan sedalam apa gambutnya terbakar",
    },
  },
  {
    number: "04",
    title: "Seribu tahun untuk satu meter",
    body: "Gambut yang terbakar tidak kembali dalam satu musim tanam. Ia menumpuk dengan laju yang sama seperti dahulu — satu milimeter setahun — sehingga takik yang ditinggalkan api dalam beberapa minggu baru tertutup setelah berabad-abad. Jalankan waktunya dan lihat sendiri seberapa jauh ia sampai.",
    task: "Jalankan waktu sampai sedikitnya satu abad berlalu.",
    hint: "Jalankan waktu pemulihannya sampai satu abad.",
    fact: {
      value: "5 abad",
      caption: "Lama menimbun kembali setengah meter gambut yang hilang terbakar",
    },
  },
];

/**
 * Pilihan kecepatan waktu pemulihan.
 *
 * Yang paling cepat pun menghabiskan lima abad dalam tujuh detik, dan itu
 * disengaja. Babak 04 justru tentang betapa lambatnya penimbunan kembali;
 * kecepatan yang menyelesaikannya dalam sekejap akan membantah kalimat yang
 * sedang dibacanya.
 */
export const TIME_SPEEDS: readonly { label: string; yearsPerSecond: number }[] = [
  { label: "Henti", yearsPerSecond: 0 },
  { label: "Lambat", yearsPerSecond: 8 },
  { label: "Sedang", yearsPerSecond: 28 },
  { label: "Cepat", yearsPerSecond: 70 },
];

export const KARBON_TEXT = {
  burnLabel: "Kedalaman terbakar",
  burnIdle: "belum terbakar",
  areaLabel: "Luas terbakar",
  timeLabel: "Waktu berjalan",
  resetLabel: "Mulai dari awal",
  timeLimit: "batas model",
  /** Kabar saat takik bekas bakar akhirnya tertutup seluruhnya. */
  healed:
    "Takiknya tertutup — tetapi perhatikan berapa tahun yang dibutuhkannya, dan bandingkan dengan berapa minggu api menghabiskannya.",
};

/**
 * Teks penanda kedalaman pada bidang potong — tugas babak 01.
 *
 * Bentuknya mengikuti `PROBE_TEXT` Modul 03: satu kalimat untuk tiap keadaan,
 * dan tiap kalimat menyuruh pembaca melakukan hal yang berbeda. "Belum benar"
 * saja tidak memberi tahu ia harus naik atau turun.
 */
export const DEPTH_PROBE_TEXT = {
  label: "Penanda kedalaman",
  idle: "Geser penanda di sepanjang bidang potong.",
  tooShallow: `Gambut di sini masih lebih muda daripada ${ANCHOR.name}. Coba lebih dalam.`,
  tooDeep: `Gambut di sini sudah lebih tua daripada ${ANCHOR.name}. Coba lebih dangkal.`,
  found: `Tepat — gambut di kedalaman ini tertimbun ketika ${ANCHOR.name} dibangun.`,
};

/** Teks penilaian jawaban babak 03. */
export const MATCH_TEXT = {
  label: "Karbon yang lepas",
  idle: "Belum ada yang terbakar.",
  tooLittle: "Masih kurang. Perdalam kebakarannya, atau perluas sedikit.",
  tooMuch: "Sudah lewat. Kurangi kedalamannya, atau persempit luasnya.",
  tooWide: `Luasnya masih ${HEADLINE_FIRE.areaHa} hektare juga. Persempit sampai di bawah ${NARROW_AREA_HA} ha, lalu ganti dengan kedalaman.`,
  matched: "Sama besar — pada lahan yang luasnya tinggal sepersekian.",
};

/**
 * Keterangan yang menjelaskan apa yang sedang dilihat pembaca.
 *
 * Modul ini memperlihatkan satu bongkahan tetapi menghitung satu hektare, dan
 * dua hal itu harus dikatakan, bukan dibiarkan ditebak. Modul 03 belajar
 * mahal soal ini: dua gambar berbeda skala tanpa keterangan membuat keduanya
 * tidak dapat dibaca sama sekali.
 */
export const FIGURE_NOTE = {
  block: "Gambar: bongkahan 4,4 m — petak yang sama dengan Modul 01 dan 02",
  area: "Angka karbon dihitung untuk seluruh luas yang disetel, bukan untuk bongkahan ini",
  calendar: "Alur pada bidang potong: tiap garis 100 tahun, garis tebal 500 tahun",
};

/** Keterangan skala yang wajib tampil pada gambar. */
export const SCALE_NOTE = {
  density: "Kerapatan gambut kering 100 kg/m³, kadar karbon 55%",
  person: "Pembanding: emisi CO₂ rata-rata satu orang Indonesia, 2,3 t/tahun",
  burn: (maxM: number) => `Kedalaman terbakar dibatasi ${maxM * 100} cm`,
  area: (maxHa: number) => `Luas dibatasi ${maxHa} ha`,
  time: (maxYears: number) => `Waktu pemulihan dibatasi ${maxYears} tahun`,
};

/** Keterangan batas yang dipakai panel kanan, sudah terisi angkanya. */
export const LIMIT_NOTES: readonly string[] = [
  SCALE_NOTE.density,
  SCALE_NOTE.person,
  SCALE_NOTE.burn(BURN_DEPTH_MAX_M),
  SCALE_NOTE.area(AREA_MAX_HA),
  SCALE_NOTE.time(RECOVERY_MAX_YEARS),
];

export const KARBON_SUMMARY = {
  title: "Yang tidak bisa ditanam kembali",
  lead: "Hutan di atasnya dapat ditanam ulang dalam beberapa dasawarsa. Gambut di bawahnya tidak.",
  closing:
    "Inilah sebabnya menjaga gambut tetap basah jauh lebih murah daripada memulihkannya: yang dijaga adalah timbunan ribuan tahun yang tidak dapat dipercepat oleh siapa pun.",
};
