"use client";

import { LEGEND_ITEMS } from "@/config/bara-content";
import type { SmolderStats } from "@/lib/smolder";

type Props = {
  stats: SmolderStats;
};

/**
 * Angka-angka hidup dari simulasi dan keterangan warna penampang.
 *
 * Sakelar tampilan nyata/termal dahulu berada di sini. Sekarang pindah ke
 * panel kendali, berdampingan dengan tombol Siram yang menjadi pasangannya.
 */
export default function StatsPanel({ stats }: Props) {
  const rows: [string, string][] = [
    ["Kedalaman bara", stats.frontDepth > 0 ? `${(stats.frontDepth * 100).toFixed(0)} cm` : "—"],
    ["Laju rambat", stats.spreadCmPerDay > 0 ? `${stats.spreadCmPerDay.toFixed(0)} cm/hari` : "—"],
    ["Gambut habis", `${(stats.consumed * 100).toFixed(1)} %`],
    ["Permukaan turun", stats.maxSubsidence > 0 ? `${(stats.maxSubsidence * 100).toFixed(0)} cm` : "—"],
    ["Asap di permukaan", stats.surfaceSmoke > 0.02 ? `${Math.round(stats.surfaceSmoke * 100)} %` : "tidak terlihat"],
  ];

  return (
    <div className="w-[236px] rounded-3xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl">
      <dl className="space-y-2.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3">
            <dt className="text-[11px] text-white/50">{label}</dt>
            <dd className="text-xs font-medium tabular-nums text-white">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-start gap-2">
            <span
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/20"
              style={{ backgroundColor: item.color }}
              aria-hidden="true"
            />
            <span className="text-[10px] leading-snug text-white/60">
              <span className="text-white/85">{item.label}</span> — {item.note}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
