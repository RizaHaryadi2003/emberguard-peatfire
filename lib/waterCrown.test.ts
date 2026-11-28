import { describe, expect, it } from "vitest";
import { DROP_RADIUS, GRAVITY } from "./waterRipple";
import {
  CRATER_END,
  CRATER_MAX,
  CRATER_PEAK,
  CROWN_END,
  craterAt,
  craterRadius,
  crownAt,
  crownStateAt,
  FINGERS,
  FROUDE,
  IMPACT_SPEED,
  MAX_DROPLETS,
  MAX_FINGERS,
  RAYLEIGH_WAVELENGTH,
  WEBER,
} from "./waterCrown";

describe("keadaan tumbukan", () => {
  it("masuk daerah percikan mahkota seperti kasus B Lherm & Deguen (Fr ±444)", () => {
    expect(FROUDE).toBeGreaterThan(300);
    expect(FROUDE).toBeLessThan(800);
    // Di atas daerah gelombang kapiler (We ±30–140, Pumphrey & Elmore 1990).
    expect(WEBER).toBeGreaterThan(140);
  });
});

describe("kawah", () => {
  it("jari-jari terbesar mengikuti hukum Fr^¼ dengan koefisien wajar", () => {
    const scaled = CRATER_MAX / DROP_RADIUS / Math.pow(FROUDE, 0.25);
    expect(scaled).toBeGreaterThan(0.6);
    expect(scaled).toBeLessThan(1.0);
  });

  it("membuka cepat lalu melambat, dan runtuh lebih cepat daripada membuka", () => {
    expect(craterRadius(CRATER_PEAK * 0.25)).toBeGreaterThan(0.5 * CRATER_MAX);
    expect(CRATER_END - CRATER_PEAK).toBeLessThan(CRATER_PEAK);
    expect(craterRadius(CRATER_END)).toBe(0);
  });

  it("pipih di awal, memanjang di tengah, setengah bola di puncak", () => {
    const early = craterAt(CRATER_PEAK * 0.05);
    const mid = craterAt(CRATER_PEAK * 0.5);
    const peak = craterAt(CRATER_PEAK);
    expect(early.depth).toBeLessThan(early.mouth);
    expect(mid.depth).toBeGreaterThan(mid.mouth);
    expect(peak.depth).toBeCloseTo(peak.mouth, 6);
  });

  it("bergerak mulus tanpa lompatan", () => {
    // Dasar kawah tidak pernah turun lebih cepat dari laju tetesan menghantam.
    for (let t = 0; t < CRATER_END; t += 1e-4) {
      expect(Math.abs(craterAt(t + 1e-4).depth - craterAt(t).depth)).toBeLessThan(IMPACT_SPEED * 1e-4);
    }
  });
});

describe("mahkota", () => {
  it("setinggi kira-kira jari-jari kawah lalu tenggelam sebelum kawah habis", () => {
    const tallest = Math.max(...Array.from({ length: 300 }, (_, i) => crownAt((i / 300) * CROWN_END).height));
    expect(tallest).toBeGreaterThan(0.5 * CRATER_MAX);
    expect(tallest).toBeLessThan(1.5 * CRATER_MAX);
    expect(CROWN_END).toBeLessThan(CRATER_END);
    expect(crownAt(CROWN_END + 1e-4).height).toBe(0);
  });

  it("dinding condong ke luar: bibir lebih lebar daripada pangkal", () => {
    const c = crownAt(CRATER_PEAK * 0.4);
    expect(c.rim).toBeGreaterThan(c.base);
  });
});

describe("jari dan butir", () => {
  it("jumlah jari = keliling bibir / panjang gelombang Rayleigh", () => {
    expect(RAYLEIGH_WAVELENGTH).toBeCloseTo((2 * Math.PI) / 0.697, 1);
    expect(FINGERS.length).toBeGreaterThan(12);
    expect(FINGERS.length).toBeLessThanOrEqual(MAX_FINGERS);
  });

  it("jarak antarjari dan ukuran butir tidak seragam", () => {
    const gaps = FINGERS.map((f, i) => {
      const next = FINGERS[(i + 1) % FINGERS.length].angle + (i + 1 === FINGERS.length ? 2 * Math.PI : 0);
      return next - f.angle;
    });
    expect(Math.max(...gaps) / Math.min(...gaps)).toBeGreaterThan(1.3);
    const sizes = FINGERS.map((f) => f.bead);
    expect(Math.max(...sizes) / Math.min(...sizes)).toBeGreaterThan(1.3);
  });

  it("volume butir lebih kecil daripada volume tetesan", () => {
    const vol = FINGERS.reduce((s, f) => s + f.bead ** 3 + f.bead2 ** 3, 0) * (4 / 3) * Math.PI;
    expect(vol).toBeLessThan((4 / 3) * Math.PI * DROP_RADIUS ** 3);
  });

  it("butir terbang mengikuti gravitasi lalu tenggelam, tidak hilang di udara", () => {
    let maxCount = 0;
    let prev = crownStateAt(0).droplets.length;
    for (let t = 0; t < 0.4; t += 5e-4) {
      const s = crownStateAt(t);
      maxCount = Math.max(maxCount, s.droplets.length);
      // Butir hanya boleh berkurang bila ada yang sudah di bawah permukaan.
      if (s.droplets.length < prev) {
        const before = crownStateAt(t - 5e-4).droplets;
        expect(before.some((d) => d.z < 2e-3)).toBe(true);
      }
      prev = s.droplets.length;
    }
    expect(maxCount).toBeLessThanOrEqual(MAX_DROPLETS);
    // Percepatan tegak butir = −g (diuji pada satu butir di tengah terbang).
    const t = CRATER_PEAK;
    const h = 1e-3;
    const z = (k: number) => crownStateAt(t + k * h).droplets[0].z;
    expect((z(1) - 2 * z(0) + z(-1)) / (h * h)).toBeCloseTo(-GRAVITY, 1);
  });
});
