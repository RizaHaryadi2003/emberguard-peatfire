import { describe, expect, it } from "vitest";
import { guideLevel, guideTarget } from "./guide";
import { FOREST_ZONES, HUTAN_ACTS, HUTAN_GUIDE } from "@/config/modul/hutan-rawa";
import { BORE_SITES, FIRE_SITES, SEKITARMU_ACTS, SEKITARMU_GUIDE } from "@/config/modul/sekitarmu";
import { MUSIM_ACTS, MUSIM_GUIDE } from "@/config/modul/musim-api";
import { KANAL_ACTS, KANAL_GUIDE } from "@/config/modul/kanal";
import { ANATOMI_GUIDE, ANATOMI_STEPS } from "@/config/modul/anatomi";
import { BARA_ACTS, BARA_GUIDE } from "@/config/modul/bara";
import { KARBON_ACTS, KARBON_GUIDE } from "@/config/modul/karbon";

describe("naskah tuntunan tiap modul", () => {
  it("jumlah babak naskah sama dengan jumlah babak modul", () => {
    expect(HUTAN_GUIDE).toHaveLength(HUTAN_ACTS.length);
    expect(SEKITARMU_GUIDE).toHaveLength(SEKITARMU_ACTS.length);
    expect(MUSIM_GUIDE).toHaveLength(MUSIM_ACTS.length);
    expect(KANAL_GUIDE).toHaveLength(KANAL_ACTS.length);
    expect(ANATOMI_GUIDE).toHaveLength(ANATOMI_STEPS.length);
    expect(BARA_GUIDE).toHaveLength(BARA_ACTS.length);
    expect(KARBON_GUIDE).toHaveLength(KARBON_ACTS.length);
  });

  it("setiap babak berakhir dengan arahan ke tombol lanjut", () => {
    for (const script of [HUTAN_GUIDE, SEKITARMU_GUIDE, MUSIM_GUIDE, KANAL_GUIDE, ANATOMI_GUIDE, BARA_GUIDE, KARBON_GUIDE])
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

  it("Kanal, Bara, Karbon: tugas yang tuntas membawa arahan sampai langkah penjelasan pertama atau tombol lanjut", () => {
    const all = [true, true, true, true];
    // Tanpa "Oke": arahan maju melewati semua langkah bersyarat yang sudah
    // terpenuhi, lalu berhenti di langkah penjelasan pertama (tanpa syarat)
    // atau di tombol lanjut.
    const firstWait = <S,>(steps: readonly { done?: (s: S) => boolean }[]) => {
      const i = steps.findIndex((st, k) => k < steps.length - 1 && !st.done);
      return i === -1 ? steps.length - 1 : i;
    };
    const kanal = { depthCm: 100, guessed: true, timeOn: true, blocked: true, done: all };
    KANAL_GUIDE.forEach((steps) => expect(guideLevel(steps, kanal, 0)).toBe(firstWait(steps)));
    const bara = { sourcePicked: true, ignited: true, timeOn: true, doused: true, thermalSeen: true, rewet: true, done: all };
    BARA_GUIDE.forEach((steps) => expect(guideLevel(steps, bara, 0)).toBe(firstWait(steps)));
    const karbon = { burnCm: 50, timeOn: true, done: all };
    KARBON_GUIDE.forEach((steps) => expect(guideLevel(steps, karbon, 0)).toBe(firstWait(steps)));
  });
});
