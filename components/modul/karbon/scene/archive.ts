import * as THREE from "three";
import { PROFILE_DEPTH } from "@/lib/model/peat";
import { BLOCK_DEPTH, BLOCK_WIDTH } from "@/components/modul/shared/scene/dioramaConstants";
import { interfaceY, radiusAt } from "@/components/modul/shared/scene/terrain";
import { faceBounds, surfaceRelief, UV_PER_METER } from "@/components/modul/bara/scene/crossSection";

// Bentuk bongkahan Modul Karbon: separuh bongkahan yang sama dengan Modul Bara,
// dibaca sebagai arsip.
//
// --- Mengapa bongkahan yang sama, bukan gambar baru -------------------------
//
// Yang diajarkan modul ini bukan peristiwa melainkan pembacaan: bidang potong
// yang sejak Modul Anatomi dibaca pembaca sebagai "lapisan tanah" sebenarnya juga
// sebuah kalender (satu milimeter satu tahun) dan juga sebuah gudang (lima
// puluh lima kilogram karbon tiap meter kubik). Pembacaan baru atas gambar yang
// sudah dikenal hanya mungkin bila gambarnya memang yang sudah dikenal.
//
// Karena itu bentuknya diambil langsung dari Modul Bara, bukan disalin: tapak
// membulat, dinding berelief, tepi bidang potong yang ikut berkelok
// (`faceBounds`), dan relief permukaan yang sama (`surfaceRelief`). Semula
// bongkahan ini sebuah kotak bersudut tajam dengan dinding kelabu polos, dan
// kotak seperti itu terbaca sebagai benda lain, bukan petak tanah yang sama.
//
// --- Satuan ------------------------------------------------------------------
//
// Satu satuan adegan = satu meter, mendatar maupun tegak. Tidak ada pembesaran
// tegak, sebab modul yang seluruhnya tentang membandingkan besar tidak boleh
// mengawalinya dengan penggaris yang sudah dibengkokkan.
//
// y = 0 kira-kira permukaan gambut asal, sebelum apa pun terbakar. Kedalaman
// di berkas ini dan di peneduhnya diukur dari permukaan asal itu, bukan dari
// permukaan yang sedang berlaku, sebab garis-garis abad pada bidang potong
// menandai timbunan yang sudah ada sejak dahulu, dan timbunan itu tidak
// berpindah hanya karena bagian atasnya habis terbakar.

export { surfaceRelief, UV_PER_METER };

/** Lebar bongkahan (m), sama dengan Modul Anatomi dan Bara. */
export const BLOCK_W = BLOCK_WIDTH;

/** Tebal separuh bongkahan ke arah belakang (m), dari bidang potong ke tepi tapak. */
export const BLOCK_D = BLOCK_DEPTH / 2;

/** Kedalaman dasar bongkahan di bawah permukaan asal (m). */
export const FLOOR_DEPTH_M = PROFILE_DEPTH;

/** Ketinggian dasar bongkahan (satuan adegan). */
export const FLOOR_Y = -FLOOR_DEPTH_M;

/**
 * Kedudukan bidang potong pada sumbu z. Digeser sedikit ke depan, sama seperti
 * Modul Bara, supaya tidak bersaing dengan tepi badan bongkahan.
 */
export const FACE_Z = 0.004;

/**
 * Kerapatan kisi bidang potong.
 *
 * Barisnya lebih banyak daripada kolomnya: isi bidang potong seluruhnya fungsi
 * kedalaman, sedangkan kolom hanya perlu mengikuti relief permukaan dan
 * kelokan tepi kiri-kanan.
 */
export const FACE_COLS = 48;
export const FACE_ROWS = 64;

/**
 * Ketinggian permukaan asal (satuan adegan) pada titik (x, z).
 *
 * Inilah acuan seluruh modul: garis yang menandai setinggi mana gambut ini
 * berada sebelum ada yang membakarnya.
 */
export function originalTopY(x: number, z: number): number {
  return surfaceRelief(x, z);
}

/**
 * Ketinggian permukaan yang sedang berlaku (satuan adegan).
 *
 * Turun sebanyak yang terbakar, lalu naik kembali sebanyak yang sudah
 * tertimbun ulang. Keduanya dipisah karena babak 03 justru membandingkan
 * keduanya: yang hilang dalam beberapa minggu melawan yang kembali dalam
 * beberapa abad.
 */
export function currentTopY(x: number, z: number, burnM: number, regrownM: number): number {
  return originalTopY(x, z) - Math.max(0, burnM - regrownM);
}

/** Kedalaman di bawah permukaan asal (m) untuk titik (x, z, y). */
export function depthAt(x: number, z: number, y: number): number {
  return originalTopY(x, z) - y;
}

/** Ketinggian dasar bongkahan pada titik (x, z): gelombang batas tanah mineral. */
function floorY(x: number, z: number): number {
  return interfaceY(PROFILE_DEPTH, x, z);
}

/** Tepi kiri bidang potong pada kedalaman d di bawah permukaan asal (m). */
export function faceLeftX(d: number): number {
  return faceBounds(-d).left;
}

// ---------------------------------------------------------------------------
//  BIDANG POTONG
// ---------------------------------------------------------------------------

/**
 * Kisi bidang potong di muka bongkahan.
 *
 * Atributnya:
 * - `position` : titik dalam satuan adegan,
 * - `normal`   : tetap menghadap kamera; bidang ini memang rata,
 * - `uv`       : koordinat tekstur menurut meter, untuk peta normal,
 * - `aDepth`   : kedalaman titik di bawah permukaan asal (m).
 *
 * `aDepth` tidak dapat diturunkan dari ketinggian di dalam peneduh, sebab
 * permukaan asalnya bergelombang: satu ketinggian yang sama berada pada
 * kedalaman yang berbeda-beda tergantung di mana ia diukur.
 */
export function createFaceGrid(): THREE.BufferGeometry {
  const cols = FACE_COLS + 1;
  const rows = FACE_ROWS + 1;
  const total = cols * rows;
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geom.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(total * 2), 2));
  geom.setAttribute("aDepth", new THREE.BufferAttribute(new Float32Array(total), 1));

  // Bidang potong menghadap kamera dan tidak pernah berputar, jadi normalnya
  // tetap sepanjang modul ini hidup.
  const normals = new Float32Array(total * 3);
  for (let k = 0; k < total; k++) normals[k * 3 + 2] = 1;
  geom.setAttribute("normal", new THREE.BufferAttribute(normals, 3));

  const idx: number[] = [];
  for (let j = 0; j < FACE_ROWS; j++) {
    for (let i = 0; i < FACE_COLS; i++) {
      const a = j * cols + i;
      idx.push(a, a + cols, a + 1, a + 1, a + cols, a + cols + 1);
    }
  }
  geom.setIndex(idx);
  updateFaceGrid(geom, 0, 0);
  return geom;
}

/**
 * Perbarui bidang potong untuk keadaan bakar dan timbunan ulang tertentu.
 *
 * Tiap baris membentang dari permukaan yang sedang berlaku sampai dasar
 * bongkahan. Tepi kiri-kanannya diambil dari `faceBounds` pada ketinggian
 * titiknya sendiri, sehingga bidang potong selalu menempel pada dinding
 * berelief dan tidak pernah menyembul keluar darinya. Ketinggian titik
 * bergantung pada x dan x bergantung pada tepi, jadi tepinya ditaksir sekali
 * dari ketinggian rata-rata baris lalu dihitung ulang sekali, seperti Modul Bara.
 */
export function updateFaceGrid(geom: THREE.BufferGeometry, burnM: number, regrownM: number): void {
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const uv = geom.attributes.uv as THREE.BufferAttribute;
  const depth = geom.attributes.aDepth as THREE.BufferAttribute;
  const posArr = pos.array as Float32Array;
  const uvArr = uv.array as Float32Array;
  const depthArr = depth.array as Float32Array;
  const cols = FACE_COLS + 1;
  const gap = Math.max(0, burnM - regrownM);

  for (let j = 0; j <= FACE_ROWS; j++) {
    const t = j / FACE_ROWS;
    const guess = faceBounds(-gap + (gap - PROFILE_DEPTH) * t);
    for (let i = 0; i < cols; i++) {
      const f = i / FACE_COLS;
      let x = guess.left + (guess.right - guess.left) * f;
      const top = originalTopY(x, 0) - gap;
      const y0 = top + (floorY(x, 0) - top) * t;
      const b = faceBounds(y0);
      x = b.left + (b.right - b.left) * f;
      const origin = originalTopY(x, 0);
      const yTop = origin - gap;
      const y = yTop + (floorY(x, 0) - yTop) * t;

      const k = j * cols + i;
      posArr[k * 3] = x;
      posArr[k * 3 + 1] = y;
      posArr[k * 3 + 2] = FACE_Z;
      uvArr[k * 2] = x * UV_PER_METER;
      uvArr[k * 2 + 1] = y * UV_PER_METER;
      depthArr[k] = origin - y;
    }
  }

  pos.needsUpdate = true;
  uv.needsUpdate = true;
  depth.needsUpdate = true;
  geom.computeBoundingSphere();
}

// ---------------------------------------------------------------------------
//  GARIS BENTUK YANG HILANG
// ---------------------------------------------------------------------------

/** Jumlah titik garis lengkung tepi atas tapak (separuh belakang). */
const OUTLINE_SEGMENTS = 64;

/**
 * Garis bentuk ruang bekas gambut yang terbakar: tepi permukaan asal pada
 * dinding belakang, garis permukaan asal pada bidang potong, dan dua garis
 * tegak di kedua ujung bidang potong.
 *
 * Isinya saja tidak cukup. Badan tembus pandang setipis setengah meter di atas
 * bongkahan setinggi tiga meter terbaca sebagai tudung kelabu; garis bentuk
 * yang terang mengubahnya menjadi ruang kosong seukuran tanah yang dahulu
 * mengisinya.
 */
export function createLostOutline(): THREE.BufferGeometry {
  // Segmen garis: lengkung belakang + garis muka + dua garis tegak.
  const segments = OUTLINE_SEGMENTS + FACE_COLS + 2;
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(segments * 2 * 3), 3));
  return geom;
}

/** Perbarui garis bentuk yang hilang untuk keadaan bakar dan timbunan tertentu. */
export function updateLostOutline(geom: THREE.BufferGeometry, burnM: number, regrownM: number): void {
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const arr = pos.array as Float32Array;
  const gap = Math.max(0, burnM - regrownM);
  let v = 0;
  const put = (x: number, y: number, z: number) => {
    arr[v * 3] = x;
    arr[v * 3 + 1] = y;
    arr[v * 3 + 2] = z;
    v++;
  };

  // Lengkung tepi permukaan asal, sedikit di luar dinding supaya tidak
  // tenggelam ke dalamnya.
  const arcPoint = (i: number) => {
    const theta = Math.PI + (i / OUTLINE_SEGMENTS) * Math.PI;
    const r = radiusAt(theta, 0) + 0.01;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    return [x, originalTopY(x, z), z] as const;
  };
  for (let i = 0; i < OUTLINE_SEGMENTS; i++) {
    put(...arcPoint(i));
    put(...arcPoint(i + 1));
  }

  // Garis permukaan asal pada bidang potong.
  const line = faceBounds(0);
  const facePoint = (i: number) => {
    const x = line.left + ((line.right - line.left) * i) / FACE_COLS;
    return [x, originalTopY(x, 0), FACE_Z + 0.002] as const;
  };
  for (let i = 0; i < FACE_COLS; i++) {
    put(...facePoint(i));
    put(...facePoint(i + 1));
  }

  // Dua garis tegak di ujung bidang potong: dari permukaan sekarang ke asal.
  for (const x of [line.left, line.right]) {
    const top = originalTopY(x, 0);
    put(x, top - gap, FACE_Z + 0.002);
    put(x, top, FACE_Z + 0.002);
  }

  pos.needsUpdate = true;
  geom.computeBoundingSphere();
}

// ---------------------------------------------------------------------------
//  PENGGARIS ABAD
// ---------------------------------------------------------------------------

/**
 * Kedalaman yang diberi angka pada penggaris umur (m).
 *
 * Tiap seribu tahun, bukan tiap seratus. Garis seratus tahunan tetap ada,
 * digambar peneduh sebagai rambut halus pada bidang potongnya, tetapi angkanya
 * tidak: dua puluh delapan angka pada tepi gambar akan saling bertindihan.
 */
export const AGE_TICKS_M = [1, 2, 2.8];

/** Jarak penggaris umur dari tepi kiri bidang potong (satuan adegan). */
export const AGE_RULER_GAP = 0.45;
