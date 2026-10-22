import * as THREE from "three";
import {
  COLUMNS,
  CANAL_WIDTH_M,
  distanceOfColumn,
  naturalSurfaceM,
  PROFILE_DEPTH_M,
  TRANSECT_LENGTH_M,
  type DrainageSim,
} from "@/lib/drainage";

// Bentuk penampang lanskap Modul 03: satu kilometer gambut yang dipotong
// kanal, dilihat dari samping.
//
// Modul 01 dan 02 memakai bongkahan 4,4 m yang bentuknya tak beraturan dan
// tapaknya membulat (`components/gambut/scene/terrain.ts`). Bentuk itu tidak
// dipakai di sini: pada skala satu kilometer, lekuk tapak selebar beberapa
// meter tidak ada artinya, dan yang harus terbaca justru kemiringan yang
// sangat landai. Jadi geometrinya sederhana — satu bidang potong menghadap
// kamera, satu hamparan permukaan di belakangnya, dan satu penutup gelap —
// tiga bagian yang sama dengan Modul 02.

/** Lebar gambar penampang dalam satuan adegan. */
export const SCENE_WIDTH = 10;

/** Skala mendatar: satuan adegan per meter lanskap. */
export const H_SCALE = SCENE_WIDTH / TRANSECT_LENGTH_M;

/**
 * Skala tegak: satuan adegan per meter kedalaman.
 *
 * Dibuat tepat 1 supaya kedalaman di adegan sama dengan kedalaman dalam
 * meter, persis seperti Modul 01 dan 02. Akibatnya bongkahan ini setinggi
 * 3,4 satuan dan selebar 10 satuan — sebuah pita lebar, bukan bongkahan.
 */
export const V_SCALE = 1;

/**
 * Pembesaran tegak gambar ini.
 *
 * Dihitung dari skalanya, bukan ditetapkan sendiri, supaya angka yang ditulis
 * pada gambar tidak akan pernah berbeda dari gambarnya. Nilainya 100.
 *
 * Diagram hidrologi gambut memang selalu dibesarkan tegaknya — penampang
 * 1.000 m x 3,4 m digambar sebenar-benarnya hanya sebilah garis. Tetapi
 * angkanya wajib ditulis: tanpa itu pembaca akan mengira kubah gambut
 * berbentuk bukit, padahal kemiringannya tidak sampai satu derajat.
 */
export const VERTICAL_EXAGGERATION = Math.round(V_SCALE / H_SCALE);

/** Tinggi gambar penampang dalam satuan adegan. */
export const SCENE_HEIGHT = PROFILE_DEPTH_M * V_SCALE;

/** Ketebalan bongkahan ke arah belakang (satuan adegan). */
export const SCENE_DEPTH = 0.55;

/**
 * Lebar kanal pada gambar (satuan adegan) — sengaja tidak menurut skala.
 *
 * Kanal selebar 8 m pada skala mendatar ini hanya 0,08 satuan, sementara
 * dalamnya sampai 3 satuan: ia akan tergambar sebagai jarum, bukan kanal.
 * Diagram penampang gambut memang menggambar kanalnya lebih lebar daripada
 * skala, dan itu harus dikatakan pada gambar — lihat keterangan skala di
 * SceneLabels.
 */
export const CANAL_SCENE_WIDTH = 0.42;

/** Lebar kanal yang sebenarnya (m), untuk ditulis pada keterangan. */
export const CANAL_LABEL_WIDTH_M = CANAL_WIDTH_M;

/** Kerapatan kisi bidang potong. */
export const FACE_COLS = 240;
export const FACE_ROWS = 48;

/** Kerapatan kisi hamparan permukaan. */
export const SURFACE_COLS = FACE_COLS;
export const SURFACE_ROWS = 6;

/** Kedudukan mendatar (satuan adegan) untuk jarak `m` dari kanal. */
export function xOfDistance(m: number): number {
  return m * H_SCALE;
}

/** Jarak dari kanal (m) untuk kedudukan mendatar `x`. */
export function distanceOfX(x: number): number {
  return x / H_SCALE;
}

/** Tepi kiri gambar: dinding kanal. Transek dimulai pada x = 0. */
export const CANAL_LEFT_X = -CANAL_SCENE_WIDTH;

/**
 * Ketinggian permukaan gambut (satuan adegan) pada jarak `m`, setelah melesak
 * sebanyak `dropM`.
 *
 * Nol pada tepi kanal dan menanjak sangat landai ke arah dalam kubah.
 */
export function surfaceY(distanceM: number, dropM = 0): number {
  return (naturalSurfaceM(distanceM) - dropM) * V_SCALE;
}

/** Ketinggian dasar profil (satuan adegan) pada jarak `m`. */
export function floorY(distanceM: number): number {
  // Dasar tanah mineral tidak ikut melesak: yang hilang gambut di atasnya.
  return (naturalSurfaceM(distanceM) - PROFILE_DEPTH_M) * V_SCALE;
}

type DropFn = (distanceM: number) => number;

const NO_DROP: DropFn = () => 0;

/**
 * Kisi bidang potong. Atributnya:
 * - `position` : titik dalam satuan adegan,
 * - `uv`       : 0-1 sepanjang transek dan sedalam profil, untuk membaca
 *                tekstur data hasil simulasi,
 * - `aDepth`   : kedalaman titik dari permukaan saat itu (m), supaya peneduh
 *                tahu ia berada di lapisan mana.
 *
 * `aDepth` tidak dapat diturunkan dari `uv.y`: permukaannya melesak, jadi satu
 * baris kisi yang sama berada pada kedalaman yang berbeda-beda di sepanjang
 * transek. Lapisan gambut ikut turun bersama permukaannya, jadi kedalaman itu
 * yang menentukan warnanya — bukan ketinggian mutlaknya.
 */
export function createFaceGrid(): THREE.BufferGeometry {
  const cols = FACE_COLS + 1;
  const rows = FACE_ROWS + 1;
  const total = cols * rows;
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geom.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(total * 2), 2));
  geom.setAttribute("aDepth", new THREE.BufferAttribute(new Float32Array(total), 1));

  // uv mendatar tetap sepanjang modul hidup, jadi diisi sekali di sini.
  const uv = geom.attributes.uv as THREE.BufferAttribute;
  const uvArr = uv.array as Float32Array;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      uvArr[k * 2] = i / FACE_COLS;
      uvArr[k * 2 + 1] = 1 - j / FACE_ROWS;
    }
  }

  const idx: number[] = [];
  for (let j = 0; j < FACE_ROWS; j++) {
    for (let i = 0; i < FACE_COLS; i++) {
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
  const cols = FACE_COLS + 1;

  for (let i = 0; i < cols; i++) {
    const distance = (i / FACE_COLS) * TRANSECT_LENGTH_M;
    const x = xOfDistance(distance);
    const top = surfaceY(distance, drop(distance));
    const bottom = floorY(distance);
    for (let j = 0; j <= FACE_ROWS; j++) {
      const t = j / FACE_ROWS;
      const y = top + (bottom - top) * t;
      const k = j * cols + i;
      posArr[k * 3] = x;
      posArr[k * 3 + 1] = y;
      posArr[k * 3 + 2] = 0;
      depthArr[k] = (top - y) / V_SCALE;
    }
  }
  pos.needsUpdate = true;
  depth.needsUpdate = true;
  geom.computeBoundingSphere();
}

/** Kisi hamparan permukaan: dari garis potong ke tepi belakang bongkahan. */
export function createSurfaceGrid(): THREE.BufferGeometry {
  const cols = SURFACE_COLS + 1;
  const rows = SURFACE_ROWS + 1;
  const total = cols * rows;
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geom.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(total * 2), 2));
  geom.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  // Warna per titik dipakai untuk menghanguskan permukaan yang sudah kering.
  geom.setAttribute("color", new THREE.BufferAttribute(new Float32Array(total * 3).fill(1), 3));

  const idx: number[] = [];
  for (let j = 0; j < SURFACE_ROWS; j++) {
    for (let i = 0; i < SURFACE_COLS; i++) {
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
  const cols = SURFACE_COLS + 1;

  for (let i = 0; i < cols; i++) {
    const distance = (i / SURFACE_COLS) * TRANSECT_LENGTH_M;
    const x = xOfDistance(distance);
    const y = surfaceY(distance, drop(distance));
    for (let j = 0; j <= SURFACE_ROWS; j++) {
      const z = -(j / SURFACE_ROWS) * SCENE_DEPTH;
      const k = j * cols + i;
      posArr[k * 3] = x;
      posArr[k * 3 + 1] = y;
      posArr[k * 3 + 2] = z;
      // Tekstur diulang menurut satuan adegan, bukan menurut meter lanskap:
      // pada 100x, pengulangan menurut meter akan terhimpit menjadi garis.
      uvArr[k * 2] = x * 1.6;
      uvArr[k * 2 + 1] = z * 1.6;
    }
  }
  pos.needsUpdate = true;
  uv.needsUpdate = true;
  geom.computeVertexNormals();
  geom.computeBoundingSphere();
}

/**
 * Bentuk kanal: dinding kiri bongkahan yang dipotong sampai kedalaman kanal.
 *
 * Dibuat sebagai geometri sendiri yang dibentuk ulang saat kedalaman kanal
 * berubah, bukan sebagai lubang pada kisi bidang potong. Alasannya: kisi
 * bidang potong dimulai tepat di tepi kanal (jarak 0), sehingga kanalnya
 * berada di luar daerah yang disimulasikan — ia perabot, bukan hasil hitungan.
 */
export function createCanalGeometry(): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  // Enam titik: dinding kanal (4) dan dasar kanal (2 titik lagi di belakang).
  geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(8 * 3), 3));
  geom.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4, 4, 3, 5, 4, 5, 6, 6, 5, 7]);
  return geom;
}

/** Perbarui bentuk kanal untuk kedalaman `canalDepthM`. */
export function updateCanalGeometry(geom: THREE.BufferGeometry, canalDepthM: number): void {
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const top = surfaceY(0);
  const bottom = top - canalDepthM * V_SCALE;
  const left = CANAL_LEFT_X;
  const right = 0;
  // Dinding kiri (menghadap kanan), dasar, lalu dinding kanan.
  pos.setXYZ(0, left, top, 0);
  pos.setXYZ(1, left, top, -SCENE_DEPTH);
  pos.setXYZ(2, left, bottom, 0);
  pos.setXYZ(3, left, bottom, -SCENE_DEPTH);
  pos.setXYZ(4, right, bottom, 0);
  pos.setXYZ(5, right, bottom, -SCENE_DEPTH);
  pos.setXYZ(6, right, top, 0);
  pos.setXYZ(7, right, top, -SCENE_DEPTH);
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  geom.computeBoundingSphere();
}

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

/**
 * Permukaan air di dalam kanal.
 *
 * Inilah yang membuat kanal terbaca sebagai kanal dan bukan sebagai lubang
 * hitam — dan sekaligus yang memperlihatkan kerja sekatnya: begitu sekat
 * dipasang, air di dalam kanal naik kembali mendekati permukaan tanah.
 */
export const NATURAL_CANAL_WATER_M = 0.12;

export function createCanalWaterGeometry(): THREE.BufferGeometry {
  const geom = new THREE.PlaneGeometry(1, 1);
  geom.rotateX(-Math.PI / 2);
  return geom;
}

/** Penanda jarak yang ditulis di bawah gambar (m). */
export const DISTANCE_TICKS = [0, 200, 400, 600, 800, 1000];

/** Penanda kedalaman yang ditulis di tepi kiri gambar (m). */
export const DEPTH_TICKS = [1, 2, 3];

/** Jarak tiap kolom simulasi, dihitung sekali. */
export const COLUMN_DISTANCES = Array.from({ length: COLUMNS }, (_, col) => distanceOfColumn(col));
