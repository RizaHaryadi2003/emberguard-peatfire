import { describe, expect, it } from "vitest";
import { factorAngle, ringPath, ringRadius } from "./factorRing";

describe("lingkaran roda faktor", () => {
  it("melewati tepat setiap titik faktor", () => {
    for (let i = 0; i < 8; i++) expect(ringRadius(factorAngle(i, 8), 8, 0.03)).toBeCloseTo(1, 10);
  });

  it("masuk paling dalam di tengah dua faktor, sebesar takaran segi", () => {
    const mid = (factorAngle(0, 8) + factorAngle(1, 8)) / 2;
    expect(ringRadius(mid, 8, 0.03)).toBeCloseTo(0.97, 10);
  });

  it("faktor pertama di atas dan berurutan searah jarum jam", () => {
    expect(factorAngle(0, 8)).toBeCloseTo(-Math.PI / 2);
    expect(factorAngle(2, 8)).toBeCloseTo(0); // kanan layar
  });

  it("lintasan dimulai dan berakhir di faktor pertama", () => {
    const d = ringPath(8, 1000);
    expect(d.startsWith("M500.00 0.00")).toBe(true);
    expect(d.endsWith("L500.00 0.00")).toBe(true);
  });
});
