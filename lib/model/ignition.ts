// Model Modul 06 · Forensik Api.
// Semua angka berasal dari docs/md/acuan-modul/acuan-modul-forensik-api.md:
//   Lin dkk. (2024)    — ambang sulut gambut oleh satu bara kecil (babak 01)
//   Cattau dkk. (2016) — letak titik sulut dan api yang lolos (babak 02–03)

/* ============================================================================
 *  BABAK 01 · PERCIKAN — apakah satu bara kecil menyulut gambut?
 * ========================================================================== */

/**
 * Di bawah kadar air ini gambut selalu tersulut oleh satu bara, walau tanpa
 * angin (Lin dkk., 2024: 35 ± 5 %). Kadar air dihitung terhadap berat kering.
 */
export const ALWAYS_IGNITES_MC = 35;

/** Di atas kadar air ini gambut tidak pernah tersulut, walau angin > 1 m/s (Lin dkk., 2024: 85 ± 5 %). */
export const NEVER_IGNITES_MC = 85;

/**
 * Angin terkecil (m/s) yang membuat bara menyulut gambut berkadar air `mc`.
 *
 * Lin dkk. (2024) mencatat ±0,1 m/s pada kadar air 40 % dan ±0,9 m/s pada
 * 80 %, yaitu naik 0,02 m/s untuk tiap 1 % kadar air. Garis lurus melalui
 * kedua titik itu tepat bernilai 0 di 35 % dan 1 m/s di 85 %, sehingga
 * menyambung dengan kedua batas di atas.
 * Mengembalikan `null` bila gambut terlalu basah untuk tersulut.
 */
export function minWindToIgnite(mc: number): number | null {
  if (mc > NEVER_IGNITES_MC) return null;
  if (mc < ALWAYS_IGNITES_MC) return 0;
  return (mc - ALWAYS_IGNITES_MC) * 0.02;
}

/** Apakah satu bara kecil menyulut gambut berkadar air `mc` pada angin `windMs`. */
export function ignites(mc: number, windMs: number): boolean {
  const need = minWindToIgnite(mc);
  return need !== null && windMs >= need;
}

/** Tiga keadaan gambut yang bisa dipilih pembaca. */
export type Wetness = "basah" | "lembap" | "kering";

/**
 * Kadar air wakil tiap keadaan (%, berat kering). Masing-masing dipilih di
 * tengah satu wilayah Lin dkk. (2024), bukan angka ukur lapangan.
 */
export const WETNESS_MC: Record<Wetness, number> = { basah: 100, lembap: 60, kering: 25 };

/** Dua pilihan angin: tenang dan berangin 1 m/s (angin terkuat yang diuji Lin dkk.). */
export const WIND_MS = { tenang: 0, berangin: 1 } as const;
export type Wind = keyof typeof WIND_MS;

/** Hasil menjatuhkan bara pada satu pasangan keadaan. */
export type SparkResult = "padam" | "menyala";

export function dropSpark(wetness: Wetness, wind: Wind): SparkResult {
  return ignites(WETNESS_MC[wetness], WIND_MS[wind]) ? "menyala" : "padam";
}

/* ============================================================================
 *  ANGKA CATTAU DKK. (2016) — ditampilkan apa adanya, tidak disimulasikan
 * ========================================================================== */

/** Porsi titik sulut per kelas lahan, 2000–2010 (Tabel 1, metode ketetanggaan, %). */
export const IGNITION_SHARE = { terbuka: 71.2, kebun: 17.0, hutan: 8.8 } as const;

/** Porsi titik sulut dalam 5 km dari kampung (Tabel 1, %). Tumpang tindih dengan kelas di atas. */
export const NEAR_VILLAGE_SHARE = 9.1;

/** Kerapatan titik sulut per km² per tahun (Tabel 1). */
export const IGNITION_DENSITY = { terbuka: 0.06, kebun: 0.055, hutan: 0.006 } as const;

/** Porsi api yang hanya menyala satu hari (§3.1, %). */
export const ONE_DAY_SHARE = 80;

/** Porsi api dari kebun sawit yang lolos keluar batasnya (Tabel 3, %). */
export const ESCAPE_SHARE = 10.5;

/** Lama menyala rata-rata (hari): api yang lolos vs yang tetap di petaknya (Tabel 4, kebun sawit). */
export const ESCAPED_DAYS = 6.7;
export const STAYED_DAYS = 1.6;

/** Porsi titik api berdampak besar di hutan yang berasal dari api lahan terbuka (Tabel 2, %). */
export const FOREST_FIRE_FROM_OPEN = 56.7;

/* ============================================================================
 *  LANSKAP — peta satelit babak 02 dan 03
 * ========================================================================== */

/**
 * Satu sel peta = 1 km × 1 km, sebesar satu piksel titik api MODIS yang dipakai
 * Cattau dkk. (2016). Lanskapnya **ilustratif**: tata letaknya mengikuti
 * gambaran wilayah studi (kampung di tepi sungai, kebun, lahan terbuka
 * berkanal, hutan di seberang), bukan peta lokasi sungguhan.
 */
export const GRID_W = 24;
export const GRID_H = 16;

export type Land = "sungai" | "kampung" | "kebun" | "terbuka" | "hutan";

/** Kolom sungai di sisi kiri peta. */
const RIVER_X = 1;
/** Baris kanal yang membelah lahan terbuka. */
export const CANAL_Y = 5;
const CANAL_FROM_X = 3;
const CANAL_TO_X = 17;

/** Batas hutan di kanan peta, dibuat berkelok supaya tidak tampak lurus. */
function forestEdge(y: number): number {
  return 15 + ((y * 7) % 3) - 1;
}

/** Jenis lahan di sel (x, y). */
export function landAt(x: number, y: number): Land {
  if (x === RIVER_X) return "sungai";
  if (x >= 2 && x <= 3 && y >= 6 && y <= 9) return "kampung";
  if (x >= 2 && x <= 8 && y >= 11) return "kebun";
  if (x >= forestEdge(y)) return "hutan";
  return "terbuka";
}

/** Apakah sel (x, y) dilalui kanal. */
export function isCanal(x: number, y: number): boolean {
  return y === CANAL_Y && x >= CANAL_FROM_X && x <= CANAL_TO_X;
}

/** Jarak (km) dari sel ke sel kampung terdekat, diukur antartitik tengah sel. */
export function kmFromVillage(x: number, y: number): number {
  let best = Infinity;
  for (let vy = 0; vy < GRID_H; vy++)
    for (let vx = 0; vx < GRID_W; vx++)
      if (landAt(vx, vy) === "kampung") best = Math.min(best, Math.hypot(x - vx, y - vy));
  return best;
}

/** Bilangan acak berbenih tetap (mulberry32), supaya api selalu menjalar sama. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Peluang api menyeberang ke sel tetangga dalam sehari, per jenis lahan.
 * **Ilustratif**: hanya urutannya yang bersumber (hutan basah paling sulit
 * terbakar, Cattau dkk. 2016 §4); sungai dan kampung tidak terbakar.
 */
const SPREAD_P: Record<Land, number> = { terbuka: 0.4, kebun: 0.3, hutan: 0.3, kampung: 0, sungai: 0 };

/** Satu sel yang terbakar: letaknya dan hari pertama ia terlihat dari satelit. */
export type Detection = { x: number; y: number; day: number };

/** Titik sulut kasus babak 02: lahan terbuka di tepi kanal, ±8 km dari kampung. */
export const CASE_IGNITION = { x: 11, y: 6 } as const;

/** Lama kasus babak 02 (hari). */
export const CASE_DAYS = 10;

/**
 * Jalannya satu kebakaran: dari titik sulut, setiap hari api bisa menyeberang
 * ke empat sel tetangganya. Hasilnya diurutkan menurut hari, jadi memutar
 * waktu mundur cukup memotong daftar ini.
 */
export function spreadFire(
  start: { x: number; y: number } = CASE_IGNITION,
  days: number = CASE_DAYS,
  seed = 2026,
): Detection[] {
  const rand = seeded(seed);
  const dayOf = new Map<string, number>([[`${start.x},${start.y}`, 0]]);
  let front: { x: number; y: number }[] = [start];
  for (let day = 1; day <= days; day++) {
    const next: { x: number; y: number }[] = [];
    for (const c of front) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const x = c.x + dx;
        const y = c.y + dy;
        if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H || dayOf.has(`${x},${y}`)) continue;
        if (rand() < SPREAD_P[landAt(x, y)]) {
          dayOf.set(`${x},${y}`, day);
          next.push({ x, y });
        }
      }
    }
    // Sel yang belum berhasil menyeberang tetap menyala dan mencoba lagi besok.
    front = [...front.filter(() => rand() < 0.5), ...next];
    if (front.length === 0) break;
  }
  return [...dayOf.entries()]
    .map(([k, day]) => {
      const [x, y] = k.split(",").map(Number);
      return { x, y, day };
    })
    .sort((a, b) => a.day - b.day || a.y - b.y || a.x - b.x);
}

/** Sel yang sudah terlihat terbakar sampai hari `day`. */
export function detectionsUntil(fire: readonly Detection[], day: number): Detection[] {
  return fire.filter((d) => d.day <= day);
}

/** Jumlah sel terbakar per jenis lahan. */
export function burnedByLand(fire: readonly Detection[]): Record<Land, number> {
  const out: Record<Land, number> = { sungai: 0, kampung: 0, kebun: 0, terbuka: 0, hutan: 0 };
  for (const d of fire) out[landAt(d.x, d.y)]++;
  return out;
}

/* ============================================================================
 *  BABAK 03 · API YANG LOLOS — sepuluh api pembersih lahan
 * ========================================================================== */

/** Satu api pembersih lahan: berapa hari menyala dan apakah lolos ke hutan. */
export type Burn = { days: number; escaped: boolean };

/**
 * Sepuluh api pembersih lahan berurutan, ditulis tetap agar mengikuti
 * Cattau dkk. (2016): 8 dari 10 padam dalam sehari (80 %), 1 dari 10 lolos
 * (±10 %), dan yang lolos menyala jauh lebih lama (±7 hari). Api yang lolos
 * sengaja diletakkan ketujuh supaya pembaca sempat melihat api yang padam
 * lebih dulu.
 */
export const BURNS: readonly Burn[] = [
  { days: 1, escaped: false },
  { days: 1, escaped: false },
  { days: 1, escaped: false },
  { days: 2, escaped: false },
  { days: 1, escaped: false },
  { days: 1, escaped: false },
  { days: 7, escaped: true },
  { days: 1, escaped: false },
  { days: 1, escaped: false },
  { days: 1, escaped: false },
];

/** Ringkasan api yang sudah dinyalakan pembaca (`n` api pertama). */
export function burnTally(n: number): { lit: number; out1Day: number; escaped: number } {
  const done = BURNS.slice(0, Math.max(0, Math.min(n, BURNS.length)));
  return {
    lit: done.length,
    out1Day: done.filter((b) => !b.escaped && b.days === 1).length,
    escaped: done.filter((b) => b.escaped).length,
  };
}
