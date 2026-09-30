"use client";

import { Droplets, Flame } from "lucide-react";
import { WATER_STATUS_TEXT } from "@/config/gambut-content";
import { getWaterStatus, WATER_LIMIT_CM, WATER_MAX_CM, WATER_MIN_CM } from "@/lib/peat";

type Props = {
  waterCm: number;
  onChange: (cm: number) => void;
  /** Dipanggil saat pengguna mulai menyentuh pengatur (menghentikan demo otomatis). */
  onInteract: () => void;
};

const STATUS_STYLE = {
  basah: "bg-sky-400/15 text-sky-200 ring-sky-300/30",
  waspada: "bg-amber-400/15 text-amber-200 ring-amber-300/30",
  rawan: "bg-[#e8702a]/20 text-orange-200 ring-[#e8702a]/40",
} as const;

/** Panel pengatur muka air tanah untuk tahap interaktif. */
export default function WaterControl({ waterCm, onChange, onInteract }: Props) {
  const status = getWaterStatus(waterCm);
  const text = WATER_STATUS_TEXT[status];
  const limitPct = ((WATER_LIMIT_CM - WATER_MIN_CM) / (WATER_MAX_CM - WATER_MIN_CM)) * 100;
  const valuePct = ((waterCm - WATER_MIN_CM) / (WATER_MAX_CM - WATER_MIN_CM)) * 100;

  return (
    <div className="rounded-3xl border border-white/10 bg-black/45 p-5 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">Muka air tanah</p>
          <p className="mt-1 font-playfair text-4xl italic leading-none text-white tabular-nums sm:text-5xl">
            {Math.round(waterCm) === 0 ? "" : "−"}
            {Math.round(waterCm)}
            <span className="ml-1 font-sans text-base not-italic text-white/50">cm</span>
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors duration-300 ${STATUS_STYLE[status]}`}
          role="status"
        >
          {status === "rawan" ? <Flame size={14} /> : <Droplets size={14} />}
          {text.label}
        </span>
      </div>

      <div className="relative mt-5">
        {/* Trek: biru (basah) → jingga (kering) dengan penanda batas 40 cm */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 via-amber-300 to-[#e8702a]"
            style={{ width: `${valuePct}%` }}
          />
        </div>
        <div
          className="pointer-events-none absolute top-1/2 h-4 w-px -translate-y-1/2 bg-white/70"
          style={{ left: `${limitPct}%` }}
        />
        <input
          type="range"
          min={WATER_MIN_CM}
          max={WATER_MAX_CM}
          step={1}
          value={Math.round(waterCm)}
          onPointerDown={onInteract}
          onKeyDown={onInteract}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Kedalaman muka air tanah"
          aria-valuetext={`${Math.round(waterCm)} sentimeter di bawah permukaan, ${text.label}`}
          className="water-slider relative z-10 w-full"
        />
        <div className="mt-2 flex justify-between text-[10px] tabular-nums text-white/40">
          <span>0 cm<span className="hidden sm:inline"> · permukaan</span></span>
          <span className="absolute -translate-x-1/2 text-white/70" style={{ left: `${limitPct}%` }}>
            batas {WATER_LIMIT_CM} cm
          </span>
          <span>{WATER_MAX_CM} cm</span>
        </div>
      </div>

      <p className="mt-4 min-h-[3.5em] text-sm leading-relaxed text-white/75">{text.message}</p>
    </div>
  );
}
