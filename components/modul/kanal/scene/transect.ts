import * as THREE from "three";
import {
  CANAL_WIDTH_M,
  COLUMNS,
  naturalSurfaceM,
  PROFILE_DEPTH_M,
  TRANSECT_LENGTH_M,
  type DrainageSim,
} from "@/lib/model/drainage";

// Bentuk bongkahan lanskap Modul Kanal: sepetak gambut yang dibelah kanal,
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
// kedua dikerjakan `ReachMap` sebagai peta lahan dari atas, yang memang
// bentuk yang benar untuk mengukur.
//
// --- Satuan ----------------------------------------------------------------
//
// Satu satuan adegan = satu meter mendatar. Tegaknya dibesarkan dua kali
// (`VERTICAL_EXAGGERATION`), dan hanya dua kali: cukup untuk membuat susunan
// lapisan terbaca, tetapi masih cukup jujur sehingga kanal yang digambar
// tetap berbentuk kanal, bukan sumur.

/**
 * Panjang lahan yang digambar di tiap sisi kanal (m).
 *
 * Diturunkan dari 36 m. Angka ini menentukan besar gambar di layar, bukan
 * hanya isinya: kamera ortografik dipaskan pada lebar bongkahannya, jadi
 * petak yang lebih pendek tergambar lebih besar pada pita kosong yang sama.
 * Pada 36 m seluruh bongkahan hanya menempati separuh lebar layar dan
 * tingginya tinggal sepersepuluh — kanal, lapisan, dan tumbuhannya terlalu
 * kecil untuk benar-benar dilihat, padahal itu seluruh isi modulnya.
 *
 * 28 m masih lebih dari tiga kali lebar kanalnya sendiri — cukup untuk
 * memperlihatkan bahwa pengeringannya menjangkau jauh melewati galian, yang
 * memang satu-satunya tugas bongkahan ini. Pertanyaan "sejauh apa" dijawab
 * grafik satu kilometer di panel kanan, bukan di sini; bongkahan ini
 * menjawab "seperti apa rupanya". Untuk menjawab itu ia harus besar.
 *
 * Kemudian dipendekkan lagi menjadi 24 m, dan tebalnya dari 30 m menjadi
 * 26 m, dengan alasan yang sama: gambarnya dipaskan pada pita yang sama di
 * antara panel kiri dan kanan, jadi bongkahan yang lebih pendek tergambar
 * sekitar 14% lebih besar tanpa sekali pun melewati batas pita itu. 24 m
 * masih tiga kali lebar kanalnya, dan penanda 20 m masih berada di atas
 * tanahnya.
 */
export const NEAR_LENGTH_M = 24;

/** Lebar kanal (m) — menurut skala sebenarnya, tidak dilebih-lebihkan. */
export const CANAL_LABEL_WIDTH_M = CANAL_WIDTH_M;

/** Setengah lebar kanal (m). Kanal berpusat pada x = 0. */
export const CANAL_HALF_M = CANAL_WIDTH_M / 2;

/** Tebal bongkahan ke arah belakang (m). */
export const BLOCK_DEPTH_M = 26;

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

/**
 * Kerapatan kisi satu sayap: bidang potong dan hamparan permukaan.
 *
 * Diturunkan setelah diukur. Permukaan yang melesak dan muka air yang
 * melengkung keduanya sangat landai pada petak 36 m — kurvanya tidak pernah
 * cukup tajam untuk memperlihatkan sudut kisi, dan bentuknya dihitung ulang
 * tiap kali penurunan berubah. Yang tersisa dari kerapatan yang berlebih
 * hanyalah biayanya.
 */
export const WING_COLS = 48;
export const FACE_ROWS = 28;
/**
 * Baris hamparan permukaan ke arah belakang bongkahan.
 *
 * Dinaikkan dari 10 ke 20 bersamaan dengan masuknya relief mikro di bawah.
 * Pada 10 baris, satu sel sedalam tiga meter — gundukan dan cekungan gambut
 * yang panjang gelombangnya beberapa meter tidak akan terbentuk sama sekali,
 * dan yang didapat hanya hamparan yang miring-miring. Dua puluh baris
 * menghasilkan sel 1,5 m, cukup untuk membentuk gundukannya, dan 48 × 21 =
 * 1.008 titik masih jauh lebih murah daripada satu pohon pindaian.
 */
export const SURFACE_ROWS = 20;

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

// ---------------------------------------------------------------------------
//  RELIEF PERMUKAAN
// ---------------------------------------------------------------------------
//
// Permukaan gambut tidak rata, dan rancangan sebelumnya menggambarnya rata.
// Akibatnya bongkahan ini terbaca sebagai papan hijau yang dipotong kotak —
// bukan sebagai lahan. Yang hilang bukan tekstur (teksturnya sudah ada pada
// peneduh), melainkan bentuk: cahaya matahari yang jatuh pada bidang yang
// benar-benar datar menghasilkan satu nilai terang yang sama di seluruh
// permukaan, sehingga tidak ada satu pun bayangan sendiri yang memberi tahu
// mata bahwa yang dilihatnya punya ketinggian.
//
// Dua hal ditambahkan di sini, dan keduanya ada di lapangan:
//
//   1. Gundukan-cekungan (hummock-hollow). Gambut kubah tumbuh dalam
//      gundukan lumut dan cekungan di antaranya, beda tingginya dua sampai
//      empat puluh sentimeter. Inilah bentuk dasar permukaan gambut yang
//      belum terganggu.
//   2. Tanggul galian. Tanah yang dikeruk dari kanal ditumpuk di tepinya —
//      harus, sebab tidak ada ke mana lagi. Tanggul itu bukan hiasan: ia
//      bagian gambut yang paling cepat kering, dan tingginya sebanding
//      dengan dalamnya galian, sehingga menggeser pengatur kedalaman
//      sekarang menumbuhkan tanggulnya juga.
//
// Keduanya dihitung dengan derau lattice tetap — bentuk tanahnya harus sama
// persis setiap kali halaman dibuka, jika tidak, dua tangkapan layar pada
// naskah skripsi akan memperlihatkan dua lahan yang berbeda.

/** Nilai acak tetap pada titik lattice (ix, iy). */
function latticeHash(ix: number, iy: number): number {
  let n = Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/** Derau nilai dua dimensi, 0-1, mulus di antara titik lattice. */
function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = latticeHash(ix, iy);
  const b = latticeHash(ix + 1, iy);
  const c = latticeHash(ix, iy + 1);
  const d = latticeHash(ix + 1, iy + 1);
  const top = a + (b - a) * ux;
  const bottom = c + (d - c) * ux;
  return top + (bottom - top) * uy;
}

/**
 * Gundukan dan cekungan permukaan gambut (m) pada titik (x, z) lanskap.
 *
 * Dua panjang gelombang: gundukan selebar sembilan meter yang memberi bentuk
 * besar, dan riak tiga meter yang memecah punggungnya supaya tidak terbaca
 * sebagai ombak yang teratur. Jumlahnya tidak pernah melebihi ±23 cm —
 * sebesar gundukan gambut yang sebenarnya, dan cukup kecil untuk tidak
 * mengaburkan penurunan permukaan setengah meter yang menjadi pelajaran
 * babak 03.
 */
export function microReliefM(xM: number, zM: number): number {
  const broad = valueNoise(xM / 9, zM / 9) - 0.5;
  const fine = valueNoise(xM / 3.2 + 17.3, zM / 3.2 - 5.1) - 0.5;
  return broad * 0.44 + fine * 0.16;
}

/**
 * Tinggi tanggul galian (m) pada jarak `distanceM` dari tepi kanal.
 *
 * Puncaknya beberapa meter dari tepi, bukan tepat di tepinya: tanah yang
 * dikeruk dilempar menjauh dari bibir galian supaya bibirnya tidak runtuh
 * kembali ke dalam. Tingginya sebanding dengan kedalaman kanal, dan sedikit
 * berubah-ubah sepanjang kanalnya supaya tidak terbaca sebagai tanggul beton.
 */
export function spoilM(distanceM: number, zM: number, canalDepthM: number): number {
  if (canalDepthM <= 0.01) return 0;
  const t = (distanceM - 2.4) / 3.2;
  const ridge = Math.exp(-t * t);
  const vary = 0.75 + 0.5 * valueNoise(zM / 7 + 31.7, 3.5);
  return canalDepthM * 0.14 * ridge * vary;
}

/**
 * Ketinggian permukaan (satuan adegan) pada titik (x, z) adegan, lengkap
 * dengan relief dan tanggulnya.
 *
 * `surfaceY` di atas tetap ada dan tetap dipakai, tetapi untuk hal yang
 * berbeda: ia permukaan geologis — kubah gambut dikurangi lesakannya — dan
 * itulah acuan yang benar untuk dasar kanal, yang memang digali rata oleh
 * alat berat. Yang dipakai untuk menggambar tanahnya fungsi ini.
 *
 * Reliefnya dibaca pada |x|, sebab bongkahan digambar dua kali dengan sayap
 * kiri sebagai cermin sayap kanan: dibaca pada x bertanda, kedua sayap akan
 * mendapat gundukan yang berbeda dan sambungannya di tepi kanal retak.
 */
export function groundY(xScene: number, zM: number, dropM = 0, canalDepthM = 0): number {
  const distance = distanceOfX(xScene);
  return (
    (naturalSurfaceM(distance) -
      dropM +
      microReliefM(Math.abs(xScene), zM) +
      spoilM(distance, zM, canalDepthM) -
      edgeRoundM(xScene, zM)) *
    V_SCALE
  );
}

// ---------------------------------------------------------------------------
//  TEPI BONGKAHAN YANG ALAMI
// ---------------------------------------------------------------------------
//
// Bongkahan sebelumnya sebuah kotak: tepi luarnya garis lurus, sudutnya siku,
// dan dinding samping serta belakangnya bidang gelap yang rata. Kotak itu
// terbaca sebagai benda buatan — potongan kue — bukan sebagai sepetak tanah
// yang diangkat dari lanskap, dan mata tertarik ke garis-garis lurus itu
// alih-alih ke kanal dan lapisan di bidang potongnya.
//
// Bentuk yang baru mengikuti cara Modul Anatomi dan Bara (`scene/terrain.ts`):
//   - tepi luar bergelombang landai di denah, tidak pernah lurus;
//   - bahu permukaan membulat turun ke dinding, bukan bertemu pada siku;
//   - dinding samping memperlihatkan lapisan gambut yang sama dengan bidang
//     potong, dengan relief seperti tanah yang digali;
//   - dasar menjorok ke dalam dan tepinya tidak rata, seperti bongkahan tanah
//     yang dicungkil.
//
// Bidang potong di depan sengaja tetap hampir rata. Di sanalah pembaca
// membaca lapisan, muka air, dan penanda kedalaman, dan relief yang besar di
// sana akan mengaburkan semuanya. Reliefnya hanya beberapa sentimeter, cukup
// untuk menghilangkan kesan kaca.

/** Lebar bahu yang membulat di tepi luar (m). */
const SHOULDER_M = 2.4;

/** Seberapa jauh bahu itu turun tepat di tepinya (m sebelum dibesarkan). */
const SHOULDER_DROP_M = 0.32;

/** Seberapa jauh dasar dinding menjorok ke dalam (satuan adegan). */
export const TAPER = 1.8;

/** Jarak dari sudut depan tempat relief dinding mulai muncul (m). */
const CORNER_BLEND_M = 2.5;

function smoothstep01(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/**
 * Kedudukan tepi ujung bongkahan (x adegan, sisi kanan) pada kedalaman z.
 *
 * Hanya bergelombang ke luar, tidak ke dalam: tumbuhan disebar sampai satu
 * meter dari ujung petak, dan tepi yang masuk ke dalam akan meninggalkannya
 * menggantung di udara.
 */
export function farEdgeX(zM: number): number {
  return HALF_WIDTH - 0.3 + valueNoise(zM / 7 + 11.1, 7.7) * 1.8;
}

/**
 * Kedudukan tepi belakang bongkahan (z adegan) pada kedudukan mendatar x.
 *
 * Dilandaikan menjadi lurus di dekat kanal: palung kanal berakhir rata di
 * belakang, dan tepi yang bergelombang di sana akan memotong palungnya.
 */
export function backEdgeZ(xScene: number): number {
  const ax = Math.abs(xScene);
  const near = smoothstep01((ax - CANAL_HALF_M) / 4);
  return -BLOCK_DEPTH / 2 - valueNoise(ax / 6 + 3.3, 1.9) * 1.8 * near;
}

/** Jarak dari tepi kanal ke ujung bongkahan pada kedalaman z (m). */
export function farDistance(zM: number): number {
  return distanceOfX(farEdgeX(zM));
}

/**
 * Turunnya permukaan oleh bahu yang membulat (m), pada titik (x, z).
 *
 * Diambil dari tepi yang paling dekat — ujung atau belakang — sehingga sudut
 * belakang membulat ke dua arah sekaligus. Tepi depan tidak ikut: di sana
 * bidang potongnya, dan bidang itu harus memperlihatkan permukaan pada
 * ketinggian yang sebenarnya.
 */
export function edgeRoundM(xScene: number, zM: number): number {
  const toFar = farEdgeX(zM) - Math.abs(xScene);
  const toBack = zM - backEdgeZ(xScene);
  const s = 1 - Math.min(1, Math.max(0, Math.min(toFar, toBack) / SHOULDER_M));
  return SHOULDER_DROP_M * s * s * (3 - s);
}

/**
 * Seberapa jauh dinding menjorok ke dalam pada pecahan tinggi `t`
 * (0 di permukaan, 1 di dasar). Tegak di atas, melengkung masuk di bawah.
 */
export function taperAt(t: number): number {
  return TAPER * Math.pow(t, 2.4);
}

/** Dasar bongkahan pada titik (x, z): tidak rata, seperti tanah yang dicungkil. */
export function floorAt(xScene: number, zM: number): number {
  return floorY() + (valueNoise(Math.abs(xScene) / 4.5 + 2.1, zM / 4.5 + 9.4) - 0.5) * 0.9;
}

/**
 * Relief dinding samping (satuan adegan, ke arah luar).
 *
 * Gumpalan lebar dan tonjolan mendatar: gambut yang digali mengelupas
 * menurut lapisannya, jadi tonjolannya memanjang mendatar, bukan tegak.
 */
export function wallRelief(along: number, y: number): number {
  return (
    (valueNoise(along / 2.6 + 5.2, y / 1.1) - 0.5) * 0.7 +
    (valueNoise(along / 0.9 + 1.7, y / 0.35 + 3.3) - 0.5) * 0.22
  );
}

/** Relief bidang potong depan: jauh lebih kecil, lihat penjelasan di atas. */
function faceRelief(x: number, y: number): number {
  return (valueNoise(x / 1.8 + 41.3, y / 0.7) - 0.5) * 0.16;
}

/** Bobot relief menurut jarak dari sudut atau tepi kanal: nol di sana, penuh di luar. */
export function cornerFade(distanceFromCornerM: number): number {
  return smoothstep01(distanceFromCornerM / CORNER_BLEND_M);
}

/**
 * Kedudukan denah titik kisi hamparan (i, j) pada satu sayap.
 *
 * Hamparan, dinding ujung, dan dinding belakang semuanya membaca titik
 * tepinya dari fungsi ini, sehingga ketiganya bertemu tepat tanpa celah.
 */
export function surfacePoint(i: number, j: number): { x: number; z: number; distance: number } {
  const front = BLOCK_DEPTH / 2;
  const v = j / SURFACE_ROWS;
  const distance = (i / WING_COLS) * farDistance(front - v * BLOCK_DEPTH);
  const x = xOfDistance(distance);
  const z = front - v * (front - backEdgeZ(x));
  return { x, z, distance };
}

/** Seperti `groundY`, tetapi dinyatakan dengan jarak dari tepi kanal. */
export function surfaceYAt(
  distanceM: number,
  zM: number,
  dropM = 0,
  canalDepthM = 0,
): number {
  return groundY(xOfDistance(distanceM), zM, dropM, canalDepthM);
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
 * - `normal`   : tetap menghadap kamera; bidang ini memang rata,
 * - `uv`       : koordinat tekstur menurut meter, untuk peta normal,
 * - `aField`   : letak titik ini pada tekstur keadaan hasil simulasi,
 * - `aDepth`   : kedalaman titik dari permukaan saat itu (m).
 *
 * `uv` sengaja tidak dipakai untuk membaca tekstur keadaan, melainkan dibuat
 * menurut meter lanskap. Alasannya teknis tetapi menentukan: peta normal
 * dipasang dengan rangka singgung yang dihitung dari turunan `uv`, dan `uv`
 * yang melintasi 36 m hanya dari 0 sampai 0,036 menghasilkan turunan yang
 * terlalu kecil untuk diandalkan — reliefnya akan berkedip atau menghadap ke
 * arah yang salah. Letak pada tekstur keadaan karena itu dipindahkan ke
 * atributnya sendiri.
 *
 * `aDepth` tidak dapat diturunkan dari ketinggian: permukaannya melesak, jadi
 * satu baris kisi yang sama berada pada kedalaman yang berbeda-beda. Lapisan
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
  geom.setAttribute("aField", new THREE.BufferAttribute(new Float32Array(total), 1));

  // Normal dan letak pada tekstur keadaan tetap sepanjang modul hidup, jadi
  // keduanya diisi sekali di sini. Bidang potong menghadap kamera.
  const normals = new Float32Array(total * 3);
  for (let k = 0; k < total; k++) normals[k * 3 + 2] = 1;
  geom.setAttribute("normal", new THREE.BufferAttribute(normals, 3));

  const field = geom.attributes.aField as THREE.BufferAttribute;
  const fieldArr = field.array as Float32Array;
  for (let i = 0; i < cols; i++) {
    const u = fieldU((i / WING_COLS) * NEAR_LENGTH_M);
    for (let j = 0; j < rows; j++) fieldArr[j * cols + i] = u;
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
 * Bidang ini tidak lagi rata sempurna: dasarnya menjorok ke dalam dan
 * permukaannya beriak beberapa sentimeter (lihat "Tepi bongkahan yang
 * alami"), jadi normalnya kini dihitung ulang tiap kali bentuknya berubah.
 */
export function updateFaceGrid(
  geom: THREE.BufferGeometry,
  drop: DropFn = NO_DROP,
  canalDepthM = 0,
): void {
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const depth = geom.attributes.aDepth as THREE.BufferAttribute;
  const uv = geom.attributes.uv as THREE.BufferAttribute;
  const field = geom.attributes.aField as THREE.BufferAttribute;
  const posArr = pos.array as Float32Array;
  const depthArr = depth.array as Float32Array;
  const uvArr = uv.array as Float32Array;
  const fieldArr = field.array as Float32Array;
  const cols = WING_COLS + 1;
  const z = BLOCK_DEPTH / 2;
  // Ujung bidang ini mengikuti tepi ujung yang bergelombang, jadi panjangnya
  // dibaca dari tepi itu, bukan dari NEAR_LENGTH_M.
  const reach = farDistance(z);

  for (let i = 0; i < cols; i++) {
    const distance = (i / WING_COLS) * reach;
    const x = xOfDistance(distance);
    // Garis atas bidang potong harus persis sama dengan baris terdepan
    // hamparan permukaan, jika tidak akan ada celah menganga sepanjang tepi
    // potong. Keduanya karena itu memanggil fungsi yang sama pada z yang sama.
    const top = surfaceYAt(distance, z, drop(distance), canalDepthM);
    const bottom = floorAt(x, z);
    // Relief nol di tepi kanal dan di sudut ujung, supaya bidang ini bertemu
    // mulut kanal dan dinding ujung tanpa celah. Di sudut ujung, jorokannya
    // juga dibagi ke arah x — dinding ujung menjorok ke arah yang sama.
    const relief = cornerFade(distance) * cornerFade(reach - distance);
    const corner = 1 - cornerFade(reach - distance);
    for (let j = 0; j <= FACE_ROWS; j++) {
      const t = j / FACE_ROWS;
      const y = top + (bottom - top) * t;
      const inset = taperAt(t);
      const k = j * cols + i;
      posArr[k * 3] = x - inset * corner;
      posArr[k * 3 + 1] = y;
      posArr[k * 3 + 2] = z - inset + faceRelief(x, y) * relief * smoothstep01(t / 0.12);
      depthArr[k] = (top - y) / V_SCALE;
      fieldArr[k] = fieldU(distance);
      // Tekstur diulang tiap 1,5 m lanskap. Lapisan gambut hanya setebal
      // beberapa meter, jadi pengulangan yang lebih longgar membuat serat
      // dan bongkahnya membesar sampai tidak lagi terbaca sebagai tanah.
      uvArr[k * 2] = x / 1.5;
      uvArr[k * 2 + 1] = y / 1.5;
    }
  }
  pos.needsUpdate = true;
  depth.needsUpdate = true;
  uv.needsUpdate = true;
  field.needsUpdate = true;
  geom.computeVertexNormals();
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

/** Perbarui hamparan permukaan mengikuti penurunan dan dalamnya galian. */
export function updateSurfaceGrid(
  geom: THREE.BufferGeometry,
  drop: DropFn = NO_DROP,
  canalDepthM = 0,
): void {
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const uv = geom.attributes.uv as THREE.BufferAttribute;
  const posArr = pos.array as Float32Array;
  const uvArr = uv.array as Float32Array;
  const cols = WING_COLS + 1;

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j <= SURFACE_ROWS; j++) {
      // Denahnya dibaca dari `surfacePoint`, sumber yang sama dengan dinding
      // ujung dan belakang, supaya tepinya bertemu tanpa celah.
      const { x, z, distance } = surfacePoint(i, j);
      // Ketinggian dihitung per titik, bukan per kolom: reliefnya berubah ke
      // arah belakang bongkahan juga, dan justru perubahan itulah yang
      // membuat hamparan ini menangkap cahaya tidak rata.
      const y = groundY(x, z, drop(distance), canalDepthM);
      const k = j * cols + i;
      posArr[k * 3] = x;
      posArr[k * 3 + 1] = y;
      posArr[k * 3 + 2] = z;
      // Tekstur diulang tiap 3,5 m lanskap. Semula 6 m, dan pada petak yang
      // kini digambar jauh lebih besar, satu ulangan selebar enam meter
      // berarti butiran fotonya membesar sampai seukuran semak — terbaca
      // sebagai bercak, bukan sebagai bahan. Pada 3,5 m butirannya kembali
      // seukuran serasah dan rumpun kecil, yang memang ukuran yang benar.
      uvArr[k * 2] = x / 3.5;
      uvArr[k * 2 + 1] = z / 3.5;
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
export const CANAL_BATTER = 0.35;

/** Setengah lebar dasar kanal sedalam `canalDepthM` (satuan adegan). */
export function canalBedHalf(canalDepthM: number): number {
  return Math.max(0.8, CANAL_HALF_M - canalDepthM * CANAL_BATTER);
}

/**
 * Jumlah irisan kanal ke arah memanjang.
 *
 * Sebelumnya dua — muka dan belakang saja — dan itu memaksa bibir kanal
 * menjadi dua garis lurus sempurna sepanjang tiga puluh meter. Dengan
 * permukaan yang sekarang bergundukan, bibir itu harus mengikuti tanah yang
 * dilewatinya; dua titik tidak dapat mengikuti apa pun.
 *
 * Disamakan dengan `SURFACE_ROWS`, dan itu syarat, bukan kebetulan: bibir
 * kanal dan tepi hamparan rumput adalah garis yang sama, dan dua garis yang
 * sama harus dicuplik pada z yang sama. Dicuplik pada z yang berbeda,
 * keduanya hanya berpotongan di titik-titik cuplikannya dan merenggang di
 * antaranya — celah setipis beberapa sentimeter sepanjang tiga puluh meter,
 * yang pada layar menjadi garis latar yang mengintip di tepi kanal.
 */
const CANAL_SEGS = SURFACE_ROWS;

/**
 * Lajur titik melintasi kanal: tiap dinding dibagi `WALL_LANES` pita dari
 * bibir ke kaki, dasarnya `BED_LANES`.
 *
 * Semula hanya empat titik — bibir, kaki, kaki, bibir — sehingga tiap
 * dinding satu bidang miring yang rata sempurna sepanjang tiga puluh meter.
 * Dinding galian gambut yang sebenarnya tidak pernah begitu: bagian atasnya
 * ditahan akar dan berdiri curam, bagian bawahnya longsor sedikit demi
 * sedikit menjadi kaki yang landai, dan seluruhnya bergelombang menurut
 * bongkah yang runtuh. Pita-pita ini memberi ruang untuk bentuk itu.
 */
const WALL_LANES = 5;
const BED_LANES = 4;
const CANAL_LANES = WALL_LANES * 2 + BED_LANES + 1;

/**
 * Irisan memanjang tambahan di antara dua baris hamparan. Bibir kanal pada
 * irisan tambahan diinterpolasi lurus dari dua baris di kiri-kanannya —
 * persis seperti hamparan menggambar tepinya — jadi keduanya tetap bertemu
 * tanpa celah, sementara relief dindingnya mendapat titik dua kali lebih
 * rapat.
 */
const CANAL_SUB = 2;
const CANAL_ROWS = CANAL_SEGS * CANAL_SUB + 1;

/** Jarak dari ujung depan dan belakang tempat relief dinding mulai muncul (m). */
const CANAL_END_BLEND_M = 1.4;

export function createCanalGeometry(): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const total = CANAL_LANES * CANAL_ROWS;
  geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geom.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  // Koordinat tekstur: tanpanya seluruh dinding membaca satu titik yang sama
  // pada peta warna dan peta normal, dan galiannya tergambar sebagai bidang
  // berwarna rata tanpa serat apa pun.
  geom.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(total * 2), 2));
  // Warna per titik: dinding atas yang kering dan pucat, pita bawah yang
  // basah dan gelap. Lihat `updateCanalGeometry`.
  geom.setAttribute("color", new THREE.BufferAttribute(new Float32Array(total * 3), 3));

  const idx: number[] = [];
  for (let j = 0; j < CANAL_ROWS - 1; j++) {
    for (let i = 0; i < CANAL_LANES - 1; i++) {
      const a = j * CANAL_LANES + i;
      const b = a + CANAL_LANES;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  geom.setIndex(idx);
  return geom;
}

/**
 * Perbarui bentuk kanal untuk kedalaman `canalDepthM`, pada tanah yang sudah
 * melesak sebanyak `dropM`.
 *
 * Tepi atas dan dasar kanal sama-sama ikut turun bersama tanah di tepinya:
 * kanal dan parit terus dikeruk, sehingga dalamnya terhadap permukaan tetap.
 * Itulah keadaan pada pengukuran Hooijer dkk. (2012), yang mencatat lesak
 * tetap selama 18 tahun pada muka air yang dijaga. `canalDepthM` di sini
 * adalah kedalaman yang masih berpengaruh (`DrainageSim.effectiveCanalDepth`),
 * yang tidak pernah menembus dasar profil gambut.
 */
export function updateCanalGeometry(
  geom: THREE.BufferGeometry,
  canalDepthM: number,
  dropM = 0,
): void {
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const uv = geom.attributes.uv as THREE.BufferAttribute;
  const color = geom.attributes.color as THREE.BufferAttribute;
  const floor = surfaceY(0) - (dropM + canalDepthM) * V_SCALE;
  // Dasar lebih sempit daripada mulutnya, sebanding dengan dalamnya.
  const bedHalf = canalBedHalf(canalDepthM);
  const front = BLOCK_DEPTH / 2;
  // Ragam dasar kanal: endapan lumpur tidak pernah rata. Dikecilkan pada
  // galian yang masih dangkal supaya tidak pernah menembus bibirnya.
  const deep = Math.min(1, canalDepthM);
  const siltAmp = 0.12 * V_SCALE * deep;
  // Relief dinding ke arah dalam tanah (m mendatar). Sebanding dengan dalam
  // galiannya: parit sedalam sejengkal tidak punya longsoran.
  const slumpAmp = 0.45 * deep;

  // Bibir kanal pada baris-baris hamparan; irisan tambahan diinterpolasi.
  const rims: number[] = [];
  for (let j = 0; j <= CANAL_SEGS; j++) {
    const z = front - (j / CANAL_SEGS) * BLOCK_DEPTH;
    rims.push(Math.max(floor + 0.1, surfaceYAt(0, z, dropM, canalDepthM)));
  }

  for (let r = 0; r < CANAL_ROWS; r++) {
    const along = (r / (CANAL_ROWS - 1)) * BLOCK_DEPTH;
    const z = front - along;
    const seg = Math.min(CANAL_SEGS - 1, Math.floor(r / CANAL_SUB));
    const t = r / CANAL_SUB - seg;
    const rim = rims[seg] + (rims[seg + 1] - rims[seg]) * t;
    const bed = floor + (valueNoise(z / 5 + 71.3, 2.5) - 0.5) * siltAmp;
    // Relief dinding dipudarkan ke nol di kedua ujung: di depan, dinding
    // ini harus bertemu penampang kanal pada bidang potong, yang garisnya
    // lurus.
    const endFade =
      smoothstep01(along / CANAL_END_BLEND_M) * smoothstep01((BLOCK_DEPTH - along) / CANAL_END_BLEND_M);

    for (let i = 0; i < CANAL_LANES; i++) {
      let x: number;
      let y: number;
      // 0 di bibir, 1 di kaki dinding atau di dasar.
      let down: number;
      if (i <= WALL_LANES || i >= CANAL_LANES - 1 - WALL_LANES) {
        const left = i <= WALL_LANES;
        const k = left ? i / WALL_LANES : (CANAL_LANES - 1 - i) / WALL_LANES;
        const sign = left ? -1 : 1;
        // Profil dinding: curam di atas (ditahan akar), landai di kaki
        // (bongkah yang sudah longsor). Pangkat di bawah satu membuat
        // ketinggiannya turun cepat lebih dulu, lalu melandai.
        const drop = Math.pow(k, 0.72);
        x = sign * (CANAL_HALF_M - (CANAL_HALF_M - bedHalf) * k);
        y = rim - (rim - bed) * drop;
        // Longsoran: menjorok ke dalam tanah di tengah dinding, nol di bibir
        // (supaya tetap bertemu hamparan) dan di kaki (supaya tetap bertemu
        // dasar). Dua skala: bongkah selebar beberapa meter dan gerusan kecil.
        const n =
          (valueNoise(z / 3.1 + (left ? 3.7 : 9.1), k * 2.2) - 0.5) * 1.0 +
          (valueNoise(z / 0.9 + (left ? 13.2 : 27.5), k * 4.5 + 1.3) - 0.5) * 0.45;
        x += sign * n * slumpAmp * Math.sin(Math.PI * k) * endFade;
        down = k;
      } else {
        const k = (i - WALL_LANES) / BED_LANES;
        x = -bedHalf + k * bedHalf * 2;
        y = bed + (valueNoise(x / 1.6 + 5.5, z / 2.4 + 1.1) - 0.5) * siltAmp * 0.8 * endFade;
        down = 1;
      }
      const v = ((rim - y) / V_SCALE) / 1.5;
      const idx = r * CANAL_LANES + i;
      pos.setXYZ(idx, x, y, z);
      // v diukur dari bibir ke bawah dalam meter, sehingga serat tanah pada
      // dinding galian seukuran serat tanah pada bidang potong di sebelahnya.
      uv.setXY(idx, along / 1.5 + x * 0.25, v);

      // Warna: dinding atas kering dan pucat, sepertiga bawahnya basah dan
      // gelap — gambut yang selalu dibasahi air kanal — dengan semburat
      // lumut kehijauan tepat di kaki. Bercak acak supaya pitanya tidak
      // tergambar sebagai garis penggaris.
      const blot = valueNoise(z / 1.7 + i * 0.37, down * 3.1 + 4.4);
      const wet = smoothstep01((down - 0.55 + (blot - 0.5) * 0.25) / 0.3) * deep;
      const dry = 1.06 + (blot - 0.5) * 0.18;
      const rC = dry + (0.58 - dry) * wet;
      const gC = dry + (0.6 - dry) * wet;
      const bC = dry + (0.5 - dry) * wet;
      color.setXYZ(idx, rC, gC, bC);
    }
  }

  pos.needsUpdate = true;
  uv.needsUpdate = true;
  color.needsUpdate = true;
  geom.computeVertexNormals();
  geom.computeBoundingSphere();
}

/**
 * Bidang potong sepanjang jalur kanal: penampang kanal pada muka depan.
 *
 * Semula bidang ini hanya dipakai selama kanal belum digali, lalu
 * disembunyikan. Akibatnya, begitu kanal digali, muka depan berlubang dari
 * permukaan sampai dasar bongkahan — kanal sedalam tiga meter tergambar
 * sebagai celah yang membelah tanah sampai ke alas mineral, dan pembaca tidak
 * dapat melihat bentuk galiannya sama sekali.
 *
 * Sekarang bidang ini selalu ada, dan garis atasnya mengikuti penampang
 * kanal: tebing landai di kiri dan kanan, dasar rata di tengah. Di bawah
 * dasar itu lapisan gambut berlanjut utuh, sebagaimana tanah yang memang
 * tidak ikut tergali.
 *
 * Atributnya sama persis dengan kisi bidang potong, sehingga keduanya memakai
 * peneduh yang sama dan tidak pernah berbeda warna di sambungannya.
 */
/** Jumlah lajur titik yang melintasi penampang kanal: tebing, dasar, tebing. */
const CUT_SEGMENTS = [3, 5, 3] as const;
const CUT_COLS = CUT_SEGMENTS[0] + CUT_SEGMENTS[1] + CUT_SEGMENTS[2] + 1;

/** Jumlah lajur titik penutup jalur kanal. */
const MOUTH_COLS = 6;

/** Kedudukan mendatar lajur ke-`i` pada penutup jalur kanal (satuan adegan). */
function mouthX(i: number): number {
  return -CANAL_HALF_M + (i / (MOUTH_COLS - 1)) * CANAL_HALF_M * 2;
}

/**
 * Kedudukan mendatar lajur ke-`i` pada penampang kanal. Lajurnya dipusatkan
 * pada tepi dasar kanal, supaya patahan antara tebing dan dasar selalu jatuh
 * tepat pada satu lajur, berapa pun dalamnya galian.
 */
function cutX(i: number, bedHalf: number): number {
  const [a, b] = CUT_SEGMENTS;
  if (i <= a) return -CANAL_HALF_M + (i / a) * (CANAL_HALF_M - bedHalf);
  if (i <= a + b) return -bedHalf + ((i - a) / b) * bedHalf * 2;
  return bedHalf + ((i - a - b) / CUT_SEGMENTS[2]) * (CANAL_HALF_M - bedHalf);
}

export function createCanalFaceGeometry(): THREE.BufferGeometry {
  const rows = FACE_ROWS + 1;
  const total = CUT_COLS * rows;
  const geom = new THREE.BufferGeometry();
  const field = new Float32Array(total).fill(fieldU(0));

  geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geom.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geom.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(total * 2), 2));
  geom.setAttribute("aDepth", new THREE.BufferAttribute(new Float32Array(total), 1));
  geom.setAttribute("aField", new THREE.BufferAttribute(field, 1));

  const idx: number[] = [];
  for (let j = 0; j < FACE_ROWS; j++) {
    for (let i = 0; i < CUT_COLS - 1; i++) {
      const a = j * CUT_COLS + i;
      idx.push(a, a + CUT_COLS, a + 1, a + 1, a + CUT_COLS, a + CUT_COLS + 1);
    }
  }
  geom.setIndex(idx);
  updateCanalFaceGeometry(geom);
  return geom;
}

/**
 * Perbarui penampang kanal pada muka depan.
 *
 * Garis atasnya dihitung dengan rumus yang sama dengan palung kanal
 * (`updateCanalGeometry`) pada z yang sama, sehingga ujung depan palung itu
 * duduk tepat di atasnya. Selama kanal belum digali, garis atasnya beralih
 * ke relief permukaan supaya bertemu penutup jalur kanal tanpa takik.
 */
export function updateCanalFaceGeometry(
  geom: THREE.BufferGeometry,
  dropM = 0,
  canalDepthM = 0,
): void {
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const uv = geom.attributes.uv as THREE.BufferAttribute;
  const depth = geom.attributes.aDepth as THREE.BufferAttribute;
  const z = BLOCK_DEPTH / 2;
  const dug = smoothstep01(canalDepthM / 0.06);
  const bedHalf = canalBedHalf(canalDepthM);
  const floor = surfaceY(0) - (dropM + canalDepthM) * V_SCALE;
  const rim = Math.max(floor + 0.1, surfaceYAt(0, z, dropM, canalDepthM));
  const siltAmp = 0.12 * V_SCALE * Math.min(1, canalDepthM);
  const bed = floor + (valueNoise(z / 5 + 71.3, 2.5) - 0.5) * siltAmp;

  for (let i = 0; i < CUT_COLS; i++) {
    const x = cutX(i, bedHalf);
    const ax = Math.abs(x);
    const ground = groundY(x, z, dropM);
    const trough =
      ax <= bedHalf ? bed : bed + (rim - bed) * ((ax - bedHalf) / Math.max(0.01, CANAL_HALF_M - bedHalf));
    // Kedua lajur terluar harus sama tinggi dengan lajur pertama bidang
    // potong di sebelahnya, yang membaca permukaan beserta tanggulnya.
    const edge = i === 0 || i === CUT_COLS - 1;
    const top = edge ? surfaceYAt(0, z, dropM, canalDepthM) : ground + (trough - ground) * dug;
    const bottom = floorAt(x, z);
    for (let j = 0; j <= FACE_ROWS; j++) {
      const t = j / FACE_ROWS;
      const y = top + (bottom - top) * t;
      const k = j * CUT_COLS + i;
      pos.setXYZ(k, x, y, z - taperAt(t));
      uv.setXY(k, x / 1.5, y / 1.5);
      // Kedalaman diukur dari permukaan asal, bukan dari dasar galian:
      // lapisan di bawah kanal adalah lapisan yang sama dengan di kiri dan
      // kanannya, dan harus berwarna sama pada ketinggian yang sama.
      depth.setX(k, Math.max(0, (ground - y) / V_SCALE));
    }
  }

  pos.needsUpdate = true;
  uv.needsUpdate = true;
  depth.needsUpdate = true;
  geom.computeVertexNormals();
  geom.computeBoundingSphere();
}

// ---------------------------------------------------------------------------
//  DINDING UJUNG DAN BELAKANG
// ---------------------------------------------------------------------------

/**
 * Dinding ujung dan dinding belakang satu sayap, sebagai satu pita.
 *
 * Menggantikan dua bidang gelap yang rata. Pita ini berjalan dari sudut depan
 * di ujung bongkahan, menyusuri tepi ujung ke belakang, lalu menyusuri tepi
 * belakang sampai ke kanal. Titik atasnya dibaca dari `surfacePoint`, jadi
 * selalu menempel pada tepi hamparan, dan bahannya bahan bidang potong,
 * jadi lapisan gambutnya berlanjut mengitari sudut.
 */
const SKIRT_ROWS = 14;
const SKIRT_POINTS = SURFACE_ROWS + 1 + WING_COLS;

/** Titik atas pita ke-`k`: tepi ujung dulu, lalu tepi belakang. */
function skirtTop(k: number): { x: number; z: number; distance: number } {
  if (k <= SURFACE_ROWS) return surfacePoint(WING_COLS, k);
  return surfacePoint(WING_COLS - (k - SURFACE_ROWS), SURFACE_ROWS);
}

export function createSkirtGeometry(): THREE.BufferGeometry {
  const rows = SKIRT_ROWS + 1;
  const total = SKIRT_POINTS * rows;
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geom.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geom.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(total * 2), 2));
  geom.setAttribute("aDepth", new THREE.BufferAttribute(new Float32Array(total), 1));
  geom.setAttribute("aField", new THREE.BufferAttribute(new Float32Array(total), 1));

  const idx: number[] = [];
  for (let r = 0; r < SKIRT_ROWS; r++) {
    for (let k = 0; k < SKIRT_POINTS - 1; k++) {
      const a = r * SKIRT_POINTS + k;
      idx.push(a, a + SKIRT_POINTS, a + 1, a + 1, a + SKIRT_POINTS, a + SKIRT_POINTS + 1);
    }
  }
  geom.setIndex(idx);
  return geom;
}

const _tops: { x: number; z: number; y: number; distance: number }[] = [];

/** Perbarui pita dinding mengikuti tepi hamparan saat ini. */
export function updateSkirtGeometry(
  geom: THREE.BufferGeometry,
  drop: DropFn = NO_DROP,
  canalDepthM = 0,
): void {
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const uv = geom.attributes.uv as THREE.BufferAttribute;
  const depth = geom.attributes.aDepth as THREE.BufferAttribute;
  const field = geom.attributes.aField as THREE.BufferAttribute;

  for (let k = 0; k < SKIRT_POINTS; k++) {
    const p = skirtTop(k);
    _tops[k] = { ...p, y: groundY(p.x, p.z, drop(p.distance), canalDepthM) };
  }

  // Pusat sayap, untuk memastikan arah "ke luar" memang ke luar.
  const cx = xOfDistance(NEAR_LENGTH_M / 2);
  let along = 0;
  for (let k = 0; k < SKIRT_POINTS; k++) {
    const p = _tops[k];
    if (k > 0) along += Math.hypot(p.x - _tops[k - 1].x, p.z - _tops[k - 1].z);
    const prev = _tops[Math.max(0, k - 1)];
    const next = _tops[Math.min(SKIRT_POINTS - 1, k + 1)];
    let nx = next.z - prev.z;
    let nz = -(next.x - prev.x);
    const len = Math.hypot(nx, nz) || 1;
    nx /= len;
    nz /= len;
    if (nx * (p.x - cx) + nz * p.z < 0) {
      nx = -nx;
      nz = -nz;
    }
    // Titik pertama adalah sudut depan: arahnya dipaksa tepat ke samping,
    // sama dengan jorokan lajur terakhir bidang potong, supaya keduanya
    // bertemu tanpa celah sampai ke dasar.
    if (k === 0) {
      nx = 1;
      nz = 0;
    }
    const corner = 1 - cornerFade(along);
    const relief = cornerFade(along) * cornerFade(p.distance);
    const bottom = floorAt(p.x, p.z);

    for (let r = 0; r <= SKIRT_ROWS; r++) {
      const t = r / SKIRT_ROWS;
      const y = p.y + (bottom - p.y) * t;
      const inset = taperAt(t);
      const out = wallRelief(along, y) * relief * smoothstep01(t / 0.1) - inset;
      const v = r * SKIRT_POINTS + k;
      pos.setXYZ(v, p.x + nx * out, y, p.z + nz * out - inset * corner);
      uv.setXY(v, along / 1.5, y / 1.5);
      depth.setX(v, (p.y - y) / V_SCALE);
      field.setX(v, fieldU(p.distance));
    }
  }

  pos.needsUpdate = true;
  uv.needsUpdate = true;
  depth.needsUpdate = true;
  field.needsUpdate = true;
  geom.computeVertexNormals();
  geom.computeBoundingSphere();
}

// ---------------------------------------------------------------------------
//  PENUTUP JALUR KANAL
// ---------------------------------------------------------------------------

/**
 * Bidang penutup jalur kanal, dipakai selama kanal belum digali.
 *
 * Dipindahkan ke berkas ini dari `KanalScene`, sebab sejak permukaan punya
 * relief ia tidak lagi dapat berupa satu bidang datar: ia harus mengikuti
 * gundukan yang sama persis dengan hamparan di kiri dan kanannya, dan fungsi
 * yang mengetahui gundukan itu ada di sini.
 *
 * Atributnya sengaja sama bentuknya dengan hamparan permukaan — termasuk
 * `color` per titik, yang tanpa itu akan dibaca three.js sebagai hitam pekat.
 */
export function createBridgeGeometry(): THREE.BufferGeometry {
  const rows = SURFACE_ROWS + 1;
  const total = MOUTH_COLS * rows;
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geom.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geom.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(total * 2), 2));
  geom.setAttribute("color", new THREE.BufferAttribute(new Float32Array(total * 3).fill(1), 3));

  const idx: number[] = [];
  for (let j = 0; j < SURFACE_ROWS; j++) {
    for (let i = 0; i < MOUTH_COLS - 1; i++) {
      const a = j * MOUTH_COLS + i;
      idx.push(a, a + 1, a + MOUTH_COLS, a + 1, a + MOUTH_COLS + 1, a + MOUTH_COLS);
    }
  }
  geom.setIndex(idx);
  updateBridgeGeometry(geom);
  return geom;
}

/** Perbarui penutup jalur kanal mengikuti relief dan penurunan. */
export function updateBridgeGeometry(
  geom: THREE.BufferGeometry,
  drop: DropFn = NO_DROP,
): void {
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const uv = geom.attributes.uv as THREE.BufferAttribute;
  const front = BLOCK_DEPTH / 2;
  const dropHere = drop(0);

  for (let i = 0; i < MOUTH_COLS; i++) {
    const x = mouthX(i);
    for (let j = 0; j <= SURFACE_ROWS; j++) {
      const z = front - (j / SURFACE_ROWS) * BLOCK_DEPTH;
      const k = j * MOUTH_COLS + i;
      pos.setXYZ(k, x, groundY(x, z, dropHere), z);
      uv.setXY(k, x / 3.5, z / 3.5);
    }
  }

  pos.needsUpdate = true;
  uv.needsUpdate = true;
  geom.computeVertexNormals();
  geom.computeBoundingSphere();
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
 * Pelacak penurunan permukaan, sejajar dengan `createSubsidence` pada Modul Bara.
 *
 * Yang digambar bukan nilai simulasi apa adanya, melainkan salinannya yang
 * dihaluskan. Simulasi maju dalam langkah tetap 0,05 tahun, jadi pada
 * kecepatan "Lambat" tanahnya turun sepuluh kali sedetik dalam anak tangga
 * kecil; dan bentuk tanah dulu baru dibentuk ulang tiap setengah detik.
 * Keduanya membuat permukaan melesak patah-patah saat waktu berjalan.
 * Dengan salinan yang menyusul nilai simulasi sedikit demi sedikit pada tiap
 * bingkai, gerakannya menjadi menerus — sementara angka di panel dan grafik
 * tetap dibaca langsung dari simulasi, jadi tidak ada angka yang berubah.
 *
 * `version` bertambah setiap kali salinan itu bergeser cukup jauh untuk
 * terlihat, dan itulah tanda bagi geometri untuk dibentuk ulang.
 */
export type Subsidence = {
  fn: DropFn;
  version: number;
  /**
   * Majukan salinan yang digambar sejauh `dt` detik. `rate` adalah laju
   * penyusulan (1/detik); `Infinity` langsung menyamakannya.
   */
  tick: (dt: number, rate: number) => void;
};

/**
 * Pergeseran terkecil yang dianggap terlihat (m). Satu milimeter tanah pada
 * pembesaran tegak bongkahan ini kurang dari satu piksel.
 */
const SUBSIDENCE_VISIBLE_M = 0.001;

export function createSubsidence(sim: DrainageSim): Subsidence {
  const shown = new Float32Array(COLUMNS);
  // Simpul tengah tiap kolom simulasi: pada jarak ini `subsidenceAtDistance`
  // mengembalikan nilai kolom itu persis, tanpa campuran tetangganya.
  const centers = Array.from({ length: COLUMNS }, (_, c) => ((c + 0.5) / COLUMNS) * TRANSECT_LENGTH_M);
  let moved = 0;

  const tracker: Subsidence = {
    version: 0,
    // Interpolasi linear antarkolom, sama dengan `DrainageSim.subsidenceAtDistance`.
    fn: (distanceM: number) => {
      const f = (distanceM / TRANSECT_LENGTH_M) * COLUMNS - 0.5;
      const i = Math.max(0, Math.min(COLUMNS - 1, Math.floor(f)));
      const j = Math.min(COLUMNS - 1, i + 1);
      const t = Math.max(0, Math.min(1, f - i));
      return shown[i] + (shown[j] - shown[i]) * t;
    },
    tick: (dt, rate) => {
      const k = Number.isFinite(rate) ? 1 - Math.exp(-rate * dt) : 1;
      let largest = 0;
      for (let c = 0; c < COLUMNS; c++) {
        const target = sim.subsidenceAtDistance(centers[c]);
        // Tanah yang melesak tidak pernah naik kembali. Bila nilai simulasi
        // lebih kecil daripada yang digambar, simulasinya baru diulang dari
        // awal, dan tanah langsung dikembalikan — bukan dibuat terangkat
        // perlahan seolah gambutnya tumbuh lagi.
        const next = target < shown[c] ? target : shown[c] + (target - shown[c]) * k;
        largest = Math.max(largest, Math.abs(next - shown[c]));
        shown[c] = next;
      }
      // Pergeseran kecil dikumpulkan sampai terlihat, supaya geometri tidak
      // dibentuk ulang untuk perubahan yang tidak mengubah satu piksel pun.
      moved += largest;
      if (moved >= SUBSIDENCE_VISIBLE_M) {
        moved = 0;
        tracker.version++;
      }
    },
  };
  return tracker;
}

/** Penanda jarak yang ditulis pada bongkahan (m dari tepi kanal). */
export const DISTANCE_TICKS = [10, 20];

/** Penanda kedalaman yang ditulis di tepi gambar (m). */
export const DEPTH_TICKS = [1, 2, 3, 4];
