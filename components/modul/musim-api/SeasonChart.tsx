"use client";

import { useMemo } from "react";
import {
  BURN_CM,
  DASARIAN_PER_YEAR,
  DAYS_PER_YEAR,
  DRY_MM_DAY,
  HIGH_DANGER_CM,
  MAX_DEPTH_CM,
  MONTH_SHORT,
  MONTH_START_DAY,
  rainfall,
  type YearKind,
} from "@/lib/model/fireSeason";
import { MUSIM_TEXT, STAGE_COLOR } from "@/config/modul/musim-api";

/** Ukuran gambar dalam satuan viewBox; SVG melebar mengikuti panel. */
const W = 250;
const RAIN_H = 24;
const GAP = 5;
const DEPTH_H = 48;
const AXIS_H = 12;
const H = RAIN_H + GAP + DEPTH_H + AXIS_H;

/** Hujan terbesar pada sumbu batang (mm/hari). */
const RAIN_MAX = 12;

const xOfDay = (day: number) => (day / (DAYS_PER_YEAR - 1)) * W;
const yOfDepth = (cm: number) => RAIN_H + GAP + (Math.min(cm, MAX_DEPTH_CM) / MAX_DEPTH_CM) * DEPTH_H;

/** Garis muka air harian sebagai jalur SVG. */
function depthPath(series: Float32Array, toDay = series.length - 1): string {
  let d = "";
  for (let day = 0; day <= toDay; day += 2) d += `${day === 0 ? "M" : "L"}${xOfDay(day).toFixed(1)},${yOfDepth(series[day]).toFixed(1)}`;
  return d;
}

type Props = {
  /** Tahun yang batang hujannya digambar. */
  kind: YearKind;
  normal: Float32Array;
  /** Seri tahun El Niño; bila ada, tahun biasa digambar putus-putus sebagai pembanding. */
  elnino?: Float32Array;
  /** Hari yang sedang dilihat (penanda tegak). */
  day: number;
  /** Babak 02: kemarau diperpanjang mulai `from` selama `days` hari sampai `toCm`. */
  extension?: { from: number; days: number; fromCm: number; toCm: number };
  /**
   * Jeda (detik) sebelum batang mulai tumbuh dan garis mulai tergambar, agar
   * grafik baru "menggambar dirinya" setelah kartunya muncul.
   */
  revealDelay?: number;
};

/** Jeda antarbatang saat tumbuh bergiliran (detik): setahun ±0,6 detik. */
const BAR_STAGGER = 0.018;

/**
 * Kalender setahun dalam satu gambar: hujan per sepuluh hari di atas, muka air
 * gambut di bawah dengan kedalaman ke bawah seperti di tanah sungguhan.
 *
 * Gambar ini yang membuat pola setahun terbaca sekaligus. Diorama hanya bisa
 * memperlihatkan satu hari; tanpa kalender pembaca tidak melihat bahwa air
 * turun dua kali, atau bahwa El Niño menyambung kemarau Agustus sampai
 * Oktober.
 */
export default function SeasonChart({ kind, normal, elnino, day, extension, revealDelay = 0 }: Props) {
  const bars = useMemo(
    () =>
      Array.from({ length: DASARIAN_PER_YEAR }, (_, i) => {
        const mm = rainfall(kind, i);
        const h = (Math.min(mm, RAIN_MAX) / RAIN_MAX) * RAIN_H;
        return { i, mm, h, dry: mm < DRY_MM_DAY };
      }),
    [kind],
  );
  const normalPath = useMemo(() => depthPath(normal, extension ? extension.from : undefined), [normal, extension]);
  const elninoPath = useMemo(() => (elnino ? depthPath(elnino) : ""), [elnino]);
  const barW = W / DASARIAN_PER_YEAR;

  return (
    <div>
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Kalender hujan dan muka air gambut setahun">
      {/* Batang hujan per dasarian; dasarian kering berwarna jingga. */}
      {bars.map((b) => (
        // Kuncinya memuat jenis tahun: saat El Niño dipilih batangnya tumbuh
        // ulang, sehingga Agustus–Oktober yang menyusut terlihat sedang terjadi.
        <rect
          key={`${kind}-${b.i}`}
          className="chart-bar"
          style={{ animationDelay: `${revealDelay + b.i * BAR_STAGGER}s` }}
          x={b.i * barW + 0.8}
          y={RAIN_H - b.h}
          width={barW - 1.6}
          height={Math.max(0.6, b.h)}
          rx={1}
          fill={b.dry ? "#f0a35e" : "#5fb0dc"}
          opacity={b.dry ? 0.9 : 0.55}
        />
      ))}

      {/* Bidang muka air: 0 di atas (permukaan), makin ke bawah makin dalam. */}

      <rect x={0} y={RAIN_H + GAP} width={W} height={DEPTH_H} rx={3} fill="#ffffff" opacity={0.04} />
      <line x1={0} x2={W} y1={yOfDepth(HIGH_DANGER_CM)} y2={yOfDepth(HIGH_DANGER_CM)} stroke={STAGE_COLOR.bahaya} strokeWidth={0.8} strokeDasharray="3 2" />
      <line x1={0} x2={W} y1={yOfDepth(BURN_CM)} y2={yOfDepth(BURN_CM)} stroke={STAGE_COLOR.terbakar} strokeWidth={0.8} strokeDasharray="3 2" />
      <text x={W - 2} y={yOfDepth(HIGH_DANGER_CM) - 2} textAnchor="end" fontSize={8} fill={STAGE_COLOR.bahaya}>
        {HIGH_DANGER_CM} cm
      </text>
      <text x={W - 2} y={yOfDepth(BURN_CM) - 2} textAnchor="end" fontSize={8} fill={STAGE_COLOR.terbakar}>
        {BURN_CM} cm
      </text>

      {/* Garis muka air. Pada babak 03 tahun biasa jadi pembanding putus-putus. */}
      {/* Garis tahun biasa menggambar dirinya sesudah batang hujan tumbuh;
          sebagai pembanding putus-putus ia tidak dianimasikan (pola putus-putus
          dan animasi gambar memakai sifat garis yang sama). */}
      <path
        d={normalPath}
        pathLength={elnino ? undefined : 1}
        className={elnino ? undefined : "chart-draw"}
        style={elnino ? undefined : { animationDelay: `${revealDelay + 0.5}s` }}
        fill="none"
        stroke={elnino ? "#ffffff" : "#8fd8ff"}
        strokeOpacity={elnino ? 0.4 : 1}
        strokeWidth={1.6}
        strokeDasharray={elnino ? "3 2" : undefined}
        strokeLinejoin="round"
      />
      {/* Garis El Niño tergambar saat tahun itu dipilih. */}
      {elnino && <path d={elninoPath} pathLength={1} className="chart-draw" style={{ animationDelay: "0.3s" }} fill="none" stroke="#ff8a4d" strokeWidth={1.8} strokeLinejoin="round" />}
      {extension && (
        <line
          x1={xOfDay(extension.from)}
          y1={yOfDepth(extension.fromCm)}
          x2={xOfDay(extension.from + extension.days)}
          y2={yOfDepth(extension.toCm)}
          stroke="#ff8a4d"
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      )}

      {/* Penanda hari yang sedang dilihat. */}
      <line x1={xOfDay(day)} x2={xOfDay(day)} y1={0} y2={RAIN_H + GAP + DEPTH_H} stroke="#ffffff" strokeWidth={1} opacity={0.85} />

      {/* Sumbu bulan. */}
      {MONTH_START_DAY.map((d, m) => (
        <text key={m} x={xOfDay(d) + 1} y={H - 2} fontSize={8} fill="#ffffff" opacity={0.45}>
          {MONTH_SHORT[m]}
        </text>
      ))}
    </svg>
      {/* Keterangan warna, di bawah gambar supaya tidak menimpa batang. */}
      <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-white/55">
        <li className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-[#5fb0dc]" /> {MUSIM_TEXT.legendRain}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-[#f0a35e]" /> {MUSIM_TEXT.legendDry}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full bg-[#8fd8ff]" /> {MUSIM_TEXT.legendDepth}
        </li>
        {elnino && (
          <li className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded-full bg-[#ff8a4d]" /> {MUSIM_TEXT.elninoYear}
          </li>
        )}
      </ul>
    </div>
  );
}
