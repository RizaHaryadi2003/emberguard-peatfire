import { describe, expect, it } from "vitest";
import { FLOOR_FROM, MUSIM_GUIDE, guideLevel, type GuideState } from "@/config/modul/musim-api";
import { DAYS_PER_YEAR } from "@/lib/model/fireSeason";

const start: GuideState = { maxDay: 0, maxDryDays: 0, maxDepthCm: 25, kind: "normal", elninoMaxDay: -1, inspected: false };

describe("tuntunan langkah demi langkah", () => {
  it("tiap babak mulai dari arahan pertama", () => {
    for (let act = 0; act < MUSIM_GUIDE.length; act++) expect(guideLevel(act, start, 0)).toBe(0);
  });

  it("babak 01 maju mengikuti kalender, lalu klik bongkahan", () => {
    expect(guideLevel(0, { ...start, maxDay: 25 }, 0)).toBe(1);
    expect(guideLevel(0, { ...start, maxDay: 100 }, 0)).toBe(2);
    expect(guideLevel(0, { ...start, maxDay: DAYS_PER_YEAR - 1 }, 0)).toBe(4);
    expect(guideLevel(0, { ...start, maxDay: DAYS_PER_YEAR - 1, inspected: true }, 0)).toBe(5);
  });

  it("babak 02 maju mengikuti kedalaman, lalu menunggu Oke", () => {
    expect(guideLevel(1, { ...start, maxDryDays: 5, maxDepthCm: 32 }, 0)).toBe(1);
    expect(guideLevel(1, { ...start, maxDryDays: 30, maxDepthCm: 62 }, 0)).toBe(3);
    expect(guideLevel(1, { ...start, maxDryDays: 30, maxDepthCm: 62 }, 4)).toBe(4);
  });

  it("babak 03 menunggu El Niño dipilih", () => {
    expect(guideLevel(2, { ...start, maxDay: DAYS_PER_YEAR - 1 }, 0)).toBe(0);
    expect(guideLevel(2, { ...start, kind: "elnino", elninoMaxDay: 0 }, 0)).toBe(1);
    expect(guideLevel(2, { ...start, kind: "elnino", elninoMaxDay: DAYS_PER_YEAR - 1 }, 2)).toBe(5);
  });

  it("tombol Oke bisa melewati arahan mana pun, tetapi tidak melewati yang terakhir", () => {
    for (let act = 0; act < MUSIM_GUIDE.length; act++) {
      const last = MUSIM_GUIDE[act].length - 1;
      expect(guideLevel(act, start, 99)).toBe(last);
    }
  });

  it("setiap lantai kolom kanan akhirnya tampil di setiap babak", () => {
    for (let act = 0; act < MUSIM_GUIDE.length; act++) {
      const last = MUSIM_GUIDE[act].length - 1;
      for (const at of Object.values(FLOOR_FROM[act])) expect(at).toBeLessThanOrEqual(last);
    }
  });
});
