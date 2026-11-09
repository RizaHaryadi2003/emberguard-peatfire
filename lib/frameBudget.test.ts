import { describe, expect, it } from "vitest";
import { ACTIVE_WINDOW_MS, advanceFrameClock, FRAME_CAP, getFrameCap, judgeFrameWindow, OVERLOAD_WINDOWS } from "./frameBudget";

/** Jumlah gambar selama sepuluh detik pada layar dengan kecepatan tertentu. */
function simulate(refreshHz: number, cap: number): number {
  const frameMs = 1000 / refreshHz;
  let nextAt = 0;
  let drawn = 0;
  for (let now = 0; now < 10_000; now += frameMs) {
    const clock = advanceFrameClock(now, nextAt, cap);
    nextAt = clock.nextAt;
    if (clock.due) drawn++;
  }
  return drawn / 10;
}

describe("getFrameCap", () => {
  it("penuh selama pembaca berinteraksi, lalu turun saat ia diam", () => {
    expect(getFrameCap(0)).toBe(FRAME_CAP.active);
    expect(getFrameCap(ACTIVE_WINDOW_MS - 1)).toBe(FRAME_CAP.active);
    expect(getFrameCap(ACTIVE_WINDOW_MS)).toBe(FRAME_CAP.idle);
    expect(getFrameCap(Infinity)).toBe(FRAME_CAP.idle);
  });
});

describe("advanceFrameClock", () => {
  it.each([60, 75, 90, 100, 120, 144])("rata-ratanya mengikuti batas pada layar %i Hz", (hz) => {
    expect(simulate(hz, FRAME_CAP.idle)).toBeGreaterThan(FRAME_CAP.idle * 0.95);
    expect(simulate(hz, FRAME_CAP.idle)).toBeLessThan(FRAME_CAP.idle * 1.05);
    expect(simulate(hz, FRAME_CAP.active)).toBeGreaterThan(FRAME_CAP.active * 0.95);
    expect(simulate(hz, FRAME_CAP.active)).toBeLessThan(FRAME_CAP.active * 1.05);
  });

  it("tidak mengejar gambar yang terlewat setelah jeda panjang", () => {
    const afterPause = advanceFrameClock(60_000, 100, FRAME_CAP.idle);
    expect(afterPause.due).toBe(true);
    expect(afterPause.nextAt).toBeGreaterThan(60_000);
  });
});

describe("judgeFrameWindow", () => {
  it("batas 30 saat diam tidak dianggap tersendat", () => {
    expect(judgeFrameWindow(29.5, FRAME_CAP.idle, 1.5, 0)).toEqual({ dpr: 1.5, slowWindows: 0, overload: false });
  });

  it("menurunkan resolusi lebih dulu sampai batas terendah", () => {
    expect(judgeFrameWindow(40, FRAME_CAP.active, 1.5, 0).dpr).toBe(1.25);
    expect(judgeFrameWindow(10, FRAME_CAP.active, 1.1, 0).dpr).toBe(1);
    expect(judgeFrameWindow(10, FRAME_CAP.active, 1.1, 0).overload).toBe(false);
  });

  it("menurunkan mutu hanya setelah kewalahan beberapa kali berturut-turut", () => {
    let slowWindows = 0;
    for (let i = 1; i < OVERLOAD_WINDOWS; i++) {
      const judged = judgeFrameWindow(15, FRAME_CAP.idle, 1, slowWindows);
      expect(judged.overload).toBe(false);
      slowWindows = judged.slowWindows;
    }
    expect(judgeFrameWindow(15, FRAME_CAP.idle, 1, slowWindows).overload).toBe(true);
  });

  it("satu jendela yang pulih mengulang hitungan", () => {
    expect(judgeFrameWindow(30, FRAME_CAP.idle, 1, 2).slowWindows).toBe(0);
  });

  it("sedikit tersendat pada resolusi terendah tidak menurunkan mutu", () => {
    expect(judgeFrameWindow(26, FRAME_CAP.idle, 1, 2)).toEqual({ dpr: 1, slowWindows: 0, overload: false });
  });
});
