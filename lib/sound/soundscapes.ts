// Racikan suara alam tiap modul: menerjemahkan keadaan simulasi menjadi
// takaran lapisan suara (`AmbientMix`, 0–1) untuk `AmbientEngine`.
//
// Bagian ini murni (tanpa Web Audio), jadi dapat diuji. Prinsipnya sama
// untuk semua modul: suara ikut menceritakan keadaan lahannya. Gambut basah
// terdengar hidup (burung, katak, serangga, air); makin kering, makhluknya
// makin sunyi dan angin makin kering; saat terbakar, yang tersisa derak bara.
// Takarannya ilustratif, bukan hasil pengukuran bunyi.

import { birdChorus, cityActivity, daylight } from "@/lib/model/daylight";

export type AmbientMix = {
  /** Angin. */
  wind: number;
  /** Air mengalir atau beriak (sungai, parit, genangan). */
  water: number;
  /** Hujan; di atas 0,6 disertai guntur. */
  rain: number;
  /** Tonggeret dan serangga siang. */
  insects: number;
  /** Katak. */
  frogs: number;
  /** Kicau burung. */
  birds: number;
  /** Gemuruh dan derak api. */
  fire: number;
  /** Kota: dengung lalu lintas, motor yang lewat, klakson di kejauhan. */
  city?: number;
  /** Mesin perahu klotok di sungai. */
  boat?: number;
};

export const SILENT_MIX: AmbientMix = { wind: 0, water: 0, rain: 0, insects: 0, frogs: 0, birds: 0, fire: 0 };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Jumlah derak bara per detik untuk takaran api 0–1. */
export function crackleRate(fire: number): number {
  return fire <= 0 ? 0 : 2 + clamp01(fire) * 26;
}

/** Kicau burung per detik pada takaran 0–1. */
/** Motor yang lewat per detik pada takaran kota 0–1. */
export function passByRate(city: number): number {
  return 0.45 * clamp01(city);
}

/** Klakson per detik pada takaran kota 0–1. */
export function hornRate(city: number): number {
  return 0.09 * clamp01(city);
}

export function birdRate(birds: number): number {
  return 0.45 * clamp01(birds);
}

/** Suara katak per detik pada takaran 0–1. */
export function frogRate(frogs: number): number {
  return 0.8 * clamp01(frogs);
}

/**
 * Seberapa banyak makhluk yang masih bersuara saat bahaya kebakaran
 * `danger` (0–1): penuh saat aman, sunyi begitu asap mulai tebal (≥ 0,35).
 */
export function lifeUnderSmoke(danger: number): number {
  return clamp01(1 - danger / 0.35);
}

/**
 * Hutan gambut menurut tingkat bahaya kebakaran: dasar racikan Anatomi dan
 * Bara. Aman = hutan hidup; makin bahaya, angin naik, makhluk diam, api
 * terdengar.
 */
export function peatForestMix(danger: number): AmbientMix {
  const d = clamp01(danger);
  const life = lifeUnderSmoke(d);
  return {
    wind: 0.5 + d * 0.3,
    water: 0.25 * (1 - d),
    rain: 0,
    insects: 0.35 * life + 0.1,
    frogs: 0.3 * life,
    birds: life,
    fire: d,
  };
}

/** Modul Gambut di Sekitarmu: tepi Sungai Kapuas; babak 04 (titik api) berbau asap. */
export function sekitarmuMix(act: number): AmbientMix {
  const smoky = act >= 3;
  return {
    wind: 0.4,
    water: 0.45,
    rain: 0,
    insects: smoky ? 0.15 : 0.25,
    frogs: smoky ? 0.05 : 0.15,
    birds: smoky ? 0.25 : 0.6,
    fire: smoky ? 0.12 : 0,
  };
}

/** Modul Hutan Rawa Gambut: hutan basah; banjir dan hujan menambah air dan katak. */
export function hutanRawaMix(s: { flood: boolean; rain: boolean }): AmbientMix {
  return {
    wind: 0.3,
    water: s.flood ? 0.8 : 0.35,
    rain: s.rain ? 0.55 : 0,
    insects: 0.55,
    frogs: s.flood || s.rain ? 0.8 : 0.45,
    birds: s.rain ? 0.3 : 0.7,
    fire: 0,
  };
}

/**
 * Modul Kanal: air parit mengalir selama kanal terbuka, makin deras makin
 * dalam kanalnya; sekat menenangkannya. Lahan yang kering (`dryness` 0–1)
 * kehilangan katak dan burungnya.
 */
export function kanalMix(s: { canalDepthCm: number; maxDepthCm: number; blocked: boolean; dryness: number }): AmbientMix {
  const depth = clamp01(s.canalDepthCm / s.maxDepthCm);
  const dry = clamp01(s.dryness);
  return {
    wind: 0.35 + dry * 0.25,
    water: s.canalDepthCm <= 0 ? 0.1 : s.blocked ? 0.15 : 0.3 + depth * 0.6,
    rain: 0,
    insects: 0.25 + dry * 0.35,
    frogs: 0.45 * (1 - dry),
    birds: 0.65 * (1 - dry * 0.7),
    fire: 0,
  };
}

/**
 * Modul Musim Api: hujan hari itu (mm/hari) terdengar langsung; kemarau
 * (`dryness` 0–1) membawa angin kering dan tonggeret; api menyusul saat air
 * gambut melewati ambang (`fire` dari `fireLevel`).
 */
export function musimApiMix(s: { rainMmDay: number; dryness: number; fire: number }): AmbientMix {
  const rain = clamp01(s.rainMmDay / 25);
  const dry = clamp01(s.dryness);
  const life = lifeUnderSmoke(s.fire);
  return {
    wind: 0.3 + dry * 0.35,
    water: 0.3 * (1 - dry),
    rain,
    insects: (0.2 + dry * 0.5) * (0.4 + 0.6 * life),
    frogs: Math.max(rain, 0.3 * (1 - dry)) * life,
    birds: (rain > 0.5 ? 0.25 : 0.6) * life,
    fire: clamp01(s.fire),
  };
}

/**
 * Modul Karbon: hutan utuh sebelum dibakar, derak api selama gambut sedang
 * habis terbakar (`burning` 0–1), sunyi sesudahnya, lalu makhluknya kembali
 * mengikuti tumbuhnya tumbuhan (`recovery` 0–1).
 */
export function karbonMix(s: { burning: number; burnt: boolean; recovery: number }): AmbientMix {
  if (!s.burnt) return peatForestMix(0);
  const life = clamp01(s.recovery);
  const burning = clamp01(s.burning);
  return {
    wind: 0.65 - life * 0.2,
    water: 0.1 * life,
    rain: 0,
    insects: 0.05 + 0.35 * life,
    frogs: 0.25 * life * (1 - burning),
    birds: life * (1 - burning),
    fire: Math.max(burning, 0.08 * (1 - life)),
  };
}

/**
 * Modul Forensik Api. Babak 01: lahan terbuka yang sepi; angin terdengar saat
 * dinyalakan, dan derak kecil saat bara masuk ke gambut. Babak 02–03: lanskap
 * dari atas; api terdengar sebanding dengan kotak yang masih panas (`fire`).
 */
export function forensikMix(s: { act: number; windy: boolean; fire: number }): AmbientMix {
  const fire = clamp01(s.fire);
  if (s.act === 0)
    return { wind: s.windy ? 0.75 : 0.2, water: 0, rain: 0, insects: 0.35, frogs: 0, birds: 0.2, fire: fire * 0.35 };
  return peatForestMix(fire * 0.8);
}

/**
 * Modul Kabut Asap. Babak 02 adalah jendela di tepi Kapuas, jadi yang
 * terdengar suara kota: dengung lalu lintas dan motor yang ramai saat jam
 * berangkat dan pulang, mesin klotok di sungai, burung saat fajar dan
 * senja, jangkrik dan katak di malam hari. Makin pekat kabutnya (`haze`
 * 0–1), kota makin lengang (orang diminta tetap di dalam rumah) dan
 * burung makin sunyi. Takaran ilustratif.
 */
export function kabutAsapMix(s: { act: number; haze: number; hour?: number }): AmbientMix {
  const h = clamp01(s.haze);
  if (s.act === 0) return { ...SILENT_MIX, wind: 0.12 };
  if (s.act === 2) return { wind: 0.25 + 0.3 * h, water: 0.4, rain: 0, insects: 0.25 * (1 - h), frogs: 0, birds: 0.6 * (1 - h) ** 2, fire: 0 };
  const hour = s.hour ?? 8;
  const day = daylight(hour);
  const quiet = 1 - 0.45 * h;
  return {
    wind: 0.1 + 0.3 * h,
    water: 0.15,
    rain: 0,
    insects: (0.06 + 0.5 * (1 - day)) * (1 - 0.5 * h),
    frogs: 0.4 * (1 - day) * (1 - 0.5 * h),
    birds: birdChorus(hour) * (1 - h) ** 2,
    fire: 0,
    city: (0.15 + 0.85 * cityActivity(hour)) * quiet,
    boat: (0.1 + 0.5 * day) * quiet,
  };
}
