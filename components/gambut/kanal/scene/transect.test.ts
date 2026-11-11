import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  createCanalFaceGeometry,
  createFaceGrid,
  createSkirtGeometry,
  createSurfaceGrid,
  farEdgeX,
  backEdgeZ,
  updateCanalFaceGeometry,
  updateFaceGrid,
  updateSkirtGeometry,
  updateSurfaceGrid,
  BLOCK_DEPTH,
  CANAL_HALF_M,
  FACE_ROWS,
  HALF_WIDTH,
  NEAR_LENGTH_M,
  SURFACE_ROWS,
  WING_COLS,
} from "./transect";

// Bongkahan Modul 02 disusun dari empat geometri yang dibentuk terpisah:
// bidang potong depan, hamparan permukaan, pita dinding ujung dan belakang,
// serta penampang kanal. Sejak tepinya dibuat alami — bergelombang, membulat,
// dan menjorok — tiap sambungan di antara keduanya dihitung dari rumus yang
// berbeda-beda, dan celah selebar satu sentimeter pun terlihat sebagai garis
// terang di layar. Uji ini memastikan semua sambungan itu tetap rapat.

const EPS = 1e-4;

/** Penurunan permukaan buatan, supaya sambungan diuji juga saat tanah melesak. */
const drop = (m: number) => 0.4 * Math.exp(-m / 30);
const CANAL_DEPTH = 1.2;

function point(geom: THREE.BufferGeometry, k: number): THREE.Vector3 {
  return new THREE.Vector3().fromBufferAttribute(geom.attributes.position as THREE.BufferAttribute, k);
}

function build() {
  const face = createFaceGrid();
  const surface = createSurfaceGrid();
  const skirt = createSkirtGeometry();
  const cut = createCanalFaceGeometry();
  updateFaceGrid(face, drop, CANAL_DEPTH);
  updateSurfaceGrid(surface, drop, CANAL_DEPTH);
  updateSkirtGeometry(skirt, drop, CANAL_DEPTH);
  updateCanalFaceGeometry(cut, drop(0), CANAL_DEPTH);
  return { face, surface, skirt, cut };
}

describe("bongkahan alami Modul 02", () => {
  const { face, surface, skirt, cut } = build();
  const cols = WING_COLS + 1;
  const skirtPoints = SURFACE_ROWS + 1 + WING_COLS;

  it("tepi atas bidang potong menempel pada baris depan hamparan", () => {
    for (let i = 0; i < cols; i++) {
      expect(point(face, i).distanceTo(point(surface, i))).toBeLessThan(EPS);
    }
  });

  it("tepi atas pita dinding menempel pada tepi ujung dan belakang hamparan", () => {
    for (let j = 0; j <= SURFACE_ROWS; j++) {
      expect(point(skirt, j).distanceTo(point(surface, j * cols + WING_COLS))).toBeLessThan(EPS);
    }
    for (let i = 0; i < WING_COLS; i++) {
      const k = SURFACE_ROWS + 1 + i;
      const surf = SURFACE_ROWS * cols + (WING_COLS - 1 - i);
      expect(point(skirt, k).distanceTo(point(surface, surf))).toBeLessThan(EPS);
    }
  });

  it("sudut depan: lajur terakhir bidang potong sama dengan lajur pertama pita dinding sampai ke dasar", () => {
    // Pita punya lebih sedikit baris daripada bidang potong, jadi dibandingkan
    // pada baris yang pecahan tingginya sama.
    const skirtRows = (skirt.attributes.position.count / skirtPoints) - 1;
    for (let r = 0; r <= skirtRows; r++) {
      const t = r / skirtRows;
      const j = t * FACE_ROWS;
      if (!Number.isInteger(j)) continue;
      const a = point(face, j * cols + WING_COLS);
      const b = point(skirt, r * skirtPoints);
      expect(a.distanceTo(b)).toBeLessThan(EPS);
    }
  });

  it("penampang kanal bertemu lajur pertama bidang potong di kedua sisi", () => {
    const cutCols = cut.attributes.position.count / (FACE_ROWS + 1);
    for (let j = 0; j <= FACE_ROWS; j++) {
      const wing = point(face, j * cols);
      const right = point(cut, j * cutCols + cutCols - 1);
      const left = point(cut, j * cutCols);
      expect(right.distanceTo(wing)).toBeLessThan(EPS);
      // Sayap kiri adalah cermin sayap kanan terhadap x.
      expect(left.distanceTo(new THREE.Vector3(-wing.x, wing.y, wing.z))).toBeLessThan(EPS);
    }
  });

  it("penampang kanal yang sudah digali lebih rendah di tengah daripada di tepinya", () => {
    const cutCols = cut.attributes.position.count / (FACE_ROWS + 1);
    const middle = point(cut, Math.floor(cutCols / 2));
    const edge = point(cut, 0);
    expect(edge.y - middle.y).toBeGreaterThan(CANAL_DEPTH);
  });

  it("tepinya tidak lurus, tetapi tidak pernah masuk ke petak tempat tumbuhan disebar", () => {
    const fars = Array.from({ length: 31 }, (_, k) => farEdgeX(-BLOCK_DEPTH / 2 + k));
    expect(Math.max(...fars) - Math.min(...fars)).toBeGreaterThan(0.3);
    // Tumbuhan disebar sampai NEAR_LENGTH_M - 1 dari tepi kanal.
    for (const x of fars) expect(x).toBeGreaterThan(CANAL_HALF_M + NEAR_LENGTH_M - 1);
    // Tepi belakang lurus tepat di kanal, supaya palungnya berakhir rapi.
    expect(backEdgeZ(CANAL_HALF_M)).toBeCloseTo(-BLOCK_DEPTH / 2, 6);
    expect(Math.max(...fars)).toBeLessThan(HALF_WIDTH + 2);
  });
});
