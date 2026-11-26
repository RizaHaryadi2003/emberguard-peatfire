import { describe, expect, it } from "vitest";
import { HERO_LOOPS, introScale, LINE_BOX, loopPath, loopPoints } from "./heroLines";

describe("loopPoints", () => {
  it("menghasilkan titik di sekitar jari-jari lonjong", () => {
    for (const spec of HERO_LOOPS) {
      for (const [x, y] of loopPoints(spec)) {
        const nx = (x - LINE_BOX / 2) / spec.rx;
        const ny = (y - LINE_BOX / 2) / spec.ry;
        // Gelombang dan kemiringan kecil: jarak ternormalisasi tetap dekat 1.
        expect(Math.hypot(nx, ny)).toBeGreaterThan(0.9);
        expect(Math.hypot(nx, ny)).toBeLessThan(1.1);
      }
    }
  });
});

describe("loopPath", () => {
  it("berupa lintasan tertutup yang selalu sama", () => {
    const d = loopPath(HERO_LOOPS[0]);
    expect(d.startsWith("M")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
    expect(loopPath(HERO_LOOPS[0])).toBe(d);
  });
});

describe("introScale", () => {
  it("membuat garis tampak sebagai lingkaran (lebar = tinggi dalam piksel)", () => {
    const w = 1440;
    const h = 900;
    const { sx, sy } = introScale(w, h, 0.3);
    const avgRx = HERO_LOOPS.reduce((s, l) => s + l.rx, 0) / HERO_LOOPS.length;
    const avgRy = HERO_LOOPS.reduce((s, l) => s + l.ry, 0) / HERO_LOOPS.length;
    const pxRx = (avgRx / LINE_BOX) * w * sx;
    const pxRy = (avgRy / LINE_BOX) * h * sy;
    expect(pxRx).toBeCloseTo(270);
    expect(pxRy).toBeCloseTo(270);
  });

  it("selalu lebih kecil dari ukuran akhir", () => {
    for (const [w, h] of [[1440, 900], [1280, 720], [390, 844]]) {
      const { sx, sy } = introScale(w, h);
      expect(sx).toBeLessThan(1);
      expect(sy).toBeLessThan(1);
    }
  });
});
