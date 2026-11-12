import * as THREE from "three";
import { PROFILE_DEPTH_M, waterDepthAt } from "@/lib/model/drainage";
import { backEdgeZ, BLOCK_DEPTH, farDistance, surfaceYAt, xOfDistance } from "./transect";

// Rumput tipis di atas hamparan gambut.
//
// Hamparan permukaan sudah diwarnai peneduhnya sendiri — bercak hijau,
// tanah telanjang, retak — tetapi warna saja tetap rata: dilihat menyamping,
// tidak ada satu helai pun yang berdiri dari tanahnya, dan hamparan itu
// terbaca sebagai karpet bercorak. Rumpun-rumpun kecil ini memberi tanahnya
// tekstur yang tegak, dan pada bibir bidang potong di depan mereka menjuntai
// melewati tepi — tanda paling cepat bahwa yang dilihat adalah tanah yang
// hidup.
//
// Rumput ini juga ikut bercerita, bukan hiasan: ia menguning saat muka air
// menjauh dari akarnya, lalu mengerut dan hilang saat gambutnya melesak —
// dengan ambang yang persis sama dengan peneduh hamparan (lihat
// `SURFACE_DIFFUSE` di transectMaterial.ts), sehingga rumpun dan tanah di
// bawahnya selalu menceritakan keadaan yang sama. Di pita tanggul galian ia
// tidak tumbuh sama sekali, sebab tanah yang baru dikeruk belum sempat
// ditumbuhi apa pun.
//
// Semuanya satu `InstancedMesh`: satu panggilan gambar untuk seluruh rumpun
// di kedua sisi kanal. Rumput tidak menjatuhkan bayangan — bayangan setinggi
// beberapa piksel tidak terlihat, tetapi biayanya menggandakan isi peta
// bayangan.

/** Jumlah helai dalam satu rumpun. */
const BLADES = 7;

/** Tinggi rumpun rata-rata (satuan adegan). */
const TUFT_HEIGHT = 0.62;

// Warna ditulis sebagai heks (sRGB), bukan sebagai angka 0-1. Angka 0-1 pada
// `THREE.Color` dibaca sebagai warna linear, yang di layar tampil jauh lebih
// terang: rumput hijau tua yang dimaksud muncul sebagai helai keputihan,
// seperti salju di atas hutan rawa.
/** Hijau rawa gambut — gelap, sedikit kebiruan, seperti peneduh hamparan. */
const LUSH = new THREE.Color("#2c4a1c");
const LUSH_ALT = new THREE.Color("#3d5520");
/** Rumput yang kehausan: kuning jerami. */
const THIRSTY = new THREE.Color("#8a7a3a");
/** Rumput yang mati di atas gambut yang sudah melesak: coklat kusam. */
const RUINED = new THREE.Color("#5e4a2e");

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _tint = new THREE.Color();

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Satu rumpun: helai-helai tipis yang mekar keluar dari satu titik, masing-
 * masing sebuah segitiga yang sedikit melengkung. Pangkalnya gelap dan
 * ujungnya terang, seperti rumput yang sebenarnya — pangkal yang ternaung
 * daun di atasnya, ujung yang kena matahari.
 */
function createTuftGeometry(): THREE.BufferGeometry {
  const rand = seeded(424242);
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  for (let b = 0; b < BLADES; b++) {
    const angle = (b / BLADES) * Math.PI * 2 + rand() * 0.8;
    const lean = 0.18 + rand() * 0.42;
    const height = 0.65 + rand() * 0.45;
    const width = 0.05 + rand() * 0.035;
    const dx = Math.cos(angle);
    const dz = Math.sin(angle);
    // Sisi lebar helai tegak lurus terhadap arah condongnya.
    const sx = -dz * width;
    const sz = dx * width;
    const base = positions.length / 3;
    // Pangkal kiri, pangkal kanan, tengah (sedikit condong), ujung (condong penuh).
    const midLean = lean * 0.35;
    positions.push(
      -sx, 0, -sz,
      sx, 0, sz,
      dx * midLean * 0.5 + sx * 0.55, height * 0.55, dz * midLean * 0.5 + sz * 0.55,
      dx * midLean * 0.5 - sx * 0.55, height * 0.55, dz * midLean * 0.5 - sz * 0.55,
      dx * lean, height, dz * lean,
    );
    // Peneduhan pangkal ke ujung, sebagai pengali warna rumpun.
    colors.push(0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.62, 0.62, 0.62, 0.62, 0.62, 0.62, 0.85, 0.85, 0.82);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3, base + 3, base + 2, base + 4);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

type Tuft = {
  distanceM: number;
  z: number;
  side: 1 | -1;
  scale: number;
  spin: number;
  /** Ragam hijau antarrumpun (0-1). */
  hue: number;
};

export type GrassField = {
  mesh: THREE.InstancedMesh;
  update: (canalDepthM: number, drop: (distanceM: number) => number, dugDepthM: number) => void;
  dispose: () => void;
};

/**
 * Tebar `perSide` rumpun di tiap sisi kanal.
 *
 * Disebar acak tetapi dengan benih tetap, sehingga tiap kunjungan
 * memperlihatkan lahan yang sama.
 */
export function createGrassField(perSide: number): GrassField {
  const rand = seeded(20261112);
  const tufts: Tuft[] = [];
  const front = BLOCK_DEPTH / 2;
  for (const side of [1, -1] as const) {
    let placed = 0;
    let tries = 0;
    while (placed < perSide && tries < perSide * 4) {
      tries++;
      const z = front - 0.08 - rand() * (BLOCK_DEPTH + 1.5);
      // Mulai sedikit dari bibir kanal, berhenti sebelum bahu ujung bongkahan
      // yang membulat turun — rumpun di sana akan tampak menggantung.
      const reach = farDistance(z) - 0.9;
      const distanceM = 0.35 + rand() * (reach - 0.35);
      if (z < backEdgeZ(xOfDistance(distanceM)) + 0.7) continue;
      tufts.push({
        distanceM,
        z,
        side,
        scale: 0.7 + rand() * 0.6,
        spin: rand() * Math.PI * 2,
        hue: rand(),
      });
      placed++;
    }
  }

  const geometry = createTuftGeometry();
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    // Helai setipis ini tidak memantulkan langit sekuat tanah; tanpa
    // peredaman, peta lingkungan menyalakan sisi atasnya menjadi putih.
    envMapIntensity: 0.35,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, tufts.length);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  // Rumpunnya tersebar di seluruh bongkahan; batas bola geometri satu rumpun
  // akan membuat seluruh rumput dibuang kamera begitu titik asalnya keluar
  // layar.
  mesh.frustumCulled = false;

  function update(canalDepthM: number, drop: (distanceM: number) => number, dugDepthM: number): void {
    // Pita tanggul galian, sama bentuknya dengan `spoilM` dan `kSpoil`.
    const spoilOn = THREE.MathUtils.smoothstep(dugDepthM, 0.05, 0.5);
    tufts.forEach((t, i) => {
      const dropM = drop(t.distanceM);
      const water = waterDepthAt(t.distanceM, canalDepthM, PROFILE_DEPTH_M - dropM);
      // Ambang yang sama dengan peneduh hamparan.
      const ruin = THREE.MathUtils.smoothstep(dropM, 0.04, 0.6);
      const thirst = Math.max(ruin, THREE.MathUtils.smoothstep(water, 0.5, 2.0) * 0.45);
      const spoilT = (t.distanceM - 2.4 + (t.hue - 0.5) * 2.4) / 3.2;
      const spoil = Math.exp(-spoilT * spoilT) * spoilOn;

      // Rumpun di tanggul hilang sama sekali; yang di atas gambut melesak
      // mengerut menjadi tunggul-tunggul pendek.
      const alive = spoil > 0.45 ? 0 : 1 - ruin * 0.75;
      const height = TUFT_HEIGHT * t.scale * alive;

      _pos.set(
        xOfDistance(t.distanceM) * t.side,
        surfaceYAt(t.distanceM, t.z, dropM, dugDepthM) - 0.03,
        t.z,
      );
      _q.setFromAxisAngle(_up, t.spin);
      // Lebar tetap, tinggi menyusut: rumput kering rebah dan patah, tidak
      // mengecil seperti gambar yang diperkecil.
      _scale.set(Math.max(0.0001, t.scale * (alive > 0 ? 1 : 0)), Math.max(0.0001, height), Math.max(0.0001, t.scale * (alive > 0 ? 1 : 0)));
      _m.compose(_pos, _q, _scale);
      mesh.setMatrixAt(i, _m);

      _tint.copy(LUSH).lerp(LUSH_ALT, t.hue);
      _tint.lerp(THIRSTY, thirst);
      _tint.lerp(RUINED, ruin * 0.8);
      mesh.setColorAt(i, _tint);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  function dispose(): void {
    geometry.dispose();
    material.dispose();
    mesh.dispose();
  }

  return { mesh, update, dispose };
}
