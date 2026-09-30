import { describe, expect, it } from "vitest";
import { lerp, smoothStep, SPOTLIGHT_STOPS } from "./spotlight";

describe("lerp", () => {
  it("bergeser 10% menuju target", () => {
    expect(lerp(0, 100, 0.1)).toBe(10);
  });

  it("tidak bergerak bila sudah di target", () => {
    expect(lerp(50, 50, 0.1)).toBe(50);
  });

  it("bekerja ke arah negatif", () => {
    expect(lerp(100, 0, 0.5)).toBe(50);
  });
});

describe("smoothStep", () => {
  it("menghaluskan x dan y secara terpisah", () => {
    expect(smoothStep({ x: 0, y: 200 }, { x: 100, y: 0 }, 0.1)).toEqual({ x: 10, y: 180 });
  });

  it("mendekati target setelah banyak bingkai", () => {
    let p = { x: -999, y: -999 };
    for (let i = 0; i < 200; i++) p = smoothStep(p, { x: 400, y: 300 });
    expect(p.x).toBeCloseTo(400, 3);
    expect(p.y).toBeCloseTo(300, 3);
  });
});

describe("SPOTLIGHT_STOPS", () => {
  it("dimulai pekat di tengah dan berakhir transparan di tepi", () => {
    expect(SPOTLIGHT_STOPS[0]).toEqual([0, 1]);
    expect(SPOTLIGHT_STOPS.at(-1)).toEqual([1, 0]);
  });

  it("posisi naik dan opasitas tidak pernah naik", () => {
    for (let i = 1; i < SPOTLIGHT_STOPS.length; i++) {
      expect(SPOTLIGHT_STOPS[i][0]).toBeGreaterThan(SPOTLIGHT_STOPS[i - 1][0]);
      expect(SPOTLIGHT_STOPS[i][1]).toBeLessThanOrEqual(SPOTLIGHT_STOPS[i - 1][1]);
    }
  });
});
