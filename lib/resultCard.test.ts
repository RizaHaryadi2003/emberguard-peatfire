import { describe, expect, it } from "vitest";
import { cardImagePath, getResultCard, parseCardFormat, parseSharedWaterCm, shareLink } from "./resultCard";

describe("parseSharedWaterCm", () => {
  it("menerima bilangan bulat di dalam rentang pengatur", () => {
    expect(parseSharedWaterCm("0")).toBe(0);
    expect(parseSharedWaterCm("62")).toBe(62);
    expect(parseSharedWaterCm("100")).toBe(100);
  });

  it("menolak nilai di luar rentang atau yang bukan bilangan bulat", () => {
    for (const bad of ["101", "999", "-5", "6.5", "abc", "", " 40", "1e2"]) {
      expect(parseSharedWaterCm(bad)).toBeNull();
    }
  });

  it("menolak parameter yang kosong atau ganda", () => {
    expect(parseSharedWaterCm(undefined)).toBeNull();
    expect(parseSharedWaterCm(null)).toBeNull();
    expect(parseSharedWaterCm(["40", "60"])).toBeNull();
  });
});

describe("parseCardFormat", () => {
  it("memakai pratinjau tautan kecuali Story diminta", () => {
    expect(parseCardFormat("story")).toBe("story");
    expect(parseCardFormat("og")).toBe("og");
    expect(parseCardFormat(null)).toBe("og");
    expect(parseCardFormat("poster")).toBe("og");
  });
});

describe("getResultCard", () => {
  it("mengikuti ambang status muka air", () => {
    expect(getResultCard(29).status).toBe("basah");
    expect(getResultCard(30).status).toBe("waspada");
    expect(getResultCard(40).status).toBe("waspada");
    expect(getResultCard(41).status).toBe("rawan");
  });

  it("hanya mengutip angka Andriesse saat muka air melewati batas", () => {
    expect(getResultCard(62).note).toContain("400 tahun");
    expect(getResultCard(62).source).toContain("Andriesse");
    expect(getResultCard(35).note).not.toContain("400 tahun");
    expect(getResultCard(10).note).not.toContain("400 tahun");
  });

  it("membulatkan nilai dan menuliskan kedalamannya", () => {
    expect(getResultCard(61.6)).toMatchObject({ cm: 62, depth: "−62 cm" });
    expect(getResultCard(0).depth).toBe("0 cm");
  });
});

describe("alamat kartu", () => {
  it("menyertakan muka air hanya bila ada nilainya", () => {
    expect(cardImagePath(62, "story")).toBe("/modul/anatomi/kartu?format=story&muka=62");
    expect(cardImagePath(null, "og")).toBe("/modul/anatomi/kartu?format=og");
    expect(cardImagePath(0, "og")).toBe("/modul/anatomi/kartu?format=og&muka=0");
  });

  it("menyusun tautan yang dibagikan", () => {
    expect(shareLink("https://contoh.id", 62)).toBe("https://contoh.id/modul/anatomi?muka=62");
  });
});
