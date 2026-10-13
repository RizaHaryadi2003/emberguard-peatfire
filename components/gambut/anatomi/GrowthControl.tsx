"use client";

import { Hourglass, Layers, Sprout } from "lucide-react";
import { GROWTH_STATUS_TEXT } from "@/config/gambut-content";
import {
  formatYears,
  getDeepestLayer,
  getGrowthStatus,
  getPeatThickness,
  PEAT_GROWTH_MM_PER_YEAR,
  PEAT_MAX_YEARS,
  PEAT_MIN_THICKNESS_CM,
  PEAT_MIN_YEARS,
} from "@/lib/peat";

type Props = {
  years: number;
  onChange: (years: number) => void;
  /** Dipanggil saat pengguna mulai menyentuh pengatur (menghentikan demo otomatis). */
  onInteract: () => void;
};

const STATUS_STYLE = {
  kosong: "bg-white/10 text-white/70 ring-white/20",
  belum: "bg-amber-400/15 text-amber-200 ring-amber-300/30",
  gambut: "bg-emerald-400/15 text-emerald-200 ring-emerald-300/30",
} as const;

/** Butir pengatur bergerak satu abad sekali: cukup halus, tanpa angka ganjil. */
const STEP_YEARS = 10;

/**
 * Panel pengatur umur timbunan untuk tahap "Hutan di atas spons".
 *
 * Sebahasa dengan WaterControl: angka besar di kiri, lencana keadaan di kanan,
 * dan satu penanda tetap pada treknya. Bedanya, penanda di sini bukan ambang
 * bahaya melainkan ambang penamaan — titik saat timbunan sah disebut gambut.
 */
export default function GrowthControl({ years, onChange, onInteract }: Props) {
  const thickness = getPeatThickness(years);
  const status = getGrowthStatus(thickness);
  const text = GROWTH_STATUS_TEXT[status];
  const deepest = getDeepestLayer(thickness);
  const valuePct = (years / PEAT_MAX_YEARS) * 100;
  const limitPct = (PEAT_MIN_YEARS / PEAT_MAX_YEARS) * 100;

  return (
    <div className="rounded-3xl border border-white/10 bg-black/45 p-5 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-6">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">Umur timbunan</p>
          <p className="mt-1 whitespace-nowrap font-playfair text-4xl italic leading-none text-white tabular-nums sm:text-5xl">
            {formatYears(years)}
            <span className="ml-1.5 font-sans text-base not-italic text-white/50">tahun</span>
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors duration-300 ${STATUS_STYLE[status]}`}
          role="status"
        >
          {status === "kosong" ? <Hourglass size={14} /> : status === "belum" ? <Sprout size={14} /> : <Layers size={14} />}
          {text.label}
        </span>
      </div>

      <div className="relative mt-5">
        {/* Trek: terisi dari kiri mengikuti umur, dengan penanda tetap pada
            ambang 50 cm — batas saat lahan ini sah disebut gambut. */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#8a7a5e] via-[#b08a4e] to-[#5f8f63]"
            style={{ width: `${valuePct}%` }}
          />
        </div>
        <div
          className="pointer-events-none absolute top-1/2 h-4 w-px -translate-y-1/2 bg-white/70"
          style={{ left: `${limitPct}%` }}
        />
        <input
          type="range"
          min={0}
          max={PEAT_MAX_YEARS}
          step={STEP_YEARS}
          value={Math.round(years)}
          onPointerDown={onInteract}
          onKeyDown={onInteract}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Umur timbunan gambut"
          aria-valuetext={`${formatYears(years)} tahun, tebal ${Math.round(thickness * 100)} sentimeter, ${text.label}`}
          className="water-slider relative z-10 w-full"
        />
        <div className="relative mt-2 h-4 text-[10px] tabular-nums text-white/40">
          <span className="absolute left-0">0</span>
          <span className="absolute -translate-x-1/2 whitespace-nowrap text-white/70" style={{ left: `${limitPct}%` }}>
            {PEAT_MIN_THICKNESS_CM} cm
          </span>
          <span className="absolute right-0">{formatYears(PEAT_MAX_YEARS)} tahun</span>
        </div>
      </div>

      {/* Tebal dan kematangan: dua akibat yang berubah bersama umur. */}
      <div className="mt-4 flex flex-wrap items-baseline gap-4 border-t border-white/10 pt-3 text-xs">
        <span className="whitespace-nowrap text-white/45">
          Tebal{" "}
          <span className="font-medium tabular-nums text-white/85">{Math.round(thickness * 100)} cm</span>
        </span>
        <span className="whitespace-nowrap text-white/45">
          Terdalam <span className="font-medium text-white/85">{deepest ? deepest.name : "—"}</span>
        </span>
        <span className="ml-auto hidden whitespace-nowrap text-white/35 sm:inline">
          ± {PEAT_GROWTH_MM_PER_YEAR} mm/tahun
        </span>
      </div>

      <p className="mt-3 min-h-[3.5em] text-sm leading-relaxed text-white/75">{text.message}</p>
    </div>
  );
}
