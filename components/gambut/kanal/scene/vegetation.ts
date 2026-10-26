import * as THREE from "three";
import { waterDepthAt, WATER_LIMIT_M } from "@/lib/drainage";
import {
  BLOCK_DEPTH_M,
  CANAL_HALF_M,
  NEAR_LENGTH_M,
  surfaceY,
  xOfDistance,
} from "./transect";

// Pohon di atas bongkahan.
//
// --- Mengapa pohon ----------------------------------------------------------
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
// pohonlah satu-satunya bagian gambar yang dapat menjadi akibat itu.
//
// --- Skala tegak ------------------------------------------------------------
//
// Tanahnya dibesarkan dua kali tegaknya, pohonnya tidak. Ini disengaja. Pohon
// yang ikut dibesarkan akan setinggi dua kali bongkahannya dan menutupi
// seluruh gambar, sehingga yang justru harus dilihat — susunan lapisan dan
// muka airnya — tersembunyi di balik tajuk. Pohon di sini bertugas memberi
// ukuran, dan untuk itu ia harus setinggi pohon sungguhan.

/** Jumlah pohon di tiap sayap. */
const TREES_PER_WING = 26;

/** Tinggi pohon dewasa (m). */
const TREE_HEIGHT_M = 7.5;

/**
 * Penurunan permukaan yang mulai dan yang menyelesaikan matinya pohon (m).
 *
 * Pohon dimatikan oleh penurunan permukaan, bukan oleh kedalaman muka air —
 * dan perbedaan itu penting, bukan kerewelan.
 *
 * Kedalaman muka air berubah seketika: begitu pengatur digeser, airnya sudah
 * turun tiga meter pada bingkai berikutnya. Kalau pohon dimatikan olehnya,
 * seluruh hutan tumbang dalam satu detik di bulan pertama — dan pembaca
 * mempelajari hal yang keliru, yaitu bahwa kerusakan gambut itu seketika dan
 * karena itu pasti akan terlihat oleh siapa pun yang lewat.
 *
 * Penurunan permukaan menumpuk sepanjang tahun. Dipakai sebagai penggeraknya,
 * pohon baru mulai menguning setelah beberapa tahun dan habis setelah
 * sekitar lima — dan itulah yang membuat pelajaran modul ini sampai: lahannya
 * masih tampak hijau lama setelah ia sebenarnya sudah rusak.
 */
const TREE_STRESS_DROP_M = 0.04;
const TREE_DEATH_DROP_M = 0.55;

/**
 * Kedalaman muka air yang sudah membuat daun menguning walau tanahnya belum
 * melesak (m). Hanya mengubah warna, tidak menumbangkan.
 */
const TREE_THIRST_M = WATER_LIMIT_M + 0.4;

export type TreeField = {
  trunks: THREE.InstancedMesh;
  canopies: THREE.InstancedMesh;
  group: THREE.Group;
  /** Perbarui letak dan keadaan tiap pohon dari keadaan simulasi. */
  update: (canalDepthM: number, drop: (distanceM: number) => number) => void;
  dispose: () => void;
};

type Tree = {
  /** Jarak dari tepi kanal (m). */
  distanceM: number;
  /** Kedudukan ke arah belakang bongkahan (satuan adegan). */
  z: number;
  /** Sisi kanal: +1 kanan, -1 kiri. */
  side: 1 | -1;
  /** Ragam tinggi tiap pohon (0,7-1,25). */
  scale: number;
  /** Putaran tajuk, supaya tidak semuanya menghadap satu arah. */
  spin: number;
  /** Arah tumbangnya kalau mati (radian, mengelilingi sumbu tegak). */
  fall: number;
  /**
   * Pohon ini tumbang atau tinggal tunggul.
   *
   * Dua-duanya ada di lahan gambut yang sudah kering, dan keduanya harus ada
   * di sini: batang yang semuanya rebah terbaca sebagai tumpukan lidi, bukan
   * sebagai hutan yang mati.
   */
  topples: boolean;
};

/** Pengacak tetap: susunan pohon harus sama tiap kali halaman dibuka. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function createTreeField(): TreeField {
  const rand = seeded(20260926);
  const trees: Tree[] = [];

  for (const side of [1, -1] as const) {
    for (let i = 0; i < TREES_PER_WING; i++) {
      // Dua meter pertama dari tepi kanal dibiarkan kosong: itu tanggul
      // galian, dan di sanalah memang tidak ada yang tumbuh.
      const distanceM = 2 + rand() * (NEAR_LENGTH_M - 3);
      trees.push({
        distanceM,
        z: (rand() - 0.5) * (BLOCK_DEPTH_M - 3),
        side,
        scale: 0.7 + rand() * 0.55,
        spin: rand() * Math.PI * 2,
        fall: rand() * Math.PI * 2,
        topples: rand() < 0.45,
      });
    }
  }

  const total = trees.length;

  // Batang: silinder ramping, titik tumpunya dipindah ke pangkal supaya
  // penskalaan tinggi tidak menenggelamkannya ke dalam tanah.
  const trunkGeom = new THREE.CylinderGeometry(0.16, 0.26, 1, 6, 1);
  trunkGeom.translate(0, 0.5, 0);
  const canopyGeom = new THREE.IcosahedronGeometry(1, 1);

  // Warna per pohon dikirim lewat `instanceColor`, bukan lewat `vertexColors`:
  // geometri pohon tidak punya atribut `color`, dan menyalakan `vertexColors`
  // membuat three.js membaca atribut yang tidak ada itu sebagai hitam.
  const trunkMat = new THREE.MeshLambertMaterial();
  const canopyMat = new THREE.MeshLambertMaterial({ flatShading: true });

  const trunks = new THREE.InstancedMesh(trunkGeom, trunkMat, total);
  const canopies = new THREE.InstancedMesh(canopyGeom, canopyMat, total);
  for (const mesh of [trunks, canopies]) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
  }
  trunks.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(total * 3), 3);
  canopies.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(total * 3), 3);

  const group = new THREE.Group();
  group.add(trunks, canopies);

  // Dipakai ulang tiap pembaruan, supaya tidak ada yang dialokasikan per
  // bingkai.
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const axis = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const live = new THREE.Color("#2f5422");
  const dying = new THREE.Color("#7a6a33");
  const dead = new THREE.Color("#3a352c");
  const barkLive = new THREE.Color("#4a3a2a");
  const barkDead = new THREE.Color("#39332b");
  const tint = new THREE.Color();

  function update(canalDepthM: number, drop: (distanceM: number) => number): void {
    for (let i = 0; i < total; i++) {
      const t = trees[i];
      const dropM = drop(t.distanceM);
      const water = waterDepthAt(t.distanceM, canalDepthM, dropM);

      // 0 = sehat, 1 = mati. Menggerakkan besar tajuk dan kemiringan batang.
      const wither = THREE.MathUtils.clamp(
        (dropM - TREE_STRESS_DROP_M) / (TREE_DEATH_DROP_M - TREE_STRESS_DROP_M),
        0,
        1,
      );
      // Kehausan mendahului kematian: daunnya menguning lebih dulu, dan itu
      // yang terlihat di tahun-tahun pertama.
      const thirst = THREE.MathUtils.clamp((water - TREE_THIRST_M) / 1.2, 0, 1);

      const x = xOfDistance(t.distanceM) * t.side;
      const y = surfaceY(t.distanceM, dropM);
      const height = TREE_HEIGHT_M * t.scale;

      // Pohon yang mati tidak hilang, ia tumbang. Tunggul dan batang rebah
      // adalah yang benar-benar terlihat di lahan gambut yang sudah kering,
      // dan itu lebih jujur daripada pohon yang lenyap begitu saja.
      // Yang tumbang rebah ke arahnya sendiri; yang tidak patah menjadi
      // tunggul setinggi orang.
      const tilt = t.topples ? wither * wither * 1.45 : wither * 0.12;
      axis.set(Math.cos(t.fall), 0, Math.sin(t.fall));
      q.setFromAxisAngle(axis, tilt);

      const stand = t.topples ? height : height * (1 - wither * 0.8);
      pos.set(x, y, t.z);
      scale.set(1, stand, 1);
      m.compose(pos, q, scale);
      trunks.setMatrixAt(i, m);

      // Tajuk menyusut lalu habis; tinggi tumpunya ikut turun bersama batang
      // yang miring.
      const leaf = Math.max(0, 1 - wither * 1.4) * 1.35 * t.scale;
      const lean = Math.sin(tilt) * stand * 0.74;
      pos.set(
        x + lean * Math.sin(t.fall),
        y + Math.cos(tilt) * stand * 0.78,
        t.z - lean * Math.cos(t.fall),
      );
      scale.set(leaf, leaf * 0.82, leaf);
      m.compose(pos, q, scale);
      canopies.setMatrixAt(i, m);

      tint.copy(live).lerp(dying, Math.max(thirst * 0.75, Math.min(1, wither * 1.6)));
      if (wither > 0.6) tint.lerp(dead, (wither - 0.6) / 0.4);
      canopies.setColorAt(i, tint);

      tint.copy(barkLive).lerp(barkDead, wither);
      trunks.setColorAt(i, tint);
    }

    trunks.instanceMatrix.needsUpdate = true;
    canopies.instanceMatrix.needsUpdate = true;
    if (trunks.instanceColor) trunks.instanceColor.needsUpdate = true;
    if (canopies.instanceColor) canopies.instanceColor.needsUpdate = true;
  }

  function dispose(): void {
    trunkGeom.dispose();
    canopyGeom.dispose();
    trunkMat.dispose();
    canopyMat.dispose();
    trunks.dispose();
    canopies.dispose();
  }

  return { trunks, canopies, group, update, dispose };
}

/** Jarak terdekat pohon dari tepi kanal (m) — dipakai menempatkan sekat. */
export const CANAL_BANK_M = CANAL_HALF_M;
