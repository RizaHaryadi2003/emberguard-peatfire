import { describe, expect, it } from "vitest";
import { HERO_LOOPS, introScale, LINE_BOX, lineSpan, loopPoints, SAMPLES, traceLoop } from "./heroLines";

const radiusAt = (spec: (typeof HERO_LOOPS)[number], [x, y]: [number, number]) =>
  Math.hypot((x - LINE_BOX / 2) / spec.rx, (y - LINE_BOX / 2) / spec.ry);

describe("loopPoints", () => {
  it("menghasilkan titik di sekitar jari-jari lonjong", () => {
    for (const spec of HERO_LOOPS) {
      for (const p of loopPoints(spec, 0)) {
        // Gelombang dan kemiringan kecil: jarak ternormalisasi tetap dekat 1.
        expect(radiusAt(spec, p)).toBeGreaterThan(0.9);
        expect(radiusAt(spec, p)).toBeLessThan(1.1);
      }
    }
  });

  it("gelombang bergeser searah jarum jam seiring waktu", () => {
    const spec = { ...HERO_LOOPS[0], tilt: 0, waves: [{ amp: 0.05, freq: 1, phase: 0 }] };
    // Puncak gelombang (sin = 1) pada t = π/2 saat waktu 0. Setelah bergeser
    // seperempat putaran, puncak pindah ke t = π — searah jarum jam di layar
    // (sumbu y mengarah ke bawah).
    const time = Math.PI / 2 / spec.spin;
    const peakIndex = (pts: [number, number][]) => {
      let best = 0;
      pts.forEach((p, i) => {
        if (radiusAt(spec, p) > radiusAt(spec, pts[best])) best = i;
      });
      return best;
    };
    expect(peakIndex(loopPoints(spec, 0))).toBe(SAMPLES / 4);
    expect(peakIndex(loopPoints(spec, time))).toBe(SAMPLES / 2);
  });
});

describe("traceLoop", () => {
  it("menggambar satu lintasan tertutup dengan satu kurva per titik", () => {
    const calls: string[] = [];
    traceLoop(
      {
        moveTo: () => calls.push("M"),
        bezierCurveTo: () => calls.push("C"),
        closePath: () => calls.push("Z"),
      },
      loopPoints(HERO_LOOPS[0]),
    );
    expect(calls[0]).toBe("M");
    expect(calls.at(-1)).toBe("Z");
    expect(calls.filter((c) => c === "C")).toHaveLength(SAMPLES);
  });
});

describe("introScale", () => {
  it("membuat garis tampak sebagai lingkaran (lebar = tinggi dalam piksel)", () => {
    const w = 1440;
    const h = 900;
    const { sx, sy } = introScale(w, h, 0.3);
    const avgRx = HERO_LOOPS.reduce((s, l) => s + l.rx, 0) / HERO_LOOPS.length;
    const avgRy = HERO_LOOPS.reduce((s, l) => s + l.ry, 0) / HERO_LOOPS.length;
    expect((avgRx / LINE_BOX) * lineSpan(w, h).x * sx).toBeCloseTo(270);
    expect((avgRy / LINE_BOX) * h * sy).toBeCloseTo(270);
  });

  it("oval akhir tegak (lebih tinggi daripada lebar) di laptop maupun ponsel", () => {
    for (const [w, h] of [[1440, 900], [1920, 1080], [390, 844]]) {
      const span = lineSpan(w, h);
      for (const l of HERO_LOOPS) {
        expect((l.ry / LINE_BOX) * span.y).toBeGreaterThan((l.rx / LINE_BOX) * span.x);
      }
    }
  });

  it("selalu lebih kecil dari ukuran akhir", () => {
    for (const [w, h] of [[1440, 900], [1280, 720], [390, 844]]) {
      const { sx, sy } = introScale(w, h);
      expect(sx).toBeLessThan(1);
      expect(sy).toBeLessThan(1);
    }
  });
});
