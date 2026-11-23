"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, RotateCcw, X } from "lucide-react";
import { OPTION_LETTERS, QUIZ_TEXT, type QuizItem } from "@/config/kuis";
import { MODULE_PARTS, moduleAt } from "@/config/modules-content";
import { categoryOf, isCorrect, missedItems, partSummary, scoreOf, type Picks } from "@/lib/quiz";

/** Jingga penanda jawaban salah, sama dengan warna "terbakar" Modul Musim Api. */
const WRONG = "#ff6a3d";
/** Jingga angka kunci di semua modul. */
const ACCENT = "#f0a35e";

type Phase = "intro" | "question" | "result";

const partTitle = (id: string) => MODULE_PARTS.find((p) => p.id === id)?.title ?? id;

/**
 * Kuis pilihan ganda: pembuka → soal satu per satu → hasil.
 *
 * Sengaja tanpa animasi selain pudar singkat saat soal berganti
 * (acuan-kuis §0): pembaca datang untuk menjawab dengan cepat. Setiap soal
 * hanya bisa dijawab sekali; pembahasan baru tampil sesudah memilih
 * (acuan-kuis §5, pedoman Shute 2008).
 */
export default function QuizRunner({ items }: { items: readonly QuizItem[] }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<Picks>(() => items.map(() => null));
  const asideRef = useRef<HTMLElement>(null);

  const item = items[index];
  const pick = picks[index];
  const answered = pick !== null;
  const score = scoreOf(items, picks);
  const last = index === items.length - 1;

  const choose = useCallback(
    (i: number) => {
      if (phase !== "question" || picks[index] !== null) return;
      setPicks((p) => p.map((v, k) => (k === index ? i : v)));
      // Di layar sempit pembahasan ada di bawah pilihan: bawa ke sana.
      if (window.matchMedia("(max-width: 1023px)").matches) {
        requestAnimationFrame(() => asideRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      }
    },
    [phase, picks, index],
  );

  const advance = useCallback(() => {
    if (picks[index] === null) return;
    if (last) setPhase("result");
    else setIndex((i) => i + 1);
    window.scrollTo({ top: 0 });
  }, [picks, index, last]);

  const restart = () => {
    setPicks(items.map(() => null));
    setIndex(0);
    setPhase("question");
  };

  // Papan ketik: A–D atau 1–4 untuk memilih, Enter untuk lanjut.
  useEffect(() => {
    if (phase !== "question") return;
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
  }, [phase, choose, advance]);

  if (phase === "intro") return <Intro count={items.length} onStart={() => setPhase("question")} />;
  if (phase === "result") return <Result items={items} picks={picks} onRestart={restart} />;

  const right = isCorrect(item, pick);
  const mod = moduleAt(item.module.href);

  return (
    <main className="min-h-[100dvh] bg-black px-5 pb-8 pt-20 text-white sm:px-10 lg:pt-24">
      <div className="mx-auto flex w-full max-w-6xl flex-col">
        {/* Kemajuan: satu garis per soal, ditandai benar/salah setelah dijawab. */}
        <div className="flex items-center gap-4">
          <ol className="flex flex-1 gap-1.5" aria-label="Kemajuan kuis">
            {items.map((q, i) => {
              const p = picks[i];
              const color = p === null ? (i === index ? "rgb(255 255 255 / 0.55)" : "rgb(255 255 255 / 0.12)") : isCorrect(q, p) ? "#fff" : WRONG;
              return <li key={q.id} className="h-1 flex-1 rounded-full transition-colors" style={{ background: color }} />;
            })}
          </ol>
          <span className="shrink-0 text-xs tabular-nums text-white/60">{QUIZ_TEXT.score(score)}</span>
        </div>

        <div key={item.id} className="stage-in mt-6 grid gap-6 lg:mt-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start lg:gap-10">
          {/* Kiri: soal dan pilihan. */}
          <section className="flex flex-col">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/45">
              {QUIZ_TEXT.question(index + 1, items.length)} · {partTitle(item.part)}
            </p>
            <h1 className="mt-3 text-[17px] font-medium leading-snug text-white sm:text-xl lg:text-[21px]">{item.stem}</h1>

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
                    tone = "text-white/85";
                  } else tone = "text-white/35";
                }
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => choose(i)}
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

          {/* Kanan: pembahasan, baru tampil sesudah memilih. */}
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
                  <button type="button" onClick={advance} className="btn-mono is-on">
                    {last ? QUIZ_TEXT.finish : QUIZ_TEXT.next} <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

/** Layar pembuka kuis. */
function Intro({ count, onStart }: { count: number; onStart: () => void }) {
  return (
    <main className="flex min-h-[100dvh] items-center bg-black px-5 text-white sm:px-10">
      <div className="mx-auto w-full max-w-3xl">
        <p className="hero-anim hero-fade text-[11px] font-medium uppercase tracking-[0.22em] text-white/45" style={{ animationDelay: "0.1s" }}>
          {QUIZ_TEXT.eyebrow} · {QUIZ_TEXT.meta.replace("10", String(count))}
        </p>
        <h1
          className="hero-anim hero-reveal mt-4 font-playfair text-5xl italic leading-[0.95] sm:text-7xl"
          style={{ letterSpacing: "-0.04em", animationDelay: "0.2s" }}
        >
          {QUIZ_TEXT.title}
        </h1>
        <p className="hero-anim hero-fade mt-6 max-w-md text-sm leading-relaxed text-white/65 sm:text-[15px]" style={{ animationDelay: "0.4s" }}>
          {QUIZ_TEXT.lead}
        </p>
        <div className="hero-anim hero-fade mt-10 flex flex-wrap items-center gap-4" style={{ animationDelay: "0.55s" }}>
          <button type="button" onClick={onStart} className="btn-mono is-on !px-6 !py-3 !text-sm">
            {QUIZ_TEXT.start} <ArrowRight size={16} />
          </button>
          <p className="text-xs text-white/45">
            {QUIZ_TEXT.suggestion}{" "}
            <Link href="/modul" className="text-white/70 underline underline-offset-4 hover:text-white">
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
    <main className="min-h-[100dvh] bg-black px-5 pb-8 pt-20 text-white sm:px-10 lg:pt-24">
      <div className="stage-in mx-auto grid w-full max-w-6xl gap-10 lg:mt-[8vh] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <section>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/45">{QUIZ_TEXT.resultEyebrow}</p>
          <p className="mt-4 flex items-baseline gap-4">
            <span className="pl-3 pr-2 font-playfair text-8xl italic leading-none sm:text-9xl" style={{ letterSpacing: "-0.04em" }}>
              {score}
            </span>
            <span className="text-lg font-medium" style={{ color: passed ? "#fff" : ACCENT }}>
              {passed ? QUIZ_TEXT.passed : QUIZ_TEXT.retry}
            </span>
          </p>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/65">{passed ? QUIZ_TEXT.passedLead : QUIZ_TEXT.retryLead}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={onRestart} className="btn-mono is-on">
              <RotateCcw size={14} /> {QUIZ_TEXT.again}
            </button>
            <Link href="/modul" className="btn-mono">
              {QUIZ_TEXT.modules}
            </Link>
          </div>
        </section>

        <section className="flex flex-col gap-8">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">{QUIZ_TEXT.perPart}</p>
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
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">{QUIZ_TEXT.wrongConcepts}</p>
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
