"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Droplets, Hand } from "lucide-react";
import { SQUEEZE_TEXT } from "@/config/gambut-content";
import { formatHoldKg, SQUEEZE_REQUIRED, SQUEEZE_SAMPLES, SQUEEZE_SCALE_KG, type OrganicLayerId } from "@/lib/peat";

type Props = {
  /** Contoh yang sudah habis diperas, urut sesuai waktu diperas. */
  squeezed: readonly OrganicLayerId[];
  onSqueezed: (id: OrganicLayerId) => void;
  reducedMotion: boolean;
};

/** Lama menekan sampai satu contoh habis diperas (detik). */
const SQUEEZE_SECONDS = 2.2;

/** Garis skala pada gelas ukur (kg). */
const TICKS = [0, 10, 20, 30];

/**
 * Panel uji peras untuk tahap "Menyimpan air".
 *
 * Sebelumnya tahap ini satu-satunya yang tidak meminta tindakan apa pun,
 * padahal aturan dasar papan cerita meminta tiap tahap punya satu aksi yang
 * mengubah keadaan yang terlihat. Pembaca memilih contoh dari satu lapisan,
 * lalu menekan dan menahan untuk memerasnya: air menetes ke gelas ukur,
 * banyaknya mengikuti daya tampung air lapisan itu dan warnanya makin pekat
 * untuk gambut yang makin matang. Contoh yang sudah diperas tidak dapat
 * diperas lagi, jadi perbandingannya harus dibuat dengan contoh lain.
 *
 * Saat modul diulang, induknya memasang ulang komponen ini (`key`), sehingga
 * isi gelas dari percobaan sebelumnya ikut kosong.
 */
export default function SqueezeTest({ squeezed, onSqueezed, reducedMotion }: Props) {
  const [selected, setSelected] = useState<OrganicLayerId>("fibrik");
  const [progress, setProgress] = useState<Record<OrganicLayerId, number>>({ fibrik: 0, hemik: 0, saprik: 0 });
  const [holding, setHolding] = useState(false);
  const frame = useRef<number | null>(null);
  const last = useRef(0);

  const sample = SQUEEZE_SAMPLES.find((s) => s.id === selected)!;
  const done = squeezed.includes(selected);
  const value = done ? 1 : progress[selected];

  const stop = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setHolding(false);
  }, []);

  const start = useCallback(() => {
    if (done || frame.current !== null) return;
    setHolding(true);
    if (reducedMotion) {
      setProgress((p) => ({ ...p, [selected]: 1 }));
      onSqueezed(selected);
      setHolding(false);
      return;
    }
    last.current = performance.now();
    // Progres dihitung di sini, bukan di dalam fungsi pembaru state: React
    // boleh menunda fungsi itu, sehingga hasilnya belum tentu ada saat
    // diperiksa pada baris berikutnya.
    let value = progress[selected];
    const tick = (now: number) => {
      const dt = (now - last.current) / 1000;
      last.current = now;
      value = Math.min(1, value + dt / SQUEEZE_SECONDS);
      const current = value;
      setProgress((p) => ({ ...p, [selected]: current }));
      if (current >= 1) {
        frame.current = null;
        setHolding(false);
        onSqueezed(selected);
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [done, onSqueezed, progress, reducedMotion, selected]);

  useEffect(() => stop, [stop]);

  const fill = (value * sample.shownKg) / SQUEEZE_SCALE_KG;
  const remaining = Math.max(0, SQUEEZE_REQUIRED - squeezed.length);
  const text = SQUEEZE_TEXT.samples[selected];

  return (
    <div className="rounded-3xl border border-white/10 bg-black/45 p-5 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-6">
      <style>{`
        @keyframes squeeze-drip { 0% { transform: translateY(-6px); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(38px); opacity: 0 } }
      `}</style>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">{SQUEEZE_TEXT.title}</p>
        <p className="text-[11px] text-white/45">{SQUEEZE_TEXT.pick}</p>
      </div>

      {/* Pilihan contoh */}
      <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label={SQUEEZE_TEXT.pick}>
        {SQUEEZE_SAMPLES.map((s) => {
          const active = s.id === selected;
          const used = squeezed.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                stop();
                setSelected(s.id);
              }}
              className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                active ? "border-white/60 bg-white text-black" : "border-white/15 bg-white/5 text-white/75 hover:bg-white/10"
              }`}
            >
              {used && <Check size={12} />}
              {SQUEEZE_TEXT.samples[s.id].name}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-stretch gap-4">
        {/* Gelas ukur */}
        <div className="relative w-16 shrink-0" aria-hidden="true">
          {holding && !reducedMotion && (
            <div className="absolute -top-1 left-1/2 h-10 w-full -translate-x-1/2 overflow-hidden">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="absolute left-1/2 top-0 h-2 w-1.5 -translate-x-1/2 rounded-full"
                  style={{
                    background: sample.waterColor,
                    animation: `squeeze-drip 0.6s ${i * 0.2}s linear infinite`,
                  }}
                />
              ))}
            </div>
          )}
          <div className="absolute bottom-0 left-1 right-1 top-8 overflow-hidden rounded-b-xl border-x border-b border-white/30 bg-white/[0.03]">
            <div
              className="absolute inset-x-0 bottom-0 transition-[height] duration-100"
              style={{ height: `${fill * 100}%`, background: sample.waterColor }}
            >
              {sample.pulpPasses && value > 0 && (
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(circle,rgba(20,12,6,0.9)_1px,transparent_1.5px)] [background-size:5px_5px]" />
              )}
            </div>
            {TICKS.map((t) => (
              <div key={t} className="absolute left-0 h-px w-2 bg-white/40" style={{ bottom: `${(t / SQUEEZE_SCALE_KG) * 100}%` }} />
            ))}
          </div>
        </div>

        {/* Hasil */}
        <div className="min-w-0 flex-1">
          {/* Yang ditulis adalah rentang dari acuan, bukan isi gelas: isi
              gelas hanya posisi ilustratif di dalam rentang itu, dan angka
              tunggal akan terbaca seperti hasil ukur. */}
          <p className="font-playfair text-2xl italic leading-none text-white tabular-nums sm:text-3xl">{formatHoldKg(sample)}</p>
          <p className="mt-1 text-[11px] leading-snug text-white/45">{SQUEEZE_TEXT.scale}</p>
          <p className="mt-2 text-xs leading-relaxed text-white/80">{done ? text.water : SQUEEZE_TEXT.before}</p>
        </div>
      </div>

      {/* Tombol tekan-tahan */}
      <button
        type="button"
        disabled={done}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          start();
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !e.repeat) {
            e.preventDefault();
            start();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === " " || e.key === "Enter") stop();
        }}
        onContextMenu={(e) => e.preventDefault()}
        className={`mt-4 inline-flex w-full touch-none select-none items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium transition-colors ${
          done
            ? "cursor-default bg-white/5 text-white/40"
            : holding
              ? "cursor-pointer bg-sky-400/30 text-white ring-1 ring-sky-300/50"
              : "cursor-pointer bg-sky-400/15 text-sky-100 ring-1 ring-sky-300/30 hover:bg-sky-400/25"
        }`}
      >
        {done ? <Check size={15} /> : holding ? <Droplets size={15} /> : <Hand size={15} />}
        {done ? SQUEEZE_TEXT.done : holding ? SQUEEZE_TEXT.holding : SQUEEZE_TEXT.hold}
      </button>

      <p className="mt-3 text-[11px] leading-relaxed text-white/55" aria-live="polite">
        {remaining > 0 ? SQUEEZE_TEXT.remaining(remaining) : SQUEEZE_TEXT.compared}
      </p>
    </div>
  );
}
