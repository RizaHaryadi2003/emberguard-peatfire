import { describe, expect, it } from "vitest";
import {
  columnAtDistance,
  COLUMNS,
  CANAL_DEPTH_MAX_M,
  averageCompactionBoost,
  compactionBoost,
  COMPACTION_YEARS,
  distanceOfColumn,
  DrainageSim,
  emissionPerYear,
  formatDrop,
  formatYears,
  influenceLength,
  naturalSurfaceM,
  NATURAL_WATER_DEPTH_M,
  PROFILE_DEPTH_M,
  subsidenceRatePerYear,
  TRANSECT_LENGTH_M,
  SIM_MAX_YEARS,
  waterDepthAt,
  WATER_LIMIT_M,
  CALIBRATED_WATER_DEPTH_MAX_M,
} from "./drainage";

/** Majukan simulasi sejumlah tahun dalam langkah kecil, seperti tiap bingkai. */
function jalan(sim: DrainageSim, tahun: number, langkah = 0.05) {
  for (let t = 0; t < tahun; t += langkah) sim.advance(Math.min(langkah, tahun - t));
  sim.collect();
}

describe("geometri penampang", () => {
  it("kolom dan jarak saling bersesuaian", () => {
    for (const col of [0, 1, 57, COLUMNS - 1]) {
      expect(columnAtDistance(distanceOfColumn(col))).toBe(col);
    }
  });

  it("menjepit jarak di luar penampang, bukan mengembalikan kolom di luar larik", () => {
    expect(columnAtDistance(-100)).toBe(0);
    expect(columnAtDistance(TRANSECT_LENGTH_M * 2)).toBe(COLUMNS - 1);
  });

  it("kubah gambut meninggi ke arah dalam, bukan datar", () => {
    expect(naturalSurfaceM(0)).toBeCloseTo(0, 6);
    expect(naturalSurfaceM(TRANSECT_LENGTH_M)).toBeGreaterThan(naturalSurfaceM(100));
    // Kemiringannya kecil: puluhan sentimeter dalam satu kilometer, bukan meteran.
    expect(naturalSurfaceM(TRANSECT_LENGTH_M)).toBeLessThan(1);
  });
});

describe("kurva penurunan muka air", () => {
  it("tanpa kanal, muka air tetap di keadaan alami sepanjang penampang", () => {
    for (const m of [0, 50, 250, TRANSECT_LENGTH_M]) {
      expect(waterDepthAt(m, 0)).toBeCloseTo(NATURAL_WATER_DEPTH_M, 10);
    }
  });

  it("paling dalam di tepi kanal, lalu pulih menuju keadaan alami", () => {
    const depths = [0, 25, 50, 100, 200, 400, 700, 1000].map((m) => waterDepthAt(m, 2));
    for (let i = 1; i < depths.length; i++) {
      expect(depths[i]).toBeLessThan(depths[i - 1]);
    }
    expect(depths[0]).toBeCloseTo(2, 6);
    // Di ujung terjauh sudah mendekati alami, tetapi belum sama — justru itu
    // pelajarannya: satu kilometer dari kanal pun masih terpengaruh.
    expect(depths[depths.length - 1]).toBeGreaterThan(NATURAL_WATER_DEPTH_M);
    expect(depths[depths.length - 1]).toBeLessThan(WATER_LIMIT_M);
  });

  it("kanal yang lebih dalam menjangkau lebih jauh, bukan hanya lebih dalam", () => {
    expect(influenceLength(2)).toBeGreaterThan(influenceLength(1));
    const jauh = 300;
    expect(waterDepthAt(jauh, 3)).toBeGreaterThan(waterDepthAt(jauh, 1.5));
  });

  it("tepi daerah rawan jatuh di dalam penampang, bukan di luarnya", () => {
    // Inti babak 02 ada pada tepi itu: kerusakan tidak berhenti di tepi kanal,
    // tetapi juga tidak tak berujung. Kalau tepinya di luar gambar, pembaca
    // hanya melihat satu bidang rawan tanpa batas dan tidak belajar apa pun.
    const tepi = (canalDepthM: number) => {
      let terjauh = 0;
      for (let m = 0; m <= TRANSECT_LENGTH_M; m += 5) {
        if (waterDepthAt(m, canalDepthM) > WATER_LIMIT_M) terjauh = m;
      }
      return terjauh;
    };
    expect(tepi(1)).toBeGreaterThan(150);
    expect(tepi(1)).toBeLessThan(300);
    expect(tepi(2)).toBeGreaterThan(600);
    expect(tepi(2)).toBeLessThan(TRANSECT_LENGTH_M);
    // Kanal terdalam memang melewati ujung penampang, dan itu jawabannya.
    expect(tepi(CANAL_DEPTH_MAX_M)).toBe(TRANSECT_LENGTH_M);
  });

  it("muka air tidak lebih dalam daripada sisa gambut di bawah permukaan", () => {
    // Drainase dianggap dijaga, jadi lesak tidak mendangkalkan muka air;
    // yang membatasinya hanya gambut yang sudah habis.
    expect(waterDepthAt(0, 2)).toBeCloseTo(2, 6);
    expect(waterDepthAt(0, 2, 0.5)).toBeCloseTo(0.5, 6);
    expect(waterDepthAt(0, 2, 0)).toBe(0);
    expect(waterDepthAt(0, 2, -1)).toBe(0);
  });

  it("tidak pernah melaporkan muka air lebih dalam daripada profilnya", () => {
    expect(waterDepthAt(0, CANAL_DEPTH_MAX_M)).toBeLessThanOrEqual(PROFILE_DEPTH_M);
  });
});

describe("laju penurunan dan emisi", () => {
  it("nol selama gambut masih jenuh sampai permukaan", () => {
    expect(subsidenceRatePerYear(NATURAL_WATER_DEPTH_M)).toBe(0);
    expect(subsidenceRatePerYear(0)).toBe(0);
    expect(emissionPerYear(NATURAL_WATER_DEPTH_M)).toBe(0);
  });

  it("bertambah lurus dengan kedalaman muka air di dalam rentang data Hooijer", () => {
    const a = subsidenceRatePerYear(0.4);
    const b = subsidenceRatePerYear(0.7);
    expect(b).toBeCloseTo(a * 2, 6);
    expect(emissionPerYear(0.7)).toBeCloseTo(emissionPerYear(0.4) * 2, 6);
  });

  it("tidak dinaikkan lagi di luar rentang data, lebih dalam dari 1 m", () => {
    expect(subsidenceRatePerYear(CALIBRATED_WATER_DEPTH_MAX_M + 0.8)).toBeCloseTo(
      subsidenceRatePerYear(CALIBRATED_WATER_DEPTH_MAX_M),
      9,
    );
  });

  it("mengikuti Hooijer dkk. (2012): 7,06 cm dan 98 t CO2 per meter muka air", () => {
    const wd = 0.6;
    const kering = wd - NATURAL_WATER_DEPTH_M;
    expect(subsidenceRatePerYear(wd) * 100).toBeCloseTo(7.06 * kering, 6);
    expect(emissionPerYear(wd)).toBeCloseTo(98 * kering, 6);
  });

  it("oksidasi menyumbang ± 75% lesak lima tahun pertama", () => {
    expect(5 / (averageCompactionBoost(0, 5) * 5)).toBeCloseTo(0.75, 6);
    expect(COMPACTION_YEARS).toBe(1);
  });

  it("pemampatan mempercepat tahun-tahun pertama, lalu berhenti", () => {
    expect(compactionBoost(0)).toBeGreaterThan(1);
    expect(compactionBoost(COMPACTION_YEARS)).toBe(1);
    expect(compactionBoost(50)).toBe(1);
    // Turun mulus, bukan melompat.
    expect(compactionBoost(0)).toBeGreaterThan(compactionBoost(COMPACTION_YEARS / 2));
  });

  it("rata-rata pengali pemampatan tidak bergantung pada besar langkah", () => {
    // Dihitung dengan integral, jadi satu langkah besar harus sama dengan
    // banyak langkah kecil yang menutupi selang yang sama.
    const sekali = averageCompactionBoost(0, 4);
    let bertahap = 0;
    const n = 400;
    for (let i = 0; i < n; i++) bertahap += averageCompactionBoost((i * 4) / n, ((i + 1) * 4) / n) / n;
    expect(sekali).toBeCloseTo(bertahap, 10);
    // Di luar masa pemampatan nilainya tepat satu.
    expect(averageCompactionBoost(COMPACTION_YEARS, COMPACTION_YEARS + 5)).toBe(1);
  });
});

describe("penampang yang dipotong kanal", () => {
  it("keadaan alami tidak melesak walau waktu berjalan lama", () => {
    const sim = new DrainageSim();
    jalan(sim, 50);
    expect(sim.stats.maxSubsidenceM).toBe(0);
    expect(sim.stats.emittedTPerHa).toBe(0);
    expect(sim.stats.riskShare).toBe(0);
  });

  it("melesak paling dalam di tepi kanal, makin jauh makin sedikit", () => {
    const sim = new DrainageSim();
    sim.setCanalDepth(2);
    jalan(sim, 20);
    // Titik dekat kanal yang muka airnya lebih dalam dari 1 m melesak sama
    // cepat (batas rentang data Hooijer), jadi pembandingnya diambil di luar.
    const dekat = sim.subsidenceAtDistance(10);
    const sedang = sim.subsidenceAtDistance(400);
    const jauh = sim.subsidenceAtDistance(700);
    expect(dekat).toBeGreaterThan(sedang);
    expect(sedang).toBeGreaterThan(jauh);
    expect(jauh).toBeGreaterThan(0);
  });

  it("penurunan permukaan hanya pernah bertambah, tidak pernah berkurang", () => {
    // Inti modul ini. Uji ini yang harus gagal bila suatu saat ada yang
    // membuat penurunannya dapat dipulihkan.
    const sim = new DrainageSim();
    sim.setCanalDepth(2.5);
    const jejak: number[] = [];
    for (let i = 0; i < 20; i++) {
      jalan(sim, 1);
      jejak.push(sim.stats.maxSubsidenceM);
    }
    sim.blockCanal();
    for (let i = 0; i < 20; i++) {
      jalan(sim, 1);
      jejak.push(sim.stats.maxSubsidenceM);
    }
    for (let i = 1; i < jejak.length; i++) {
      expect(jejak[i]).toBeGreaterThanOrEqual(jejak[i - 1]);
    }
  });

  it("sekat kanal memulangkan airnya, bukan tanahnya", () => {
    const sim = new DrainageSim();
    sim.setCanalDepth(2.5);
    jalan(sim, 15);
    const lesakSebelum = sim.stats.maxSubsidenceM;
    const karbonSebelum = sim.stats.emittedTPerHa;
    expect(lesakSebelum).toBeGreaterThan(0.1);
    expect(sim.stats.waterAtCanalM).toBeGreaterThan(WATER_LIMIT_M);

    sim.blockCanal();
    sim.collect();
    // Air kembali ke keadaan alami, dan daerah rawan hilang.
    expect(sim.stats.waterAtCanalM).toBeLessThanOrEqual(NATURAL_WATER_DEPTH_M);
    expect(sim.stats.riskShare).toBe(0);
    // Tanah yang hilang tetap hilang.
    expect(sim.stats.maxSubsidenceM).toBeCloseTo(lesakSebelum, 10);

    // Dan setelah disekat, tidak ada tambahan lesak maupun karbon.
    jalan(sim, 30);
    expect(sim.stats.maxSubsidenceM).toBeCloseTo(lesakSebelum, 10);
    expect(sim.stats.emittedTPerHa).toBeCloseTo(karbonSebelum, 10);
  });

  it("menggali ulang setelah disekat membuka kembali pengeringannya", () => {
    const sim = new DrainageSim();
    sim.setCanalDepth(2);
    jalan(sim, 10);
    sim.blockCanal();
    jalan(sim, 5);
    const diam = sim.stats.maxSubsidenceM;

    sim.setCanalDepth(2);
    jalan(sim, 5);
    expect(sim.stats.maxSubsidenceM).toBeGreaterThan(diam);
    expect(sim.stats.blocked).toBe(false);
  });

  it("kanal lebih dalam melebarkan daerah rawan, bukan hanya memperdalamnya", () => {
    const dangkal = new DrainageSim();
    dangkal.setCanalDepth(1);
    jalan(dangkal, 10);
    const dalam = new DrainageSim();
    dalam.setCanalDepth(3);
    jalan(dalam, 10);
    expect(dalam.stats.riskReachM).toBeGreaterThan(dangkal.stats.riskReachM);
    expect(dalam.stats.riskShare).toBeGreaterThan(dangkal.stats.riskShare);
  });

  it("lesak berlanjut tetap selama drainasenya dijaga", () => {
    // Hooijer dkk. (2012) mencatat lesak tetap ± 5 cm/tahun selama 18 tahun
    // pada muka air yang dijaga. Dasawarsa kedua dan ketiga karena itu sama,
    // dan daerah rawannya tidak menyusut sendiri.
    const sim = new DrainageSim();
    sim.setCanalDepth(1);
    jalan(sim, 10);
    const rawanAwal = sim.stats.riskShare;
    const a = sim.stats.maxSubsidenceM;
    jalan(sim, 10);
    const b = sim.stats.maxSubsidenceM;
    jalan(sim, 10);
    const c = sim.stats.maxSubsidenceM;
    expect(c - b).toBeCloseTo(b - a, 3);
    expect(sim.stats.riskShare).toBeCloseTo(rawanAwal, 6);
  });

  it("kanal tidak dapat menembus dasar profil gambut", () => {
    const sim = new DrainageSim();
    sim.setCanalDepth(3);
    jalan(sim, 30);
    expect(sim.stats.maxSubsidenceM).toBeLessThan(PROFILE_DEPTH_M);
    expect(sim.effectiveCanalDepth()).toBeLessThanOrEqual(PROFILE_DEPTH_M - sim.subsidenceAt(0) + 1e-9);
  });

  it("langkah besar dan banyak langkah kecil memberi hasil yang praktis sama", () => {
    // Dipanggil tiap bingkai dengan pecahan tahun yang berbeda-beda, jadi
    // hasilnya tidak boleh bergantung pada besar langkahnya.
    const halus = new DrainageSim();
    halus.setCanalDepth(2);
    jalan(halus, 20, 0.02);
    const kasar = new DrainageSim();
    kasar.setCanalDepth(2);
    jalan(kasar, 20, 0.5);
    expect(kasar.stats.maxSubsidenceM).toBeCloseTo(halus.stats.maxSubsidenceM, 6);
    expect(kasar.stats.emittedTPerHa).toBeCloseTo(halus.stats.emittedTPerHa, 4);
  });

  it("berhenti pada batas waktu yang masih dapat dipertanggungjawabkan", () => {
    // Di luar batas itu permukaan sudah turun sampai mendekati muka airnya
    // sendiri, sehingga bagian yang rawan terbakar justru menyusut menuju nol
    // — dan pembaca akan salah menyimpulkan keadaannya membaik.
    const sim = new DrainageSim();
    sim.setCanalDepth(3);
    jalan(sim, 200, 5);
    expect(sim.stats.years).toBeCloseTo(SIM_MAX_YEARS, 6);
    expect(sim.stats.atTimeLimit).toBe(true);
    // Dan di dalam batas itu, daerah rawan belum pernah mencapai nol.
    expect(sim.stats.riskShare).toBeGreaterThan(0);

    const lesak = sim.stats.maxSubsidenceM;
    jalan(sim, 100);
    expect(sim.stats.maxSubsidenceM).toBeCloseTo(lesak, 10);
  });

  it("reset memulangkan seluruh penampang ke keadaan alami", () => {
    const sim = new DrainageSim();
    sim.setCanalDepth(3);
    jalan(sim, 25);
    sim.reset();
    sim.collect();
    expect(sim.stats.maxSubsidenceM).toBe(0);
    expect(sim.stats.years).toBe(0);
    expect(sim.stats.emittedTPerHa).toBe(0);
    expect(sim.stats.canalDepthM).toBe(0);
    expect(sim.stats.blocked).toBe(false);
  });
});

describe("format angka", () => {
  it("menulis lama waktu kurang dari setahun dalam bulan", () => {
    expect(formatYears(0.5)).toBe("6 bulan");
    expect(formatYears(0)).toBe("1 bulan");
    expect(formatYears(1)).toBe("1 tahun");
    expect(formatYears(23.6)).toBe("24 tahun");
  });

  it("menulis penurunan permukaan dalam sentimeter", () => {
    expect(formatDrop(0.62)).toBe("62 cm");
    expect(formatDrop(0)).toBe("0 cm");
  });
});
