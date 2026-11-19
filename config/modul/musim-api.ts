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
    body: "Pontianak berada tepat di garis khatulistiwa. Hujannya tidak punya satu kemarau panjang, melainkan dua masa kering yang pendek.",
    task: "Geser Kalender dari Januari sampai Desember, lalu perhatikan kapan muka air turun.",
    observe: `Air di gambut turun dua kali: Februari–Maret dan Agustus. Di tahun biasa keduanya berhenti sebelum garis ${HIGH_DANGER_CM} cm, dan hujan mengembalikannya ke permukaan.`,
    term: { word: "Muka air tanah", meaning: "batas air di dalam gambut. Gambut di atasnya mengering." },
    hint: "Geser kalender sampai Desember dulu.",
    fact: {
      value: "2 kali",
      caption: "Masa kering Pontianak dalam setahun, Februari–Maret dan Agustus (Aldrian & Susanto, 2003; Yulianti & Hayasaka, 2013)",
    },
  },
  {
    number: "02",
    title: "Ambang",
    body: "Tanpa hujan, muka air di gambut berparit turun ±1,3 cm setiap hari. Bagaimana kalau kemarau Agustus tidak segera berhenti?",
    task: "Geser Hari tanpa hujan sampai lahannya terbakar.",
    observe: `${DAYS_TO_DANGER} hari lagi tanpa hujan, air lewat ${HIGH_DANGER_CM} cm dan api mulai mungkin. ${DAYS_TO_BURN} hari, air lewat ${BURN_CM} cm: lahan terbakar, dan apinya tidak bertambah pelan, melainkan melonjak.`,
    term: { word: "Ambang", meaning: "batas yang bila dilewati mengubah keadaan sekaligus, bukan sedikit demi sedikit." },
    hint: `Geser Hari tanpa hujan sampai muka air lewat ${BURN_CM} cm.`,
    fact: {
      value: `${HIGH_DANGER_CM} · ${BURN_CM} cm`,
      caption: `Di Kubu Raya, bahaya api tinggi muncul saat muka air di bawah ${HIGH_DANGER_CM} cm, dan lahan hanya terbakar saat di bawah ${BURN_CM} cm (Taufik dkk., 2022)`,
    },
  },
  {
    number: "03",
    title: "Tahun El Niño",
    body: "El Niño tidak menyalakan api. Ia menahan hujan Agustus–Oktober. September 2026, hujan di Kalbar hanya 117 mm, padahal normalnya 304 mm.",
    task: "Pilih Tahun El Niño, lalu geser Kalender sampai Desember dan lihat kapan apinya berhenti.",
    observe: "Kemarau Agustus tersambung sampai Oktober. Air tinggal di bawah 60 cm selama dua bulan, dan api baru reda setelah hujan November kembali.",
    term: { word: "El Niño", meaning: "menghangatnya laut Pasifik tengah yang membuat hujan di Indonesia berkurang." },
    hint: "Pilih Tahun El Niño dan geser kalender sampai Desember.",
    fact: {
      value: "± 10×",
      caption: "Area terbakar terluas di Borneo pada tahun kekeringan air tanah dibanding tahun biasa; tahun-tahun itu sering bersamaan dengan El Niño kuat (Taufik dkk., 2017)",
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
  legendRain: "hujan per 10 hari",
  legendDry: "kering",
  legendDepth: "muka air",
  danger: `${HIGH_DANGER_CM} cm · bahaya tinggi`,
  burn: `${BURN_CM} cm · terbakar`,
  waterLabel: (cm: number) => `muka air ${Math.round(cm)} cm`,
  scaleNote: "Muka air dihitung dari neraca air sederhana: hujan, penguapan, dan laju turun yang diukur di lapangan.",
  elninoNote: "El Niño menekan hujan Agustus–Oktober; Januari–Juli sama dengan tahun biasa.",
  source: "Model: Putra dkk., 2021; Hirano dkk., 2015 · Ambang: Taufik dkk., 2022",
};
