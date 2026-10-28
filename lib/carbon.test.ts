import { describe, expect, it } from "vitest";
import {
  ageAtDepth,
  AREA_MAX_HA,
  AREA_MIN_HA,
  BURN_DEPTH_MAX_M,
  CARBON_KG_PER_M3,
  CarbonSim,
  carbonStockT,
  co2FromCarbonT,
  co2ReleasedT,
  DEEPEST_AGE_YEARS,
  depthAtAge,
  formatArea,
  formatPeople,
  formatThickness,
  formatTonnes,
  formatYearCount,
  GROWTH_M_PER_YEAR,
  HEADLINE_CO2_T,
  HEADLINE_FIRE,
  judgeMatch,
  matchSolved,
  NARROW_AREA_HA,
  peopleYearsEquivalent,
  recoveryYears,
  RECOVERY_MAX_YEARS,
} from "./carbon";
import { PEAT_GROWTH_MM_PER_YEAR, PEAT_THICKNESS } from "./peat";

/** Majukan simulasi sejumlah tahun dalam langkah kecil, seperti tiap bingkai. */
function jalan(sim: CarbonSim, tahun: number, langkah = 3) {
  for (let t = 0; t < tahun; t += langkah) sim.advance(Math.min(langkah, tahun - t));
  sim.collect();
}

describe("simpanan karbon", () => {
  it("satu meter kubik gambut menyimpan 55 kg karbon", () => {
    expect(CARBON_KG_PER_M3).toBeCloseTo(55, 6);
  });

  it("satu hektare setebal satu meter menyimpan 550 ton karbon", () => {
    expect(carbonStockT(1, 1)).toBeCloseTo(550, 6);
  });

  it("karbonnya lurus terhadap luas maupun kedalaman", () => {
    // Inilah inti babak 03: luas dan kedalaman masuk dengan bobot yang sama,
    // sehingga sepersepuluh luas yang sepuluh kali lebih dalam sama besarnya.
    expect(carbonStockT(10, 0.1)).toBeCloseTo(carbonStockT(1, 1), 6);
    expect(carbonStockT(2, 0.5)).toBeCloseTo(carbonStockT(1, 1), 6);
  });

  it("tidak menghasilkan karbon negatif dari masukan negatif", () => {
    expect(carbonStockT(-5, 1)).toBe(0);
    expect(carbonStockT(1, -5)).toBe(0);
  });

  it("CO2 lebih berat daripada karbon asalnya, dengan nisbah 44/12", () => {
    expect(co2FromCarbonT(12)).toBeCloseTo(44, 6);
    expect(co2ReleasedT(1, 1)).toBeCloseTo(550 * (44 / 12), 6);
  });

  it("pembanding orang memakai emisi setahun, bukan seumur hidup", () => {
    expect(peopleYearsEquivalent(23)).toBeCloseTo(10, 6);
  });
});

describe("kalender gambut", () => {
  it("satu milimeter setahun, jadi satu meter seribu tahun", () => {
    expect(PEAT_GROWTH_MM_PER_YEAR).toBe(1);
    expect(GROWTH_M_PER_YEAR).toBeCloseTo(0.001, 9);
    expect(ageAtDepth(1)).toBeCloseTo(1000, 6);
  });

  it("permukaan berumur nol", () => {
    expect(ageAtDepth(0)).toBe(0);
  });

  it("umur dan kedalaman saling membalikkan", () => {
    for (const d of [0, 0.5, 1.2, 2.8]) {
      expect(depthAtAge(ageAtDepth(d))).toBeCloseTo(d, 9);
    }
  });

  it("menjepit di tanah mineral: yang bukan timbunan tidak punya umur timbunan", () => {
    expect(ageAtDepth(PEAT_THICKNESS + 2)).toBeCloseTo(DEEPEST_AGE_YEARS, 6);
    expect(ageAtDepth(-1)).toBe(0);
    expect(depthAtAge(1e9)).toBeCloseTo(PEAT_THICKNESS, 9);
  });

  it("gambut terdalam berumur hampir tiga ribu tahun", () => {
    expect(DEEPEST_AGE_YEARS).toBeCloseTo(2800, 6);
  });

  it("menimbun kembali memakan waktu yang sama dengan menimbunnya dahulu", () => {
    for (const d of [0.1, 0.48, 1]) {
      expect(recoveryYears(d)).toBeCloseTo(ageAtDepth(d), 6);
    }
  });
});

describe("soal babak 03", () => {
  it("angka beritanya hanya luas, kedalamannya dangkal", () => {
    expect(HEADLINE_FIRE.areaHa).toBe(120);
    expect(HEADLINE_FIRE.depthM).toBeLessThan(0.1);
    expect(HEADLINE_CO2_T).toBeCloseTo(co2ReleasedT(120, 0.08), 6);
  });

  it("menyalin angka beritanya sendiri tidak diterima sebagai jawaban", () => {
    // Luasnya sama besar, karbonnya sama persis — dan justru karena itu
    // pembaca tidak belajar apa pun. Harus ditolak sebagai "terlalu luas".
    expect(judgeMatch(HEADLINE_FIRE.areaHa, HEADLINE_FIRE.depthM)).toBe("tooWide");
  });

  it("ada jawaban benar di dalam rentang pengatur yang disediakan", () => {
    // Syarat yang gampang rusak diam-diam: kalau BURN_DEPTH_MAX_M diturunkan
    // atau NARROW_AREA_HA dipersempit, babak 03 dapat menjadi mustahil tanpa
    // satu pun berkas lain berubah.
    const dangkalDiLuasTerbesar =
      (HEADLINE_FIRE.areaHa * HEADLINE_FIRE.depthM) / NARROW_AREA_HA;
    expect(dangkalDiLuasTerbesar).toBeLessThanOrEqual(BURN_DEPTH_MAX_M);
    expect(judgeMatch(NARROW_AREA_HA, dangkalDiLuasTerbesar)).toBe("matched");
  });

  it("membedakan kurang, lebih, dan terlalu luas", () => {
    const pas = (HEADLINE_FIRE.areaHa * HEADLINE_FIRE.depthM) / 20;
    expect(judgeMatch(20, pas)).toBe("matched");
    expect(judgeMatch(20, pas * 0.5)).toBe("tooLittle");
    expect(judgeMatch(20, pas * 1.5)).toBe("tooMuch");
    expect(judgeMatch(NARROW_AREA_HA + 1, pas)).toBe("tooWide");
  });

  it("belum dinilai selama belum ada yang terbakar", () => {
    expect(judgeMatch(20, 0)).toBe("idle");
    expect(matchSolved(judgeMatch(20, 0))).toBe(false);
  });

  it("hanya satu putusan yang dianggap selesai", () => {
    expect(matchSolved("matched")).toBe(true);
    for (const v of ["idle", "tooLittle", "tooMuch", "tooWide"] as const) {
      expect(matchSolved(v)).toBe(false);
    }
  });
});

describe("CarbonSim", () => {
  it("petak yang belum terbakar tidak melepas apa pun", () => {
    const sim = new CarbonSim();
    expect(sim.stats.co2T).toBe(0);
    expect(sim.stats.lostYears).toBe(0);
  });

  it("menjepit kedalaman bakar pada batas yang masuk akal", () => {
    const sim = new CarbonSim();
    sim.setBurnDepth(99);
    expect(sim.burnDepthM()).toBe(BURN_DEPTH_MAX_M);
    sim.setBurnDepth(-3);
    expect(sim.burnDepthM()).toBe(0);
  });

  it("menjepit luas pada rentang pengaturnya", () => {
    const sim = new CarbonSim();
    sim.setArea(1e6);
    sim.collect();
    expect(sim.stats.areaHa).toBe(AREA_MAX_HA);
    sim.setArea(0);
    sim.collect();
    expect(sim.stats.areaHa).toBe(AREA_MIN_HA);
  });

  it("terbakar 50 cm di satu hektare melepas sekitar seribu ton CO2", () => {
    const sim = new CarbonSim();
    sim.setBurnDepth(0.5);
    sim.setArea(1);
    sim.collect();
    expect(sim.stats.co2T).toBeGreaterThan(950);
    expect(sim.stats.co2T).toBeLessThan(1050);
    expect(sim.stats.lostYears).toBeCloseTo(500, 6);
  });

  it("menimbun kembali satu milimeter setahun, bukan lebih", () => {
    const sim = new CarbonSim();
    sim.setBurnDepth(0.5);
    jalan(sim, 100);
    expect(sim.stats.regrownM).toBeCloseTo(0.1, 6);
    expect(sim.stats.remainingM).toBeCloseTo(0.4, 6);
  });

  it("hasilnya sama berapa pun besar langkah pemanggilnya", () => {
    // Pembaca tidak boleh mendapat angka yang berbeda karena perambannya
    // lebih lancar. Pola uji yang sama dengan DrainageSim — dan ujilah yang
    // menolak rancangan pertama berkas ini, yang memajukan waktu dalam
    // langkah tetap setahun dan karena itu kehilangan satu tahun pada
    // pemanggil yang langkahnya kecil. Lihat catatan di atas kelas CarbonSim.
    const lancar = new CarbonSim();
    const tersendat = new CarbonSim();
    lancar.setBurnDepth(0.8);
    tersendat.setBurnDepth(0.8);
    jalan(lancar, 300, 0.4);
    jalan(tersendat, 300, 17);
    expect(lancar.stats.regrownM).toBeCloseTo(tersendat.stats.regrownM, 9);
  });

  it("tidak pernah menimbun melebihi takik yang ditinggalkan apinya", () => {
    const sim = new CarbonSim();
    sim.setBurnDepth(0.1);
    jalan(sim, RECOVERY_MAX_YEARS);
    expect(sim.stats.regrownM).toBeCloseTo(0.1, 6);
    expect(sim.stats.remainingM).toBe(0);
    expect(sim.stats.yearsLeft).toBe(0);
  });

  it("lima abad tidak cukup menutup takik satu meter", () => {
    // Inilah kesimpulan babak 04, dan ia harus benar secara angka, bukan
    // hanya ditulis pada kalimat pengantar babaknya.
    const sim = new CarbonSim();
    sim.setBurnDepth(BURN_DEPTH_MAX_M);
    jalan(sim, RECOVERY_MAX_YEARS * 2);
    expect(sim.stats.atTimeLimit).toBe(true);
    expect(sim.stats.years).toBe(RECOVERY_MAX_YEARS);
    expect(sim.stats.remainingM).toBeCloseTo(0.5, 6);
  });

  it("mengubah kedalaman bakar memulai pemulihannya dari nol", () => {
    const sim = new CarbonSim();
    sim.setBurnDepth(0.3);
    jalan(sim, 200);
    expect(sim.stats.regrownM).toBeGreaterThan(0);
    sim.setBurnDepth(0.6);
    sim.collect();
    expect(sim.stats.years).toBe(0);
    expect(sim.stats.regrownM).toBe(0);
  });

  it("menyetel kedalaman yang sama tidak membatalkan pemulihan yang berjalan", () => {
    // Pengatur rentang mengirim nilai yang sama berkali-kali saat diseret
    // melewati satu langkah dan kembali; tanpa penjagaan ini, waktu pemulihan
    // akan terhapus oleh geseran yang tidak mengubah apa pun.
    const sim = new CarbonSim();
    sim.setBurnDepth(0.4);
    jalan(sim, 150);
    const sebelum = sim.stats.years;
    sim.setBurnDepth(0.4);
    sim.collect();
    expect(sim.stats.years).toBe(sebelum);
  });

  it("mulai dari awal mengembalikan seluruh keadaan", () => {
    const sim = new CarbonSim();
    sim.setBurnDepth(0.7);
    sim.setArea(90);
    jalan(sim, 120);
    sim.reset();
    expect(sim.stats.burnDepthM).toBe(0);
    expect(sim.stats.years).toBe(0);
    expect(sim.stats.co2T).toBe(0);
  });
});

describe("format angka", () => {
  it("memakai pemisah ribuan Indonesia", () => {
    expect(formatYearCount(1200)).toBe("1.200 tahun");
    expect(formatTonnes(19360)).toBe("19.360 t");
    expect(formatPeople(438.2)).toBe("438 orang");
  });

  it("luas memakai koma desimal, dan bilangan bulat tanpa koma", () => {
    expect(formatArea(19.2)).toBe("19,2 ha");
    expect(formatArea(120)).toBe("120 ha");
  });

  it("ketebalan dalam sentimeter bulat", () => {
    expect(formatThickness(0.48)).toBe("48 cm");
    expect(formatThickness(0)).toBe("0 cm");
  });
});
