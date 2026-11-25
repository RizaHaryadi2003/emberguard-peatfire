/**
 * ============================================================================
 *  TEKS MODUL 10 — SUKSESI GAGAL — GANTI DI SINI
 * ============================================================================
 *  Setiap angka berasal dari docs/md/acuan-modul/acuan-modul-suksesi-gagal.md:
 *    Yeager dkk. (2003)   — pohon per transek menurut jumlah kebakaran,
 *                           semai dan pancang, bank biji (babak 01–03)
 *    Hoscilo dkk. (2010)  — lahan yang terbakar berulang, pakis mudah terbakar
 *    Page dkk. (2008)     — pakis, rumput, dan teki; hampir mustahil kembali
 *    Faradiba dkk. (2022) — Rasau Jaya, Kubu Raya (pembuka)
 *  Angka hitungan dibaca langsung dari lib/model/succession.ts.
 * ============================================================================
 */

import type { ShellAct, ShellHook } from "@/components/modul/shared/ActModuleShell";
import { guideLevel as sharedGuideLevel, type GuideStep as SharedGuideStep } from "@/lib/guide";
import {
  RASAU_JAYA,
  REBURNED_SHARE,
  SAPLINGS_PER_M2,
  SEEDLINGS_PER_M2,
  SPECIES_UNBURNED,
  TRANSECT,
  treesInTransect,
  type Fires,
} from "@/lib/model/succession";

/** Angka desimal gaya Indonesia. */
const num = (v: number) => v.toLocaleString("id-ID");
/** Persen dibulatkan. */
const pct = (v: number) => `${Math.round(v * 100)} %`;

export const SUKSESI_HOOK: ShellHook = {
  setup: `Rasau Jaya, Kubu Raya. Hutan yang tak pernah terbakar: ${RASAU_JAYA.unburned} jenis tumbuhan. Yang pernah terbakar: ${RASAU_JAYA.burned}.`,
  question: "Ke mana hutannya pergi?",
  cta: "Mulai survei",
  scrollHint: "atau gulir ke bawah",
};

export const SUKSESI_ACTS: readonly ShellAct[] = [
  {
    number: "01",
    title: "Jalur Ukur",
    body: `Peneliti tidak menghitung seluruh hutan. Mereka membuat satu jalur lurus sepanjang ${TRANSECT.lengthM} meter dan selebar ${TRANSECT.widthM} meter, lalu mencatat setiap pohon hidup yang batangnya lebih tebal dari 10 sentimeter. Jalur yang sama bisa dipakai untuk membandingkan hutan yang utuh dengan yang terbakar.`,
    task: "Berjalan sampai ujung jalur di hutan rawa gambut yang belum pernah terbakar, dan hitung pohonnya.",
    observe: `Satu jalur di hutan utuh berisi sekitar ${treesInTransect(0)} pohon besar dari ${SPECIES_UNBURNED} jenis. Di bawahnya tumbuh sekitar ${num(SEEDLINGS_PER_M2.unburned)} anakan pohon di setiap meter persegi: calon hutan berikutnya.`,
    term: { word: "Transek", meaning: "jalur ukur lurus berukuran tetap tempat peneliti mencatat semua pohon, supaya hutan yang berbeda bisa dibandingkan dengan adil." },
    hint: "Seret gambar ke kiri, atau geser Jalan, untuk maju di sepanjang jalur.",
    fact: { value: `± ${treesInTransect(0)}`, caption: `pohon besar dalam satu jalur ukur hutan rawa gambut utuh` },
  },
  {
    number: "02",
    title: "Sekali, Dua Kali",
    body: "Di hutan biasa, biji di dalam tanah bisa tumbuh menggantikan pohon yang mati terbakar. Di gambut, api merambat di dalam tanah dan bisa memusnahkan biji itu. Yang menentukan adalah berapa kali api datang sebelum hutan sempat pulih.",
    task: "Pilih berapa kali lahan ini terbakar, lalu berjalan lagi di jalur yang sama.",
    observe: `Sekali terbakar, masih ada sekitar ${treesInTransect(1)} pohon, lebih dari sepertiga: hutan ini masih bisa pulih bila tidak terbakar lagi. Dua kali, tinggal sekitar ${treesInTransect(2)}. Lebih dari itu, hampir tidak ada pohon; yang tumbuh pakis dan rumput.`,
    term: { word: "Suksesi", meaning: "pergantian tumbuhan di lahan terbuka, dari rumput dan semak sampai kembali menjadi hutan. Disebut gagal bila lahan berhenti di pakis dan semak." },
    hint: "Coba keempat pilihan: tidak terbakar sampai lebih dari dua kali.",
    fact: { value: `${treesInTransect(0)} → ${treesInTransect(2)}`, caption: "pohon dalam satu jalur sesudah dua kali terbakar" },
  },
  {
    number: "03",
    title: "Lingkaran Api",
    body: "Hutan yang baru sekali terbakar masih punya harapan. Tetapi untuk tumbuh kembali, ia butuh anakan pohon dan waktu tanpa api, dan keduanya semakin sulit didapat.",
    task: "Biarkan lahan bekas terbakar tumbuh, lalu lihat apa yang terjadi saat kemarau datang lagi.",
    observe: `Anakan pohon turun dari ${num(SEEDLINGS_PER_M2.unburned)} menjadi ${num(SEEDLINGS_PER_M2.burned)} per meter persegi, dan pohon muda dari ${num(SAPLINGS_PER_M2.unburned)} menjadi ${num(SAPLINGS_PER_M2.burned)}, karena bijinya ikut terbakar di dalam gambut. Yang cepat tumbuh justru pakis. Saat kemarau, pakis kering mudah menyala, jadi api datang lagi sebelum pohon sempat besar. Di bekas proyek sawah sejuta hektare di Kalimantan Tengah, ${pct(REBURNED_SHARE.twice)} lahan terbakar dua kali dalam delapan tahun.`,
    term: { word: "Bank biji", meaning: "biji-biji yang tersimpan di tanah dan menunggu saat yang tepat untuk tumbuh. Di gambut, api bisa memusnahkannya." },
    hint: "Majukan waktu sampai kemarau datang.",
    fact: { value: pct(REBURNED_SHARE.twice), caption: "lahan bekas proyek sawah sejuta hektare yang terbakar dua kali, 1997–2005" },
  },
];

/* ============================================================================
 *  LABEL
 * ========================================================================== */

export const FIRES_LABEL: Record<Fires, string> = {
  0: "Tidak terbakar",
  1: "Sekali",
  2: "Dua kali",
  3: "Lebih dari dua kali",
};

/** Penjelasan tiap pilihan jumlah kebakaran di babak 02. */
export function explainFires(f: Fires): string {
  switch (f) {
    case 0:
      return "Hutan rapat dengan puluhan jenis pohon. Di lantainya, anakan pohon menunggu giliran.";
    case 1:
      return "Banyak pohon mati, tetapi lebih dari sepertiga bertahan. Bila tidak terbakar lagi, hutan ini masih bisa pulih.";
    case 2:
      return "Hanya sekitar satu dari dua puluh pohon yang tersisa. Biji di dalam gambut sudah ikut terbakar.";
    case 3:
      return "Hampir semua kayu menjadi arang. Yang tumbuh pakis dan rumput, dan keduanya mudah terbakar lagi.";
  }
}

export const SUKSESI_TEXT = {
  walked: (m: number) => `${Math.round(m)} dari ${TRANSECT.lengthM} m`,
  counted: (n: number) => `${n} pohon tercatat`,
  fires: "Terbakar",
  trees: "Pohon hidup",
  perTransect: "dalam satu jalur ukur",
  years: (y: number) => `${y} tahun sesudah api`,
  drySeason: "Kemarau",
  seedlings: "Anakan pohon per m²",
  saplings: "Pohon muda per m²",
  ferns: "Pakis",
  unburned: "Tidak terbakar",
  burned: "Terbakar",
  why: "Mengapa begitu",
  walk: "Jalan",
  wait: "Waktu sesudah api",
  dry: "Kemarau datang",
  burningNow: "Api menjalar…",
  fireCount: (n: number) => (n === 0 ? "Belum pernah terbakar" : n >= 3 ? "Terbakar lebih dari dua kali" : `Terbakar ${n === 1 ? "sekali" : "dua kali"}`),
  species: (n: number) => `${n} jenis pohon`,
  treesNow: "Pohon hidup di jalur ini",
  compare: "Hutan utuh dan bekas terbakar",
  maxFires: "Lahan ini sudah terbakar lebih dari dua kali. Hampir tidak ada pohon yang tersisa untuk dibakar.",
} as const;

/* ============================================================================
 *  TUNTUNAN LANGKAH DEMI LANGKAH
 * ========================================================================== */

export type GuideTarget = "walk" | "figure" | "count" | "fires" | "chart" | "why" | "wait" | "dry" | "seedlings" | "next";

export type GuideState = {
  /** Jarak terjauh yang sudah ditempuh di babak 01 (m). */
  maxWalked: number;
  /** Banyaknya pilihan jumlah kebakaran yang sudah dicoba (babak 02). */
  firesTried: number;
  /** Tahun terlama yang sudah ditunggu (babak 03). */
  maxYears: number;
  /** Kemarau yang sudah datang di babak 03. */
  droughts: number;
};

export type GuideStep = SharedGuideStep<GuideState> & { target: GuideTarget };

export const SUKSESI_GUIDE: readonly (readonly GuideStep[])[] = [
  [
    { target: "walk", text: "Kamu berdiri di awal jalur ukur. Seret gambar atau geser Jalan untuk maju.", done: (s) => s.maxWalked >= 40 },
    { target: "figure", text: "Tiap pohon yang kamu lewati diberi pita jingga: itu tandanya sudah tercatat." },
    { target: "walk", text: "Teruskan sampai ujung jalur, 400 meter.", done: (s) => s.maxWalked >= TRANSECT.lengthM },
    { target: "count", text: `Sekitar ${treesInTransect(0)} pohon besar dalam satu jalur. Ingat angka ini.` },
    { target: "next", text: "Sekarang bandingkan dengan lahan yang pernah terbakar." },
  ],
  [
    { target: "fires", text: "Pilih Sekali: lahan ini terbakar satu kali.", done: (s) => s.firesTried >= 2 },
    { target: "chart", text: "Lebih dari sepertiga pohon masih hidup. Sekarang coba Dua kali.", done: (s) => s.firesTried >= 3 },
    { target: "fires", text: "Satu pilihan lagi: lebih dari dua kali.", done: (s) => s.firesTried >= 4 },
    { target: "why", text: "Yang tumbuh di lahan ini sekarang pakis dan rumput, bukan pohon." },
    { target: "next", text: "Mengapa api datang lagi? Lanjut ke babak berikutnya." },
  ],
  [
    { target: "wait", text: "Lahan ini baru sekali terbakar. Majukan waktu dan lihat apa yang tumbuh.", done: (s) => s.maxYears >= 3 },
    { target: "seedlings", text: "Anakan pohon sedikit, karena bijinya ikut terbakar. Pakis tumbuh jauh lebih cepat." },
    { target: "dry", text: "Sekarang kemarau datang.", done: (s) => s.droughts >= 1 },
    { target: "figure", text: "Pakis kering menyala dan api menghabisi pohon yang tersisa. Lahan ini kini dua kali terbakar." },
    {
      target: "next",
      text: "Sekali terbakar, hutan masih bisa pulih. Yang membuatnya gagal adalah api yang datang lagi. Lahan bekas terbakar harus dijaga basah dan bebas api.",
    },
  ],
];

/** Arahan ke berapa tiap kartu kolom kanan mulai tampil, per babak. */
export const FLOOR_FROM = [
  { count: 0, why: 3 },
  { chart: 0, why: 1 },
  { seedlings: 1, why: 3 },
] as const;

export function guideLevel(act: number, s: GuideState, acked: number): number {
  return sharedGuideLevel(SUKSESI_GUIDE[act], s, acked);
}
