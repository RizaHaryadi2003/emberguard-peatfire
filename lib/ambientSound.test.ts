import { describe, expect, it } from "vitest";
import { birdChance, crackleRate } from "./ambientSound";

describe("crackleRate", () => {
  it("sunyi saat aman, makin rapat saat bahaya naik", () => {
    expect(crackleRate(0)).toBe(0);
    expect(crackleRate(0.5)).toBeGreaterThan(crackleRate(0.1));
    expect(crackleRate(1)).toBe(28);
  });
});

describe("birdChance", () => {
  it("burung berkicau saat aman dan diam saat asap tebal", () => {
    expect(birdChance(0)).toBeCloseTo(0.45);
    expect(birdChance(0.2)).toBeGreaterThan(0);
    expect(birdChance(0.35)).toBe(0);
    expect(birdChance(1)).toBe(0);
  });
});
