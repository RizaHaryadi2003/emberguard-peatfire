import { describe, expect, it } from "vitest";
import { DrainageSim } from "./drainage";
import { fieldsFor, fieldsText, reachesBeyond } from "./reach";

/** Jangkauan rawan kanal sedalam `cm` pada tahun pertama, dari simulasinya sendiri. */
function reachFor(cm: number): number {
  const sim = new DrainageSim();
  sim.setCanalDepth(cm / 100);
  sim.collect();
  return sim.stats.riskReachM;
}

describe("jangkauan dan lapangan bola", () => {
  it("kanal 1 m membuat lahan rawan sampai ratusan meter", () => {
    const reach = reachFor(100);
    expect(reach).toBeGreaterThan(150);
    expect(reach).toBeLessThan(300);
    expect(reachFor(200)).toBeGreaterThan(reach);
  });

  it("menghitung luas dua sisi sepanjang 1 km dalam lapangan FIFA", () => {
    // 2 × 209 m × 1.000 m / 7.140 m² ≈ 58,5.
    expect(fieldsFor(209)).toBeCloseTo(58.54, 1);
    expect(fieldsText(209)).toBe("59");
  });

  it("menyatakan batas bawah bila jangkauannya melewati 1 km", () => {
    // Kanal terdalam: jangkauannya berhenti di titik tengah kolom terakhir.
    expect(reachesBeyond(reachFor(300))).toBe(true);
    expect(fieldsText(1000)).toBe("lebih dari 280");
  });
});
