import { describe, expect, it } from "vitest";
import { MAIN_QUIZ, PART_CHECKS, type QuizItem } from "@/config/kuis";
import { MODULE_PARTS, MODULES } from "@/config/modules-content";
import { categoryOf, isCorrect, missedItems, modulesToRevisit, partCheckFor, partSummary, scoreOf } from "@/lib/quiz";

const allRight = MAIN_QUIZ.map((q) => q.answer);
const allWrong = MAIN_QUIZ.map((q) => (q.answer + 1) % 4);

describe("penilaian kuis", () => {
  it("memberi 100 bila semua benar dan 0 bila semua salah", () => {
    expect(scoreOf(MAIN_QUIZ, allRight)).toBe(100);
    expect(scoreOf(MAIN_QUIZ, allWrong)).toBe(0);
  });

  it("menghitung soal yang belum dijawab sebagai salah", () => {
    expect(isCorrect(MAIN_QUIZ[0], null)).toBe(false);
    expect(scoreOf(MAIN_QUIZ, [])).toBe(0);
  });

  it("memakai batas 70 untuk kategori Paham", () => {
    expect(categoryOf(70)).toBe("paham");
    expect(categoryOf(60)).toBe("coba-lagi");
    expect(categoryOf(100)).toBe("paham");
    expect(categoryOf(0)).toBe("coba-lagi");
  });

  it("menyusun hasil per bagian dan modul yang perlu dibuka lagi tanpa ganda", () => {
    // Salah di U-05 dan U-06: keduanya bagian Api, U-05 dan U-06 sama-sama modul Bara.
    const picks = allRight.map((a, i) => (i === 4 || i === 5 ? (a + 1) % 4 : a));
    expect(scoreOf(MAIN_QUIZ, picks)).toBe(80);
    expect(partSummary(MAIN_QUIZ, picks).find((r) => r.part === "api")).toEqual({ part: "api", right: 0, total: 2 });
    expect(missedItems(MAIN_QUIZ, picks).map((q) => q.id)).toEqual(["U-05", "U-06"]);
    expect(modulesToRevisit(MAIN_QUIZ, picks)).toEqual(["/modul/bara"]);
  });
});

/** Aturan bentuk soal dari docs/md/acuan-kuis.md (§2 pedoman A, §5, §7). */
function checkItem(q: QuizItem) {
  expect(q.options).toHaveLength(4);
  q.options.forEach((o, i) => {
    expect(o.text.length).toBeGreaterThan(0);
    // Kunci tanpa catatan; setiap pengecoh punya penjelasannya sendiri.
    if (i === q.answer) expect(o.note).toBeUndefined();
    else expect(o.note?.length ?? 0).toBeGreaterThan(0);
  });
  // Pilihan tidak boleh kembar.
  expect(new Set(q.options.map((o) => o.text)).size).toBe(4);
  // Modul yang dirujuk harus ada dan sudah bisa dibuka.
  const target = MODULES.find((m) => m.href === q.module.href);
  expect(target?.available, `${q.id} → ${q.module.href}`).toBe(true);
}

describe("data soal", () => {
  it("kuis utama berisi 10 soal, dua per bagian, dengan ID unik", () => {
    expect(MAIN_QUIZ).toHaveLength(10);
    for (const part of MODULE_PARTS) {
      expect(MAIN_QUIZ.filter((q) => q.part === part.id), part.id).toHaveLength(2);
    }
    expect(new Set(MAIN_QUIZ.map((q) => q.id)).size).toBe(10);
  });

  it("setiap soal memenuhi aturan bentuk", () => {
    MAIN_QUIZ.forEach(checkItem);
    Object.values(PART_CHECKS).flat().forEach((q) => q && checkItem(q));
  });

  it("letak kunci kuis utama tersebar, tidak ada huruf yang lebih dari tiga kali", () => {
    for (const letter of [0, 1, 2, 3]) {
      expect(MAIN_QUIZ.filter((q) => q.answer === letter).length).toBeLessThanOrEqual(3);
    }
  });

  it("cek singkat berisi tiga soal per bagian, berbeda dari kuis utama", () => {
    const mainIds = new Set(MAIN_QUIZ.map((q) => q.id));
    for (const [part, items] of Object.entries(PART_CHECKS)) {
      expect(items, part).toHaveLength(3);
      items?.forEach((q) => {
        expect(q.part).toBe(part);
        expect(mainIds.has(q.id)).toBe(false);
      });
    }
  });
});

describe("letak cek singkat", () => {
  it("hanya di modul terakhir bagian yang semua modulnya sudah ada", () => {
    expect(partCheckFor("/modul/hutan-rawa")?.part).toBe("gambut");
    expect(partCheckFor("/modul/musim-api")?.part).toBe("kering");
    // Bukan modul terakhir bagiannya.
    expect(partCheckFor("/modul/sekitarmu")).toBeNull();
    expect(partCheckFor("/modul/kanal")).toBeNull();
    // Bara modul terakhir bagian Api, tetapi Siapa yang Menyalakan? belum ada.
    expect(partCheckFor("/modul/bara")).toBeNull();
    expect(partCheckFor("/modul/karbon")).toBeNull();
  });
});
