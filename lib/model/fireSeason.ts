/**
 * ============================================================================
 *  MODEL MUSIM API — muka air gambut sepanjang tahun di pinggir Pontianak
 * ============================================================================
 *  Logika murni Modul Musim Api, tanpa React/Three.js, sehingga dapat diuji
 *  dan dikutip di naskah. Seluruh sumber dirinci di
 *  docs/md/acuan-modul-musim-api.md (§2 dan §6).
 *
 *  Gagasannya satu neraca air harian yang sangat sederhana:
 *    - pada dasarian kering (hujan < 5 mm/hari), hujan dianggap tidak
 *      mengimbangi penguapan, dan muka air turun dengan laju terukur di
 *      lahan gambut berparit;
 *    - pada dasarian basah, kelebihan hujan di atas penguapan mengisi pori
 *      gambut dan muka air naik kembali sampai permukaan.
 *  Api kemudian dibaca dari kedalaman muka air memakai ambang yang diukur di
 *  Kubu Raya.
 * ============================================================================
 */

/** Jumlah dasarian (sepuluh harian) dalam setahun: 3 per bulan. */
export const DASARIAN_PER_YEAR = 36;

/** Jumlah hari tiap bulan (tahun bukan kabisat). */
export const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

export const DAYS_PER_YEAR = 365;

/** Nama bulan singkat untuk sumbu kalender. */
export const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"] as const;

/**
 * Hujan rata-rata tiap dasarian di Pontianak (mm/hari), seri skematis.
 *
 * Tabel normal hujan bulanan resmi Supadio tidak tersedia terbuka (acuan
 * §2), jadi seri ini disusun dari patokan yang bersumber, dan cara
 * menyusunnya ditulis di acuan §6.1 agar dapat dihitung ulang:
 *   - rata-rata tahunan 7,85 mm/hari (Yulianti & Hayasaka, 2013, §3.1.2);
 *   - masa kering < 5 mm/hari awal Februari–akhir Maret, dengan pertengahan
 *     Februari 7 dan pertengahan Maret 6 mm/hari (idem);
 *   - kering tajam ±2 mm/hari di awal Agustus, masa kering ±⅔ bulan (idem);
 *   - dua puncak, Oktober–November lebih tinggi daripada Maret–Mei
 *     (Aldrian & Susanto, 2003, Gbr. 3);
 *   - September normal 304 mm/bulan = 10,1 mm/hari (BMKG Kalbar, 2026).
 */
export const RAIN_NORMAL_MM_DAY: readonly number[] = [
  9, 8, 6, // Jan
  4, 7, 4, // Feb
  4.5, 6, 4.5, // Mar
  8, 9, 9.5, // Apr
  9.5, 9, 8.5, // Mei
  7.5, 7, 6.5, // Jun
  6, 6, 5.5, // Jul
  2, 4, 6, // Agu
  9, 10.5, 10.9, // Sep
  10.5, 11, 11.5, // Okt
  12, 12, 11, // Nov
  10.5, 10, 9.5, // Des
];

/** Batas dasarian kering: hujan di bawah ini (Yulianti & Hayasaka, 2013). */
export const DRY_MM_DAY = 5;

/**
 * Laju turun muka air pada musim kemarau di lahan gambut berparit
 * (cm/hari): 12,7 mm/hari, diukur di Sebangau, Kalimantan Tengah
 * (Putra dkk., 2021, §3.2). Hutan utuh 9,3 mm/hari; yang dipakai lahan
 * berparit karena gambut di pinggir Pontianak umumnya sudah dikeringkan.
 */
export const DRAWDOWN_CM_PER_DAY = 1.27;

/**
 * Penguapan (evapotranspirasi) harian (mm/hari): 1.553 mm/tahun di hutan
 * gambut yang dikeringkan, Kalimantan Tengah (Hirano dkk., 2015), dibagi 365.
 */
export const ET_MM_DAY = 1553 / 365;

/**
 * Hasil jenis (*specific yield*): air yang dilepas per satuan turunnya muka
 * air. Tidak diukur langsung oleh sumber mana pun di acuan; diturunkan dari
 * dua angka di atas, karena Putra dkk. menyatakan laju 12,7 mm/hari itu
 * "semata karena penguapan": Sy = ET / laju turun ≈ 0,335.
 */
export const SPECIFIC_YIELD = ET_MM_DAY / (DRAWDOWN_CM_PER_DAY * 10);

/** Ambang bahaya api tinggi: muka air di bawah 40 cm (Taufik dkk., 2022). */
export const HIGH_DANGER_CM = 40;

/** Ambang lahan terbakar: hanya terjadi saat muka air di bawah 60 cm (idem). */
export const BURN_CM = 60;

/**
 * Batas kedalaman yang dimodelkan (cm). Di bawah ±1 m laju turun melambat
 * karena penguapan berkurang (Ohkubo dkk., 2021), sedangkan model ini
 * memakai laju tetap; jadi kedalaman dihentikan di sini daripada terus
 * turun lurus. Sama dengan batas pengatur di Modul Anatomi.
 */
export const MAX_DEPTH_CM = 100;

/**
 * Pengali hujan pada tahun El Niño, Agustus–Oktober: 117 dari normal 304 mm
 * pada September 2026 di Stasiun Klimatologi Kalbar (BMKG Kalbar, 2026).
 * Diterapkan pada tiga bulan karena pengaruh El Niño pada hujan Indonesia
 * berlangsung Juni–November dan paling kuat September–November (Aldrian &
 * Susanto, 2003). Hanya satu bulan pengamatan: angkanya ilustratif.
 */
export const EL_NINO_RAIN_FACTOR = 117 / 304;

/** Dasarian pertama dan terakhir yang hujannya ditekan El Niño (Agu-1 s.d. Okt-3). */
export const EL_NINO_FROM_DASARIAN = 21;
export const EL_NINO_TO_DASARIAN = 29;

export type YearKind = "normal" | "elnino";

export type FireStage = "aman" | "bahaya" | "terbakar";

/** Hujan rata-rata (mm/hari) pada dasarian tertentu. */
export function rainfall(kind: YearKind, dasarian: number): number {
  const base = RAIN_NORMAL_MM_DAY[dasarian];
  const hit = kind === "elnino" && dasarian >= EL_NINO_FROM_DASARIAN && dasarian <= EL_NINO_TO_DASARIAN;
  return hit ? base * EL_NINO_RAIN_FACTOR : base;
}

/** Dasarian (0–35) untuk hari ke-`day` dalam setahun (0–364). */
export function dasarianOfDay(day: number): number {
  let d = Math.min(DAYS_PER_YEAR - 1, Math.max(0, Math.floor(day)));
  for (let m = 0; m < 12; m++) {
    if (d < MONTH_DAYS[m]) return m * 3 + (d < 10 ? 0 : d < 20 ? 1 : 2);
    d -= MONTH_DAYS[m];
  }
  return DASARIAN_PER_YEAR - 1;
}

/** Hari pertama (0–364) tiap bulan. */
export const MONTH_START_DAY: readonly number[] = MONTH_DAYS.map((_, m) => MONTH_DAYS.slice(0, m).reduce((a, b) => a + b, 0));

/** Bulan (0–11) dan tanggal (1–31) untuk hari ke-`day`. */
export function dateOfDay(day: number): { month: number; date: number } {
  let d = Math.min(DAYS_PER_YEAR - 1, Math.max(0, Math.floor(day)));
  for (let m = 0; m < 12; m++) {
    if (d < MONTH_DAYS[m]) return { month: m, date: d + 1 };
    d -= MONTH_DAYS[m];
  }
  return { month: 11, date: 31 };
}

/**
 * Perubahan kedalaman muka air dalam satu hari (cm, positif = makin dalam).
 *
 * Dasarian kering: turun dengan laju terukur. Dasarian basah: naik sebesar
 * kelebihan hujan di atas penguapan dibagi hasil jenis.
 */
export function dailyDepthChange(rainMmDay: number): number {
  if (rainMmDay < DRY_MM_DAY) return DRAWDOWN_CM_PER_DAY;
  return -((rainMmDay - ET_MM_DAY) / SPECIFIC_YIELD) / 10;
}

/**
 * Kedalaman muka air (cm di bawah permukaan) tiap hari dalam setahun.
 *
 * Dijalankan dua tahun berturut-turut dan yang dikembalikan tahun kedua,
 * supaya keadaan awal 1 Januari tidak ditebak: ia mengikuti akhir tahun
 * sebelumnya, yang selalu tahun biasa.
 */
export function simulateYear(kind: YearKind): Float32Array {
  const out = new Float32Array(DAYS_PER_YEAR);
  let depth = 0;
  for (let pass = 0; pass < 2; pass++) {
    const k: YearKind = pass === 0 ? "normal" : kind;
    for (let day = 0; day < DAYS_PER_YEAR; day++) {
      depth = clampDepth(depth + dailyDepthChange(rainfall(k, dasarianOfDay(day))));
      if (pass === 1) out[day] = depth;
    }
  }
  return out;
}

function clampDepth(cm: number): number {
  return Math.min(MAX_DEPTH_CM, Math.max(0, cm));
}

/**
 * Kedalaman muka air setelah `days` hari tanpa hujan, mulai dari `startCm`.
 * Dipakai babak "Ambang": kemarau Agustus yang diperpanjang.
 */
export function depthAfterDryDays(startCm: number, days: number): number {
  return clampDepth(startCm + DRAWDOWN_CM_PER_DAY * Math.max(0, days));
}

/** Jumlah hari tanpa hujan sampai muka air mencapai `targetCm` dari `startCm`. */
export function dryDaysToReach(startCm: number, targetCm: number): number {
  return Math.max(0, Math.ceil((targetCm - startCm) / DRAWDOWN_CM_PER_DAY));
}

/** Golongan bahaya menurut kedalaman muka air (Taufik dkk., 2022). */
export function fireStage(depthCm: number): FireStage {
  if (depthCm >= BURN_CM) return "terbakar";
  if (depthCm >= HIGH_DANGER_CM) return "bahaya";
  return "aman";
}

/**
 * Tingkat api relatif 0–1 untuk digambar.
 *
 * Ambangnya bersumber (40 dan 60 cm), bentuk kurvanya ilustratif:
 *   - di atas 40 cm: nol;
 *   - 40–60 cm: naik pelan sampai 0,1 (bahaya tinggi, api jarang);
 *   - di bawah 60 cm: melonjak menuju 1.
 * Perbandingan 0,1 : 1 sengaja setara "hampir 10×" area terbakar
 * maksimum pada tahun kekeringan air tanah (Taufik dkk., 2017); sifat
 * melonjaknya mengikuti hubungan nonlinier hujan–api (Field dkk., 2016).
 */
export function fireLevel(depthCm: number): number {
  if (depthCm < HIGH_DANGER_CM) return 0;
  if (depthCm < BURN_CM) return (0.1 * (depthCm - HIGH_DANGER_CM)) / (BURN_CM - HIGH_DANGER_CM);
  return 0.1 + 0.9 * (1 - Math.exp(-(depthCm - BURN_CM) / 15));
}

/** Kedalaman terdalam dalam satu seri harian, beserta harinya. */
export function deepest(series: Float32Array, fromDay = 0, toDay = DAYS_PER_YEAR - 1): { depth: number; day: number } {
  let depth = -1;
  let day = fromDay;
  for (let d = fromDay; d <= toDay; d++) {
    if (series[d] > depth) {
      depth = series[d];
      day = d;
    }
  }
  return { depth, day };
}

/** Jumlah hari muka air berada di bawah ambang `cm`. */
export function daysBelow(series: Float32Array, cm: number): number {
  let n = 0;
  for (let d = 0; d < series.length; d++) if (series[d] >= cm) n++;
  return n;
}

/** Hari terakhir muka air di bawah ambang `cm`, atau -1 bila tidak pernah. */
export function lastDayBelow(series: Float32Array, cm: number): number {
  for (let d = series.length - 1; d >= 0; d--) if (series[d] >= cm) return d;
  return -1;
}
