import { describe, expect, it } from "vitest";
import { CELL_ASH, CELL_INTACT, CELL_QUENCHED, CELL_SMOLDER } from "@/lib/smolder";
import { describeCell, describeLayer, placeHint } from "./layerHint";

describe("describeCell", () => {
  it("menyebut lapisan dan isinya pada gambut yang utuh", () => {
    expect(describeCell(CELL_INTACT, "fibrik")).toEqual(describeLayer("fibrik"));
    expect(describeLayer("fibrik").text).toBe("Fibrik · serat & akar masih utuh");
  });

  it("tidak menyebut nama lapisan pada rongga abu", () => {
    const hint = describeCell(CELL_ASH, "saprik");
    expect(hint.text).toContain("Rongga abu");
    expect(hint.text).not.toContain("Saprik");
    expect(hint.tone).toBe("ash");
  });

  it("menandai bara beserta lapisan tempatnya menyala", () => {
    const hint = describeCell(CELL_SMOLDER, "hemik");
    expect(hint.text).toContain("Sedang membara");
    expect(hint.text).toContain("Hemik");
    expect(hint.tone).toBe("ember");
  });

  it("membedakan gambut hangus dari gambut utuh", () => {
    expect(describeCell(CELL_QUENCHED, "fibrik").text).toContain("Gambut hangus");
  });
});

describe("placeHint", () => {
  const W = 200;
  const H = 30;
  const BW = 1280;
  const BH = 720;

  it("berada di kanan atas kursor bila ruangnya cukup", () => {
    const { left, top } = placeHint(400, 300, W, H, BW, BH);
    expect(left).toBeGreaterThan(400);
    expect(top + H).toBeLessThan(300);
  });

  it("pindah ke kiri kursor di dekat tepi kanan", () => {
    const { left } = placeHint(1250, 300, W, H, BW, BH);
    expect(left + W).toBeLessThan(1250);
  });

  it("pindah ke bawah kursor di dekat tepi atas", () => {
    const { top } = placeHint(400, 10, W, H, BW, BH);
    expect(top).toBeGreaterThan(10);
  });

  it("tetap di dalam modul pada layar yang sempit", () => {
    const { left, top } = placeHint(100, 700, 260, H, 320, BH);
    expect(left).toBeGreaterThanOrEqual(8);
    expect(left + 260).toBeLessThanOrEqual(312);
    expect(top + H).toBeLessThanOrEqual(BH - 8);
  });
});
