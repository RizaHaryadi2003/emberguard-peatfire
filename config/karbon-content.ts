/**
 * ============================================================================
 *  TEKS MODUL KARBON — GUDANG KARBON — GANTI DI SINI
 * ============================================================================
 *  Modul ini membaca bidang potong gambut yang sudah dikenal pembaca sejak
 *  Modul Anatomi sebagai gudang karbon (± 55 kg karbon tiap meter kubik). Tiga
 *  babaknya: sedalam apa api gambut menghabiskannya, mengapa kedalaman sama
 *  pentingnya dengan luas, dan berapa lama yang hilang ditabung kembali.
 *
 *  Babak "Arsip di bawah kaki" (mencari gambut seumur Borobudur) dicabut pada
 *  11 November 2026 karena mengulang pelajaran Modul Anatomi Tahap 1. Acuan tiap
 *  angka ada di docs/md/acuan-modul-karbon.md.
 * ============================================================================
 */

import {
  AREA_MAX_HA,
  BURN_DEPTH_MAX_M,
  HEADLINE_FIRE,
  NARROW_AREA_HA,
  PERSON_T_CO2_PER_YEAR,
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

/** Layar pembuka: pertanyaan yang dijawab oleh babak 01. */
export const KARBON_HOOK = {
  setup: "Asap kebakaran gambut bisa bertahan berminggu-minggu.",
  question: "Apa sebenarnya yang terbakar?",
  cta: "Cari tahu",
  scrollHint: "atau gulir ke bawah",
};

export const KARBON_ACTS: readonly KarbonAct[] = [
  {
    number: "01",
    title: "Sekali bakar",
    body: "Gambut adalah gudang karbon: sekitar separuh bobot keringnya adalah karbon. Yang terbakar pada kebakaran gambut bukan hanya yang di permukaan. Api masuk ke dalam dan menghabiskan lapisan demi lapisan, dan setiap meter yang hilang dari satu hektare melepas sekitar 2.000 ton karbon dioksida.",
    task: "Bakar gambutnya sampai sedalam 50 cm, lalu baca yang hilang.",
    hint: "Bakar gambutnya sampai sedalam setengah meter.",
    fact: {
      value: "33–50 cm",
      caption: "Rata-rata gambut yang habis terbakar di Kalimantan Tengah, diukur dengan LiDAR pada 2006 dan di lapangan pada 1997 (Ballhorn dkk., 2009; Page dkk., 2002)",
    },
  },
  {
    number: "02",
    title: "Hektare bukan ukurannya",
    body: "Berita kebakaran selalu menyebut luasnya dalam hektare, dan hampir tidak pernah menyebut sedalam apa gambutnya terbakar. Padahal keduanya masuk dengan bobot yang persis sama: lahan sepersepuluh luas yang terbakar sepuluh kali lebih dalam melepaskan karbon yang sama banyaknya.",
    task: `Setel luas dan kedalaman sampai karbonnya sama besar, dengan luas di bawah ${NARROW_AREA_HA} ha.`,
    hint: "Samakan karbonnya dengan kebakaran yang diberitakan, tetapi pada lahan yang jauh lebih sempit.",
    fact: {
      value: `${HEADLINE_FIRE.areaHa} ha`,
      caption: "Lahan gambut yang terbakar di Pontianak pada kemarau 2019 menurut BPBD (ANTARA, 13 Agustus 2019), tanpa satu pun keterangan sedalam apa",
    },
  },
  {
    number: "03",
    title: "Seribu tahun untuk satu meter",
    body: "Gambut yang terbakar tidak kembali dalam satu musim tanam. Ia menumpuk dengan laju yang sama seperti dahulu, rata-rata satu milimeter setahun, sehingga takik yang ditinggalkan api dalam beberapa minggu baru tertutup setelah berabad-abad. Jalankan waktunya dan lihat sendiri seberapa jauh ia sampai.",
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
 * disengaja. Babak terakhir justru tentang betapa lambatnya penimbunan kembali;
 * kecepatan yang menyelesaikannya dalam sekejap akan membantah kalimat yang
 * sedang dibacanya.
 */
export const TIME_SPEEDS: readonly { label: string; yearsPerSecond: number }[] = [
  { label: "Henti", yearsPerSecond: 0 },
  { label: "Lambat", yearsPerSecond: 8 },
  { label: "Sedang", yearsPerSecond: 28 },
  { label: "Cepat", yearsPerSecond: 70 },
];

/**
 * Kedalaman terbakar yang pernah diukur, ditandai pada pengatur bakar supaya
 * pembaca dapat membandingkan bakarannya dengan kebakaran sungguhan:
 * rata-rata 0,33 m pada 2006 (LiDAR, Ballhorn dkk., 2009) dan lebih dari
 * 0,5 m pada 1997 (43 lokasi, Page dkk., 2002), keduanya di Kalimantan Tengah.
 */
export const BURN_REFERENCES: readonly { depthM: number; label: string }[] = [
  { depthM: 0.33, label: "2006" },
  { depthM: 0.5, label: "1997" },
];

export const BURN_REFERENCE_NOTE = "Tanda jingga: rata-rata gambut yang habis terbakar di Kalimantan Tengah pada 2006 dan 1997.";

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

/** Teks penilaian jawaban babak "Hektare bukan ukurannya". */
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
 * dua hal itu harus dikatakan, bukan dibiarkan ditebak. Modul Kanal belajar
 * mahal soal ini: dua gambar berbeda skala tanpa keterangan membuat keduanya
 * tidak dapat dibaca sama sekali.
 */
export const FIGURE_NOTE = {
  block: "Gambar: bongkahan 4,4 m — petak yang sama dengan Modul Anatomi dan Bara",
  area: "Angka karbon dihitung untuk seluruh luas yang disetel, bukan untuk bongkahan ini",
  calendar: "Alur pada bidang potong: tiap garis 100 tahun, garis tebal 500 tahun",
};

/** Keterangan skala yang wajib tampil pada gambar. */
export const SCALE_NOTE = {
  density: "Kerapatan gambut kering 100 kg/m³, kadar karbon 55%: ± 55 kg karbon tiap m³ (Warren dkk., 2012)",
  person: `Pembanding: emisi CO₂ rata-rata satu orang Indonesia, ${PERSON_T_CO2_PER_YEAR.toLocaleString("id-ID")} t/tahun (Global Carbon Budget, 2024)`,
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
