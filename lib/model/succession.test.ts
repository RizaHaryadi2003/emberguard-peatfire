import { describe, expect, it } from "vitest";
import {
  FIRES,
  TRANSECT_HA,
  aliveAfter,
  remainingShare,
  transectTrees,
  treesInTransect,
} from "./succession";

describe("transek Yeager dkk. (2003)", () => {
  it("satu transek 400 × 5 m = 0,2 ha", () => {
    expect(TRANSECT_HA).toBeCloseTo(0.2, 10);
  });

  it("pohon per transek: 195, 72, 11, 1", () => {
    expect(FIRES.map(treesInTransect)).toEqual([195, 72, 11, 1]);
  });

  it("sekali terbakar menyisakan lebih dari sepertiga, dua kali ±5 %", () => {
    expect(remainingShare(1)).toBeGreaterThan(1 / 3);
    expect(remainingShare(2)).toBeCloseTo(0.055, 2);
    expect(remainingShare(3)).toBeLessThan(0.01);
  });
});

describe("pohon di transek", () => {
  const trees = transectTrees();

  it("jumlah yang hidup tepat sama dengan model", () => {
    for (const f of FIRES) expect(aliveAfter(trees, f)).toHaveLength(treesInTransect(f));
  });

  it("yang selamat dari kebakaran berikutnya selalu bagian dari yang sebelumnya", () => {
    for (const f of [1, 2, 3] as const) {
      const now = new Set(aliveAfter(trees, f));
      const before = new Set(aliveAfter(trees, (f - 1) as 0 | 1 | 2));
      for (const t of now) expect(before.has(t)).toBe(true);
    }
  });

  it("semua pohon di dalam transek", () => {
    for (const t of trees) {
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x).toBeLessThanOrEqual(400);
      expect(Math.abs(t.y)).toBeLessThanOrEqual(2.5);
    }
  });
});
