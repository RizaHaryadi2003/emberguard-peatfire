import { describe, expect, it } from "vitest";
import { crestArrivalTime, sharedRipple } from "./waterRipple";
import { CROWN_END } from "./waterCrown";
import { BEAD_RADIUS, beadLanding, JET_START, playbackTime, SPLASH_END, splashAt } from "./waterSplash";

describe("kolom tengah (jet Worthington)", () => {
  it("baru muncul saat kawah runtuh, sesudah mahkota hampir tenggelam", () => {
    expect(JET_START).toBeGreaterThan(CROWN_END * 0.8);
    expect(splashAt(JET_START * 0.99).jets[0].height).toBe(0);
    expect(splashAt(JET_START * 0.99).bead).toBeNull();
  });

  it("ujung kolom menggembung lalu butir lepas tanpa lompatan", () => {
    let pinchAt = JET_START;
    while (!splashAt(pinchAt).bead) pinchAt += 1e-5;
    const before = splashAt(pinchAt - 1e-5);
    const after = splashAt(pinchAt);
    expect(Math.abs(before.jets[0].bulbZ - after.bead!.z)).toBeLessThan(3e-4);
    expect(after.bead!.stretch).toBeCloseTo(1, 1);
  });

  it("butir melambung lalu jatuh, mendarat tepat saat dasarnya menyentuh air", () => {
    const landing = beadLanding();
    const apex = Math.max(...Array.from({ length: 200 }, (_, i) => splashAt(JET_START + (i * (landing - JET_START)) / 200).bead?.z ?? 0));
    expect(apex).toBeGreaterThan(0.01);
    expect(apex).toBeLessThan(0.025);
    expect(splashAt(landing - 1e-6).bead!.z).toBeCloseTo(BEAD_RADIUS, 4);
    expect(splashAt(landing + 1e-6).bead).toBeNull();
  });

  it("percikan kedua lebih kecil dan semuanya reda sebelum riak tiba di lingkaran", () => {
    const peak = (k: number) => Math.max(...Array.from({ length: 400 }, (_, i) => splashAt(i / 1000).jets[k].height));
    expect(peak(1)).toBeGreaterThan(0);
    expect(peak(1)).toBeLessThan(peak(0) / 2);
    const arrive = crestArrivalTime(sharedRipple().field);
    expect(splashAt(arrive).jets.every((j) => j.height === 0)).toBe(true);
    expect(splashAt(arrive).bead).toBeNull();
  });

  it("SPLASH_END sudah sesudah kolom kedua surut", () => {
    for (let t = SPLASH_END; t < SPLASH_END + 0.05; t += 0.002) {
      const s = splashAt(t);
      expect(s.bead).toBeNull();
      expect(s.jets.every((j) => j.height === 0)).toBe(true);
    }
  });
});

describe("pemutaran gerak lambat", () => {
  it("dari 0 sampai akhir percikan, terus maju tanpa lompatan", () => {
    expect(playbackTime(0)).toBe(0);
    expect(playbackTime(1)).toBeCloseTo(SPLASH_END, 9);
    let prev = 0;
    for (let u = 0.001; u <= 1; u += 0.001) {
      const t = playbackTime(u);
      expect(t).toBeGreaterThan(prev);
      prev = t;
    }
  });

  it("separuh pertama untuk mahkota, diperlambat jauh lebih banyak", () => {
    expect(playbackTime(0.5)).toBeGreaterThan(CROWN_END);
    expect(playbackTime(0.5)).toBeLessThan(CROWN_END + 0.01);
    const slow = playbackTime(0.1) - playbackTime(0.09);
    const fast = playbackTime(0.9) - playbackTime(0.89);
    expect(fast / slow).toBeGreaterThan(5);
  });
});
