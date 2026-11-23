"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import { OPTION_LETTERS, QUIZ_TEXT, type QuizItem } from "@/config/kuis";
import { MODULE_PARTS, moduleAt } from "@/config/modules-content";
import { isCorrect, type Picks } from "@/lib/quiz";

/**
 * Bagian kuis yang dipakai bersama oleh kuis utama (`QuizRunner`) dan cek
 * singkat di akhir bagian (`PartCheck`), supaya pembaca melihat bentuk soal
 * dan pembahasan yang sama di kedua tempat.
 */

/** Jingga penanda jawaban salah, sama dengan warna "terbakar" Modul Musim Api. */
export const WRONG = "#ff6a3d";
/** Jingga angka kunci di semua modul. */
export const ACCENT = "#f0a35e";

export const partTitle = (id: string) => MODULE_PARTS.find((p) => p.id === id)?.title ?? id;

/**
 * Keadaan satu putaran soal: soal ke berapa, jawaban tiap soal, dan papan
 * ketik (A–D atau 1–4 memilih, Enter lanjut). `onScrollTop` dipanggil saat
 * soal berganti, karena kuis utama menggulir jendela sedangkan cek singkat
 * menggulir lapisannya sendiri.
 */
export function useQuizSession(
  items: readonly QuizItem[],
  { active, onFinish, onScrollTop }: { active: boolean; onFinish: () => void; onScrollTop: () => void },
) {
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<Picks>(() => items.map(() => null));
  const asideRef = useRef<HTMLElement>(null);
  const last = index === items.length - 1;

  const choose = useCallback(
    (i: number) => {
      if (!active || picks[index] !== null) return;
      setPicks((p) => p.map((v, k) => (k === index ? i : v)));
      // Di layar sempit pembahasan ada di bawah pilihan: bawa ke sana.
      if (window.matchMedia("(max-width: 1023px)").matches) {
        requestAnimationFrame(() => asideRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      }
    },
    [active, picks, index],
  );

  const advance = useCallback(() => {
    if (picks[index] === null) return;
    if (last) onFinish();
    else setIndex((i) => i + 1);
    onScrollTop();
  }, [picks, index, last, onFinish, onScrollTop]);

  const reset = useCallback(() => {
    setPicks(items.map(() => null));
    setIndex(0);
  }, [items]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const byLetter = "abcd".indexOf(k);
      const byNumber = "1234".indexOf(k);
      if (byLetter >= 0) choose(byLetter);
      else if (byNumber >= 0) choose(byNumber);
      else if (k === "enter") advance();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, choose, advance]);

  return { index, picks, last, choose, advance, reset, asideRef };
}

/** Satu garis per soal; putih bila tepat, jingga bila belum, terang pada soal yang sedang dibuka. */
export function QuizProgress({ items, picks, index, right }: { items: readonly QuizItem[]; picks: Picks; index: number; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <ol className="flex flex-1 gap-1.5" aria-label="Kemajuan kuis">
        {items.map((q, i) => {
          const p = picks[i];
          const color = p === null ? (i === index ? "rgb(255 255 255 / 0.55)" : "rgb(255 255 255 / 0.12)") : isCorrect(q, p) ? "#fff" : WRONG;
          return <li key={q.id} className="h-1 flex-1 rounded-full transition-colors" style={{ background: color }} />;
        })}
      </ol>
      {right}
    </div>
  );
}

/**
 * Soal dan pembahasannya: pilihan di kiri, pembahasan di kanan (di bawah
 * pada layar sempit). Pembahasan baru tampil sesudah memilih (acuan-kuis §5).
 */
export function QuizQuestion({
  item,
  number,
  total,
  pick,
  last,
  finishLabel,
  onChoose,
  onAdvance,
  asideRef,
}: {
  item: QuizItem;
  number: number;
  total: number;
  pick: number | null;
  last: boolean;
  finishLabel: string;
  onChoose: (i: number) => void;
  onAdvance: () => void;
  asideRef: RefObject<HTMLElement | null>;
}) {
  const answered = pick !== null;
  const right = isCorrect(item, pick);
  const mod = moduleAt(item.module.href);

  return (
    <div key={item.id} className="stage-in mt-6 grid gap-6 lg:mt-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start lg:gap-10">
      {/* Kiri: soal dan pilihan. */}
      <section className="flex flex-col">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/45">
          {QUIZ_TEXT.question(number, total)} · {partTitle(item.part)}
        </p>
        <h2 className="mt-3 text-[17px] font-medium leading-snug text-white sm:text-xl lg:text-[21px]">{item.stem}</h2>

        <ul className="mt-5 flex flex-col gap-2.5 lg:mt-6">
          {item.options.map((o, i) => {
            const isKey = i === item.answer;
            const isPick = i === pick;
            let border = "rgb(255 255 255 / 0.16)";
            let tone = "text-white/85";
            if (answered) {
              if (isKey) {
                border = "#fff";
                tone = "text-white";
              } else if (isPick) {
                border = WRONG;
              } else tone = "text-white/35";
            }
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => onChoose(i)}
                  disabled={answered}
                  aria-pressed={isPick}
                  className={`group flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-[13.5px] leading-snug transition-colors sm:text-sm ${tone} ${
                    answered ? "cursor-default" : "hover:border-white/45 hover:bg-white/[0.04]"
                  }`}
                  style={{ borderColor: border }}
                >
                  <span
                    className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold"
                    style={{
                      borderColor: answered && (isKey || isPick) ? border : "rgb(255 255 255 / 0.3)",
                      background: answered && isKey ? "#fff" : answered && isPick ? WRONG : "transparent",
                      color: answered && (isKey || isPick) ? "#0a0a0a" : undefined,
                    }}
                    aria-hidden="true"
                  >
                    {answered && isKey ? <Check size={12} strokeWidth={3} /> : answered && isPick ? <X size={12} strokeWidth={3} /> : OPTION_LETTERS[i]}
                  </span>
                  <span>{o.text}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Kanan: pembahasan. */}
      <aside
        ref={asideRef}
        className={`scroll-mt-20 flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 lg:min-h-[25rem] lg:p-6 ${answered ? "flex" : "hidden lg:flex"}`}
        aria-live="polite"
      >
        {!answered ? (
          <p className="m-auto max-w-xs text-center text-sm leading-relaxed text-white/40">{QUIZ_TEXT.pick}</p>
        ) : (
          <div className="stage-in flex flex-1 flex-col">
            <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: right ? "#fff" : WRONG }}>
              {right ? <Check size={16} strokeWidth={3} /> : <X size={16} strokeWidth={3} />}
              {right ? QUIZ_TEXT.right : QUIZ_TEXT.wrong}
              {!right && <span className="font-normal text-white/55">· {QUIZ_TEXT.correctIs(OPTION_LETTERS[item.answer])}</span>}
            </p>

            {!right && pick !== null && item.options[pick].note && (
              <div className="mt-4 border-l-2 pl-3" style={{ borderColor: WRONG }}>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">
                  {QUIZ_TEXT.yourPick} · {OPTION_LETTERS[pick]}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-white/80">{item.options[pick].note}</p>
              </div>
            )}

            <p className="mt-4 text-[13px] leading-relaxed text-white/80">{item.core}</p>

            <div className="mt-4 rounded-xl bg-white/[0.05] px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em]" style={{ color: ACCENT }}>
                {QUIZ_TEXT.takeaway}
              </p>
              <p className="mt-1 font-playfair text-[17px] italic leading-snug text-white">{item.takeaway}</p>
            </div>

            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
              <Link href={item.module.href} className="text-xs text-white/55 underline-offset-4 transition-colors hover:text-white hover:underline">
                {QUIZ_TEXT.learnMore}: {mod.title} · {item.module.act}
              </Link>
              <button type="button" onClick={onAdvance} className="btn-mono is-on">
                {last ? finishLabel : QUIZ_TEXT.next} <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
