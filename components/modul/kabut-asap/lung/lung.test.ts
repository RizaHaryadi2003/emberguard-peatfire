import { describe, expect, it } from "vitest";
import { lobeOf, lungSdf, lungBounds } from "./lungShape";
import { buildAirway, pathFromTrachea, TRACHEA_R } from "./airwayTree";
import { surfaceNets } from "./surfaceNets";

describe("bentuk paru-paru", () => {
  it("paru kanan di kiri layar, paru kiri di kanan layar", () => {
    expect(lungSdf(-0.8, -0.5, 0, -1)).toBeLessThan(0);
    expect(lungSdf(0.8, -0.5, 0, 1)).toBeLessThan(0);
    expect(lungSdf(0.8, -0.5, 0, -1)).toBeGreaterThan(0);
  });

  it("ruang tengah (jantung, trakea) bukan paru-paru", () => {
    expect(lungSdf(0, -0.5, 0, -1)).toBeGreaterThan(0);
    expect(lungSdf(0, -0.5, 0, 1)).toBeGreaterThan(0);
  });

  it("paru kanan tiga lobus, paru kiri dua", () => {
    expect(lobeOf(0.5, -0.2, -1)).toBe("atas");
    expect(lobeOf(-0.5, 0.6, -1)).toBe("tengah");
    expect(lobeOf(-1.2, -0.5, -1)).toBe("bawah");
    expect(lobeOf(-0.5, 0.6, 1)).toBe("atas");
  });

  it("paru kiri bertakik jantung di depan-bawah", () => {
    expect(lungSdf(0.3, -0.8, 0.55, 1)).toBeGreaterThan(0);
    expect(lungSdf(-0.3, -0.8, 0.55, -1)).toBeLessThan(0.05);
  });
});

describe("pohon saluran napas", () => {
  const aw = buildAirway();

  it("selalu sama untuk benih yang sama", () => {
    expect(buildAirway().segments.length).toBe(aw.segments.length);
  });

  it("bercabang ribuan kali sampai belasan generasi", () => {
    expect(aw.segments.length).toBeGreaterThan(3000);
    expect(aw.terminals.length).toBeGreaterThan(1500);
    expect(Math.max(...aw.segments.map((s) => s.gen))).toBeGreaterThanOrEqual(
      12,
    );
  });

  it("bronkus utama kanan lebih tegak dan lebih lebar daripada kiri", () => {
    const [r, l] = aw.segments.filter((s) => s.gen === 1);
    const tilt = (s: typeof r) =>
      Math.abs(s.b[0] - s.a[0]) / Math.abs(s.b[1] - s.a[1]);
    expect(tilt(r)).toBeLessThan(tilt(l));
    expect(r.r).toBeGreaterThan(l.r);
  });

  it("jari-jari mengikuti hukum Murray di setiap percabangan", () => {
    const kids = new Map<number, number[]>();
    aw.segments.forEach(
      (s, i) =>
        s.parent >= 1 && kids.set(s.parent, [...(kids.get(s.parent) ?? []), i]),
    );
    for (const [p, list] of kids) {
      if (list.length !== 2) continue;
      const sum = list.reduce((acc, i) => acc + aw.segments[i].r ** 3, 0);
      expect(sum).toBeCloseTo(aw.segments[p].r ** 3, 6);
    }
  });

  it("cabang dalam paru-paru tidak keluar dari paru-paru", () => {
    for (const s of aw.segments) {
      if (s.gen < 3 || s.side === 0) continue;
      expect(lungSdf(s.b[0], s.b[1], s.b[2], s.side)).toBeLessThan(0);
    }
  });

  it("jalan dari trakea ke tiap ujung dimulai di trakea", () => {
    const path = pathFromTrachea(aw, aw.terminals[0]);
    expect(path[0]).toBe(0);
    expect(aw.segments[path[0]].r).toBe(TRACHEA_R);
  });
});

describe("surface nets", () => {
  it("permukaan bola jatuh di jari-jarinya dan menghadap ke luar", () => {
    const m = surfaceNets(
      (x, y, z) => Math.hypot(x, y, z) - 1,
      [-1.3, -1.3, -1.3],
      [1.3, 1.3, 1.3],
      0.1,
    );
    for (let i = 0; i < m.positions.length; i += 3) {
      expect(
        Math.hypot(m.positions[i], m.positions[i + 1], m.positions[i + 2]),
      ).toBeCloseTo(1, 1);
    }
    let outward = 0;
    const p = m.positions;
    for (let t = 0; t < m.indices.length; t += 3) {
      const [a, b, c] = [
        m.indices[t] * 3,
        m.indices[t + 1] * 3,
        m.indices[t + 2] * 3,
      ];
      const u = [p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]];
      const v = [p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]];
      const n = [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0],
      ];
      if (n[0] * p[a] + n[1] * p[a + 1] + n[2] * p[a + 2] > 0) outward++;
    }
    expect(outward / (m.indices.length / 3)).toBeGreaterThan(0.99);
  });

  it("paru-paru menjadi jaring tertutup yang cukup rapat", () => {
    const { min, max } = lungBounds(1);
    const m = surfaceNets((x, y, z) => lungSdf(x, y, z, 1), min, max, 0.04);
    expect(m.indices.length / 3).toBeGreaterThan(10000);
  });
});
