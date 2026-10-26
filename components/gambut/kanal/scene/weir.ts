import * as THREE from "three";
import { CANAL_HALF_M, surfaceY, V_SCALE } from "./transect";

// Sekat kanal.
//
// Babak 04 meminta pembaca memasang sekat, dan sampai sebelum ini satu-satunya
// tanda bahwa ia sudah terpasang adalah air kanal yang naik dan satu kalimat
// di panel kanan. Itu tidak cukup: sekat kanal adalah satu-satunya tindakan
// pemulihan yang benar-benar dikerjakan orang di lapangan, dan pembaca harus
// melihat bendanya — papan dan tiang yang dipancang melintang — bukan hanya
// melihat akibatnya.
//
// Bentuknya sengaja sederhana dan terbuat dari kayu, bukan beton: sekat yang
// dipasang kelompok masyarakat memang papan dan tiang, dan ongkos itulah yang
// membuatnya mungkin dikerjakan tanpa menunggu siapa pun.

/** Tebal papan sekat ke arah memanjang kanal (m). */
const PLANK_THICKNESS = 0.45;

/** Jumlah tiang pancang yang menonjol di atas papan. */
const POST_COUNT = 4;

/** Tinggi tiang di atas tepi kanal (m). */
const POST_RISE = 1.7;

export type Weir = {
  group: THREE.Group;
  /**
   * Perbarui ukuran dan kemunculan sekat.
   *
   * `shown` 0-1 menaikkan sekat dari dasar kanal, sehingga pemasangannya
   * terbaca sebagai sesuatu yang dikerjakan, bukan sesuatu yang tiba-tiba ada.
   */
  update: (canalDepthM: number, dropM: number, shown: number) => void;
  dispose: () => void;
};

export function createWeir(): Weir {
  const group = new THREE.Group();

  const woodGeom = new THREE.BoxGeometry(1, 1, 1);
  // Titik tumpu dipindah ke alas, supaya menaikkan `scale.y` menumbuhkan
  // sekat ke atas dari dasar kanal dan bukan membesar ke dua arah.
  woodGeom.translate(0, 0.5, 0);

  // Kayu basah yang lama terendam: gelap, agak memantul, tidak berkilat.
  const plankMat = new THREE.MeshStandardMaterial({ color: "#5c4729", roughness: 0.78, metalness: 0 });
  const postMat = new THREE.MeshStandardMaterial({ color: "#4a3620", roughness: 0.82, metalness: 0 });

  const plank = new THREE.Mesh(woodGeom, plankMat);
  plank.castShadow = true;
  plank.receiveShadow = true;
  group.add(plank);

  const posts: THREE.Mesh[] = [];
  for (let i = 0; i < POST_COUNT; i++) {
    const post = new THREE.Mesh(woodGeom, postMat);
    post.castShadow = true;
    post.receiveShadow = true;
    posts.push(post);
    group.add(post);
  }

  function update(canalDepthM: number, dropM: number, shown: number): void {
    group.visible = shown > 0.01 && canalDepthM > 0.05;
    if (!group.visible) return;

    const bottom = surfaceY(0) - canalDepthM * V_SCALE;
    const rim = surfaceY(0, dropM);
    const full = Math.max(0.1, rim - bottom);
    const height = full * shown;

    // Papan melintang, sedikit lebih lebar daripada kanalnya supaya ujungnya
    // terbenam ke dalam dinding — begitulah sekat dipasang, bukan diletakkan.
    plank.scale.set(CANAL_HALF_M * 2 + 1.2, height, PLANK_THICKNESS);
    plank.position.set(0, bottom, 0);

    for (let i = 0; i < POST_COUNT; i++) {
      const t = (i + 0.5) / POST_COUNT;
      const x = (t - 0.5) * (CANAL_HALF_M * 2 + 0.6);
      // Tiang hanya menonjol setelah papannya hampir penuh, supaya urutan
      // pemasangannya terbaca: papan dulu, baru tiangnya tampak di atas air.
      const rise = POST_RISE * V_SCALE * Math.max(0, shown * 1.4 - 0.4);
      posts[i].scale.set(0.44, height + rise, 0.44);
      posts[i].position.set(x, bottom, 0);
    }
  }

  function dispose(): void {
    woodGeom.dispose();
    plankMat.dispose();
    postMat.dispose();
  }

  return { group, update, dispose };
}
