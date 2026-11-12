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

import type { ShellAct, ShellHook } from "@/components/gambut/ActModuleShell";

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
    observe: "Sungai hanya mencapai tepinya. Hutan di tengah kubah hanya diberi makan hujan dan debu, karena itu pohonnya lebih rendah daripada hutan di tanah biasa.",
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

export const HUTAN_TEXT = {
  stepLabel: "Langkah",
  fromRiver: (km: number) => `${km.toFixed(1).replace(".", ",")} km dari tepi hutan`,
  peat: "Tebal gambut",
  canopy: "Tinggi kanopi",
  flood: "Banjir sungai",
  rain: "Hujan",
  floodNote: "Air sungai berhenti di tepi hutan. Kubah di belakangnya lebih tinggi daripada jangkauannya.",
  rainNote: "Hujan turun di seluruh kubah. Bagi hutan di tengah, inilah satu-satunya sumber air dan hara.",
  richness: "Kekayaan jenis",
  apes: "Orangutan dan owa",
  totals: "Tercatat di Sebangau sejak 1993",
  scaleNote: "Tegak: tinggi pohon dan tebal gambut dalam meter. Mendatar: jarak dalam kilometer.",
  source: "Husson dkk., 2018; Page dkk., 1999",
};
