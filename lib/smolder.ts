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
// dapat dibaca langsung. Nilai tetapannya bersifat ilustratif: besarannya
// dipilih agar sesuai urutan besar (order of magnitude) pengamatan lapangan,
// bukan hasil kalibrasi terhadap satu lokasi tertentu.
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

/**
 * Sifat bakar tiap tingkat kematangan gambut.
 * - `burnHours`: lama satu sel habis terbakar pada kondisi paling kering (jam).
 * - `spreadPerHour`: kecenderungan menyalakan sel tetangga tiap jam (0–1).
 * Gambut fibrik paling berpori sehingga paling cepat menyambar, sedangkan
 * saprik lebih padat: merambat lambat tetapi baranya bertahan lebih lama.
 */
export const LAYER_BURN: Record<PeatLayerId, { burnHours: number; spreadPerHour: number }> = {
  fibrik: { burnHours: 8, spreadPerHour: 0.26 },
  hemik: { burnHours: 13, spreadPerHour: 0.18 },
  saprik: { burnHours: 22, spreadPerHour: 0.12 },
  mineral: { burnHours: Infinity, spreadPerHour: 0 },
};

/**
 * Batas kelembapan (0–1). Di atas nilai ini gambut tidak dapat dinyalakan dan
 * bara yang sudah ada akan padam. Inilah sebabnya muka air tanah menentukan
 * sampai kedalaman mana kebakaran gambut mungkin terjadi.
 */
export const MOISTURE_LIMIT = 0.55;

/**
 * Tinggi naiknya air kapiler di atas muka air tanah (m). Gambut tepat di atas
 * muka air masih lembap; makin ke atas makin kering sampai benar-benar kering
 * pada ketinggian ini.
 */
export const CAPILLARY_RISE = 0.5;

/** Lama bara bertahan dalam keadaan terlalu lembap sebelum padam (jam). */
export const QUENCH_HOURS = 3;

/** Progres bakar minimum sebelum satu sel mampu menyalakan tetangganya. */
const IGNITE_THRESHOLD = 0.3;

/**
 * Kedalaman acuan pembatasan oksigen (m). Oksigen masuk lewat permukaan dan
 * lewat rongga bekas terbakar, jadi bara yang jauh di bawah rongga melambat.
 */
const OXYGEN_DEPTH = 1.0;

/** Batas bawah faktor oksigen: bara dalam tetap hidup, hanya sangat lambat. */
const OXYGEN_FLOOR = 0.18;

/** Bobot arah penyalaan: ke bawah paling mudah, ke atas paling sulit. */
const SPREAD_WEIGHT = { down: 1, side: 0.8, up: 0.42 };

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
};

function emptyStats(): SmolderStats {
  return {
    hours: 0,
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

  stats: SmolderStats = emptyStats();

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
    this.rand = seeded(seed);
    this.carry = 0;
    this.douse = 0;
    this.everBurned = false;
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
    const centerCol = Math.round(xFraction * (GRID_COLS - 1));
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
      this.everBurned = true;
      this.collect();
    }
    return lit;
  }

  /** Kelembapan gambut pada kedalaman `depth` (m) untuk keadaan air saat ini. */
  moistureAtDepth(depth: number): number {
    // Di bawah muka air tanah gambut jenuh; di atasnya mengering bertahap
    // sejauh air kapiler masih sampai.
    const above = this.waterTable - depth;
    const base = above <= 0 ? 1 : Math.max(0, 1 - above / CAPILLARY_RISE);
    // Air siraman hanya membasahi lapisan tipis paling atas.
    const wetted = depth < DOUSE_DEPTH ? this.douse * (1 - depth / DOUSE_DEPTH) : 0;
    return Math.min(1, base + wetted);
  }

  private updateMoisture(): void {
    for (let row = 0; row < GRID_ROWS; row++) {
      const m = this.moistureAtDepth(this.depthOfRow(row));
      for (let col = 0; col < GRID_COLS; col++) this.moisture[this.index(col, row)] = m;
    }
  }

  /**
   * Faktor oksigen pada satu sel (0–1). Oksigen masuk dari permukaan dan dari
   * rongga bekas terbakar di atasnya, sehingga bara yang jauh di bawah rongga
   * membakar makin lambat.
   */
  private oxygenAt(col: number, row: number): number {
    // Rongga terdalam yang menyambung dari permukaan pada kolom ini.
    let voidDepth = 0;
    for (let r = 0; r < row; r++) {
      if (this.state[this.index(col, r)] !== CELL_ASH) break;
      voidDepth = this.depthOfRow(r);
    }
    const buried = Math.max(0, this.depthOfRow(row) - voidDepth);
    return Math.max(OXYGEN_FLOOR, 1 - buried / OXYGEN_DEPTH);
  }

  /** Coba nyalakan satu sel tetangga. */
  private trySpread(col: number, row: number, chance: number): void {
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;
    const i = this.index(col, row);
    if (this.state[i] !== CELL_INTACT || this.fuel[i] <= 0) return;
    const m = this.moisture[i];
    if (m >= MOISTURE_LIMIT) return;
    // Makin kering makin mudah tersambar.
    const dryness = 1 - m / MOISTURE_LIMIT;
    if (this.rand() < chance * dryness) {
      this.state[i] = CELL_SMOLDER;
      this.wetTime[i] = 0;
    }
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
    for (let row = 0; row < GRID_ROWS; row++) {
      const burn = LAYER_BURN[this.rowLayer[row]];
      for (let col = 0; col < GRID_COLS; col++) {
        const i = this.index(col, row);
        if (this.state[i] !== CELL_SMOLDER) continue;
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

        const dryness = 1 - m / MOISTURE_LIMIT;
        const rate = (dt / burn.burnHours) * dryness * this.oxygenAt(col, row);
        this.progress[i] += rate;
        if (this.progress[i] >= 1) {
          this.progress[i] = 1;
          this.state[i] = CELL_ASH;
          this.fuel[i] = 0;
        }
        if (this.progress[i] >= IGNITE_THRESHOLD) spreaders[count++] = i;
      }
    }

    for (let n = 0; n < count; n++) {
      const i = spreaders[n];
      const col = i % GRID_COLS;
      const row = (i - col) / GRID_COLS;
      const burn = LAYER_BURN[this.rowLayer[row]];
      const k = burn.spreadPerHour * dt * this.oxygenAt(col, row);
      this.trySpread(col, row + 1, k * SPREAD_WEIGHT.down);
      this.trySpread(col - 1, row, k * SPREAD_WEIGHT.side);
      this.trySpread(col + 1, row, k * SPREAD_WEIGHT.side);
      this.trySpread(col, row - 1, k * SPREAD_WEIGHT.up);
    }

    this.stats.hours += dt;
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

    const days = this.stats.hours / 24;
    const width = maxCol >= minCol ? (maxCol - minCol + 1) * CELL_W : 0;
    // Laju rambat diukur dari lebar daerah terbakar, dibagi dua karena bara
    // merambat ke kiri dan ke kanan dari titik sulut.
    const spread = days > 0.04 ? (width * 100) / 2 / days : 0;

    this.stats = {
      hours: this.stats.hours,
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
    };
  }

  /** Penurunan permukaan pada kolom `col` (m) akibat rongga abu di bawahnya. */
  subsidenceAt(col: number): number {
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
      target[o + 2] = Math.round(this.moisture[i] * 255);
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
    // Suhu ilustratif: bara gambut jauh lebih dingin daripada api nyala.
    const temperature =
      st === CELL_SMOLDER
        ? Math.round(420 + Math.sin(Math.PI * Math.min(1, this.progress[i])) * 180)
        : st === CELL_ASH
          ? Math.round(120 + 60 * (1 - this.moisture[i]))
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
