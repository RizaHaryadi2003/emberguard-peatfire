import { describe, expect, it } from "vitest";
import { waveAt, wavePath, waveRadius } from "./heroWaves";

describe("gelombang latar beranda", () => {
  it("cincin melebar terus dengan laju yang melambat", () => {
    let prev = waveAt(0, 50, 500).radius;
    let lastStep = Infinity;
    for (let p = 0.05; p <= 1; p += 0.05) {
      const r = waveAt(p, 50, 500).radius;
      expect(r).toBeGreaterThan(prev);
      expect(r - prev).toBeLessThan(lastStep + 1e-9);
      lastStep = r - prev;
      prev = r;
    }
    expect(waveAt(1, 50, 500).radius).toBeCloseTo(500);
  });

  it("tak terlihat di awal dan akhir, paling jelas di tengah", () => {
    expect(waveAt(0, 0, 1).opacity).toBeCloseTo(0);
    expect(waveAt(1, 0, 1).opacity).toBeCloseTo(0);
    expect(waveAt(0.5, 0, 1).opacity).toBeCloseTo(1);
  });

  it("tepi hanya sedikit bergelombang dan lintasan tertutup", () => {
    const w = { radius: 100, wobble: 0.02, lobes: 5, phase: 0.4 };
    for (let t = 0; t < 2 * Math.PI; t += 0.1) {
      expect(Math.abs(waveRadius(t, w) - 100)).toBeLessThanOrEqual(2 + 1e-9);
    }
    const d = wavePath(0, 0, w);
    expect(d.startsWith("M")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
  });
});
