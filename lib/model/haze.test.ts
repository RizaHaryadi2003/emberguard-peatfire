import { describe, expect, it } from "vitest";
import {
  PM25_PER_HAIR,
  REAL_DAYS,
  breath,
  gapShare,
  hazeLevel,
  inhaled,
  ispuCategory,
  ispuFromPm25,
  passThrough,
  pm25FromIspu,
} from "./haze";

describe("ukuran partikel (US EPA)", () => {
  it("28 butir PM2.5 berjajar selebar sehelai rambut 70 µm", () => {
    expect(PM25_PER_HAIR).toBe(28);
  });
});

describe("konversi ISPU (Permen LHK P.14/2020)", () => {
  it("mengikuti titik konversi Lampiran I", () => {
    expect(ispuFromPm25(15.5)).toBeCloseTo(50);
    expect(ispuFromPm25(55.4)).toBeCloseTo(100);
    expect(ispuFromPm25(150.4)).toBeCloseTo(200);
    expect(ispuFromPm25(250.4)).toBeCloseTo(300);
  });

  it("cocok dengan contoh perhitungan di Lampiran I (31,4 µg/m³ → 70)", () => {
    expect(Math.round(ispuFromPm25(31.4))).toBe(70);
  });

  it("konversi bolak-balik kembali ke nilai semula", () => {
    for (const v of [10, 40, 120, 220, 300, 400]) expect(ispuFromPm25(pm25FromIspu(v))).toBeCloseTo(v);
  });

  it("kategori mengikuti Lampiran II", () => {
    expect(ispuCategory(50)).toBe("baik");
    expect(ispuCategory(88)).toBe("sedang");
    expect(ispuCategory(150)).toBe("tidakSehat");
    expect(ispuCategory(250)).toBe("sangatTidakSehat");
    expect(ispuCategory(312)).toBe("berbahaya");
  });

  it("dua hari sungguhan: 8 Agustus Sedang, 27 Agustus Berbahaya", () => {
    expect(REAL_DAYS.map((d) => ispuCategory(d.ispu))).toEqual(["sedang", "berbahaya"]);
  });

  it("kabut di jendela makin pekat searah ISPU", () => {
    expect(hazeLevel(0)).toBe(0);
    expect(hazeLevel(100)).toBeLessThan(hazeLevel(300));
    expect(hazeLevel(400)).toBe(1);
  });
});

describe("masker (Kodros dkk., 2021)", () => {
  it("N95 yang rapat hanya meloloskan sekitar 6 %", () => {
    expect(passThrough("n95")).toBeCloseTo(1 / 16.2);
    expect(inhaled(breath("n95"))).toBe(6);
  });

  it("masker kain meloloskan sebagian besar asap", () => {
    expect(inhaled(breath("kain"))).toBe(71);
  });

  it("asap yang lolos dari masker medis hampir semuanya lewat celah tepi", () => {
    expect(gapShare("medis")).toBeGreaterThan(0.9);
    expect(gapShare("kain")).toBeLessThan(0.1);
  });

  it("tanpa masker semua terhirup; urutan nasib selalu sama", () => {
    expect(inhaled(breath("tanpa"))).toBe(100);
    expect(breath("medis")).toEqual(breath("medis"));
  });
});
