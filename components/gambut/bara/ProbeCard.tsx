"use client";

import { X } from "lucide-react";
import { CELL_STATE_TEXT } from "@/config/bara-content";
import { formatMeters, PEAT_LAYERS, type PeatLayerId } from "@/lib/peat";
import type { CellState } from "@/lib/smolder";

export type ProbeResult = {
  state: CellState;
  depth: number;
  layer: PeatLayerId;
  moisture: number;
  temperature: number;
};

/** Kartu hasil pemeriksaan satu titik pada penampang (muncul saat diklik). */
export default function ProbeCard({ probe, onClose }: { probe: ProbeResult; onClose: () => void }) {
  const text = CELL_STATE_TEXT[probe.state];
  const layer = PEAT_LAYERS.find((l) => l.id === probe.layer);

  return (
    <div className="pointer-events-auto rounded-3xl border border-white/12 bg-black/50 p-4 shadow-2xl shadow-black/60 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">
            Titik pada kedalaman {formatMeters(probe.depth)} m
          </p>
          <p className="mt-0.5 font-playfair text-xl italic leading-tight text-white">{text.label}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup hasil pemeriksaan"
          className="cursor-pointer rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={15} />
        </button>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-3 border-y border-white/10 py-3">
        <div>
          <dt className="text-[10px] uppercase tracking-[0.12em] text-white/40">Suhu</dt>
          <dd className="mt-0.5 text-xs tabular-nums text-white/90">{probe.temperature} °C</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.12em] text-white/40">Kelembapan</dt>
          <dd className="mt-0.5 text-xs tabular-nums text-white/90">{Math.round(probe.moisture * 100)} %</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.12em] text-white/40">Lapisan</dt>
          <dd className="mt-0.5 text-xs text-white/90">{layer?.name ?? "—"}</dd>
        </div>
      </dl>

      <p className="mt-2.5 text-xs leading-relaxed text-white/70">{text.note}</p>
    </div>
  );
}
