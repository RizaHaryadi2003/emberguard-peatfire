import { describe, expect, it } from "vitest";
import { factorPoint, squarePath, squarePoint } from "./factorSquare";

describe("persegi roda faktor", () => {
  it("mulai di tengah sisi atas dan berjalan searah jarum jam", () => {
    expect(squarePoint(0)).toEqual({ x: 0, y: -1 });
    expect(squarePoint(1 / 8)).toEqual({ x: 1, y: -1 }); // sudut kanan atas
    expect(squarePoint(2 / 8)).toEqual({ x: 1, y: 0 }); // kanan
    expect(squarePoint(4 / 8)).toEqual({ x: 0, y: 1 }); // bawah
    expect(squarePoint(6 / 8)).toEqual({ x: -1, y: 0 }); // kiri
  });

  it("selalu di keliling dan bergerak dengan laju tetap", () => {
    const step = 1 / 800;
    for (let u = 0; u < 1; u += step) {
      const p = squarePoint(u);
      expect(Math.max(Math.abs(p.x), Math.abs(p.y))).toBeCloseTo(1, 10);
      const q = squarePoint(u + step);
      expect(Math.abs(q.x - p.x) + Math.abs(q.y - p.y)).toBeCloseTo(8 * step, 6);
    }
  });

  it("delapan faktor jatuh di tengah sisi dan di sudut", () => {
    const pts = Array.from({ length: 8 }, (_, i) => factorPoint(i, 8));
    expect(pts[2]).toEqual({ x: 1, y: 0 });
    expect(pts[3]).toEqual({ x: 1, y: 1 });
    expect(pts[7]).toEqual({ x: -1, y: -1 });
  });

  it("lintasan dimulai dan berakhir di tengah sisi atas", () => {
    const d = squarePath(1000);
    expect(d.startsWith("M500.00 0.00")).toBe(true);
    expect(d.endsWith("L500.00 0.00")).toBe(true);
    expect(d).toContain("L1000.00 0.00");
  });
});
