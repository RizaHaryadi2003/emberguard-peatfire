import { describe, expect, it } from "vitest";
import {
  ANCHOR_DEPTH_M,
  depthSolved,
  judgeDepth,
  probeAge,
  PROBE_TOLERANCE_M,
} from "./depthProbe";
import { ANCHOR } from "@/config/karbon-content";
import { PEAT_THICKNESS } from "@/lib/peat";

describe("penanda kedalaman babak 01", () => {
  it("patokannya berada di dalam lapisan gambut, bukan di tanah mineral", () => {
    // Gampang rusak diam-diam: mengubah ANCHOR.years atau laju penimbunan
    // dapat mendorong jawabannya ke bawah profil, sehingga babak 01 menjadi
    // mustahil tanpa satu pun berkas lain berubah.
    expect(ANCHOR_DEPTH_M).toBeGreaterThan(0);
    expect(ANCHOR_DEPTH_M).toBeLessThan(PEAT_THICKNESS);
  });

  it("Borobudur jatuh pada kedalaman 1,2 m", () => {
    expect(ANCHOR.years).toBe(1200);
    expect(ANCHOR_DEPTH_M).toBeCloseTo(1.2, 9);
  });

  it("belum dinilai selama penandanya belum disentuh", () => {
    expect(judgeDepth(null)).toBe("idle");
    expect(depthSolved(judgeDepth(null))).toBe(false);
    expect(probeAge(null)).toBeNull();
  });

  it("membedakan terlalu dangkal dan terlalu dalam", () => {
    expect(judgeDepth(0.2)).toBe("tooShallow");
    expect(judgeDepth(2.5)).toBe("tooDeep");
  });

  it("menerima jawaban di dalam toleransi, menolak tepat di luarnya", () => {
    expect(judgeDepth(ANCHOR_DEPTH_M)).toBe("found");
    expect(judgeDepth(ANCHOR_DEPTH_M - PROBE_TOLERANCE_M)).toBe("found");
    expect(judgeDepth(ANCHOR_DEPTH_M + PROBE_TOLERANCE_M)).toBe("found");
    expect(judgeDepth(ANCHOR_DEPTH_M - PROBE_TOLERANCE_M - 0.01)).toBe("tooShallow");
    expect(judgeDepth(ANCHOR_DEPTH_M + PROBE_TOLERANCE_M + 0.01)).toBe("tooDeep");
  });

  it("permukaan tidak pernah dianggap benar", () => {
    // Pembaca yang hanya mengetuk tanpa mencari harus tetap tertahan.
    expect(depthSolved(judgeDepth(0))).toBe(false);
  });

  it("umur yang dibacakan mengikuti satu milimeter setahun", () => {
    expect(probeAge(ANCHOR_DEPTH_M)).toBeCloseTo(ANCHOR.years, 6);
    expect(probeAge(0)).toBe(0);
  });

  it("hanya satu putusan yang dianggap selesai", () => {
    expect(depthSolved("found")).toBe(true);
    for (const v of ["idle", "tooShallow", "tooDeep"] as const) {
      expect(depthSolved(v)).toBe(false);
    }
  });
});
