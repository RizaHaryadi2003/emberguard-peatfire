import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { narrationClip, narrationKeys } from "./narration";
import { ANATOMI_GUIDE } from "@/config/modul/anatomi";
import { ANATOMI_NARRATION, ANATOMI_NARRATION_READY } from "@/config/narasi/anatomi";

describe("pemilihan klip narator", () => {
  it("layar pembuka dan penjelasan memotong, arahan menunggu", () => {
    expect(narrationClip(true, 2, 1)).toEqual({ clip: "hook", interrupt: true });
    expect(narrationClip(false, 1, 0)).toEqual({ clip: "t1", interrupt: true });
    expect(narrationClip(false, 3, 2)).toEqual({ clip: "t3-g2", interrupt: false });
  });
});

describe("naskah dan audio Modul Anatomi", () => {
  const keys = narrationKeys(ANATOMI_GUIDE.map((g) => g.length));

  it("setiap klip yang dapat diminta punya naskah, dan tidak ada naskah yatim", () => {
    expect(Object.keys(ANATOMI_NARRATION).sort()).toEqual([...keys].sort());
  });

  it.runIf(ANATOMI_NARRATION_READY)("setiap klip sudah dibangkitkan menjadi berkas audio", () => {
    for (const k of keys) expect(existsSync(join(process.cwd(), "public/audio/narasi/anatomi", `${k}.mp3`)), k).toBe(true);
  });

  it("naskah ucapan tidak memuat angka atau singkatan satuan yang salah dibaca", () => {
    for (const { text, direction } of Object.values(ANATOMI_NARRATION)) {
      expect(text).not.toMatch(/\d|\bcm\b|\bkg\b|%/);
      expect(direction.length).toBeGreaterThan(0);
    }
  });
});
