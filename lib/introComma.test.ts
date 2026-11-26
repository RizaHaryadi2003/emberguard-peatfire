import { describe, expect, it } from "vitest";
import { COMMA_DURATION, COMMA_START, COMMA_STEPS, DOT_R, finalCommaState, REST_X, type CommaState } from "./introComma";

describe("koreografi koma", () => {
  it("langkah yang mengubah sifat sama tidak saling tumpang tindih", () => {
    const keys = Object.keys(COMMA_START) as (keyof CommaState)[];
    for (const k of keys) {
      const steps = COMMA_STEPS.filter((s) => k in s.to).sort((a, b) => a.at - b.at);
      for (let i = 1; i < steps.length; i++) {
        expect(steps[i].at).toBeGreaterThanOrEqual(steps[i - 1].at + steps[i - 1].dur - 1e-9);
      }
    }
  });

  it("berakhir sebagai koma yang duduk di garis dasar, tegak, dengan ekor utuh", () => {
    const end = finalCommaState();
    expect(end.x).toBe(REST_X);
    expect(end.y).toBe(-DOT_R);
    expect(end.rot).toBe(0);
    expect(end.tail).toBe(1);
    expect(end.r).toBe(DOT_R);
  });

  it("kursor menyusut habis sebelum bola muncul", () => {
    const shrink = COMMA_STEPS.find((s) => s.to.cursorBottom !== undefined)!;
    const ball = COMMA_STEPS.find((s) => s.to.r !== undefined)!;
    expect(shrink.at + shrink.dur).toBeLessThanOrEqual(ball.at);
  });

  it("berlangsung sekitar 3,5–4 detik seperti acuan", () => {
    expect(COMMA_DURATION).toBeGreaterThan(3.5);
    expect(COMMA_DURATION).toBeLessThan(4.2);
  });
});
