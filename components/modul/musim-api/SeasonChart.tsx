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
const W = 360;
const RAIN_H = 30;
const GAP = 6;
const DEPTH_H = 56;
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
};

/**
 * Kalender setahun dalam satu gambar: hujan per sepuluh hari di atas, muka air
 * gambut di bawah dengan kedalaman ke bawah seperti di tanah sungguhan.
 *
 * Gambar ini yang membuat pola setahun terbaca sekaligus. Diorama hanya bisa
 * memperlihatkan satu hari; tanpa kalender pembaca tidak melihat bahwa air
 * turun dua kali, atau bahwa El Niño menyambung kemarau Agustus sampai
 * Oktober.
 */
export default function SeasonChart({ kind, normal, elnino, day, extension }: Props) {
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
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Kalender hujan dan muka air gambut setahun">
      {/* Batang hujan per dasarian; dasarian kering berwarna jingga. */}
      {bars.map((b) => (
        <rect
          key={b.i}
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
      <text x={W - 2} y={yOfDepth(HIGH_DANGER_CM) - 2} textAnchor="end" fontSize={7} fill={STAGE_COLOR.bahaya}>
        {HIGH_DANGER_CM} cm
      </text>
      <text x={W - 2} y={yOfDepth(BURN_CM) - 2} textAnchor="end" fontSize={7} fill={STAGE_COLOR.terbakar}>
        {BURN_CM} cm
      </text>

      {/* Garis muka air. Pada babak 03 tahun biasa jadi pembanding putus-putus. */}
      <path d={normalPath} fill="none" stroke={elnino ? "#ffffff" : "#8fd8ff"} strokeOpacity={elnino ? 0.4 : 1} strokeWidth={1.6} strokeDasharray={elnino ? "3 2" : undefined} strokeLinejoin="round" />
      {elnino && <path d={elninoPath} fill="none" stroke="#ff8a4d" strokeWidth={1.8} strokeLinejoin="round" />}
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
        <text key={m} x={xOfDay(d) + 1} y={H - 2} fontSize={7} fill="#ffffff" opacity={0.45}>
          {MONTH_SHORT[m]}
        </text>
      ))}
      <title>{`${MUSIM_TEXT.legendRain}; jingga = ${MUSIM_TEXT.legendDry}; garis = ${MUSIM_TEXT.legendDepth}`}</title>
    </svg>
  );
}
