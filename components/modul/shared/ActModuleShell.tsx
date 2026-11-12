"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, MousePointerClick, RotateCcw } from "lucide-react";
import ModuleHook from "@/components/modul/shared/ModuleHook";
import StepAdvance from "@/components/modul/shared/StepAdvance";
import { BACK_TO_MODULE_LIST, moduleAt, nextAvailableModule } from "@/config/modules-content";

/** Jarak usapan ke atas yang menutup layar pembuka di layar sentuh (piksel). */
const HOOK_SWIPE = 30;

/** Isi satu babak, sama bentuknya di semua modul yang memakai kerangka ini. */
export type ShellAct = {
  number: string;
  title: string;
  body: string;
  task: string;
  observe: string;
  term: { word: string; meaning: string };
  hint: string;
  fact: { value: string; caption: string };
};

export type ShellHook = { setup: string; question: string; cta: string; scrollHint: string };

type Props = {
  /** Alamat modul ini; nomor dan judulnya dibaca dari daftar modul. */
  href: string;
  hook: ShellHook;
  acts: readonly ShellAct[];
  act: number;
  onAct: (next: number) => void;
  actDone: readonly boolean[];
  /** Satu baris kemajuan tugas babak ini. */
  progress: string;
  /** Tambahan di bawah kalimat tugas/pengamatan, misalnya hasil tebakan. */
  taskExtra?: ReactNode;
  /** Isi panel kendali kiri bawah. */
  controls: ReactNode;
  /** Gambar utama modul (peta, penampang, dsb.), memenuhi wadahnya. */
  figure: ReactNode;
  onReset: () => void;
  /** Latar halaman di belakang gambar. */
  background?: string;
};

/**
 * Kerangka modul berbabak dengan gambar 2D: layar pembuka, panel cerita
 * dengan kartu tugas, panel kendali, penanda babak, dan panah lanjut.
 *
 * Dipisahkan dari isi modulnya karena polanya harus sama di semua modul —
 * pembaca tidak boleh belajar ulang cara memakai halaman tiap kali pindah
 * modul — sedangkan isinya berbeda sama sekali. Modul 3D yang lebih dulu
 * dibuat (Anatomi, Kanal, Bara, Karbon) memakai pola yang sama dengan
 * kodenya sendiri.
 */
export default function ActModuleShell({
  href,
  hook,
  acts,
  act,
  onAct,
  actDone,
  progress,
  taskExtra,
  controls,
  figure,
  onReset,
  background = "#0b1a24",
}: Props) {
  const meta = moduleAt(href);
  const next = nextAvailableModule(href);
  const [hookOpen, setHookOpen] = useState(true);

  // Layar pembuka tertutup oleh tombolnya, oleh gulir, atau oleh usapan ke atas.
  useEffect(() => {
    if (!hookOpen) return;
    let startY: number | null = null;
    const onWheel = (e: WheelEvent) => e.deltaY > 0 && setHookOpen(false);
    const onTouchStart = (e: TouchEvent) => (startY = e.touches[0].clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (startY !== null && startY - e.touches[0].clientY > HOOK_SWIPE) setHookOpen(false);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [hookOpen]);

  const current = acts[act];
  const isLast = act === acts.length - 1;
  const done = actDone[act];
  const panelFade = `transition-opacity duration-700 ${hookOpen ? "opacity-0" : "opacity-100"}`;
  const goToAct = (i: number) => {
    if (i > act && !done) return;
    onAct(i);
  };

  const advance = isLast ? (
    next?.href ? (
      <StepAdvance nextTitle={`Modul ${next.number} · ${next.title}`} label="Modul berikutnya" href={next.href} forward />
    ) : (
      <StepAdvance {...BACK_TO_MODULE_LIST} />
    )
  ) : (
    <StepAdvance nextTitle={acts[act + 1].title} label="Babak berikutnya" hint={current.hint} locked={!done} onAdvance={() => goToAct(act + 1)} />
  );

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden" style={{ background }}>
      {/* Gambar: di layar lebar mengisi ruang di kanan panel cerita, di layar
          sempit pita di antara panel cerita dan panel kendali. */}
      <div className="absolute bottom-[34%] left-4 right-4 top-[44%] md:bottom-[8%] md:left-[36%] md:right-[4%] md:top-[12%]">{figure}</div>

      <ModuleHook
        open={hookOpen}
        kicker={`Modul ${meta.number} · ${meta.title}`}
        setup={hook.setup}
        question={hook.question}
        cta={hook.cta}
        scrollHint={hook.scrollHint}
        onStart={() => setHookOpen(false)}
      />

      {/* Peredup di sisi kiri agar teks terbaca di atas gambar. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r from-black/80 via-black/30 to-transparent md:w-[55%]" />

      {/* Panel cerita (kiri atas). */}
      <div
        inert={hookOpen}
        className={`pointer-events-none absolute left-5 right-5 top-14 z-20 sm:left-10 md:left-14 md:right-auto md:max-w-[404px] [@media(min-height:651px)]:top-16 [@media(min-height:901px)]:top-24 ${panelFade}`}
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/50">
          Modul {meta.number} · {meta.title}
        </p>
        <div key={act} aria-live="polite">
          <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-[#6fb6d8]">Babak {current.number}</p>
          <h1 className="mt-1 font-playfair text-3xl italic leading-[1.02] text-white [@media(min-height:651px)]:text-4xl" style={{ letterSpacing: "-0.03em" }}>
            {current.title}
          </h1>
          <p className="mt-2 hidden text-sm leading-snug text-white/75 sm:block">{current.body}</p>
          <p className="mt-2 text-[11px] leading-snug text-white/60">
            <span className="font-medium text-[#8fcce8]">{current.term.word}:</span> {current.term.meaning}
          </p>
          <div
            className={`pointer-events-auto mt-3 rounded-2xl border p-3 backdrop-blur-md transition-colors duration-500 ${
              done ? "border-emerald-300/30 bg-emerald-950/40" : "border-[#6fb6d8]/30 bg-black/45"
            }`}
          >
            <p className={`inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] ${done ? "text-emerald-200" : "text-[#8fcce8]"}`}>
              {done ? <Check size={12} /> : <MousePointerClick size={12} />}
              {done ? "Berhasil · perhatikan" : "Tugasmu"}
            </p>
            <p className="mt-1.5 text-[13px] leading-snug text-white">{done ? current.observe : current.task}</p>
            {!done && <p className="mt-1.5 text-[11px] tabular-nums text-white/55">{progress}</p>}
            {taskExtra}
          </div>
          {/* Angka kunci babak, beserta sumbernya. */}
          <div className="mt-3 hidden items-baseline gap-3 border-t border-white/10 pt-3 [@media(min-height:760px)]:sm:flex">
            <span className="shrink-0 font-playfair text-2xl italic text-[#f0a35e]">{current.fact.value}</span>
            <span className="text-[11px] leading-snug text-white/55">{current.fact.caption}</span>
          </div>
        </div>
      </div>

      {/* Panel kendali (kiri bawah). */}
      <div
        inert={hookOpen}
        className={`absolute bottom-14 left-5 right-5 z-20 sm:left-10 md:left-14 md:right-auto md:w-[404px] [@media(min-height:651px)]:bottom-20 ${panelFade}`}
      >
        <div className="rounded-3xl border border-white/10 bg-black/55 p-3.5 shadow-2xl shadow-black/60 backdrop-blur-xl">
          {controls}
          <button
            type="button"
            onClick={onReset}
            className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/20 px-3.5 py-2 text-xs font-medium text-white/75 transition-colors hover:border-white/40 hover:text-white"
          >
            <RotateCcw size={14} /> Mulai dari awal
          </button>
        </div>
      </div>

      {/* Navigasi babak (bawah). */}
      <nav inert={hookOpen} aria-label="Babak modul" className={`absolute bottom-6 left-5 z-20 flex items-end gap-4 sm:left-10 md:left-14 ${panelFade}`}>
        <div className="flex gap-2">
          {acts.map((a, i) => {
            const locked = i > act && !done;
            return (
              <button
                key={a.number}
                type="button"
                onClick={() => goToAct(i)}
                disabled={locked}
                aria-current={i === act ? "step" : undefined}
                title={locked ? current.hint : a.title}
                className={`group flex flex-col items-start gap-2 text-left ${locked ? "cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span
                  className={`h-0.5 w-14 rounded-full transition-colors duration-500 ${
                    i === act ? "bg-white" : i < act ? "bg-[#e8702a]" : locked ? "bg-white/12" : "bg-white/20 group-hover:bg-white/50"
                  }`}
                />
                <span className={`text-[11px] tabular-nums ${i === act ? "text-white" : "text-white/40"}`}>{a.number}</span>
              </button>
            );
          })}
        </div>
        {/* Di ponsel tombolnya baru muncul setelah tugas selesai, di samping
            penanda babak: lebar layar tidak cukup untuk panah terkunci beserta
            arahannya, dan arahannya sudah ada di kartu tugas. */}
        {done &&
          (isLast ? (
            next?.href && (
              <Link
                href={next.href}
                className="mb-1 inline-flex items-center whitespace-nowrap rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur-md md:hidden"
              >
                Modul berikutnya
              </Link>
            )
          ) : (
            <button
              type="button"
              onClick={() => goToAct(act + 1)}
              className="mb-1 inline-flex cursor-pointer items-center whitespace-nowrap rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur-md md:hidden"
            >
              Babak berikutnya
            </button>
          ))}
      </nav>

      {/* Panah lanjut (kanan bawah), hanya di layar lebar. */}
      <div inert={hookOpen} className={`absolute bottom-6 right-5 z-20 hidden sm:right-10 md:block ${panelFade}`}>
        {advance}
      </div>
    </div>
  );
}
