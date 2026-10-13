import { describe, expect, it } from "vitest";
import {
  formatMeters,
  formatWaterDepth,
  formatYears,
  getDeepestLayer,
  getGrowthStatus,
  getDryThickness,
  getFireDanger,
  getLayerAtDepth,
  getPeatThickness,
  getSurfaceDryness,
  getWaterStatus,
  isPeatland,
  PEAT_LAYERS,
  PEAT_MAX_YEARS,
  PEAT_MIN_YEARS,
  PEAT_THICKNESS,
  PROFILE_DEPTH,
} from "./peat";

describe("PEAT_LAYERS", () => {
  it("bersambung tanpa celah dari permukaan hingga dasar", () => {
    expect(PEAT_LAYERS[0].top).toBe(0);
    for (let i = 1; i < PEAT_LAYERS.length; i++) {
      expect(PEAT_LAYERS[i].top).toBe(PEAT_LAYERS[i - 1].bottom);
    }
    expect(PROFILE_DEPTH).toBe(3.4);
  });

  it("setiap lapisan memiliki rincian lengkap untuk kartu detail", () => {
    for (const l of PEAT_LAYERS) {
      expect(l.details.fiber).not.toBe("");
      expect(l.details.color).not.toBe("");
      expect(l.details.maturity).not.toBe("");
      expect(l.details.note).not.toBe("");
    }
  });

  it("hanya tanah mineral yang tidak mudah terbakar", () => {
    expect(PEAT_LAYERS.filter((l) => !l.combustible).map((l) => l.id)).toEqual(["mineral"]);
  });
});

describe("getWaterStatus", () => {
  it.each([
    [0, "basah"],
    [29, "basah"],
    [30, "waspada"],
    [40, "waspada"],
    [41, "rawan"],
    [100, "rawan"],
  ] as const)("%i cm → %s", (cm, status) => {
    expect(getWaterStatus(cm)).toBe(status);
  });
});

describe("getFireDanger", () => {
  it("nol sampai batas 40 cm", () => {
    expect(getFireDanger(0)).toBe(0);
    expect(getFireDanger(40)).toBe(0);
  });

  it("naik linear hingga 1 di 100 cm dan tidak melebihi 1", () => {
    expect(getFireDanger(70)).toBeCloseTo(0.5);
    expect(getFireDanger(100)).toBe(1);
    expect(getFireDanger(150)).toBe(1);
  });
});

describe("getSurfaceDryness", () => {
  it("dibatasi pada rentang 0–1", () => {
    expect(getSurfaceDryness(0)).toBe(0);
    expect(getSurfaceDryness(45)).toBeCloseTo(0.5);
    expect(getSurfaceDryness(100)).toBe(1);
  });
});

describe("getLayerAtDepth", () => {
  it("memetakan kedalaman ke lapisan yang benar", () => {
    expect(getLayerAtDepth(0)?.id).toBe("fibrik");
    expect(getLayerAtDepth(0.6)?.id).toBe("hemik");
    expect(getLayerAtDepth(2)?.id).toBe("saprik");
    expect(getLayerAtDepth(3)?.id).toBe("mineral");
  });

  it("undefined di luar profil", () => {
    expect(getLayerAtDepth(-0.1)).toBeUndefined();
    expect(getLayerAtDepth(3.4)).toBeUndefined();
  });
});

describe("formatMeters", () => {
  it("memakai koma desimal", () => {
    expect(formatMeters(0.6)).toBe("0,6");
    expect(formatMeters(3.4)).toBe("3,4");
    expect(formatMeters(2)).toBe("2");
  });
});

describe("formatWaterDepth", () => {
  it("tanpa tanda minus di permukaan", () => {
    expect(formatWaterDepth(0)).toBe("0 cm");
    expect(formatWaterDepth(0.4)).toBe("0 cm");
  });

  it("bertanda minus di bawah permukaan", () => {
    expect(formatWaterDepth(35)).toBe("−35 cm");
  });
});

describe("getDryThickness", () => {
  const [fibrik, hemik] = PEAT_LAYERS;

  it("nol bila air di permukaan", () => {
    expect(getDryThickness(fibrik, 0)).toBe(0);
  });

  it("sebagian lapisan kering bila air di tengah lapisan", () => {
    expect(getDryThickness(fibrik, 0.4)).toBeCloseTo(0.4);
    expect(getDryThickness(hemik, 0.4)).toBe(0);
  });

  it("seluruh lapisan kering bila air di bawahnya", () => {
    expect(getDryThickness(fibrik, 1)).toBeCloseTo(0.6);
    expect(getDryThickness(hemik, 1)).toBeCloseTo(0.4);
  });
});

describe("penumpukan gambut", () => {
  it("menumpuk 1 mm tiap tahun", () => {
    expect(getPeatThickness(1000)).toBeCloseTo(1);
    expect(getPeatThickness(500)).toBeCloseTo(0.5);
  });

  it("mulai dari tanah kosong dan berhenti di batas tanah mineral", () => {
    expect(getPeatThickness(0)).toBe(0);
    expect(getPeatThickness(-50)).toBe(0);
    expect(getPeatThickness(PEAT_MAX_YEARS)).toBeCloseTo(PEAT_THICKNESS);
    // Lebih lama dari itu tidak menambah tebal: profilnya memang sedalam itu.
    expect(getPeatThickness(PEAT_MAX_YEARS * 2)).toBeCloseTo(PEAT_THICKNESS);
  });

  it("umur penuh sama dengan tebal profil dibagi lajunya", () => {
    expect(PEAT_MAX_YEARS).toBe(2800);
    expect(PEAT_THICKNESS).toBeCloseTo(2.8);
  });

  it("baru disebut gambut setelah melewati 50 cm", () => {
    expect(isPeatland(getPeatThickness(PEAT_MIN_YEARS - 1))).toBe(false);
    expect(isPeatland(getPeatThickness(PEAT_MIN_YEARS))).toBe(true);
    expect(PEAT_MIN_YEARS).toBe(500);
  });

  it("kematangan menyusul tebalnya, bukan muncul sekaligus", () => {
    // Timbunan tipis seluruhnya masih mentah.
    expect(getDeepestLayer(0.3)?.id).toBe("fibrik");
    // Setelah melewati batas bawah fibrik, dasarnya menjadi hemik.
    expect(getDeepestLayer(1.0)?.id).toBe("hemik");
    // Saprik baru ada setelah timbunan melewati batas bawah hemik.
    expect(getDeepestLayer(1.5)?.id).toBe("hemik");
    expect(getDeepestLayer(2.0)?.id).toBe("saprik");
    expect(getDeepestLayer(PEAT_THICKNESS)?.id).toBe("saprik");
  });

  it("tanah kosong belum punya lapisan apa pun", () => {
    expect(getDeepestLayer(0)).toBeUndefined();
  });

  it("menulis umur dengan pemisah ribuan Indonesia", () => {
    expect(formatYears(2800)).toBe("2.800");
    expect(formatYears(500)).toBe("500");
  });
});

describe("getGrowthStatus", () => {
  it("membedakan tanah kosong, belum cukup tebal, dan sudah gambut", () => {
    expect(getGrowthStatus(0)).toBe("kosong");
    expect(getGrowthStatus(0.2)).toBe("belum");
    expect(getGrowthStatus(0.49)).toBe("belum");
    expect(getGrowthStatus(0.5)).toBe("gambut");
    expect(getGrowthStatus(PEAT_THICKNESS)).toBe("gambut");
  });
});
