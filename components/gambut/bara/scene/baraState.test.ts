import { describe, expect, it } from "vitest";
import {
  createBaraState,
  isTurnedAway,
  nearestFacing,
  FACING_TILT_TOLERANCE,
  FACING_YAW_TOLERANCE,
} from "./baraState";

const TAU = Math.PI * 2;

/** Keadaan uji dengan putaran & jungkitan tertentu. */
function at(rotation: number, tilt = 0) {
  return { ...createBaraState(1.2), rotation, tilt };
}

describe("nearestFacing", () => {
  it("menghadapkan penampang lewat jalan terpendek", () => {
    // Seperempat putaran lebih: pulang dengan memutar balik, bukan maju.
    expect(nearestFacing(TAU * 0.25)).toBeCloseTo(0);
    expect(nearestFacing(-TAU * 0.25)).toBeCloseTo(0);
    // Tiga perempat putaran: justru lebih dekat meneruskan ke putaran penuh.
    expect(nearestFacing(TAU * 0.75)).toBeCloseTo(TAU);
    expect(nearestFacing(-TAU * 0.75)).toBeCloseTo(-TAU);
  });

  it("tidak memutar mundur putaran yang sudah ditempuh", () => {
    // Tiga putaran penuh lebih sedikit: cukup membereskan sisanya.
    expect(nearestFacing(TAU * 3 + 0.2)).toBeCloseTo(TAU * 3);
  });

  it("sudah menghadap pada tiap kelipatan putaran penuh", () => {
    for (const turns of [-2, -1, 0, 1, 2]) {
      expect(nearestFacing(TAU * turns)).toBeCloseTo(TAU * turns);
      expect(isTurnedAway(at(TAU * turns))).toBe(false);
    }
  });
});

describe("isTurnedAway", () => {
  it("diam di hadapan penampang tidak memanggil tombol", () => {
    expect(isTurnedAway(createBaraState(1.2))).toBe(false);
  });

  it("memaafkan goyangan kecil, menandai putaran yang jauh", () => {
    expect(isTurnedAway(at(FACING_YAW_TOLERANCE - 0.01))).toBe(false);
    expect(isTurnedAway(at(FACING_YAW_TOLERANCE + 0.01))).toBe(true);
    expect(isTurnedAway(at(-FACING_YAW_TOLERANCE - 0.01))).toBe(true);
  });

  it("menandai punggung bongkahan", () => {
    expect(isTurnedAway(at(Math.PI))).toBe(true);
    expect(isTurnedAway(at(TAU * 2 + Math.PI))).toBe(true);
  });

  it("membiarkan tunduk sedikit, karena babak 03 memintanya", () => {
    expect(isTurnedAway(at(0, FACING_TILT_TOLERANCE - 0.01))).toBe(false);
    expect(isTurnedAway(at(0, FACING_TILT_TOLERANCE + 0.01))).toBe(true);
    expect(isTurnedAway(at(0, -FACING_TILT_TOLERANCE - 0.01))).toBe(true);
  });
});
