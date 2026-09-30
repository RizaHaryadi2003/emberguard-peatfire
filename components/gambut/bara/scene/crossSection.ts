import * as THREE from "three";
import { PROFILE_DEPTH } from "@/lib/peat";
import { BLOCK_WIDTH } from "@/components/gambut/scene/dioramaConstants";
import { footprintRadius, interfaceY, radiusAt } from "@/components/gambut/scene/terrain";

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
 * Batas kiri & kanan bidang potong pada ketinggian y. Dipakai jari-jari tapak
 * (tanpa relief dinding) lalu disisipkan sedikit ke dalam, supaya tepi bidang
 * potong selalu berada di dalam badan bongkahan dan garis tepinya tenang.
 */
export function faceBounds(y: number): { left: number; right: number } {
  const depth = Math.min(1, Math.max(0, -y / PROFILE_DEPTH));
  const r = footprintRadius(0) * (1 - 0.06 * depth * depth) - 0.012;
  const l = footprintRadius(Math.PI) * (1 - 0.06 * depth * depth) - 0.012;
  return { left: -l, right: r };
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
        const lx = linePoint(SEGMENTS - i, w.y);
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
 * - `aDepth`: kedalaman titik (m) agar peneduh tahu ia berada di lapisan mana.
 */
export function createFaceGrid(): THREE.BufferGeometry {
  const cols = FACE_COLS + 1;
  const rows = FACE_ROWS + 1;
  const total = cols * rows;
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geom.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(total * 2), 2));
  geom.setAttribute("aDepth", new THREE.BufferAttribute(new Float32Array(total), 1));

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
  const cols = FACE_COLS + 1;

  for (let j = 0; j <= FACE_ROWS; j++) {
    const d = (j / FACE_ROWS) * PROFILE_DEPTH;
    const yBase = -d;
    const { left, right } = faceBounds(yBase);
    for (let i = 0; i <= FACE_COLS; i++) {
      const f = i / FACE_COLS;
      const x = left + (right - left) * f;
      // Baris paling atas mengikuti penurunan permukaan; makin dalam, makin
      // kecil pengaruhnya (rongga hanya menurunkan bagian di atasnya).
      const sink = drop(x) * Math.max(0, 1 - d / 0.35);
      const y = yBase - sink;
      const k = j * cols + i;
      pos.setXYZ(k, x, y, 0);
      uv.setXY(k, (x + BLOCK_WIDTH / 2) / BLOCK_WIDTH, d / PROFILE_DEPTH);
      depth.setX(k, d);
    }
  }
  pos.needsUpdate = true;
  uv.needsUpdate = true;
  depth.needsUpdate = true;
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

  for (let j = 0; j <= SURFACE_ROWS; j++) {
    const t = j / SURFACE_ROWS;
    for (let i = 0; i <= SURFACE_COLS; i++) {
      const theta = Math.PI + ((SURFACE_COLS - i) / SURFACE_COLS) * Math.PI;
      const r = radiusAt(theta, 0);
      const wx = Math.cos(theta) * r;
      const wz = Math.sin(theta) * r;
      const lx = faceBounds(0).left + ((faceBounds(0).right - faceBounds(0).left) * i) / SURFACE_COLS;
      const x = lx + (wx - lx) * t;
      const z = wz * t;
      const k = j * cols + i;
      pos.setXYZ(k, x, interfaceY(0, x, z) - drop(x), z);
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
  return interfaceY(0, x, z) - drop(x);
}
