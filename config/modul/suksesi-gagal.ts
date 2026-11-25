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
 *  DRAF TEKS: menunggu dibaca pengguna sebelum animasi dibuat.
 * ============================================================================
 */

import type { ShellAct, ShellHook } from "@/components/modul/shared/ActModuleShell";
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
  setup: `Rasau Jaya, Kubu Raya. Hutan lindung yang tidak pernah terbakar punya ${RASAU_JAYA.unburned} jenis tumbuhan. Di hutan lindung yang pernah terbakar, tinggal ${RASAU_JAYA.burned}, kebanyakan pakis.`,
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
    hint: "Seret ke kanan untuk berjalan di sepanjang jalur.",
    fact: { value: `± ${treesInTransect(0)}`, caption: `pohon besar dalam satu jalur ukur hutan rawa gambut utuh` },
  },
  {
    number: "02",
    title: "Sekali, Dua Kali",
    body: "Di hutan biasa, sesudah api lewat, biji yang tersimpan di tanah bisa tumbuh menggantikan pohon yang mati. Di gambut, apinya merambat di dalam tanah dan bisa memusnahkan biji itu. Yang menentukan nasib hutan adalah berapa kali api datang sebelum hutan sempat pulih.",
    task: "Pilih berapa kali lahan ini terbakar, lalu berjalan lagi di jalur yang sama.",
    observe: `Sesudah sekali terbakar, masih ada sekitar ${treesInTransect(1)} pohon, lebih dari sepertiga. Hutan seperti ini masih bisa pulih dalam beberapa puluh tahun bila tidak terbakar lagi. Sesudah dua kali, tinggal sekitar ${treesInTransect(2)}. Lebih dari itu, hampir tidak ada pohon tersisa: yang tumbuh hanya pakis dan rumput.`,
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
} as const;
