import { describe, expect, it } from "vitest";
import { BURNS, BURN_SITES, CASE_IGNITION } from "@/lib/model/ignition";
import { CASE_FIRE, CASE_LAST_DAY, FLOOR_FROM, FORENSIK_GUIDE, guideLevel, type GuideState } from "@/config/modul/forensik-api";
import { BURN_MS_PER_DAY, burnAnimMs, burnsAt, cellIndex, fireAt } from "./fireView";

const ESCAPED = BURNS.findIndex((b) => b.escaped);

describe("keadaan petak peta", () => {
  it("hari ke-0 hanya titik sulut yang panas", () => {
    const m = fireAt(CASE_FIRE, 0);
    expect([...m.entries()]).toEqual([[cellIndex(CASE_IGNITION.x, CASE_IGNITION.y), "hot"]]);
  });

  it("hari terakhir titik sulut sudah padam, garis depan masih panas", () => {
    const m = fireAt(CASE_FIRE, CASE_LAST_DAY);
    expect(m.get(cellIndex(CASE_IGNITION.x, CASE_IGNITION.y))).toBe("scar");
    expect([...m.values()]).toContain("hot");
    expect(m.size).toBe(CASE_FIRE.length);
  });

  it("api yang tidak lolos hanya membakar petaknya", () => {
    const s = BURN_SITES[0];
    const during = burnsAt(1, 0, BURN_MS_PER_DAY / 2);
    expect([...during.entries()]).toEqual([[cellIndex(s.x, s.y), "hot"]]);
    expect(burnsAt(1, 0, burnAnimMs(0)).get(cellIndex(s.x, s.y))).toBe("scar");
  });

  it("api yang lolos menjalar ke banyak petak, lalu semuanya padam", () => {
    const mid = burnsAt(ESCAPED + 1, ESCAPED, burnAnimMs(ESCAPED) / 2);
    const end = burnsAt(ESCAPED + 1, ESCAPED, burnAnimMs(ESCAPED));
    expect(end.size).toBeGreaterThanOrEqual(mid.size);
    expect(end.size).toBeGreaterThan(ESCAPED + 5);
    expect([...end.values()].every((v) => v === "scar")).toBe(true);
  });
});

const start: GuideState = { tried: new Set(), guessed: false, minDay: CASE_LAST_DAY, burnsLit: 0, inspected: false };

describe("tuntunan Forensik Api", () => {
  it("babak 01 maju mengikuti percobaan", () => {
    expect(guideLevel(0, start, 0)).toBe(0);
    expect(guideLevel(0, { ...start, tried: new Set(["basah-tenang"]) }, 0)).toBe(1);
    expect(guideLevel(0, { ...start, tried: new Set(["basah-tenang", "kering-tenang"]) }, 0)).toBe(2);
    expect(guideLevel(0, { ...start, tried: new Set(["basah-tenang", "kering-tenang", "lembap-tenang", "lembap-berangin"]) }, 0)).toBe(4);
  });

  it("babak 02 menunggu tebakan, lalu waktu diputar sampai hari ke-0", () => {
    expect(guideLevel(1, start, 1)).toBe(1);
    expect(guideLevel(1, { ...start, guessed: true }, 1)).toBe(2);
    expect(guideLevel(1, { ...start, guessed: true, minDay: 0 }, 1)).toBe(4);
  });

  it("babak 03 menunggu api dinyalakan", () => {
    expect(guideLevel(2, { ...start, burnsLit: ESCAPED }, 0)).toBe(2);
    expect(guideLevel(2, { ...start, burnsLit: ESCAPED + 1 }, 0)).toBe(3);
    expect(guideLevel(2, { ...start, burnsLit: BURNS.length }, 4)).toBe(5);
  });

  it("setiap kartu kolom kanan akhirnya tampil", () => {
    FORENSIK_GUIDE.forEach((steps, act) => {
      for (const at of Object.values(FLOOR_FROM[act])) expect(at).toBeLessThanOrEqual(steps.length - 1);
    });
  });
});
