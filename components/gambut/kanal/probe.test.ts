import { describe, expect, it } from "vitest";
import { TRANSECT_LENGTH_M, WATER_LIMIT_M, waterDepthAt } from "@/lib/drainage";
import { judgeProbe, probeSolved, PROBE_END_M, PROBE_TOLERANCE_M } from "./probe";

// Syarat lulus babak 02 Modul 03.
//
// Diuji terpisah dari tampilannya karena inilah yang menentukan pembaca boleh
// melanjutkan atau tidak, dan karena cacat yang diperbaikinya dahulu tidak
// terlihat dari membaca kode: syarat lama "jangkauan rawan >= 100 m" sudah
// terpenuhi oleh kanal sedalam satu meter yang diminta babak sebelumnya.
// Berkas ini menahan kesalahan jenis itu supaya tidak terulang.

describe("judgeProbe", () => {
  it("belum menilai apa pun sebelum penandanya digeser", () => {
    expect(judgeProbe(null, 400)).toBe("idle");
    expect(probeSolved(judgeProbe(null, 400))).toBe(false);
  });

  it("tidak dapat dilulusi sebelum kanalnya digali", () => {
    // Tanpa kanal tidak ada daerah rawan, jadi tidak ada tepi untuk ditandai.
    for (const at of [0, 250, 500, TRANSECT_LENGTH_M]) {
      expect(probeSolved(judgeProbe(at, 0))).toBe(false);
    }
  });

  it("menolak tebakan di dekat kanal", () => {
    expect(judgeProbe(50, 440)).toBe("tooNear");
    expect(judgeProbe(440 - PROBE_TOLERANCE_M - 1, 440)).toBe("tooNear");
  });

  it("menolak tebakan yang melewati tepinya", () => {
    expect(judgeProbe(900, 440)).toBe("tooFar");
    expect(judgeProbe(440 + PROBE_TOLERANCE_M + 1, 440)).toBe("tooFar");
  });

  it("menerima penanda di dalam toleransi, termasuk tepat di batasnya", () => {
    expect(judgeProbe(440, 440)).toBe("found");
    expect(judgeProbe(440 - PROBE_TOLERANCE_M, 440)).toBe("found");
    expect(judgeProbe(440 + PROBE_TOLERANCE_M, 440)).toBe("found");
  });

  it("kanal yang pengaruhnya melewati satu kilometer dijawab dengan menandai ujungnya", () => {
    const reach = TRANSECT_LENGTH_M;
    expect(judgeProbe(500, reach)).toBe("beyond");
    expect(judgeProbe(PROBE_END_M, reach)).toBe("beyondFound");
    expect(judgeProbe(TRANSECT_LENGTH_M, reach)).toBe("beyondFound");
  });
});

describe("jawaban babak 02 sesuai hidrologinya", () => {
  /** Tepi daerah rawan untuk kanal sedalam `depthM`, dihitung kasar. */
  function reachOf(depthM: number): number {
    let reach = 0;
    for (let m = 0; m <= TRANSECT_LENGTH_M; m += 5) {
      if (waterDepthAt(m, depthM) > WATER_LIMIT_M) reach = m;
    }
    return reach;
  }

  it("tepinya benar-benar ratusan meter dari kanal, bukan beberapa meter", () => {
    // Inilah yang harus dibawa pulang pembaca dari babak 02. Kalau tetapan
    // hidrologinya kelak diganti dan tepinya jatuh ke puluhan meter, tugas
    // babak ini kehilangan maknanya dan uji ini yang memberitahukannya.
    expect(reachOf(1)).toBeGreaterThan(150);
    expect(reachOf(2)).toBeGreaterThan(500);
  });

  it("tebakan di dekat kanal selalu salah untuk tiap kedalaman yang dapat digali", () => {
    for (const depth of [1, 1.5, 2, 2.5]) {
      expect(judgeProbe(25, reachOf(depth))).toBe("tooNear");
    }
  });

  it("kanal terdalam memang tidak punya tepi di dalam satu kilometer", () => {
    expect(reachOf(3)).toBe(TRANSECT_LENGTH_M);
    expect(judgeProbe(TRANSECT_LENGTH_M, reachOf(3))).toBe("beyondFound");
  });
});
