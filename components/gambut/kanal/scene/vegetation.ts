import * as THREE from "three";
import { waterDepthAt, WATER_LIMIT_M } from "@/lib/drainage";
import { BLOCK_DEPTH_M, NEAR_LENGTH_M, surfaceY, xOfDistance } from "./transect";

// Tumbuhan di atas bongkahan.
//
// --- Mengapa tumbuhan -------------------------------------------------------
//
// Dua alasan, dan keduanya bukan hiasan.
//
// Pertama, patokan ukuran. Bongkahan gambut tanpa apa pun di atasnya tidak
// punya besar: pembaca tidak dapat mengetahui apakah yang dilihatnya setinggi
// lutut atau setinggi rumah, sehingga angka "kanal sedalam 3 meter" tidak
// pernah menjadi sesuatu yang terbayang. Pohon memberi ukuran itu dengan
// sendirinya, sebab semua orang tahu kira-kira setinggi apa pohon.
//
// Kedua, kesaksian. Muka air tanah berada di bawah tanah dan karena itu tidak
// pernah terlihat oleh siapa pun di lapangan. Yang terlihat adalah pohonnya
// mati. Modul ini memperlihatkan sebabnya dan akibatnya sekaligus, dan
// tumbuhanlah satu-satunya bagian gambar yang dapat menjadi akibat itu.
//
// --- Model pindaian, dan mengapa harus di-instance --------------------------
//
// Pohonnya memakai model pindaian yang sama dengan Modul 01 dan 02
// (pohon_pachira.glb, Poly Haven CC0 — lihat public/models/gambut/SUMBER.md),
// bukan bentuk sederhana. Bola hijau di atas batang silinder tidak pernah
// terbaca sebagai pohon begitu ia terkena cahaya matahari sungguhan: yang
// didapat justru permen lolipop yang mengambang di atas tanah yang serius.
//
// Tetapi Modul 01 dan 02 hanya menanam tiga pohon dan menyalin modelnya satu
// per satu; modul ini menanam lima puluhan. Disalin dengan cara yang sama,
// tiap pohon menjadi satu panggilan gambar tersendiri dan ratusan ribu
// segitiga — persis yang tidak boleh terjadi pada modul yang juga menjalankan
// simulasi tiap bingkai. Jadi di sini seluruh pohon digambar sebagai
// InstancedMesh: satu panggilan gambar untuk seluruh hutan, dan matriks tiap
// pohon diperbarui beberapa kali sedetik, bukan tiap bingkai.
//
// --- Skala tegak ------------------------------------------------------------
//
// Tanahnya dibesarkan dua kali tegaknya, tumbuhannya tidak. Ini disengaja.
// Pohon yang ikut dibesarkan akan setinggi dua kali bongkahannya dan menutupi
// seluruh gambar, sehingga yang justru harus dilihat — susunan lapisan dan
// muka airnya — tersembunyi di balik tajuk. Tumbuhan di sini bertugas memberi
// ukuran, dan untuk itu ia harus setinggi tumbuhan sungguhan.

/** Tinggi pohon dewasa (m). */
const TREE_HEIGHT_M = 10;

/** Tinggi pakis tumbuhan bawah (m). */
const FERN_HEIGHT_M = 0.9;

/**
 * Penurunan permukaan yang mulai dan yang menyelesaikan matinya tumbuhan (m).
 *
 * Tumbuhan dimatikan oleh penurunan permukaan, bukan oleh kedalaman muka air —
 * dan perbedaan itu penting, bukan kerewelan.
 *
 * Kedalaman muka air berubah seketika: begitu pengatur digeser, airnya sudah
 * turun tiga meter pada bingkai berikutnya. Kalau tumbuhan dimatikan olehnya,
 * seluruh hutan tumbang dalam satu detik di bulan pertama — dan pembaca
 * mempelajari hal yang keliru, yaitu bahwa kerusakan gambut itu seketika dan
 * karena itu pasti akan terlihat oleh siapa pun yang lewat.
 *
 * Penurunan permukaan menumpuk sepanjang tahun. Dipakai sebagai penggeraknya,
 * pohon baru mulai menguning setelah beberapa tahun dan habis setelah sekitar
 * lima — dan itulah yang membuat pelajaran modul ini sampai: lahannya masih
 * tampak hijau lama setelah ia sebenarnya sudah rusak.
 */
const STRESS_DROP_M = 0.04;
const TREE_DEATH_DROP_M = 0.55;

/**
 * Pakis mati lebih cepat daripada pohon.
 *
 * Akarnya dangkal, jadi ia kehilangan air lebih dulu. Inilah yang membuat
 * lantai hutan gundul sementara tajuk di atasnya masih hijau — pertanda
 * paling awal yang benar-benar dapat dilihat orang di lapangan.
 */
const FERN_DEATH_DROP_M = 0.22;

/**
 * Kedalaman muka air yang sudah membuat daun menguning walau tanahnya belum
 * melesak (m). Hanya mengubah warna, tidak menumbangkan.
 */
const THIRST_M = WATER_LIMIT_M + 0.4;

export type PlantField = {
  group: THREE.Group;
  /** Perbarui letak dan keadaan tiap tumbuhan dari keadaan simulasi. */
  update: (canalDepthM: number, drop: (distanceM: number) => number) => void;
  dispose: () => void;
};

type Plant = {
  /** Jarak dari tepi kanal (m). */
  distanceM: number;
  /** Kedudukan ke arah belakang bongkahan (satuan adegan). */
  z: number;
  /** Sisi kanal: +1 kanan, -1 kiri. */
  side: 1 | -1;
  /** Ragam tinggi tiap tumbuhan. */
  scale: number;
  /** Putaran terhadap sumbu tegak, supaya tidak semuanya menghadap satu arah. */
  spin: number;
  /** Arah tumbangnya kalau mati (radian, mengelilingi sumbu tegak). */
  fall: number;
  /**
   * Tumbuhan ini tumbang atau tinggal tunggul.
   *
   * Dua-duanya ada di lahan gambut yang sudah kering, dan keduanya harus ada
   * di sini: batang yang semuanya rebah terbaca sebagai tumpukan lidi, bukan
   * sebagai hutan yang mati.
   */
  topples: boolean;
  /** Ragam model yang dipakai tumbuhan ini. */
  variant: number;
};

/** Pengacak tetap: susunan tumbuhan harus sama tiap kali halaman dibuka. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

type Part = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  /**
   * Bagian ini daun, bukan kayu.
   *
   * Berkas pachira memisahkan batang dan daun menjadi mesh sendiri-sendiri
   * (lihat nama simpulnya: ..._bark_c dan ..._leaves_c), dan pemisahan itu
   * dipakai di sini untuk hal yang bukan main-main: pohon gambut yang mati
   * kehilangan daunnya lebih dulu, dan yang tertinggal berdiri bertahun-tahun
   * adalah batang telanjang. Tanpa memisahkan keduanya, hutan yang sudah mati
   * tetap tergambar hijau dan seluruh pelajaran babak 03 hilang.
   */
  leaf: boolean;
};

/**
 * Kumpulkan geometri satu model menjadi daftar ragam yang siap di-instance.
 *
 * Tiap ragam adalah satu tumbuhan utuh, yang di dalam berkasnya bisa terdiri
 * dari beberapa mesh (batang dan daun dengan bahan berbeda). Matriks dunia
 * tiap mesh dipanggang ke geometrinya, lalu seluruh ragam dinormalkan supaya
 * pangkalnya berada di y = 0 dan tingginya tepat 1 — dengan begitu
 * penskalaannya nanti dapat dinyatakan langsung dalam meter.
 */
function collectVariants(root: THREE.Object3D): Part[][] {
  root.updateMatrixWorld(true);
  const groups = new Map<string, Part[]>();

  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    // Ragam dipisahkan oleh huruf terakhir nama mesh, sama seperti pada
    // SurfaceCover Modul 02 — begitulah berkas Poly Haven ini disusun.
    const key = mesh.name.slice(-1);
    const geometry = mesh.geometry.clone();
    geometry.applyMatrix4(mesh.matrixWorld);
    const list = groups.get(key) ?? [];
    list.push({
      geometry,
      material: mesh.material as THREE.Material,
      leaf: /leaf|leaves|daun/i.test(mesh.name),
    });
    groups.set(key, list);
  });

  const variants = [...groups.values()];
  for (const parts of variants) {
    const box = new THREE.Box3();
    for (const part of parts) {
      part.geometry.computeBoundingBox();
      box.union(part.geometry.boundingBox as THREE.Box3);
    }
    const height = Math.max(1e-4, box.max.y - box.min.y);
    const cx = (box.min.x + box.max.x) / 2;
    const cz = (box.min.z + box.max.z) / 2;
    // Dinormalkan: pangkal di y = 0, tinggi 1, dan titik tengahnya di sumbu.
    const m = new THREE.Matrix4()
      .makeScale(1 / height, 1 / height, 1 / height)
      .multiply(new THREE.Matrix4().makeTranslation(-cx, -box.min.y, -cz));
    for (const part of parts) {
      part.geometry.applyMatrix4(m);
      part.geometry.computeBoundingSphere();
    }
  }
  return variants;
}

/** Satu kelompok tumbuhan sejenis yang digambar sebagai InstancedMesh. */
type Planting = {
  meshes: THREE.InstancedMesh[];
  plants: Plant[];
};

function plantVariants(
  variants: Part[][],
  plants: Plant[],
  castShadow: boolean,
): { plantings: Planting[]; meshes: THREE.InstancedMesh[] } {
  const plantings: Planting[] = [];
  const meshes: THREE.InstancedMesh[] = [];
  if (variants.length === 0) return { plantings, meshes };

  variants.forEach((parts, v) => {
    const mine = plants.filter((p) => p.variant % variants.length === v);
    if (mine.length === 0) return;
    const group: THREE.InstancedMesh[] = [];
    for (const part of parts) {
      const inst = new THREE.InstancedMesh(part.geometry, part.material, mine.length);
      inst.userData.leaf = part.leaf;
      inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      inst.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(mine.length * 3).fill(1), 3);
      inst.castShadow = castShadow;
      inst.receiveShadow = true;
      // Tajuk tumbang keluar dari kotak awalnya, dan memotong seluruh
      // kelompok karena menghitung ulang kotaknya jauh lebih mahal daripada
      // menggambar beberapa pohon yang sebenarnya tidak terlihat.
      inst.frustumCulled = false;
      group.push(inst);
      meshes.push(inst);
    }
    plantings.push({ meshes: group, plants: mine });
  });

  return { plantings, meshes };
}

// Dipakai ulang tiap pembaruan, supaya tidak ada yang dialokasikan per bingkai.
const _m = new THREE.Matrix4();
const _mLeaf = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _spin = new THREE.Quaternion();
const _axis = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _tint = new THREE.Color();

/** Rona pengali daun: hidup, kehausan, lalu mati. */
const LIVE = new THREE.Color("#ffffff");
const DRY = new THREE.Color("#b2994f");
const DEAD = new THREE.Color("#6a5f4e");

/**
 * Tanam pohon dan pakis di atas kedua sayap bongkahan.
 *
 * `treeScene` dan `fernScene` adalah isi berkas GLB yang sudah dimuat
 * pemanggilnya; berkas ini tidak memuat apa pun sendiri supaya tetap dapat
 * diuji tanpa peramban.
 */
export function createPlantField(
  treeScene: THREE.Object3D,
  fernScene: THREE.Object3D | null,
  treesPerWing: number,
  fernsPerWing: number,
): PlantField {
  const rand = seeded(20260926);
  const group = new THREE.Group();

  function scatter(count: number, minDistance: number, spread: number): Plant[] {
    const out: Plant[] = [];
    for (const side of [1, -1] as const) {
      for (let i = 0; i < count; i++) {
        out.push({
          distanceM: minDistance + rand() * (NEAR_LENGTH_M - minDistance - 1),
          z: (rand() - 0.5) * (BLOCK_DEPTH_M - 3),
          side,
          scale: 1 - spread / 2 + rand() * spread,
          spin: rand() * Math.PI * 2,
          fall: rand() * Math.PI * 2,
          topples: rand() < 0.45,
          variant: Math.floor(rand() * 97),
        });
      }
    }
    return out;
  }

  // Dua setengah meter pertama dari tepi kanal dibiarkan kosong untuk pohon:
  // itu tanggul galian, dan di sanalah memang tidak ada yang sempat tumbuh
  // besar.
  const trees = scatter(treesPerWing, 2.5, 0.55);
  const treePlanting = plantVariants(collectVariants(treeScene), trees, true);
  group.add(...treePlanting.meshes);

  const ferns = fernScene && fernsPerWing > 0 ? scatter(fernsPerWing, 1, 0.5) : [];
  // Pakis tidak ikut dirender pada langkah bayangan. Daunnya berpoligon rapat
  // dan bayangannya nyaris tidak terlihat di bawah tajuk, sementara biayanya
  // melipatgandakan jumlah segitiga tiap bingkai — pertimbangan yang sama
  // dengan SurfaceCover pada Modul 02.
  const fernPlanting =
    fernScene && ferns.length > 0
      ? plantVariants(collectVariants(fernScene), ferns, false)
      : { plantings: [] as Planting[], meshes: [] as THREE.InstancedMesh[] };
  if (fernPlanting.meshes.length > 0) group.add(...fernPlanting.meshes);

  function updatePlanting(
    plantings: Planting[],
    canalDepthM: number,
    drop: (distanceM: number) => number,
    baseHeight: number,
    deathDrop: number,
    topplesAllowed: boolean,
  ): void {
    for (const planting of plantings) {
      planting.plants.forEach((p, i) => {
        const dropM = drop(p.distanceM);
        const water = waterDepthAt(p.distanceM, canalDepthM, dropM);

        // 0 = sehat, 1 = mati.
        const wither = THREE.MathUtils.clamp(
          (dropM - STRESS_DROP_M) / (deathDrop - STRESS_DROP_M),
          0,
          1,
        );
        // Kehausan mendahului kematian: daunnya menguning lebih dulu, dan itu
        // yang terlihat di tahun-tahun pertama.
        const thirst = THREE.MathUtils.clamp((water - THIRST_M) / 1.2, 0, 1);

        const topples = topplesAllowed && p.topples;
        // Yang tumbang rebah ke arahnya sendiri; yang tidak menyusut menjadi
        // tunggul dan ranting.
        const tilt = topples ? wither * wither * 1.45 : wither * 0.14;
        const height = baseHeight * p.scale * (topples ? 1 : 1 - wither * 0.72);

        _axis.set(Math.cos(p.fall), 0, Math.sin(p.fall));
        _q.setFromAxisAngle(_axis, tilt);
        _spin.setFromAxisAngle(_up, p.spin);
        _q.multiply(_spin);

        _pos.set(xOfDistance(p.distanceM) * p.side, surfaceY(p.distanceM, dropM), p.z);
        _scale.setScalar(Math.max(0.02, height));
        _m.compose(_pos, _q, _scale);

        // Daun rontok lebih dulu dan lebih cepat daripada batangnya roboh.
        // Dikecilkan sampai nol, bukan disembunyikan, supaya tiap pohon dapat
        // merontokkan daunnya sendiri-sendiri menurut jaraknya dari kanal —
        // satu InstancedMesh hanya punya satu tombol "terlihat" untuk
        // seluruh isinya.
        const leafLeft = Math.max(0, 1 - wither / 0.6);
        _scale.setScalar(Math.max(0.0001, height * leafLeft));
        _mLeaf.compose(_pos, _q, _scale);

        _tint.copy(LIVE).lerp(DRY, Math.max(thirst * 0.8, Math.min(1, wither * 1.5)));
        if (wither > 0.55) _tint.lerp(DEAD, (wither - 0.55) / 0.45);

        for (const mesh of planting.meshes) {
          mesh.setMatrixAt(i, mesh.userData.leaf ? _mLeaf : _m);
          mesh.setColorAt(i, _tint);
        }
      });

      for (const mesh of planting.meshes) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    }
  }

  function update(canalDepthM: number, drop: (distanceM: number) => number): void {
    updatePlanting(treePlanting.plantings, canalDepthM, drop, TREE_HEIGHT_M, TREE_DEATH_DROP_M, true);
    updatePlanting(fernPlanting.plantings, canalDepthM, drop, FERN_HEIGHT_M, FERN_DEATH_DROP_M, false);
  }

  function dispose(): void {
    for (const mesh of [...treePlanting.meshes, ...fernPlanting.meshes]) {
      mesh.geometry.dispose();
      mesh.dispose();
    }
  }

  return { group, update, dispose };
}
