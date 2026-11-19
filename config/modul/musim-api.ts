/**
 * ============================================================================
 *  TEKS MODUL 05 — MUSIM API — GANTI DI SINI
 * ============================================================================
 *  Setiap angka berasal dari docs/md/acuan-modul-musim-api.md:
 *    Aldrian & Susanto (2003)  — Kalimantan barat laut: dua puncak hujan,
 *                                pengaruh El Niño Juni–November
 *    Yulianti & Hayasaka (2013) — kalender hujan dan api Pontianak
 *    Putra dkk. (2021)         — laju turun muka air saat kemarau
 *    Taufik dkk. (2022)        — ambang 40 cm dan 60 cm, Kubu Raya
 *    Taufik dkk. (2017)        — area terbakar ±10× pada tahun kekeringan
 *    BMKG Kalbar (2026)        — El Niño sangat kuat, September 117/304 mm
 *  Angka yang dihitung model (kedalaman, jumlah hari) dibaca langsung dari
 *  lib/model/fireSeason.ts supaya teks dan gambar tidak pernah berselisih.
 * ============================================================================
 */

import type { ShellAct, ShellHook } from "@/components/modul/shared/ActModuleShell";
import {
  BURN_CM,
  HIGH_DANGER_CM,
  MONTH_START_DAY,
  dryDaysToReach,
  simulateYear,
  type FireStage,
} from "@/lib/model/fireSeason";

/**
 * Hari terakhir kemarau Agustus di tahun biasa (20 Agustus): babak 02
 * memperpanjang kemarau mulai dari sini.
 */
export const AUGUST_DRY_END_DAY = MONTH_START_DAY[7] + 19;

/** Kedalaman muka air tahun biasa pada akhir kemarau Agustus (cm). */
export const AUGUST_START_CM = Math.round(simulateYear("normal")[AUGUST_DRY_END_DAY]);

/** Hari tambahan tanpa hujan sampai tiap ambang, dihitung dari model. */
const DAYS_TO_DANGER = dryDaysToReach(AUGUST_START_CM, HIGH_DANGER_CM);
const DAYS_TO_BURN = dryDaysToReach(AUGUST_START_CM, BURN_CM);

/** Batas atas penggeser "Hari tanpa hujan". */
export const MAX_DRY_DAYS = 60;

export const MUSIM_HOOK: ShellHook = {
  setup: "Setiap tahun, asap di Pontianak datang di bulan yang hampir sama.",
  question: "Kebetulan?",
  cta: "Cari tahu",
  scrollHint: "atau gulir ke bawah",
};

export const MUSIM_ACTS: readonly ShellAct[] = [
  {
    number: "01",
    title: "Kalender Pontianak",
    body: "Pontianak berada tepat di garis khatulistiwa, jadi kemaraunya tidak panjang seperti di selatan Kalimantan. Dalam setahun ada dua masa kering yang pendek, dan di antaranya hujan turun hampir setiap hari.",
    task: "Geser Kalender dari Januari sampai Desember. Perhatikan garis biru muka air di dinding gambut naik dan turun.",
    observe: `Air di gambut turun dua kali: Februari–Maret dan Agustus. Begitu hujan datang lagi, pori gambut terisi dan air naik kembali ke permukaan. Di tahun biasa air tidak pernah turun sampai garis ${HIGH_DANGER_CM} cm, jadi gambutnya tetap cukup basah untuk tidak terbakar.`,
    term: { word: "Muka air tanah", meaning: "batas air di dalam gambut. Gambut di bawahnya basah, gambut di atasnya mengering." },
    hint: "Geser kalender sampai Desember dulu.",
    fact: {
      value: "2 kali",
      caption: "masa kering Pontianak dalam setahun: Februari–Maret dan Agustus",
    },
  },
  {
    number: "02",
    title: "Ambang",
    body: "Saat hujan berhenti, gambut terus kehilangan air: diisap akar tumbuhan dan menguap ke udara. Di lahan yang sudah berparit, muka airnya turun kira-kira 1,3 cm setiap hari.",
    task: "Geser Hari tanpa hujan, seolah kemarau Agustus tidak segera berhenti. Teruskan sampai lahannya terbakar.",
    observe: `${DAYS_TO_DANGER} hari lagi tanpa hujan, air lewat ${HIGH_DANGER_CM} cm: gambut di atasnya sudah cukup kering untuk tersulut. ${DAYS_TO_BURN} hari, air lewat ${BURN_CM} cm: lahan terbakar, dan apinya tidak bertambah sedikit demi sedikit, melainkan melonjak.`,
    term: { word: "Ambang", meaning: "batas yang, sekali dilewati, mengubah keadaan sekaligus." },
    hint: `Geser Hari tanpa hujan sampai muka air lewat ${BURN_CM} cm.`,
    fact: {
      value: `${HIGH_DANGER_CM} · ${BURN_CM} cm`,
      caption: `air di bawah ${HIGH_DANGER_CM} cm berarti bahaya tinggi; di bawah ${BURN_CM} cm lahan gambut terbakar. Diukur di Kubu Raya, tetangga Pontianak`,
    },
  },
  {
    number: "03",
    title: "Tahun El Niño",
    body: "El Niño tidak menyalakan api. Ia membuat hujan Agustus–Oktober jauh berkurang, sehingga kemarau Agustus tersambung sampai Oktober. Tahun 2026 adalah tahun El Niño: hujan September di Kalbar tinggal sekitar sepertiga dari biasanya.",
    task: "Pilih Tahun El Niño, lalu geser Kalender sampai Desember. Lihat sampai kapan apinya bertahan.",
    observe: `Hampir tiga bulan tanpa cukup hujan, air turun jauh di bawah ${BURN_CM} cm dan tinggal di sana dua bulan. Api baru reda setelah hujan November mengisi gambut lagi. Itulah sebabnya asap besar biasanya datang Agustus–Oktober.`,
    term: { word: "El Niño", meaning: "menghangatnya laut Pasifik yang membuat hujan di Indonesia berkurang." },
    hint: "Pilih Tahun El Niño dan geser kalender sampai Desember.",
    fact: {
      value: "± 10×",
      caption: "luas lahan terbakar di pulau Kalimantan pada tahun kekeringan dibanding tahun biasa",
    },
  },
];

/** Label golongan bahaya (Taufik dkk., 2022). */
export const STAGE_LABEL: Record<FireStage, string> = {
  aman: "Aman",
  bahaya: "Bahaya tinggi",
  terbakar: "Lahan terbakar",
};

/** Warna golongan bahaya, sama dengan garis ambang di diorama. */
export const STAGE_COLOR: Record<FireStage, string> = {
  aman: "#8fd8ff",
  bahaya: "#f0a35e",
  terbakar: "#ff6a3d",
};

export const MUSIM_TEXT = {
  calendar: "Kalender",
  dryDays: "Hari tanpa hujan",
  dryDaysValue: (d: number) => (d === 0 ? "kemarau berhenti 20 Agustus" : `+${d} hari sesudah 20 Agustus`),
  normalYear: "Tahun biasa",
  elninoYear: "Tahun El Niño",
  depth: "Muka air tanah",
  depthValue: (cm: number) => `${Math.round(cm)} cm`,
  rain: "Hujan",
  rainValue: (mm: number) => `${mm.toFixed(1).replace(".", ",")} mm/hari`,
  noRain: "tidak ada",
  date: (date: number, month: string) => `${date} ${month}`,
  danger: `${HIGH_DANGER_CM} cm · bahaya tinggi`,
  burn: `${BURN_CM} cm · terbakar`,
  waterLabel: (cm: number) => `muka air ${Math.round(cm)} cm`,
  legendRain: "hujan",
  legendDry: "masa kering",
  legendDepth: "muka air",
  dragHint: "Seret untuk memutar gambut",
  scaleNote: "Muka air dihitung dari hujan dan penguapan setiap hari.",
  elninoNote: "Januari–Juli sama dengan tahun biasa. El Niño mengurangi hujan Agustus–Oktober.",
};

/**
 * Satu kalimat yang menjelaskan apa yang sedang terjadi di dalam gambut hari
 * itu. Ditulis menurut keadaan, bukan menurut babak, supaya setiap geseran
 * pembaca langsung diberi alasannya.
 */
export function explainDay(opts: { depthCm: number; rainMmDay: number; dryRun: boolean; dryDays: number }): string {
  const { depthCm, rainMmDay, dryRun, dryDays } = opts;
  if (depthCm >= BURN_CM) return `Air lewat ${BURN_CM} cm. Gambut kering setebal lebih dari setengah meter: api menjalar dan masuk ke dalam tanah.`;
  if (depthCm >= HIGH_DANGER_CM) return `Air lewat ${HIGH_DANGER_CM} cm. Gambut di atasnya sudah kering dan mudah tersulut, walau belum banyak yang terbakar.`;
  if (dryRun) {
    return dryDays === 0
      ? "Di tahun biasa, hujan kembali sesudah 20 Agustus. Geser untuk melihat bila hujan tidak datang."
      : "Belum ada hujan. Tiap hari akar dan penguapan mengambil air, dan muka air turun ±1,3 cm.";
  }
  if (rainMmDay < 5) return "Masa kering: hujan terlalu sedikit untuk mengganti air yang menguap, jadi muka air turun ±1,3 cm sehari.";
  if (depthCm > 0.5) return "Hujan lebih banyak daripada yang menguap. Pori gambut terisi lagi dan muka air naik.";
  return "Hujan cukup. Gambut penuh air sampai ke permukaan, seperti spons yang basah.";
}
