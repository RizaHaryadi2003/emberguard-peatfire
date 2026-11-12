import { describe, expect, it } from "vitest";
import { DIORAMA_CAMERA_POSES } from "@/components/modul/shared/scene/dioramaConstants";
import { fitView, readingArea } from "./viewFit";

const SCREENS: [number, number][] = [
  [1280, 720],
  [1366, 768],
  [1440, 900],
  [1920, 1080],
];

describe("readingArea", () => {
  it("tidak berlaku pada layar yang kolom teksnya tidak berdampingan", () => {
    expect(readingArea(800, 900)).toBeNull();
  });

  it("selalu menyisakan ruang di antara kedua kolom teks", () => {
    for (const [w, h] of SCREENS) {
      const area = readingArea(w, h)!;
      expect(area.left).toBeGreaterThan(460);
      expect(area.right).toBeLessThan(w - 236);
      expect(area.right).toBeGreaterThan(area.left);
    }
  });
});

describe("fitView", () => {
  it("membesarkan bongkahan pada dua babak pertama", () => {
    for (const [w, h] of SCREENS) {
      expect(fitView(0, w, h)!.zoom).toBeLessThan(1);
      expect(fitView(1, w, h)!.zoom).toBeLessThan(1);
    }
  });

  it("menjaga ukuran bongkahan tetap wajar pada semua babak", () => {
    for (const [w, h] of SCREENS) {
      for (let pose = 0; pose < DIORAMA_CAMERA_POSES.length; pose++) {
        expect(fitView(pose, w, h)!.zoom).toBeLessThan(1.2);
      }
    }
  });

  it("memusatkan gambar ke ruang bebas teks, yang berada di kanan tengah layar", () => {
    for (const [w, h] of SCREENS) {
      const fit = fitView(0, w, h)!;
      const area = readingArea(w, h)!;
      expect(area.left + area.right).toBeGreaterThan(w);
      expect(Number.isFinite(fit.offsetX)).toBe(true);
      expect(Number.isFinite(fit.offsetY)).toBe(true);
    }
  });
});
