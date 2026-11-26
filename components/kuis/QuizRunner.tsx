"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import SectionBackdrop from "@/components/layout/SectionBackdrop";
import { ArrowRight, RotateCcw } from "lucide-react";
import { QUIZ_TEXT, type QuizItem } from "@/config/kuis";
import { moduleAt } from "@/config/modules-content";
import { categoryOf, missedItems, partSummary, scoreOf, type Picks } from "@/lib/quiz";
import { ACCENT, QuizProgress, QuizQuestion, partTitle, useQuizSession } from "@/components/kuis/QuizParts";

type Phase = "intro" | "question" | "result";

const scrollWindowTop = () => window.scrollTo({ top: 0 });

/**
 * Kuis utama: pembuka → soal satu per satu → hasil.
 *
 * Sengaja tanpa animasi selain pudar singkat saat soal berganti
 * (acuan-kuis §0): pembaca datang untuk menjawab dengan cepat. Setiap soal
 * hanya bisa dijawab sekali; pembahasan baru tampil sesudah memilih
 * (acuan-kuis §5, pedoman Shute 2008).
 */
export default function QuizRunner({ items }: { items: readonly QuizItem[] }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const finish = useCallback(() => setPhase("result"), []);
  const s = useQuizSession(items, { active: phase === "question", onFinish: finish, onScrollTop: scrollWindowTop });

  const restart = () => {
    s.reset();
    setPhase("question");
  };

  if (phase === "intro") return <Intro count={items.length} onStart={() => setPhase("question")} />;
  if (phase === "result") return <Result items={items} picks={s.picks} onRestart={restart} />;

  return (
    <main className="relative isolate min-h-[100dvh] px-5 pb-8 pt-20 text-white sm:px-10 lg:pt-24">
      <SectionBackdrop />
      <div className="mx-auto flex w-full max-w-6xl flex-col">
        <QuizProgress
          items={items}
          picks={s.picks}
          index={s.index}
          right={<span className="shrink-0 text-xs tabular-nums text-white/60">{QUIZ_TEXT.score(scoreOf(items, s.picks))}</span>}
        />
        <QuizQuestion
          item={items[s.index]}
          number={s.index + 1}
          total={items.length}
          pick={s.picks[s.index]}
          last={s.last}
          finishLabel={QUIZ_TEXT.finish}
          onChoose={s.choose}
          onAdvance={s.advance}
          asideRef={s.asideRef}
        />
      </div>
    </main>
  );
}

/** Layar pembuka kuis. */
function Intro({ count, onStart }: { count: number; onStart: () => void }) {
  return (
    <main className="relative isolate flex min-h-[100dvh] items-center px-5 text-white sm:px-10">
      <SectionBackdrop />
      <div className="mx-auto w-full max-w-3xl">
        <p className="hero-anim hero-fade type-eyebrow text-white/80" style={{ animationDelay: "0.1s" }}>
          {QUIZ_TEXT.eyebrow} · {QUIZ_TEXT.meta.replace("10", String(count))}
        </p>
        <h1 className="hero-anim hero-reveal type-display mt-4 text-[#f1f1f1]" style={{ animationDelay: "0.2s" }}>
          {QUIZ_TEXT.title}
        </h1>
        <p className="hero-anim hero-fade type-lead mt-6 max-w-md text-white/90" style={{ animationDelay: "0.4s" }}>
          {QUIZ_TEXT.lead}
        </p>
        <div className="hero-anim hero-fade mt-10 flex flex-wrap items-center gap-4" style={{ animationDelay: "0.55s" }}>
          <button type="button" onClick={onStart} className="btn-cream">
            {QUIZ_TEXT.start} <ArrowRight size={16} />
          </button>
          <p className="font-marcellus text-[12px] text-white/80">
            {QUIZ_TEXT.suggestion}{" "}
            <Link href="/modul" className="text-white underline underline-offset-4 hover:text-white/80">
              {QUIZ_TEXT.toModules}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

/** Halaman hasil: skor, kategori, pemahaman per bagian, dan konsep yang masih keliru. */
function Result({ items, picks, onRestart }: { items: readonly QuizItem[]; picks: Picks; onRestart: () => void }) {
  const score = scoreOf(items, picks);
  const passed = categoryOf(score) === "paham";
  const parts = partSummary(items, picks);
  const missed = missedItems(items, picks);

  return (
    <main className="relative isolate min-h-[100dvh] px-5 pb-8 pt-20 text-white sm:px-10 lg:pt-24">
      <SectionBackdrop />
      <div className="stage-in mx-auto grid w-full max-w-6xl gap-10 lg:mt-[8vh] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <section>
          <p className="type-eyebrow text-white/80">{QUIZ_TEXT.resultEyebrow}</p>
          <p className="mt-4 flex items-baseline gap-4">
            <span className="font-marcellus text-7xl leading-none text-[#f1f1f1] sm:text-8xl">
              {score}
            </span>
            <span className="type-title" style={{ color: passed ? "#fff" : ACCENT }}>
              {passed ? QUIZ_TEXT.passed : QUIZ_TEXT.retry}
            </span>
          </p>
          <p className="type-lead mt-5 max-w-sm text-white/90">{passed ? QUIZ_TEXT.passedLead : QUIZ_TEXT.retryLead}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={onRestart} className="btn-cream">
              <RotateCcw size={14} /> {QUIZ_TEXT.again}
            </button>
            <Link href="/modul" className="btn-line">
              {QUIZ_TEXT.modules}
            </Link>
          </div>
        </section>

        <section className="flex flex-col gap-8">
          <div>
            <p className="type-eyebrow text-white/80">{QUIZ_TEXT.perPart}</p>
            <ul className="mt-3 divide-y divide-white/10 border-y border-white/10">
              {parts.map((r) => (
                <li key={r.part} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-white/85">{partTitle(r.part)}</span>
                  <span className="flex items-center gap-3">
                    <span className="flex gap-1" aria-hidden="true">
                      {Array.from({ length: r.total }, (_, i) => (
                        <span key={i} className="h-2.5 w-6 rounded-full" style={{ background: i < r.right ? "#fff" : "rgb(255 255 255 / 0.14)" }} />
                      ))}
                    </span>
                    <span className="w-8 text-right tabular-nums text-white/60">
                      {r.right}/{r.total}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="type-eyebrow text-white/80">{QUIZ_TEXT.wrongConcepts}</p>
            {missed.length === 0 ? (
              <p className="mt-3 text-sm text-white/65">{QUIZ_TEXT.allRight}</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
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
          </div>
        </section>
      </div>
    </main>
  );
}
