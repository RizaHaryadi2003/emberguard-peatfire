"use client";

import { useMemo } from "react";
import {
  waterDepthAt,
  PROFILE_DEPTH_M,
  TRANSECT_LENGTH_M,
  WATER_LIMIT_M,
  type DrainageSim,
  type DrainageStats,
} from "@/lib/drainage";
import { NEAR_LENGTH_M } from "./scene/transect";

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
};

export default function WaterTableChart({ sim, stats }: Props) {
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

  return (
    <figure className="m-0">
      <figcaption className="mb-2">
        <span className="block text-[10px] uppercase tracking-[0.16em] text-white/45">
          Muka air tanah
        </span>
        <span className="mt-0.5 block text-[10px] leading-snug text-white/35">
          {reach > 0 ? (
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
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
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
        {reach > 0 && reach < TRANSECT_LENGTH_M && (
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
    </figure>
  );
}
