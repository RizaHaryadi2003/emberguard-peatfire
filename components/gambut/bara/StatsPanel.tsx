"use client";

import { LEGEND_ITEMS, type BaraAct } from "@/config/bara-content";
import type { SmolderStats } from "@/lib/smolder";

type Props = {
  stats: SmolderStats;
  /** Angka kunci babak yang sedang berjalan. */
  fact: BaraAct["fact"];
};

/**
 * Angka-angka hidup dari simulasi, angka kunci babak, dan keterangan warna
 * penampang.
 *
 * Sakelar tampilan nyata/termal dahulu berada di sini. Sekarang pindah ke
 * panel kendali, berdampingan dengan tombol Siram yang menjadi pasangannya.
 *
 * Angka kunci babak pindah ke sini dari panel cerita di kiri. Di sana ia
 * berdiri di atas panel kendali yang menjulang mulai babak 03, sehingga pada
 * layar laptop ia harus dilepas agar tidak tertindih — dan justru pada babak
 * 03 dan 04 itulah angkanya hampir tidak pernah tampil. Kolom kanan ini
 * ditambatkan ke tepi atas sendiri dan tidak berebut ruang dengan apa pun.
 */
export default function StatsPanel({ stats, fact }: Props) {
  const rows: [string, string][] = [
    ["Kedalaman bara", stats.frontDepth > 0 ? `${(stats.frontDepth * 100).toFixed(0)} cm` : "—"],
    ["Laju rambat", stats.spreadCmPerDay > 0 ? `${stats.spreadCmPerDay.toFixed(0)} cm/hari` : "—"],
    ["Gambut habis", `${(stats.consumed * 100).toFixed(1)} %`],
    ["Permukaan turun", stats.maxSubsidence > 0 ? `${(stats.maxSubsidence * 100).toFixed(0)} cm` : "—"],
    ["Asap di permukaan", stats.surfaceSmoke > 0.02 ? `${Math.round(stats.surfaceSmoke * 100)} %` : "tidak terlihat"],
  ];

  return (
    <div className="rounded-3xl border border-white/10 bg-black/40 p-3.5 backdrop-blur-xl [@media(min-height:769px)]:p-4">
      {/* Angka kunci babak. Dibedakan rupanya dari angka-angka di bawahnya
          supaya tidak terbaca sebagai nilai yang ikut berubah: yang ini
          keterangan tetap babak, bukan bacaan simulasi. */}
      <div className="mb-2 border-b border-white/10 pb-2 [@media(min-height:769px)]:mb-3 [@media(min-height:769px)]:pb-3">
        <p className="font-playfair text-2xl italic leading-none text-[#f0a060]">{fact.value}</p>
        {/* Keterangannya dilepas pada layar pendek; angkanya sendiri yang
            harus terbaca, dan bunyinya tetap ada pada atribut title. */}
        <p
          className="mt-1.5 hidden text-[10px] leading-snug text-white/55 [@media(min-height:701px)]:block"
          title={fact.caption}
        >
          {fact.caption}
        </p>
      </div>

      <dl className="space-y-2 [@media(min-height:769px)]:space-y-2.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3">
            <dt className="text-[11px] text-white/50">{label}</dt>
            <dd className="text-xs font-medium tabular-nums text-white">{value}</dd>
          </div>
        ))}
      </dl>

      {/* Keterangan warna penampang. Pada layar pendek hanya namanya yang
          tinggal; penjelasannya tiga baris dan itulah bagian tertinggi panel
          ini. Nama warnanya sendiri sudah cukup untuk membaca penampang, dan
          penjelasan penuhnya tetap terbaca saat kursor berhenti di sana. */}
      <div className="mt-3 space-y-1.5 border-t border-white/10 pt-2.5 [@media(min-height:769px)]:mt-4 [@media(min-height:769px)]:space-y-2 [@media(min-height:769px)]:pt-3">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-start gap-2" title={`${item.label} — ${item.note}`}>
            <span
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/20"
              style={{ backgroundColor: item.color }}
              aria-hidden="true"
            />
            <span className="text-[10px] leading-snug text-white/60">
              <span className="text-white/85">{item.label}</span>
              <span className="hidden [@media(min-height:769px)]:inline"> — {item.note}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
