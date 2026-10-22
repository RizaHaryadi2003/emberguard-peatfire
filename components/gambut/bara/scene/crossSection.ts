import * as THREE from "three";
import { PROFILE_DEPTH } from "@/lib/peat";
import { BLOCK_WIDTH } from "@/components/gambut/scene/dioramaConstants";
import { footprintRadius, interfaceY, radiusAt, radiusFrom } from "@/components/gambut/scene/terrain";

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

/**
 * Pergeseran turun (m) pada kedalaman nominal `d` akibat rongga abu di atasnya.
 *
 * Peluruhannya mengikuti sedalam apa gambut sudah habis, bukan angka tetap.
 * Dahulu dipaku 35 cm: begitu permukaan turun 1,7 m, hanya baris paling atas
 * yang ikut turun sementara baris 35 cm di bawahnya diam di tempat. Jarak
 * sejauh itu ditempuh oleh beberapa baris titik saja, sehingga bongkahan
 * tampak seperti kertas yang sobek dan terlipat, bukan tanah yang ambruk.
 *
 * Sekarang seluruh kolom di atas rongga ikut memampat secara merata, dan
 * pergeserannya selalu mencapai nol sebelum dasar tanah mineral.
 */
/**
 * Penurunan permukaan (m) yang sudah membuat tanah hangus sepenuhnya.
 * Nilainya sama dengan SCORCH_FULL pada SurfaceCover, supaya lembar permukaan
 * dan badan bongkahan menghitam pada saat yang sama.
 */
export const SCORCH_DEPTH = 0.16;

export function sinkAt(d: number, x: number, drop: DropFn = NO_DROP): number {
  const amount = drop(x);
  if (amount <= 0) return 0;
  const fall = Math.max(0.4, amount * 1.15 + 0.35);
  return amount * Math.max(0, 1 - d / fall);
}

/** Sudut θ untuk kolom ke-i pada separuh belakang tapak (z ≤ 0). */
function thetaAt(i: number): number {
  return Math.PI + (i / SEGMENTS) * Math.PI;
}

/**
 * Tabel kolom separuh tapak: sudut, kosinus, sinus, jari-jari tapak, dan
 * jari-jari dinding di permukaan.
 *
 * Alasannya sama dengan `COLUMNS` pada `terrain.ts`: `footprintRadius` memakai
 * tiga pemangkatan, sedangkan bentuk tapaknya tetap sepanjang modul hidup.
 * Badan bongkahan dibentuk ulang tiap kali permukaan melesak — dahulu itu
 * berarti empat ribu pemangkatan tiga kali per pembentukan, padahal nilainya
 * selalu sama.
 */
const HALF_COLUMNS = Array.from({ length: SEGMENTS + 1 }, (_, i) => {
  const theta = thetaAt(i);
  const fr = footprintRadius(theta);
  return {
    theta,
    cos: Math.cos(theta),
    sin: Math.sin(theta),
    fr,
    /** Jari-jari dinding tepat di permukaan (y = 0), tempat titik (x0, z0) diambil. */
    rSurface: radiusFrom(fr, theta, 0),
  };
});

/**
 * Penampung tepi atas & bawah dinding, dipakai ulang agar pembentukan ulang
 * badan bongkahan tidak menyisakan sampah memori.
 *
 * Dahulu dua senarai `THREE.Vector3` yang dibuat baru setiap kali: empat
 * lapisan × dua tepi × 97 kolom = 776 objek per pembentukan, dan pembentukan
 * terjadi tiap setengah detik selama gambut terbakar. Pola ini sama dengan
 * TOP_EDGE/BOT_EDGE pada `terrain.ts`.
 */
const TOP_EDGE = new Float32Array((SEGMENTS + 1) * 3);
const BOT_EDGE = new Float32Array((SEGMENTS + 1) * 3);

/** Jari-jari tapak di kedua ujung bidang potong; dipakai oleh `faceBounds`. */
const FOOTPRINT_LEFT = footprintRadius(Math.PI);
const FOOTPRINT_RIGHT = footprintRadius(0);

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
 * bongkahan (m). Nilainya selalu positif agar tepi potongan tidak pernah
 * menyembul keluar dari badan bongkahan.
 *
 * Dahulu sampai 4,7 cm. Selama kamera memandang bidang potong hampir tegak
 * lurus, sisipan itu tidak terlihat. Begitu kamera berdiri serong seperti
 * Modul 01, ia menganga menjadi celah hitam setinggi bongkahan — karena di
 * sanalah badan bongkahan memang berlubang, dan yang terlihat dari celah itu
 * adalah lapisan penutup gelap di belakang bidang potong. Sekarang sisipannya
 * tinggal beberapa milimeter, cukup untuk jaminan tadi, dan lekuk tepinya
 * tetap ada karena dinding bongkahan sendiri sudah berelief (`radiusAt`).
 */
function faceInset(y: number): number {
  return 0.003 + 0.004 * (0.5 + 0.5 * Math.sin(y * 5.3 + 0.9)) + 0.002 * (0.5 + 0.5 * Math.sin(y * 11.7 - 2.1));
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
  return {
    left: -(radiusFrom(FOOTPRINT_LEFT, Math.PI, y) - inset),
    right: radiusFrom(FOOTPRINT_RIGHT, 0, y) - inset,
  };
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
  // Warna per titik dipakai untuk menghanguskan badan bongkahan di atas rongga,
  // sama seperti pada lembar permukaan.
  geom.setAttribute("color", new THREE.BufferAttribute(new Float32Array(total * 3).fill(1), 3));

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
 * Bentuk badan lapisan di antara dua permukaan.
 *
 * `drop` di sini **hanya** menentukan warna hangus per titik. Pergeseran
 * bentuknya sudah dititipkan ke kedua fungsi batas oleh pemanggil, lewat
 * `sinkAt`, sehingga semua lapisan memampat bersama. Menerapkannya sekali lagi
 * di sini akan menurunkan permukaan dua kali lipat.
 */
export function updateHalfBody(
  geom: THREE.BufferGeometry,
  bottom: HeightFn,
  top: HeightFn,
  drop: DropFn = NO_DROP,
): void {
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const uv = geom.attributes.uv as THREE.BufferAttribute;
  const color = geom.attributes.color as THREE.BufferAttribute;
  // Ditulis lewat penyangganya langsung, bukan lewat setXYZ/setXY: tiga
  // atribut × 2.231 titik × empat lapisan adalah hampir 27.000 panggilan
  // metode tiap pembentukan ulang, untuk pekerjaan yang isinya hanya menaruh
  // bilangan ke dalam larik. Pola ini sama dengan `updateSlab` di `terrain.ts`.
  const posArr = pos.array as Float32Array;
  const uvArr = uv.array as Float32Array;
  const colorArr = color.array as Float32Array;

  /**
   * Warnai satu titik menurut seberapa jauh tanah di atasnya sudah melesak.
   * Tanpa ini, tutup atas badan bongkahan tetap berona fibrik yang terang dan
   * tersingkap sebagai papan pucat begitu lembar permukaan di atasnya ambruk.
   */
  const shade = (v: number, x: number, y: number) => {
    const burn = Math.min(1, sinkAt(Math.max(0, -y), x, drop) / SCORCH_DEPTH);
    const k = 1 - burn * 0.85;
    colorArr[v * 3] = k;
    colorArr[v * 3 + 1] = k * 0.94;
    colorArr[v * 3 + 2] = k * 0.9;
  };
  const cols = SEGMENTS + 1;
  const wallCount = cols * (WALL_RINGS + 1);
  const capCount = cols * (CAP_RINGS + 1);

  for (let i = 0; i < cols; i++) {
    const { theta, cos, sin, fr, rSurface } = HALF_COLUMNS[i];
    const x0 = cos * rSurface;
    const z0 = sin * rSurface;
    const yb = bottom(x0, z0);
    const yt = Math.max(yb, top(x0, z0));
    const u = theta * 1.9 * UV_PER_METER;
    for (let j = 0; j <= WALL_RINGS; j++) {
      const y = yb + ((yt - yb) * j) / WALL_RINGS;
      const r = radiusFrom(fr, theta, y);
      const x = cos * r;
      const z = sin * r;
      const v = j * cols + i;
      posArr[v * 3] = x;
      posArr[v * 3 + 1] = y;
      posArr[v * 3 + 2] = z;
      uvArr[v * 2] = u;
      uvArr[v * 2 + 1] = y * UV_PER_METER;
      shade(v, x, y);
      // Titik tepi atas & bawah dinding dipakai lagi oleh lembar tutup.
      if (j === 0 || j === WALL_RINGS) {
        const edge = j === 0 ? BOT_EDGE : TOP_EDGE;
        edge[i * 3] = x;
        edge[i * 3 + 1] = y;
        edge[i * 3 + 2] = z;
      }
    }
  }

  /**
   * Lembar tutup: kisi antara garis potong (t = 0) dan tepi dinding (t = 1).
   *
   * Kolom di perulangan luar, cincin di dalam. Titik garis potong hanya
   * bergantung pada ketinggian tepi dinding kolom itu, yang sama untuk seluruh
   * cincin — jadi `faceBounds` cukup dipanggil sekali per kolom, bukan sekali
   * per titik. Urutan yang dahulu memanggilnya 582 kali per tutup untuk 97
   * jawaban yang berbeda.
   */
  const fillCap = (start: number, edge: Float32Array, height: HeightFn) => {
    for (let i = 0; i < cols; i++) {
      const wx = edge[i * 3];
      const wy = edge[i * 3 + 1];
      const wz = edge[i * 3 + 2];
      // Kolom dinding ke-i berpasangan dengan titik garis potong di ujung
      // yang sama: `thetaAt(0)` = π berada di kiri, dan batas kiri juga di
      // kiri. Memakai `SEGMENTS - i` memasangkannya dengan ujung yang
      // berlawanan sehingga lembar tutup terpelintir dan bongkahan kehilangan
      // bentuknya.
      const { left, right } = faceBounds(wy);
      const lx = left + ((right - left) * i) / SEGMENTS;
      for (let k = 0; k <= CAP_RINGS; k++) {
        const t = k / CAP_RINGS;
        const x = lx + (wx - lx) * t;
        const z = wz * t;
        const y = k === CAP_RINGS ? wy : height(x, z);
        const v = start + k * cols + i;
        posArr[v * 3] = x;
        posArr[v * 3 + 1] = y;
        posArr[v * 3 + 2] = z;
        uvArr[v * 2] = x * UV_PER_METER;
        uvArr[v * 2 + 1] = z * UV_PER_METER;
        shade(v, x, y);
      }
    }
  };
  fillCap(wallCount, TOP_EDGE, top);
  fillCap(wallCount + capCount, BOT_EDGE, bottom);

  pos.needsUpdate = true;
  uv.needsUpdate = true;
  color.needsUpdate = true;
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
/**
 * Tabel baris bidang potong: kedalaman, batas kiri & kanan, serta kedua faktor
 * lengkung yang dipakai `profileY`.
 *
 * Tepi dihitung pada ketinggian titiknya yang sebenarnya, bukan pada kedalaman
 * nominal −d. Dinding bongkahan berelief, jadi jari-jarinya berubah terhadap
 * y; dekat permukaan dan dekat dasar, y menyimpang dari −d sampai belasan
 * sentimeter. Dengan −d, tepi bidang potong meleset sejauh itu dari dinding,
 * dan di sanalah badan bongkahan menganga — tidak terlihat bila dipandang
 * tegak lurus, tetapi menjadi celah gelap bergerigi setinggi bongkahan begitu
 * kamera berdiri serong. Badan bongkahan sendiri sudah memakai ketinggian
 * sebenarnya (lihat `linePoint`), jadi perhitungan ini mempertemukan keduanya.
 *
 * Tak satu pun nilainya bergantung pada penurunan permukaan, jadi semuanya
 * dihitung sekali saat berkas dimuat.
 */
const FACE_ROW_TABLE = Array.from({ length: FACE_ROWS + 1 }, (_, j) => {
  const d = (j / FACE_ROWS) * PROFILE_DEPTH;
  const guess = faceBounds(-d);
  const top = Math.max(0, 1 - d / 0.55);
  return {
    d,
    left: faceBounds(profileY(d, guess.left)).left,
    right: faceBounds(profileY(d, guess.right)).right,
    topFactor: top * top,
    bottomFactor: Math.pow(Math.min(1, d / PROFILE_DEPTH), 2.5),
  };
});

export function createFaceGrid(): THREE.BufferGeometry {
  const cols = FACE_COLS + 1;
  const rows = FACE_ROWS + 1;
  const total = cols * rows;
  const geom = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(new Float32Array(total * 3), 3);
  const uv = new THREE.BufferAttribute(new Float32Array(total * 2), 2);
  const depth = new THREE.BufferAttribute(new Float32Array(total), 1);
  const edge = new THREE.BufferAttribute(new Float32Array(total), 1);
  geom.setAttribute("position", position);
  geom.setAttribute("uv", uv);
  geom.setAttribute("aDepth", depth);
  geom.setAttribute("aEdge", edge);

  // Semua yang tidak bergantung pada penurunan permukaan diisi di sini, sekali
  // saja: kedudukan mendatar titik, uv, kedalaman, dan jaraknya dari tepi.
  //
  // Hanya ketinggian (y) yang berubah saat permukaan melesak. Dahulu keempat
  // atribut diisi ulang seluruhnya tiap pembentukan ulang dan ditandai
  // `needsUpdate`, jadi tiga penyangga yang nilainya tidak pernah bergeser
  // ikut diunggah ulang ke pengolah grafis tiap setengah detik.
  const posArr = position.array as Float32Array;
  const uvArr = uv.array as Float32Array;
  const depthArr = depth.array as Float32Array;
  const edgeArr = edge.array as Float32Array;
  for (let j = 0; j < rows; j++) {
    const { d, left, right } = FACE_ROW_TABLE[j];
    for (let i = 0; i < cols; i++) {
      const f = i / FACE_COLS;
      const x = left + (right - left) * f;
      const k = j * cols + i;
      posArr[k * 3] = x;
      posArr[k * 3 + 2] = 0;
      uvArr[k * 2] = (x + BLOCK_WIDTH / 2) / BLOCK_WIDTH;
      uvArr[k * 2 + 1] = d / PROFILE_DEPTH;
      depthArr[k] = d;
      edgeArr[k] = f;
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
 * Perbarui ketinggian titik-titik bidang potong; `drop` menurunkan baris atas.
 *
 * Hanya sumbu y yang ditulis. Kedudukan mendatar, uv, kedalaman, dan jarak
 * dari tepi sudah diisi `createFaceGrid` dan tidak bergantung pada penurunan
 * permukaan sama sekali.
 */
export function updateFaceGrid(geom: THREE.BufferGeometry, drop: DropFn = NO_DROP): void {
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const posArr = pos.array as Float32Array;
  const cols = FACE_COLS + 1;

  for (let j = 0; j <= FACE_ROWS; j++) {
    // Faktor lengkung kedua ujung profil hanya bergantung pada kedalaman, dan
    // yang bawah memakai pemangkatan 2,5. Dihitung di dalam perulangan dalam,
    // itu berarti 12.513 pemangkatan padahal 97 nilai sudah cukup.
    const { d, topFactor, bottomFactor } = FACE_ROW_TABLE[j];
    for (let i = 0; i <= FACE_COLS; i++) {
      const k = j * cols + i;
      const x = posArr[k * 3];
      // Baris paling atas mengikuti penurunan permukaan; makin dalam, makin
      // kecil pengaruhnya (rongga hanya menurunkan bagian di atasnya).
      posArr[k * 3 + 1] =
        -d + surfaceRelief(x, 0) * topFactor + floorOffset(x, 0) * bottomFactor - sinkAt(d, x, drop);
    }
  }
  pos.needsUpdate = true;
  // Normal titik sengaja tidak dihitung. Peneduh bidang potong
  // (`faceMaterial.ts`) tidak membaca atribut `normal` sama sekali: ia
  // menyusun normalnya sendiri dari peta normal lapisan dan kemiringan rongga
  // abu. Dahulu `computeVertexNormals` dipanggil di sini, sehingga tiap
  // pembentukan ulang membuat dan mengunggah 12.513 normal untuk 24.576
  // segitiga yang tidak pernah dipakai — dan pembentukan ulang terjadi tiap
  // setengah detik selama gambut terbakar.
  geom.computeBoundingSphere();
}

/**
 * Tabel kolom kisi permukaan: tepi belakang tapak (wx, wz) dan titik garis
 * potong yang berpasangan dengannya (lx).
 *
 * Ketiganya hanya bergantung pada nomor kolom, bukan pada baris maupun pada
 * seberapa jauh permukaan sudah melesak. Dahulu dihitung di dalam kedua
 * perulangan, yaitu 2.117 kali `radiusAt` tiap kali permukaan dibentuk ulang,
 * padahal 73 nilai yang berbeda sudah cukup untuk selamanya.
 *
 * Pada i = 0 sudut θ bernilai 2π, yaitu tepi kanan, jadi titik garis potong
 * yang berpasangan juga diambil dari kanan.
 */
const SURFACE_COLUMNS = (() => {
  const line = faceBounds(0);
  return Array.from({ length: SURFACE_COLS + 1 }, (_, i) => {
    const mirrored = SURFACE_COLS - i;
    const theta = Math.PI + (mirrored / SURFACE_COLS) * Math.PI;
    const r = radiusAt(theta, 0);
    return {
      wx: Math.cos(theta) * r,
      wz: Math.sin(theta) * r,
      lx: line.left + ((line.right - line.left) * mirrored) / SURFACE_COLS,
    };
  });
})();

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
      const { wx, wz, lx } = SURFACE_COLUMNS[i];
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
  return interfaceY(0, x, z) + surfaceRelief(x, z) - sinkAt(0, x, drop);
}
