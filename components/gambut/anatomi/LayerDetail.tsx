"use client";

import { X } from "lucide-react";
import { formatMeters, type PeatLayer } from "@/lib/peat";

type Props = { layer: PeatLayer; onClose: () => void };

/** Kartu rincian lapisan yang sedang dipilih pada tahap "Lapis demi lapis". */
export default function LayerDetail({ layer, onClose }: Props) {
  const rows = [
    ["Kadar serat", layer.details.fiber],
    ["Warna", layer.details.color],
    ["Kematangan", layer.details.maturity],
  ] as const;

  return (
    <div className="pointer-events-auto rounded-3xl border border-white/12 bg-black/45 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Contoh tekstur asli lapisan sebagai penanda visual */}
          <span
            className="h-10 w-10 shrink-0 rounded-full bg-cover bg-center ring-1 ring-white/20"
            style={{ backgroundImage: `url(/textures/gambut/${layer.id}_color.webp)` }}
            aria-hidden="true"
          />
          <div>
            <p className="text-[10px] tabular-nums tracking-wider text-white/45">
              Kedalaman {formatMeters(layer.top)}–{formatMeters(layer.bottom)} m
            </p>
            <p className="font-playfair text-2xl italic leading-tight text-white">{layer.name}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup rincian lapisan"
          className="cursor-pointer rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 border-y border-white/10 py-3">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[10px] uppercase tracking-[0.14em] text-white/40">{label}</dt>
            <dd className="mt-1 text-xs leading-snug text-white/85">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 text-xs leading-relaxed text-white/70">{layer.details.note}</p>
    </div>
  );
}
