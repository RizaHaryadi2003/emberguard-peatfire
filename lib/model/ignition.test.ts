import { describe, expect, it } from "vitest";
import {
  ALWAYS_IGNITES_MC,
  BURNS,
  CASE_DAYS,
  CASE_IGNITION,
  ESCAPED_DAYS,
  GRID_H,
  GRID_W,
  IGNITION_DENSITY,
  IGNITION_SHARE,
  NEVER_IGNITES_MC,
  ONE_DAY_SHARE,
  WETNESS_MC,
  burnTally,
  burnedByLand,
  detectionsUntil,
  dropSpark,
  ignites,
  kmFromVillage,
  landAt,
  minWindToIgnite,
  spreadFire,
} from "./ignition";

describe("ambang sulut satu bara (Lin dkk., 2024)", () => {
  it("di bawah 35 % selalu menyala walau tanpa angin", () => {
    expect(ignites(ALWAYS_IGNITES_MC - 1, 0)).toBe(true);
  });

  it("di atas 85 % tidak pernah menyala walau angin 1 m/s atau lebih", () => {
    expect(ignites(NEVER_IGNITES_MC + 1, 1)).toBe(false);
    expect(ignites(NEVER_IGNITES_MC + 1, 5)).toBe(false);
  });

  it("angin minimum ±0,1 m/s di 40 % dan ±0,9 m/s di 80 %", () => {
    expect(minWindToIgnite(40)).toBeCloseTo(0.1, 5);
    expect(minWindToIgnite(80)).toBeCloseTo(0.9, 5);
  });

  it("angin minimum naik terus dari 35 % sampai 85 %", () => {
    let prev = -1;
    for (let mc = ALWAYS_IGNITES_MC; mc <= NEVER_IGNITES_MC; mc += 5) {
      const w = minWindToIgnite(mc)!;
      expect(w).toBeGreaterThan(prev);
      prev = w;
    }
  });

  it("tiga keadaan pembaca jatuh di tiga wilayah yang berbeda", () => {
    expect(WETNESS_MC.kering).toBeLessThan(ALWAYS_IGNITES_MC);
    expect(WETNESS_MC.lembap).toBeGreaterThan(ALWAYS_IGNITES_MC);
    expect(WETNESS_MC.lembap).toBeLessThan(NEVER_IGNITES_MC);
    expect(WETNESS_MC.basah).toBeGreaterThan(NEVER_IGNITES_MC);
  });

  it("tabel hasil babak 01: basah padam, lembap perlu angin, kering selalu menyala", () => {
    expect(dropSpark("basah", "tenang")).toBe("padam");
    expect(dropSpark("basah", "berangin")).toBe("padam");
    expect(dropSpark("lembap", "tenang")).toBe("padam");
    expect(dropSpark("lembap", "berangin")).toBe("menyala");
    expect(dropSpark("kering", "tenang")).toBe("menyala");
    expect(dropSpark("kering", "berangin")).toBe("menyala");
  });
});

describe("angka Cattau dkk. (2016)", () => {
  it("lahan terbuka adalah tempat lahir api terbanyak", () => {
    expect(IGNITION_SHARE.terbuka).toBeGreaterThan(IGNITION_SHARE.kebun + IGNITION_SHARE.hutan);
  });

  it("lahan terbuka ±10× lebih sering tersulut per km² daripada hutan", () => {
    expect(Math.round(IGNITION_DENSITY.terbuka / IGNITION_DENSITY.hutan)).toBe(10);
  });
});

describe("lanskap ilustratif", () => {
  it("memuat kelima jenis lahan", () => {
    const seen = new Set<string>();
    for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) seen.add(landAt(x, y));
    expect([...seen].sort()).toEqual(["hutan", "kampung", "kebun", "sungai", "terbuka"]);
  });

  it("titik sulut kasus berada di lahan terbuka, ±8 km dari kampung", () => {
    expect(landAt(CASE_IGNITION.x, CASE_IGNITION.y)).toBe("terbuka");
    expect(Math.round(kmFromVillage(CASE_IGNITION.x, CASE_IGNITION.y))).toBe(8);
  });
});

describe("jalannya kebakaran babak 02", () => {
  const fire = spreadFire();

  it("selalu sama setiap kali dijalankan (benih tetap)", () => {
    expect(spreadFire()).toEqual(fire);
  });

  it("satu-satunya sel di hari 0 adalah titik sulut", () => {
    const first = detectionsUntil(fire, 0);
    expect(first).toEqual([{ ...CASE_IGNITION, day: 0 }]);
  });

  it("api menjalar ke hutan, tetapi tidak membakar kampung atau sungai", () => {
    const byLand = burnedByLand(fire);
    expect(byLand.hutan).toBeGreaterThan(0);
    expect(byLand.kampung).toBe(0);
    expect(byLand.sungai).toBe(0);
  });

  it("api cukup besar untuk diselidiki mundur (puluhan sel) dan tidak melewati lama kasus", () => {
    expect(fire.length).toBeGreaterThan(30);
    expect(Math.max(...fire.map((d) => d.day))).toBeLessThanOrEqual(CASE_DAYS);
  });

  it("memutar waktu mundur hanya mengurangi sel, tidak pernah menambah", () => {
    for (let d = 1; d <= CASE_DAYS; d++) {
      expect(detectionsUntil(fire, d).length).toBeGreaterThanOrEqual(detectionsUntil(fire, d - 1).length);
    }
  });
});

describe("sepuluh api pembersih lahan babak 03", () => {
  it("8 dari 10 padam dalam sehari, mengikuti 80 %", () => {
    const t = burnTally(BURNS.length);
    expect((t.out1Day / t.lit) * 100).toBe(ONE_DAY_SHARE);
  });

  it("tepat satu yang lolos, dan ia menyala ±7 hari", () => {
    const escaped = BURNS.filter((b) => b.escaped);
    expect(escaped).toHaveLength(1);
    expect(escaped[0].days).toBe(Math.round(ESCAPED_DAYS));
  });

  it("api yang lolos bukan yang pertama, supaya pembaca melihat api padam lebih dulu", () => {
    expect(BURNS.findIndex((b) => b.escaped)).toBeGreaterThanOrEqual(3);
  });

  it("ringkasan dibatasi jumlah api yang ada", () => {
    expect(burnTally(99).lit).toBe(BURNS.length);
    expect(burnTally(-1).lit).toBe(0);
  });
});
