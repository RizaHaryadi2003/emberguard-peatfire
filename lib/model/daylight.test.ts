import { describe, expect, it } from "vitest";
import {
  birdChorus,
  cityActivity,
  dayPart,
  daylight,
  formatHour,
  goldenness,
  lightsOn,
  nightness,
  parseHour,
  sunElevation,
} from "./daylight";

describe("matahari di khatulistiwa", () => {
  it("terbit sekitar 05.50, puncak tengah hari, terbenam sekitar 17.55", () => {
    expect(Math.abs(sunElevation(5.85))).toBeLessThan(0.01);
    expect(sunElevation(11.9)).toBeGreaterThan(0.99);
    expect(Math.abs(sunElevation(17.95))).toBeLessThan(0.01);
    expect(sunElevation(0)).toBeLessThan(-0.9);
  });

  it("siang terang, tengah malam gelap, dan senja di antaranya", () => {
    expect(daylight(12)).toBe(1);
    expect(daylight(0)).toBe(0);
    expect(daylight(18.1)).toBeGreaterThan(0);
    expect(daylight(18.1)).toBeLessThan(1);
    expect(nightness(0)).toBe(1);
    expect(nightness(12)).toBe(0);
  });

  it("cahaya keemasan hanya pagi dan sore", () => {
    expect(goldenness(6.3)).toBeGreaterThan(0.5);
    expect(goldenness(17.4)).toBeGreaterThan(0.5);
    expect(goldenness(12)).toBe(0);
    expect(goldenness(1)).toBe(0);
  });
});

describe("kehidupan kota", () => {
  it("jam berangkat lebih ramai daripada dini hari", () => {
    expect(cityActivity(7)).toBeGreaterThan(cityActivity(3));
    expect(cityActivity(24)).toBeCloseTo(cityActivity(0));
  });

  it("burung ramai saat fajar dan diam tengah malam", () => {
    expect(birdChorus(6)).toBe(1);
    expect(birdChorus(23)).toBe(0);
  });

  it("lampu menyala malam hari dan padam siang hari", () => {
    expect(lightsOn(20)).toBeGreaterThan(0.8);
    expect(lightsOn(12)).toBe(0);
  });
});

describe("penulisan jam", () => {
  it("format dan baca bolak-balik", () => {
    expect(formatHour(8)).toBe("08.00");
    expect(formatHour(17.75)).toBe("17.45");
    expect(formatHour(24)).toBe("00.00");
    expect(parseHour("09.00")).toBe(9);
    expect(parseHour("17.30")).toBe(17.5);
  });

  it("sebutan bagian hari", () => {
    expect(dayPart(2)).toBe("dini");
    expect(dayPart(8)).toBe("pagi");
    expect(dayPart(13)).toBe("siang");
    expect(dayPart(17)).toBe("sore");
    expect(dayPart(21)).toBe("malam");
  });
});
