import { describe, expect, it } from "vitest";
import { guideLevel, guideTarget } from "./guide";
import { FOREST_ZONES, HUTAN_ACTS, HUTAN_GUIDE } from "@/config/modul/hutan-rawa";
import { BORE_SITES, FIRE_SITES, SEKITARMU_ACTS, SEKITARMU_GUIDE } from "@/config/modul/sekitarmu";
import { MUSIM_ACTS, MUSIM_GUIDE } from "@/config/modul/musim-api";

describe("naskah tuntunan tiap modul", () => {
  it("jumlah babak naskah sama dengan jumlah babak modul", () => {
    expect(HUTAN_GUIDE).toHaveLength(HUTAN_ACTS.length);
    expect(SEKITARMU_GUIDE).toHaveLength(SEKITARMU_ACTS.length);
    expect(MUSIM_GUIDE).toHaveLength(MUSIM_ACTS.length);
  });

  it("setiap babak berakhir dengan arahan ke tombol lanjut", () => {
    for (const script of [HUTAN_GUIDE, SEKITARMU_GUIDE, MUSIM_GUIDE])
      for (const steps of script) expect(steps[steps.length - 1].target).toBe("next");
  });

  it("Hutan Rawa: tugas tiap babak membawa arahan sampai tombol lanjut", () => {
    const done = { maxKm: 14, triedFlood: true, triedRain: true, opened: FOREST_ZONES.map((z) => z.id) };
    expect(guideLevel(HUTAN_GUIDE[0], done, 0)).toBe(HUTAN_GUIDE[0].length - 1);
    // Babak 02 punya dua arahan "Oke" (melihat air sungai, lalu hujan).
    expect(guideLevel(HUTAN_GUIDE[1], done, 4)).toBe(HUTAN_GUIDE[1].length - 1);
    expect(guideLevel(HUTAN_GUIDE[2], done, 0)).toBe(HUTAN_GUIDE[2].length - 1);
  });

  it("Hutan Rawa: arahan menunjuk jenis hutan yang belum dibuka", () => {
    const s = { maxKm: 0, triedFlood: false, triedRain: false, opened: ["campuran"] };
    expect(guideTarget(HUTAN_GUIDE[2][2], s)).toBe("zone-tiang");
  });

  it("Sekitarmu: tugas tiap babak membawa arahan sampai tombol lanjut", () => {
    const done = {
      zoom: 2,
      zoomMax: 2,
      selected: 2,
      revealed: true,
      revealDone: true,
      bores: BORE_SITES.map((b) => b.id),
      fires: FIRE_SITES.map((f) => f.id),
    };
    expect(guideLevel(SEKITARMU_GUIDE[0], done, 0)).toBe(SEKITARMU_GUIDE[0].length - 1);
    expect(guideLevel(SEKITARMU_GUIDE[1], done, 0)).toBe(SEKITARMU_GUIDE[1].length - 1);
    expect(guideLevel(SEKITARMU_GUIDE[2], done, 2)).toBe(SEKITARMU_GUIDE[2].length - 1);
    expect(guideLevel(SEKITARMU_GUIDE[3], done, 2)).toBe(SEKITARMU_GUIDE[3].length - 1);
  });
});
