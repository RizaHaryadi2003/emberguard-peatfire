"use client";

import { useMemo } from "react";
import {
  waterDepthAt,
  TRANSECT_LENGTH_M,
  WATER_LIMIT_M,
  type DrainageSim,
  type DrainageStats,
} from "@/lib/drainage";
import { NEAR_LENGTH_M } from "./scene/transect";
import { CHART_TEXT, FIGURE_NOTE, GUESS_TEXT } from "@/config/kanal-content";

// Tanah sepanjang satu kilometer, dilihat dari samping.
//
// --- Mengapa gambar ini, bukan bagian dari bongkahan ------------------------
//
// Bongkahan 3D hanya memuat beberapa puluh meter pertama: cukup dekat untuk
// dikenali sebagai tempat, terlalu pendek untuk memperlihatkan bahwa kanal
// mengeringkan lahan sampai ratusan meter. Jangkauan itu digambar di sini.
//
// --- Mengapa tampak samping, bukan grafik garis ------------------------------
//
// Rancangan sebelumnya grafik garis biasa: kedalaman muka air terhadap jarak,
// dengan arsiran di atas kurvanya. Untuk pembaca 17 tahun — dan ternyata juga
// untuk penulisnya — grafik itu tidak terbaca: sumbu tegaknya diukur ke
// bawah, tidak bernama, dan isinya hanya garis.
//
// Sekarang gambarnya memakai bahasa yang sama dengan bidang potong bongkahan
// di sebelahnya: tanah kering coklat muda di atas, tanah basah biru di bawah,
// dan batas keduanya adalah muka air tanah. Pembaca tidak perlu membaca sumbu
// apa pun; ia cukup melihat seberapa tebal lapisan coklat di tiap tempat. Di
// atas permukaannya, satu pita menyatakan jawabannya dengan kata-kata:
// sampai sejauh mana lahan ini rawan terbakar.

/** Ukuran gambar dalam satuan viewBox. */
const W = 212;
const H = 96;
const PAD_L = 2;
const PAD_R = 2;
/** Ruang di atas permukaan untuk pita rawan/aman. */
const PAD_T = 14;
const PAD_B = 2;

/**
 * Kedalaman terdalam yang digambar (m).
 *
 * Dua meter, bukan seluruh profil empat meter: yang dibaca di sini lapisan
 * atasnya, dan dengan dua meter batas 40 cm jatuh pada seperlima tinggi
 * gambar — cukup jauh dari permukaan untuk terlihat sebagai garis tersendiri.
 * Muka air yang lebih dalam (tepat di sisi kanal yang dalam) dipotong di
 * dasar gambar; itu hanya beberapa meter pertama dari seribu.
 */
const DRAWN_DEPTH_M = 2;

/** Jumlah titik kurva. Cukup halus untuk peluruhan eksponensial yang landai. */
const SAMPLES = 72;

/**
 * Susun titik-titik menjadi satu lintasan bezier yang mulus.
 *
 * Sebelumnya titik-titiknya disambung dengan `L` — ruas garis lurus. Pada
 * kurva peluruhan yang landai sambungan itu memang hampir tidak terlihat,
 * tetapi tidak pernah benar-benar hilang: di sepertiga kiri grafik, tempat
 * kurvanya menukik paling tajam, tiap sambungan menjadi sudut kecil, dan
 * deretan sudut kecil itulah yang membuat garis selembut muka air tanah
 * terbaca sebagai patahan. Yang digambar kurva alam, jadi yang menggambarnya
 * harus kurva.
 *
 * Caranya Catmull-Rom yang diubah menjadi bezier kubik: tiap ruas mendapat
 * dua titik kendali yang diambil dari kemiringan tetangganya, sehingga
 * kurvanya tetap melewati setiap titik hasil hitungan — tidak satu pun angka
 * yang digeser demi kehalusan. Itu syarat, bukan selera: grafik ini dibaca
 * pembaca sebagai alat ukur.
 */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
    // Seperenam, bukan sepertiga: inilah tegangan Catmull-Rom yang membuat
    // kurvanya tidak pernah melampaui titik-titiknya sendiri. Kurva yang
    // melampaui akan menggambar muka air sedikit lebih dalam daripada hasil
    // hitungan, dan pembaca membaca kedalaman itu sebagai angka.
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

/** Kedudukan mendatar untuk jarak `m` dari kanal. */
function xOf(m: number): number {
  return PAD_L + (m / TRANSECT_LENGTH_M) * PLOT_W;
}

/** Kedudukan tegak untuk kedalaman `d` meter di bawah permukaan. */
function yOf(d: number): number {
  return PAD_T + Math.min(1, Math.max(0, d) / DRAWN_DEPTH_M) * PLOT_H;
}

/** Kedudukan dalam persen kotak gambar, untuk label DOM di atasnya. */
const pctX = (x: number) => `${(x / W) * 100}%`;
const pctY = (y: number) => `${(y / H) * 100}%`;

/** Tinggi pita rawan/aman di atas permukaan (viewBox). */
const BAR_Y = PAD_T - 5;
const BAR_H = 3;

type Props = {
  sim: DrainageSim;
  stats: DrainageStats;
  /**
   * Tampilkan jawabannya: pita rawan terbakar dan jaraknya. Dimatikan selama
   * tebakan babak 02 belum dijawab.
   */
  revealReach?: boolean;
  /** Nilai yang berubah memicu ulang animasi tanah kering. */
  sweepKey?: string | number;
  /** Gambar tanah kering menjalar dari kanal ke luar. */
  animate?: boolean;
  /** Jarak tebakan pembaca (m), digambar sebagai garis pembanding. */
  guessM?: number | null;
  /** Pengguna meminta gerak dikurangi. */
  reducedMotion?: boolean;
};

export default function WaterTableChart({
  sim,
  stats,
  revealReach = true,
  sweepKey,
  animate = false,
  guessM = null,
  reducedMotion = false,
}: Props) {
  // Dihitung ulang tiap kali ringkasan diperbarui — lima kali sedetik, dan
  // hanya 72 titik. `stats` menjadi tanda bahwa simulasinya sudah berubah:
  // `sim` diubah di tempat, jadi acuannya tidak pernah berganti.
  const { curve, dry, wet } = useMemo(() => {
    const depth = sim.effectiveCanalDepth();
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const m = (i / SAMPLES) * TRANSECT_LENGTH_M;
      const water = waterDepthAt(m, depth, sim.subsidenceAtDistance(m));
      points.push({ x: xOf(m), y: yOf(water) });
    }
    const curve = smoothPath(points);
    const tail = curve.slice(curve.indexOf("C"));
    const start = `${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
    const left = xOf(0).toFixed(2);
    const right = xOf(TRANSECT_LENGTH_M).toFixed(2);
    return {
      curve,
      // Tanah kering: dari permukaan turun sampai muka air.
      dry: `M${left},${yOf(0).toFixed(2)}L${start}${tail}L${right},${yOf(0).toFixed(2)}Z`,
      // Tanah basah: dari muka air turun sampai dasar gambar.
      wet: `M${left},${yOf(DRAWN_DEPTH_M).toFixed(2)}L${start}${tail}L${right},${yOf(DRAWN_DEPTH_M).toFixed(2)}Z`,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim, stats]);

  const reach = stats.riskReachM;
  const allRisky = reach >= TRANSECT_LENGTH_M - 1;
  const sweep = animate && !reducedMotion;
  const limitY = yOf(WATER_LIMIT_M);

  // Kalimat jawaban untuk pembaca layar, juga dipakai label pita.
  const reachText = allRisky ? CHART_TEXT.allRisky : `${CHART_TEXT.risky} · ${Math.round(reach)} m`;

  return (
    <figure className="m-0">
      <figcaption className="mb-2">
        <span className="block text-[10px] uppercase tracking-[0.16em] text-white/50">{FIGURE_NOTE.chart}</span>
        <span className="mt-0.5 block text-[10px] leading-snug text-white/55">{FIGURE_NOTE.chartLead}</span>
      </figcaption>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full overflow-visible"
          role="img"
          aria-label={
            !revealReach
              ? "Tanah sepanjang satu kilometer dari kanal, dilihat dari samping."
              : reach > 0
                ? `Tanah sepanjang satu kilometer dari kanal, dilihat dari samping. ${reachText}.`
                : `Tanah sepanjang satu kilometer dari kanal, dilihat dari samping. ${CHART_TEXT.noneRisky}.`
          }
        >
          <defs>
            <linearGradient id="kanal-wet" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3f88b0" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#1d4a66" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="kanal-dry" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d9a066" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#a8703f" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          {/* Tanah: basah di bawah, kering di atas. */}
          <path d={wet} fill="url(#kanal-wet)" />
          <g key={sweep ? sweepKey : "diam"}>
            <path d={dry} fill="url(#kanal-dry)" className={sweep ? "kanal-fill" : undefined} />
            {/* Muka air tanah: batas basah dan kering. */}
            <path
              d={curve}
              pathLength={1}
              fill="none"
              stroke="#bfe6f7"
              strokeWidth="1.1"
              strokeLinejoin="round"
              strokeLinecap="round"
              className={sweep ? "kanal-draw" : undefined}
            />
          </g>

          {/* Permukaan tanah. */}
          <line x1={xOf(0)} y1={yOf(0)} x2={xOf(TRANSECT_LENGTH_M)} y2={yOf(0)} stroke="#e9dccb" strokeWidth="0.9" />

          {/* Batas aman 40 cm (PP 57/2016). */}
          <line
            x1={xOf(0)}
            y1={limitY}
            x2={xOf(TRANSECT_LENGTH_M)}
            y2={limitY}
            stroke="#ffffff"
            strokeOpacity="0.85"
            strokeWidth="0.8"
            strokeDasharray="2.5 2.5"
          />

          {/* Kanal di ujung kiri: delapan meter dari seribu terlalu sempit
              untuk digambar menurut skala, jadi ditandai sebagai takik. */}
          <path d={`M${xOf(0)},${yOf(0)} l3,0 l-1.2,9 l-1.8,0 Z`} fill="#6fb6d8" />

          {/* Petak yang digambar besar di sebelah: ujung kiri gambar ini. */}
          <rect
            x={xOf(0)}
            y={yOf(0)}
            width={Math.max(1.2, xOf(NEAR_LENGTH_M) - xOf(0))}
            height={PLOT_H}
            fill="#ffffff"
            fillOpacity="0.18"
          />

          {/* Jawabannya: pita di atas permukaan. */}
          {revealReach && reach > 0 && (
            <g className={sweep ? "kanal-fill" : undefined} key={sweep ? `bar-${sweepKey}` : "bar"}>
              <rect
                x={xOf(0)}
                y={BAR_Y}
                width={xOf(Math.min(reach, TRANSECT_LENGTH_M)) - xOf(0)}
                height={BAR_H}
                rx={1.5}
                fill="#f0a35e"
              />
              {!allRisky && (
                <>
                  <rect
                    x={xOf(reach)}
                    y={BAR_Y}
                    width={xOf(TRANSECT_LENGTH_M) - xOf(reach)}
                    height={BAR_H}
                    rx={1.5}
                    fill="#7fd4a8"
                    fillOpacity="0.7"
                  />
                  {/* Tepi daerah rawan, diturunkan sampai ke muka air. */}
                  <line
                    x1={xOf(reach)}
                    y1={BAR_Y}
                    x2={xOf(reach)}
                    y2={limitY}
                    stroke="#f0a35e"
                    strokeWidth="0.9"
                  />
                </>
              )}
            </g>
          )}

          {/* Tebakan pembaca di babak 02. */}
          {guessM !== null && (
            <line
              x1={xOf(guessM)}
              y1={BAR_Y - 3}
              x2={xOf(guessM)}
              y2={yOf(DRAWN_DEPTH_M)}
              stroke="#ffffff"
              strokeWidth="1"
              strokeDasharray="1.5 1.5"
            />
          )}
        </svg>

        {/* Label di atas gambar ditulis sebagai DOM: teks SVG ikut diskalakan
            lebar panel, jadi ukurannya tidak pernah sama dengan tulisan di
            sekitarnya. */}
        <div className="pointer-events-none absolute inset-0 text-[9px] leading-none">
          {revealReach && reach > 0 && (
            <span
              className="absolute -translate-y-full whitespace-nowrap font-medium text-[#f0a35e]"
              style={{ left: 0, top: pctY(BAR_Y - 1) }}
            >
              {reachText}
            </span>
          )}
          {revealReach && reach > 0 && !allRisky && reach < TRANSECT_LENGTH_M * 0.7 && (
            <span
              className="absolute right-0 -translate-y-full whitespace-nowrap text-[#7fd4a8]"
              style={{ top: pctY(BAR_Y - 1) }}
            >
              {CHART_TEXT.safe}
            </span>
          )}
          {guessM !== null && (
            <span
              className="absolute whitespace-nowrap rounded-sm bg-black/60 px-1 py-0.5 text-white"
              style={{ left: pctX(xOf(guessM) + 2), top: pctY(yOf(DRAWN_DEPTH_M * 0.62)) }}
            >
              {GUESS_TEXT.chartLabel}
            </span>
          )}
          <span
            className="absolute right-1 -translate-y-full pb-px text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]"
            style={{ top: pctY(limitY) }}
          >
            {CHART_TEXT.limit}
          </span>
        </div>
      </div>

      {/* Jarak dari kanal. */}
      <div className="mt-1 flex items-baseline justify-between text-[9px] tabular-nums text-white/45">
        <span>{CHART_TEXT.canal}</span>
        <span>500 m</span>
        <span>1 km</span>
      </div>

      {/* Keterangan warna. */}
      <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] text-white/60">
        <li className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-[2px] bg-[#d9a066]" />
          {CHART_TEXT.dry}
        </li>
        <li className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-[2px] bg-[#3f88b0]" />
          {CHART_TEXT.wet}
        </li>
      </ul>
    </figure>
  );
}
