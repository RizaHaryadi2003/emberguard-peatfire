import { describe, expect, it } from "vitest";
import { gateAction, guardAction, keyIntent, scrollIntent } from "./autoPlayGate";

describe("maksud pembaca saat animasi air berjalan", () => {
  it("gulir ke bawah = lewati, ke atas = mundur, gerak kecil diabaikan", () => {
    expect(scrollIntent(40)).toBe("skip");
    expect(scrollIntent(-40)).toBe("back");
    expect(scrollIntent(2)).toBeNull();
  });

  it("tombol gulir dikenali, tombol lain tidak", () => {
    expect(keyIntent("PageDown")).toBe("skip");
    expect(keyIntent(" ")).toBe("skip");
    expect(keyIntent("ArrowUp")).toBe("back");
    expect(keyIntent("a")).toBeNull();
  });
});

describe("gerbang animasi air", () => {
  const vh = 900;

  it("melintas sedikit: maju memutar, mundur memutar balik", () => {
    expect(gateAction(1, 80, vh)).toBe("play");
    expect(gateAction(-1, -80, vh)).toBe("rewind");
  });

  it("melompat jauh: langsung ke akhir atau awal tanpa menahan halaman", () => {
    expect(gateAction(1, 3000, vh)).toBe("finish");
    expect(gateAction(-1, -3000, vh)).toBe("reset");
  });

  it("penjaga menyusulkan animasi yang tertinggal dari posisi halaman", () => {
    expect(guardAction(2000, vh, 0.4)).toBe("finish");
    expect(guardAction(2000, vh, 1)).toBeNull();
    expect(guardAction(-2000, vh, 0.4)).toBe("reset");
    expect(guardAction(-2000, vh, 0)).toBeNull();
    // Dekat gerbang: biarkan animasi berjalan sendiri.
    expect(guardAction(100, vh, 0.4)).toBeNull();
  });
});
