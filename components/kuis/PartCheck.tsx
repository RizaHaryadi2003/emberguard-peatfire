"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw, X } from "lucide-react";
import { CHECK_TEXT, type QuizItem } from "@/config/kuis";
import { moduleAt, nextAvailableModule } from "@/config/modules-content";
import { missedItems } from "@/lib/quiz";
import { QuizProgress, QuizQuestion, useQuizSession } from "@/components/kuis/QuizParts";

/**
 * Cek singkat di akhir sebuah bagian: tiga soal dengan bentuk dan pembahasan
 * yang sama dengan kuis utama, tetapi tanpa skor (acuan-kuis §7). Tampil
 * sebagai lapisan di atas modul, jadi menutupnya mengembalikan pembaca ke
 * babak terakhir yang sama.
 */
export default function PartCheck({
  href,
  partTitle,
  items,
  onClose,
}: {
  /** Modul tempat cek ini dibuka. */
  href: string;
  partTitle: string;
  items: readonly QuizItem[];
  onClose: () => void;
}) {
  const [done, setDone] = useState(false);
  const layerRef = useRef<HTMLDivElement>(null);
  const finish = useCallback(() => setDone(true), []);
  const scrollTop = useCallback(() => layerRef.current?.scrollTo({ top: 0 }), []);
  const s = useQuizSession(items, { active: !done, onFinish: finish, onScrollTop: scrollTop });
  const next = nextAvailableModule(href);

  // Esc menutup lapisan; fokus dipindah ke lapisan supaya papan ketik langsung dipakai.
  useEffect(() => {
    layerRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const missed = missedItems(items, s.picks);
  const right = items.length - missed.length;

  return (
    <div
      ref={layerRef}
      role="dialog"
      aria-modal="true"
      aria-label={CHECK_TEXT.eyebrow(partTitle)}
      tabIndex={-1}
      className="fixed inset-0 z-[120] overflow-y-auto bg-black text-white outline-none"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col px-5 pb-8 pt-6 sm:px-10 lg:pt-10">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/45">{CHECK_TEXT.eyebrow(partTitle)}</p>
          <button type="button" onClick={onClose} className="btn-mono" aria-label={CHECK_TEXT.close}>
            <X size={14} /> {CHECK_TEXT.close}
          </button>
        </div>

        <div className="mt-5">
          <QuizProgress items={items} picks={s.picks} index={done ? items.length : s.index} />
        </div>

        {!done ? (
          <QuizQuestion
            item={items[s.index]}
            number={s.index + 1}
            total={items.length}
            pick={s.picks[s.index]}
            last={s.last}
            finishLabel={CHECK_TEXT.finish}
            onChoose={s.choose}
            onAdvance={s.advance}
            asideRef={s.asideRef}
          />
        ) : (
          <section className="stage-in mx-auto mt-14 w-full max-w-2xl lg:mt-[12vh]">
            <p className="font-playfair text-5xl italic leading-none sm:text-6xl" style={{ letterSpacing: "-0.03em" }}>
              {CHECK_TEXT.doneTitle(right, items.length)}
            </p>
            <p className="mt-5 text-sm text-white/65">{missed.length === 0 ? CHECK_TEXT.doneAll : CHECK_TEXT.doneSome}</p>
            {missed.length > 0 && (
              <ul className="mt-3 flex flex-col gap-2 border-y border-white/10 py-3">
                {missed.map((q) => (
                  <li key={q.id} className="flex items-baseline justify-between gap-4 text-[13px] leading-snug">
                    <span className="text-white/80">{q.concept}</span>
                    <Link
                      href={q.module.href}
                      className="shrink-0 text-xs text-white/50 underline-offset-4 transition-colors hover:text-white hover:underline"
                    >
                      {moduleAt(q.module.href).title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              {next?.href && (
                <Link href={next.href} className="btn-mono is-on">
                  {CHECK_TEXT.next} <ArrowRight size={14} />
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  s.reset();
                  setDone(false);
                }}
                className="btn-mono"
              >
                <RotateCcw size={14} /> {CHECK_TEXT.again}
              </button>
              <button type="button" onClick={onClose} className="btn-mono">
                {CHECK_TEXT.back}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
