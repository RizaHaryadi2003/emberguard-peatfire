import { describe, expect, it } from "vitest";
import { crestArrivalTime, sharedRipple } from "./waterRipple";
import { BEAD_RADIUS, beadLanding, JET_START, splashAt } from "./waterSplash";

describe("percikan tetesan (jet Worthington)", () => {
  it("belum ada kolom selama kawah masih terbentuk", () => {
    expect(splashAt(JET_START * 0.9).jets[0].height).toBe(0);
    expect(splashAt(0.01).bead).toBeNull();
  });

  it("kolom naik, ujungnya menggembung, lalu butir lepas tanpa lompatan", () => {
    const before = splashAt(0.0529);
    const after = splashAt(0.0531);
    expect(before.bead).toBeNull();
    expect(after.bead).not.toBeNull();
    // Pusat gembung sesaat sebelum lepas ≈ pusat butir sesaat sesudahnya.
    expect(Math.abs(before.jets[0].bulbZ - after.bead!.z)).toBeLessThan(3e-4);
    expect(after.bead!.stretch).toBeCloseTo(1, 1);
  });

  it("butir melambung lalu jatuh, mendarat tepat saat dasarnya menyentuh air", () => {
    const landing = beadLanding();
    const apex = Math.max(...Array.from({ length: 100 }, (_, i) => splashAt(0.06 + (i * (landing - 0.06)) / 100).bead?.z ?? 0));
    expect(apex).toBeGreaterThan(0.012);
    expect(apex).toBeLessThan(0.025);
    const justBefore = splashAt(landing - 1e-6).bead!;
    expect(justBefore.z).toBeCloseTo(BEAD_RADIUS, 4);
    expect(splashAt(landing + 1e-6).bead).toBeNull();
  });

  it("percikan kedua lebih kecil dan semuanya reda sebelum riak tiba di lingkaran", () => {
    const peak = (k: number) => Math.max(...Array.from({ length: 300 }, (_, i) => splashAt(i / 1000).jets[k].height));
    expect(peak(1)).toBeGreaterThan(0);
    expect(peak(1)).toBeLessThan(peak(0) / 2);
    const arrive = crestArrivalTime(sharedRipple().field);
    expect(splashAt(arrive).jets.every((j) => j.height === 0)).toBe(true);
    expect(splashAt(arrive).bead).toBeNull();
  });
});

describe("akhir percikan", () => {
  it("SPLASH_END sudah sesudah kolom kedua surut", async () => {
    const { SPLASH_END } = await import("./waterSplash");
    for (let t = SPLASH_END; t < SPLASH_END + 0.05; t += 0.002) {
      const s = splashAt(t);
      expect(s.bead).toBeNull();
      expect(s.jets.every((j) => j.height === 0)).toBe(true);
    }
  });
});
