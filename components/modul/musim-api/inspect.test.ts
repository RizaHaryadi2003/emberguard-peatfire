import { describe, expect, it } from "vitest";
import { classifyDepth, inspectText, LINE_PICK_CM } from "@/config/modul/musim-api";
import { BURN_CM, HIGH_DANGER_CM } from "@/lib/model/fireSeason";
import { PEAT_THICKNESS } from "@/lib/model/peat";

describe("bagian bongkahan yang diklik", () => {
  it("di atas muka air = kering, di bawahnya = basah", () => {
    expect(classifyDepth(10, 25)).toBe("kering");
    expect(classifyDepth(30, 25)).toBe("basah");
  });

  it("garis ambang didahulukan dalam jangkauan klik", () => {
    expect(classifyDepth(HIGH_DANGER_CM + LINE_PICK_CM - 0.1, 80)).toBe("ambang40");
    expect(classifyDepth(BURN_CM - LINE_PICK_CM + 0.1, 0)).toBe("ambang60");
    expect(classifyDepth(HIGH_DANGER_CM + LINE_PICK_CM + 1, 0)).toBe("basah");
  });

  it("di bawah gambut = tanah mineral", () => {
    expect(classifyDepth(PEAT_THICKNESS * 100 + 1, 0)).toBe("mineral");
  });

  it("penjelasan gambut kering mengikuti tebalnya hari itu", () => {
    expect(inspectText("kering", 33).body).toContain("33 cm");
    expect(inspectText("kering", 0).body).toContain("hampir tidak ada");
  });

  it("tidak ada kutipan penulis di teks layar", () => {
    for (const part of ["kering", "basah", "ambang40", "ambang60", "mineral"] as const) {
      const { title, body } = inspectText(part, 50);
      expect(`${title} ${body}`).not.toMatch(/dkk\.|\(\d{4}\)|, \d{4}\)/);
    }
  });
});
