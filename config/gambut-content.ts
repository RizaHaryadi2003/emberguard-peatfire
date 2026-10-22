/**
 * ============================================================================
 *  TEKS SECTION GAMBUT — GANTI DI SINI
 * ============================================================================
 */

import type { GrowthStatus, WaterStatus } from "@/lib/peat";

export const GAMBUT_INTRO = {
  eyebrow: "Bagian 01",
  title: "Gambut",
  lead: "Tanah yang terbuat dari hutan itu sendiri, basah, tebal, dan menyimpan ribuan tahun sejarah. Kenali cara kerjanya sebelum memahami mengapa ia bisa terbakar.",
};

export type GambutModule = {
  /** Alamat halaman modul; kosong bila belum tersedia. */
  href: string | null;
  number: string;
  title: string;
  caption: string;
  available: boolean;
};

export const GAMBUT_MODULES: readonly GambutModule[] = [
  { href: "/gambut/anatomi", number: "01", title: "Anatomi Gambut", caption: "Kupas lapisannya satu per satu", available: true },
  { href: "/gambut/bara", number: "02", title: "Bara di Bawah Tanah", caption: "Api yang merambat tanpa terlihat", available: true },
  { href: "/gambut/kanal", number: "03", title: "Kanal & Pengeringan", caption: "Saat air dialirkan keluar", available: true },
  { href: null, number: "04", title: "Gudang Karbon", caption: "Apa yang lepas saat gambut terbakar", available: false },
];

export type AnatomiStep = {
  title: string;
  body: string;
  fact: { value: string; caption: string };
};

/** Empat tahap cerita Modul 01, berpindah mengikuti gulir halaman. */
export const ANATOMI_STEPS: readonly AnatomiStep[] = [
  {
    title: "Hutan di atas spons",
    body: "Gambut terbentuk dari batang, akar, dan daun yang tertimbun di rawa yang selalu tergenang. Karena kekurangan oksigen, sisa tumbuhan itu tidak membusuk sempurna, melainkan menumpuk sedikit demi sedikit. Seret pengatur waktu di bawah untuk menumbuhkannya sendiri.",
    fact: { value: "≥ 50 cm", caption: "Ketebalan minimum bahan organik agar suatu lahan disebut gambut (PP 71/2014)" },
  },
  {
    title: "Lapis demi lapis",
    body: "Semakin lama tertimbun, semakin matang gambutnya. Dari atas ke bawah, seratnya berangsur hilang, dari fibrik yang mentah, hemik yang setengah matang, hingga saprik yang halus. Klik salah satu lapisan untuk melihatnya lebih dekat.",
    fact: { value: "3", caption: "Tingkat kematangan gambut: fibrik, hemik, dan saprik" },
  },
  {
    title: "Menyimpan air",
    body: "Dalam keadaan alami, pori-pori gambut penuh berisi air. Muka air tanah berada dekat permukaan, sehingga gambut tetap basah sepanjang tahun, bahkan saat kemarau.",
    fact: { value: "± 90%", caption: "Bagian volume gambut alami yang berupa air" },
  },
  {
    title: "Saat air surut",
    body: "Kanal dan kemarau panjang menurunkan muka air tanah. Gambut di atasnya mengering dan berubah menjadi bahan bakar. Geser pengatur di bawah untuk melihat akibatnya.",
    fact: { value: "0,4 m", caption: "Batas muka air tanah. Lebih dalam dari ini, ekosistem gambut dinyatakan rusak (PP 57/2016)" },
  },
];

export const WATER_STATUS_TEXT: Record<WaterStatus, { label: string; message: string }> = {
  basah: {
    label: "Basah · Aman",
    message: "Gambut jenuh air. Api sulit menyala dan tidak dapat merambat.",
  },
  waspada: {
    label: "Waspada",
    message: "Mendekati batas 40 cm. Lapisan paling atas mulai mengering.",
  },
  rawan: {
    label: "Rawan terbakar",
    message: "Melewati batas 40 cm. Gambut kering di atas muka air mudah terbakar, dan baranya dapat merambat di bawah permukaan.",
  },
};

export const GROWTH_STATUS_TEXT: Record<GrowthStatus, { label: string; message: string }> = {
  kosong: {
    label: "Tanah mineral",
    message: "Belum ada gambut. Yang ada baru dasar lempung atau pasir tempat sisa tumbuhan nanti menumpuk.",
  },
  belum: {
    label: "Belum disebut gambut",
    message: "Bahan organik sudah menumpuk, tetapi belum mencapai 50 cm. Menurut PP 71/2014, lahan ini belum tergolong lahan gambut.",
  },
  gambut: {
    label: "Lahan gambut",
    message: "Timbunan sudah melewati 50 cm. Semakin ke bawah, bahan yang lebih dulu tertimbun menjadi semakin hancur dan semakin matang.",
  },
};
