/**
 * Aturan memilih klip narator dari keadaan modul berbabak.
 *
 * - Layar pembuka → "hook" (memotong).
 * - Arahan pertama tiap babak/tahap → penjelasan "t<n>" (memotong): arahan
 *   itu tidak dibacakan sendiri karena isinya sudah ada di kalimat terakhir
 *   penjelasan.
 * - Arahan berikutnya → "t<n>-g<k>" (menunggu penjelasan selesai).
 */
export function narrationClip(hookOpen: boolean, step: number, guideAt: number): { clip: string; interrupt: boolean } {
  if (hookOpen) return { clip: "hook", interrupt: true };
  if (guideAt <= 0) return { clip: `t${step}`, interrupt: true };
  return { clip: `t${step}-g${guideAt}`, interrupt: false };
}

/** Semua kunci klip yang dapat diminta modul dengan `guideLengths[n]` arahan per babak. */
export function narrationKeys(guideLengths: readonly number[]): string[] {
  const keys = ["hook"];
  guideLengths.forEach((len, n) => {
    keys.push(`t${n}`);
    for (let k = 1; k < len; k++) keys.push(`t${n}-g${k}`);
  });
  return keys;
}
