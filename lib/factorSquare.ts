// Persegi roda faktor pada beranda: logo navigasi turun ke tengah sisi atas,
// lalu berjalan menyusuri persegi searah jarum jam sambil menggambar garisnya.
// Faktor tersebar sama jarak di sepanjang keliling, dimulai dari tengah sisi
// atas; dengan delapan faktor, letaknya tepat di tengah tiap sisi dan di
// keempat sudut.
//
// Koordinat dinormalkan: persegi dari −1 sampai 1 di kedua sumbu, y ke bawah
// seperti layar. Kemajuan keliling u berjalan 0 → 1 searah jarum jam.

export type Point = { x: number; y: number };

/** Titik pada keliling persegi pada kemajuan u (0..1), mulai dari tengah sisi atas. */
export function squarePoint(u: number): Point {
  // Keliling persegi bersisi 2 = 8. Mulai dari (0, −1) ke kanan.
  let s = (((u % 1) + 1) % 1) * 8;
  if (s < 1) return { x: s, y: -1 };
  s -= 1;
  if (s < 2) return { x: 1, y: -1 + s };
  s -= 2;
  if (s < 2) return { x: 1 - s, y: 1 };
  s -= 2;
  if (s < 2) return { x: -1, y: 1 - s };
  s -= 2;
  return { x: -1 + s, y: -1 };
}

/** Kemajuan keliling faktor ke-i dari `count` faktor. */
export function factorProgress(i: number, count: number): number {
  return i / count;
}

/** Letak faktor ke-i (koordinat dinormalkan). */
export function factorPoint(i: number, count: number): Point {
  return squarePoint(factorProgress(i, count));
}

/**
 * Lintasan SVG persegi dalam kotak `size` × `size`, dimulai dari tengah sisi
 * atas dan berjalan searah jarum jam, supaya bisa "digambar" berurutan dengan
 * laju yang sama dengan squarePoint.
 */
export function squarePath(size: number): string {
  const h = size / 2;
  const at = (p: Point) => `${(h + p.x * h).toFixed(2)} ${(h + p.y * h).toFixed(2)}`;
  const corners = [0, 1 / 8, 3 / 8, 5 / 8, 7 / 8, 1].map(squarePoint);
  corners[5] = { x: 0, y: -1 };
  return corners.map((p, i) => `${i === 0 ? "M" : "L"}${at(p)}`).join(" ");
}
