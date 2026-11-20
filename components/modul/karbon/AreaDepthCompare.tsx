import { COMPARE_TEXT } from "@/config/modul/karbon";
import { BURN_DEPTH_MAX_M, HEADLINE_FIRE } from "@/lib/model/carbon";

// Bagan babak 02 "Hektare bukan ukurannya".
//
// Dua kotak menggantung dari satu garis permukaan, seperti gambut yang terbakar
// dari atas ke bawah. Lebarnya luas, tingginya kedalaman, jadi besar kotaknya
// adalah volume gambut yang habis, dan volume itulah yang menentukan CO₂.
// Pembaca tidak perlu membandingkan dua angka ton; cukup dua kotak.

/** Luas terlebar yang masih digambar penuh (ha); lebih dari ini kotaknya terpotong. */
const MAX_HA = 12;

/** Ukuran bagan (satuan SVG). */
const W = 360;
const TOP = 14;
const H = 42;

type Props = {
  areaHa: number;
  burnM: number;
  matched: boolean;
};

export default function AreaDepthCompare({ areaHa, burnM, matched }: Props) {
  const x = (ha: number) => (Math.min(ha, MAX_HA) / MAX_HA) * W;
  const y = (m: number) => (m / BURN_DEPTH_MAX_M) * H;
  const newsW = x(HEADLINE_FIRE.areaHa);
  const newsH = y(HEADLINE_FIRE.depthM);
  const yoursW = x(areaHa);
  const yoursH = y(burnM);
  const fill = matched ? "#7fd4a8" : "#e0a265";

  return (
    <figure className="mt-2.5">
      <svg viewBox={`-2 0 ${W + 4} ${TOP + H + 2}`} className="block w-full" role="img" aria-label={`${COMPARE_TEXT.news}. ${COMPARE_TEXT.yours}: ${areaHa} ha × ${Math.round(burnM * 100)} cm.`}>
        {/* Garis permukaan tanah. */}
        <line x1={0} x2={W} y1={TOP} y2={TOP} stroke="rgba(255,255,255,0.35)" strokeWidth={1} />
        {/* Kebakaran pembaca: kotak berisi. */}
        <rect
          x={0}
          y={TOP}
          width={yoursW}
          height={yoursH}
          fill={fill}
          fillOpacity={0.35}
          stroke={fill}
          strokeWidth={1.2}
          style={{ transition: "width 200ms, height 200ms" }}
        />
        {/* Kebakaran yang diberitakan: garis putus-putus. */}
        <rect
          x={0}
          y={TOP}
          width={newsW}
          height={newsH}
          fill="none"
          stroke="rgba(255,255,255,0.85)"
          strokeWidth={1.2}
          strokeDasharray="4 3"
        />
        <text x={newsW} y={TOP - 4} textAnchor="end" fontSize={10} fill="rgba(255,255,255,0.75)">
          {COMPARE_TEXT.news}
        </text>
        <text x={2} y={TOP - 4} fontSize={10} fill={fill}>
          {COMPARE_TEXT.yours}
        </text>
      </svg>
      <figcaption className="mt-1 hidden text-[10px] leading-snug text-white/45 sm:block">{COMPARE_TEXT.note}</figcaption>
    </figure>
  );
}
