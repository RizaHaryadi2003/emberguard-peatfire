import { describe, expect, it } from "vitest";
import {
  besselJ0,
  besselJ1,
  CRATER_DEPTH,
  createRippleField,
  crestArrivalTime,
  fallHeight,
  groupVelocity,
  omega,
  RING_RADIUS,
} from "./waterRipple";

describe("fungsi Bessel", () => {
  it("cocok dengan nilai baku", () => {
    expect(besselJ0(0)).toBeCloseTo(1, 7);
    expect(besselJ0(2.404825557695773)).toBeCloseTo(0, 7); // akar pertama J₀
    expect(besselJ0(10)).toBeCloseTo(-0.245935764451348, 6);
    expect(besselJ1(1.841183781340659)).toBeCloseTo(0.581865224, 6); // puncak J₁
    expect(besselJ1(-3)).toBeCloseTo(-0.339058958525936, 6);
  });
});

describe("dispersi gelombang kapiler-gravitasi", () => {
  it("laju fase terkecil ±23 cm/s pada panjang gelombang ±1,7 cm (nilai baku air)", () => {
    let best = Infinity;
    let bestK = 0;
    for (let k = 50; k < 2000; k++) {
      const v = omega(k) / k;
      if (v < best) [best, bestK] = [v, k];
    }
    expect(best).toBeCloseTo(0.23, 2);
    expect((2 * Math.PI) / bestK).toBeCloseTo(0.017, 3);
  });

  it("tidak ada riak yang lebih lambat dari ±17,7 cm/s", () => {
    let best = Infinity;
    for (let k = 50; k < 4000; k++) best = Math.min(best, groupVelocity(k));
    expect(best).toBeCloseTo(0.177, 2);
  });
});

describe("medan riak tetesan", () => {
  const field = createRippleField();
  const out = new Float32Array(4 * field.samples);

  it("permukaan datar sebelum tetesan menyentuh air", () => {
    field.evaluate(0, out);
    expect(Math.max(...out.map(Math.abs))).toBe(0);
  });

  it("kawah terdalam sesuai takaran, lalu pusat memantul naik", () => {
    let deepest = 0;
    let rebound = 0;
    for (let t = 0.001; t < 0.08; t += 0.001) {
      field.evaluate(t, out);
      deepest = Math.min(deepest, out[0]);
      if (deepest < -0.9 * CRATER_DEPTH) rebound = Math.max(rebound, out[0]);
    }
    expect(deepest).toBeCloseTo(-CRATER_DEPTH, 4);
    expect(rebound).toBeGreaterThan(0);
  });

  it("muka riak melebar terus dan tiba di lingkaran dalam ±0,13 detik", () => {
    const t = crestArrivalTime(field);
    expect(t).toBeGreaterThan(0.1);
    expect(t).toBeLessThan(0.16);
    expect(field.crestRadius(t)).toBeGreaterThanOrEqual(RING_RADIUS);
    expect(field.crestRadius(t * 0.5)).toBeLessThan(field.crestRadius(t));
  });

  it("riak melemah sambil menjauh (energi tersebar ke keliling yang makin besar)", () => {
    const peakSlope = (t: number) => {
      field.evaluate(t, out);
      let m = 0;
      for (let j = 20; j < field.samples; j++) m = Math.max(m, Math.abs(out[4 * j + 1]));
      return m;
    };
    expect(peakSlope(0.2)).toBeLessThan(peakSlope(0.1));
  });
});

describe("jatuh bebas", () => {
  it("mulai diam di atas, makin cepat, lalu tepat menyentuh air", () => {
    expect(fallHeight(0)).toBe(1);
    expect(fallHeight(1)).toBe(0);
    // Separuh waktu pertama baru menempuh seperempat tinggi.
    expect(fallHeight(0.5)).toBeCloseTo(0.75);
  });
});
