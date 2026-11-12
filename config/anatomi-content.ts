/**
 * ============================================================================
 *  TEKS MODUL ANATOMI GAMBUT — GANTI DI SINI
 * ============================================================================
 */

import type { GrowthStatus, WaterStatus } from "@/lib/peat";

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
    fact: { value: "≥ 50 cm", caption: "Ketebalan minimum bahan organik agar suatu lahan disebut gambut (PP 71/2014)" },
  },
  {
    title: "Lapis demi lapis",
    body: "Pada gambut di tepi Sungai Kapuas ini, makin ke bawah makin matang. Dari atas ke bawah, seratnya berangsur hilang, dari fibrik yang mentah, hemik yang setengah matang, hingga saprik yang halus. Klik salah satu lapisan untuk melihatnya lebih dekat.",
    fact: { value: "3", caption: "Tingkat kematangan gambut: fibrik, hemik, dan saprik" },
  },
  {
    title: "Menyimpan air",
    body: "Gambut bekerja seperti spons. Sebagian besar volumenya berupa pori, dan dalam keadaan alami pori itu penuh berisi air. Satu kilogram gambut fibrik kering dapat menahan 8,5 sampai lebih dari 30 kg air, sedangkan saprik yang lebih matang dan rapat kurang dari 4,5 kg. Muka air tanah berada dekat permukaan, sehingga gambut tetap basah sepanjang tahun, bahkan saat kemarau.",
    fact: { value: "± 90%", caption: "Bagian volume gambut fibrik yang berupa pori, terisi air saat jenuh (Boelter 1974, dalam Andriesse 1988)" },
  },
  {
    title: "Saat air surut",
    body: "Kanal dan kemarau panjang menurunkan muka air tanah. Gambut di atasnya mengering dan berubah menjadi bahan bakar. Geser pengatur di bawah untuk melihat akibatnya.",
    fact: { value: "0,4 m", caption: "Batas muka air tanah. Lebih dalam dari ini, ekosistem gambut dinyatakan rusak (PP 57/2016)" },
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
  /** Pengantar untuk pembaca yang datang dari tautan kartu hasil temannya. */
  sharedLead: (cm: number) => `Temanmu mengatur muka air gambut sampai ${cm} cm. Sekarang giliranmu.`,
};

/**
 * Isi kartu hasil Tahap 4, menurut keadaan muka air pilihan pembaca.
 * Angka 400 tahun dan 10 tahun dikutip utuh dari Andriesse (1988, §7.4),
 * tidak dihitung ulang dari model Tahap 1.
 */
export const RESULT_CARD_TEXT: Record<WaterStatus, { headline: string; note: string; challenge: string; source: string }> = {
  basah: {
    headline: "Aku menjaga muka air gambut tetap dekat permukaan.",
    note: "Muka airnya masih jauh dari batas 40 cm, jadi gambut tetap basah.",
    challenge: "Seberapa dalam sampai gambut ini rawan terbakar? Coba sendiri.",
    source: "Batas muka air: PP 57/2016",
  },
  waspada: {
    headline: "Muka air gambutku hampir menyentuh batas.",
    note: "Sedikit lagi melewati 40 cm, batas yang ditetapkan PP 57/2016.",
    challenge: "Kamu bisa menjaganya lebih baik? Coba sendiri.",
    source: "Batas muka air: PP 57/2016",
  },
  rawan: {
    headline: "Aku menurunkan muka air gambut melewati batas.",
    note: "30 cm gambut butuh 400 tahun untuk terbentuk, dan bisa hilang dalam kurang dari 10 tahun.",
    challenge: "Kamu bisa menjaganya lebih baik? Coba sendiri.",
    source: "Andriesse (1988), FAO Soils Bulletin 59 · PP 57/2016",
  },
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
