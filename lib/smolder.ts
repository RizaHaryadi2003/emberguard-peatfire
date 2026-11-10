// Model perambatan bara gambut (smouldering) untuk Modul 02 "Bara di Bawah Tanah".
//
// Bara gambut bukan api yang menyala di permukaan: ia membakar bahan organik
// pelan-pelan di dalam tanah, tanpa lidah api, pada suhu jauh lebih rendah
// daripada api nyala, dan dapat bertahan berminggu-minggu. Karena itu modelnya
// dibuat sebagai sel-otomata (cellular automaton) dua dimensi pada bidang
// penampang: sumbu x menyusuri lebar bongkahan, sumbu y menurun ke kedalaman.
//
// Semua besaran dinyatakan dalam satuan nyata (meter dan jam) sehingga angka
// yang muncul di antarmuka — kedalaman bara, laju rambat, hari ke-berapa —
// dapat dibaca langsung. Kadar air dan laju rambatnya dikalibrasi terhadap
// pengukuran lapangan di Kalimantan Tengah (Usup dkk., 2004) dan ambang bara
// Frandsen; rinciannya ada di docs/md/acuan-modul-02.md. Sisanya, seperti arah
// rambat dan besar penurunan permukaan, adalah asumsi model.
//
// Berkas ini murni logika (tanpa three.js maupun React) agar dapat diuji
// otomatis dan dirujuk sebagai algoritma pada naskah skripsi.

import { getLayerAtDepth, PROFILE_DEPTH, type PeatLayerId } from "./peat";
import { seeded } from "./random";
import { BLOCK_WIDTH } from "@/components/gambut/scene/dioramaConstants";

/** Ukuran kisi sel pada bidang penampang. */
export const GRID_COLS = 96;
export const GRID_ROWS = 56;

/** Ukuran satu sel (m). */
export const CELL_W = BLOCK_WIDTH / GRID_COLS;
export const CELL_H = PROFILE_DEPTH / GRID_ROWS;

/** Keadaan satu sel: utuh. */
export const CELL_INTACT = 0;
/** Sedang membara (bahan organik terbakar tanpa nyala). */
export const CELL_SMOLDER = 1;
/** Sudah habis menjadi abu; meninggalkan rongga di bawah permukaan. */
export const CELL_ASH = 2;
/** Pernah membara lalu padam oleh air; menghitam tetapi tidak habis. */
export const CELL_QUENCHED = 3;

export type CellState = typeof CELL_INTACT | typeof CELL_SMOLDER | typeof CELL_ASH | typeof CELL_QUENCHED;

/** Batas antara bara gambut permukaan dan bara gambut dalam (m); Usup dkk. (2004). */
export const SURFACE_PEAT_DEPTH = 0.2;

/** Laju rambat mendatar rata-rata yang terukur (cm/jam); Usup dkk. (2004), Tabel 3. */
export const MEASURED_SPREAD_CM_PER_HOUR = { surface: 3.83, deep: 1.29 };

/**
 * Sifat bakar menurut kedalaman, mengikuti pembagian Usup dkk. (2004).
 * - `burnHours`: lama satu sel habis terbakar (jam). Permukaan mengikuti suhu
 *   yang bertahan 4–5 jam (Usup dkk.); dalam mengikuti 12–17 jam pada
 *   Santoso dkk. (2022).
 * - `spreadPerHour`: peluang menyalakan sel tetangga tiap jam, dikalibrasi agar
 *   laju yang terbentuk sama dengan `MEASURED_SPREAD_CM_PER_HOUR`.
 */
export const ZONE_BURN = {
  surface: { burnHours: 5, spreadPerHour: 0.75 },
  deep: { burnHours: 14, spreadPerHour: 0.28 },
};

/**
 * Kadar air gambut dalam fraksi berat kering (1 berarti 100%). Nilainya dari
 * profil yang diukur Usup dkk. (2004), Gbr. 12: permukaan ± 100%, kedalaman
 * 10–40 cm ± 120%, dan lebih dalam lagi melonjak ke ± 220%.
 */
export const MOISTURE_DRIEST = 1;
export const MOISTURE_UNSATURATED = 1.2;
export const MOISTURE_SATURATED = 2.2;

/**
 * Di atas ambang ini gambut tidak dapat dinyalakan dan bara yang sudah ada akan
 * padam. Frandsen (1987) memberi 110% untuk gambut umumnya dan 130% untuk
 * permukaan hutan rawa gambut (dalam Usup dkk., 2004). Dipakai 130%, karena
 * bara memang teramati hidup pada kadar air ± 120%.
 */
export const MOISTURE_LIMIT = 1.3;

/** Kedalaman lapisan paling atas yang lebih kering daripada di bawahnya (m). */
const DRY_TOP_DEPTH = 0.1;

/**
 * Tebal zona di atas muka air tanah yang masih dibasahi air tanah (m). Pada
 * profil Usup kadar air melonjak mulai 40 cm; dengan muka air terendah ± 95 cm,
 * zona itu setebal ± 55 cm.
 */
export const CAPILLARY_RISE = 0.55;

/** Lama bara bertahan dalam keadaan terlalu lembap sebelum padam (jam). */
export const QUENCH_HOURS = 3;

/** Progres bakar minimum sebelum satu sel mampu menyalakan tetangganya. */
const IGNITE_THRESHOLD = 0.1;

/** Bobot arah penyalaan. Yang mendatar sudah terkalibrasi; yang lain asumsi model. */
const SPREAD_WEIGHT = { down: 0.6, side: 1, up: 0.3 };

/**
 * Pengali peluang bara permukaan masuk ke lapisan dalam. Usup dkk. mencatat api
 * permukaan bergerak zig-zag mencari tempat yang cocok untuk turun, jadi tidak
 * semua titik permukaan menjadi bara dalam.
 */
const DEEP_ENTRY = 0.04;

/** Lebar bagian tanah yang tidak dilewati bara permukaan (m), asumsi model. */
const ROOF_WIDTH = 0.5;

/** Letak tengah bagian itu pada lebar bongkahan (0–1), asumsi model. */
const ROOF_AT = [0.27, 0.73];

/** Bagian kolom yang harus berongga di bawahnya sebelum atap runtuh (0–1), asumsi model. */
const ROOF_COLLAPSE_SHARE = 0.7;

/** Baris teratas yang dianggap sudah muncul di permukaan. */
const RESURFACE_ROWS = 2;

/**
 * Atap tanah. Usup dkk. (2004, hlm. 12–13) mencatat api sering membakar di bawah
 * dan menyisakan bagian atas yang bisa runtuh, lalu muncul lagi menjadi api baru,
 * dan menyebut kadar air serta susunan bahan bakar sebagai penentunya. Bagian
 * ini mewakili tempat yang tidak dilewati bara permukaan, sehingga bara hanya
 * dapat menyeberang lewat lapisan dalam.
 */
const ROOF_COLS = Math.round(ROOF_WIDTH / CELL_W);
const ROOFS = ROOF_AT.map((fraction) => {
  const from = Math.round(fraction * GRID_COLS - ROOF_COLS / 2);
  return { from, to: from + ROOF_COLS - 1 };
});
/** Nomor atap tiap kolom; -1 bila bukan atap. */
const ROOF_OF_COL = Array.from({ length: GRID_COLS }, (_, col) => ROOFS.findIndex((r) => col >= r.from && col <= r.to));
/** Nomor ruas tiap kolom, dipisahkan oleh atap-atap itu. */
const SEGMENT_OF_COL = Array.from({ length: GRID_COLS }, (_, col) => ROOFS.filter((r) => r.to < col).length);

/**
 * Bagian volume yang hilang saat gambut menjadi abu. Rongga inilah yang
 * membuat permukaan gambut turun (subsiden) dan kadang ambruk.
 */
const SUBSIDENCE_FACTOR = 0.62;

/** Langkah waktu simulasi (jam). Tetap, agar hasilnya tidak bergantung fps. */
export const STEP_HOURS = 0.25;

/** Lama pengaruh penyiraman permukaan sampai airnya menguap habis (jam). */
export const DOUSE_DECAY_HOURS = 60;

/** Kedalaman yang benar-benar tersentuh air siraman dari permukaan (m). */
export const DOUSE_DEPTH = 0.25;

/** Kedalaman bara yang asapnya masih terlihat di permukaan (m). */
export const VISIBLE_SMOKE_DEPTH = 0.55;

export type SmolderStats = {
  /** Waktu simulasi yang sudah berjalan (jam). */
  hours: number;
  /**
   * Lama gambut benar-benar membara (jam): hanya jam-jam yang pada awalnya
   * masih ada sel membara yang dihitung.
   *
   * Dipisahkan dari `hours` karena keduanya berbeda arti. Waktu simulasi terus
   * berjalan selama pengatur kecepatan tidak dihentikan, juga setelah bara
   * padam — dan pada babak 04 pembaca justru memadamkannya lalu membiarkan
   * waktu berjalan untuk memastikan baranya tidak hidup lagi. Kartu penutup
   * dahulu menampilkan `hours` di bawah label "Lama menyala", sehingga angka
   * itu terus bertambah padahal tidak ada lagi yang menyala.
   */
  burningHours: number;
  /** Jumlah sel yang sedang membara. */
  active: number;
  /** Kedalaman bara terdalam (m); 0 bila tidak ada bara. */
  frontDepth: number;
  /** Kedalaman rata-rata bara yang sedang aktif (m). */
  meanDepth: number;
  /** Lebar daerah yang sudah terbakar dari ujung ke ujung (m). */
  burnedWidth: number;
  /** Laju rambat mendatar rata-rata sejauh ini (cm/hari). */
  spreadCmPerDay: number;
  /** Bagian bahan organik yang sudah habis terbakar (0–1). */
  consumed: number;
  /** Kekuatan asap yang terlihat dari permukaan (0–1). */
  surfaceSmoke: number;
  /** Masih ada bara hidup di bawah tanah. */
  alive: boolean;
  /** Bara pernah ada lalu padam seluruhnya. */
  extinguished: boolean;
  /** Penurunan permukaan terdalam akibat rongga abu (m). */
  maxSubsidence: number;
  /** Posisi atap tanah terakhir yang runtuh (m); `null` bila belum ada. */
  collapseX: number | null;
  /** Posisi bara terakhir yang muncul lagi di permukaan (m); `null` bila belum ada. */
  resurfaceX: number | null;
};

function emptyStats(): SmolderStats {
  return {
    hours: 0,
    burningHours: 0,
    active: 0,
    frontDepth: 0,
    meanDepth: 0,
    burnedWidth: 0,
    spreadCmPerDay: 0,
    consumed: 0,
    surfaceSmoke: 0,
    alive: false,
    extinguished: false,
    maxSubsidence: 0,
    collapseX: null,
    resurfaceX: null,
  };
}

/**
 * Simulasi bara bawah tanah pada satu bidang penampang.
 *
 * Pemakaian: `advance(jam)` dipanggil dari `useFrame`, `writeField()` mengisi
 * data untuk tekstur yang dibaca peneduh (shader), dan `stats` dibaca antarmuka.
 */
export class SmolderSim {
  readonly state: Uint8Array;
  /** Progres bakar tiap sel (0–1). */
  readonly progress: Float32Array;
  /** Sisa bahan bakar tiap sel (0–1); tanah mineral selalu 0. */
  readonly fuel: Float32Array;
  /** Kelembapan tiap sel (0–1), dihitung ulang setiap kali keadaan air berubah. */
  readonly moisture: Float32Array;
  /** Lama sel membara dalam keadaan terlalu lembap (jam). */
  private readonly wetTime: Float32Array;
  /** Lapisan gambut tiap baris. */
  private readonly rowLayer: PeatLayerId[];
  /** Baris yang termasuk bara gambut dalam. */
  private readonly rowDeep: boolean[];
  /**
   * Penampung sel penyebar, dialokasikan sekali seumur hidup simulasi.
   * Dipakai ulang tiap langkah agar tidak ada sampah memori yang menumpuk —
   * pada kecepatan waktu tertinggi `step()` dipanggil puluhan kali per bingkai.
   */
  private readonly spreaders: Int32Array;

  private rand: () => number;
  private carry = 0;
  private waterTable = 0.85;
  private douse = 0;
  private everBurned = false;
  /** Ruas yang permukaannya sudah pernah disentuh bara. */
  private readonly segmentLit = new Uint8Array(ROOFS.length + 1);
  /** Atap yang sudah runtuh. */
  private readonly roofFallen = new Uint8Array(ROOFS.length);
  private collapseX: number | null = null;
  private resurfaceX: number | null = null;

  stats: SmolderStats = emptyStats();

  /**
   * Bertambah setiap kali kisi berubah di luar langkah waktu (diulang atau
   * disulut). Saat waktu berhenti tidak ada langkah yang memberi tahu adegan,
   * jadi tanpa ini gambar penampang lama tetap tampil.
   */
  revision = 0;

  constructor(seed = 1337) {
    const n = GRID_COLS * GRID_ROWS;
    this.state = new Uint8Array(n);
    this.progress = new Float32Array(n);
    this.fuel = new Float32Array(n);
    this.moisture = new Float32Array(n);
    this.wetTime = new Float32Array(n);
    this.spreaders = new Int32Array(n);
    this.rowLayer = Array.from({ length: GRID_ROWS }, (_, row) => {
      const layer = getLayerAtDepth((row + 0.5) * CELL_H);
      return layer ? layer.id : "mineral";
    });
    this.rowDeep = Array.from({ length: GRID_ROWS }, (_, row) => (row + 0.5) * CELL_H >= SURFACE_PEAT_DEPTH);
    this.rand = seeded(seed);
    this.reset(seed);
  }

  /** Kedalaman pusat baris `row` (m di bawah permukaan). */
  depthOfRow(row: number): number {
    return (row + 0.5) * CELL_H;
  }

  /** Posisi mendatar pusat kolom `col` (m, 0 di tengah bongkahan). */
  xOfCol(col: number): number {
    return (col + 0.5) * CELL_W - BLOCK_WIDTH / 2;
  }

  index(col: number, row: number): number {
    return row * GRID_COLS + col;
  }

  /** Lapisan gambut pada baris `row`. */
  layerOfRow(row: number): PeatLayerId {
    return this.rowLayer[Math.max(0, Math.min(GRID_ROWS - 1, row))];
  }

  /** Kembalikan seluruh kisi ke keadaan utuh. */
  reset(seed = 1337): void {
    this.revision++;
    this.rand = seeded(seed);
    this.carry = 0;
    this.douse = 0;
    this.everBurned = false;
    this.segmentLit.fill(0);
    this.roofFallen.fill(0);
    this.collapseX = null;
    this.resurfaceX = null;
    this.state.fill(CELL_INTACT);
    this.progress.fill(0);
    this.wetTime.fill(0);
    for (let row = 0; row < GRID_ROWS; row++) {
      // Bahan bakar sedikit beragam antar-sel agar tepi daerah bakar tidak rata.
      const organic = this.rowLayer[row] !== "mineral";
      for (let col = 0; col < GRID_COLS; col++) {
        this.fuel[this.index(col, row)] = organic ? 0.82 + this.rand() * 0.18 : 0;
      }
    }
    this.stats = emptyStats();
    this.updateMoisture();
  }

  /** Setel kedalaman muka air tanah (m di bawah permukaan). */
  setWaterTable(depthM: number): void {
    this.waterTable = Math.max(0, Math.min(PROFILE_DEPTH, depthM));
    this.updateMoisture();
  }

  getWaterTable(): number {
    return this.waterTable;
  }

  /**
   * Siram permukaan: hanya lapisan paling atas yang basah, dan airnya menguap
   * kembali dalam hitungan hari. Bara yang sudah turun tidak tersentuh.
   */
  douseSurface(): void {
    this.douse = 1;
    this.updateMoisture();
  }

  /** Sisa pengaruh siraman permukaan (0–1). */
  getDouse(): number {
    return this.douse;
  }

  /**
   * Sulut satu titik. `xFraction` 0–1 diukur dari sisi kiri bongkahan;
   * `depthM` kedalaman awal bara (bara biasanya mulai persis di bawah
   * permukaan, tempat bahan kering bertemu udara).
   */
  ignite(xFraction: number, depthM = CELL_H * 0.5, radiusM = 0.09): boolean {
    const centerCol = this.outsideRoof(Math.round(xFraction * (GRID_COLS - 1)));
    const centerRow = Math.max(0, Math.min(GRID_ROWS - 1, Math.round(depthM / CELL_H)));
    const rc = Math.max(1, Math.round(radiusM / CELL_W));
    const rr = Math.max(1, Math.round(radiusM / CELL_H));
    let lit = false;
    for (let row = centerRow - rr; row <= centerRow + rr; row++) {
      if (row < 0 || row >= GRID_ROWS) continue;
      for (let col = centerCol - rc; col <= centerCol + rc; col++) {
        if (col < 0 || col >= GRID_COLS) continue;
        const i = this.index(col, row);
        // Titik yang terlalu lembap tidak menyala walau disulut langsung.
        if (this.fuel[i] <= 0 || this.moisture[i] >= MOISTURE_LIMIT) continue;
        this.state[i] = CELL_SMOLDER;
        this.progress[i] = Math.max(this.progress[i], 0.35);
        this.wetTime[i] = 0;
        lit = true;
      }
    }
    if (lit) {
      this.revision++;
      this.everBurned = true;
      this.segmentLit[SEGMENT_OF_COL[Math.max(0, Math.min(GRID_COLS - 1, centerCol))]] = 1;
      this.collect();
    }
    return lit;
  }

  /** Kadar air (fraksi berat kering) pada kedalaman `depth` untuk keadaan air saat ini. */
  moistureAtDepth(depth: number): number {
    // Di bawah muka air tanah gambut jenuh; di atasnya menurun sejauh air
    // tanah masih sampai, lalu mendatar pada kadar air lapisan tak jenuh.
    const above = this.waterTable - depth;
    let base = MOISTURE_SATURATED;
    if (above > 0) {
      const reach = Math.max(0, 1 - above / CAPILLARY_RISE);
      base = MOISTURE_UNSATURATED + (MOISTURE_SATURATED - MOISTURE_UNSATURATED) * reach;
      // Lapisan paling atas lebih kering daripada di bawahnya.
      if (depth < DRY_TOP_DEPTH) base -= (MOISTURE_UNSATURATED - MOISTURE_DRIEST) * (1 - depth / DRY_TOP_DEPTH);
    }
    // Air siraman hanya membasahi lapisan tipis paling atas.
    const wetted = depth < DOUSE_DEPTH ? this.douse * (1 - depth / DOUSE_DEPTH) * (MOISTURE_SATURATED - MOISTURE_DRIEST) : 0;
    return Math.min(MOISTURE_SATURATED, base + wetted);
  }

  /** Kadar air yang diratakan ke 0 (terkering) sampai 1 (jenuh). */
  private wetnessOf(moisture: number): number {
    return Math.max(0, Math.min(1, (moisture - MOISTURE_DRIEST) / (MOISTURE_SATURATED - MOISTURE_DRIEST)));
  }

  /**
   * Pengali laju menurut kadar air. Laju terukur berlaku pada kadar air lapangan
   * (sampai ± 120%), lalu melemah sampai nol tepat di ambang bara.
   */
  private drynessOf(moisture: number): number {
    return Math.max(0, Math.min(1, (MOISTURE_LIMIT - moisture) / (MOISTURE_LIMIT - MOISTURE_UNSATURATED)));
  }

  private updateMoisture(): void {
    for (let row = 0; row < GRID_ROWS; row++) {
      const m = this.moistureAtDepth(this.depthOfRow(row));
      for (let col = 0; col < GRID_COLS; col++) this.moisture[this.index(col, row)] = m;
    }
  }

  /** Coba nyalakan satu sel tetangga. */
  private trySpread(col: number, row: number, chance: number): void {
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;
    const i = this.index(col, row);
    if (this.state[i] !== CELL_INTACT || this.fuel[i] <= 0) return;
    const m = this.moisture[i];
    if (m >= MOISTURE_LIMIT) return;
    if (this.rand() < chance * this.drynessOf(m)) {
      this.state[i] = CELL_SMOLDER;
      this.wetTime[i] = 0;
      // Bara mencapai permukaan di ruas yang belum pernah terbakar: ia muncul lagi.
      if (row < RESURFACE_ROWS && ROOF_OF_COL[col] < 0 && !this.segmentLit[SEGMENT_OF_COL[col]]) {
        this.segmentLit[SEGMENT_OF_COL[col]] = 1;
        this.resurfaceX = this.xOfCol(col);
      }
    }
  }

  /**
   * Geser titik sulut yang jatuh pada atap ke tepi terdekatnya. Bara permukaan
   * tidak dapat merambat di sana, jadi tanpa ini ia cepat padam sebelum sempat
   * turun ke lapisan dalam.
   */
  private outsideRoof(col: number): number {
    const n = ROOF_OF_COL[Math.max(0, Math.min(GRID_COLS - 1, col))];
    if (n === undefined || n < 0) return col;
    const { from, to } = ROOFS[n];
    return col - from < to - col ? from - 1 : to + 1;
  }

  /** Apakah bara dapat berpindah mendatar dari `col` ke `target` pada lapisan ini. */
  private canSpreadSide(col: number, target: number, deep: boolean): boolean {
    if (deep) return true;
    return ROOF_OF_COL[col] < 0 && (target < 0 || target >= GRID_COLS || ROOF_OF_COL[target] < 0);
  }

  /** Runtuhkan atap yang bagian bawahnya sudah cukup berongga. */
  private updateRoofs(): void {
    ROOFS.forEach((roof, n) => {
      if (this.roofFallen[n]) return;
      let hollow = 0;
      for (let col = roof.from; col <= roof.to; col++) {
        for (let row = 0; row < GRID_ROWS; row++) {
          if (this.rowDeep[row] && this.state[this.index(col, row)] === CELL_ASH) {
            hollow++;
            break;
          }
        }
      }
      if (hollow < ROOF_COLS * ROOF_COLLAPSE_SHARE) return;
      this.roofFallen[n] = 1;
      this.collapseX = this.xOfCol(Math.round((roof.from + roof.to) / 2));
    });
  }

  /** Satu langkah simulasi tetap sebesar `STEP_HOURS`. */
  private step(): void {
    const dt = STEP_HOURS;
    // Air siraman menguap: pengaruhnya berkurang tiap jam.
    if (this.douse > 0) {
      this.douse = Math.max(0, this.douse - dt / DOUSE_DECAY_HOURS);
      this.updateMoisture();
    }

    // Sel yang siap menyalakan tetangga dikumpulkan lebih dulu agar sel yang
    // baru menyala pada langkah ini tidak langsung ikut merambat.
    const spreaders = this.spreaders;
    let count = 0;
    // Sel yang membara pada awal langkah ini. Ikut dihitung pula sel yang
    // justru padam di langkah ini: jam itu ia memang masih menyala.
    let burning = 0;
    let newAsh = false;
    for (let row = 0; row < GRID_ROWS; row++) {
      const burn = this.rowDeep[row] ? ZONE_BURN.deep : ZONE_BURN.surface;
      for (let col = 0; col < GRID_COLS; col++) {
        const i = this.index(col, row);
        if (this.state[i] !== CELL_SMOLDER) continue;
        burning++;
        const m = this.moisture[i];

        // Terlalu lembap: bara mendingin, lalu padam menjadi gambut hangus.
        if (m >= MOISTURE_LIMIT) {
          this.wetTime[i] += dt;
          if (this.wetTime[i] >= QUENCH_HOURS) {
            this.state[i] = CELL_QUENCHED;
            this.progress[i] = Math.min(this.progress[i], 0.85);
          }
          continue;
        }
        this.wetTime[i] = Math.max(0, this.wetTime[i] - dt);

        this.progress[i] += (dt / burn.burnHours) * this.drynessOf(m);
        if (this.progress[i] >= 1) {
          this.progress[i] = 1;
          this.state[i] = CELL_ASH;
          this.fuel[i] = 0;
          newAsh = true;
        }
        if (this.progress[i] >= IGNITE_THRESHOLD) spreaders[count++] = i;
      }
    }

    for (let n = 0; n < count; n++) {
      const i = spreaders[n];
      const col = i % GRID_COLS;
      const row = (i - col) / GRID_COLS;
      const deep = this.rowDeep[row];
      const k = (deep ? ZONE_BURN.deep : ZONE_BURN.surface).spreadPerHour * dt;
      const entersDeep = !deep && row + 1 < GRID_ROWS && this.rowDeep[row + 1];
      this.trySpread(col, row + 1, k * SPREAD_WEIGHT.down * (entersDeep ? DEEP_ENTRY : 1));
      if (this.canSpreadSide(col, col - 1, deep)) this.trySpread(col - 1, row, k * SPREAD_WEIGHT.side);
      if (this.canSpreadSide(col, col + 1, deep)) this.trySpread(col + 1, row, k * SPREAD_WEIGHT.side);
      // Atap hanya hilang saat runtuh, tidak terbakar dari bawah.
      const intoRoof = row > 0 && ROOF_OF_COL[col] >= 0 && !this.rowDeep[row - 1];
      if (!intoRoof) this.trySpread(col, row - 1, k * SPREAD_WEIGHT.up);
    }

    if (newAsh) this.updateRoofs();

    this.stats.hours += dt;
    if (burning > 0) this.stats.burningHours += dt;
  }

  /**
   * Jalankan simulasi selama `hours` jam waktu simulasi. Sisa waktu yang belum
   * genap satu langkah disimpan untuk pemanggilan berikutnya, termasuk sisa
   * akibat batas `maxSteps`, sehingga waktu tidak pernah hilang — hanya
   * dikerjakan pada pemanggilan berikutnya.
   *
   * `collect()` sengaja tidak dipanggil di sini: menghitung ringkasan berarti
   * menyapu seluruh kisi, dan antarmuka hanya membutuhkannya beberapa kali per
   * detik. Pemanggilnya yang menentukan kapan ringkasan disegarkan.
   */
  advance(hours: number, maxSteps = 40): boolean {
    if (hours <= 0) return false;
    this.carry += hours;
    // Batasi jumlah langkah per pemanggilan agar satu bingkai tidak macet.
    let steps = Math.min(Math.floor(this.carry / STEP_HOURS), maxSteps);
    this.carry -= steps * STEP_HOURS;
    if (steps <= 0) return false;
    while (steps-- > 0) this.step();
    return true;
  }

  /** Hitung ulang ringkasan keadaan untuk antarmuka. */
  collect(): void {
    let active = 0;
    let deepest = 0;
    let depthSum = 0;
    let minCol = GRID_COLS;
    let maxCol = -1;
    let consumed = 0;
    let smoke = 0;
    let organic = 0;

    for (let row = 0; row < GRID_ROWS; row++) {
      const depth = this.depthOfRow(row);
      const organicRow = this.rowLayer[row] !== "mineral";
      for (let col = 0; col < GRID_COLS; col++) {
        const i = this.index(col, row);
        if (organicRow) organic++;
        const st = this.state[i];
        if (st === CELL_ASH) consumed++;
        if (st === CELL_SMOLDER) {
          active++;
          depthSum += depth;
          if (depth > deepest) deepest = depth;
          // Hanya bara yang dekat permukaan asapnya sampai ke atas.
          if (depth < VISIBLE_SMOKE_DEPTH) smoke += 1 - depth / VISIBLE_SMOKE_DEPTH;
        }
        if (st !== CELL_INTACT) {
          if (col < minCol) minCol = col;
          if (col > maxCol) maxCol = col;
        }
      }
    }

    // Dibagi lama menyala, bukan lama waktu berjalan. Lebar daerah terbakar
    // berhenti tumbuh begitu bara padam, jadi dengan pembagi yang terus
    // membesar angka ini akan merosot sendiri sesudahnya — padahal yang
    // dimaksud labelnya adalah secepat apa bara merambat selama ia menyala.
    const days = this.stats.burningHours / 24;
    const width = maxCol >= minCol ? (maxCol - minCol + 1) * CELL_W : 0;
    // Laju rambat diukur dari lebar daerah terbakar, dibagi dua karena bara
    // merambat ke kiri dan ke kanan dari titik sulut.
    const spread = days > 0.04 ? (width * 100) / 2 / days : 0;

    this.stats = {
      hours: this.stats.hours,
      burningHours: this.stats.burningHours,
      active,
      frontDepth: deepest,
      meanDepth: active > 0 ? depthSum / active : 0,
      burnedWidth: width,
      spreadCmPerDay: spread,
      consumed: organic > 0 ? consumed / organic : 0,
      // Lapisan atas yang baru disiram menahan asap, sehingga dari permukaan
      // kebakaran tampak seperti sudah padam meskipun baranya masih hidup.
      surfaceSmoke: Math.min(1, smoke / 12) * (1 - this.douse * 0.92),
      alive: active > 0,
      extinguished: this.everBurned && active === 0,
      maxSubsidence: this.maxSubsidence(),
      collapseX: this.collapseX,
      resurfaceX: this.resurfaceX,
    };
  }

  /** Penurunan permukaan pada kolom `col` (m) akibat rongga abu di bawahnya. */
  subsidenceAt(col: number): number {
    // Atap menahan permukaan sampai runtuh, walau di bawahnya sudah berongga.
    const roof = ROOF_OF_COL[col];
    if (roof >= 0 && !this.roofFallen[roof]) return 0;
    let ash = 0;
    for (let row = 0; row < GRID_ROWS; row++) {
      if (this.state[this.index(col, row)] === CELL_ASH) ash++;
    }
    return ash * CELL_H * SUBSIDENCE_FACTOR;
  }

  private maxSubsidence(): number {
    let max = 0;
    for (let col = 0; col < GRID_COLS; col++) max = Math.max(max, this.subsidenceAt(col));
    return max;
  }

  /**
   * Isi `target` (RGBA per sel, panjang GRID_COLS × GRID_ROWS × 4) untuk
   * tekstur data yang dibaca peneduh:
   * R = tingkat abu/rongga, G = panas bara, B = kelembapan, A = tingkat hangus.
   */
  writeField(target: Uint8Array): void {
    for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
      const st = this.state[i];
      const p = this.progress[i];
      const ash = st === CELL_ASH ? 1 : st === CELL_SMOLDER ? p * 0.7 : 0;
      // Panas tertinggi di tepi depan bara, lalu meredup saat menjadi abu.
      const heat = st === CELL_SMOLDER ? Math.min(1, 0.35 + Math.sin(Math.PI * Math.min(1, p)) * 0.9) : 0;
      const char = st === CELL_QUENCHED ? Math.max(0.45, p) : st !== CELL_INTACT ? 1 : 0;
      const o = i * 4;
      target[o] = Math.round(ash * 255);
      target[o + 1] = Math.round(heat * 255);
      target[o + 2] = Math.round(this.wetnessOf(this.moisture[i]) * 255);
      target[o + 3] = Math.round(Math.min(1, char) * 255);
    }
  }

  /** Keterangan satu sel untuk kartu pemeriksaan (klik pada penampang). */
  probe(
    col: number,
    row: number,
  ): {
    state: CellState;
    depth: number;
    layer: PeatLayerId;
    moisture: number;
    temperature: number;
    progress: number;
  } {
    const c = Math.max(0, Math.min(GRID_COLS - 1, col));
    const r = Math.max(0, Math.min(GRID_ROWS - 1, row));
    const i = this.index(c, r);
    const st = this.state[i] as CellState;
    // Suhu ilustratif, di dalam rentang lapangan: arang gambut menyala pada
    // 340–369 °C (Usup dkk., 2004) dan puncaknya 470–700 °C (Santoso dkk., 2022).
    const temperature =
      st === CELL_SMOLDER
        ? Math.round(420 + Math.sin(Math.PI * Math.min(1, this.progress[i])) * 180)
        : st === CELL_ASH
          ? Math.round(120 + 60 * (1 - this.wetnessOf(this.moisture[i])))
          : st === CELL_QUENCHED
            ? 45
            : 28;
    return {
      state: st,
      depth: this.depthOfRow(r),
      layer: this.rowLayer[r],
      moisture: this.moisture[i],
      temperature,
      progress: this.progress[i],
    };
  }
}

/** Ubah jam simulasi menjadi label hari, mis. 30 → "Hari ke-2". */
/**
 * Ratakan kisi hasil `writeField` dengan kernel 3 × 3 [1,2,1] ⊗ [1,2,1] / 16.
 *
 * Kisi simulasi hanya 96 × 56 sel untuk bidang selebar 4,4 m, jadi satu sel
 * berukuran sekitar 4,6 cm. Dibaca mentah, tiap sel muncul sebagai bujur
 * sangkar membulat. Perataan inilah yang memecah garis kisinya.
 *
 * Dahulu dikerjakan di dalam peneduh: tiap pembacaan kisi adalah sembilan
 * pembacaan tekstur, dan peneduh membacanya tiga belas kali — 117 pembacaan
 * tiap fragmen, di seluruh layar, tiap bingkai. Dikerjakan di sini, biayanya
 * 5.376 sel dikali empat kanal, beberapa puluh kali per detik saja.
 *
 * Hasilnya sama persis, bukan hampiran. Perataan kotak dan interpolasi
 * bilinear keduanya operasi linear, dan titik-titik kernelnya berjarak tepat
 * satu texel — menggeser titik baca sejauh satu texel sama artinya dengan
 * menggeser indeks selnya satu. Jadi "ratakan lalu interpolasi" dan
 * "interpolasi lalu ratakan" memberi nilai yang sama; yang berbeda hanya
 * pembulatan ke 8 bit, yaitu paling jauh setengah dari 1/255.
 *
 * Tepi kisi dijepit ke sel terluar, sama dengan `ClampToEdge` pada teksturnya.
 */
export function smoothField(src: Uint8Array, dst: Uint8Array): void {
  const stride = GRID_COLS * 4;
  for (let row = 0; row < GRID_ROWS; row++) {
    const up = (row > 0 ? row - 1 : 0) * stride;
    const mid = row * stride;
    const down = (row < GRID_ROWS - 1 ? row + 1 : GRID_ROWS - 1) * stride;
    for (let col = 0; col < GRID_COLS; col++) {
      const left = (col > 0 ? col - 1 : 0) * 4;
      const self = col * 4;
      const right = (col < GRID_COLS - 1 ? col + 1 : GRID_COLS - 1) * 4;
      const o = mid + self;
      for (let ch = 0; ch < 4; ch++) {
        const top = src[up + left + ch] + 2 * src[up + self + ch] + src[up + right + ch];
        const center = src[mid + left + ch] + 2 * src[mid + self + ch] + src[mid + right + ch];
        const bottom = src[down + left + ch] + 2 * src[down + self + ch] + src[down + right + ch];
        // +8 lalu bagi 16: pembulatan ke bilangan bulat terdekat.
        dst[o + ch] = (top + 2 * center + bottom + 8) >> 4;
      }
    }
  }
}

export function formatDay(hours: number): string {
  return `Hari ke-${Math.floor(hours / 24) + 1}`;
}

/** Ubah jam simulasi menjadi lama berjalan, mis. 54 → "2 hari 6 jam". */
export function formatElapsed(hours: number): string {
  const d = Math.floor(hours / 24);
  const h = Math.floor(hours % 24);
  if (d <= 0) return `${h} jam`;
  return h === 0 ? `${d} hari` : `${d} hari ${h} jam`;
}
