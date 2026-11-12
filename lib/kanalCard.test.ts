import { describe, expect, it } from "vitest";
import {
  fieldsFor,
  fieldsText,
  getKanalCard,
  kanalCardImagePath,
  kanalShareLink,
  parseSharedCanal,
  reachText,
  riskReachFor,
} from "./kanalCard";

describe("parseSharedCanal", () => {
  it("menerima kedalaman bulat di dalam rentang pengatur", () => {
    expect(parseSharedCanal("100", "0")).toEqual({ cm: 100, guess: 0 });
    expect(parseSharedCanal("300", null)).toEqual({ cm: 300, guess: null });
  });

  it("menolak kedalaman di luar rentang atau yang bukan bilangan bulat", () => {
    for (const bad of ["0", "9", "301", "-5", "6.5", "abc", "", " 40", "1e2"]) {
      expect(parseSharedCanal(bad, null)).toBeNull();
    }
    expect(parseSharedCanal(undefined, null)).toBeNull();
    expect(parseSharedCanal(["100", "200"], null)).toBeNull();
  });

  it("membuang tebakan yang tidak sah tanpa membatalkan kedalamannya", () => {
    for (const bad of ["3", "9", "-1", "x", "01"]) {
      expect(parseSharedCanal("100", bad)).toEqual({ cm: 100, guess: null });
    }
  });
});

describe("jangkauan dan lapangan bola", () => {
  it("sama dengan simulasi modulnya: kanal 1 m membuat lahan rawan sampai ratusan meter", () => {
    const reach = riskReachFor(100);
    expect(reach).toBeGreaterThan(150);
    expect(reach).toBeLessThan(300);
  });

  it("makin dalam kanalnya, makin jauh jangkauannya", () => {
    expect(riskReachFor(200)).toBeGreaterThan(riskReachFor(100));
  });

  it("menghitung luas dua sisi sepanjang 1 km dalam lapangan FIFA", () => {
    // 2 × 209 m × 1.000 m / 7.140 m² ≈ 58,5.
    expect(fieldsFor(209)).toBeCloseTo(58.54, 1);
    expect(fieldsText(209)).toBe("59");
  });

  it("menyatakan batas bawah bila jangkauannya melewati 1 km", () => {
    expect(reachText(1000)).toBe("lebih dari 1 km");
    // Kanal terdalam: jangkauannya berhenti di titik tengah kolom terakhir.
    expect(reachText(riskReachFor(300))).toBe("lebih dari 1 km");
    expect(fieldsText(1000)).toBe("lebih dari 280");
  });
});

describe("isi dan alamat kartu", () => {
  it("menyebut sumber dan kalimat tebakan bila ada", () => {
    const card = getKanalCard({ cm: 100, guess: 0 });
    expect(card.source).toMatch(/Hooijer/);
    expect(card.guessLine).toMatch(/± 5 m/);
    expect(getKanalCard({ cm: 100, guess: null }).guessLine).toBeNull();
  });

  it("menyusun alamat gambar dan tautan", () => {
    expect(kanalCardImagePath(null, "og")).toBe("/gambut/kanal/kartu?format=og");
    expect(kanalCardImagePath({ cm: 100, guess: 2 }, "story")).toBe("/gambut/kanal/kartu?format=story&kanal=100&tebak=2");
    expect(kanalShareLink("https://contoh.id", { cm: 150, guess: null })).toBe("https://contoh.id/gambut/kanal?kanal=150");
  });
});
