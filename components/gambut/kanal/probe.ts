import { TRANSECT_LENGTH_M } from "@/lib/drainage";

// Penilaian penanda jarak — syarat lulus babak 02.
//
// Dipisahkan dari komponen grafiknya karena inilah gerbang babak, bukan
// hiasan: ia yang menentukan pembaca boleh melanjutkan atau tidak. Gerbang
// babak di modul ini pernah salah sekali dengan cara yang tidak terlihat dari
// membaca kodenya — syarat babak 02 dahulu "jangkauan rawan sudah melewati
// 100 m", padahal kanal sedalam satu meter yang diminta babak 01 sudah
// membuatnya 209 m, sehingga babak itu lulus sebelum pembaca mengerjakan apa
// pun. Dipisah begini, syaratnya dapat diuji tanpa merender apa pun.

/**
 * Toleransi penanda jarak (m).
 *
 * Longgar dengan sengaja. Yang diminta babak 02 bukan ketepatan membaca
 * grafik sampai meter — itu keterampilan yang tidak ada hubungannya dengan
 * gambut — melainkan kesadaran bahwa tepi daerah rawan berada ratusan meter
 * dari kanalnya, bukan beberapa meter. Toleransi 70 m membedakan pembaca yang
 * memahami itu dari yang menebak di dekat kanal, dan tidak lebih.
 */
export const PROBE_TOLERANCE_M = 70;

/** Jarak minimum yang dihitung sebagai "menandai ujung grafik". */
export const PROBE_END_M = TRANSECT_LENGTH_M - 120;

/** Keadaan penanda terhadap jawaban yang benar. */
export type ProbeVerdict = "idle" | "tooNear" | "tooFar" | "found" | "beyond" | "beyondFound";

/**
 * Nilai penanda `probeM` dibandingkan tepi daerah rawan `reachM`.
 *
 * `reachM` adalah jarak terjauh yang muka airnya masih melewati batas 40 cm,
 * yaitu `DrainageStats.riskReachM`.
 */
export function judgeProbe(probeM: number | null, reachM: number): ProbeVerdict {
  if (probeM === null) return "idle";

  // Kanal yang dalam mendorong tepinya ke luar satu kilometer. Tidak ada
  // persilangan untuk ditemukan, dan yang benar justru menyadari itu —
  // pembaca menandai ujung grafik untuk menyatakan bahwa ia melihatnya.
  if (reachM >= TRANSECT_LENGTH_M - 1) {
    return probeM >= PROBE_END_M ? "beyondFound" : "beyond";
  }

  // Kanal belum digali, atau sudah disekat: tidak ada daerah rawan sama
  // sekali, jadi tidak ada yang dapat ditandai benar atau salah.
  if (reachM <= 0) return "idle";

  if (probeM < reachM - PROBE_TOLERANCE_M) return "tooNear";
  if (probeM > reachM + PROBE_TOLERANCE_M) return "tooFar";
  return "found";
}

/** Penanda ini sudah menjawab tugas babak 02. */
export function probeSolved(verdict: ProbeVerdict): boolean {
  return verdict === "found" || verdict === "beyondFound";
}
