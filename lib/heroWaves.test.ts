import { describe, expect, it } from "vitest";
import { rippleProfile, waveAt } from "./heroWaves";

describe("riak latar beranda", () => {
  it("melebar terus dengan laju yang melambat", () => {
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

  it("tak terlihat di awal dan akhir, paling jelas di tengah, makin landai saat menjauh", () => {
    expect(waveAt(0, 0, 1).strength).toBeCloseTo(0);
    expect(waveAt(1, 0, 1).strength).toBeCloseTo(0);
    expect(waveAt(0.5, 0, 1).strength).toBeCloseTo(1);
    expect(waveAt(0.9, 50, 500).width).toBeGreaterThan(waveAt(0.1, 50, 500).width);
  });

  it("puncak terang diapit lembah gelap, beberapa puncak kecil, lalu mendatar", () => {
    expect(rippleProfile(0)).toBeCloseTo(1);
    expect(rippleProfile(1.3)).toBeLessThan(0);
    expect(rippleProfile(-1.4)).toBeLessThan(0);
    let crests = 0;
    for (let x = -8; x < 8; x += 0.01) {
      if (rippleProfile(x) > 0.05 && rippleProfile(x) > rippleProfile(x - 0.01) && rippleProfile(x) >= rippleProfile(x + 0.01)) crests++;
    }
    expect(crests).toBeGreaterThanOrEqual(3);
    expect(Math.abs(rippleProfile(9))).toBeLessThan(0.01);
  });
});
