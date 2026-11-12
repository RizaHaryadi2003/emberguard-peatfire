import { describe, expect, it } from "vitest";
import { baraCardImagePath, baraShareLink, getBaraCard, parseSharedBurn, zoneOf } from "./baraCard";

describe("parseSharedBurn", () => {
  it("menerima kedalaman bulat di dalam rentang", () => {
    expect(parseSharedBurn("39", "1")).toEqual({ cm: 39, resurfaced: true });
    expect(parseSharedBurn("120", null)).toEqual({ cm: 120, resurfaced: false });
  });

  it("menolak nilai di luar rentang atau yang bukan bilangan bulat", () => {
    for (const bad of ["0", "121", "-5", "6.5", "abc", "", " 40", "1e2"]) expect(parseSharedBurn(bad, null)).toBeNull();
  });

  it("menolak parameter kosong atau ganda", () => {
    expect(parseSharedBurn(undefined, null)).toBeNull();
    expect(parseSharedBurn(["40", "60"], null)).toBeNull();
  });
});

describe("isi kartu", () => {
  it("mengikuti pembagian kedalaman Usup dkk.", () => {
    expect(zoneOf(20)).toBe("permukaan");
    expect(zoneOf(21)).toBe("dalam");
    expect(zoneOf(50)).toBe("dalam");
    expect(zoneOf(51)).toBe("lebih");
  });

  it("menyebut sumber pada setiap kemungkinan", () => {
    for (const cm of [10, 39, 70]) {
      const card = getBaraCard({ cm, resurfaced: false });
      expect(card.source).toContain("Usup");
      expect(card.depth).toBe(`${cm} cm`);
    }
  });
});

describe("alamat kartu", () => {
  it("memuat kedalaman, dan penanda muncul lagi hanya bila terjadi", () => {
    expect(baraCardImagePath({ cm: 39, resurfaced: true }, "story")).toBe("/modul/bara/kartu?format=story&dalam=39&muncul=1");
    expect(baraCardImagePath({ cm: 39, resurfaced: false }, "og")).toBe("/modul/bara/kartu?format=og&dalam=39");
    expect(baraCardImagePath(null, "og")).toBe("/modul/bara/kartu?format=og");
  });

  it("tautan bagikan dapat dibaca kembali", () => {
    const url = new URL(baraShareLink("https://contoh.id", { cm: 45, resurfaced: true }));
    expect(url.pathname).toBe("/modul/bara");
    expect(parseSharedBurn(url.searchParams.get("dalam"), url.searchParams.get("muncul"))).toEqual({ cm: 45, resurfaced: true });
  });
});
