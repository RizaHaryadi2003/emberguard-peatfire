// Jadwal dan lintasan animasi pembuka situs.
//
// Urutan: kursor berkedip → "Emberguard" diketik → titik memantul menjadi
// koma → rangkong badak masuk dari kanan, mengitari teks, menjauh → menyapu
// dari depan (kiri ke kanan) sambil menghapus teks → layar masuk ke beranda.
//
// Posisi rangkong dihitung dari titik-titik kunci berwaktu dengan kurva
// Catmull-Rom tak seragam (Barry–Goldman). Kurva ini melewati setiap titik
// kunci tepat pada waktunya dan kecepatannya bersambung mulus di setiap titik,
// jadi burung tidak pernah tersentak walau jarak antartitik berbeda-beda.

/**
 * Waktu adegan (detik). Temponya tenang dan sabar seperti acuan: kursor
 * berkedip cukup lama, huruf diketik pelan, lalu koreografi koma
 * (lib/introComma.ts) sebelum rangkong masuk.
 */
export const INTRO = {
  cursorIn: 0.5,
  typeStart: 2.1,
  /** Jeda rata-rata antarhuruf; tiap huruf diberi selisih kecil seperti orang mengetik. */
  keyGap: 0.19,
  /** Jeda sesudah koma duduk sebelum rangkong masuk. */
  holdAfterComma: 0.5,
  /** Lama layar masuk ke beranda sesudah rangkong keluar. */
  exit: 1.4,
} as const;

/** Pengali tempo terbang: 1 = tempo awal; lebih besar = lebih pelan. */
export const FLIGHT_PACE = 1.45;

/** Selisih kecil per huruf (pecahan dari keyGap) supaya ketikan tidak terasa mesin. */
const KEY_JITTER = [0.1, -0.25, 0.35, -0.1, 0.2, -0.3, 0.05, 0.4, -0.2, 0.15, -0.05, 0.3];

/** Waktu munculnya tiap huruf (detik), selalu naik. */
export function typingTimes(text: string, start: number = INTRO.typeStart, gap: number = INTRO.keyGap): number[] {
  const times: number[] = [];
  let t = start;
  for (let i = 0; i < text.length; i++) {
    times.push(t);
    t += gap * (1 + KEY_JITTER[i % KEY_JITTER.length]);
  }
  return times;
}

/** Satu titik kunci lintasan: waktu (detik sejak rangkong masuk), posisi dari pusat teks (px), dan skala. */
export type FlightKey = { t: number; x: number; y: number; s: number };

/**
 * Ukuran yang dipakai menyusun lintasan: layar, kotak teks, dan panjang
 * rangkong pada skala 1 (dari bahu ke ujung paruh dan ke ujung ekor, px).
 */
export type FlightLayout = {
  vw: number;
  vh: number;
  textW: number;
  textH: number;
  birdFront: number;
  birdBack: number;
};

/**
 * Bagian pertama terbang: masuk dari kanan, mengitari teks dengan rapat
 * (lintasan depan lebih rendah dan besar, lintasan belakang lebih tinggi dan
 * kecil seperti jauh), lalu bermanuver menjauh ke kiri atas sampai keluar layar.
 */
export function orbitKeys({ vw, textW, textH }: FlightLayout): FlightKey[] {
  const u = textW / 2;
  const h = textH;
  return [
    { t: 0.0 * FLIGHT_PACE, x: vw / 2 + 160, y: -0.85 * h, s: 1.0 },
    { t: 0.45 * FLIGHT_PACE, x: u * 1.05, y: -1.0 * h, s: 1.0 },
    { t: 0.85 * FLIGHT_PACE, x: 0, y: -0.95 * h, s: 1.05 },
    { t: 1.2 * FLIGHT_PACE, x: -u * 1.02, y: -1.3 * h, s: 0.86 },
    { t: 1.5 * FLIGHT_PACE, x: -u * 0.35, y: -1.8 * h, s: 0.66 },
    { t: 1.8 * FLIGHT_PACE, x: u * 0.45, y: -1.85 * h, s: 0.62 },
    { t: 2.1 * FLIGHT_PACE, x: u * 0.98, y: -1.45 * h, s: 0.76 },
    { t: 2.45 * FLIGHT_PACE, x: u * 0.3, y: -2.35 * h, s: 0.44 },
    { t: 2.8 * FLIGHT_PACE, x: -u * 0.8, y: -2.9 * h, s: 0.24 },
    { t: 3.05 * FLIGHT_PACE, x: -vw / 2 - 120, y: -3.2 * h, s: 0.18 },
  ];
}

/** Skala rangkong saat menyapu dari depan. */
export const SWEEP_SCALE = 3;

/**
 * Bagian kedua: rangkong kembali dari kiri, dekat ke penonton (besar), dan
 * menyapu melintasi teks sampai seluruh badannya hilang di tepi kanan.
 * Titik awal dan akhir dihitung dari panjang badan, jadi paruh belum tampak
 * saat mulai dan ekor sudah lewat tepi layar saat selesai.
 */
export function sweepKeys({ vw, textH, birdFront, birdBack }: FlightLayout): FlightKey[] {
  const s = SWEEP_SCALE;
  return [
    { t: 3.2 * FLIGHT_PACE, x: -vw / 2 - birdFront * s - 20, y: 0.2 * textH, s },
    { t: 3.85 * FLIGHT_PACE, x: 0, y: 0.05 * textH, s: s * 1.03 },
    { t: 4.5 * FLIGHT_PACE, x: vw / 2 + birdBack * s + 20, y: -0.15 * textH, s },
  ];
}

type Vec = { x: number; y: number; s: number };

const lerpVec = (a: Vec, b: Vec, ta: number, tb: number, t: number): Vec => {
  const k = tb === ta ? 0 : (t - ta) / (tb - ta);
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, s: a.s + (b.s - a.s) * k };
};

/** Posisi pada waktu `t` (dibatasi ke rentang kunci). */
export function positionAt(keys: FlightKey[], t: number): Vec {
  const n = keys.length;
  if (n === 0) return { x: 0, y: 0, s: 1 };
  if (n === 1 || t <= keys[0].t) return { x: keys[0].x, y: keys[0].y, s: keys[0].s };
  if (t >= keys[n - 1].t) return { x: keys[n - 1].x, y: keys[n - 1].y, s: keys[n - 1].s };

  let i = 0;
  while (i < n - 2 && t > keys[i + 1].t) i++;
  const p1 = keys[i];
  const p2 = keys[i + 1];
  // Titik bayangan di kedua ujung: dicerminkan agar kurva tetap lurus di sana.
  const p0 = i > 0 ? keys[i - 1] : { t: 2 * p1.t - p2.t, x: 2 * p1.x - p2.x, y: 2 * p1.y - p2.y, s: 2 * p1.s - p2.s };
  const p3 = i + 2 < n ? keys[i + 2] : { t: 2 * p2.t - p1.t, x: 2 * p2.x - p1.x, y: 2 * p2.y - p1.y, s: 2 * p2.s - p1.s };

  const a1 = lerpVec(p0, p1, p0.t, p1.t, t);
  const a2 = lerpVec(p1, p2, p1.t, p2.t, t);
  const a3 = lerpVec(p2, p3, p2.t, p3.t, t);
  const b1 = lerpVec(a1, a2, p0.t, p2.t, t);
  const b2 = lerpVec(a2, a3, p1.t, p3.t, t);
  return lerpVec(b1, b2, p1.t, p2.t, t);
}

/** Posisi beserta kecepatan (px/detik) dan laju perubahan skala (per detik), dari selisih kecil di sekitar `t`. */
export function sampleFlight(keys: FlightKey[], t: number): Vec & { vx: number; vy: number; vs: number } {
  const dt = 0.008;
  const p = positionAt(keys, t);
  const a = positionAt(keys, t - dt);
  const b = positionAt(keys, t + dt);
  return { ...p, vx: (b.x - a.x) / (2 * dt), vy: (b.y - a.y) / (2 * dt), vs: (b.s - a.s) / (2 * dt) };
}
