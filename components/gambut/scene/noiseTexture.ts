import * as THREE from "three";

// Derau yang dipakai bersama oleh bahan tanah seluruh modul Gambut.
//
// Dipindahkan ke sini dari `components/gambut/kanal/scene/transectMaterial.ts`
// ketika Modul 04 memerlukannya juga. Isinya tidak berubah sama sekali — yang
// berubah hanya tempatnya, sebab derau ini bukan milik satu modul: ia bagian
// dari cara seluruh section ini menggambar tanah.

// ---------------------------------------------------------------------------
//  DERAU
// ---------------------------------------------------------------------------
//
// Derau dibaca dari tekstur, bukan dihitung.
//
// Ini perubahan performa terbesar pada modul ini, dan pantas dijelaskan.
// Rancangan sebelumnya memakai derau nilai klasik yang disusun dari `sin`:
// satu `kNoise` memanggil `kHash` empat kali, tiap `kHash` satu `sin`, dan
// satu `kFbm` memanggil `kNoise` dua kali — enam belas `sin` untuk satu
// lapisan derau. Peneduh permukaan memanggil `kFbm` sampai tiga kali dan
// peneduh bidang potong memanggil `kNoise` tiga kali, sehingga tiap piksel
// tanah membayar tiga sampai lima puluh `sin`.
//
// Pada Modul 01 dan 02 biaya itu tidak pernah terasa: bongkahannya hanya
// menempati sebagian kecil layar. Modul 03 menutupi hampir separuh layar
// dengan tanah, jadi biaya per piksel itulah seluruh anggarannya.
//
// Tekstur derau satu kali baca menggantikan semuanya. Teksturnya 128×128,
// diisi sekali pada CPU, diulang-ulang (`RepeatWrapping`) dan disaring
// linear — yang berarti penyaringan perangkat keras mengerjakan persis
// antaran bilinear yang dahulu ditulis tangan, gratis. Satu nilai derau
// karena itu berharga satu pencarian tekstur, bukan empat `sin`.
//
// Teksturnya dihaluskan sekali setelah diisi, supaya antaran bilinear
// perangkat keras — yang linear, bukan smoothstep — tidak meninggalkan pola
// belah ketupat pada lattice-nya.

/** Sisi tekstur derau (texel). Harus pangkat dua agar dapat diulang mulus. */
const NOISE_SIZE = 128;

/**
 * Buat tekstur derau yang dipakai bersama kedua bahan tanah.
 *
 * Kanal R dan G memuat derau yang sama pada fase berbeda, sehingga dua
 * lapisan derau dapat dibaca dari satu pencarian bila diperlukan; kanal B
 * memuat derau yang lebih kasar.
 */
export function createNoiseTexture(): THREE.DataTexture {
  const n = NOISE_SIZE;
  const raw = new Float32Array(n * n);
  // Pengacak tetap: coraknya harus sama tiap kali halaman dibuka, supaya dua
  // tangkapan layar pada naskah skripsi memperlihatkan tanah yang sama.
  let s = 20261027;
  for (let i = 0; i < raw.length; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    raw[i] = s / 4294967296;
  }

  // Satu lewatan penghalus 3×3 yang melingkar di tepinya. Tanpa ini, derau
  // yang diantar linear oleh perangkat keras memperlihatkan lattice-nya
  // sebagai jaring belah ketupat pada permukaan yang luas.
  const smooth = new Float32Array(n * n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          sum += raw[((y + dy + n) % n) * n + ((x + dx + n) % n)];
        }
      }
      smooth[y * n + x] = sum / 9;
    }
  }

  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const k = (y * n + x) * 4;
      // Penghalus 3×3 menyempitkan sebaran ke sekitar 0,5; direntangkan
      // kembali supaya jangkauannya tetap mengisi 0-1 seperti derau aslinya.
      const v = Math.min(1, Math.max(0, (smooth[y * n + x] - 0.5) * 2.1 + 0.5));
      data[k] = v * 255;
      data[k + 1] = smooth[((y + 37) % n) * n + ((x + 61) % n)] * 255;
      data[k + 2] = raw[(((y >> 2) << 2) % n) * n + (((x >> 2) << 2) % n)] * 255;
      data[k + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Potongan GLSL yang menyediakan `kNoise` dan `kFbm`.
 *
 * Disisipkan ke dalam peneduh bersama deklarasi `uniform sampler2D uNoise`
 * yang dibawanya sendiri, jadi pemanggil cukup mengisi uniform itu dengan
 * hasil `createNoiseTexture()`.
 */
export const NOISE_GLSL = /* glsl */ `
uniform sampler2D uNoise;

/**
 * Satu lapisan derau nilai, 0-1, dengan lattice berjarak satu satuan p —
 * persis seperti fungsi sin yang digantikannya, sehingga seluruh angka skala
 * di bawah tidak perlu diubah.
 */
float kNoise(vec2 p) {
  return texture2D(uNoise, p * ${(1 / NOISE_SIZE).toFixed(8)}).r;
}

/**
 * Derau berlapis dua, bukan tiga.
 *
 * Lapisan ketiga hanya menambah ragam sebesar beberapa sentimeter pada petak
 * selebar delapan puluh meter — tidak pernah terbaca — sementara biayanya
 * sepertiga dari seluruh perhitungan derau, dan derau inilah yang dihitung
 * ulang untuk tiap piksel permukaan.
 */
float kFbm(vec2 p) {
  return texture2D(uNoise, p * ${(1 / NOISE_SIZE).toFixed(8)}).r * 0.68 +
         texture2D(uNoise, p * ${(2.3 / NOISE_SIZE).toFixed(8)}).g * 0.32;
}
`;
