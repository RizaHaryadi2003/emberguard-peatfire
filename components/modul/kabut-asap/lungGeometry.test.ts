import { describe, expect, it } from "vitest";
import { LENS, SACS, TREES, bronchialTree } from "./lungGeometry";

describe("bronchialTree", () => {
  it("membelah dua tiap generasi: 2^n − 1 cabang", () => {
    expect(bronchialTree({ x: 0, y: 0 }, 0, 40, 6, 5, 1)).toHaveLength(31);
  });

  it("tetap sama untuk benih yang sama", () => {
    const a = bronchialTree({ x: 0, y: 0 }, 1, 40, 6, 4, 7);
    const b = bronchialTree({ x: 0, y: 0 }, 1, 40, 6, 4, 7);
    expect(a).toEqual(b);
  });

  it("cabang makin ramping pada generasi berikutnya", () => {
    const tree = bronchialTree({ x: 0, y: 0 }, 0, 40, 6, 4, 3);
    for (const br of tree) expect(br.width).toBeCloseTo(6 * 0.72 ** br.gen, 6);
  });

  it("pohon kedua paru punya cabang", () => {
    expect(TREES.R.length).toBeGreaterThan(100);
    expect(TREES.L.length).toBeGreaterThan(100);
  });
});

describe("SACS", () => {
  it("semua kantong alveolus berada di dalam lensa", () => {
    for (const s of SACS) {
      const d = Math.hypot(s.x - LENS.cx, s.y - LENS.cy);
      expect(d + s.r).toBeLessThanOrEqual(LENS.r);
    }
  });
});
