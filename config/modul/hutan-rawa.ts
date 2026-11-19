/**
 * ============================================================================
 *  TEKS MODUL 03 — HUTAN RAWA GAMBUT — GANTI DI SINI
 * ============================================================================
 *  Setiap angka berasal dari docs/md/acuan-modul-hutan-rawa.md:
 *    Page dkk. (1999)   — saling bergantungnya gambut dan hutan; gambut
 *                         ombrogen (hara dari hujan dan debu)
 *    Husson dkk. (2018) — jenis hutan menurut tebal gambut, tinggi kanopi,
 *                         keanekaragaman hayati Sebangau sejak 1993
 *  Datanya dari Sebangau, Kalimantan Tengah: hutan rawa gambut yang paling
 *  lama dan paling lengkap diteliti di Borneo.
 * ============================================================================
 */

import type { ShellAct, ShellHook } from "@/components/modul/shared/ActModuleShell";
import type { GuideStep } from "@/lib/guide";

export const HUTAN_HOOK: ShellHook = {
  setup: "Dari luar, hutan rawa gambut tampak seperti hutan yang sama di mana-mana.",
  question: "Benarkah begitu?",
  cta: "Masuk ke hutan",
  scrollHint: "atau gulir ke bawah",
};

export const HUTAN_ACTS: readonly ShellAct[] = [
  {
    number: "01",
    title: "Berjalan ke tengah kubah",
    body: "Gambut di hutan rawa tidak rata. Ia menumpuk paling tebal di tengah, seperti kubah, dan menipis ke arah sungai. Hutan di atasnya ikut berubah.",
    task: "Geser Langkah dari tepi sungai sampai ke puncak kubah gambut.",
    observe: "Makin ke tengah, gambutnya makin tebal dan hutannya berganti tiga kali. Bentuk hutan mengikuti tanah di bawahnya.",
    term: {
      word: "Kubah gambut",
      meaning: "gambut yang menumpuk paling tebal di tengah dan menipis ke tepinya, sehingga permukaannya melengkung seperti kubah.",
    },
    hint: "Berjalanlah sampai puncak kubah.",
    fact: {
      value: "45 m",
      caption: "Tinggi pohon tertinggi di hutan puncak kubah Sebangau, di atas gambut setebal 10–13 m (Husson dkk., 2018)",
    },
  },
  {
    number: "02",
    title: "Hidup dari hujan",
    body: "Air sungai membawa lumpur dan hara, tetapi hanya membasahi tepi hutan. Bagian tengah kubah lebih tinggi daripada jangkauan banjir sungai.",
    task: "Coba Banjir sungai, lalu coba Hujan. Perhatikan bagian hutan mana yang dicapai masing-masing.",
    observe: "Sungai hanya mencapai tepinya. Hutan di atas kubah hanya diberi makan hujan dan debu, karena itu kanopinya umumnya lebih rendah daripada hutan di tanah mineral. Hutan tiang rendah bahkan hanya 12–15 m.",
    term: {
      word: "Ombrogen",
      meaning: "mendapat air dan hara hanya dari hujan dan debu, tidak dari sungai atau tanah di bawahnya.",
    },
    hint: "Coba kedua sumber air.",
    fact: {
      value: "15–25 m",
      caption: "Tinggi kanopi hutan rawa gambut, lebih rendah daripada hutan di tanah mineral, karena haranya hanya dari hujan (Page dkk., 1999)",
    },
  },
  {
    number: "03",
    title: "Rumah bagi siapa",
    body: "Hutan rawa gambut bukan hutan yang kosong. Peneliti mencatat penghuninya di Sebangau sejak 1993.",
    task: "Tekan ketiga jenis hutan pada penampang untuk melihat siapa yang tinggal di sana.",
    observe: "Hutan tinggi di puncak kubah paling kaya jenis dan paling banyak dihuni orangutan dan owa. Semuanya berdiri di atas gambut yang hanya bertahan selama basah.",
    term: {
      word: "Terancam punah",
      meaning: "jenis yang jumlahnya di alam terus berkurang dan berisiko hilang sama sekali.",
    },
    hint: "Buka ketiga jenis hutan.",
    fact: {
      value: "46 jenis",
      caption: "Satwa dan tumbuhan terancam punah secara global yang tercatat di hutan rawa gambut Sebangau (Husson dkk., 2018)",
    },
  },
];

export type ForestZone = {
  id: "campuran" | "tiang" | "tinggi";
  name: string;
  /** Nama pendek untuk layar ponsel. */
  short: string;
  /** Batas zona di sepanjang penampang (km dari tepi hutan). */
  fromKm: number;
  toKm: number;
  peat: string;
  canopy: string;
  /** Rentang tinggi pohon untuk digambar (m). */
  treeMinM: number;
  treeMaxM: number;
  richness: string;
  apes: string;
  note: string;
};

/**
 * Jenis hutan dari tepi ke tengah kubah (Husson dkk., 2018, mengutip Page
 * dkk., 1999). Batas 5,5 km dan 10 km dari tepi hutan dikutip langsung; batas
 * akhir hutan tinggi tidak disebutkan, jadi penampang berhenti di 14 km.
 */
export const FOREST_ZONES: readonly ForestZone[] = [
  {
    id: "campuran",
    name: "Hutan rawa campuran",
    short: "Campuran",
    fromKm: 0,
    toKm: 5.5,
    peat: "paling dangkal",
    canopy: "15–25 m",
    treeMinM: 15,
    treeMaxM: 25,
    richness: "sedang",
    apes: "sedang",
    note: "Paling dekat tepi hutan, banyak pohon kayu dagang, dan karena itu paling banyak ditebang.",
  },
  {
    id: "tiang",
    name: "Hutan tiang rendah",
    short: "Tiang rendah",
    fromKm: 5.5,
    toKm: 10,
    peat: "6–10 m",
    canopy: "12–15 m",
    treeMinM: 10,
    treeMaxM: 15,
    richness: "rendah",
    apes: "rendah",
    note: "Pohonnya kecil-kecil dan jenisnya sedikit; hampir tidak ada kayu dagang, jadi jarang ditebang.",
  },
  {
    id: "tinggi",
    name: "Hutan tinggi pedalaman",
    short: "Hutan tinggi",
    fromKm: 10,
    toKm: 14,
    peat: "10–13 m",
    canopy: "sampai 45 m",
    treeMinM: 20,
    treeMaxM: 45,
    richness: "tinggi",
    apes: "tinggi",
    note: "Di puncak kubah: pohon paling tinggi, jenis paling banyak, orangutan dan owa paling padat.",
  },
];

/** Penghuni yang tercatat di Sebangau sejak 1993 (Husson dkk., 2018). */
export const SEBANGAU_SPECIES = [
  { label: "jenis pohon", value: 215 },
  { label: "jenis burung", value: 172 },
  { label: "jenis mamalia", value: 65 },
  { label: "jenis ikan", value: 55 },
  { label: "jenis reptil", value: 46 },
  { label: "jenis amfibi", value: 11 },
] as const;

/**
 * Foto satwa di babak 03. Sumber dan lisensinya dicatat di
 * public/images/hutan-rawa/SUMBER.md; keterangan pemotret wajib tampil.
 */
export const APE_PHOTOS = [
  {
    src: "/images/hutan-rawa/orangutan.webp",
    name: "Orangutan Kalimantan",
    latin: "Pongo pygmaeus wurmbii",
    credit: "Foto: Mankdhay rahman, TN Sebangau · CC BY-SA 4.0",
    href: "https://commons.wikimedia.org/wiki/File:Pongo_Pygmaeus_wrumbii.jpg",
  },
  {
    src: "/images/hutan-rawa/owa.webp",
    name: "Owa janggut-putih",
    latin: "Hylobates albibarbis",
    credit: "Foto: Svetlana Tsarakhova · CC0",
    href: "https://commons.wikimedia.org/wiki/File:Hylobates_albibarbis_638057505.jpg",
  },
] as const;

export const HUTAN_TEXT = {
  stepLabel: "Langkah",
  fromRiver: (km: number) => `${km.toFixed(1).replace(".", ",")} km dari tepi hutan`,
  peat: "Tebal gambut",
  peatHere: "Gambut di bawah kakimu",
  underFoot: "Di bawah kakimu",
  waterSource: "Sumber air",
  peatRange: (zone: string) => `Di jenis hutan ini: ${zone} · puncak kubah ± 13 m`,
  canopy: "Tinggi kanopi",
  flood: "Banjir sungai",
  rain: "Hujan",
  floodNote: "Air sungai berhenti di tepi hutan. Kubah di belakangnya lebih tinggi daripada jangkauannya.",
  rainNote: "Hujan turun di seluruh kubah. Bagi hutan di tengah, inilah satu-satunya sumber air dan hara.",
  richness: "Kekayaan jenis",
  apes: "Orangutan dan owa",
  apesShort: "Kera",
  totals: "Tercatat di Sebangau sejak 1993",
  scaleNote: "Tinggi pohon, tebal gambut, dan orang dalam meter sungguhan. Jarak mendatar dimampatkan: 14 km dari sungai ke puncak kubah.",
  you: "kamu",
  /** Tebal gambut di bawah kaki pejalan; angka dibulatkan dari kurva kubah. */
  gauge: (m: number) => `gambut ± ${m} m`,
  floodCarry: "air sungai: lumpur dan hara",
  floodLimit: "batas banjir sungai",
  rainSoak: "hujan meresap ke seluruh kubah",
  apesNote: "Penghuni di bawah ini tercatat di hutan rawa gambut Sebangau secara keseluruhan, bukan per jenis hutan.",
  threatened: "Penghuni yang terancam punah",
  animals: "Satwa endemik Kalimantan",
  plants: "Pohon yang terancam",
  residents: "Penghuni tajuknya",
  source: "Husson dkk., 2018; Page dkk., 1999",
};

/* ============================================================================
 *  TUNTUNAN LANGKAH DEMI LANGKAH (lihat lib/guide.ts)
 *  Teksnya hanya mengulang isi babak di atas; tidak ada angka baru.
 * ========================================================================== */

/** Keadaan yang dibaca tuntunan Hutan Rawa. */
export type HutanGuideState = {
  maxKm: number;
  triedFlood: boolean;
  triedRain: boolean;
  /** Jenis hutan yang sudah dibuka, menurut urutan FOREST_ZONES. */
  opened: readonly string[];
};

/** Jenis hutan pertama yang belum dibuka (untuk ditunjuk arahan). */
const firstClosedZone = (s: HutanGuideState) => `zone-${FOREST_ZONES.find((z) => !s.opened.includes(z.id))?.id ?? FOREST_ZONES[0].id}`;

export const HUTAN_GUIDE: readonly (readonly GuideStep<HutanGuideState>[])[] = [
  [
    { target: "walk", text: "Mulai di tepi sungai. Geser Langkah untuk berjalan masuk ke hutan.", done: (s) => s.maxKm >= 1.5 },
    { target: "peatHere", text: "Ini tebal gambut di bawah kakimu. Perhatikan angkanya bertambah saat kamu berjalan.", done: (s) => s.maxKm >= 6 },
    { target: "figure", text: "Lihat hutannya: di sini pohonnya kecil-kecil. Terus berjalan sampai puncak kubah.", done: (s) => s.maxKm >= 12 },
    { target: "next", text: "Tugas selesai. Lanjut ke babak berikutnya." },
  ],
  [
    { target: "flood", text: "Tekan Banjir sungai, lalu lihat sampai mana air sungai masuk.", done: (s) => s.triedFlood },
    { target: "figure", text: "Air sungai berhenti di tepi hutan. Kubah di belakangnya lebih tinggi daripada jangkauannya." },
    { target: "rain", text: "Sekarang tekan Hujan.", done: (s) => s.triedRain },
    { target: "figure", text: "Hujan turun di seluruh kubah. Bagi hutan di tengah, hanya hujan yang membawa air dan hara." },
    { target: "next", text: "Tugas selesai. Lanjut ke babak berikutnya." },
  ],
  [
    { target: firstClosedZone, text: "Tekan satu jenis hutan di bawah penampang.", done: (s) => s.opened.length >= 1 },
    { target: "zoneInfo", text: "Di sini penghuninya: seberapa kaya jenisnya, dan seberapa banyak orangutan dan owa.", done: (s) => s.opened.length >= 2 },
    { target: firstClosedZone, text: "Buka jenis hutan lainnya dan bandingkan penghuninya.", done: (s) => s.opened.length >= FOREST_ZONES.length },
    { target: "next", text: "Modul selesai. Lanjut ke modul berikutnya." },
  ],
];

/** Arti singkat status IUCN untuk pembaca. */
export const IUCN_LABEL = { CR: "kritis", EN: "genting", VU: "rentan" } as const;

/**
 * Satwa endemik Borneo dan pohon terancam yang tercatat di Sebangau (Husson
 * dkk., 2018, Tabel A1 dan A10; dicatat di docs/md/acuan-modul-hutan-rawa.md).
 * Berlaku untuk hutan penelitian secara keseluruhan, bukan per jenis hutan.
 */
export const SEBANGAU_THREATENED = {
  animals: [
    { name: "Orangutan Kalimantan", latin: "Pongo pygmaeus wurmbii", iucn: "CR" },
    { name: "Owa janggut-putih", latin: "Hylobates albibarbis", iucn: "EN" },
    { name: "Bekantan", latin: "Nasalis larvatus", iucn: "EN" },
  ],
  plants: [
    { name: "Balangeran", latin: "Shorea balangeran", iucn: "CR" },
    { name: "Meranti semut", latin: "Shorea teysmanniana", iucn: "EN" },
    { name: "Ramin", latin: "Gonystylus bancanus", iucn: "VU" },
  ],
} as const;
