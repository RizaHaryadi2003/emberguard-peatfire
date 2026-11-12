import * as THREE from "three";
import { radiusAt } from "@/components/modul/scene/terrain";
import {
  DIORAMA_BASE_YAW,
  DIORAMA_CAMERA_POSES,
  DIORAMA_TREE_SPOTS,
  DIORAMA_Y,
  MAX_ROTATION,
} from "@/components/modul/scene/dioramaConstants";
import { PROFILE_DEPTH } from "@/lib/peat";

// Ukuran bongkahan di layar lebar. Bongkahan dibesarkan sampai sepenuh ruang
// kosong di antara kolom teks kiri dan kanan, pada sudut putar mana pun, jadi
// ia tidak pernah menyentuh teks.

export const CAMERA_FOV = 34;

/** Mulai lebar ini (piksel), kolom teks kiri dan kanan tampil berdampingan. */
const WIDE_LAYOUT = 1024;

/** Jarak aman dari kolom teks (piksel). */
const TEXT_GAP = 24;

export type ReadingArea = { left: number; right: number; top: number; bottom: number };

/**
 * Ruang layar yang bebas dari teks. Angkanya mengikuti tata letak BaraModule:
 * kolom kiri 56 + 404 piksel, kolom kanan 236 piksel dari tepi kanan 20 atau
 * 40 piksel, bilah navigasi di atas, dan baris petunjuk di bawah.
 */
export function readingArea(width: number, height: number): ReadingArea | null {
  if (width < WIDE_LAYOUT) return null;
  return {
    left: 56 + 404 + TEXT_GAP,
    right: width - ((width >= 1280 ? 40 : 20) + 236 + TEXT_GAP),
    top: 72,
    bottom: height - 64,
  };
}

export type ViewFit = { zoom: number; offsetX: number; offsetY: number };

const UP = new THREE.Vector3(0, 1, 0);

/** Titik-titik terluar badan tanah. */
const SOIL_OUTLINE: THREE.Vector3[] = (() => {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= 28; i++) {
    const theta = Math.PI + (i / 28) * Math.PI;
    for (const y of [0, -PROFILE_DEPTH]) {
      const r = radiusAt(theta, y);
      points.push(new THREE.Vector3(Math.cos(theta) * r, y + DIORAMA_Y, Math.sin(theta) * r));
    }
  }
  return points;
})();

/** Titik-titik terluar pohon di belakang potongan. */
const TREE_OUTLINE: THREE.Vector3[] = (() => {
  const points: THREE.Vector3[] = [];
  for (const [x, z, height] of DIORAMA_TREE_SPOTS) {
    if (z >= 0) continue;
    points.push(new THREE.Vector3(x, height + DIORAMA_Y, z));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const crown = height * 0.45;
      points.push(new THREE.Vector3(x + Math.cos(a) * crown, height * 0.75 + DIORAMA_Y, z + Math.sin(a) * crown));
    }
  }
  return points;
})();

/**
 * Sudut putar yang diuji. Tanah diuji sampai kedua batas seretan, sehingga ia
 * tidak pernah menyentuh teks. Tajuk pohon yang lebih lebar dari tanah hanya
 * diuji pada posisi diam; kalau ikut diuji sampai batas seretan, seluruh
 * bongkahan harus mengecil demi daun yang jarang berada di sana.
 */
const SOIL_YAWS = [-1, -0.66, -0.33, 0, 0.33, 0.66, 1].map(
  (f) => DIORAMA_BASE_YAW + f * (MAX_ROTATION + 0.06),
);
const REST_YAWS = [DIORAMA_BASE_YAW - 0.06, DIORAMA_BASE_YAW + 0.06];

const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 400);
const probe = new THREE.Vector3();

/** Kotak pembatas diorama di layar (piksel) pada faktor jarak `zoom`. */
function screenBounds(zoom: number, poseIndex: number, width: number, height: number) {
  const pose = DIORAMA_CAMERA_POSES[poseIndex];
  const target = new THREE.Vector3(...pose.target);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  camera.position.set(...pose.pos).sub(target).multiplyScalar(zoom).add(target);
  camera.lookAt(target);
  camera.updateMatrixWorld();

  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;
  const measure = (points: THREE.Vector3[], yaws: number[]) => {
    for (const yaw of yaws) {
      for (const point of points) {
        probe.copy(point).applyAxisAngle(UP, yaw).project(camera);
        const x = (probe.x * 0.5 + 0.5) * width;
        const y = (-probe.y * 0.5 + 0.5) * height;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  };
  measure(SOIL_OUTLINE, SOIL_YAWS);
  measure(TREE_OUTLINE, REST_YAWS);
  return { left, right, top, bottom };
}

/**
 * Faktor jarak kamera terkecil (bongkahan terbesar) yang masih muat di ruang
 * bebas teks, beserta pergeseran gambar agar bongkahan berada di tengah ruang itu.
 */
export function fitView(poseIndex: number, width: number, height: number): ViewFit | null {
  const area = readingArea(width, height);
  if (!area) return null;
  const roomW = area.right - area.left;
  const roomH = area.bottom - area.top;

  let near = 0.5;
  let far = 2;
  for (let i = 0; i < 14; i++) {
    const mid = (near + far) / 2;
    const b = screenBounds(mid, poseIndex, width, height);
    if (b.right - b.left <= roomW && b.bottom - b.top <= roomH) far = mid;
    else near = mid;
  }
  const b = screenBounds(far, poseIndex, width, height);
  return {
    zoom: far,
    offsetX: (b.left + b.right) / 2 - (area.left + area.right) / 2,
    offsetY: (b.top + b.bottom) / 2 - (area.top + area.bottom) / 2,
  };
}
