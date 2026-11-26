import * as THREE from "three";

/**
 * Bentuk satu helai bulu yang memanjang ke +x dari pangkal (0, 0) sampai
 * ujung (len, 0), lebar terbesar `width` di sekitar sepertiga panjangnya.
 * `tip` 0 = ujung runcing, 1 = ujung membulat lebar. `emarginate` membuat
 * bagian luar ujung menyempit tajam seperti bulu primer rangkong yang
 * merenggang menjadi "jari".
 */
export function featherShape(len: number, width: number, tip = 0.5, emarginate = 0): THREE.Shape {
  const w = width / 2;
  const tw = w * (0.25 + 0.6 * tip) * (1 - 0.55 * emarginate);
  const s = new THREE.Shape();
  s.moveTo(0, -w * 0.45);
  // Sisi bawah: melebar lalu menyempit ke ujung.
  s.bezierCurveTo(len * 0.18, -w, len * 0.55, -w * (1 - 0.35 * emarginate), len * 0.86, -tw);
  // Ujung: runcing atau membulat.
  s.bezierCurveTo(len * (0.95 + 0.04 * tip), -tw * 0.6, len * (0.95 + 0.04 * tip), tw * 0.6, len * 0.86, tw);
  // Sisi atas kembali ke pangkal.
  s.bezierCurveTo(len * 0.55, w * (1 - 0.15 * emarginate), len * 0.18, w, 0, w * 0.45);
  s.closePath();
  return s;
}

/**
 * Geometri bulu yang sudah dibaringkan pada bidang x–z (bidang sayap/ekor),
 * memanjang ke +x. Dipakai bersama oleh banyak helai dengan ukuran sama.
 */
export function featherGeometry(len: number, width: number, tip = 0.5, emarginate = 0): THREE.BufferGeometry {
  const g = new THREE.ShapeGeometry(featherShape(len, width, tip, emarginate), 10);
  g.rotateX(Math.PI / 2);
  return g;
}

/**
 * Lempeng sayap dalam (bulu penutup) berbentuk membulat, berbaring di bidang
 * x–z: tepi depan di x = front, tepi belakang di x = −back, sepanjang z 0..len.
 */
export function panelGeometry(len: number, front: number, back: number, taper = 0.85): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-4, front);
  s.bezierCurveTo(len * 0.4, front + 2, len * 0.8, front * taper, len + 4, front * taper * 0.8);
  s.bezierCurveTo(len + 8, 0, len + 6, -back * taper * 0.6, len + 2, -back * taper);
  s.bezierCurveTo(len * 0.6, -back * 1.02, len * 0.2, -back, -4, -back * 0.9);
  s.bezierCurveTo(-9, -back * 0.4, -9, front * 0.6, -4, front);
  // Bentuk dibuat di bidang (z = sumbu x bentuk, x = sumbu y bentuk); diputar ke x–z.
  const g = new THREE.ShapeGeometry(s, 12);
  // Sumbu x bentuk → z dunia, sumbu y bentuk → x dunia.
  g.applyMatrix4(new THREE.Matrix4().set(0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1));
  return g;
}
