// Waktu sehari di Pontianak untuk pemandangan jendela Modul Kabut Asap.
//
// Pontianak terletak di garis khatulistiwa, jadi panjang siang hampir sama
// sepanjang tahun: matahari terbit sekitar pukul 05.50 WIB dan terbenam
// sekitar pukul 17.55 WIB. Semua takaran di bawah ini **ilustratif**: dipakai
// untuk cahaya, lampu kota, dan suara latar, bukan hasil pengukuran.

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Jam terbit matahari (desimal, WIB). */
export const SUNRISE_HOUR = 5.85;
/** Lama matahari di atas cakrawala (jam). */
export const DAY_LENGTH_H = 12.1;

/** Jam dibatasi ke 0–24 (24 dianggap sama dengan 0). */
export function wrapHour(hour: number): number {
  return ((hour % 24) + 24) % 24;
}

/**
 * Ketinggian matahari, −1 sampai 1: 0 tepat di cakrawala, 1 di puncak siang,
 * negatif saat malam. Di khatulistiwa matahari naik hampir tegak, jadi
 * gelombang sinus cukup mewakili.
 */
export function sunElevation(hour: number): number {
  return Math.sin((Math.PI * (wrapHour(hour) - SUNRISE_HOUR)) / DAY_LENGTH_H);
}

/** Kecerahan pemandangan 0–1: 0 malam gelap, 1 siang penuh; senja di antaranya. */
export function daylight(hour: number): number {
  return clamp01((sunElevation(hour) + 0.12) / 0.42);
}

/** Seberapa malam 0–1: 1 saat langit sudah gelap sepenuhnya (bintang tampak). */
export function nightness(hour: number): number {
  return 1 - clamp01((sunElevation(hour) + 0.22) / 0.2);
}

/**
 * Cahaya keemasan 0–1: kuat saat matahari rendah di atas cakrawala (pagi
 * dan sore), nol saat siang terik dan malam.
 */
export function goldenness(hour: number): number {
  const e = sunElevation(hour);
  if (e < -0.08) return 0;
  return clamp01((e + 0.08) / 0.1) * clamp01(1 - e / 0.32);
}

/** Interpolasi lurus pada tabel [jam, nilai] yang berulang tiap 24 jam. */
function table(points: readonly [number, number][], hour: number): number {
  const h = wrapHour(hour);
  for (let i = 0; i < points.length - 1; i++) {
    const [h0, v0] = points[i];
    const [h1, v1] = points[i + 1];
    if (h >= h0 && h <= h1) return v0 + ((v1 - v0) * (h - h0)) / (h1 - h0 || 1);
  }
  return points[points.length - 1][1];
}

/**
 * Keramaian kota 0–1 (lalu lintas, motor, klakson): sepi dini hari, puncak
 * saat berangkat sekolah dan kerja serta pulang sore.
 */
export function cityActivity(hour: number): number {
  return table(
    [
      [0, 0.12],
      [4, 0.08],
      [5.5, 0.3],
      [7, 1],
      [9, 0.75],
      [12, 0.8],
      [14, 0.7],
      [17, 1],
      [19, 0.8],
      [21, 0.5],
      [23, 0.2],
      [24, 0.12],
    ],
    hour,
  );
}

/** Paduan kicau burung 0–1: ramai saat fajar dan menjelang senja, diam malam hari. */
export function birdChorus(hour: number): number {
  return table(
    [
      [0, 0],
      [5.2, 0],
      [6, 1],
      [8, 0.75],
      [11, 0.35],
      [15, 0.4],
      [17.4, 0.9],
      [18.3, 0],
      [24, 0],
    ],
    hour,
  );
}

/** Bagian lampu kota yang menyala 0–1 (jendela gedung, rumah, jalan). */
export function lightsOn(hour: number): number {
  return clamp01(nightness(hour) * 1.2 + (1 - daylight(hour)) * 0.3) * table(
    [
      [0, 0.45],
      [4, 0.35],
      [6, 0.6],
      [18, 1],
      [21, 0.9],
      [24, 0.45],
    ],
    hour,
  );
}

/** "08.00" dari 8; menit dibulatkan ke 15 menit terdekat. */
export function formatHour(hour: number): string {
  const total = Math.round((wrapHour(hour) * 60) / 15) * 15;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}.${String(m).padStart(2, "0")}`;
}

/** "08.00" → 8. */
export function parseHour(text: string): number {
  const [h, m] = text.split(".").map(Number);
  return h + (m || 0) / 60;
}

export type DayPart = "dini" | "pagi" | "siang" | "sore" | "malam";

/** Sebutan bagian hari dalam percakapan sehari-hari. */
export function dayPart(hour: number): DayPart {
  const h = wrapHour(hour);
  if (h < 4) return "dini";
  if (h < 10.5) return "pagi";
  if (h < 15) return "siang";
  if (h < 18.5) return "sore";
  return "malam";
}
