import type { ReactNode } from "react";

/**
 * Trek penggeser bersama semua modul, sama persis dengan penggeser Modul
 * Anatomi: jalur tipis, isian dari kiri mengikuti nilai, dan garis putih
 * tipis pada ambang penting. `.water-slider` (globals.css) menyembunyikan
 * trek bawaan peramban dan menggambar pegangan bulat putihnya.
 *
 * - `tone="water"`: gradasi air ke kering, untuk penggeser yang menyangkut
 *   muka air atau kekeringan (sama dengan pengatur muka air Anatomi).
 * - `tone="neutral"`: isian putih, untuk waktu, jarak, luas, dan sejenisnya.
 */
const FILL = {
  water: "bg-gradient-to-r from-sky-400 via-amber-300 to-[#e8702a]",
  neutral: "bg-white/70",
} as const;

type Props = {
  /** Isian trek, 0–100. */
  pct: number;
  /** Letak garis ambang, 0–100. */
  ticks?: readonly number[];
  tone?: keyof typeof FILL;
  className?: string;
  /** Elemen `<input type="range" className="water-slider relative z-10 w-full">`. */
  children: ReactNode;
};

export default function SliderTrack({ pct, ticks = [], tone = "neutral", className = "", children }: Props) {
  return (
    <div className={`relative ${className}`}>
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${FILL[tone]}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>
      {ticks.map((t) => (
        <div key={t} className="pointer-events-none absolute top-1/2 h-4 w-px -translate-y-1/2 bg-white/70" style={{ left: `${t}%` }} />
      ))}
      {children}
    </div>
  );
}
