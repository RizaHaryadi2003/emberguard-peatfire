import { describe, expect, it } from "vitest";
import { attitude, orbitKeys, positionAt, sampleFlight, sweepKeys, typingTimes, type FlightLayout } from "./introFlight";

const L: FlightLayout = { vw: 1440, vh: 900, textW: 560, textH: 105, birdFront: 100, birdBack: 85 };

describe("typingTimes", () => {
  it("satu waktu per huruf, selalu naik, dengan jeda yang tidak seragam", () => {
    const t = typingTimes("Emberguard", 1, 0.1);
    expect(t).toHaveLength(10);
    expect(t[0]).toBe(1);
    const gaps = t.slice(1).map((v, i) => v - t[i]);
    gaps.forEach((g) => expect(g).toBeGreaterThan(0.05));
    expect(new Set(gaps.map((g) => g.toFixed(3))).size).toBeGreaterThan(3);
  });
});

describe("positionAt", () => {
  it("melewati setiap titik kunci tepat pada waktunya", () => {
    for (const keys of [orbitKeys(L), sweepKeys(L)]) {
      for (const k of keys) {
        const p = positionAt(keys, k.t);
        expect(p.x).toBeCloseTo(k.x, 6);
        expect(p.y).toBeCloseTo(k.y, 6);
        expect(p.s).toBeCloseTo(k.s, 6);
      }
    }
  });

  it("kecepatan bersambung di titik kunci (tidak tersentak)", () => {
    // Turunan satu sisi tepat di kiri dan kanan titik kunci harus sama (selisihnya
    // menyusut bersama h; sambungan yang patah tidak akan menyusut).
    const h = 1e-5;
    for (const keys of [orbitKeys(L), sweepKeys(L)]) {
      for (const k of keys.slice(1, -1)) {
        const p = positionAt(keys, k.t);
        const left = positionAt(keys, k.t - h);
        const right = positionAt(keys, k.t + h);
        const vl = { x: (p.x - left.x) / h, y: (p.y - left.y) / h };
        const vr = { x: (right.x - p.x) / h, y: (right.y - p.y) / h };
        const speed = Math.hypot(vl.x, vl.y) + 1;
        expect(Math.hypot(vr.x - vl.x, vr.y - vl.y) / speed).toBeLessThan(0.005);
      }
    }
    expect(sampleFlight(orbitKeys(L), 1).vx).toBeLessThan(0); // di depan teks terbang ke kiri
  });

  it("masuk dari luar layar kanan dan menyapu sampai luar layar kanan", () => {
    expect(orbitKeys(L)[0].x).toBeGreaterThan(L.vw / 2);
    // Paruh belum masuk layar di awal, ekor sudah lewat tepi kanan di akhir.
    const sweep = sweepKeys(L);
    expect(sweep[0].x + L.birdFront * sweep[0].s).toBeLessThan(-L.vw / 2);
    const end = sweep.at(-1)!;
    expect(end.x - L.birdBack * end.s).toBeGreaterThan(L.vw / 2);
  });
});

describe("attitude", () => {
  it("menghadap arah terbang dan miring naik saat menanjak", () => {
    expect(attitude(300, 0).facing).toBe(1);
    expect(attitude(-300, 0).facing).toBe(-1);
    // Ke kanan sambil naik (y layar mengecil): hidung naik = putaran negatif.
    expect(attitude(300, -200).bank).toBeLessThan(0);
    // Ke kiri sambil naik: hidung (di kiri) naik = putaran positif.
    expect(attitude(-300, -200).bank).toBeGreaterThan(0);
  });

  it("tidak pernah benar-benar pipih saat berbalik", () => {
    expect(Math.abs(attitude(0, 100).facing)).toBeGreaterThanOrEqual(0.2);
  });
});
