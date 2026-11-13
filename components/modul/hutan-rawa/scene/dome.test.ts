import { describe, expect, it } from "vitest";
import { FOREST_ZONES } from "@/config/modul/hutan-rawa";
import { APE_COUNT, apeSpots, FLOOD_KM, FLOOD_LEVEL_M, kmOfX, LENGTH, peatThicknessM, plantTrees, TREE_COUNT, xOfKm } from "./dome";

describe("kubah gambut Modul Hutan Rawa", () => {
  it("gambut menebal dari tepi ke puncak sesuai Husson dkk. (2018)", () => {
    expect(peatThicknessM(5.5)).toBeCloseTo(6, 5);
    expect(peatThicknessM(10)).toBeCloseTo(10, 5);
    expect(peatThicknessM(14)).toBeCloseTo(13, 5);
    for (let k = 0; k < 14; k += 0.25) expect(peatThicknessM(k + 0.25)).toBeGreaterThanOrEqual(peatThicknessM(k));
  });

  it("letak mendatar dan jarak saling kebalikan, kubah berpusat di x = 0", () => {
    expect(xOfKm(0)).toBe(-LENGTH / 2);
    expect(xOfKm(14)).toBe(LENGTH / 2);
    expect(kmOfX(xOfKm(7.3))).toBeCloseTo(7.3, 6);
  });

  it("banjir berhenti di lereng hutan campuran, sebelum hutan tiang", () => {
    expect(peatThicknessM(FLOOD_KM)).toBeGreaterThanOrEqual(FLOOD_LEVEL_M);
    expect(FLOOD_KM).toBeGreaterThan(0);
    expect(FLOOD_KM).toBeLessThan(FOREST_ZONES[1].fromKm);
  });

  it("pohon ditanam di zonanya sendiri dengan tinggi dalam rentang sumber", () => {
    for (const q of ["high", "low"] as const) {
      const trees = plantTrees(q);
      for (const z of FOREST_ZONES) {
        const mine = trees.filter((t) => t.zone === z.id);
        expect(mine).toHaveLength(TREE_COUNT[q][z.id]);
        for (const t of mine) {
          expect(t.km).toBeGreaterThanOrEqual(z.fromKm);
          expect(t.km).toBeLessThan(z.toKm);
          expect(t.heightM).toBeGreaterThanOrEqual(z.treeMinM);
          expect(t.heightM).toBeLessThanOrEqual(z.treeMaxM);
        }
      }
    }
  });

  it("satwa terbanyak di hutan tinggi, sesuai tingkat relatif", () => {
    const apes = apeSpots(plantTrees("high"));
    for (const z of FOREST_ZONES) expect(apes.filter((a) => a.zone === z.id)).toHaveLength(APE_COUNT[z.apes]);
    expect(apes.filter((a) => a.zone === "tinggi").length).toBeGreaterThan(apes.filter((a) => a.zone === "tiang").length);
  });
});
