/**
 * ============================================================================
 *  TEKS MODUL ANATOMI GAMBUT — GANTI DI SINI
 * ============================================================================
 */

import type { GrowthStatus, WaterStatus } from "@/lib/model/peat";
import type { GuideStep } from "@/lib/guide";

export type AnatomiStep = {
  title: string;
  body: string;
  fact: { value: string; caption: string };
};

/** Empat tahap cerita Modul Anatomi, berpindah mengikuti gulir halaman. */
export const ANATOMI_STEPS: readonly AnatomiStep[] = [
  {
    title: "Hutan di atas spons",
    body: "Gambut terbentuk dari batang, akar, dan daun yang tertimbun di rawa yang selalu tergenang. Karena kekurangan oksigen, sisa tumbuhan itu tidak membusuk sempurna, melainkan menumpuk sedikit demi sedikit. Seret pengatur waktu di bawah untuk menumbuhkannya sendiri.",
    fact: { value: "≥ 50 cm", caption: "Ketebalan minimum bahan organik agar suatu lahan disebut gambut" },
  },
  {
    title: "Lapis demi lapis",
    body: "Pada gambut di tepi Sungai Kapuas ini, makin ke bawah makin matang. Dari atas ke bawah, seratnya berangsur hilang, dari fibrik yang mentah, hemik yang setengah matang, hingga saprik yang halus. Klik salah satu lapisan untuk melihatnya lebih dekat.",
    fact: { value: "3", caption: "Tingkat kematangan gambut: fibrik, hemik, dan saprik" },
  },
  {
    title: "Menyimpan air",
    body: "Gambut bekerja seperti spons. Sebagian besar volumenya berupa pori, dan dalam keadaan alami pori itu penuh berisi air. Satu kilogram gambut fibrik kering dapat menahan 8,5 sampai lebih dari 30 kg air, sedangkan saprik yang lebih matang dan rapat kurang dari 4,5 kg. Muka air tanah berada dekat permukaan, sehingga gambut tetap basah sepanjang tahun, bahkan saat kemarau.",
    fact: { value: "± 90%", caption: "Bagian volume gambut fibrik yang berupa pori, terisi air saat jenuh" },
  },
  {
    title: "Saat air surut",
    body: "Kanal dan kemarau panjang menurunkan muka air tanah. Gambut di atasnya mengering dan berubah menjadi bahan bakar. Geser pengatur di bawah untuk melihat akibatnya.",
    fact: { value: "0,4 m", caption: "Batas muka air tanah. Lebih dalam dari ini, ekosistem gambut dinyatakan rusak" },
  },
];


/**
 * Pembuka Modul Anatomi. Dimulai dari pertanyaan yang sudah dimiliki pembaca, bukan
 * dari definisi, karena ia datang dari media sosial dan belum tentu berniat
 * belajar. Klaim "sebagian besar isinya air" bersandar pada pori gambut yang
 * jenuh, 81–93% volume (Andriesse 1988, §4.2.4 dan Tabel 10).
 */
export const ANATOMI_HOOK = {
  setup: "Tanah ini sebagian besar isinya air.",
  question: "Kok bisa terbakar?",
  cta: "Cari tahu",
  scrollHint: "atau gulir ke bawah",
};

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
    message: "Timbunan sudah melewati 50 cm. Pada profil ini, bahan yang lebih dulu tertimbun di bawah sudah lebih hancur dan lebih matang.",
  },
};

/* ============================================================================
 *  TUNTUNAN LANGKAH DEMI LANGKAH (lihat lib/guide.ts)
 *  Teksnya hanya mengulang isi tahap di atas; tidak ada angka baru.
 * ========================================================================== */

export type AnatomiGuideState = {
  /** Tahap terjauh yang sudah terbuka (unlocked). */
  unlocked: number;
  focused: boolean;
  /** Muka air sudah digeser pembaca melewati batas 40 cm. */
  waterPastLimit: boolean;
};

export const ANATOMI_GUIDE: readonly (readonly GuideStep<AnatomiGuideState>[])[] = [
  [
    { target: "growth", text: "Seret pengatur waktu ke kanan dan lihat gambut menumpuk sedikit demi sedikit.", done: (s) => s.unlocked >= 1 },
    { target: "next", text: "Gambut sudah terbentuk. Lanjut ke tahap berikutnya." },
  ],
  [
    { target: "figure", text: "Klik salah satu lapisan untuk melihatnya lebih dekat.", done: (s) => s.focused },
    { target: "layerDetail", text: "Ini ciri lapisan itu. Coba juga lapisan yang lain dan bandingkan seratnya." },
    { target: "next", text: "Lanjut ke tahap berikutnya." },
  ],
  [
    { target: "figure", text: "Sebagian besar isi gambut adalah pori yang penuh air, seperti spons yang basah." },
    { target: "next", text: "Lanjut ke tahap berikutnya." },
  ],
  [
    { target: "water", text: "Geser muka air turun, melewati batas 40 cm.", done: (s) => s.waterPastLimit },
    { target: "figure", text: "Gambut di atas air mengering dan mulai berpijar. Di bawah garis biru ia tetap basah." },
    // Kalimat penutup modul (Andriesse 1988, §7.4), menggantikan kartu hasil.
    { target: "next", text: "30 cm gambut butuh 400 tahun untuk terbentuk, dan bisa hilang dalam kurang dari 10 tahun. Lanjut ke modul berikutnya." },
  ],
];
