/**
 * Logika kuis: menilai jawaban dan menyusun halaman hasil.
 *
 * Murni, tanpa React, supaya bisa diuji (lib/quiz.test.ts) dan dipakai
 * bersama oleh kuis utama dan cek singkat per bagian. Aturannya mengikuti
 * Bab III naskah: benar = 10 poin, skor 0–100, "Paham" bila skor ≥ 70.
 */
import { PASS_SCORE, POINTS_PER_ITEM, type QuizItem, type QuizPart } from "@/config/kuis";

/** Jawaban pembaca per soal: indeks pilihan, atau `null` bila belum dijawab. */
export type Picks = readonly (number | null)[];

export type QuizCategory = "paham" | "coba-lagi";

export function isCorrect(item: QuizItem, pick: number | null): boolean {
  return pick !== null && pick === item.answer;
}

/** Skor 0–100: 10 poin untuk tiap jawaban benar. */
export function scoreOf(items: readonly QuizItem[], picks: Picks): number {
  return items.reduce((sum, item, i) => sum + (isCorrect(item, picks[i] ?? null) ? POINTS_PER_ITEM : 0), 0);
}

export function categoryOf(score: number): QuizCategory {
  return score >= PASS_SCORE ? "paham" : "coba-lagi";
}

export type PartResult = { part: QuizPart; right: number; total: number };

/** Jumlah jawaban benar per bagian, menurut urutan bagian pertama kali muncul. */
export function partSummary(items: readonly QuizItem[], picks: Picks): PartResult[] {
  const out: PartResult[] = [];
  items.forEach((item, i) => {
    let row = out.find((r) => r.part === item.part);
    if (!row) {
      row = { part: item.part, right: 0, total: 0 };
      out.push(row);
    }
    row.total += 1;
    if (isCorrect(item, picks[i] ?? null)) row.right += 1;
  });
  return out;
}

/** Soal yang belum terjawab benar, menurut urutan soal. */
export function missedItems(items: readonly QuizItem[], picks: Picks): QuizItem[] {
  return items.filter((item, i) => !isCorrect(item, picks[i] ?? null));
}

/** Modul yang disarankan dibuka lagi: satu kali per modul, menurut urutan soal. */
export function modulesToRevisit(items: readonly QuizItem[], picks: Picks): string[] {
  return [...new Set(missedItems(items, picks).map((item) => item.module.href))];
}
