// Surface Nets: mengubah fungsi jarak bertanda (SDF) menjadi jaring segitiga.
//
// Ruang dibagi menjadi kisi kubus kecil. Setiap kubus yang sebagian sudutnya
// di dalam dan sebagian di luar bentuk mendapat satu titik, diletakkan di
// rata-rata titik potong permukaan pada rusuk-rusuknya. Setiap rusuk kisi yang
// menembus permukaan lalu menghubungkan empat kubus di sekelilingnya menjadi
// satu segi empat (dua segitiga). Hasilnya permukaan halus tanpa tabel kasus
// seperti Marching Cubes.
//
// Normal tiap titik diambil dari gradien SDF (beda pusat), jadi pantulan
// cahaya mulus walau kisinya kasar.

import type { Vec3 } from "./lungShape";

export type Sdf = (x: number, y: number, z: number) => number;
export type Mesh = {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
};

export function surfaceNets(
  sdf: Sdf,
  min: Vec3,
  max: Vec3,
  step: number,
): Mesh {
  const nx = Math.ceil((max[0] - min[0]) / step) + 1;
  const ny = Math.ceil((max[1] - min[1]) / step) + 1;
  const nz = Math.ceil((max[2] - min[2]) / step) + 1;
  const at = (i: number, j: number, k: number) => i + nx * (j + ny * k);

  // 1. Nilai SDF di setiap titik kisi.
  const field = new Float32Array(nx * ny * nz);
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++)
        field[at(i, j, k)] = sdf(
          min[0] + i * step,
          min[1] + j * step,
          min[2] + k * step,
        );

  // 2. Satu titik untuk setiap kubus yang dilintasi permukaan.
  const cx = nx - 1;
  const cy = ny - 1;
  const cellAt = (i: number, j: number, k: number) => i + cx * (j + cy * k);
  const cellVertex = new Int32Array(cx * cy * (nz - 1)).fill(-1);
  const pos: number[] = [];
  const corners = [
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
    [1, 1, 0],
    [0, 0, 1],
    [1, 0, 1],
    [0, 1, 1],
    [1, 1, 1],
  ];
  const edges = [
    [0, 1],
    [2, 3],
    [4, 5],
    [6, 7],
    [0, 2],
    [1, 3],
    [4, 6],
    [5, 7],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];
  const v = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++)
    for (let j = 0; j < cy; j++)
      for (let i = 0; i < cx; i++) {
        let mask = 0;
        for (let c = 0; c < 8; c++) {
          v[c] =
            field[at(i + corners[c][0], j + corners[c][1], k + corners[c][2])];
          if (v[c] < 0) mask |= 1 << c;
        }
        if (mask === 0 || mask === 255) continue;
        let sx = 0;
        let sy = 0;
        let sz = 0;
        let n = 0;
        for (const [a, b] of edges) {
          if (v[a] < 0 === v[b] < 0) continue;
          const t = v[a] / (v[a] - v[b]);
          sx += corners[a][0] + (corners[b][0] - corners[a][0]) * t;
          sy += corners[a][1] + (corners[b][1] - corners[a][1]) * t;
          sz += corners[a][2] + (corners[b][2] - corners[a][2]) * t;
          n++;
        }
        cellVertex[cellAt(i, j, k)] = pos.length / 3;
        pos.push(
          min[0] + (i + sx / n) * step,
          min[1] + (j + sy / n) * step,
          min[2] + (k + sz / n) * step,
        );
      }

  // 3. Segi empat untuk setiap rusuk kisi yang menembus permukaan.
  const idx: number[] = [];
  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) idx.push(a, c, b, a, d, c);
    else idx.push(a, b, c, a, c, d);
  };
  for (let k = 1; k < nz - 1; k++)
    for (let j = 1; j < ny - 1; j++)
      for (let i = 1; i < nx - 1; i++) {
        const inside = field[at(i, j, k)] < 0;
        // Rusuk searah x: empat kubus di sekelilingnya pada bidang y–z.
        if (i < nx - 1 && inside !== field[at(i + 1, j, k)] < 0)
          quad(
            cellVertex[cellAt(i, j - 1, k - 1)],
            cellVertex[cellAt(i, j, k - 1)],
            cellVertex[cellAt(i, j, k)],
            cellVertex[cellAt(i, j - 1, k)],
            !inside,
          );
        // Rusuk searah y: kubus di sekelilingnya pada bidang z–x.
        if (j < ny - 1 && inside !== field[at(i, j + 1, k)] < 0)
          quad(
            cellVertex[cellAt(i - 1, j, k - 1)],
            cellVertex[cellAt(i - 1, j, k)],
            cellVertex[cellAt(i, j, k)],
            cellVertex[cellAt(i, j, k - 1)],
            !inside,
          );
        // Rusuk searah z: kubus di sekelilingnya pada bidang x–y.
        if (k < nz - 1 && inside !== field[at(i, j, k + 1)] < 0)
          quad(
            cellVertex[cellAt(i - 1, j - 1, k)],
            cellVertex[cellAt(i, j - 1, k)],
            cellVertex[cellAt(i, j, k)],
            cellVertex[cellAt(i - 1, j, k)],
            !inside,
          );
      }

  // 4. Normal dari gradien SDF.
  const positions = new Float32Array(pos);
  const normals = new Float32Array(pos.length);
  const e = step * 0.5;
  for (let p = 0; p < positions.length; p += 3) {
    const x = positions[p];
    const y = positions[p + 1];
    const z = positions[p + 2];
    const gx = sdf(x + e, y, z) - sdf(x - e, y, z);
    const gy = sdf(x, y + e, z) - sdf(x, y - e, z);
    const gz = sdf(x, y, z + e) - sdf(x, y, z - e);
    const l = Math.hypot(gx, gy, gz) || 1;
    normals[p] = gx / l;
    normals[p + 1] = gy / l;
    normals[p + 2] = gz / l;
  }
  return { positions, normals, indices: new Uint32Array(idx) };
}
