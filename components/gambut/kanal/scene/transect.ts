import * as THREE from "three";
import {
  CANAL_WIDTH_M,
  naturalSurfaceM,
  PROFILE_DEPTH_M,
  TRANSECT_LENGTH_M,
  type DrainageSim,
} from "@/lib/drainage";

// Bentuk bongkahan lanskap Modul 03: sepetak gambut yang dibelah kanal,
// dilihat dari sudut isometrik.
//
// --- Mengapa bukan penampang satu kilometer --------------------------------
//
// Rancangan pertama modul ini menggambar seluruh transek 1.000 m sebagai satu
// bidang potong tegak. Itu keliru, dan kekeliruannya mendasar: satu gambar
// dipaksa mengerjakan dua tugas yang saling berlawanan.
//
//   1. Menjadi potret lanskap — pembaca harus mengenali kanal, tanah, dan
//      tumbuhan. Tugas ini menuntut kamera dekat dan kanal yang besar.
//   2. Menjadi alat ukur — pembaca harus menemukan sampai jarak berapa muka
//      airnya melewati batas 40 cm. Tugas ini menuntut kamera jauh dan sumbu
//      jarak sepanjang satu kilometer.
//
// Dikerjakan sekaligus, keduanya gagal. Kanal selebar 8 m di dalam gambar
// 1.000 m tinggal 0,8% lebar gambar — tidak terbaca sebagai kanal. Dan untuk
// memuat kedalaman 3,4 m di dalam lebar 1.000 m, tegaknya harus dibesarkan
// 100 kali, yang mengubah lapisan gambut menjadi pita-pita lebar yang tidak
// terbaca sebagai tanah.
//
// Jadi kedua tugas itu dipisah. Berkas ini mengerjakan tugas pertama: sepetak
// lahan di dekat kanal, cukup dekat untuk dikenali sebagai tempat. Tugas
// kedua dikerjakan `WaterTableChart` sebagai grafik dua dimensi, yang memang
// bentuk yang benar untuk mengukur.
//
// --- Satuan ----------------------------------------------------------------
//
// Satu satuan adegan = satu meter mendatar. Tegaknya dibesarkan dua kali
// (`VERTICAL_EXAGGERATION`), dan hanya dua kali: cukup untuk membuat susunan
// lapisan terbaca, tetapi masih cukup jujur sehingga kanal yang digambar
// tetap berbentuk kanal, bukan sumur.

/** Panjang lahan yang digambar di tiap sisi kanal (m). */
export const NEAR_LENGTH_M = 36;

/** Lebar kanal (m) — menurut skala sebenarnya, tidak dilebih-lebihkan. */
export const CANAL_LABEL_WIDTH_M = CANAL_WIDTH_M;

/** Setengah lebar kanal (m). Kanal berpusat pada x = 0. */
export const CANAL_HALF_M = CANAL_WIDTH_M / 2;

/** Tebal bongkahan ke arah belakang (m). */
export const BLOCK_DEPTH_M = 30;

/**
 * Pembesaran tegak gambar ini.
 *
 * Diagram hidrologi gambut selalu dibesarkan tegaknya, dan angkanya wajib
 * ditulis pada gambar. Yang berubah dari rancangan sebelumnya hanya besarnya:
 * dari 100 kali menjadi 2 kali. Dengan 2 kali, kanal sedalam 3 m dan selebar
 * 8 m tergambar sebagai parit selebar 8 dan sedalam 6 — masih parit. Dengan
 * 100 kali ia tergambar sedalam 300: sebuah jurang yang tidak pernah ada.
 */
export const VERTICAL_EXAGGERATION = 2;

/** Skala mendatar: satuan adegan per meter. */
export const H_SCALE = 1;

/** Skala tegak: satuan adegan per meter kedalaman. */
export const V_SCALE = VERTICAL_EXAGGERATION;

/**
 * Kedalaman dasar bongkahan (m di bawah permukaan di tepi kanal).
 *
 * Sedikit lebih dalam daripada profil gambut, sehingga ada alas tanah mineral
 * di bawahnya. Tanpa alas itu, kanal sedalam 3 m akan hampir menembus dasar
 * bongkahan dan petak ini tampak seperti kue yang terbelah dua, bukan seperti
 * tanah yang digali.
 */
export const BASE_DEPTH_M = PROFILE_DEPTH_M + 0.8;

/** Setengah lebar seluruh bongkahan (satuan adegan). */
export const HALF_WIDTH = (CANAL_HALF_M + NEAR_LENGTH_M) * H_SCALE;

/** Tinggi bongkahan (satuan adegan). */
export const BLOCK_HEIGHT = BASE_DEPTH_M * V_SCALE;

/** Tebal bongkahan (satuan adegan). */
export const BLOCK_DEPTH = BLOCK_DEPTH_M;

/** Kerapatan kisi satu sayap: bidang potong dan hamparan permukaan. */
export const WING_COLS = 72;
export const FACE_ROWS = 40;
export const SURFACE_ROWS = 14;

/** Kedudukan mendatar (satuan adegan) untuk jarak `m` dari tepi kanal. */
export function xOfDistance(m: number): number {
  return (CANAL_HALF_M + m) * H_SCALE;
}

/** Jarak dari tepi kanal (m) untuk kedudukan mendatar `x`. */
export function distanceOfX(x: number): number {
  return Math.max(0, Math.abs(x) / H_SCALE - CANAL_HALF_M);
}

/**
 * Ketinggian permukaan gambut (satuan adegan) pada jarak `m` dari tepi kanal,
 * setelah melesak sebanyak `dropM`.
 *
 * Nol pada tepi kanal dan menanjak sangat landai ke arah dalam kubah. Pada
 * jarak 36 m kenaikannya hanya 8 cm — nyaris rata, dan memang begitu
 * kenyataannya. Yang membuat permukaan ini bergerak di dalam modul bukan
 * kubahnya, melainkan `dropM`: tanah yang melesak karena airnya hilang.
 */
export function surfaceY(distanceM: number, dropM = 0): number {
  return (naturalSurfaceM(distanceM) - dropM) * V_SCALE;
}

/** Ketinggian dasar bongkahan (satuan adegan). Alas mineral tidak melesak. */
export function floorY(): number {
  return -BASE_DEPTH_M * V_SCALE;
}

/**
 * Letak kolom simulasi yang mewakili jarak `m`, sebagai pecahan 0-1 pada
 * tekstur keadaan.
 *
 * Tekstur itu membentang sepanjang transek 1.000 m, sedangkan bongkahan ini
 * hanya memperlihatkan 36 m pertamanya. Jadi seluruh bongkahan membaca
 * sepertiga puluh bagian kiri teksturnya — bagian yang paling tajam
 * perubahannya, tepat seperti yang diinginkan.
 */
export function fieldU(distanceM: number): number {
  return Math.min(1, distanceM / TRANSECT_LENGTH_M);
}

type DropFn = (distanceM: number) => number;

const NO_DROP: DropFn = () => 0;

// ---------------------------------------------------------------------------
//  BIDANG POTONG
// ---------------------------------------------------------------------------

/**
 * Kisi bidang potong satu sayap, dari tepi kanal ke ujung petak.
 *
 * Dibuat untuk satu sayap saja lalu digambar dua kali — sekali apa adanya,
 * sekali dicerminkan terhadap x — sebab kedua sisi kanal mengalami hal yang
 * persis sama. Peneduhnya membaca kedudukan dunia, dan ragam teksturnya tidak
 * setangkup terhadap nol, sehingga pencerminan itu tidak menghasilkan bayangan
 * cermin yang terlihat.
 *
 * Atributnya:
 * - `position` : titik dalam satuan adegan,
 * - `uv`       : x = letak pada tekstur keadaan, y = 0-1 sedalam bongkahan,
 * - `aDepth`   : kedalaman titik dari permukaan saat itu (m).
 *
 * `aDepth` tidak dapat diturunkan dari `uv.y`: permukaannya melesak, jadi satu
 * baris kisi yang sama berada pada kedalaman yang berbeda-beda. Lapisan
 * gambut ikut turun bersama permukaannya, jadi kedalaman itulah yang
 * menentukan warnanya — bukan ketinggian mutlaknya.
 */
export function createFaceGrid(): THREE.BufferGeometry {
  const cols = WING_COLS + 1;
  const rows = FACE_ROWS + 1;
  const total = cols * rows;
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geom.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(total * 2), 2));
  geom.setAttribute("aDepth", new THREE.BufferAttribute(new Float32Array(total), 1));

  // uv tetap sepanjang modul hidup, jadi diisi sekali di sini.
  const uv = geom.attributes.uv as THREE.BufferAttribute;
  const uvArr = uv.array as Float32Array;
  for (let i = 0; i < cols; i++) {
    const u = fieldU((i / WING_COLS) * NEAR_LENGTH_M);
    for (let j = 0; j < rows; j++) {
      const k = j * cols + i;
      uvArr[k * 2] = u;
      uvArr[k * 2 + 1] = 1 - j / FACE_ROWS;
    }
  }

  const idx: number[] = [];
  for (let j = 0; j < FACE_ROWS; j++) {
    for (let i = 0; i < WING_COLS; i++) {
      const a = j * cols + i;
      idx.push(a, a + cols, a + 1, a + 1, a + cols, a + cols + 1);
    }
  }
  geom.setIndex(idx);
  return geom;
}

/**
 * Perbarui ketinggian titik-titik bidang potong.
 *
 * Hanya `position` dan `aDepth` yang ditulis; `uv` tidak pernah berubah.
 * Normal titik sengaja tidak dihitung — peneduh bidang potong tidak
 * membacanya, sama seperti pada Modul 02.
 */
export function updateFaceGrid(geom: THREE.BufferGeometry, drop: DropFn = NO_DROP): void {
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const depth = geom.attributes.aDepth as THREE.BufferAttribute;
  const posArr = pos.array as Float32Array;
  const depthArr = depth.array as Float32Array;
  const cols = WING_COLS + 1;
  const bottom = floorY();
  const z = BLOCK_DEPTH / 2;

  for (let i = 0; i < cols; i++) {
    const distance = (i / WING_COLS) * NEAR_LENGTH_M;
    const x = xOfDistance(distance);
    const top = surfaceY(distance, drop(distance));
    for (let j = 0; j <= FACE_ROWS; j++) {
      const t = j / FACE_ROWS;
      const y = top + (bottom - top) * t;
      const k = j * cols + i;
      posArr[k * 3] = x;
      posArr[k * 3 + 1] = y;
      posArr[k * 3 + 2] = z;
      depthArr[k] = (top - y) / V_SCALE;
    }
  }
  pos.needsUpdate = true;
  depth.needsUpdate = true;
  geom.computeBoundingSphere();
}

// ---------------------------------------------------------------------------
//  HAMPARAN PERMUKAAN
// ---------------------------------------------------------------------------

/**
 * Kisi hamparan permukaan satu sayap: dari garis potong di depan sampai tepi
 * belakang bongkahan.
 *
 * Inilah bidang yang tidak pernah ada pada rancangan sebelumnya. Dengan
 * kemiringan kamera 6°, hamparan ini hanya setebal beberapa piksel, sehingga
 * yang terlihat pembaca cuma dinding potong — lumuran coklat tanpa tanah di
 * atasnya. Dengan kamera isometrik, hamparan inilah yang membuat gambar
 * terbaca sebagai lahan: di sinilah tumbuhan, warna kering, dan pohon berada.
 *
 * Atribut `color` per titik dipakai untuk menghanguskan permukaan yang sudah
 * kering, dan `uv2.x` menyimpan jarak dari kanal supaya peneduh tidak perlu
 * menghitungnya ulang.
 */
export function createSurfaceGrid(): THREE.BufferGeometry {
  const cols = WING_COLS + 1;
  const rows = SURFACE_ROWS + 1;
  const total = cols * rows;
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geom.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(total * 2), 2));
  geom.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geom.setAttribute("color", new THREE.BufferAttribute(new Float32Array(total * 3).fill(1), 3));

  const idx: number[] = [];
  for (let j = 0; j < SURFACE_ROWS; j++) {
    for (let i = 0; i < WING_COLS; i++) {
      const a = j * cols + i;
      idx.push(a, a + 1, a + cols, a + 1, a + cols + 1, a + cols);
    }
  }
  geom.setIndex(idx);
  return geom;
}

/** Perbarui hamparan permukaan mengikuti penurunan. */
export function updateSurfaceGrid(geom: THREE.BufferGeometry, drop: DropFn = NO_DROP): void {
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const uv = geom.attributes.uv as THREE.BufferAttribute;
  const posArr = pos.array as Float32Array;
  const uvArr = uv.array as Float32Array;
  const cols = WING_COLS + 1;
  const front = BLOCK_DEPTH / 2;

  for (let i = 0; i < cols; i++) {
    const distance = (i / WING_COLS) * NEAR_LENGTH_M;
    const x = xOfDistance(distance);
    const y = surfaceY(distance, drop(distance));
    for (let j = 0; j <= SURFACE_ROWS; j++) {
      const z = front - (j / SURFACE_ROWS) * BLOCK_DEPTH;
      const k = j * cols + i;
      posArr[k * 3] = x;
      posArr[k * 3 + 1] = y;
      posArr[k * 3 + 2] = z;
      // Tekstur diulang tiap 6 m lanskap: sebesar semak, bukan sebesar petak.
      uvArr[k * 2] = x / 6;
      uvArr[k * 2 + 1] = z / 6;
    }
  }
  pos.needsUpdate = true;
  uv.needsUpdate = true;
  geom.computeVertexNormals();
  geom.computeBoundingSphere();
}

// ---------------------------------------------------------------------------
//  KANAL
// ---------------------------------------------------------------------------

/**
 * Bentuk kanal: dua dinding dan satu dasar, membentang sepanjang bongkahan.
 *
 * Dibuat sebagai geometri sendiri yang dibentuk ulang saat kedalaman kanal
 * berubah, bukan sebagai lubang pada kisi bidang potong. Alasannya: kisi itu
 * dimulai tepat di tepi kanal, sehingga kanalnya berada di luar daerah yang
 * disimulasikan — ia perabot, bukan hasil hitungan.
 *
 * Dindingnya sedikit melandai ke dalam (`CANAL_BATTER`), seperti galian tanah
 * yang sebenarnya: dinding tegak lurus pada gambut akan runtuh, dan parit
 * berdinding tegak terbaca sebagai potongan geometri, bukan sebagai galian.
 */
const CANAL_BATTER = 0.35;

export function createCanalGeometry(): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  // Delapan titik: tepi atas kiri, dasar kiri, dasar kanan, tepi atas kanan —
  // masing-masing di muka dan di belakang bongkahan.
  geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(8 * 3), 3));
  geom.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(8 * 3), 3));
  geom.setIndex([
    0, 2, 1, 1, 2, 3, // dinding kiri
    2, 4, 3, 3, 4, 5, // dasar
    4, 6, 5, 5, 6, 7, // dinding kanan
  ]);
  return geom;
}

/**
 * Perbarui bentuk kanal untuk kedalaman `canalDepthM`, pada tanah yang sudah
 * melesak sebanyak `dropM`.
 *
 * Dasar kanal diikatkan ke permukaan asal, tepi atasnya ke permukaan saat
 * ini. Itu bukan kerapian, melainkan isi pelajarannya: yang melesak adalah
 * tanah di sekitar kanal, sedangkan galiannya tetap di tempatnya. Setelah
 * tiga puluh tahun, kanal yang semula sedalam tiga meter karena itu tinggal
 * sedalam satu — bukan karena ia ditimbun, melainkan karena tanahnya yang
 * turun menyusulnya. Diikatkan keduanya ke permukaan asal, dinding kanal
 * justru akan tampak menonjol ke atas seperti tanggul beton.
 */
export function updateCanalGeometry(
  geom: THREE.BufferGeometry,
  canalDepthM: number,
  dropM = 0,
): void {
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const bottom = surfaceY(0) - canalDepthM * V_SCALE;
  const top = Math.max(bottom + 0.05, surfaceY(0, dropM));
  // Dasar lebih sempit daripada mulutnya, sebanding dengan dalamnya.
  const bedHalf = Math.max(0.8, CANAL_HALF_M - canalDepthM * CANAL_BATTER);
  const front = BLOCK_DEPTH / 2;
  const back = -BLOCK_DEPTH / 2;

  pos.setXYZ(0, -CANAL_HALF_M, top, front);
  pos.setXYZ(1, -CANAL_HALF_M, top, back);
  pos.setXYZ(2, -bedHalf, bottom, front);
  pos.setXYZ(3, -bedHalf, bottom, back);
  pos.setXYZ(4, bedHalf, bottom, front);
  pos.setXYZ(5, bedHalf, bottom, back);
  pos.setXYZ(6, CANAL_HALF_M, top, front);
  pos.setXYZ(7, CANAL_HALF_M, top, back);
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  geom.computeBoundingSphere();
}

/**
 * Bidang potong sepanjang jalur kanal, dipakai selama kanal belum digali.
 *
 * Tanpa ini, bidang potong di depan berlubang selebar kanal sebelum ada yang
 * menggalinya — tanah yang utuh tampak sudah terbelah, dan babak 01 dibuka
 * dengan gambar yang membantah kalimatnya sendiri.
 *
 * Atributnya sama persis dengan kisi bidang potong, sehingga keduanya dapat
 * memakai peneduh yang sama dan tidak pernah berbeda warna di sambungannya.
 */
export function createCanalFaceGeometry(): THREE.BufferGeometry {
  const cols = 2;
  const rows = FACE_ROWS + 1;
  const geom = new THREE.BufferGeometry();
  const pos = new Float32Array(cols * rows * 3);
  const uv = new Float32Array(cols * rows * 2);
  const depth = new Float32Array(cols * rows);

  const top = surfaceY(0);
  const bottom = floorY();
  const z = BLOCK_DEPTH / 2;
  const u = fieldU(0);

  for (let j = 0; j < rows; j++) {
    const y = top + (bottom - top) * (j / FACE_ROWS);
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      pos[k * 3] = i === 0 ? -CANAL_HALF_M : CANAL_HALF_M;
      pos[k * 3 + 1] = y;
      pos[k * 3 + 2] = z;
      uv[k * 2] = u;
      uv[k * 2 + 1] = 1 - j / FACE_ROWS;
      depth[k] = (top - y) / V_SCALE;
    }
  }

  const idx: number[] = [];
  for (let j = 0; j < FACE_ROWS; j++) {
    const a = j * cols;
    idx.push(a, a + cols, a + 1, a + 1, a + cols, a + cols + 1);
  }

  geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geom.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geom.setAttribute("aDepth", new THREE.BufferAttribute(depth, 1));
  geom.setIndex(idx);
  return geom;
}

/**
 * Permukaan air di dalam kanal.
 *
 * Inilah yang membuat galian itu terbaca sebagai kanal dan bukan sebagai
 * lubang hitam — dan sekaligus yang memperlihatkan kerja sekatnya: begitu
 * sekat dipasang, air di dalam kanal naik kembali mendekati permukaan tanah.
 */
export const NATURAL_CANAL_WATER_M = 0.12;

export function createCanalWaterGeometry(): THREE.BufferGeometry {
  const geom = new THREE.PlaneGeometry(1, 1, 24, 24);
  geom.rotateX(-Math.PI / 2);
  return geom;
}

// ---------------------------------------------------------------------------
//  PENURUNAN PERMUKAAN
// ---------------------------------------------------------------------------

/**
 * Pelacak penurunan permukaan, sejajar dengan `createSubsidence` pada Modul 02.
 *
 * Nilainya dibaca dari simulasi lewat satu fungsi, dan `version` bertambah
 * setiap kali bentuknya perlu dibentuk ulang — sehingga geometri tidak
 * dihitung ulang setiap bingkai.
 */
export type Subsidence = {
  fn: DropFn;
  version: number;
  refresh: () => void;
};

export function createSubsidence(sim: DrainageSim): Subsidence {
  const tracker: Subsidence = {
    version: 0,
    fn: (distanceM: number) => sim.subsidenceAtDistance(distanceM),
    refresh: () => {
      tracker.version++;
    },
  };
  return tracker;
}

/** Penanda jarak yang ditulis pada bongkahan (m dari tepi kanal). */
export const DISTANCE_TICKS = [10, 20, 30];

/** Penanda kedalaman yang ditulis di tepi gambar (m). */
export const DEPTH_TICKS = [1, 2, 3, 4];
