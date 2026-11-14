import { describe, expect, it } from "vitest";
import { kmOfX, peatThicknessM } from "./dome";
import {
  fbm2,
  HUMMOCK_M,
  mineralFrontGrid,
  mineralTopY,
  peatBaseY,
  peatFrontGrid,
  peatSideGrid,
  peatTopGrid,
  RIVER_LEVEL,
  riverBedY,
  surfaceY,
  X_LEFT,
  X_RIGHT,
  X_RIVER,
  Z_FRONT,
  type Grid,
} from "./domeShape";

/** Titik ke-k sebuah kisi. */
const at = (g: Grid, k: number) => [g.positions[k * 3], g.positions[k * 3 + 1], g.positions[k * 3 + 2]];

describe("bentuk alami kubah gambut Modul Hutan Rawa", () => {
  it("derau tetap sama setiap kali dihitung dan tetap dalam rentangnya", () => {
    expect(fbm2(3.1, 4.7)).toBe(fbm2(3.1, 4.7));
    for (let i = 0; i < 200; i++) {
      const v = fbm2(i * 0.37, i * 0.91);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("gundukan tidak mengubah tebal gambut lebih dari HUMMOCK_M", () => {
    for (let x = X_LEFT; x <= X_RIGHT; x += 0.5) {
      for (const z of [-8, 0, Z_FRONT]) {
        expect(Math.abs(surfaceY(x, z) - peatThicknessM(kmOfX(x)))).toBeLessThanOrEqual(HUMMOCK_M + 1e-9);
      }
    }
  });

  it("tepi atas muka depan berimpit tepat dengan tepi depan permukaan atas", () => {
    const face = peatFrontGrid("low");
    const top = peatTopGrid("low");
    expect(face.cols).toBe(top.cols);
    for (let i = 0; i <= face.cols; i++) {
      const a = at(face, face.rows * (face.cols + 1) + i);
      const b = at(top, top.rows * (top.cols + 1) + i);
      for (let c = 0; c < 3; c++) expect(a[c]).toBeCloseTo(b[c], 6);
    }
  });

  it("muka samping kiri dan kanan menyambung tanpa celah ke muka depan", () => {
    const face = peatFrontGrid("low");
    for (const side of ["left", "right"] as const) {
      const g = peatSideGrid(side, "low");
      const faceCol = side === "left" ? 0 : face.cols;
      for (let j = 0; j <= g.rows; j++) {
        const a = at(g, j * (g.cols + 1) + g.cols);
        const b = at(face, j * (face.cols + 1) + faceCol);
        for (let c = 0; c < 3; c++) expect(a[c]).toBeCloseTo(b[c], 6);
      }
    }
  });

  it("kedalaman di muka depan nol di permukaan dan bertambah ke bawah", () => {
    const face = peatFrontGrid("low");
    for (let i = 0; i <= face.cols; i += 7) {
      expect(face.depths[face.rows * (face.cols + 1) + i]).toBeCloseTo(0, 6);
      for (let j = 1; j <= face.rows; j++) {
        expect(face.depths[(j - 1) * (face.cols + 1) + i]).toBeGreaterThan(face.depths[j * (face.cols + 1) + i]);
      }
    }
  });

  it("tanah mineral menyentuh alas gambut dan dasar sungai di bawah muka air", () => {
    for (let x = X_LEFT + 0.1; x <= X_RIGHT; x += 1) expect(mineralTopY(x)).toBe(peatBaseY(x));
    for (let x = X_RIVER; x <= X_LEFT; x += 0.25) expect(riverBedY(x)).toBeLessThan(RIVER_LEVEL);
    // Dasar sungai bertemu alas gambut di kaki kubah.
    expect(riverBedY(X_LEFT)).toBeCloseTo(peatBaseY(X_LEFT), 6);
    // Atap tanah mineral yang tertutup gambut sedikit menembus ke atas,
    // supaya tidak ada celah di antara dua kisi yang titiknya tidak berimpit.
    const g = mineralFrontGrid("low", -5);
    const k = g.rows * (g.cols + 1) + Math.round(g.cols * 0.6);
    expect(g.positions[k * 3 + 1]).toBeGreaterThan(peatBaseY(g.positions[k * 3]));
  });
});
