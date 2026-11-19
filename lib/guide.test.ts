import { describe, expect, it } from "vitest";
import { guideLevel, guideTarget, type GuideStep } from "./guide";

type S = { n: number };
const steps: GuideStep<S>[] = [
  { target: "a", text: "1", done: (s) => s.n >= 1 },
  { target: "b", text: "2" },
  { target: (s) => `c-${s.n}`, text: "3", done: (s) => s.n >= 3 },
  { target: "next", text: "4" },
];

describe("tuntunan", () => {
  it("berhenti di arahan pertama yang belum selesai", () => {
    expect(guideLevel(steps, { n: 0 }, 0)).toBe(0);
    expect(guideLevel(steps, { n: 1 }, 0)).toBe(1);
  });

  it("arahan tanpa syarat menunggu waktu bacanya habis", () => {
    expect(guideLevel(steps, { n: 5 }, 0)).toBe(1);
    expect(guideLevel(steps, { n: 5 }, 2)).toBe(3);
  });

  it("tidak pernah melewati arahan terakhir", () => {
    expect(guideLevel(steps, { n: 99 }, 99)).toBe(3);
  });

  it("target boleh bergantung pada keadaan", () => {
    expect(guideTarget(steps[2], { n: 2 })).toBe("c-2");
    expect(guideTarget(steps[0], { n: 2 })).toBe("a");
  });
});
