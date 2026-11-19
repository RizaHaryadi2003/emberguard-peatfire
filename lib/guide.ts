/**
 * Tuntunan langkah demi langkah, bagian yang murni (tanpa React).
 *
 * Satu modul menulis naskah arahan per babak: tiap arahan menunjuk satu
 * bagian layar (`target`, nilai atribut `data-guide`) dan menunggu syaratnya
 * (`done`) atau tombol "Oke". Komponen `GuideLayer` yang menggambarnya.
 */
export type GuideStep<S> = {
  /** Bagian layar yang ditunjuk; boleh bergantung pada keadaan. */
  target: string | ((s: S) => string);
  text: string;
  /** Syarat selesai; tanpa syarat, arahan menunggu tombol "Oke". */
  done?: (s: S) => boolean;
};

/**
 * Arahan yang sedang aktif: yang pertama belum selesai dan belum di-"Oke".
 * Syarat sebaiknya dibaca dari nilai terjauh yang pernah dicapai, supaya
 * menggeser mundur tidak menarik arahan kembali. Arahan terakhir (biasanya
 * menunjuk tombol lanjut) tidak pernah dilewati.
 */
export function guideLevel<S>(steps: readonly GuideStep<S>[], s: S, acked: number): number {
  let level = 0;
  while (level < steps.length - 1 && (level < acked || steps[level].done?.(s))) level++;
  return level;
}

/** Nilai `data-guide` yang ditunjuk arahan dalam keadaan ini. */
export function guideTarget<S>(step: GuideStep<S>, s: S): string {
  return typeof step.target === "function" ? step.target(s) : step.target;
}
