/**
 * ============================================================================
 *  TEKS MODUL 06 — FORENSIK API — GANTI DI SINI
 * ============================================================================
 *  Setiap angka berasal dari docs/md/acuan-modul/acuan-modul-forensik-api.md:
 *    Lin dkk. (2024)    — satu bara kecil menyulut gambut kering (babak 01)
 *    Usup dkk. (2004)   — pembukaan lahan dengan api penyulut utama
 *    Cattau dkk. (2016) — titik sulut di lahan terbuka, api yang lolos
 *    InfoPublik (2026)  — kebakaran lahan Pontianak Agustus 2026 (hook)
 *    Perwa Pontianak 55/2018 jo. 114/2021 — larangan membakar lahan
 *  Angka dari model (jarak, hari) dibaca langsung dari lib/model/ignition.ts
 *  supaya teks dan gambar tidak pernah berselisih.
 * ============================================================================
 */

import type { ShellAct, ShellHook } from "@/components/modul/shared/ActModuleShell";
import { guideLevel as sharedGuideLevel, type GuideStep as SharedGuideStep } from "@/lib/guide";
import {
  BURNS,
  CASE_IGNITION,
  ESCAPED_DAYS,
  FOREST_FIRE_FROM_OPEN,
  IGNITION_DENSITY,
  IGNITION_SHARE,
  NEAR_VILLAGE_SHARE,
  ONE_DAY_SHARE,
  STAYED_DAYS,
  kmFromVillage,
  landAt,
  spreadFire,
  type Land,
  type SparkResult,
  type Wetness,
  type Wind,
} from "@/lib/model/ignition";

/** Persen dibulatkan, ditulis dengan tanda persen. */
const pct = (v: number) => `${Math.round(v)} %`;

/** Jalannya kebakaran kasus babak 02 (tetap, berbenih). */
export const CASE_FIRE = spreadFire();

/** Jarak titik sulut kasus dari kampung terdekat (km). */
export const CASE_KM = Math.round(kmFromVillage(CASE_IGNITION.x, CASE_IGNITION.y));

/** Hari pertama api kasus masuk ke hutan. */
export const CASE_FOREST_DAY = Math.min(
  ...CASE_FIRE.filter((d) => landAt(d.x, d.y) === "hutan").map((d) => d.day),
);

/** Hari terakhir kasus, tempat babak 02 dimulai (lahan sudah hangus). */
export const CASE_LAST_DAY = Math.max(...CASE_FIRE.map((d) => d.day));

/** Berapa kali lebih lama api yang lolos menyala (Cattau dkk., 2016, Tabel 4). */
const ESCAPE_TIMES = Math.round(ESCAPED_DAYS / STAYED_DAYS);

/** Berapa kali lebih sering lahan terbuka tersulut daripada hutan, per km². */
const OPEN_VS_FOREST = Math.round(IGNITION_DENSITY.terbuka / IGNITION_DENSITY.hutan);

/** Api pembersih lahan ke berapa yang lolos (1 = pertama). */
export const ESCAPED_BURN_NO = BURNS.findIndex((b) => b.escaped) + 1;

export const FORENSIK_HOOK: ShellHook = {
  setup: "Agustus 2026. Enam bidang lahan gambut terbakar di Pontianak Utara dan Pontianak Tenggara.",
  question: "Gambut tidak bisa menyala sendiri. Lalu dari mana apinya?",
  cta: "Mulai penyelidikan",
  scrollHint: "atau gulir ke bawah",
};

export const FORENSIK_ACTS: readonly ShellAct[] = [
  {
    number: "01",
    title: "Percikan",
    body: "Gambut tidak bisa menyalakan dirinya sendiri: harus ada sesuatu yang membawa panas kepadanya. Di lahan gambut, pembawa panas itu hampir selalu manusia, misalnya api pembuka lahan, sisa bakar sampah, atau sebatang puntung. Penyelidik mulai dari pertanyaan paling dasar: seberapa kecil percikan yang sudah cukup?",
    task: "Jatuhkan satu bara seukuran puntung ke petak gambut. Coba ketiga keadaan gambut, lalu nyalakan angin.",
    observe:
      "Di gambut basah bara langsung padam, walau diembus angin. Di gambut lembap bara hanya hidup bila ada angin. Di gambut kering bara selalu masuk dan membara tanpa nyala, walau udara tenang. Percikan sekecil itu sudah cukup, asalkan gambutnya kering.",
    term: { word: "Titik sulut", meaning: "tempat api pertama kali menyala. Dari sinilah sebuah kebakaran ditelusuri." },
    hint: "Coba ketiga keadaan gambut, dengan dan tanpa angin.",
    fact: { value: "1 bara", caption: "seukuran puntung sudah cukup menyulut gambut kering, bahkan tanpa angin" },
  },
  {
    number: "02",
    title: "Titik Sulut",
    body: "Satelit melihat kebakaran sebagai kotak-kotak panas, masing-masing seluas 1 km². Kotak yang paling awal menyala adalah titik sulutnya. Dengan cara ini peneliti menelusuri ribuan kebakaran di lahan gambut Kalimantan selama sepuluh tahun.",
    task: "Tebak dulu di mana api ini lahir. Lalu putar waktu mundur sampai tersisa satu kotak pertama.",
    observe: `Api ini lahir di lahan terbuka di tepi kanal, ${CASE_KM} km dari kampung, lalu masuk ke hutan pada hari ke-${CASE_FOREST_DAY}. Polanya sama dengan ribuan kebakaran lain: ${pct(IGNITION_SHARE.terbuka)} api lahir di lahan terbuka yang sudah rusak, ${pct(IGNITION_SHARE.kebun)} di kebun sawit, dan hanya ${pct(IGNITION_SHARE.hutan)} di hutan.`,
    term: {
      word: "Lahan terbuka",
      meaning: "bekas hutan yang sudah ditebang atau terbakar, kini berisi pakis, semak, dan gambut gundul.",
    },
    hint: "Tebak dulu, lalu geser Putar waktu sampai hari ke-0.",
    fact: {
      value: `± ${OPEN_VS_FOREST}×`,
      caption: "lebih sering lahan terbuka menjadi titik sulut daripada hutan, untuk luas yang sama",
    },
  },
  {
    number: "03",
    title: "Api yang Lolos",
    body: "Sebagian besar api di lahan gambut sengaja dinyalakan untuk membersihkan lahan, dan sebagian besar padam sendiri. Bahayanya ada pada sedikit api yang lolos dari pengawasan.",
    task: "Nyalakan api pembersih lahan satu per satu di petak dekat hutan. Lihat ke mana tiap api pergi.",
    observe: `${ONE_DAY_SHARE / 10} dari 10 api padam dalam sehari. Tetapi satu api lolos, menyeberang ke hutan, dan menyala ${Math.round(ESCAPED_DAYS)} hari. Lebih dari separuh kebakaran besar di hutan berawal dari api di lahan terbuka di luarnya.`,
    term: { word: "Api lolos", meaning: "api yang keluar dari petak tempat ia sengaja dinyalakan." },
    hint: "Nyalakan kesepuluh api.",
    fact: {
      value: `± ${ESCAPE_TIMES}×`,
      caption: "lebih lama api yang lolos menyala, dibanding api yang tetap di petaknya",
    },
  },
];

/* ============================================================================
 *  LABEL PANEL KENDALI DAN KOLOM KANAN
 * ========================================================================== */

export const WETNESS_LABEL: Record<Wetness, string> = { basah: "Basah", lembap: "Lembap", kering: "Kering" };
export const WIND_LABEL: Record<Wind, string> = { tenang: "Tenang", berangin: "Berangin" };
export const LAND_LABEL: Record<Land, string> = {
  sungai: "Sungai",
  kampung: "Kampung",
  kebun: "Kebun sawit",
  terbuka: "Lahan terbuka",
  hutan: "Hutan gambut",
};

/** Pilihan tebakan babak 02, berurutan seperti di layar. */
export const GUESS_OPTIONS: readonly Exclude<Land, "sungai">[] = ["hutan", "kebun", "kampung", "terbuka"];

export const FORENSIK_TEXT = {
  wetness: "Keadaan gambut",
  wind: "Angin",
  drop: "Jatuhkan bara",
  again: "Jatuhkan lagi",
  result: (r: SparkResult) => (r === "menyala" ? "Gambut tersulut" : "Bara padam"),
  tried: (n: number) => `${n} dari 6 percobaan`,
  table: "Catatan percobaan",
  guessTitle: "Menurutmu, api ini lahir di mana?",
  guessLocked: (land: string) => `Tebakanmu: ${land.toLowerCase()}. Buktikan dengan memutar waktu mundur.`,
  guessRight: "Tebakanmu tepat.",
  caseFound: `Api ini lahir di lahan terbuka di tepi kanal, ${CASE_KM} km dari kampung.`,
  burnedSoFar: "terbakar sampai hari ini",
  guessWrong: (land: string) => `Ternyata bukan di ${land.toLowerCase()}.`,
  rewind: "Putar waktu",
  dayValue: (d: number) => (d === 0 ? "hari ke-0 · titik sulut" : `hari ke-${d}`),
  cellsBurned: (n: number) => `${n} km² terbakar`,
  cellScale: "1 kotak = 1 km², sebesar satu titik api satelit",
  burn: "Nyalakan api",
  burnNo: (i: number, n: number) => `Api ${i} dari ${n}`,
  burnOut: (days: number) => (days === 1 ? "padam dalam sehari" : `padam setelah ${days} hari`),
  burnEscaped: (days: number) => `lolos ke hutan, menyala ${days} hari`,
  tally: (lit: number, out: number, escaped: number) => `${lit} api · ${out} padam sehari · ${escaped} lolos`,
  share: "Di mana api lahir · Kalimantan, 2000–2010",
  shareShort: `Kalimantan, 2000–2010: ${pct(IGNITION_SHARE.terbuka)} api lahir di lahan terbuka, ${pct(IGNITION_SHARE.kebun)} di kebun sawit, ${pct(IGNITION_SHARE.hutan)} di hutan.`,
  nearVillage: `${pct(NEAR_VILLAGE_SHARE)} titik sulut berada dalam 5 km dari kampung`,
  forestFromOpen: `${pct(FOREST_FIRE_FROM_OPEN)} kebakaran besar di hutan berawal dari lahan terbuka`,
  why: "Mengapa begitu",
  clickInvite: "Klik satu jenis lahan di peta untuk melihat mengapa api lahir atau tidak lahir di sana.",
  dragHint: "Seret untuk memutar · klik bagian peta untuk penjelasannya",
  close: "Tutup",
  guideCount: (i: number, n: number) => `${i} / ${n}`,
  illustrative: "Lanskap ini contoh, bukan peta tempat sungguhan.",
  ignitionMark: "Titik sulut",
  hot: "Masih panas",
  scar: "Sudah padam",
  untried: "—",
  plotNote: "Petak gambut 4 m, satu bara seukuran puntung",
  burning: "Api sedang menyala…",
  allBurnt: "Kesepuluh api sudah dinyalakan",
  burnsTitle: "Sepuluh api pembersih lahan",
  burnWhy: `Kebanyakan api pembersih lahan padam sendiri di petaknya. Yang berbahaya adalah sedikit api yang lolos: ia menyala ±${ESCAPE_TIMES} kali lebih lama, menyeberang ke hutan, dan di sana menjadi kebakaran besar.`,
  burnWhyWait: "Nyalakan api satu per satu, lalu lihat berapa yang tetap di petaknya.",
  sparkWait: "Pilih keadaan gambut dan angin, lalu jatuhkan bara.",
} as const;

/**
 * Satu kalimat yang menjelaskan hasil bara yang baru dijatuhkan. Ditulis
 * menurut keadaan, bukan menurut babak, supaya tiap percobaan langsung
 * diberi alasannya.
 */
export function explainSpark(wetness: Wetness, wind: Wind, result: SparkResult): string {
  if (wetness === "basah")
    return "Pori gambut penuh air. Panas bara habis untuk menguapkan air itu, jadi bara padam sebelum gambut sempat terbakar, sekencang apa pun anginnya.";
  if (wetness === "lembap")
    return result === "menyala"
      ? "Angin meniupkan udara segar ke bara sehingga panasnya cukup untuk mengeringkan gambut lembap di bawahnya, lalu menyulutnya."
      : "Gambut masih menyimpan cukup air. Tanpa angin, panas bara tidak cukup untuk mengeringkannya, dan bara pelan-pelan padam.";
  return wind === "berangin"
    ? "Gambut kering menyala oleh bara sekecil ini, dan angin membuatnya membara lebih cepat."
    : "Gambut kering tidak punya air untuk meredam panas. Bara langsung masuk dan membara tanpa nyala, walau udara tenang.";
}

/** Bagian peta yang bisa diklik pembaca (jenis lahan, ditambah kanal). */
export type InspectPart = Land | "kanal";

/** Penjelasan tiap bagian peta saat diklik. */
export function inspectText(part: InspectPart): { title: string; body: string } {
  switch (part) {
    case "hutan":
      return {
        title: LAND_LABEL.hutan,
        body: `Di bawah tajuk yang rapat, gambut tetap lembap dan airnya terjaga, dan sedikit orang datang ke sini. Untuk luas yang sama, hutan ${OPEN_VS_FOREST} kali lebih jarang menjadi titik sulut. Hutan biasanya terbakar oleh api yang datang dari luar.`,
      };
    case "terbuka":
      return {
        title: LAND_LABEL.terbuka,
        body: "Pakis, semak, dan gambut gundul bekas tebangan atau kebakaran lama. Kering, terbuka ke matahari, dan sering didatangi orang untuk membuka lahan. Di sinilah sebagian besar api lahir.",
      };
    case "kebun":
      return {
        title: LAND_LABEL.kebun,
        body: "Untuk luas yang sama, kebun sawit hampir sesering lahan terbuka menjadi titik sulut. Tetapi kebanyakan apinya tetap di dalam kebun dan tidak menjalar keluar.",
      };
    case "kampung":
      return {
        title: LAND_LABEL.kampung,
        body: `Di dekat rumah, api biasanya dinyalakan kecil dan dijaga. Hanya sekitar ${Math.round(NEAR_VILLAGE_SHARE / 10)} dari 10 titik sulut berada dalam 5 km dari kampung.`,
      };
    case "sungai":
      return { title: LAND_LABEL.sungai, body: "Air terbuka tidak terbakar. Di peta ini sungai menjadi batas api." };
    case "kanal":
      return {
        title: "Kanal",
        body: "Kanal mengeringkan gambut di kiri dan kanannya, dan sekaligus menjadi jalan orang masuk ke lahan. Gambut kering dan orang yang datang: dua syarat api bertemu di tepi kanal.",
      };
  }
}

/* ============================================================================
 *  TUNTUNAN LANGKAH DEMI LANGKAH
 * ============================================================================
 *  Sama seperti modul lain: tiap arahan menunjuk satu bagian layar dan
 *  menunggu aksi pembaca (`done`) atau waktu bacanya habis.
 * ========================================================================== */

/** Bagian layar yang bisa ditunjuk arahan (atribut `data-guide`). */
export type GuideTarget =
  | "wetness"
  | "wind"
  | "drop"
  | "table"
  | "guess"
  | "rewind"
  | "map"
  | "share"
  | "burn"
  | "tally"
  | "why"
  | "next";

/** Keadaan yang dibaca untuk memutuskan apakah satu arahan sudah dikerjakan. */
export type GuideState = {
  /** Pasangan (keadaan gambut, angin) yang sudah dicoba, misalnya "kering-tenang". */
  tried: ReadonlySet<string>;
  guessed: boolean;
  /** Hari terkecil yang pernah dicapai saat memutar waktu mundur. */
  minDay: number;
  burnsLit: number;
  inspected: boolean;
};

export type GuideStep = SharedGuideStep<GuideState> & { target: GuideTarget };

const triedWetness = (s: GuideState, w: Wetness) => [...s.tried].some((k) => k.startsWith(`${w}-`));

export const FORENSIK_GUIDE: readonly (readonly GuideStep[])[] = [
  [
    { target: "drop", text: "Mulai dari gambut basah. Jatuhkan bara dan lihat apa yang terjadi.", done: (s) => triedWetness(s, "basah") },
    { target: "wetness", text: "Bara padam. Sekarang pilih gambut Kering, lalu jatuhkan lagi.", done: (s) => triedWetness(s, "kering") },
    { target: "wetness", text: "Kering langsung tersulut. Coba yang di tengah: Lembap.", done: (s) => triedWetness(s, "lembap") },
    { target: "wind", text: "Lembap belum cukup. Nyalakan angin dan jatuhkan lagi.", done: (s) => s.tried.has("lembap-berangin") },
    { target: "table", text: "Catatanmu: basah selalu padam, lembap butuh angin, kering selalu tersulut." },
    { target: "why", text: "Baca alasannya di sini. Percikan sekecil puntung sudah cukup bila gambutnya kering." },
    { target: "next", text: "Tugas selesai. Sekarang kita telusuri satu kebakaran sungguhan." },
  ],
  [
    { target: "map", text: `Ini lahan yang sudah terbakar ${CASE_LAST_DAY} hari. Tiap kotak jingga adalah 1 km² yang terlihat panas dari satelit.` },
    { target: "guess", text: "Sebelum menyelidiki, tebak dulu: api ini lahir di mana?", done: (s) => s.guessed },
    { target: "rewind", text: "Putar waktu mundur. Lihat kotak mana yang padam lebih dulu.", done: (s) => s.minDay <= Math.floor(CASE_LAST_DAY / 2) },
    { target: "rewind", text: "Teruskan sampai hari ke-0, sampai tersisa satu kotak.", done: (s) => s.minDay === 0 },
    { target: "share", text: "Bukan kebetulan. Dari ribuan kebakaran di Kalimantan, sebagian besar lahir di lahan terbuka." },
    { target: "map", text: "Klik hutan, lahan terbuka, atau kanal di peta untuk melihat alasannya.", done: (s) => s.inspected },
    { target: "next", text: "Tugas selesai. Lanjut ke babak berikutnya." },
  ],
  [
    { target: "burn", text: "Nyalakan api pembersih lahan pertama di petak dekat hutan.", done: (s) => s.burnsLit >= 1 },
    { target: "tally", text: "Api itu padam dalam sehari. Nyalakan beberapa lagi.", done: (s) => s.burnsLit >= ESCAPED_BURN_NO - 1 },
    { target: "burn", text: "Sejauh ini semuanya padam. Nyalakan satu lagi.", done: (s) => s.burnsLit >= ESCAPED_BURN_NO },
    { target: "map", text: `Yang ini lolos. Ia menyeberang ke hutan dan menyala ${Math.round(ESCAPED_DAYS)} hari.` },
    { target: "burn", text: "Nyalakan sisanya sampai sepuluh.", done: (s) => s.burnsLit >= BURNS.length },
    { target: "why", text: `Dari sepuluh api, hanya satu yang lolos. Tetapi api yang lolos menyala ±${ESCAPE_TIMES} kali lebih lama.` },
    {
      target: "next",
      text: "Gambut tidak menyala sendiri: percikan dari tangan manusia bertemu gambut kering. Di Pontianak, membuka lahan dengan membakar dilarang. Lanjut ke modul berikutnya.",
    },
  ],
];

/**
 * Arahan ke berapa (0 = pertama) tiap kartu kolom kanan mulai tampil, per
 * babak. Kartu muncul tepat saat arahan yang menunjuknya tiba, seperti
 * modul lain, supaya pembaca tidak disuguhi semuanya sekaligus.
 *   babak 01: catatan percobaan, penjelasan
 *   babak 02: hari dan luas terbakar, porsi titik sulut, ajakan klik peta
 *   babak 03: hitungan api, penjelasan
 */
export const FLOOR_FROM = [
  { table: 1, why: 2 },
  { readout: 0, share: 4, invite: 5 },
  { tally: 1, why: 5 },
] as const;

/**
 * Arahan yang sedang aktif. Syarat selesai dibaca dari nilai terjauh yang
 * pernah dicapai, jadi memutar waktu maju lagi tidak menarik arahan kembali.
 */
export function guideLevel(act: number, s: GuideState, acked: number): number {
  return sharedGuideLevel(FORENSIK_GUIDE[act], s, acked);
}
