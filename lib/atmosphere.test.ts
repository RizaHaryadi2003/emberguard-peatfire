import { describe, expect, it } from "vitest";
import { CLEAR_ATMOSPHERE, getAtmosphere, HAZE_ATMOSPHERE, smoothstep01 } from "./atmosphere";

describe("smoothstep01", () => {
  it("dibatasi 0–1 dan simetris di tengah", () => {
    expect(smoothstep01(-1)).toBe(0);
    expect(smoothstep01(2)).toBe(1);
    expect(smoothstep01(0.5)).toBeCloseTo(0.5);
  });
});

describe("getAtmosphere", () => {
  it("bahaya 0 = langit cerah, bahaya 1 = kabut asap", () => {
    expect(getAtmosphere(0)).toEqual(CLEAR_ATMOSPHERE);
    expect(getAtmosphere(1)).toEqual(HAZE_ATMOSPHERE);
  });

  it("makin berbahaya, kabut makin tebal dan matahari makin redup", () => {
    const steps = [0, 0.25, 0.5, 0.75, 1].map(getAtmosphere);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].fogDensity).toBeGreaterThan(steps[i - 1].fogDensity);
      expect(steps[i].turbidity).toBeGreaterThan(steps[i - 1].turbidity);
      expect(steps[i].sunIntensity).toBeLessThan(steps[i - 1].sunIntensity);
      // Langit berasap diredam agar adegan tidak silau, dan kubah asap menebal.
      expect(steps[i].environmentIntensity).toBeLessThan(steps[i - 1].environmentIntensity);
      expect(steps[i].smokeCover).toBeGreaterThan(steps[i - 1].smokeCover);
    }
  });

  it("nilai di luar rentang tetap aman", () => {
    expect(getAtmosphere(-0.5)).toEqual(CLEAR_ATMOSPHERE);
    expect(getAtmosphere(3)).toEqual(HAZE_ATMOSPHERE);
  });
});
