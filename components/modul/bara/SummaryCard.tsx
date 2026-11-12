"use client";

import { useState } from "react";
import { RotateCcw, Share2 } from "lucide-react";
import LaptopNudge from "@/components/modul/LaptopNudge";
import ShareCardDialog from "@/components/modul/ShareCardDialog";
import { BARA_SUMMARY } from "@/config/bara-content";
import { baraCardImagePath, baraShareLink, getBaraCard, type SharedBurn } from "@/lib/baraCard";
import { formatElapsed, type SmolderStats } from "@/lib/smolder";

/** Dibuat hanya setelah diklik di peramban, jadi `window` selalu tersedia. */
function BaraCardDialog({ burn, onClose }: { burn: SharedBurn; onClose: () => void }) {
  const card = getBaraCard(burn);
  const link = baraShareLink(window.location.origin, burn);
  return (
    <ShareCardDialog
      imageSrc={baraCardImagePath(burn, "story")}
      imageAlt={`Kartu hasil: bara sedalam ${card.depth}, ${card.zoneLabel}. ${card.headline} ${card.note}`}
      fileName={`kartu-bara-${card.cm}cm.png`}
      link={link}
      shareText={`${card.challenge} ${link}`}
      onClose={onClose}
    />
  );
}

/** Kartu penutup: jejak yang ditinggalkan bara setelah berhasil dipadamkan. */
export default function SummaryCard({ stats, onReset }: { stats: SmolderStats; onReset: () => void }) {
  const [cardOpen, setCardOpen] = useState(false);
  const burn: SharedBurn = { cm: Math.round(stats.maxDepth * 100), resurfaced: stats.resurfaceX !== null };
  const rows: [string, string][] = [
    // `burningHours`, bukan `hours`: pembaca baru saja memadamkan baranya dan
    // boleh membiarkan waktu berjalan untuk memastikan ia tidak hidup lagi.
    ["Lama menyala", formatElapsed(stats.burningHours)],
    ["Gambut habis terbakar", `${(stats.consumed * 100).toFixed(1)} %`],
    ["Kedalaman terdalam", `${(stats.maxDepth * 100).toFixed(0)} cm`],
    ["Permukaan turun (model)", `${(stats.maxSubsidence * 100).toFixed(0)} cm`],
  ];

  return (
    <div className="pointer-events-auto rounded-3xl border border-white/12 bg-black/55 p-5 shadow-2xl shadow-black/60 backdrop-blur-xl">
      <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">{BARA_SUMMARY.title}</p>
      <p className="mt-2 text-sm leading-relaxed text-white/85">
        {BARA_SUMMARY.answer(Math.round(stats.maxDepth * 100), stats.rekindleX !== null, stats.resurfaceX !== null)}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-4 border-y border-white/10 py-4">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[10px] uppercase tracking-[0.12em] text-white/40">{label}</dt>
            <dd className="mt-1 font-playfair text-2xl italic text-[#f0a060] tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 text-xs leading-relaxed text-white/70">{BARA_SUMMARY.closing}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setCardOpen(true)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-medium text-black transition-colors hover:bg-[#f0a060]"
        >
          <Share2 size={14} /> Buat kartu hasilmu
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/20 px-3.5 py-2 text-xs font-medium text-white/80 transition-colors hover:border-white/40 hover:text-white"
        >
          <RotateCcw size={14} /> Coba lagi dari awal
        </button>
      </div>

      <LaptopNudge className="mt-3 flex" />

      {cardOpen && <BaraCardDialog burn={burn} onClose={() => setCardOpen(false)} />}
    </div>
  );
}
