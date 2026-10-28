// Gudang karbon gambut untuk Modul 04 "Gudang Karbon".
//
// Dipisah dari komponen 3D agar mudah diuji dan dirujuk di naskah skripsi,
// sama seperti `peat.ts` untuk Modul 01, `smolder.ts` untuk Modul 02, dan
// `drainage.ts` untuk Modul 03.
//
// --- Yang ingin disampaikan -------------------------------------------------
//
// Tiga modul sebelumnya memperlihatkan kerusakan yang tersembunyi di dalam
// bentuk (lapisan), ruang (bara di bawah permukaan), dan waktu (kanal yang
// bekerja bertahun-tahun). Modul ini memperlihatkan yang tersembunyi di dalam
// *besaran*: berapa banyak yang sebenarnya lepas, dan berapa lama ia
// dikumpulkan.
//
// Dua angka yang harus dibawa pulang pembaca, dan keduanya sudah ada di modul
// lain tanpa pernah dipertemukan:
//
//   1. Gambut menumpuk satu milimeter setahun (`PEAT_GROWTH_MM_PER_YEAR` di
//      peat.ts, dipakai Modul 01 saat pembaca menyeret waktu, dan dikutip
//      Modul 03 sebagai angka kunci babak 04). Artinya satu meter gambut
//      adalah seribu tahun penimbunan — bidang potong yang dilihat pembaca
//      sejak Modul 01 sebenarnya sebuah kalender.
//   2. Gambut yang terbakar melepaskan karbonnya sebagai CO2. Yang menentukan
//      besarnya bukan luas kebakaran — angka yang selalu muncul di berita —
//      melainkan luas dikali kedalaman. Kebakaran sempit yang dalam
//      melepaskan lebih banyak daripada kebakaran luas yang dangkal.
//
// Keduanya bertemu pada satu kalimat: yang lepas dalam beberapa minggu
// dikumpulkan selama berabad-abad.

import { PEAT_GROWTH_MM_PER_YEAR, PEAT_THICKNESS } from "./peat";

// ---------------------------------------------------------------------------
//  TETAPAN YANG MASIH BUTUH SUMBER
// ---------------------------------------------------------------------------
//
// Sama seperti pada `drainage.ts`: seluruh angka yang dilihat pembaca pada
// modul ini turun dari keempat tetapan di bawah, dan daftar referensi skripsi
// belum memuat satu pun sumber untuk besaran karbon gambut. Jadi semuanya
// dikumpulkan di sini, bukan disebar ke dalam kode, supaya dapat diganti
// sekaligus begitu sumbernya ada.
//
// Yang perlu dicari sumbernya, berurutan menurut besar pengaruhnya pada
// kesimpulan yang dibawa pembaca pulang:
//   1. PEAT_BULK_DENSITY_KG_M3 — mengalikan seluruh angka karbon secara lurus
//   2. CARBON_FRACTION         — sama, mengalikan seluruh angka karbon
//   3. PERSON_T_CO2_PER_YEAR   — menentukan pembandingnya terasa besar atau
//                                biasa saja, dan pembanding itulah yang
//                                diingat pembaca, bukan tonnya
// ---------------------------------------------------------------------------

/**
 * Kerapatan lindak gambut tropis kering (kg per m³).
 *
 * Gambut hampir seluruhnya air dan rongga; yang tersisa setelah airnya
 * menguap sangat ringan. Kisaran yang umum dikutip untuk gambut tropis
 * Indonesia 80-120 kg/m³, dan dipakai angka bulat di tengahnya supaya
 * pembaca dapat menghitungnya sendiri di kepala.
 */
export const PEAT_BULK_DENSITY_KG_M3 = 100;

/**
 * Bagian massa kering gambut yang berupa karbon (0-1).
 *
 * Gambut adalah sisa tumbuhan yang tidak sempat membusuk, jadi sebagian besar
 * massanya memang karbon — jauh lebih besar daripada tanah mineral mana pun.
 * Inilah yang membuat sepetak gambut menyimpan karbon lebih banyak daripada
 * hutan yang tumbuh di atasnya.
 */
export const CARBON_FRACTION = 0.55;

/**
 * Perbandingan massa CO2 terhadap massa karbon yang menjadi asalnya.
 *
 * 44/12: satu atom karbon (12) mengikat dua atom oksigen (32) saat terbakar.
 * Bukan tetapan yang perlu sumber — ini massa atom — tetapi ditulis sebagai
 * tetapan bernama supaya tidak ada "3,67" tanpa keterangan di dalam kode.
 */
export const CO2_PER_CARBON = 44 / 12;

/**
 * Emisi CO2 rata-rata satu orang Indonesia dalam setahun (ton).
 *
 * Dipakai sebagai pembanding, bukan sebagai angka yang diajarkan. Ton karbon
 * tidak berarti apa-apa bagi siapa pun yang belum pernah menimbangnya;
 * "sebanyak yang dikeluarkan sekian ribu orang dalam setahun" berarti.
 */
export const PERSON_T_CO2_PER_YEAR = 2.3;

// ---------------------------------------------------------------------------
//  SIMPANAN KARBON
// ---------------------------------------------------------------------------

/** Luas satu hektare (m²). */
export const HECTARE_M2 = 10_000;

/** Karbon yang tersimpan dalam satu meter kubik gambut (kg). */
export const CARBON_KG_PER_M3 = PEAT_BULK_DENSITY_KG_M3 * CARBON_FRACTION;

/**
 * Karbon yang tersimpan pada lahan seluas `areaHa` setebal `depthM` (ton C).
 *
 * Perkalian lurus, dan kelurusan itulah isi pelajarannya: luas dan kedalaman
 * masuk dengan bobot yang persis sama. Kebakaran sepersepuluh luas yang
 * sepuluh kali lebih dalam melepaskan jumlah yang sama — padahal yang pertama
 * tidak pernah menjadi berita.
 */
export function carbonStockT(areaHa: number, depthM: number): number {
  const volume = Math.max(0, areaHa) * HECTARE_M2 * Math.max(0, depthM);
  return (volume * CARBON_KG_PER_M3) / 1000;
}

/** CO2 yang dilepaskan bila `carbonT` ton karbon terbakar habis (ton CO2). */
export function co2FromCarbonT(carbonT: number): number {
  return carbonT * CO2_PER_CARBON;
}

/** CO2 yang lepas bila lahan seluas `areaHa` terbakar sedalam `depthM`. */
export function co2ReleasedT(areaHa: number, depthM: number): number {
  return co2FromCarbonT(carbonStockT(areaHa, depthM));
}

/**
 * Berapa orang yang emisi setahunnya sebanding dengan `co2T` ton CO2.
 *
 * Dibulatkan oleh pemanggilnya, bukan di sini: yang dikembalikan angka, bukan
 * tulisan.
 */
export function peopleYearsEquivalent(co2T: number): number {
  return co2T / PERSON_T_CO2_PER_YEAR;
}

// ---------------------------------------------------------------------------
//  KALENDER GAMBUT
// ---------------------------------------------------------------------------
//
// Bidang potong yang sama yang dilihat pembaca sejak Modul 01, dibaca sebagai
// sumbu waktu. Tidak ada yang diubah pada gambutnya — hanya penggarisnya yang
// diganti, dari meter menjadi tahun.

/** Tebal gambut yang menumpuk dalam setahun (m). */
export const GROWTH_M_PER_YEAR = PEAT_GROWTH_MM_PER_YEAR / 1000;

/**
 * Umur gambut pada kedalaman `depthM` (tahun sejak ia tertimbun).
 *
 * Nol di permukaan — itu serasah tahun ini — dan bertambah seribu tahun tiap
 * satu meter ke bawah. Di luar lapisan gambut nilainya dijepit: tanah mineral
 * di bawahnya bukan timbunan, jadi tidak punya umur dalam arti ini.
 */
export function ageAtDepth(depthM: number): number {
  const clamped = Math.max(0, Math.min(PEAT_THICKNESS, depthM));
  return clamped / GROWTH_M_PER_YEAR;
}

/** Kedalaman tempat gambut berumur `years` tahun berada (m). */
export function depthAtAge(years: number): number {
  return Math.max(0, Math.min(PEAT_THICKNESS, years * GROWTH_M_PER_YEAR));
}

/** Umur gambut paling dalam, tepat di atas tanah mineral (tahun). */
export const DEEPEST_AGE_YEARS = ageAtDepth(PEAT_THICKNESS);

/**
 * Lama waktu yang dibutuhkan untuk menimbun kembali `depthM` meter (tahun).
 *
 * Sama persis dengan umurnya, dan memang harus: yang menimbunnya laju yang
 * sama dengan yang dahulu menimbunnya. Ditulis sebagai fungsi tersendiri
 * karena artinya berbeda — yang satu melihat ke belakang, yang satu ke depan —
 * dan pada babak terakhir pembaca perlu membaca keduanya berdampingan.
 */
export function recoveryYears(depthM: number): number {
  return Math.max(0, depthM) / GROWTH_M_PER_YEAR;
}

// ---------------------------------------------------------------------------
//  RENTANG KENDALI
// ---------------------------------------------------------------------------

/**
 * Kedalaman terbakar terdalam yang dapat disetel pembaca (m).
 *
 * Satu meter, bukan setebal profilnya. Kebakaran gambut yang terdalam yang
 * pernah tercatat memang mencapai sekitar satu meter pada kemarau panjang;
 * membiarkan pengaturnya sampai 2,8 m akan membuat pembaca mendapat angka
 * yang tidak pernah terjadi di mana pun, dan angka itulah yang akan ia kutip.
 */
export const BURN_DEPTH_MAX_M = 1;

/** Rentang luas kebakaran yang dapat disetel pembaca (ha). */
export const AREA_MIN_HA = 1;
export const AREA_MAX_HA = 150;

/** Luas awal yang dipakai sebelum pembaca menyentuh pengaturnya (ha). */
export const AREA_DEFAULT_HA = 1;

/**
 * Lama waktu pemulihan yang dapat dimajukan pembaca (tahun).
 *
 * Lima ratus tahun. Batas ini bukan kerapian melainkan isi babak terakhir:
 * dalam seluruh rentang yang disediakan, gambut yang tumbuh kembali hanya
 * setengah meter. Pembaca mentok pada batasnya sambil masih melihat takik
 * bekas bakar yang belum tertutup — dan itulah kesimpulan yang harus ia
 * dapatkan sendiri, bukan dibaca dari kalimat.
 */
export const RECOVERY_MAX_YEARS = 500;

// ---------------------------------------------------------------------------
//  KEBAKARAN YANG DIBERITAKAN
// ---------------------------------------------------------------------------

/**
 * Angka kebakaran yang menjadi soal babak 03.
 *
 * Bentuknya sengaja seperti yang muncul di berita: luas dalam hektare, dan
 * tidak satu pun keterangan tentang sedalam apa gambutnya terbakar. Justru
 * ketiadaan itu yang menjadi pelajarannya.
 *
 * Angkanya bukan kutipan dari satu kejadian tertentu — kedalaman bakar
 * jarang sekali diukur dan dilaporkan — melainkan susunan yang besarannya
 * masuk akal dan yang hasil kalinya menghasilkan soal yang dapat dikerjakan.
 */
export const HEADLINE_FIRE = {
  areaHa: 120,
  /** Kedalaman gambut yang benar-benar habis terbakar (m). */
  depthM: 0.08,
} as const;

/** CO2 yang dilepaskan kebakaran yang diberitakan itu (ton). */
export const HEADLINE_CO2_T = co2ReleasedT(HEADLINE_FIRE.areaHa, HEADLINE_FIRE.depthM);

/**
 * Luas terbesar yang masih dianggap "jauh lebih sempit" pada babak 03 (ha).
 *
 * Tanpa batas ini, jawaban babak 03 yang paling mudah adalah menyalin
 * angkanya sendiri — 120 ha sedalam 8 cm — dan pembaca lulus tanpa pernah
 * menemukan apa pun. Dengan batas ini ia harus menukar luas dengan
 * kedalaman, dan pertukaran itulah seluruh isi babaknya.
 */
export const NARROW_AREA_HA = 25;

/** Selisih yang masih dianggap sama besar pada babak 03 (bagian, 0-1). */
export const MATCH_TOLERANCE = 0.04;

export type MatchVerdict = "idle" | "tooLittle" | "tooMuch" | "tooWide" | "matched";

/**
 * Nilai jawaban babak 03.
 *
 * Tiga keadaan yang berbeda dipisahkan, bukan dijadikan satu "belum benar",
 * sebab ketiganya menyuruh pembaca melakukan hal yang berbeda: menambah,
 * mengurangi, atau mempersempit. Pola yang sama dengan `judgeProbe` pada
 * Modul 03 (`components/gambut/kanal/probe.ts`).
 */
export function judgeMatch(areaHa: number, depthM: number): MatchVerdict {
  if (depthM <= 0) return "idle";
  if (areaHa > NARROW_AREA_HA) return "tooWide";
  const co2 = co2ReleasedT(areaHa, depthM);
  const gap = (co2 - HEADLINE_CO2_T) / HEADLINE_CO2_T;
  if (Math.abs(gap) <= MATCH_TOLERANCE) return "matched";
  return gap < 0 ? "tooLittle" : "tooMuch";
}

/** Jawaban babak 03 sudah benar. */
export function matchSolved(verdict: MatchVerdict): boolean {
  return verdict === "matched";
}

// ---------------------------------------------------------------------------
//  KEADAAN SIMULASI
// ---------------------------------------------------------------------------

export type CarbonStats = {
  /** Kedalaman gambut yang sudah habis terbakar (m). */
  burnDepthM: number;
  /** Luas yang terbakar (ha). */
  areaHa: number;
  /** Karbon yang lepas (ton C). */
  carbonT: number;
  /** CO2 yang lepas (ton). */
  co2T: number;
  /** Setara emisi setahun berapa orang. */
  peopleYears: number;
  /** Lama penimbunan yang hilang (tahun). */
  lostYears: number;
  /** Waktu pemulihan yang sudah berjalan (tahun). */
  years: number;
  /** Tebal gambut yang sudah tumbuh kembali (m). */
  regrownM: number;
  /** Takik bekas bakar yang masih terbuka (m). */
  remainingM: number;
  /** Lama lagi sampai takik itu tertutup seluruhnya (tahun). */
  yearsLeft: number;
  /** Waktu sudah mencapai batas yang disediakan modul. */
  atTimeLimit: boolean;
};

// --- Mengapa simulasi ini tidak memakai langkah tetap -----------------------
//
// `SmolderSim` dan `DrainageSim` memajukan waktunya dalam langkah tetap, dan
// menyimpan sisa yang belum genap satu langkah untuk pemanggilan berikutnya.
// Rancangan pertama berkas ini menyalin pola itu, dengan alasan "supaya sama".
// Ujinya langsung menolaknya, dan penolakan itu benar.
//
// Alasan langkah tetap ada di kedua simulasi lain: lajunya bergantung pada
// keadaan yang baru saja ia ubah sendiri. Muka air tanah ikut turun bersama
// permukaan yang melesak, dan nyala bara mengubah kelembapan tetangganya —
// jadi hasil dua puluh tahun benar-benar berbeda bila dihitung dengan langkah
// yang berbeda, dan satu-satunya jalan agar pembaca tidak mendapat angka yang
// berbeda karena perangkatnya berbeda adalah memaku besar langkahnya.
//
// Pemulihan gambut tidak begitu. Lajunya satu milimeter setahun, tetap, tidak
// bergantung pada apa pun yang sudah tertimbun. Penjumlahan yang lurus seperti
// itu justru dirusak oleh langkah tetap: sisa pecahan yang tidak pernah genap
// menumpuk, sehingga pemanggil yang memajukan 0,4 tahun sekali berakhir satu
// tahun lebih pendek daripada yang memajukan 17 tahun sekali. Yang diadakan
// untuk membuat hasilnya tidak bergantung pemanggil malah membuatnya begitu.
//
// Jadi waktunya dijumlahkan apa adanya. Bila nanti lajunya diberi suku yang
// tidak lurus — misalnya penimbunan melambat ketika takiknya hampir tertutup —
// langkah tetapnya harus dipasang kembali, dan uji "hasilnya sama berapa pun
// besar langkah pemanggilnya" akan menangkap keperluan itu.

/**
 * Simulasi satu petak gambut yang terbakar lalu menimbun kembali.
 *
 * Keadaannya tiga angka: sedalam apa terbakar, seluas apa, dan sudah berapa
 * tahun berlalu sejak itu. Yang tidak pernah terjadi: gambut yang hilang
 * kembali seketika. Menimbunnya satu-satunya jalan, dan jalan itu satu
 * milimeter setahun.
 */
export class CarbonSim {
  private burnDepth = 0;
  private area = AREA_DEFAULT_HA;
  private years = 0;

  stats: CarbonStats = emptyStats();

  constructor() {
    this.collect();
  }

  /** Kembalikan petak ini ke keadaan sebelum terbakar. */
  reset(): void {
    this.burnDepth = 0;
    this.area = AREA_DEFAULT_HA;
    this.years = 0;
    this.collect();
  }

  /**
   * Setel kedalaman yang terbakar.
   *
   * Mengubahnya mengembalikan waktu pemulihan ke nol: pembaca sedang menyetel
   * kebakaran yang baru, bukan membakar ulang petak yang sedang pulih.
   * Tanpa ini, menggeser pengatur pada babak 04 akan memperlihatkan takik
   * yang sudah separuh tertimbun oleh tahun-tahun kebakaran sebelumnya.
   */
  setBurnDepth(depthM: number): void {
    const next = Math.max(0, Math.min(BURN_DEPTH_MAX_M, depthM));
    if (next === this.burnDepth) return;
    this.burnDepth = next;
    this.years = 0;
  }

  /** Setel luas yang terbakar (ha). Tidak mempengaruhi bentuk, hanya angkanya. */
  setArea(areaHa: number): void {
    this.area = Math.max(AREA_MIN_HA, Math.min(AREA_MAX_HA, areaHa));
  }

  /** Kedalaman yang terbakar sekarang (m). */
  burnDepthM(): number {
    return this.burnDepth;
  }

  /**
   * Majukan pemulihan `years` tahun.
   *
   * Dijumlahkan apa adanya, bukan dalam langkah tetap — alasannya ditulis
   * panjang di atas kelas ini, sebab ia menyimpang dari kedua simulasi lain
   * di skripsi ini dan penyimpangan itu harus dapat dipertanggungjawabkan.
   */
  advance(years: number): void {
    if (years <= 0) return;
    this.years = Math.min(RECOVERY_MAX_YEARS, this.years + years);
  }

  /** Tebal gambut yang sudah tumbuh kembali (m), tidak pernah melebihi takiknya. */
  regrownM(): number {
    return Math.min(this.burnDepth, this.years * GROWTH_M_PER_YEAR);
  }

  /** Hitung ulang ringkasan untuk antarmuka. */
  collect(): void {
    const carbonT = carbonStockT(this.area, this.burnDepth);
    const co2T = co2FromCarbonT(carbonT);
    const regrownM = this.regrownM();
    const remainingM = Math.max(0, this.burnDepth - regrownM);
    this.stats = {
      burnDepthM: this.burnDepth,
      areaHa: this.area,
      carbonT,
      co2T,
      peopleYears: peopleYearsEquivalent(co2T),
      lostYears: recoveryYears(this.burnDepth),
      years: this.years,
      regrownM,
      remainingM,
      yearsLeft: recoveryYears(remainingM),
      atTimeLimit: this.years >= RECOVERY_MAX_YEARS,
    };
  }
}

function emptyStats(): CarbonStats {
  return {
    burnDepthM: 0,
    areaHa: AREA_DEFAULT_HA,
    carbonT: 0,
    co2T: 0,
    peopleYears: 0,
    lostYears: 0,
    years: 0,
    regrownM: 0,
    remainingM: 0,
    yearsLeft: 0,
    atTimeLimit: false,
  };
}

// ---------------------------------------------------------------------------
//  FORMAT ANGKA
// ---------------------------------------------------------------------------

/**
 * Jumlah tahun yang besar, mis. 1200 → "1.200 tahun".
 *
 * Memakai pemisah ribuan Indonesia (titik). Tanpa pemisah, "1200 tahun" dan
 * "12000 tahun" terbaca nyaris sama cepat oleh mata, dan modul ini seluruhnya
 * tentang membedakan besar.
 */
export function formatYearCount(years: number): string {
  return `${Math.round(years).toLocaleString("id-ID")} tahun`;
}

/** Abad, mis. 1200 → "12 abad". Dipakai bila ruangnya hanya satu baris. */
export function formatCenturies(years: number): string {
  return `${Math.round(years / 100)} abad`;
}

/**
 * Massa CO2, mis. 1008 → "1.008 t"; 19360 → "19.360 t".
 *
 * Tidak pernah dibulatkan menjadi "ribu ton" atau sejenisnya: pada babak 03
 * pembaca membandingkan dua angka yang berselisih beberapa persen, dan
 * pembulatan yang ramah justru membuat soalnya mustahil dibaca.
 */
export function formatTonnes(t: number): string {
  return `${Math.round(t).toLocaleString("id-ID")} t`;
}

/** Jumlah orang, mis. 438,2 → "438 orang". */
export function formatPeople(count: number): string {
  return `${Math.round(count).toLocaleString("id-ID")} orang`;
}

/** Luas, mis. 19,2 → "19,2 ha"; 120 → "120 ha". */
export function formatArea(ha: number): string {
  return `${ha.toLocaleString("id-ID", { maximumFractionDigits: 1 })} ha`;
}

/** Ketebalan, mis. 0,48 → "48 cm". */
export function formatThickness(m: number): string {
  return `${Math.round(m * 100)} cm`;
}
