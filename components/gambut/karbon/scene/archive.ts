import * as THREE from "three";
import { PROFILE_DEPTH } from "@/lib/peat";
import { BLOCK_DEPTH, BLOCK_WIDTH } from "@/components/gambut/scene/dioramaConstants";
import { surfaceRelief, UV_PER_METER } from "@/components/gambut/bara/scene/crossSection";

// Bentuk bongkahan Modul 04: petak gambut yang sama dengan Modul 01 dan 02,
// dibaca sebagai arsip.
//
// --- Mengapa bongkahan yang sama, bukan gambar baru -------------------------
//
// Modul 03 menarik kamera mundur karena pengeringan memang tidak terjadi pada
// skala beberapa meter. Modul ini justru harus kembali ke bongkahan 4,4 m,
// dan itu keputusan, bukan kemalasan.
//
// Yang diajarkan modul ini bukan peristiwa melainkan pembacaan: bidang potong
// yang sejak Modul 01 dibaca pembaca sebagai "lapisan tanah" sebenarnya juga
// sebuah kalender — satu milimeter satu tahun — dan juga sebuah gudang —
// lima puluh lima kilogram karbon tiap meter kubik. Pembacaan baru atas
// gambar yang sudah dikenal hanya mungkin bila gambarnya memang yang sudah
// dikenal. Digambar ulang dengan bentuk lain, yang didapat pembaca adalah
// benda keempat yang tidak ada hubungannya dengan tiga sebelumnya.
//
// Karena itu `surfaceRelief` dan `UV_PER_METER` diambil langsung dari Modul
// 02, bukan disalin: permukaan bergelombang yang sama, tekstur seukuran yang
// sama. Bila suatu saat Modul 02 mengubahnya, bongkahan ini ikut berubah —
// dan memang harus, sebab keduanya petak tanah yang sama.
//
// --- Satuan ------------------------------------------------------------------
//
// Satu satuan adegan = satu meter, mendatar maupun tegak. Tidak ada pembesaran
// tegak sama sekali, tidak seperti Modul 03. Pada bongkahan selebar 4,4 m dan
// sedalam 3,4 m perbandingannya sudah terbaca apa adanya, dan modul yang
// seluruhnya tentang membandingkan besar tidak boleh mengawalinya dengan
// penggaris yang sudah dibengkokkan.
//
// y = 0 adalah permukaan gambut asal, sebelum apa pun terbakar. Seluruh
// kedalaman di berkas ini dan di peneduhnya diukur dari sana — bukan dari
// permukaan yang sedang berlaku — sebab garis-garis abad pada bidang potong
// menandai timbunan yang sudah ada sejak dahulu, dan timbunan itu tidak
// berpindah hanya karena bagian atasnya habis terbakar.

export { surfaceRelief, UV_PER_METER };

/** Lebar bongkahan (m) — sama dengan Modul 01 dan 02. */
export const BLOCK_W = BLOCK_WIDTH;

/** Tebal bongkahan ke arah belakang (m). */
export const BLOCK_D = BLOCK_DEPTH;

/** Kedalaman dasar bongkahan di bawah permukaan asal (m). */
export const FLOOR_DEPTH_M = PROFILE_DEPTH;

/** Ketinggian dasar bongkahan (satuan adegan). */
export const FLOOR_Y = -FLOOR_DEPTH_M;

/** Kedudukan bidang potong pada sumbu z (satuan adegan). */
export const FACE_Z = BLOCK_D / 2;

/**
 * Kerapatan kisi bidang potong.
 *
 * Barisnya banyak, kolomnya sedikit, dan ketimpangan itu disengaja. Bidang
 * potong ini nyaris tidak berubah ke arah mendatar — seluruh isinya fungsi
 * kedalaman — sedangkan ke arah tegak ia harus mengikuti permukaan yang turun
 * saat terbakar dan naik kembali saat menimbun. Kolom hanya diperlukan untuk
 * mengikuti gelombang permukaan dan untuk memberi rangka singgung yang masuk
 * akal bagi peta normal.
 */
export const FACE_COLS = 12;
export const FACE_ROWS = 56;

/** Kerapatan kisi hamparan permukaan. */
export const TOP_COLS = 16;
export const TOP_ROWS = 12;

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
 * tertimbun ulang. Keduanya dipisah — bukan disimpan sebagai satu angka
 * bersih — karena babak 04 justru membandingkan keduanya: yang hilang dalam
 * beberapa minggu melawan yang kembali dalam beberapa abad.
 */
export function currentTopY(x: number, z: number, burnM: number, regrownM: number): number {
  return originalTopY(x, z) - Math.max(0, burnM - regrownM);
}

/** Kedalaman di bawah permukaan asal (m) untuk titik (x, z, y). */
export function depthAt(x: number, z: number, y: number): number {
  return originalTopY(x, z) - y;
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
 * kedalaman yang berbeda-beda tergantung di mana ia diukur. Dan kedalaman
 * itulah yang menentukan segalanya di sini — lapisan, umur, garis abad, dan
 * batas bakar.
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

/** Perbarui bidang potong untuk keadaan bakar dan timbunan ulang tertentu. */
export function updateFaceGrid(
  geom: THREE.BufferGeometry,
  burnM: number,
  regrownM: number,
): void {
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const uv = geom.attributes.uv as THREE.BufferAttribute;
  const depth = geom.attributes.aDepth as THREE.BufferAttribute;
  const cols = FACE_COLS + 1;

  for (let i = 0; i < cols; i++) {
    const x = -BLOCK_W / 2 + (i / FACE_COLS) * BLOCK_W;
    const top = currentTopY(x, FACE_Z, burnM, regrownM);
    const origin = originalTopY(x, FACE_Z);
    for (let j = 0; j <= FACE_ROWS; j++) {
      const y = top + (FLOOR_Y - top) * (j / FACE_ROWS);
      const k = j * cols + i;
      pos.setXYZ(k, x, y, FACE_Z);
      uv.setXY(k, x * UV_PER_METER, y * UV_PER_METER);
      depth.setX(k, origin - y);
    }
  }

  pos.needsUpdate = true;
  uv.needsUpdate = true;
  depth.needsUpdate = true;
  geom.computeBoundingSphere();
}

// ---------------------------------------------------------------------------
//  HAMPARAN PERMUKAAN
// ---------------------------------------------------------------------------

/**
 * Kisi permukaan atas bongkahan.
 *
 * Yang dilihat pembaca di sini bukan tanahnya melainkan nasibnya: hijau
 * selama belum tersentuh, hitam berabu begitu terbakar, lalu berangsur
 * bernyawa lagi — sangat pelan — ketika timbunan baru mulai menutupnya.
 */
export function createTopGrid(): THREE.BufferGeometry {
  const cols = TOP_COLS + 1;
  const rows = TOP_ROWS + 1;
  const total = cols * rows;
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geom.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(total * 2), 2));
  geom.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(total * 3), 3));

  const idx: number[] = [];
  for (let j = 0; j < TOP_ROWS; j++) {
    for (let i = 0; i < TOP_COLS; i++) {
      const a = j * cols + i;
      idx.push(a, a + 1, a + cols, a + 1, a + cols + 1, a + cols);
    }
  }
  geom.setIndex(idx);
  updateTopGrid(geom, 0, 0);
  return geom;
}

/** Perbarui hamparan permukaan. */
export function updateTopGrid(
  geom: THREE.BufferGeometry,
  burnM: number,
  regrownM: number,
): void {
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const uv = geom.attributes.uv as THREE.BufferAttribute;
  const cols = TOP_COLS + 1;

  for (let i = 0; i < cols; i++) {
    const x = -BLOCK_W / 2 + (i / TOP_COLS) * BLOCK_W;
    for (let j = 0; j <= TOP_ROWS; j++) {
      const z = FACE_Z - (j / TOP_ROWS) * BLOCK_D;
      const k = j * cols + i;
      pos.setXYZ(k, x, currentTopY(x, z, burnM, regrownM), z);
      uv.setXY(k, x * UV_PER_METER, z * UV_PER_METER);
    }
  }

  pos.needsUpdate = true;
  uv.needsUpdate = true;
  geom.computeVertexNormals();
  geom.computeBoundingSphere();
}

// ---------------------------------------------------------------------------
//  YANG HILANG
// ---------------------------------------------------------------------------

/**
 * Kotak tipis yang menempati ruang bekas gambut yang terbakar.
 *
 * Inilah satu-satunya cara memperlihatkan yang hilang, sebab yang hilang
 * tidak punya geometri — persis persoalan yang sama dengan garis permukaan
 * asal pada Modul 03, hanya di sini jawabannya tiga dimensi. Tanpa kotak ini
 * pembaca melihat permukaan turun tetapi tidak punya pembanding, dan
 * penurunan tanpa pembanding tidak terbaca sebagai kehilangan.
 *
 * Titik tumpunya dipindah ke alas supaya menaikkan `scale.y` menumbuhkan
 * kotaknya ke atas dari permukaan yang sedang berlaku.
 */
export function createLostGeometry(): THREE.BufferGeometry {
  const geom = new THREE.BoxGeometry(1, 1, 1);
  geom.translate(0, 0.5, 0);
  return geom;
}

// ---------------------------------------------------------------------------
//  PENGGARIS ABAD
// ---------------------------------------------------------------------------

/**
 * Kedalaman yang diberi angka pada penggaris umur (m).
 *
 * Tiap seribu tahun, bukan tiap seratus. Garis seratus tahunan tetap ada —
 * digambar peneduh sebagai rambut halus pada bidang potongnya, dan di sana
 * biayanya nol — tetapi angkanya tidak. Dua puluh delapan angka pada tepi
 * gambar setinggi tiga ratus piksel akan saling bertindihan menjadi gumpalan,
 * dan pelajaran yang sama sudah mahal sekali dibayar pada Modul 03.
 */
export const AGE_TICKS_M = [1, 2, 2.8];

/** Jarak penggaris umur dari tepi kiri bongkahan (satuan adegan). */
export const AGE_RULER_GAP = 0.45;
