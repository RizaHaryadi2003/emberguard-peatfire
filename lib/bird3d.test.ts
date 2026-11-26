import { describe, expect, it } from "vitest";
import { angleDelta, apply, attitudeFrom, planeMatrix, rotation, wingAngle } from "./bird3d";

const close = (a: number[], b: number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 6));

describe("rotation", () => {
  it("yaw 0 menghadap kanan, yaw π menghadap kiri, yaw −π/2 menghadap penonton", () => {
    close(apply(rotation({ yaw: 0, pitch: 0, roll: 0 }), [1, 0, 0]), [1, 0, 0]);
    close(apply(rotation({ yaw: Math.PI, pitch: 0, roll: 0 }), [1, 0, 0]), [-1, 0, 0]);
    close(apply(rotation({ yaw: -Math.PI / 2, pitch: 0, roll: 0 }), [1, 0, 0]), [0, 0, 1]);
  });

  it("pitch positif menaikkan hidung", () => {
    const f = apply(rotation({ yaw: 0, pitch: 0.3, roll: 0 }), [1, 0, 0]);
    expect(f[1]).toBeGreaterThan(0);
  });

  it("roll positif menurunkan sayap kanan tanpa mengubah arah hadap", () => {
    const m = rotation({ yaw: 0, pitch: 0, roll: 0.5 });
    close(apply(m, [1, 0, 0]), [1, 0, 0]);
    expect(apply(m, [0, 0, 1])[1]).toBeCloseTo(-Math.sin(0.5), 6);
  });
});

describe("planeMatrix", () => {
  it("bidang tegak dilihat dari samping = gambar profil apa adanya (y dibalik)", () => {
    const m = rotation({ yaw: 0, pitch: 0, roll: 0 });
    // Titik profil (sx, sy) → badan (sx, −sy, 0): U = (1,0,0), V = (0,−1,0)
    close(planeMatrix(m, [0, 0, 0], [1, 0, 0], [0, -1, 0], 2), [2, 0, 0, 2, 0, 0]);
  });

  it("bidang tegak dilihat dari depan menjadi garis (tipis)", () => {
    const m = rotation({ yaw: -Math.PI / 2, pitch: 0, roll: 0 });
    const [a] = planeMatrix(m, [0, 0, 0], [1, 0, 0], [0, -1, 0], 1);
    expect(Math.abs(a)).toBeLessThan(1e-9);
  });
});

describe("attitudeFrom", () => {
  it("arah hadap mengikuti gerak, termasuk saat menjauh", () => {
    expect(attitudeFrom({ vx: 300, vy: 0, vz: 0 }, 0).yaw).toBeCloseTo(0);
    expect(Math.abs(attitudeFrom({ vx: -300, vy: 0, vz: 0 }, 0).yaw)).toBeCloseTo(Math.PI);
    // Menjauh (vz negatif) = membelakangi penonton: yaw +π/2.
    expect(attitudeFrom({ vx: 0, vy: 0, vz: -300 }, 0).yaw).toBeCloseTo(Math.PI / 2);
  });

  it("miring ke dalam belokan, sebanding laju belok, dan dibatasi", () => {
    // Menghadap kanan lalu berbelok menjauh (ke kiri badannya): sayap kanan naik.
    expect(attitudeFrom({ vx: 300, vy: 0, vz: 0 }, 1).roll).toBeCloseTo(-0.42);
    expect(attitudeFrom({ vx: 300, vy: 0, vz: 0 }, -50).roll).toBeCloseTo(1.15);
  });
});

describe("angleDelta", () => {
  it("mengambil selisih terpendek melewati ±π", () => {
    expect(angleDelta(3.1, -3.1)).toBeCloseTo(2 * Math.PI - 6.2);
    expect(angleDelta(0.2, 0.5)).toBeCloseTo(0.3);
  });
});

describe("wingAngle", () => {
  it("kepakan penuh saat lurus, mengecil saat meluncur di belokan tajam", () => {
    const span = (roll: number) => wingAngle(0, roll) - wingAngle(Math.PI, roll);
    expect(span(0)).toBeGreaterThan(span(1.1) * 3);
  });
});
