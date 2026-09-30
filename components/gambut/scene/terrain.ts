import * as THREE from "three";
import { PROFILE_DEPTH } from "@/lib/peat";
import { BLOCK_DEPTH, BLOCK_WIDTH } from "./dioramaConstants";

// Bentuk bongkahan tanah yang alami (bukan kotak): tapak membulat tak
// beraturan, dinding samping berelief seperti tanah yang digali, dan batas
// antarlapisan yang bergelombang. Semua bentuk dihitung dari fungsi
// deterministik sehingga irisan yang bersebelahan selalu menyambung rapat.

/** Jumlah titik mengelilingi tapak & pembagian vertikal dinding tiap irisan. */
const SEGMENTS = 144;
const WALL_RINGS = 12;
const CAP_RINGS = 4;

/** Berapa kali tekstur diulang per meter. */
const UV_PER_METER = 0.75;

/** Jari-jari tapak pada sudut θ: persegi membulat (superelips) yang sedikit bergelombang. */
export function footprintRadius(theta: number): number {
  const a = BLOCK_WIDTH / 2;
  const b = BLOCK_DEPTH / 2;
  const n = 3.2;
  const c = Math.abs(Math.cos(theta));
  const s = Math.abs(Math.sin(theta));
  const r = 1 / Math.pow(Math.pow(c / a, n) + Math.pow(s / b, n), 1 / n);
  const wobble = 1 + 0.045 * Math.sin(3 * theta + 0.7) + 0.03 * Math.sin(5 * theta + 2.1) + 0.018 * Math.sin(9 * theta + 0.3);
  return r * wobble;
}

/**
 * Relief dinding (m): gumpalan lebar & tonjolan mendatar seperti tanah yang
 * digali. Frekuensi di arah keliling sengaja dibuat rendah dibanding jumlah
 * titik (SEGMENTS) agar tidak muncul garis-garis vertikal (aliasing).
 */
function wallRelief(theta: number, y: number): number {
  return (
    0.032 * Math.sin(theta * 11 + y * 6.5) * Math.cos(theta * 5 - y * 3.7) +
    0.016 * Math.sin(theta * 19 - y * 11) +
    0.012 * Math.sin(y * 23 + theta * 3) * (0.6 + 0.4 * Math.sin(theta * 7))
  );
}

/** Jari-jari dinding pada sudut θ dan ketinggian y (sedikit menyempit ke bawah). */
export function radiusAt(theta: number, y: number): number {
  const depth = Math.min(1, Math.max(0, -y / PROFILE_DEPTH));
  return footprintRadius(theta) * (1 - 0.06 * depth * depth) + wallRelief(theta, y);
}

/**
 * Ketinggian batas lapisan pada kedalaman nominal `d` (m) di titik (x, z).
 * Permukaan (d = 0) rata; batas di dalam tanah bergelombang lembut, dan
 * dasar profil lebih tidak beraturan.
 */
export function interfaceY(d: number, x: number, z: number): number {
  if (d <= 0) return 0;
  const amp = d >= PROFILE_DEPTH ? 0.12 : 0.07;
  return -d + amp * (Math.sin(x * 1.4 + d * 2.3) * Math.cos(z * 1.9 - d) + 0.5 * Math.sin(x * 3.1 - z * 2.2 + d * 5));
}

/** Apakah titik (x, z) berada di dalam tapak, dengan jarak aman `margin` dari tepi. */
export function isInsideFootprint(x: number, z: number, margin = 0): boolean {
  const theta = Math.atan2(z, x);
  return Math.hypot(x, z) < footprintRadius(theta) * 0.94 - margin;
}

/** Titik pada dinding luar di sudut θ dan ketinggian y (untuk menempelkan akar/batu). */
export function wallPoint(theta: number, y: number, inset = 0): THREE.Vector3 {
  const r = radiusAt(theta, y) - inset;
  return new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r);
}

type HeightFn = (x: number, z: number) => number;

/**
 * Geometri satu irisan dengan topologi tetap: dinding (grid mengelilingi
 * tapak) + tutup atas + tutup bawah (cincin konsentris). Posisi titik diisi
 * oleh `updateSlab`, sehingga irisan bisa dibentuk ulang tanpa membuat
 * geometri baru.
 */
export function createSlab(): THREE.BufferGeometry {
  const cols = SEGMENTS + 1;
  const wallCount = cols * (WALL_RINGS + 1);
  const capCount = SEGMENTS * CAP_RINGS + 1;
  const total = wallCount + capCount * 2;

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geom.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(total * 2), 2));
  geom.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(total * 3), 3));

  const idx: number[] = [];
  // Dinding: tiap kotak kecil dibagi dua segitiga (menghadap keluar).
  for (let j = 0; j < WALL_RINGS; j++) {
    for (let i = 0; i < SEGMENTS; i++) {
      const a = j * cols + i;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  // Tutup: pusat lalu cincin 1..CAP_RINGS (cincin terluar = tepi dinding).
  const addCap = (start: number, up: boolean) => {
    const center = start;
    const ring = (k: number, i: number) => start + 1 + (k - 1) * SEGMENTS + (i % SEGMENTS);
    for (let i = 0; i < SEGMENTS; i++) {
      const tri = [center, ring(1, i + 1), ring(1, i)];
      idx.push(...(up ? tri : [tri[0], tri[2], tri[1]]));
    }
    for (let k = 1; k < CAP_RINGS; k++) {
      for (let i = 0; i < SEGMENTS; i++) {
        const a = ring(k, i);
        const b = ring(k, i + 1);
        const c = ring(k + 1, i);
        const d = ring(k + 1, i + 1);
        const quad = [a, b, c, b, d, c];
        idx.push(...(up ? quad : [a, c, b, b, c, d]));
      }
    }
  };
  addCap(wallCount, true);
  addCap(wallCount + capCount, false);
  geom.setIndex(idx);
  return geom;
}

/**
 * Bentuk irisan di antara dua permukaan: `bottom(x, z)` dan `top(x, z)`.
 * Mengembalikan ketebalan maksimum (m) agar pemanggil dapat menyembunyikan
 * irisan yang tipisnya nol.
 */
export function updateSlab(geom: THREE.BufferGeometry, bottom: HeightFn, top: HeightFn): number {
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const uv = geom.attributes.uv as THREE.BufferAttribute;
  const cols = SEGMENTS + 1;
  const wallCount = cols * (WALL_RINGS + 1);
  const capCount = SEGMENTS * CAP_RINGS + 1;
  let maxThickness = 0;

  // Titik tepi atas & bawah dinding dipakai lagi oleh cincin terluar tutup.
  const topEdge: [number, number, number][] = [];
  const botEdge: [number, number, number][] = [];

  for (let i = 0; i < cols; i++) {
    const theta = (i / SEGMENTS) * Math.PI * 2;
    const r0 = footprintRadius(theta);
    const x0 = Math.cos(theta) * r0;
    const z0 = Math.sin(theta) * r0;
    const yb = bottom(x0, z0);
    const yt = Math.max(yb, top(x0, z0));
    maxThickness = Math.max(maxThickness, yt - yb);
    // Koordinat u mengikuti keliling agar tekstur tidak meregang di dinding.
    const u = theta * 1.9 * UV_PER_METER;
    for (let j = 0; j <= WALL_RINGS; j++) {
      const y = yb + ((yt - yb) * j) / WALL_RINGS;
      const r = radiusAt(theta, y);
      const k = j * cols + i;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      pos.setXYZ(k, x, y, z);
      uv.setXY(k, u, y * UV_PER_METER);
      if (i < SEGMENTS && j === 0) botEdge.push([x, y, z]);
      if (i < SEGMENTS && j === WALL_RINGS) topEdge.push([x, y, z]);
    }
  }

  const fillCap = (start: number, edge: [number, number, number][], heightFn: HeightFn, other: HeightFn, isTop: boolean) => {
    const hc = heightFn(0, 0);
    const oc = other(0, 0);
    pos.setXYZ(start, 0, isTop ? Math.max(hc, oc) : Math.min(hc, oc), 0);
    uv.setXY(start, 0, 0);
    for (let k = 1; k <= CAP_RINGS; k++) {
      const f = k / CAP_RINGS;
      for (let i = 0; i < SEGMENTS; i++) {
        const [ex, ey, ez] = edge[i];
        const x = ex * f;
        const z = ez * f;
        let y = ey;
        if (k < CAP_RINGS) {
          // Titik di dalam tutup mengikuti gelombang batas lapisan.
          const h = heightFn(x, z);
          const o = other(x, z);
          y = isTop ? Math.max(h, o) : Math.min(h, o);
        }
        const v = start + 1 + (k - 1) * SEGMENTS + i;
        pos.setXYZ(v, x, y, z);
        uv.setXY(v, x * UV_PER_METER, z * UV_PER_METER);
      }
    }
  };
  fillCap(wallCount, topEdge, top, bottom, true);
  fillCap(wallCount + capCount, botEdge, bottom, top, false);

  pos.needsUpdate = true;
  uv.needsUpdate = true;
  geom.computeVertexNormals();
  geom.computeBoundingBox();
  geom.computeBoundingSphere();
  return maxThickness;
}

/** Pita tipis mengelilingi dinding pada ketinggian y (garis muka air tanah). */
export function createRibbon(): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array((SEGMENTS + 1) * 2 * 3), 3));
  const idx: number[] = [];
  for (let i = 0; i < SEGMENTS; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  geom.setIndex(idx);
  return geom;
}

export function updateRibbon(geom: THREE.BufferGeometry, y: number, halfHeight = 0.008): void {
  const pos = geom.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i <= SEGMENTS; i++) {
    const theta = (i / SEGMENTS) * Math.PI * 2;
    const r = radiusAt(theta, y) + 0.012;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    pos.setXYZ(i * 2, x, y - halfHeight, z);
    pos.setXYZ(i * 2 + 1, x, y + halfHeight, z);
  }
  pos.needsUpdate = true;
  geom.computeBoundingSphere();
}

/** Bentuk tapak pada permukaan (y = 0) sebagai geometri datar untuk lantai hutan. */
export function createSurfaceGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i <= SEGMENTS; i++) {
    const theta = (i / SEGMENTS) * Math.PI * 2;
    const r = radiusAt(theta, 0);
    // Bentuk dibuat di bidang XY lalu diputar ke XZ: sumbu y bentuk = −z dunia.
    const x = Math.cos(theta) * r;
    const y = -Math.sin(theta) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const geom = new THREE.ShapeGeometry(shape, 24);
  geom.rotateX(-Math.PI / 2);
  return geom;
}
