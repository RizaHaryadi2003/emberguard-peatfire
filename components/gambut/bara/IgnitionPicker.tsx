"use client";

import { Cigarette, Flame, Zap } from "lucide-react";
import { IGNITION_SOURCES, type IgnitionSource } from "@/config/bara-content";

const ICONS = {
  puntung: Cigarette,
  pembakaran: Flame,
  percikan: Zap,
} as const;

type Props = {
  selected: IgnitionSource["id"] | null;
  onSelect: (source: IgnitionSource) => void;
  /** Sudah menyulut: kartu berubah menjadi keterangan, bukan pilihan. */
  ignited: boolean;
};

/** Babak 01: tiga sumber sulutan yang dapat diklik. */
export default function IgnitionPicker({ selected, onSelect, ignited }: Props) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/45 p-4 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">Sumber sulutan</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {IGNITION_SOURCES.map((source) => {
          const Icon = ICONS[source.id];
          const active = selected === source.id;
          return (
            <button
              key={source.id}
              type="button"
              onClick={() => onSelect(source)}
              aria-pressed={active}
              className={`group cursor-pointer rounded-2xl border p-3 text-left transition-colors duration-300 ${
                active
                  ? "border-[#e8702a]/60 bg-[#e8702a]/15"
                  : "border-white/12 bg-white/[0.04] hover:border-white/30 hover:bg-white/[0.08]"
              }`}
            >
              <Icon size={18} className={active ? "text-[#f0a060]" : "text-white/70"} />
              <span className="mt-2 block text-xs font-medium leading-tight text-white">{source.label}</span>
              <span className="mt-0.5 block text-[10px] leading-tight text-white/50">{source.caption}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-white/70">
        {ignited
          ? "Nyalanya sudah mati. Yang tersisa adalah bara di dalam gambut."
          : selected
            ? "Sekarang klik permukaan gambut untuk menyulut di titik yang Anda pilih."
            : "Pilih salah satu sumber sulutan di atas."}
      </p>
    </div>
  );
}
