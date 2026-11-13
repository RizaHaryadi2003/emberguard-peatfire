import * as THREE from "three";

// Pengolah model tumbuhan pindaian (GLB Poly Haven) menjadi ragam yang siap
// di-instance. Dipakai bersama oleh Modul Kanal dan Modul Hutan Rawa Gambut,
// supaya pohon di kedua modul diolah dengan cara yang persis sama.

/**
 * Pangkas segitiga daun, dengan menjatuhkan sebagian helainya.
 *
 * Model pindaian ini mahal: satu pohon pachira berdaun 17.000-24.000 segitiga,
 * dan lima puluhan pohon membuat seluruh adegan menggambar 1,3 juta segitiga
 * tiap bingkai — pada modul yang juga menjalankan simulasi tiap bingkai.
 * Modul Anatomi dan Bara tidak pernah menghadapi ini karena hanya menanam tiga.
 *
 * Yang dijatuhkan helai utuh, bukan segitiga satu per satu. Daun pada model
 * ini tersusun sebagai lembar-lembar bersegitiga genap; membuang segitiga
 * berselang-seling akan memotong tiap helai menjadi separuh, dan yang didapat
 * bukan tajuk yang lebih jarang melainkan tajuk yang robek. Membuang sepasang
 * segitiga sekaligus menjaga tiap helai tetap utuh — tajuknya menjadi lebih
 * jarang, dan itu memang yang diinginkan.
 */
export function thinFoliage(geometry: THREE.BufferGeometry, keep: number): THREE.BufferGeometry {
  const index = geometry.getIndex();
  if (!index || keep >= 1) return geometry;

  const triangles = index.count / 3;
  const kept: number[] = [];
  // Dikerjakan per pasang segitiga: satu helai daun.
  const pairs = Math.floor(triangles / 2);
  const period = Math.max(2, Math.round(1 / keep));
  for (let pair = 0; pair < pairs; pair++) {
    if (pair % period !== 0) continue;
    for (let t = pair * 2; t < pair * 2 + 2; t++) {
      kept.push(index.getX(t * 3), index.getX(t * 3 + 1), index.getX(t * 3 + 2));
    }
  }

  const thinned = geometry.clone();
  thinned.setIndex(kept);
  return thinned;
}

export type Part = {
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
export function collectVariants(root: THREE.Object3D, leafKeep = 1): Part[][] {
  root.updateMatrixWorld(true);
  const groups = new Map<string, Part[]>();

  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    // Ragam dipisahkan oleh huruf terakhir nama mesh, sama seperti pada
    // SurfaceCover Modul Bara — begitulah berkas Poly Haven ini disusun.
    const key = mesh.name.slice(-1);
    const leaf = /leaf|leaves|daun/i.test(mesh.name);
    let geometry = mesh.geometry.clone();
    if (leaf) geometry = thinFoliage(geometry, leafKeep);
    geometry.applyMatrix4(mesh.matrixWorld);
    const list = groups.get(key) ?? [];
    list.push({ geometry, material: mesh.material as THREE.Material, leaf });
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

