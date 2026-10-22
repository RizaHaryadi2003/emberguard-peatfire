// Hidrologi kanal gambut untuk Modul 03 "Kanal & Pengeringan".
//
// Dipisah dari komponen 3D agar mudah diuji dan dirujuk di naskah skripsi,
// sama seperti `peat.ts` untuk Modul 01 dan `smolder.ts` untuk Modul 02.
//
// --- Pergeseran skala, dan mengapa perlu -----------------------------------
//
// Modul 01 dan 02 memakai bongkahan tanah selebar 4,4 m. Pengeringan tidak
// terjadi pada skala itu: satu kanal menurunkan muka air tanah bukan hanya di
// tepinya, melainkan dalam kerucut penurunan yang membentang ratusan meter ke
// dalam kubah gambut. Digambarkan pada bongkahan 4,4 m, kerucut itu akan
// tampak sebagai garis datar — tidak ada yang bisa dipelajari dari sana.
//
// Karena itu Modul 03 menarik kamera ke belakang: penampang lanskap sepanjang
// satu kilometer, sedalam profil gambut yang sama. Lapisan, rona, dan teksturnya tetap
// yang dipakai dua modul sebelumnya, sehingga pembaca mengenali tanah yang
// sama — hanya dilihat dari jauh.
//
// --- Yang ingin disampaikan -------------------------------------------------
//
// Modul 02 memperlihatkan kerusakan yang tidak terlihat karena tersembunyi di
// dalam *ruang*: bara di bawah permukaan. Modul 03 memperlihatkan kerusakan
// yang tidak terlihat karena tersembunyi di dalam *waktu*: satu kanal bekerja
// pelan, bertahun-tahun, jauh dari kanalnya sendiri. Dan ketika akhirnya
// diperbaiki, yang dapat dikembalikan hanya airnya — tanahnya tidak.

import { PROFILE_DEPTH } from "./peat";

// ---------------------------------------------------------------------------
//  TETAPAN YANG MASIH BUTUH SUMBER
// ---------------------------------------------------------------------------
//
// Keenam tetapan di bawah ini menentukan seluruh angka yang dilihat pembaca.
// Nilainya dipilih dari kisaran yang umum dikutip untuk gambut tropis
// Indonesia, tetapi daftar referensi skripsi ini belum memuat satu pun sumber
// hidrologi gambut — isinya metodologi dan media pembelajaran. Jadi semuanya
// dikumpulkan di sini, bukan disebar ke dalam kode, supaya dapat diganti
// sekaligus begitu sumbernya ada, tanpa menyentuh bagian lain.
//
// Yang perlu dicari sumbernya, berurutan menurut besar pengaruhnya pada
// kesimpulan yang dibawa pembaca pulang:
//   1. SUBSIDENCE_CM_PER_YEAR_PER_M  — menentukan "berapa lesak dalam 20 tahun"
//   2. INFLUENCE_LENGTH_PER_M        — menentukan "sejauh apa dari kanal"
//   3. EMISSION_T_PER_HA_PER_M       — menentukan angka karbon
// ---------------------------------------------------------------------------

/**
 * Panjang pengaruh kanal (m) per 1 m kedalaman kanal.
 *
 * Jarak tempat penurunan muka air tinggal 37% (1/e) dari penurunan di tepi
 * kanal. Kanal sedalam 2 m karena itu masih terasa sampai ratusan meter.
 */
export const INFLUENCE_LENGTH_PER_M = 190;

/**
 * Laju penurunan permukaan (cm/tahun) per 1 m muka air tanah di bawah
 * permukaan.
 *
 * Gambut yang kering tidak hanya mudah terbakar; ia juga menyusut dan
 * teroksidasi sendiri, tanpa api sama sekali. Inilah bagian yang paling sering
 * tidak diketahui pembaca.
 */
export const SUBSIDENCE_CM_PER_YEAR_PER_M = 5;

/**
 * Emisi karbon (ton CO2 per hektar per tahun) per 1 m muka air tanah di bawah
 * permukaan. Dipakai hanya untuk angka di antarmuka, tidak mempengaruhi bentuk.
 */
export const EMISSION_T_PER_HA_PER_M = 80;

/**
 * Muka air tanah alami gambut yang belum dikeringkan (m di bawah permukaan).
 *
 * Di kubah gambut yang utuh, air hampir selalu berada di dekat permukaan
 * sepanjang tahun. Itulah yang menjaganya tidak dapat terbakar.
 */
export const NATURAL_WATER_DEPTH_M = 0.1;

/**
 * Bagian penurunan permukaan yang terjadi pada tahun-tahun pertama akibat
 * pemampatan, bukan oksidasi (0-1).
 *
 * Begitu air keluar, gambut langsung memampat karena kehilangan daya angkat
 * air di pori-porinya. Penurunan tahun pertama karena itu selalu lebih cepat
 * daripada tahun-tahun sesudahnya, dan itu terjadi walau kanalnya segera
 * disekat kembali.
 */
export const COMPACTION_SHARE = 0.3;

/** Lama pemampatan awal berlangsung (tahun). */
export const COMPACTION_YEARS = 2;

// ---------------------------------------------------------------------------
//  GEOMETRI LANSKAP
// ---------------------------------------------------------------------------

/**
 * Panjang penampang, diukur dari tepi kanal ke dalam kubah gambut (m).
 *
 * Semula 500 m, dan itu keliru: dengan kanal sedalam 2 m, muka air pada jarak
 * 500 m masih 61 cm di bawah permukaan — masih melewati batas 40 cm. Artinya
 * seluruh penampang berwarna rawan dan pembaca tidak pernah melihat di mana
 * kerucut penurunan itu berakhir, padahal justru tepi itulah yang harus
 * dicarinya pada babak 02.
 *
 * Pada 1.000 m, kanal 1 m berakhir di 209 m dan kanal 2 m di 701 m, jadi
 * tepinya terlihat di dalam gambar. Kanal 3 m tetap melewati ujung penampang
 * — dan itu bukan cacat, melainkan jawabannya: pengaruhnya tidak muat dalam
 * satu kilometer.
 */
export const TRANSECT_LENGTH_M = 1000;

/** Lebar kanal (m). */
export const CANAL_WIDTH_M = 8;

/** Rentang kedalaman kanal yang dapat digali pembaca (m). */
export const CANAL_DEPTH_MIN_M = 0;
export const CANAL_DEPTH_MAX_M = 3;

/** Kedalaman profil gambut, sama dengan Modul 01 dan 02 (m). */
export const PROFILE_DEPTH_M = PROFILE_DEPTH;

/**
 * Jumlah kolom penampang. Satu kolom mewakili 2,5 m lanskap, cukup halus
 * untuk menggambar kurva penurunan yang mulus tanpa membuat kisi terlihat.
 */
export const COLUMNS = 200;

/** Jarak dari kanal untuk kolom ke-i (m, di pusat kolomnya). */
export function distanceOfColumn(col: number): number {
  return ((col + 0.5) / COLUMNS) * TRANSECT_LENGTH_M;
}

/** Kolom terdekat dengan jarak `m` dari kanal. */
export function columnAtDistance(m: number): number {
  const col = Math.floor((m / TRANSECT_LENGTH_M) * COLUMNS);
  return Math.max(0, Math.min(COLUMNS - 1, col));
}

/**
 * Ketinggian permukaan gambut alami (m di atas dasar kanal) pada jarak `m`.
 *
 * Kubah gambut memang berbentuk kubah: tengahnya lebih tinggi daripada
 * tepinya, karena di sanalah timbunan paling lama tidak terganggu. Kemiringan
 * ini kecil — beberapa meter dalam beberapa kilometer — jadi sepanjang satu
 * kilometer nilainya hanya puluhan sentimeter. Tetap dihitung, sebab inilah yang
 * membuat air mengalir ke arah kanal dengan sendirinya.
 */
export function naturalSurfaceM(distanceM: number): number {
  const t = Math.min(1, distanceM / TRANSECT_LENGTH_M);
  // Lengkung kubah: naik cepat di dekat tepi, lalu melandai.
  return 0.45 * Math.sqrt(t);
}

// ---------------------------------------------------------------------------
//  KURVA PENURUNAN MUKA AIR
// ---------------------------------------------------------------------------

/** Panjang pengaruh kanal sedalam `canalDepthM` (m). */
export function influenceLength(canalDepthM: number): number {
  return Math.max(1, canalDepthM) * INFLUENCE_LENGTH_PER_M;
}

/**
 * Muka air tanah pada jarak `distanceM` dari kanal (m di bawah permukaan
 * gambut saat itu).
 *
 * Bentuknya peluruhan eksponensial dari tepi kanal menuju muka air alami.
 * Ini penyederhanaan — aliran air tanah sebenarnya diselesaikan dengan
 * persamaan Darcy dan bergantung pada daya hantar tiap lapisan — tetapi
 * bentuknya benar: paling dalam di tepi kanal, lalu pulih menuju keadaan
 * alami, dan panjang pemulihannya bertambah bila kanalnya lebih dalam.
 * Penyederhanaan ini dipilih supaya dapat dijelaskan dalam satu kalimat pada
 * naskah skripsi.
 *
 * `surfaceDropM` adalah penurunan permukaan yang sudah terjadi di titik itu.
 * Ia mengurangi kedalaman muka air, bukan menambahnya: permukaan yang melesak
 * ikut turun mendekati airnya. Umpan balik ini yang membuat pengeringan
 * melambat sendiri setelah beberapa dasawarsa — bukan karena membaik,
 * melainkan karena tanahnya sudah habis turun.
 */
export function waterDepthAt(distanceM: number, canalDepthM: number, surfaceDropM = 0): number {
  if (canalDepthM <= 0) return NATURAL_WATER_DEPTH_M;
  const atCanal = Math.max(NATURAL_WATER_DEPTH_M, canalDepthM);
  const decay = Math.exp(-distanceM / influenceLength(canalDepthM));
  const depth = NATURAL_WATER_DEPTH_M + (atCanal - NATURAL_WATER_DEPTH_M) * decay;
  // Permukaan yang sudah melesak mendekati muka air; tidak pernah menembusnya.
  return Math.max(0, Math.min(PROFILE_DEPTH_M, depth - surfaceDropM));
}

/**
 * Laju penurunan permukaan (m/tahun) pada muka air tanah `waterDepthM`.
 *
 * Nol selama gambut masih jenuh sampai ke permukaan: tanpa udara yang masuk,
 * tidak ada yang teroksidasi. Sesudah itu laju bertambah sebanding dengan
 * ketebalan lapisan kering di atas muka air.
 */
export function subsidenceRatePerYear(waterDepthM: number): number {
  const drained = Math.max(0, waterDepthM - NATURAL_WATER_DEPTH_M);
  return (drained * SUBSIDENCE_CM_PER_YEAR_PER_M) / 100;
}

/** Emisi karbon (ton CO2/ha/tahun) pada muka air tanah `waterDepthM`. */
export function emissionPerYear(waterDepthM: number): number {
  const drained = Math.max(0, waterDepthM - NATURAL_WATER_DEPTH_M);
  return drained * EMISSION_T_PER_HA_PER_M;
}

/**
 * Pengali laju pada tahun ke-`years` sejak kanal digali.
 *
 * Pemampatan membuat tahun-tahun pertama turun lebih cepat. Tanpa ini, grafik
 * penurunan menjadi garis lurus sempurna — dan pembaca kehilangan satu hal
 * yang penting: sebagian kerusakan sudah terjadi bahkan sebelum ia sempat
 * berubah pikiran.
 */
export function compactionBoost(years: number): number {
  if (years >= COMPACTION_YEARS) return 1;
  const left = 1 - years / COMPACTION_YEARS;
  return 1 + COMPACTION_GAIN * left;
}

/** Tambahan laju pada tahun ke-nol akibat pemampatan. */
const COMPACTION_GAIN = COMPACTION_SHARE / (1 - COMPACTION_SHARE);

/**
 * Rata-rata pengali pemampatan sepanjang selang [`from`, `to`] tahun.
 *
 * Dihitung dengan integral, bukan dengan mengambil nilai di satu ujung selang.
 * `advance` dipanggil tiap bingkai dengan pecahan tahun yang besarnya
 * berubah-ubah mengikuti kecepatan waktu dan kelancaran peramban — kalau
 * pengalinya dibaca sekali di awal langkah, hasil 20 tahun berbeda 1% antara
 * langkah 0,02 dan 0,5 tahun. Pembaca tidak boleh mendapat angka yang berbeda
 * hanya karena perambannya lebih lancar.
 */
export function averageCompactionBoost(from: number, to: number): number {
  if (to <= from) return compactionBoost(from);
  const span = to - from;
  const Y = COMPACTION_YEARS;
  // Bagian selang yang masih di dalam masa pemampatan.
  const a = Math.min(from, Y);
  const b = Math.min(to, Y);
  let integral = span; // suku 1 untuk seluruh selang
  if (b > a) {
    // Integral dari COMPACTION_GAIN * (1 - y/Y) pada [a, b].
    integral += COMPACTION_GAIN * (b - a - (b * b - a * a) / (2 * Y));
  }
  return integral / span;
}

// ---------------------------------------------------------------------------
//  KEADAAN SIMULASI
// ---------------------------------------------------------------------------

export type DrainageStats = {
  /** Lama kanal sudah terbuka (tahun). */
  years: number;
  /** Kedalaman kanal sekarang (m). */
  canalDepthM: number;
  /** Kanal sudah disekat. */
  blocked: boolean;
  /** Penurunan permukaan terdalam di sepanjang penampang (m). */
  maxSubsidenceM: number;
  /** Penurunan permukaan rata-rata sepanjang penampang (m). */
  meanSubsidenceM: number;
  /** Jarak terjauh dari kanal yang muka airnya sudah melewati batas 40 cm (m). */
  riskReachM: number;
  /** Bagian penampang yang muka airnya melewati batas 40 cm (0-1). */
  riskShare: number;
  /** Karbon yang sudah terlepas sepanjang penampang (ton CO2 per hektar). */
  emittedTPerHa: number;
  /** Muka air tanah di tepi kanal (m di bawah permukaan). */
  waterAtCanalM: number;
  /** Muka air tanah di ujung terjauh penampang (m di bawah permukaan). */
  waterAtFarEndM: number;
  /** Waktu sudah mencapai batas yang dapat dipertanggungjawabkan modelnya. */
  atTimeLimit: boolean;
};

function emptyStats(): DrainageStats {
  return {
    years: 0,
    canalDepthM: 0,
    blocked: false,
    maxSubsidenceM: 0,
    meanSubsidenceM: 0,
    riskReachM: 0,
    riskShare: 0,
    emittedTPerHa: 0,
    waterAtCanalM: NATURAL_WATER_DEPTH_M,
    waterAtFarEndM: NATURAL_WATER_DEPTH_M,
    atTimeLimit: false,
  };
}

/** Batas muka air tanah menurut PP No. 57 Tahun 2016 (m di bawah permukaan). */
export const WATER_LIMIT_M = 0.4;

/**
 * Besar satu langkah simulasi (tahun).
 *
 * Cukup halus untuk membuat hasilnya tidak bergantung pada kelancaran
 * peramban, dan cukup kasar untuk tetap murah: 20 tahun berarti 400 langkah
 * kali 200 kolom, dan itu hanya terjadi saat pembaca memajukan waktu.
 */
export const STEP_YEARS = 0.05;

/**
 * Batas waktu yang dapat dimajukan pembaca (tahun).
 *
 * Ada dua alasan, dan yang kedua lebih penting.
 *
 * Pertama, tiga dasawarsa memang rentang sejarahnya: pembukaan kanal besar
 * di gambut Indonesia berlangsung sejak awal 1990-an, jadi satu generasi
 * adalah lama yang benar untuk pertanyaan "lalu bagaimana sekarang?".
 *
 * Kedua, dan ini yang menentukan: di luar rentang itu modelnya mulai
 * menyesatkan. Permukaan yang melesak mendekati muka airnya sendiri, sehingga
 * bagian penampang yang rawan terbakar justru menyusut — pada 50 tahun ia
 * mencapai nol. Dibaca apa adanya, pembaca akan menyimpulkan keadaannya
 * membaik dengan sendirinya. Yang sebenarnya terjadi kebalikannya: tanahnya
 * sudah turun sampai sejajar muka air sungai, lalu tergenang permanen dan
 * hilang sebagai lahan. Menggambarkan akhir itu dengan jujur butuh ketinggian
 * kubah gambut di atas muka air sungai, dan angka itu belum ada sumbernya
 * (lihat daftar tetapan di awal berkas). Sampai ada, waktunya dibatasi pada
 * rentang yang masih dapat dipertanggungjawabkan.
 */
export const SIM_MAX_YEARS = 30;

/**
 * Simulasi satu penampang lanskap gambut yang dipotong kanal.
 *
 * Keadaannya satu larik: penurunan permukaan tiap kolom. Larik itu hanya
 * pernah bertambah, tidak pernah berkurang — itulah inti modul ini. Menyekat
 * kanal menaikkan muka airnya kembali dan menghentikan penurunan, tetapi tanah
 * yang sudah hilang tidak kembali.
 *
 * Pemakaian: `advance(tahun)` dipanggil dari `useFrame`, `collect()` menghitung
 * ringkasan untuk antarmuka, dan `subsidenceAt(col)` dibaca oleh geometri.
 */
export class DrainageSim {
  /** Penurunan permukaan tiap kolom (m). Hanya pernah bertambah. */
  private readonly drop: Float32Array;
  private canalDepth = 0;
  private blocked = false;
  private years = 0;
  private emitted = 0;
  /** Sisa waktu yang belum genap satu langkah (tahun). */
  private carry = 0;

  stats: DrainageStats = emptyStats();

  constructor() {
    this.drop = new Float32Array(COLUMNS);
    this.collect();
  }

  /** Kembalikan seluruh penampang ke keadaan alami. */
  reset(): void {
    this.drop.fill(0);
    this.canalDepth = 0;
    this.blocked = false;
    this.years = 0;
    this.emitted = 0;
    this.carry = 0;
    this.collect();
  }

  /** Gali atau perdalam kanal. Menggali kembali juga membuka sekat. */
  setCanalDepth(depthM: number): void {
    this.canalDepth = Math.max(CANAL_DEPTH_MIN_M, Math.min(CANAL_DEPTH_MAX_M, depthM));
    if (this.canalDepth > 0) this.blocked = false;
  }

  /**
   * Pasang sekat kanal.
   *
   * Sekat menahan air di dalam kanal sehingga muka air di sekitarnya naik
   * kembali ke keadaan alami. Yang berhenti hanya penurunan berikutnya.
   */
  blockCanal(): void {
    if (this.canalDepth > 0) this.blocked = true;
  }

  /** Kedalaman kanal yang masih berpengaruh: nol bila sudah disekat. */
  effectiveCanalDepth(): number {
    return this.blocked ? 0 : this.canalDepth;
  }

  /** Muka air tanah pada kolom ke-`col` (m di bawah permukaan saat itu). */
  waterDepthAtColumn(col: number): number {
    return waterDepthAt(distanceOfColumn(col), this.effectiveCanalDepth(), this.drop[col]);
  }

  /** Penurunan permukaan pada kolom ke-`col` (m). */
  subsidenceAt(col: number): number {
    return this.drop[col];
  }

  /** Penurunan permukaan pada jarak `m` dari kanal, dengan antaran linear. */
  subsidenceAtDistance(m: number): number {
    const f = (m / TRANSECT_LENGTH_M) * COLUMNS - 0.5;
    const i = Math.max(0, Math.min(COLUMNS - 1, Math.floor(f)));
    const j = Math.min(COLUMNS - 1, i + 1);
    const t = Math.max(0, Math.min(1, f - i));
    return this.drop[i] + (this.drop[j] - this.drop[i]) * t;
  }

  /**
   * Majukan waktu `years` tahun, dalam langkah tetap sebesar STEP_YEARS.
   *
   * Langkahnya dipatok, bukan memakai pecahan tahun yang datang dari pemanggil.
   * Penurunan permukaan mengurangi kedalaman muka airnya sendiri, jadi lajunya
   * bergantung pada keadaan yang baru saja ia ubah — dan dengan langkah
   * sebesar apa pun yang kebetulan diberikan bingkai, hasil 20 tahun berselisih
   * 0,7% antara peramban yang lancar dan yang tersendat. Pembaca tidak boleh
   * mendapat angka yang berbeda karena perangkatnya berbeda.
   *
   * Sisa waktu yang belum genap satu langkah disimpan untuk pemanggilan
   * berikutnya, termasuk sisa akibat batas `maxSteps`, sehingga waktu tidak
   * pernah hilang — hanya dikerjakan pada pemanggilan berikutnya. Pola ini
   * sama dengan `SmolderSim.advance`.
   */
  advance(years: number, maxSteps = 400): void {
    if (years <= 0 || this.years >= SIM_MAX_YEARS) return;
    this.carry += Math.min(years, SIM_MAX_YEARS - this.years);
    let steps = Math.min(Math.floor(this.carry / STEP_YEARS), maxSteps);
    this.carry -= steps * STEP_YEARS;
    while (steps-- > 0) this.step();
  }

  /** Satu langkah tetap. */
  private step(): void {
    const dt = STEP_YEARS;
    const depth = this.effectiveCanalDepth();
    const boost = averageCompactionBoost(this.years, this.years + dt);
    for (let col = 0; col < COLUMNS; col++) {
      const water = waterDepthAt(distanceOfColumn(col), depth, this.drop[col]);
      const rate = subsidenceRatePerYear(water) * boost;
      this.drop[col] += rate * dt;
      this.emitted += (emissionPerYear(water) * dt) / COLUMNS;
    }
    this.years += dt;
  }

  /**
   * Salin keadaan tiap kolom ke penyangga tekstur data yang dibaca peneduh.
   * Satu piksel per kolom: R = penurunan permukaan, G = kedalaman muka air,
   * B = melewati batas 40 cm, A = belum dipakai. Keduanya dinyatakan sebagai
   * bagian dari kedalaman profil, supaya peneduh tidak perlu tahu meternya.
   */
  writeField(target: Uint8Array): void {
    const depth = this.effectiveCanalDepth();
    for (let col = 0; col < COLUMNS; col++) {
      const drop = this.drop[col];
      const water = waterDepthAt(distanceOfColumn(col), depth, drop);
      const o = col * 4;
      target[o] = Math.round(Math.min(1, drop / PROFILE_DEPTH_M) * 255);
      target[o + 1] = Math.round(Math.min(1, water / PROFILE_DEPTH_M) * 255);
      target[o + 2] = water > WATER_LIMIT_M ? 255 : 0;
      target[o + 3] = 255;
    }
  }

  /** Hitung ulang ringkasan untuk antarmuka. */
  collect(): void {
    const depth = this.effectiveCanalDepth();
    let max = 0;
    let sum = 0;
    let risk = 0;
    let reach = 0;
    for (let col = 0; col < COLUMNS; col++) {
      const d = this.drop[col];
      if (d > max) max = d;
      sum += d;
      const water = waterDepthAt(distanceOfColumn(col), depth, d);
      if (water > WATER_LIMIT_M) {
        risk++;
        reach = Math.max(reach, distanceOfColumn(col));
      }
    }
    this.stats = {
      years: this.years,
      canalDepthM: this.canalDepth,
      blocked: this.blocked,
      maxSubsidenceM: max,
      meanSubsidenceM: sum / COLUMNS,
      riskReachM: reach,
      riskShare: risk / COLUMNS,
      emittedTPerHa: this.emitted,
      waterAtCanalM: waterDepthAt(0, depth, this.drop[0]),
      waterAtFarEndM: waterDepthAt(TRANSECT_LENGTH_M, depth, this.drop[COLUMNS - 1]),
      atTimeLimit: this.years >= SIM_MAX_YEARS - STEP_YEARS,
    };
  }
}

// ---------------------------------------------------------------------------
//  FORMAT ANGKA
// ---------------------------------------------------------------------------

/** Lama waktu, mis. 0,5 → "6 bulan"; 24 → "24 tahun". */
export function formatYears(years: number): string {
  if (years < 1) {
    const months = Math.max(1, Math.round(years * 12));
    return `${months} bulan`;
  }
  return `${Math.round(years)} tahun`;
}

/** Jarak, mis. 480 → "480 m". */
export function formatDistance(m: number): string {
  return `${Math.round(m)} m`;
}

/** Penurunan permukaan, mis. 0,62 → "62 cm". */
export function formatDrop(m: number): string {
  return `${Math.round(m * 100)} cm`;
}
