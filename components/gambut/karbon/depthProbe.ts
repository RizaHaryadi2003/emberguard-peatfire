import { ageAtDepth, depthAtAge } from "@/lib/carbon";
import { ANCHOR } from "@/config/karbon-content";

// Penilaian penanda kedalaman — syarat lulus babak 01.
//
// Dipisahkan dari komponen adegannya dengan alasan yang sama seperti
// `components/gambut/kanal/probe.ts`: inilah gerbang babaknya, bukan hiasan,
// dan gerbang harus dapat diuji tanpa merender apa pun. Modul 03 sudah pernah
// kebobolan sekali dengan cara yang tidak terlihat dari membaca kodenya —
// syaratnya terpenuhi dengan sendirinya oleh pekerjaan babak sebelumnya.

/** Kedalaman gambut yang seumur dengan patokan sejarahnya (m). */
export const ANCHOR_DEPTH_M = depthAtAge(ANCHOR.years);

/**
 * Toleransi penanda kedalaman (m).
 *
 * Sepuluh sentimeter, yaitu seratus tahun. Longgar dengan sengaja, dan
 * besarnya dipilih dari apa yang sedang diajarkan: yang harus disadari
 * pembaca adalah bahwa gambut seumur Borobudur berada kira-kira satu meter di
 * bawah kakinya — bukan beberapa sentimeter, dan bukan pula di dasar profil.
 * Menuntut ketepatan sampai sentimeter hanya akan menguji ketelitian
 * menyeret tetikus.
 */
export const PROBE_TOLERANCE_M = ANCHOR.toleranceM;

/** Keadaan penanda terhadap jawaban yang benar. */
export type DepthVerdict = "idle" | "tooShallow" | "tooDeep" | "found";

/**
 * Nilai penanda kedalaman `probeM` terhadap kedalaman patokannya.
 *
 * `probeM` null berarti pembaca belum menyentuh penandanya sama sekali.
 */
export function judgeDepth(probeM: number | null): DepthVerdict {
  if (probeM === null) return "idle";
  if (probeM < ANCHOR_DEPTH_M - PROBE_TOLERANCE_M) return "tooShallow";
  if (probeM > ANCHOR_DEPTH_M + PROBE_TOLERANCE_M) return "tooDeep";
  return "found";
}

/** Penanda ini sudah menjawab tugas babak 01. */
export function depthSolved(verdict: DepthVerdict): boolean {
  return verdict === "found";
}

/** Umur gambut pada penanda, untuk dibacakan di antarmuka (tahun). */
export function probeAge(probeM: number | null): number | null {
  return probeM === null ? null : ageAtDepth(probeM);
}
