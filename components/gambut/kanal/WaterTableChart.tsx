"use client";

import { useCallback, useMemo, useRef } from "react";
import {
  waterDepthAt,
  PROFILE_DEPTH_M,
  TRANSECT_LENGTH_M,
  WATER_LIMIT_M,
  type DrainageSim,
  type DrainageStats,
} from "@/lib/drainage";
import { NEAR_LENGTH_M } from "./scene/transect";
import { FIGURE_NOTE, PROBE_TEXT } from "@/config/kanal-content";
import { judgeProbe } from "./probe";

// Kurva muka air tanah sepanjang satu kilometer.
//
// --- Mengapa grafik, bukan bagian dari bongkahan ----------------------------
//
// Babak 02 meminta pembaca menemukan satu angka: sampai jarak berapa dari
// kanal muka airnya masih melewati batas 40 cm. Pertanyaan itu pertanyaan
// pengukuran, dan pengukuran menuntut sumbu, penggaris, dan garis ambang yang
// dapat dilihat perpotongannya.
//
// Rancangan sebelumnya mencoba menjawabnya di dalam gambar tiga dimensi:
// seluruh transek 1.000 m digambar sebagai bongkahan tanah, dan muka airnya
// digambar sebagai garis tipis di dalamnya. Yang didapat pembaca adalah
// gambar yang terlalu jauh untuk dikenali sebagai lanskap sekaligus terlalu
// penuh untuk dibaca sebagai bagan — dan kanal yang menjadi pokok seluruh
// modul tinggal selebar jarum.
//
// Jadi pengukurannya dipindahkan ke sini, ke bentuk yang memang dibuat untuk
// mengukur. Bongkahan di sebelahnya tidak lagi perlu memuat satu kilometer,
// dan karena itu dapat kembali menjadi gambar sebuah tempat.
//
// Hubungan keduanya ditandai: petak yang digambar bongkahan ditebalkan pada
// sumbu grafik ini, supaya pembaca melihat sendiri betapa kecil bagian yang
// sedang dilihatnya dari dekat — dan bahwa sisanya, yang tidak terlihat,
// mengalami hal yang sama.

/** Ukuran gambar grafik dalam satuan viewBox. */
const W = 212;
const H = 104;
const PAD_L = 4;
const PAD_R = 6;
const PAD_T = 8;
const PAD_B = 16;

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

/** Kedudukan tegak untuk kedalaman muka air `d` meter di bawah permukaan. */
function yOf(d: number): number {
  return PAD_T + Math.min(1, d / PROFILE_DEPTH_M) * PLOT_H;
}

type Props = {
  sim: DrainageSim;
  stats: DrainageStats;
  /** Jarak yang sedang ditandai pembaca (m), atau null bila belum menandai. */
  probeM?: number | null;
  /** Dipanggil saat pembaca menggeser penandanya. */
  onProbe?: (m: number) => void;
  /** Penanda hanya dapat digeser pada babak yang memintanya. */
  interactive?: boolean;
  /**
   * Tampilkan jarak tepi daerah rawan sebagai angka.
   *
   * Dimatikan pada babak 02, dan itu bukan kerapian melainkan syarat: babak
   * itu meminta pembaca mencari tepinya sendiri. Dicetak di atas grafik yang
   * sedang ia telusuri, angka itu menjawab pertanyaannya sebelum ia sempat
   * bertanya, dan tugasnya berubah menjadi menyalin.
   */
  revealReach?: boolean;
  /**
   * Penanda yang berubah nilainya memicu ulang animasi kurva.
   *
   * Dipakai babak 02: kurvanya digambar dari tepi kanal ke luar, dan itu
   * diulang tiap kali kedalaman kanal berubah — sebab kurvanya memang
   * berubah. Dinyatakan sebagai nilai dari luar, bukan ditebak di dalam,
   * supaya pemanggilnya yang memutuskan kapan gerakan itu pantas.
   */
  sweepKey?: string | number;
  /** Pengguna meminta gerak dikurangi. */
  reducedMotion?: boolean;
};

export default function WaterTableChart({
  sim,
  stats,
  probeM = null,
  onProbe,
  interactive = false,
  revealReach = true,
  sweepKey,
  reducedMotion = false,
}: Props) {
  // Dihitung ulang tiap kali ringkasan diperbarui — lima kali sedetik, dan
  // hanya 72 titik. Yang mahal pada modul ini adalah kanvas 3D di belakangnya,
  // bukan tujuh puluh dua pembagian.
  // `stats` tampak tidak terpakai di dalam, dan memang begitu — tetapi ia
  // yang menjadi tanda bahwa simulasinya sudah berubah. `sim` sebuah obyek
  // yang isinya berubah di tempat, jadi acuannya tidak pernah berganti dan
  // tidak dapat dipakai sebagai syarat hitung ulang. Yang berganti tiap
  // pembaruan adalah ringkasan ini.
  const { curve, area } = useMemo(() => {
    const depth = sim.effectiveCanalDepth();
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const m = (i / SAMPLES) * TRANSECT_LENGTH_M;
      const water = waterDepthAt(m, depth, sim.subsidenceAtDistance(m));
      points.push({ x: xOf(m), y: yOf(water) });
    }
    const curve = smoothPath(points);
    return {
      curve,
      // Daerah antara permukaan dan muka air: inilah lapisan kering yang
      // menjadi bahan bakar, dan luasnya yang tumbuh dari babak ke babak.
      // Memakai ulang lintasan kurvanya sendiri, lalu ditutup di sepanjang
      // garis permukaan — dengan begitu tepi atas daerah ini tidak mungkin
      // berbeda sedikit pun dari kurvanya.
      area: `M${xOf(0).toFixed(2)},${yOf(0).toFixed(2)}L${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}${curve.slice(
        curve.indexOf("C"),
      )}L${xOf(TRANSECT_LENGTH_M).toFixed(2)},${yOf(0).toFixed(2)}Z`,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim, stats]);

  const limitY = yOf(WATER_LIMIT_M);
  const reach = stats.riskReachM;

  const svgRef = useRef<SVGSVGElement>(null);
  const verdict = judgeProbe(probeM, reach);

  // Kedalaman muka air tepat di penanda — inilah yang dibaca pembaca untuk
  // memutuskan apakah ia sudah sampai di tepinya.
  const probeWater =
    probeM === null
      ? null
      : waterDepthAt(probeM, sim.effectiveCanalDepth(), sim.subsidenceAtDistance(probeM));

  /** Ubah kedudukan penunjuk pada layar menjadi jarak dalam meter. */
  const distanceAt = useCallback((clientX: number): number => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const box = svg.getBoundingClientRect();
    const u = ((clientX - box.left) / box.width) * W;
    const m = ((u - PAD_L) / PLOT_W) * TRANSECT_LENGTH_M;
    return Math.max(0, Math.min(TRANSECT_LENGTH_M, Math.round(m / 5) * 5));
  }, []);

  const handlePointer = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!interactive || !onProbe) return;
      // Hanya menggeser saat tombolnya ditekan, supaya melewatkan tetikus di
      // atas grafik tidak diam-diam mengubah jawaban pembaca.
      if (e.type === "pointermove" && e.buttons === 0) return;
      if (e.type === "pointerdown") e.currentTarget.setPointerCapture(e.pointerId);
      onProbe(distanceAt(e.clientX));
    },
    [interactive, onProbe, distanceAt],
  );

  const handleKey = useCallback(
    (e: React.KeyboardEvent<SVGSVGElement>) => {
      if (!interactive || !onProbe) return;
      // Penanda harus dapat digeser dari papan tombol: tugas babak 02 adalah
      // syarat untuk melanjutkan, jadi ia tidak boleh hanya dapat dikerjakan
      // dengan tetikus.
      const step = e.shiftKey ? 100 : 25;
      const at = probeM ?? Math.round(TRANSECT_LENGTH_M / 2);
      if (e.key === "ArrowLeft") onProbe(Math.max(0, at - step));
      else if (e.key === "ArrowRight") onProbe(Math.min(TRANSECT_LENGTH_M, at + step));
      else if (e.key === "Home") onProbe(0);
      else if (e.key === "End") onProbe(TRANSECT_LENGTH_M);
      else return;
      e.preventDefault();
    },
    [interactive, onProbe, probeM],
  );

  // Kurva digambar dari tepi kanal ke luar. Inilah animasi babak 02, dan
  // babak itu sebelumnya satu-satunya yang tidak ada gerakannya sama sekali:
  // pembaca diminta memperhatikan bahwa pengeringan memanjang ratusan meter,
  // tetapi yang dilihatnya gambar diam. Menggambar kurvanya dari kanal ke
  // luar memperlihatkan pemanjangan itu, bukan sekadar menyatakannya.
  const sweep = interactive && !reducedMotion;
  const probeColor = verdict === "found" || verdict === "beyondFound" ? "#7fd4a8" : "#ffffff";

  return (
    <figure className="m-0">
      <figcaption className="mb-2">
        <span className="block text-[10px] uppercase tracking-[0.16em] text-white/45">
          {FIGURE_NOTE.chart}
        </span>
        <span className="mt-0.5 block text-[10px] leading-snug text-white/40">
          {FIGURE_NOTE.chartLead}
        </span>
      </figcaption>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className={`w-full touch-none overflow-visible ${interactive ? "cursor-ew-resize" : ""}`}
        tabIndex={interactive ? 0 : undefined}
        onPointerDown={handlePointer}
        onPointerMove={handlePointer}
        onKeyDown={handleKey}
        role={interactive ? "slider" : "img"}
        aria-valuemin={interactive ? 0 : undefined}
        aria-valuemax={interactive ? TRANSECT_LENGTH_M : undefined}
        aria-valuenow={interactive && probeM !== null ? Math.round(probeM) : undefined}
        aria-valuetext={
          interactive && probeM !== null
            ? `${Math.round(probeM)} meter dari kanal, muka air ${Math.round((probeWater ?? 0) * 100)} sentimeter`
            : undefined
        }
        aria-label={
          reach > 0
            ? `Kurva muka air tanah dari kanal sampai 1.000 meter. Muka air melewati batas 40 sentimeter sampai jarak ${Math.round(reach)} meter.`
            : "Kurva muka air tanah dari kanal sampai 1.000 meter. Muka air masih di atas batas 40 sentimeter di seluruh penampang."
        }
      >
        <defs>
          {/* Lapisan kering memudar ke bawah, bukan satu blok rata. Blok rata
              membuat grafik ini terbaca sebagai kotak-kotak yang ditempel,
              bukan sebagai keadaan tanah yang berangsur berubah. */}
          <linearGradient id="kanal-dry" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0a265" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#c07a3a" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="kanal-window" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Petak yang digambar besar di sebelah: hanya ujung kiri grafik ini.
            Dibuat memudar, bukan kotak bertepi tajam, supaya ia terbaca
            sebagai "bagian ini" dan bukan sebagai palang kedua. */}
        <rect
          x={xOf(0)}
          y={PAD_T - 4}
          width={xOf(NEAR_LENGTH_M) - xOf(0)}
          height={PLOT_H + 4}
          fill="url(#kanal-window)"
        />

        {/* Permukaan tanah. */}
        <line
          x1={PAD_L}
          y1={yOf(0)}
          x2={W - PAD_R}
          y2={yOf(0)}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="0.8"
        />

        {/* Batas 40 cm PP 57/2016. */}
        <line
          x1={PAD_L}
          y1={limitY}
          x2={W - PAD_R}
          y2={limitY}
          stroke="#f0a35e"
          strokeOpacity="0.75"
          strokeWidth="0.9"
          strokeDasharray="2.5 3"
          strokeLinecap="round"
        />

        <g key={sweep ? sweepKey : "diam"}>
          {/* Lapisan kering di atas muka air: bahan bakarnya. */}
          <path d={area} fill="url(#kanal-dry)" className={sweep ? "kanal-fill" : undefined} />

          {/* Tanda tempat kurva menyeberangi batas. */}
          {revealReach && reach > 0 && reach < TRANSECT_LENGTH_M && (
            <line
              x1={xOf(reach)}
              y1={yOf(WATER_LIMIT_M)}
              x2={xOf(reach)}
              y2={PAD_T + PLOT_H}
              stroke="rgba(240,163,94,0.45)"
              strokeWidth="0.9"
              strokeDasharray="2 2"
            />
          )}

          {/* Kurva muka air, dengan nyala lembut di bawahnya supaya ia tidak
              tampak sebagai garis patah-patah pada layar rapat. */}
          <path
            d={curve}
            pathLength={1}
            fill="none"
            stroke="#6fb6d8"
            strokeOpacity="0.22"
            strokeWidth="3.4"
            strokeLinejoin="round"
            strokeLinecap="round"
            className={sweep ? "kanal-draw" : undefined}
          />
          <path
            d={curve}
            pathLength={1}
            fill="none"
            stroke="#8fcce8"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            className={sweep ? "kanal-draw" : undefined}
          />
        </g>

        {/* Penanda jarak yang digeser pembaca — tugas babak 02. */}
        {probeM !== null && (
          <g>
            <line
              x1={xOf(probeM)}
              y1={PAD_T - 4}
              x2={xOf(probeM)}
              y2={PAD_T + PLOT_H}
              stroke={probeColor}
              strokeOpacity="0.55"
              strokeWidth="1"
            />
            <circle cx={xOf(probeM)} cy={yOf(probeWater ?? 0)} r="4.5" fill={probeColor} fillOpacity="0.2" />
            <circle cx={xOf(probeM)} cy={yOf(probeWater ?? 0)} r="2.2" fill={probeColor} />
          </g>
        )}
      </svg>

      {/* Sumbu jarak ditulis sebagai DOM, bukan sebagai teks di dalam SVG.
          Teks SVG setinggi tujuh satuan viewBox diskalakan oleh lebar panel,
          jadi ukurannya tidak pernah sama dengan tulisan di sekitarnya dan
          tepinya kabur — itulah yang membuat grafik ini tampak sebagai
          tempelan, bukan sebagai bagian dari halaman yang sama. */}
      <div className="mt-1 flex items-baseline justify-between text-[9px] tabular-nums text-white/35">
        <span>0</span>
        <span>500</span>
        <span>1.000 m</span>
      </div>
      <p className="mt-1 text-[9px] leading-snug text-white/30">{FIGURE_NOTE.window(NEAR_LENGTH_M)}</p>

      <div className="mt-1.5 flex items-baseline justify-between gap-2 text-[10px]">
        <span className="text-[#f0a35e]/80">batas 40 cm</span>
        <span className="text-white/40">
          {!revealReach ? (
            "sampai jarak berapa?"
          ) : reach > 0 ? (
            <>
              rawan sampai{" "}
              <span className="font-medium tabular-nums text-[#f0a35e]">{Math.round(reach)} m</span>
            </>
          ) : (
            "seluruhnya di atas batas"
          )}
        </span>
      </div>

      {/* Bacaan penanda. Hanya muncul pada babak yang memintanya, supaya
          grafik ini tetap menjadi bacaan sekilas di babak-babak lainnya. */}
      {interactive && (
        <div className="mt-1.5 border-t border-white/10 pt-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[10px] uppercase tracking-[0.14em] text-white/40">
              {PROBE_TEXT.label}
            </span>
            <span className="text-[11px] font-medium tabular-nums text-white">
              {probeM === null ? "—" : `${Math.round(probeM)} m`}
            </span>
          </div>
          {probeWater !== null && (
            <p className="mt-0.5 text-[10px] tabular-nums text-white/45">
              Muka air di sini {Math.round(probeWater * 100)} cm
              <span className={probeWater > WATER_LIMIT_M ? "text-[#f0a35e]" : "text-[#7fd4a8]"}>
                {probeWater > WATER_LIMIT_M ? " · rawan" : " · aman"}
              </span>
            </p>
          )}
          <p
            className={`mt-1 text-[10px] leading-snug ${
              verdict === "found" || verdict === "beyondFound" ? "text-[#7fd4a8]" : "text-white/55"
            }`}
          >
            {PROBE_TEXT[verdict]}
          </p>
        </div>
      )}
    </figure>
  );
}
