"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, RotateCcw, Share2 } from "lucide-react";
import LaptopNudge from "@/components/modul/shared/LaptopNudge";
import ShareCardDialog from "@/components/modul/shared/ShareCardDialog";
import { nextAvailableModule } from "@/config/modules-content";
import { KANAL_SUMMARY } from "@/config/modul/kanal";
import { formatDrop, type DrainageStats } from "@/lib/model/drainage";
import {
  fieldsText,
  getKanalCard,
  kanalCardImagePath,
  kanalShareLink,
  reachText,
  riskReachFor,
  type SharedCanal,
} from "@/lib/kartu/kanalCard";

/** Modul tersedia berikutnya sesudah Kanal. */
const NEXT_MODULE = nextAvailableModule("/modul/kanal");

/** Dibuat hanya setelah diklik di peramban, jadi `window` selalu tersedia. */
function KanalCardDialog({ shared, onClose }: { shared: SharedCanal; onClose: () => void }) {
  const card = getKanalCard(shared);
  const link = kanalShareLink(window.location.origin, shared);
  return (
    <ShareCardDialog
      imageSrc={kanalCardImagePath(shared, "story")}
      imageAlt={`Kartu hasil: kanal sedalam ${card.depth} membuat ± ${card.fields} lapangan bola lahan rawan terbakar tiap 1 km kanal. ${card.note}`}
      fileName={`kartu-kanal-${card.cm}cm.png`}
      link={link}
      shareText={`${card.challenge} ${link}`}
      onClose={onClose}
    />
  );
}

type Props = {
  stats: DrainageStats;
  /** Kedalaman kanal yang digali pembaca (cm). */
  canalDepthCm: number;
  /** Tebakan babak 02, bila ada. */
  guess: number | null;
  onReset: () => void;
  /** Sembunyikan kartu untuk melihat lahannya lagi. */
  onClose: () => void;
};

/**
 * Kartu penutup Modul Kanal: jawaban pertanyaan pembuka, empat angka yang baru
 * saja dilihat pembaca, satu kesimpulan, dan jalan ke modul berikutnya.
 *
 * Jangkauan rawan dihitung ulang dari kedalaman kanalnya, bukan dibaca dari
 * ringkasan simulasi: kartu ini muncul setelah sekat dipasang, dan pada saat
 * itu jangkauan yang sedang berlaku memang nol — padahal yang diringkas
 * adalah apa yang dilakukan kanal itu sebelum disekat.
 */
export default function SummaryCard({ stats, canalDepthCm, guess, onReset, onClose }: Props) {
  const [cardOpen, setCardOpen] = useState(false);
  const cm = Math.max(10, canalDepthCm);
  const reach = useMemo(() => riskReachFor(cm), [cm]);
  const shared: SharedCanal = { cm, guess };

  const rows: [string, string][] = [
    [KANAL_SUMMARY.rows.reach, reachText(reach)],
    [KANAL_SUMMARY.rows.fields, `± ${fieldsText(reach)} lap. bola`],
    [KANAL_SUMMARY.rows.drop, formatDrop(stats.maxSubsidenceM)],
    [KANAL_SUMMARY.rows.carbon, `${Math.round(stats.emittedTPerHa)} t/ha`],
  ];

  return (
    <div className="pointer-events-auto rounded-3xl border border-white/12 bg-black/60 p-5 shadow-2xl shadow-black/60 backdrop-blur-xl">
      <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">{KANAL_SUMMARY.title}</p>
      <p className="mt-2 text-sm leading-relaxed text-white/85">
        {KANAL_SUMMARY.answer(cm, reachText(reach), fieldsText(reach))}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-white/10 py-4">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[10px] uppercase tracking-[0.12em] text-white/40">{label}</dt>
            <dd className="mt-1 font-playfair text-2xl italic leading-none text-[#f0a35e] tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 text-xs leading-relaxed text-white/75">{KANAL_SUMMARY.closing}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCardOpen(true)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-medium text-black transition-colors hover:bg-[#f0a35e]"
        >
          <Share2 size={14} /> {KANAL_SUMMARY.share}
        </button>
        {NEXT_MODULE?.href && (
          <Link
            href={NEXT_MODULE.href}
            title={KANAL_SUMMARY.next}
            className="inline-flex items-center gap-2 rounded-full border border-[#f0a35e]/50 bg-[#f0a35e]/10 px-3.5 py-2 text-xs font-medium text-[#ffd2a8] transition-colors hover:bg-[#f0a35e]/20"
          >
            Modul {NEXT_MODULE.number}: {NEXT_MODULE.title} <ArrowRight size={14} />
          </Link>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-white/55 transition-colors hover:text-white"
        >
          <Eye size={13} /> {KANAL_SUMMARY.close}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-white/55 transition-colors hover:text-white"
        >
          <RotateCcw size={13} /> {KANAL_SUMMARY.reset}
        </button>
      </div>

      <LaptopNudge className="mt-3 flex" />

      {cardOpen && <KanalCardDialog shared={shared} onClose={() => setCardOpen(false)} />}
    </div>
  );
}
