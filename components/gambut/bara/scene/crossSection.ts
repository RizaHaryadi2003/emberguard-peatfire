import * as THREE from "three";
import { PROFILE_DEPTH } from "@/lib/peat";
import { BLOCK_WIDTH } from "@/components/gambut/scene/dioramaConstants";
import { interfaceY, radiusAt } from "@/components/gambut/scene/terrain";

// Bentuk bongkahan gambut Modul 02: bongkahan yang sama seperti Modul 01,
// tetapi dipotong tepat di tengah (bidang z = 0) dan hanya separuh belakang
// yang disisakan. Bidang potongnya menghadap kamera, sehingga seluruh kejadian
// di bawah tanah — bara, rongga abu, muka air — terlihat langsung.
//
// Semua bentuk dihitung dari fungsi yang sama dengan Modul 01 (`terrain.ts`),
// jadi ukuran, lekuk tapak, dan gelombang batas antarlapisan tetap sama.

/** Jumlah titik mengelilingi separuh tapak dan pembagian vertikal dinding. */
const SEGMENTS = 96;
const WALL_RINGS = 10;
const CAP_RINGS = 5;

/** Kerapatan kisi bidang potong (dibuat rapat karena semua detail ada di sini). */
export const FACE_COLS = 128;
export const FACE_ROWS = 96;

/** Kerapatan kisi permukaan tanah (untuk memperlihatkan penurunan permukaan). */
export const SURFACE_COLS = 72;
export const SURFACE_ROWS = 28;

/** Berapa kali tekstur gambut diulang per meter (sama dengan Modul 01). */
export const UV_PER_METER = 0.75;

/** Bidang potong digeser sedikit ke depan agar tidak bersaing dengan badan bongkahan. */
export const FACE_Z = 0.004;

/** Fungsi penurunan permukaan (m) pada posisi x akibat rongga abu di bawahnya. */
export type DropFn = (x: number) => number;

const NO_DROP: DropFn = () => 0;

/** Sudut θ untuk kolom ke-i pada separuh belakang tapak (z ≤ 0). */
function thetaAt(i: number): number {
  return Math.PI + (i / SEGMENTS) * Math.PI;
}

/**
 * Relief permukaan gambut (m, bertanda) di titik (x, z). Permukaan gambut
 * alami tidak rata melainkan bergundukan: tumpukan lumut dan akar membentuk
 * gundukan rendah selebar satu sampai dua meter.
 *
 * Tanpa relief ini, tepi atas bidang potong menjadi garis lurus sempurna
 * sepanjang 4,4 m — penyebab utama bongkahan tampak seperti kue yang
 * dipotong, bukan tanah yang digali.
 *
 * Hanya dipakai Modul 02. `interfaceY` pada `terrain.ts` sengaja tidak diubah
 * agar tampilan Modul 01 yang sudah jadi tidak bergeser.
 */
export function surfaceRelief(x: number, z: number): number {
  return (
    0.04 * Math.sin(x * 1.15 + 0.6) * Math.cos(z * 0.9 - 0.4) +
    0.021 * Math.sin(x * 2.4 - z * 1.7 + 2.2) +
    0.01 * Math.sin(x * 5.1 + 1.3) * Math.cos(z * 4.3 + 0.2)
  );
}

/**
 * Seberapa jauh tepi kiri/kanan bidang potong disisipkan ke dalam badan
 * bongkahan (m). Nilainya selalu positif dan berubah terhadap ketinggian,
 * sehingga garis tepi potongan berkelok seperti bekas galian — namun tidak
 * pernah keluar dari badan bongkahan.
 */
function faceInset(y: number): number {
  return 0.016 + 0.02 * (0.5 + 0.5 * Math.sin(y * 5.3 + 0.9)) + 0.011 * (0.5 + 0.5 * Math.sin(y * 11.7 - 2.1));
}

/**
 * Batas kiri & kanan bidang potong pada ketinggian y.
 *
 * Diukur dari dinding badan bongkahan itu sendiri (`radiusAt`) lalu disisipkan
 * ke dalam sebanyak `faceInset`. Dua akibat baiknya: tepi potongan dijamin
 * tidak pernah menyembul keluar dari badan, dan garis tepinya ikut berkelok
 * bersama relief dinding, bukan lurus sempurna.
 */
export function faceBounds(y: number): { left: number; right: number } {
  const inset = faceInset(y);
  return { left: -(radiusAt(Math.PI, y) - inset), right: radiusAt(0, y) - inset };
}

/** Simpangan dasar profil (m) dari kedalaman nominal, di titik (x, z). */
function floorOffset(x: number, z: number): number {
  return interfaceY(PROFILE_DEPTH, x, z) + PROFILE_DEPTH;
}

/**
 * Ketinggian titik bidang potong (y, m) pada kedalaman nominal `d`.
 *
 * Bagian tengah profil dibiarkan setia pada kedalaman nominal supaya garis
 * muka air tanah tetap mendatar seperti kenyataannya. Yang dilengkungkan
 * hanya kedua ujungnya: relief permukaan meluruh dalam 55 cm teratas, dan
 * gelombang batas tanah mineral baru terasa setelah mendekati dasar.
 */
export function profileY(d: number, x: number, z = 0): number {
  const top = Math.max(0, 1 - d / 0.55);
  const bottom = Math.pow(Math.min(1, d / PROFILE_DEPTH), 2.5);
  return -d + surfaceRelief(x, z) * top * top + floorOffset(x, z) * bottom;
}

/**
 * Badan separuh bongkahan untuk satu lapisan: dinding belakang melengkung
 * berelief, ditutup di atas dan di bawah. Bidang potong di depan sengaja
 * dibiarkan terbuka karena sudah ditutup oleh mesh bidang potong.
 */
export function createHalfBody(): THREE.BufferGeometry {
  const cols = SEGMENTS + 1;
  const wallCount = cols * (WALL_RINGS + 1);
  const capCount = cols * (CAP_RINGS + 1);
  const total = wallCount + capCount * 2;

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geom.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(total * 2), 2));
  geom.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(total * 3), 3));

  const idx: number[] = [];
  for (let j = 0; j < WALL_RINGS; j++) {
    for (let i = 0; i < SEGMENTS; i++) {
      const a = j * cols + i;
      idx.push(a, a + cols, a + 1, a + 1, a + cols, a + cols + 1);
    }
  }
  // Tutup: kisi antara garis potong (t = 0) dan tepi dinding (t = 1).
  const addCap = (start: number, up: boolean) => {
    for (let k = 0; k < CAP_RINGS; k++) {
      for (let i = 0; i < SEGMENTS; i++) {
        const a = start + k * cols + i;
        const quad = [a, a + 1, a + cols, a + 1, a + cols + 1, a + cols];
        idx.push(...(up ? quad : [a, a + cols, a + 1, a + 1, a + cols, a + cols + 1]));
      }
    }
  };
  addCap(wallCount, true);
  addCap(wallCount + capCount, false);
  geom.setIndex(idx);
  return geom;
}

type HeightFn = (x: number, z: number) => number;

/**
 * Bentuk badan lapisan di antara dua permukaan. `drop` menurunkan permukaan
 * paling atas mengikuti rongga abu di bawahnya.
 */
export function updateHalfBody(
  geom: THREE.BufferGeometry,
  bottom: HeightFn,
  top: HeightFn,
  drop: DropFn = NO_DROP,
): void {
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const uv = geom.attributes.uv as THREE.BufferAttribute;
  const cols = SEGMENTS + 1;
  const wallCount = cols * (WALL_RINGS + 1);
  const capCount = cols * (CAP_RINGS + 1);

  const topEdge: THREE.Vector3[] = [];
  const botEdge: THREE.Vector3[] = [];

  for (let i = 0; i < cols; i++) {
    const theta = thetaAt(i);
    const r0 = radiusAt(theta, 0);
    const x0 = Math.cos(theta) * r0;
    const z0 = Math.sin(theta) * r0;
    const yb = bottom(x0, z0);
    const yt = Math.max(yb, top(x0, z0) - drop(x0));
    const u = theta * 1.9 * UV_PER_METER;
    for (let j = 0; j <= WALL_RINGS; j++) {
      const y = yb + ((yt - yb) * j) / WALL_RINGS;
      const r = radiusAt(theta, y);
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      pos.setXYZ(j * cols + i, x, y, z);
      uv.setXY(j * cols + i, u, y * UV_PER_METER);
      if (j === 0) botEdge.push(new THREE.Vector3(x, y, z));
      if (j === WALL_RINGS) topEdge.push(new THREE.Vector3(x, y, z));
    }
  }

  // Titik pada garis potong (z = 0) yang berpasangan dengan kolom ke-i.
  const linePoint = (i: number, y: number) => {
    const { left, right } = faceBounds(y);
    return left + ((right - left) * i) / SEGMENTS;
  };

  const fillCap = (start: number, edge: THREE.Vector3[], height: HeightFn, isTop: boolean) => {
    for (let k = 0; k <= CAP_RINGS; k++) {
      const t = k / CAP_RINGS;
      for (let i = 0; i < cols; i++) {
        const w = edge[i];
        // Kolom dinding ke-i berpasangan dengan titik garis potong di ujung
        // yang sama: `thetaAt(0)` = π berada di kiri, dan `linePoint(0)` juga
        // di kiri. Memakai `SEGMENTS - i` memasangkannya dengan ujung yang
        // berlawanan sehingga lembar tutup terpelintir dan bongkahan kehilangan
        // bentuknya.
        const lx = linePoint(i, w.y);
        const x = lx + (w.x - lx) * t;
        const z = w.z * t;
        const y = k === CAP_RINGS ? w.y : height(x, z) - (isTop ? drop(x) : 0);
        const v = start + k * cols + i;
        pos.setXYZ(v, x, y, z);
        uv.setXY(v, x * UV_PER_METER, z * UV_PER_METER);
      }
    }
  };
  fillCap(wallCount, topEdge, top, true);
  fillCap(wallCount + capCount, botEdge, bottom, false);

  pos.needsUpdate = true;
  uv.needsUpdate = true;
  geom.computeVertexNormals();
  geom.computeBoundingSphere();
}

/**
 * Kisi bidang potong: satu mesh datar di z ≈ 0 yang menutupi seluruh profil,
 * dari permukaan sampai dasar tanah mineral. Atributnya:
 * - `position`: titik dalam meter (x, y),
 * - `uv`: 0–1 pada bidang potong, dipakai untuk membaca tekstur simulasi,
 * - `aDepth`: kedalaman titik (m) agar peneduh tahu ia berada di lapisan mana,
 * - `aEdge`: kedudukan mendatar 0–1 diukur dari tepi kiri bidang potong.
 *
 * `aEdge` tidak sama dengan `uv.x`: `uv` mengikuti lebar penuh bongkahan agar
 * cocok dengan kisi simulasi, sedangkan tepi bidang potong berada sedikit di
 * dalamnya. Penggaris kedalaman memakai `aEdge` supaya benar-benar menempel
 * pada tepi potongan, bukan terpotong di luar bidang.
 */
export function createFaceGrid(): THREE.BufferGeometry {
  const cols = FACE_COLS + 1;
  const rows = FACE_ROWS + 1;
  const total = cols * rows;
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geom.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(total * 2), 2));
  geom.setAttribute("aDepth", new THREE.BufferAttribute(new Float32Array(total), 1));
  geom.setAttribute("aEdge", new THREE.BufferAttribute(new Float32Array(total), 1));

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

/** Isi (atau perbarui) titik-titik bidang potong; `drop` menurunkan baris teratas. */
export function updateFaceGrid(geom: THREE.BufferGeometry, drop: DropFn = NO_DROP): void {
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const uv = geom.attributes.uv as THREE.BufferAttribute;
  const depth = geom.attributes.aDepth as THREE.BufferAttribute;
  const edge = geom.attributes.aEdge as THREE.BufferAttribute;
  const cols = FACE_COLS + 1;

  for (let j = 0; j <= FACE_ROWS; j++) {
    const d = (j / FACE_ROWS) * PROFILE_DEPTH;
    const { left, right } = faceBounds(-d);
    for (let i = 0; i <= FACE_COLS; i++) {
      const f = i / FACE_COLS;
      const x = left + (right - left) * f;
      // Baris paling atas mengikuti penurunan permukaan; makin dalam, makin
      // kecil pengaruhnya (rongga hanya menurunkan bagian di atasnya).
      const sink = drop(x) * Math.max(0, 1 - d / 0.35);
      const y = profileY(d, x) - sink;
      const k = j * cols + i;
      pos.setXYZ(k, x, y, 0);
      uv.setXY(k, (x + BLOCK_WIDTH / 2) / BLOCK_WIDTH, d / PROFILE_DEPTH);
      depth.setX(k, d);
      edge.setX(k, f);
    }
  }
  pos.needsUpdate = true;
  uv.needsUpdate = true;
  depth.needsUpdate = true;
  edge.needsUpdate = true;
  geom.computeVertexNormals();
  geom.computeBoundingSphere();
}

/** Kisi permukaan tanah pada separuh tapak (z ≤ 0), agar bisa ikut melesak. */
export function createSurfaceGrid(): THREE.BufferGeometry {
  const cols = SURFACE_COLS + 1;
  const rows = SURFACE_ROWS + 1;
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(cols * rows * 3), 3));
  geom.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(cols * rows * 2), 2));
  geom.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(cols * rows * 3), 3));
  // Urutan titik dibalik dibanding kisi bidang potong agar mukanya menghadap
  // ke atas (langit), bukan ke bawah.
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

/**
 * Bentuk permukaan tanah: dari garis potong (z = 0) ke tepi belakang tapak.
 * Titiknya melesak sesuai `drop` sehingga permukaan tampak turun di atas
 * rongga abu.
 */
export function updateSurfaceGrid(geom: THREE.BufferGeometry, drop: DropFn = NO_DROP): void {
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const uv = geom.attributes.uv as THREE.BufferAttribute;
  const cols = SURFACE_COLS + 1;

  // Garis potong sama untuk semua baris, jadi cukup dihitung sekali.
  const line = faceBounds(0);
  for (let j = 0; j <= SURFACE_ROWS; j++) {
    const t = j / SURFACE_ROWS;
    for (let i = 0; i <= SURFACE_COLS; i++) {
      const theta = Math.PI + ((SURFACE_COLS - i) / SURFACE_COLS) * Math.PI;
      const r = radiusAt(theta, 0);
      const wx = Math.cos(theta) * r;
      const wz = Math.sin(theta) * r;
      // Pada i = 0 sudut θ bernilai 2π, yaitu tepi kanan, jadi titik garis
      // potong yang berpasangan juga harus diambil dari kanan.
      const lx = line.left + ((line.right - line.left) * (SURFACE_COLS - i)) / SURFACE_COLS;
      const x = lx + (wx - lx) * t;
      const z = wz * t;
      const k = j * cols + i;
      pos.setXYZ(k, x, surfaceYAt(x, z, drop), z);
      uv.setXY(k, x * 0.55, z * 0.55);
    }
  }
  pos.needsUpdate = true;
  uv.needsUpdate = true;
  geom.computeVertexNormals();
  geom.computeBoundingSphere();
}

/** Ketinggian permukaan (y) pada posisi x setelah melesak, untuk menaruh tumbuhan. */
export function surfaceYAt(x: number, z: number, drop: DropFn = NO_DROP): number {
  return interfaceY(0, x, z) + surfaceRelief(x, z) - drop(x);
}
