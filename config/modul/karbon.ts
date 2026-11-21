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
 *  angka ada di docs/md/acuan-modul/acuan-modul-karbon.md.
 * ============================================================================
 */

import type { GuideStep } from "@/lib/guide";
import { HEADLINE_FIRE, NARROW_AREA_HA, PERSON_T_CO2_PER_YEAR } from "@/lib/model/carbon";

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
      caption: "Rata-rata gambut yang habis terbakar di Kalimantan Tengah, diukur dengan LiDAR pada 2006 dan di lapangan pada 1997",
    },
  },
  {
    number: "02",
    title: "Hektare bukan ukurannya",
    body: `Berita kebakaran selalu menyebut luasnya dalam hektare, dan hampir tidak pernah menyebut sedalam apa gambutnya terbakar. Padahal keduanya sama penting: gambut yang terbakar adalah luas dikali kedalaman. Pengaturnya sudah disetel seperti kebakaran yang diberitakan, ${HEADLINE_FIRE.areaHa} ha sedalam ${Math.round(HEADLINE_FIRE.depthM * 100)} cm.`,
    task: `Persempit lahannya sampai ${NARROW_AREA_HA} ha atau kurang, lalu dalamkan kebakarannya sampai CO₂-nya sama besar.`,
    hint: `Persempit lahannya sampai ${NARROW_AREA_HA} ha, lalu dalamkan kebakarannya sampai CO₂-nya sama.`,
    fact: {
      value: `${HEADLINE_FIRE.areaHa} ha`,
      caption: "Lahan gambut yang terbakar di Pontianak pada kemarau 2019 menurut BPBD, tanpa satu pun keterangan sedalam apa",
    },
  },
  {
    number: "03",
    title: "Seribu tahun untuk satu meter",
    body: "Gambut yang terbakar tidak kembali dalam satu musim tanam. Ia menumpuk dengan laju yang sama seperti dahulu, rata-rata satu milimeter setahun, sehingga takik yang ditinggalkan api dalam beberapa minggu baru tertutup setelah berabad-abad. Jalankan waktunya dan lihat sendiri seberapa jauh ia sampai.",
    task: "Jalankan waktu sampai sedikitnya satu abad berlalu.",
    hint: "Jalankan waktu pemulihannya sampai satu abad.",
    // Nilainya dihitung dari kedalaman terbakar (lihat KarbonModule); ini
    // hanya tampil selama belum ada yang terbakar.
    fact: {
      value: "Berabad-abad",
      caption: "Lama menimbun kembali gambut yang hilang terbakar",
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
  tooLittle: "Kotak jinggamu masih lebih kecil. Dalamkan kebakarannya.",
  tooMuch: "Kotak jinggamu sudah lebih besar. Kurangi kedalamannya sedikit.",
  tooWide: `Lahannya masih terlalu luas. Persempit sampai ${NARROW_AREA_HA} ha atau kurang.`,
  matched: "Sama besar, pada lahan yang luasnya tinggal separuh atau kurang.",
};

/**
 * Bagan babak 02: dua kotak yang menggantung dari garis permukaan.
 *
 * Lebar kotak = luas, tinggi kotak = kedalaman, jadi besar kotak = gambut
 * yang terbakar = CO₂ yang lepas. Tugasnya menjadi menyamakan besar dua kotak,
 * bukan mencocokkan angka ton yang tidak terbayangkan.
 */
export const COMPARE_TEXT = {
  news: `Berita: ${HEADLINE_FIRE.areaHa} ha × ${Math.round(HEADLINE_FIRE.depthM * 100)} cm`,
  yours: "Kebakaranmu",
  note: "Lebar = luas, tinggi = kedalaman. Makin besar kotaknya, makin banyak CO₂ yang lepas.",
};

/**
 * Keterangan skala di panel kanan, sengaja hanya tiga baris. Batas pengatur
 * (100 cm, 30 ha, 500 tahun) dan sumber angkanya dicatat di
 * docs/md/acuan-modul/acuan-modul-karbon.md, bukan di layar.
 */
export const SCALE_NOTES: readonly string[] = [
  "Angka karbon dihitung untuk seluruh luas yang disetel, bukan untuk bongkahan ini",
  "Tiap m³ gambut kering menyimpan ± 55 kg karbon",
  `Pembanding: satu orang Indonesia melepas ± ${PERSON_T_CO2_PER_YEAR.toLocaleString("id-ID")} t CO₂ setahun`,
];

/* ============================================================================
 *  TUNTUNAN LANGKAH DEMI LANGKAH (lihat lib/guide.ts)
 *  Teksnya hanya mengulang isi babak di atas; tidak ada angka baru.
 * ========================================================================== */

export type KarbonGuideState = {
  burnCm: number;
  areaHa: number;
  timeOn: boolean;
  /** Tugas tiap babak sudah tuntas (actDone modul). */
  done: readonly boolean[];
};

export const KARBON_GUIDE: readonly (readonly GuideStep<KarbonGuideState>[])[] = [
  [
    { target: "burn", text: "Geser Kedalaman terbakar. Lihat gambutnya habis dari atas.", done: (s) => s.burnCm >= 15 },
    { target: "stats", text: "Di sini yang hilang: karbon yang lepas dan umur gambut yang ikut terbakar. Teruskan sampai 50 cm.", done: (s) => s.done[0] },
    { target: "next", text: "Tugas selesai. Lanjut ke babak berikutnya." },
  ],
  [
    { target: "area", text: `Geser Luas terbakar ke kiri sampai ${NARROW_AREA_HA} ha atau kurang. Kotak jinggamu menyempit.`, done: (s) => s.areaHa <= NARROW_AREA_HA || s.done[1] },
    { target: "burn", text: "Sekarang dalamkan kebakarannya sampai kotak jingga sama besar dengan kotak berita.", done: (s) => s.done[1] },
    { target: "stats", text: "Lahan sempit yang terbakar dalam melepas CO₂ sebanyak lahan luas yang dangkal." },
    { target: "next", text: "Tugas selesai. Lanjut ke babak berikutnya." },
  ],
  [
    { target: "time", text: "Jalankan waktu: pilih salah satu kecepatan.", done: (s) => s.timeOn },
    { target: "stats", text: "Gambut tumbuh lagi, tetapi sangat lambat. Tunggu sampai satu abad berlalu.", done: (s) => s.done[2] },
    // Kalimat penutup modul.
    { target: "next", text: "Hutan di atasnya dapat ditanam ulang dalam beberapa dasawarsa. Gambut di bawahnya tidak. Modul selesai." },
  ],
];
