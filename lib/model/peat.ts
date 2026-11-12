// Data dan logika murni Modul Anatomi "Anatomi Gambut".
// Dipisah dari komponen 3D agar mudah diuji dan dirujuk di naskah skripsi.

export type PeatLayerId = "fibrik" | "hemik" | "saprik" | "mineral";

export type PeatLayer = {
  id: PeatLayerId;
  name: string;
  /** Kedalaman batas atas & bawah lapisan, dalam meter dari permukaan. */
  top: number;
  bottom: number;
  summary: string;
  /** Rincian untuk kartu detail saat lapisan dipilih. */
  details: {
    /** Kadar serat tumbuhan (klasifikasi USDA Soil Taxonomy, setelah digosok). */
    fiber: string;
    color: string;
    maturity: string;
    note: string;
  };
  /** Apakah lapisan ini dapat terbakar (bahan organik). */
  combustible: boolean;
};

/**
 * Satu contoh profil gambut Kalimantan Barat, disederhanakan.
 *
 * Urutannya mengikuti inti SF61 di Kapuas Hilir (682 cm): gambut "kurang
 * terurai di dekat permukaan, makin terurai ke arah dasar" (Anshari dkk.,
 * 2026). Batas kedalaman tiap lapisan adalah ilustrasi; artikel itu tidak
 * membagi intinya menjadi fibrik, hemik, dan saprik. Di tempat lain urutannya
 * bisa berbeda: pada lahan yang dikeringkan, lapisan atas justru sering lebih
 * matang (Andriesse, 1988, §4.2.3).
 *
 * Batas kandungan serat setelah digosok mengikuti Soil Survey Staff (2014),
 * Keys to Soil Taxonomy: fibrik ≥ 3/4, saprik < 1/6, hemik di antaranya.
 */
export const PEAT_LAYERS: readonly PeatLayer[] = [
  {
    id: "fibrik",
    name: "Gambut Fibrik",
    top: 0,
    bottom: 0.6,
    summary: "Gambut mentah. Serat akar, ranting, dan daun masih utuh dan mudah dikenali.",
    details: {
      fiber: "Lebih dari 3/4 volume",
      color: "Coklat muda kemerahan",
      maturity: "Mentah (terurai sedikit)",
      note: "Paling berpori sehingga menyerap banyak air, tetapi juga paling cepat kering dan terbakar saat muka air turun.",
    },
    combustible: true,
  },
  {
    id: "hemik",
    name: "Gambut Hemik",
    top: 0.6,
    bottom: 1.6,
    summary: "Setengah matang. Sebagian serat sudah terurai menjadi massa coklat gelap.",
    details: {
      fiber: "Antara 1/6 dan 3/4 volume",
      color: "Coklat tua",
      maturity: "Setengah matang",
      note: "Peralihan antara fibrik dan saprik. Sisa tumbuhan masih terlihat sebagian di antara bahan yang sudah halus.",
    },
    combustible: true,
  },
  {
    id: "saprik",
    name: "Gambut Saprik",
    top: 1.6,
    bottom: 2.8,
    summary: "Gambut matang. Serat hampir hilang, teksturnya halus dan berwarna hitam kecoklatan.",
    details: {
      fiber: "Kurang dari 1/6 volume",
      color: "Hitam kecoklatan",
      maturity: "Matang (terurai lanjut)",
      note: "Paling padat di antara ketiganya. Bila terbakar, bara dapat bertahan lama di lapisan dalam ini.",
    },
    combustible: true,
  },
  {
    id: "mineral",
    name: "Tanah Mineral",
    top: 2.8,
    bottom: 3.4,
    summary: "Lapisan dasar berupa lempung atau pasir. Tidak mengandung bahan organik sehingga tidak terbakar.",
    details: {
      fiber: "Tidak ada (bukan gambut)",
      color: "Abu-abu hingga keputihan",
      maturity: "Tidak berlaku",
      note: "Dasar tempat gambut menumpuk. Di Kalimantan dapat berupa lempung atau pasir kuarsa.",
    },
    combustible: false,
  },
];

/** Total kedalaman profil (m). */
export const PROFILE_DEPTH = PEAT_LAYERS[PEAT_LAYERS.length - 1].bottom;

/**
 * Batas muka air tanah (cm di bawah permukaan). Menurut PP No. 57 Tahun 2016,
 * ekosistem gambut budidaya dinyatakan rusak bila muka air tanah lebih dari 0,4 m.
 */
export const WATER_LIMIT_CM = 40;

/** Mulai dari kedalaman ini status berubah menjadi "waspada". */
export const WATER_WARNING_CM = 30;

/** Rentang pengatur muka air tanah pada antarmuka (cm). */
export const WATER_MIN_CM = 0;
export const WATER_MAX_CM = 100;

export type WaterStatus = "basah" | "waspada" | "rawan";

/** Klasifikasi kondisi gambut berdasarkan kedalaman muka air tanah (cm). */
export function getWaterStatus(depthCm: number): WaterStatus {
  if (depthCm > WATER_LIMIT_CM) return "rawan";
  if (depthCm >= WATER_WARNING_CM) return "waspada";
  return "basah";
}

/**
 * Tingkat bahaya kebakaran 0–1: nol sampai batas 40 cm,
 * lalu naik linear hingga 1 pada kedalaman maksimum pengatur.
 */
export function getFireDanger(depthCm: number): number {
  if (depthCm <= WATER_LIMIT_CM) return 0;
  return Math.min(1, (depthCm - WATER_LIMIT_CM) / (WATER_MAX_CM - WATER_LIMIT_CM));
}

/**
 * Tingkat kekeringan permukaan 0–1 (untuk warna rumput & tanah atas):
 * mulai berubah di 20 cm, kering penuh di 70 cm.
 */
export function getSurfaceDryness(depthCm: number): number {
  return Math.min(1, Math.max(0, (depthCm - 20) / 50));
}

/** Lapisan pada kedalaman tertentu (m); `undefined` bila di luar profil. */
export function getLayerAtDepth(depthM: number): PeatLayer | undefined {
  if (depthM < 0) return undefined;
  return PEAT_LAYERS.find((l) => depthM >= l.top && depthM < l.bottom);
}

/** Format meter dengan koma desimal Indonesia, mis. 0.6 → "0,6". */
export function formatMeters(m: number): string {
  return m.toLocaleString("id-ID", { maximumFractionDigits: 1 });
}

/** Label kedalaman muka air, mis. 35 → "−35 cm", 0 → "0 cm". */
export function formatWaterDepth(cm: number): string {
  const v = Math.round(cm);
  return v === 0 ? "0 cm" : `−${v} cm`;
}

/**
 * Tebal bagian kering suatu lapisan (m) — yaitu bagian lapisan yang berada
 * di atas muka air tanah.
 */
export function getDryThickness(layer: PeatLayer, waterDepthM: number): number {
  return Math.max(0, Math.min(layer.bottom, waterDepthM) - layer.top);
}

// --- Penumpukan gambut dari waktu ke waktu ----------------------------------
//
// Tahap pertama modul ini semula berjalan sendiri mengikuti gulir: pembaca
// hanya menonton. Padahal justru di sinilah satu fakta terpenting gambut
// berada — ia tidak dibentuk oleh peristiwa, melainkan oleh waktu yang sangat
// panjang. Angka "ribuan tahun" pada teks tidak terasa apa-apa sampai pembaca
// sendiri yang menyeret waktunya dan melihat bongkahan itu tumbuh semilimeter
// demi semilimeter.

/** Tebal seluruh lapisan gambut, yaitu sampai batas atas tanah mineral (m). */
export const PEAT_THICKNESS = PEAT_LAYERS.find((l) => l.id === "mineral")!.top;

/**
 * Laju penumpukan gambut (mm/tahun).
 *
 * Inti SF61 di Kapuas Hilir, Kalimantan Barat, setebal 682 cm dengan umur
 * dasar 6.850–6.670 tahun kalibrasi BP (Anshari dkk., 2026, Tabel 2): rata-rata
 * ± 1,0 mm/tahun. Angka ini berada di dalam kisaran rata-rata Holosen gambut
 * Borneo, 0,54 mm/tahun di Kalimantan Tengah sampai 1,77–1,89 mm/tahun di
 * kubah pesisir dan Kutai (Dommain dkk., 2011). Lajunya tidak rata sepanjang
 * waktu; yang dipakai adalah rata-rata seluruh inti.
 *
 * Angka bulatnya juga memudahkan pembaca berhitung sendiri: satu meter gambut
 * berarti seribu tahun.
 */
export const PEAT_GROWTH_MM_PER_YEAR = 1;

/** Umur yang dibutuhkan sampai profil gambut penuh (tahun). */
export const PEAT_MAX_YEARS = Math.round((PEAT_THICKNESS * 1000) / PEAT_GROWTH_MM_PER_YEAR);

/**
 * Tebal minimum bahan organik agar suatu lahan disebut gambut (cm),
 * menurut PP No. 71 Tahun 2014.
 */
export const PEAT_MIN_THICKNESS_CM = 50;

/** Umur saat timbunan mencapai tebal minimum tersebut (tahun). */
export const PEAT_MIN_YEARS = Math.round((PEAT_MIN_THICKNESS_CM * 10) / PEAT_GROWTH_MM_PER_YEAR);

/** Tebal timbunan gambut (m) pada umur tertentu (tahun). */
export function getPeatThickness(years: number): number {
  const m = (Math.max(0, years) * PEAT_GROWTH_MM_PER_YEAR) / 1000;
  return Math.min(PEAT_THICKNESS, m);
}

export type GrowthStatus = "kosong" | "belum" | "gambut";

/**
 * Keadaan timbunan: tanah kosong, bahan organik yang belum cukup tebal, atau
 * sudah sah disebut gambut. Batas 50 cm itu bukan sekadar angka di naskah
 * peraturan — pembaca melewatinya sendiri saat menyeret waktu.
 */
export function getGrowthStatus(thicknessM: number): GrowthStatus {
  if (thicknessM <= 0.001) return "kosong";
  return isPeatland(thicknessM) ? "gambut" : "belum";
}

/** Sudah cukup tebal untuk disebut gambut? */
export function isPeatland(thicknessM: number): boolean {
  return thicknessM * 100 >= PEAT_MIN_THICKNESS_CM;
}

/**
 * Lapisan paling matang yang sudah terbentuk pada tebal tertentu.
 *
 * Mengikuti contoh profil di atas, yang makin matang ke arah dasar (inti
 * SF61, Anshari dkk., 2026). Selama timbunannya masih tipis, seluruhnya masih
 * fibrik; saprik baru muncul setelah timbunan melewati batas bawah lapisan
 * hemik. Ini sifat profil contoh itu, bukan aturan untuk semua gambut.
 */
export function getDeepestLayer(thicknessM: number): PeatLayer | undefined {
  if (thicknessM <= 0) return undefined;
  const organic = PEAT_LAYERS.filter((l) => l.combustible);
  return organic.find((l) => thicknessM <= l.bottom) ?? organic[organic.length - 1];
}

/** Format umur dengan pemisah ribuan Indonesia, mis. 2800 → "2.800". */
export function formatYears(years: number): string {
  return Math.round(years).toLocaleString("id-ID");
}
