import { describe, expect, it } from "vitest";
import {
  BURN_CM,
  DASARIAN_PER_YEAR,
  DAYS_PER_YEAR,
  DRAWDOWN_CM_PER_DAY,
  EL_NINO_FROM_DASARIAN,
  EL_NINO_TO_DASARIAN,
  ET_MM_DAY,
  HIGH_DANGER_CM,
  MAX_DEPTH_CM,
  MONTH_START_DAY,
  RAIN_NORMAL_MM_DAY,
  SPECIFIC_YIELD,
  dailyDepthChange,
  dasarianOfDay,
  dateOfDay,
  daysBelow,
  deepest,
  depthAfterDryDays,
  dryDaysToReach,
  fireLevel,
  fireStage,
  lastDayBelow,
  rainfall,
  simulateYear,
} from "./fireSeason";

const AUG = 7;
const SEP = 8;

describe("seri hujan Pontianak", () => {
  it("punya 36 dasarian dan rata-ratanya dekat 7,85 mm/hari (Yulianti & Hayasaka, 2013)", () => {
    expect(RAIN_NORMAL_MM_DAY).toHaveLength(DASARIAN_PER_YEAR);
    const mean = RAIN_NORMAL_MM_DAY.reduce((a, b) => a + b, 0) / DASARIAN_PER_YEAR;
    expect(Math.abs(mean - 7.85) / 7.85).toBeLessThan(0.02);
  });

  it("September rata-rata 10,1 mm/hari = normal 304 mm (BMKG Kalbar, 2026)", () => {
    const sep = (RAIN_NORMAL_MM_DAY[SEP * 3] + RAIN_NORMAL_MM_DAY[SEP * 3 + 1] + RAIN_NORMAL_MM_DAY[SEP * 3 + 2]) / 3;
    expect(sep * 30).toBeCloseTo(304, -1);
  });

  it("awal Agustus adalah dasarian terkering (±2 mm/hari)", () => {
    expect(Math.min(...RAIN_NORMAL_MM_DAY)).toBe(RAIN_NORMAL_MM_DAY[AUG * 3]);
    expect(RAIN_NORMAL_MM_DAY[AUG * 3]).toBe(2);
  });

  it("puncak Oktober–November lebih tinggi daripada Maret–Mei (Aldrian & Susanto, 2003)", () => {
    const avg = (from: number, n: number) => RAIN_NORMAL_MM_DAY.slice(from, from + n).reduce((a, b) => a + b, 0) / n;
    expect(avg(27, 6)).toBeGreaterThan(avg(6, 9));
  });

  it("El Niño hanya menekan hujan Agustus–Oktober", () => {
    for (let d = 0; d < DASARIAN_PER_YEAR; d++) {
      const inside = d >= EL_NINO_FROM_DASARIAN && d <= EL_NINO_TO_DASARIAN;
      if (inside) expect(rainfall("elnino", d)).toBeCloseTo((RAIN_NORMAL_MM_DAY[d] * 117) / 304);
      else expect(rainfall("elnino", d)).toBe(RAIN_NORMAL_MM_DAY[d]);
    }
  });
});

describe("kalender", () => {
  it("memetakan hari ke dasarian dan tanggal", () => {
    expect(dasarianOfDay(0)).toBe(0);
    expect(dasarianOfDay(9)).toBe(0);
    expect(dasarianOfDay(10)).toBe(1);
    expect(dasarianOfDay(30)).toBe(2); // 31 Januari
    expect(dasarianOfDay(31)).toBe(3); // 1 Februari
    expect(dasarianOfDay(DAYS_PER_YEAR - 1)).toBe(35);
    expect(dateOfDay(MONTH_START_DAY[AUG])).toEqual({ month: AUG, date: 1 });
    expect(dateOfDay(364)).toEqual({ month: 11, date: 31 });
  });
});

describe("neraca air", () => {
  it("hasil jenis diturunkan dari penguapan dan laju turun", () => {
    expect(SPECIFIC_YIELD).toBeCloseTo(ET_MM_DAY / 12.7, 6);
    expect(SPECIFIC_YIELD).toBeGreaterThan(0.3);
    expect(SPECIFIC_YIELD).toBeLessThan(0.36);
  });

  it("dasarian kering menurunkan muka air 1,27 cm/hari (Putra dkk., 2021)", () => {
    expect(dailyDepthChange(2)).toBe(DRAWDOWN_CM_PER_DAY);
    expect(dailyDepthChange(4.9)).toBe(DRAWDOWN_CM_PER_DAY);
  });

  it("dasarian basah menaikkan muka air, makin deras makin cepat", () => {
    expect(dailyDepthChange(6)).toBeLessThan(0);
    expect(dailyDepthChange(12)).toBeLessThan(dailyDepthChange(6));
  });

  it("muka air tidak naik di atas permukaan dan tidak turun melewati batas model", () => {
    for (const kind of ["normal", "elnino"] as const) {
      const s = simulateYear(kind);
      expect(Math.min(...s)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...s)).toBeLessThanOrEqual(MAX_DEPTH_CM);
    }
  });
});

describe("tahun biasa", () => {
  const normal = simulateYear("normal");

  it("turun dua kali setahun: Februari–Maret dan Agustus", () => {
    const early = deepest(normal, MONTH_START_DAY[1], MONTH_START_DAY[4] - 1);
    const aug = deepest(normal, MONTH_START_DAY[AUG], MONTH_START_DAY[SEP] - 1);
    expect(early.depth).toBeGreaterThan(15);
    expect(aug.depth).toBeGreaterThan(15);
    // Di antara keduanya, musim hujan April–Juli mengembalikan air ke permukaan.
    expect(normal[MONTH_START_DAY[5]]).toBe(0);
  });

  it("tidak pernah melewati ambang bahaya 40 cm", () => {
    expect(daysBelow(normal, HIGH_DANGER_CM)).toBe(0);
    expect(fireLevel(deepest(normal).depth)).toBe(0);
  });
});

describe("tahun El Niño", () => {
  const normal = simulateYear("normal");
  const elnino = simulateYear("elnino");

  it("Januari–Juli sama persis dengan tahun biasa", () => {
    for (let d = 0; d < MONTH_START_DAY[AUG]; d++) expect(elnino[d]).toBe(normal[d]);
  });

  it("melewati 60 cm dan bertahan berminggu-minggu", () => {
    expect(deepest(elnino).depth).toBeGreaterThanOrEqual(BURN_CM);
    expect(daysBelow(elnino, BURN_CM)).toBeGreaterThan(30);
  });

  it("baru pulih setelah hujan November kembali", () => {
    const last = dateOfDay(lastDayBelow(elnino, BURN_CM));
    expect(last.month).toBe(10);
    expect(elnino[DAYS_PER_YEAR - 1]).toBeLessThan(HIGH_DANGER_CM);
  });
});

describe("kemarau diperpanjang", () => {
  it("turun lurus 1,27 cm per hari tanpa hujan", () => {
    expect(depthAfterDryDays(20, 0)).toBe(20);
    expect(depthAfterDryDays(20, 10)).toBeCloseTo(32.7);
    expect(depthAfterDryDays(20, 1000)).toBe(MAX_DEPTH_CM);
  });

  it("menghitung hari sampai ambang", () => {
    expect(dryDaysToReach(20, 40)).toBe(16);
    expect(dryDaysToReach(20, 60)).toBe(32);
    expect(dryDaysToReach(70, 60)).toBe(0);
  });
});

describe("api", () => {
  it("golongan mengikuti ambang Kubu Raya (Taufik dkk., 2022)", () => {
    expect(fireStage(39.9)).toBe("aman");
    expect(fireStage(40)).toBe("bahaya");
    expect(fireStage(59.9)).toBe("bahaya");
    expect(fireStage(60)).toBe("terbakar");
  });

  it("nol di atas 40 cm, pelan sampai 60 cm, lalu melonjak", () => {
    expect(fireLevel(30)).toBe(0);
    expect(fireLevel(50)).toBeCloseTo(0.05);
    expect(fireLevel(60)).toBeCloseTo(0.1);
    // Lonjakan: 20 cm sesudah 60 jauh lebih besar daripada 20 cm sebelumnya.
    expect(fireLevel(80) - fireLevel(60)).toBeGreaterThan(5 * (fireLevel(60) - fireLevel(40)));
    expect(fireLevel(MAX_DEPTH_CM)).toBeLessThanOrEqual(1);
  });

  it("puncak api ±10× tingkat di ambang terbakar (Taufik dkk., 2017)", () => {
    expect(fireLevel(MAX_DEPTH_CM) / fireLevel(BURN_CM)).toBeGreaterThan(9);
    expect(fireLevel(MAX_DEPTH_CM) / fireLevel(BURN_CM)).toBeLessThanOrEqual(10);
  });
});
