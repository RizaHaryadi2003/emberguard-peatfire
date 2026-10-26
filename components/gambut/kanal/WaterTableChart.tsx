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
import { PROBE_TEXT } from "@/config/kanal-content";
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
};

export default function WaterTableChart({
  sim,
  stats,
  probeM = null,
  onProbe,
  interactive = false,
  revealReach = true,
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
    const points: string[] = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const m = (i / SAMPLES) * TRANSECT_LENGTH_M;
      const water = waterDepthAt(m, depth, sim.subsidenceAtDistance(m));
      points.push(`${xOf(m).toFixed(2)},${yOf(water).toFixed(2)}`);
    }
    return {
      curve: `M${points.join("L")}`,
      // Daerah antara permukaan dan muka air: inilah lapisan kering yang
      // menjadi bahan bakar, dan luasnya yang tumbuh dari babak ke babak.
      area: `M${xOf(0)},${yOf(0)}L${points.join("L")}L${xOf(TRANSECT_LENGTH_M)},${yOf(0)}Z`,
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

  return (
    <figure className="m-0">
      <figcaption className="mb-2">
        <span className="block text-[10px] uppercase tracking-[0.16em] text-white/45">
          Muka air tanah
        </span>
        <span className="mt-0.5 block text-[10px] leading-snug text-white/35">
          {!revealReach ? (
            "Sampai jarak berapa dari kanal?"
          ) : reach > 0 ? (
            <>
              Rawan sampai{" "}
              <span className="font-medium tabular-nums text-[#f0a35e]">{Math.round(reach)} m</span>{" "}
              dari kanal
            </>
          ) : (
            "Seluruh penampang masih di atas batas"
          )}
        </span>
      </figcaption>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className={`w-full touch-none ${interactive ? "cursor-ew-resize" : ""}`}
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
        {/* Lapisan kering di atas muka air. */}
        <path d={area} fill="rgba(214,150,86,0.16)" />

        {/* Petak yang digambar bongkahan di sebelah: beberapa puluh meter
            pertama saja. Ditandai supaya pembaca tahu bahwa gambar besar itu
            hanya ujung kiri grafik ini. */}
        <rect
          x={xOf(0)}
          y={PAD_T}
          width={xOf(NEAR_LENGTH_M) - xOf(0)}
          height={PLOT_H}
          fill="rgba(255,255,255,0.12)"
        />

        {/* Permukaan tanah. */}
        <line x1={PAD_L} y1={yOf(0)} x2={W - PAD_R} y2={yOf(0)} stroke="rgba(255,255,255,0.35)" strokeWidth="1" />

        {/* Batas 40 cm PP 57/2016. */}
        <line
          x1={PAD_L}
          y1={limitY}
          x2={W - PAD_R}
          y2={limitY}
          stroke="#f0a35e"
          strokeWidth="1"
          strokeDasharray="3 2.5"
        />
        <text x={W - PAD_R} y={limitY - 2.5} textAnchor="end" fill="#f0a35e" fontSize="7">
          40 cm
        </text>

        {/* Tanda tempat kurva menyeberangi batas — jawaban babak 02. */}
        {revealReach && reach > 0 && reach < TRANSECT_LENGTH_M && (
          <line
            x1={xOf(reach)}
            y1={PAD_T}
            x2={xOf(reach)}
            y2={PAD_T + PLOT_H}
            stroke="rgba(240,163,94,0.55)"
            strokeWidth="1"
          />
        )}

        {/* Kurva muka air. */}
        <path d={curve} fill="none" stroke="#6fb6d8" strokeWidth="1.6" strokeLinejoin="round" />

        {/* Penanda jarak yang digeser pembaca — tugas babak 02. */}
        {probeM !== null && (
          <g>
            <line
              x1={xOf(probeM)}
              y1={PAD_T - 3}
              x2={xOf(probeM)}
              y2={PAD_T + PLOT_H}
              stroke={verdict === "found" || verdict === "beyondFound" ? "#7fd4a8" : "#ffffff"}
              strokeWidth="1.4"
            />
            <circle
              cx={xOf(probeM)}
              cy={yOf(probeWater ?? 0)}
              r="3"
              fill={verdict === "found" || verdict === "beyondFound" ? "#7fd4a8" : "#ffffff"}
            />
          </g>
        )}

        {/* Penanda jarak. */}
        {[0, 500, 1000].map((m) => (
          <text
            key={m}
            x={xOf(m)}
            y={H - 5}
            textAnchor={m === 0 ? "start" : m === 1000 ? "end" : "middle"}
            fill="rgba(255,255,255,0.4)"
            fontSize="7"
          >
            {m === 1000 ? "1.000 m" : m}
          </text>
        ))}
      </svg>

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
