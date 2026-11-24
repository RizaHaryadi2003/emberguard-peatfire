/**
 * ============================================================================
 *  TEKS MODUL 09 — KABUT ASAP — GANTI DI SINI
 * ============================================================================
 *  Setiap angka berasal dari docs/md/acuan-modul/acuan-modul-kabut-asap.md:
 *    US EPA                 — ukuran rambut dan partikel (babak 01)
 *    Permen LHK P.14/2020   — ISPU, kategori, dan anjurannya (babak 02)
 *    Pontianak Post, RRI, CNN Indonesia (Agustus 2026) — hari sungguhan, ISPA
 *    Kodros dkk. (2021)     — masker terhadap asap kebakaran (babak 03)
 *    Hu dkk. (2018)         — asap gambut tetap dekat permukaan
 *  Angka hitungan dibaca langsung dari lib/model/haze.ts.
 * ============================================================================
 */

import type { ShellAct, ShellHook } from "@/components/modul/shared/ActModuleShell";
import { guideLevel as sharedGuideLevel, type GuideStep as SharedGuideStep } from "@/lib/guide";
import {
  HAIR_UM,
  PM10_UM,
  PM25_PER_HAIR,
  PM25_UM,
  REAL_DAYS,
  passThrough,
  type IspuCategory,
  type Mask,
  type RealDayId,
} from "@/lib/model/haze";

/** Persen dibulatkan. */
const pct = (v: number) => `${Math.round(v * 100)} %`;

/** Perbesaran tempat sebaris butir PM2.5 selebar rambut mulai terbaca. */
export const REVEAL_ZOOM = 800;

/** Perbesaran terbesar mikroskop. */
export const MAX_ZOOM = 1500;

export const KABUT_HOOK: ShellHook = {
  setup: "27 Agustus 2026, pukul 08.00. Udara Pontianak menyentuh angka 312.",
  question: "Apa yang kita hirup?",
  cta: "Tarik napas",
  scrollHint: "atau gulir ke bawah",
};

export const KABUT_ACTS: readonly ShellAct[] = [
  {
    number: "01",
    title: "Sekecil Apa",
    body: `Asap kebakaran gambut terlihat seperti kabut, tetapi yang berbahaya tidak terlihat: butir-butir padat yang melayang di dalamnya. Yang paling berbahaya disebut PM2.5, butir yang lebarnya ${PM25_UM.toLocaleString("id-ID")} mikrometer atau kurang. Sehelai rambutmu lebarnya sekitar ${HAIR_UM} mikrometer.`,
    task: "Perbesar mikroskop sampai butir PM2.5 terlihat di samping sehelai rambut.",
    observe: `Butir PM2.5 terbesar pun ${PM25_PER_HAIR} kali lebih kecil dari lebar rambut. Butir di bawah ${PM10_UM} mikrometer bisa masuk jauh ke paru-paru, dan yang di bawah ${PM25_UM.toLocaleString("id-ID")} mikrometer paling berisiko bagi kesehatan. Hidung dan tenggorokan tidak cukup halus untuk menyaringnya.`,
    term: { word: "PM2.5", meaning: "partikel padat di udara yang lebarnya 2,5 mikrometer atau kurang. Satu mikrometer adalah seperseribu milimeter." },
    hint: "Geser Perbesaran sampai butir PM2.5 terlihat.",
    fact: { value: `${PM25_PER_HAIR} butir`, caption: "PM2.5 berjajar baru selebar sehelai rambut" },
  },
  {
    number: "02",
    title: "Jendela Pontianak",
    body: "Asap gambut keluar dari bara yang membara pelan, jadi asapnya tetap rendah dekat permukaan dan bisa bertahan berhari-hari. Angin membawanya dari lahan yang terbakar di kabupaten sekitar ke kota. Stasiun pemantau mengukur PM2.5 setiap jam dan mengubahnya menjadi satu angka: ISPU.",
    task: "Geser ISPU dari udara bersih sampai Berbahaya, lalu buka dua hari sungguhan di bulan Agustus 2026.",
    observe:
      "Pada 8 Agustus pagi, ISPU Pontianak masih 88: Sedang. Sembilan belas hari kemudian angkanya 312: Berbahaya, kategori tertinggi. Sekolah TK sampai SMP belajar dari rumah selama tiga pekan, dan Wali Kota menyebut sekitar 300 kasus infeksi saluran napas setiap hari.",
    term: { word: "ISPU", meaning: "Indeks Standar Pencemar Udara: angka tanpa satuan yang menggambarkan mutu udara dan dampaknya pada kesehatan." },
    hint: "Geser ISPU sampai Berbahaya, lalu buka kedua hari.",
    fact: { value: "± 300", caption: "kasus infeksi saluran napas sehari di Pontianak saat asap pekat, akhir Agustus 2026" },
  },
  {
    number: "03",
    title: "Satu Tarikan Napas",
    body: "Saat harus keluar rumah, yang tersisa adalah masker. Tetapi masker bekerja dengan dua cara: kainnya menyaring, dan tepinya harus rapat ke wajah. Bila tepinya renggang, udara mengambil jalan pintas lewat celah.",
    task: "Pilih masker, lalu tarik napas. Coba keempat masker.",
    observe: `Masker kain meloloskan sekitar ${pct(passThrough("kain"))} butir asap. Masker medis menyaring dengan baik, tetapi sekitar separuh udara masuk lewat celah di tepinya, jadi ${pct(passThrough("medis"))} tetap terhirup. Hanya N95 yang rapat ke wajah yang menahan sekitar ${pct(1 - passThrough("n95"))}.`,
    term: { word: "N95", meaning: "masker penyaring yang bahannya menahan hampir semua partikel halus, asalkan dipakai rapat ke wajah." },
    hint: "Coba keempat masker.",
    fact: { value: `± ${pct(1 - passThrough("n95"))}`, caption: "asap tertahan oleh N95 yang rapat; masker kain hanya sekitar 30 %" },
  },
];

/* ============================================================================
 *  LABEL DAN KOLOM KANAN
 * ========================================================================== */

export const CATEGORY_LABEL: Record<IspuCategory, string> = {
  baik: "Baik",
  sedang: "Sedang",
  tidakSehat: "Tidak Sehat",
  sangatTidakSehat: "Sangat Tidak Sehat",
  berbahaya: "Berbahaya",
};

/** Anjuran resmi tiap kategori (diringkas dari Permen LHK P.14/2020, Lampiran II). */
export const CATEGORY_ADVICE: Record<IspuCategory, { everyone: string; sensitive: string }> = {
  baik: { everyone: "Sangat baik untuk berkegiatan di luar.", sensitive: "Sangat baik untuk berkegiatan di luar." },
  sedang: { everyone: "Masih dapat beraktivitas di luar.", sensitive: "Kurangi aktivitas fisik yang lama atau berat." },
  tidakSehat: {
    everyone: "Kurangi aktivitas fisik yang lama di luar ruangan.",
    sensitive: "Lebih sering beristirahat, pilih aktivitas ringan, dan perhatikan batuk atau sesak napas.",
  },
  sangatTidakSehat: {
    everyone: "Hindari aktivitas fisik yang lama di luar; pindahkan kegiatan ke dalam ruangan.",
    sensitive: "Hindari semua aktivitas di luar.",
  },
  berbahaya: { everyone: "Hindari semua aktivitas di luar.", sensitive: "Tetap di dalam ruangan dan sedikit beraktivitas." },
};

export const MASK_LABEL: Record<Mask, string> = {
  tanpa: "Tanpa masker",
  kain: "Kain",
  sintetis: "Kain sintetis",
  medis: "Medis",
  n95: "N95 rapat",
};

/** Masker yang bisa dipilih, berurutan seperti di layar. */
export const MASK_OPTIONS: readonly Mask[] = ["kain", "sintetis", "medis", "n95"];

export const REAL_DAY_LABEL: Record<RealDayId, string> = {
  "8agt": "8 Agustus",
  "27agt": "27 Agustus",
};

export const KABUT_TEXT = {
  zoom: "Perbesaran",
  zoomValue: (z: number) => `${Math.round(z).toLocaleString("id-ID")}×`,
  sizes: "Ukuran sebenarnya",
  hair: "Sehelai rambut",
  pm10: "Debu kasar PM10",
  pm25: "Asap halus PM2.5",
  um: (v: number) => `${v.toLocaleString("id-ID")} µm`,
  rowLabel: `${PM25_PER_HAIR} butir PM2.5 = selebar rambut`,
  tooSmall: "belum terlihat",
  zoomInvite: "Perbesar terus. Butir asap baru terlihat jauh setelah rambut tampak sebesar batang kayu.",
  ispu: "ISPU",
  ispuValue: (v: number) => `${Math.round(v)}`,
  pm25Equal: (v: number) => `setara PM2.5 ± ${Math.round(v).toLocaleString("id-ID")} µg/m³ rata-rata sehari`,
  advice: "Anjuran resmi",
  everyone: "Setiap orang",
  sensitive: "Anak, lansia, penderita asma",
  realDays: "Hari sungguhan di Pontianak",
  realDayNote: (date: string, time: string) => `${date}, pukul ${time}`,
  realDayInvite: "Buka dua hari sungguhan ini:",
  slideHint: "Pengandaian: geser untuk melihat tiap kategori",
  mask: "Masker",
  breathe: "Tarik napas",
  breathing: "Menarik napas…",
  breatheInvite: "Pilih masker, lalu tarik napas dan lihat ke mana tiap butir pergi.",
  inhaled: (n: number) => `${n} dari 100 butir terhirup`,
  viaGap: (n: number) => `${n} lewat celah tepi`,
  viaFabric: (n: number) => `${n} menembus kain`,
  stopped: (n: number) => `${n} tertahan`,
  results: "Butir yang terhirup per 100",
  outside: "Udara luar",
  lungs: "Paru-paru",
  why: "Mengapa begitu",
  windowNote: "Pemandangan ilustratif dari jendela di tepi Kapuas",
  close: "Tutup",
} as const;

/** Penjelasan tiap benda di mikroskop saat diklik. */
export type ScopePart = "hair" | "pm10" | "pm25";

export function scopeText(part: ScopePart): { title: string; body: string } {
  switch (part) {
    case "hair":
      return {
        title: KABUT_TEXT.hair,
        body: `Lebarnya sekitar ${HAIR_UM} mikrometer. Matamu masih bisa melihatnya tanpa alat. Di mikroskop ini ia menjadi patokan ukuran.`,
      };
    case "pm10":
      return {
        title: KABUT_TEXT.pm10,
        body: `Debu dan abu yang lebih kasar, sampai ${PM10_UM} mikrometer. Sebagian masih bisa masuk jauh ke paru-paru.`,
      };
    case "pm25":
      return {
        title: KABUT_TEXT.pm25,
        body: `Butir terkecil asap, ${PM25_UM.toLocaleString("id-ID")} mikrometer atau kurang. Butir inilah yang diukur stasiun pemantau dan yang paling berisiko bagi kesehatan.`,
      };
  }
}

/** Penjelasan hasil satu tarikan napas. */
export function explainMask(mask: Mask): string {
  switch (mask) {
    case "tanpa":
      return "Tanpa masker, semua butir halus masuk bersama udara. Hidung tidak cukup halus untuk menyaringnya.";
    case "kain":
      return "Serat kain renggang dibanding butir asap. Sebagian besar butir menembus kain begitu saja.";
    case "sintetis":
      return "Kain sintetis sedikit lebih rapat, jadi lebih banyak butir tertahan. Tetapi hampir separuh masih menembus.";
    case "medis":
      return "Bahan masker medis menyaring dengan baik. Masalahnya ada di tepi: masker ini tidak rapat ke wajah, jadi udara mengambil jalan pintas lewat celah dan membawa asapnya.";
    case "n95":
      return "Bahan N95 menahan hampir semua butir, dan tepinya rapat ke wajah. Hanya sedikit yang lolos, kebanyakan lewat celah kecil di tepi.";
  }
}

/* ============================================================================
 *  TUNTUNAN LANGKAH DEMI LANGKAH
 * ========================================================================== */

export type GuideTarget = "zoom" | "scope" | "sizes" | "why" | "ispu" | "days" | "advice" | "window" | "mask" | "breathe" | "results" | "next";

export type GuideState = {
  maxZoom: number;
  inspected: boolean;
  maxIspu: number;
  daysSeen: number;
  /** Masker yang sudah dicoba dengan menarik napas. */
  masksTried: number;
};

export type GuideStep = SharedGuideStep<GuideState> & { target: GuideTarget };

export const KABUT_GUIDE: readonly (readonly GuideStep[])[] = [
  [
    { target: "zoom", text: "Ini sehelai rambut di bawah mikroskop. Perbesar sampai ia tampak seperti batang.", done: (s) => s.maxZoom >= 150 },
    { target: "zoom", text: "Butir debu kasar mulai terlihat. Perbesar lagi untuk mencari butir asap.", done: (s) => s.maxZoom >= REVEAL_ZOOM },
    { target: "scope", text: `Itu butir PM2.5. ${PM25_PER_HAIR} butir berjajar baru selebar rambut.` },
    { target: "scope", text: "Klik rambut, debu, atau butir asap untuk melihat ukurannya.", done: (s) => s.inspected },
    { target: "why", text: "Butir sekecil ini lolos dari saringan hidung dan masuk jauh ke paru-paru." },
    { target: "next", text: "Tugas selesai. Sekarang lihat seberapa banyak butir ini di udara Pontianak." },
  ],
  [
    { target: "window", text: "Ini pemandangan dari jendela di tepi Kapuas saat udara bersih." },
    { target: "ispu", text: "Naikkan ISPU pelan-pelan. Perhatikan kota di seberang sungai.", done: (s) => s.maxIspu >= 150 },
    { target: "ispu", text: "Teruskan sampai kategori Berbahaya.", done: (s) => s.maxIspu >= 301 },
    { target: "advice", text: "Tiap kategori punya anjuran resmi. Di kategori Berbahaya: hindari semua aktivitas di luar." },
    { target: "days", text: "Sekarang buka dua hari sungguhan di bulan Agustus 2026.", done: (s) => s.daysSeen >= 2 },
    { target: "next", text: "Dalam sembilan belas hari, udara Pontianak berubah dari Sedang menjadi Berbahaya. Lanjut ke babak berikutnya." },
  ],
  [
    { target: "breathe", text: "Pilih satu masker, lalu tarik napas.", done: (s) => s.masksTried >= 1 },
    { target: "mask", text: "Lihat butir mana yang tertahan dan mana yang lolos. Sekarang coba masker lain.", done: (s) => s.masksTried >= 3 },
    { target: "mask", text: "Satu masker lagi. Perhatikan butir jingga: itulah yang lolos lewat celah tepi.", done: (s) => s.masksTried >= 4 },
    { target: "results", text: "Bandingkan keempatnya: yang menentukan bukan hanya bahannya, tetapi juga rapatnya." },
    {
      target: "next",
      text: "Saat ISPU berbahaya, anjurannya tetap di dalam ruangan. Bila harus keluar, pakai masker yang rapat. Asap ini baru berhenti bila gambutnya tidak terbakar.",
    },
  ],
];

/** Arahan ke berapa tiap kartu kolom kanan mulai tampil, per babak. */
export const FLOOR_FROM = [
  { sizes: 1, why: 4 },
  { ispu: 0, advice: 3, days: 4 },
  { results: 1, why: 1 },
] as const;

export function guideLevel(act: number, s: GuideState, acked: number): number {
  return sharedGuideLevel(KABUT_GUIDE[act], s, acked);
}

/** Hari sungguhan berdasarkan id, untuk label tombol. */
export const REAL_DAY_BY_ID = Object.fromEntries(REAL_DAYS.map((d) => [d.id, d])) as Record<RealDayId, (typeof REAL_DAYS)[number]>;
