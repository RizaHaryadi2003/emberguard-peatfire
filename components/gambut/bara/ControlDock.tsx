"use client";

import { Droplets, FastForward, Pause, ShowerHead, Waves } from "lucide-react";
import { SUPPRESSION_TEXT, TIME_SPEEDS } from "@/config/bara-content";
import { formatDay, formatElapsed } from "@/lib/smolder";
import { PROFILE_DEPTH } from "@/lib/peat";

/** Batas pengatur muka air tanah pada antarmuka (cm). */
export const WATER_MIN_CM = 0;
export const WATER_MAX_CM = Math.round(PROFILE_DEPTH * 100) - 40;

type Props = {
  hours: number;
  speedIndex: number;
  onSpeed: (index: number) => void;
  waterCm: number;
  onWater: (cm: number) => void;
  /** Tombol pemadaman: tampil mulai babak 03. */
  showDouse: boolean;
  onDouse: () => void;
  dousing: boolean;
  /** Tombol pembasahan: tampil pada babak 04. */
  showRewet: boolean;
  onRewet: () => void;
};

/**
 * Panel kendali utama: kecepatan waktu, muka air tanah, dan tombol pemadaman.
 * Semua kendali di sini langsung mengubah jalannya simulasi.
 */
export default function ControlDock({
  hours,
  speedIndex,
  onSpeed,
  waterCm,
  onWater,
  showDouse,
  onDouse,
  dousing,
  showRewet,
  onRewet,
}: Props) {
  const valuePct = ((waterCm - WATER_MIN_CM) / (WATER_MAX_CM - WATER_MIN_CM)) * 100;
  const limitPct = ((40 - WATER_MIN_CM) / (WATER_MAX_CM - WATER_MIN_CM)) * 100;

  return (
    <div className="rounded-3xl border border-white/10 bg-black/45 p-4 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-5">
      {/* Waktu */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">Waktu berjalan</p>
          <p className="mt-1 whitespace-nowrap font-playfair text-2xl italic leading-none text-white">
            {formatDay(hours)}
            <span className="ml-2 font-sans text-[11px] not-italic text-white/50">{formatElapsed(hours)}</span>
          </p>
        </div>
        <div className="flex shrink-0 gap-1 rounded-full border border-white/15 bg-black/30 p-1">
          {TIME_SPEEDS.map((speed, i) => (
            <button
              key={speed.label}
              type="button"
              onClick={() => onSpeed(i)}
              aria-pressed={speedIndex === i}
              title={speed.hoursPerSecond === 0 ? "Hentikan waktu" : `${speed.hoursPerSecond} jam simulasi per detik`}
              className={`cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                speedIndex === i ? "bg-white text-black" : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {i === 0 ? <Pause size={12} className="inline" /> : i === TIME_SPEEDS.length - 1 ? <FastForward size={12} className="inline" /> : null}
              <span className={i === 0 ? "sr-only sm:not-sr-only sm:ml-1" : "ml-1"}>{speed.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Muka air tanah */}
      <div className="relative mt-5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="bara-water" className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
            Muka air tanah
          </label>
          <span className="font-playfair text-xl italic text-white tabular-nums">
            {waterCm === 0 ? "" : "−"}
            {Math.round(waterCm)}
            <span className="ml-1 font-sans text-xs not-italic text-white/50">cm</span>
          </span>
        </div>
        <div className="relative mt-2">
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 via-amber-300 to-[#e8702a]"
              style={{ width: `${valuePct}%` }}
            />
          </div>
          <div className="pointer-events-none absolute top-1/2 h-4 w-px -translate-y-1/2 bg-white/70" style={{ left: `${limitPct}%` }} />
          <input
            id="bara-water"
            type="range"
            min={WATER_MIN_CM}
            max={WATER_MAX_CM}
            step={1}
            value={Math.round(waterCm)}
            onChange={(e) => onWater(Number(e.target.value))}
            aria-valuetext={`${Math.round(waterCm)} sentimeter di bawah permukaan`}
            className="water-slider relative z-10 w-full"
          />
          <div className="relative mt-1 h-4 text-[10px] tabular-nums text-white/40">
            <span className="absolute left-0" title="Muka air di permukaan">
              <Droplets size={10} />
            </span>
            <span className="absolute -translate-x-1/2 whitespace-nowrap text-white/70" style={{ left: `${limitPct}%` }}>
              batas 40 cm
            </span>
            <span className="absolute right-0">{WATER_MAX_CM} cm</span>
          </div>
        </div>
      </div>

      {/* Pemadaman */}
      {(showDouse || showRewet) && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          {showDouse && (
            <button
              type="button"
              onClick={onDouse}
              disabled={dousing}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-sky-300/35 bg-sky-400/15 px-3.5 py-2 text-xs font-medium text-sky-100 transition-colors hover:bg-sky-400/25 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ShowerHead size={14} />
              {dousing ? SUPPRESSION_TEXT.douse.running : SUPPRESSION_TEXT.douse.label}
            </button>
          )}
          {showRewet && (
            <button
              type="button"
              onClick={onRewet}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-emerald-300/35 bg-emerald-400/15 px-3.5 py-2 text-xs font-medium text-emerald-100 transition-colors hover:bg-emerald-400/25"
            >
              <Waves size={14} />
              {SUPPRESSION_TEXT.rewet.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
