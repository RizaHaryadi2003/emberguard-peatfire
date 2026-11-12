"use client";

import { useMemo } from "react";
import { FOREST_ZONES, HUTAN_TEXT, type ForestZone } from "@/config/hutan-rawa-content";

// Penampang samping kubah gambut, dari tepi hutan (kiri) ke puncak kubah
// (kanan).
//
// Dua sumbu, dua satuan, dan keduanya ditulis: mendatar dalam kilometer,
// tegak dalam meter. Tebal gambut dan tinggi pohon memakai skala tegak yang
// SAMA, sebab yang dibandingkan pembaca justru keduanya — pohon 45 m di atas
// gambut 13 m. Mendatarnya jauh lebih rapat (14 km), dan itu dikatakan di
// bawah gambar, tidak disembunyikan.

const W = 1000;
const H = 520;
/** Panjang penampang (km). */
const SPAN_KM = 14;
/** Piksel per meter tegak. */
const PX_PER_M = 6.4;
/** Garis dasar tanah mineral di bawah gambut. */
const BASE_Y = 440;

/**
 * Tebal gambut (m) pada jarak `km` dari tepi hutan.
 *
 * Titik 5,5 km (6 m), 10 km (10 m), dan puncak (13 m) mengikuti batas jenis
 * hutan di Husson dkk. (2018). Bagian tepi digambar dangkal tanpa angka,
 * sebab sumber hanya menyebutnya "paling dangkal".
 */
export function peatThicknessM(km: number): number {
  const pts: [number, number][] = [
    [0, 1],
    [2.5, 3],
    [5.5, 6],
    [10, 10],
    [12.5, 12.6],
    [14, 13],
  ];
  const k = Math.max(0, Math.min(SPAN_KM, km));
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    if (k <= x2) {
      const t = (k - x1) / (x2 - x1);
      const s = t * t * (3 - 2 * t);
      return y1 + (y2 - y1) * s;
    }
  }
  return pts[pts.length - 1][1];
}

const xOf = (km: number) => (km / SPAN_KM) * W;
const surfaceY = (km: number) => BASE_Y - peatThicknessM(km) * PX_PER_M;

export function zoneAt(km: number): ForestZone {
  return FOREST_ZONES.find((z) => km < z.toKm) ?? FOREST_ZONES[FOREST_ZONES.length - 1];
}

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Tree = { km: number; heightM: number; crown: number; zone: ForestZone["id"]; shade: number };

type Props = {
  /** Letak pembaca di sepanjang penampang (km), atau null. */
  walkerKm: number | null;
  flood: boolean;
  rain: boolean;
  /** Jenis hutan yang sudah dibuka di babak 03; null bila babak lain. */
  openedZones: ReadonlySet<string> | null;
  activeZone: string | null;
  onZone?: (id: ForestZone["id"]) => void;
};

export default function DomeSection({ walkerKm, flood, rain, openedZones, activeZone, onZone }: Props) {
  // Pohon disebar acak tetapi tetap sama di tiap kunjungan.
  const trees = useMemo<Tree[]>(() => {
    const rand = seeded(20261112);
    const out: Tree[] = [];
    for (let km = 0.08; km < SPAN_KM; km += 0.16 + rand() * 0.08) {
      const z = zoneAt(km);
      const h = z.treeMinM + (z.treeMaxM - z.treeMinM) * Math.pow(rand(), z.id === "tinggi" ? 1.6 : 1);
      out.push({ km, heightM: h, crown: 0.45 + rand() * 0.35, zone: z.id, shade: rand() });
    }
    return out;
  }, []);

  const surface = useMemo(() => {
    let d = `M0,${BASE_Y}`;
    for (let k = 0; k <= SPAN_KM; k += 0.1) d += `L${xOf(k).toFixed(1)},${surfaceY(k).toFixed(1)}`;
    return d + `L${W},${BASE_Y}Z`;
  }, []);
  const surfaceLine = useMemo(() => {
    let d = "";
    for (let k = 0; k <= SPAN_KM; k += 0.1) d += `${d ? "L" : "M"}${xOf(k).toFixed(1)},${surfaceY(k).toFixed(1)}`;
    return d;
  }, []);

  const walkerX = walkerKm === null ? null : xOf(walkerKm);
  const walkerZone = walkerKm === null ? null : zoneAt(walkerKm);

  return (
    <div className="absolute inset-0 flex flex-col justify-center">
      <svg viewBox={`-40 0 ${W + 60} ${H}`} className="w-full overflow-visible" role="img" aria-label="Penampang kubah gambut dari tepi hutan ke puncak kubah">
        <defs>
          <linearGradient id="hutan-peat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4a3524" />
            <stop offset="100%" stopColor="#2a1d14" />
          </linearGradient>
          <linearGradient id="hutan-flood" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5fb0dc" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#5fb0dc" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Langit belakang tiap jenis hutan; disorot saat dibuka/dilalui. */}
        {FOREST_ZONES.map((z) => {
          const lit = activeZone === z.id || walkerZone?.id === z.id;
          return (
            <rect
              key={z.id}
              x={xOf(z.fromKm)}
              y={20}
              width={xOf(z.toKm) - xOf(z.fromKm)}
              height={BASE_Y - 20}
              fill="#ffffff"
              fillOpacity={lit ? 0.06 : 0}
              className="transition-[fill-opacity] duration-500"
            />
          );
        })}

        {/* Sungai di tepi kiri. */}
        <rect x={-40} y={surfaceY(0) + 2} width={40} height={BASE_Y - surfaceY(0) + 30} fill="#3f88b0" />
        <text x={-20} y={BASE_Y + 58} fill="#9fd3f0" fontSize={13} textAnchor="middle">
          sungai
        </text>

        {/* Tanah mineral dan gambut. */}
        <rect x={-40} y={BASE_Y} width={W + 60} height={H - BASE_Y} fill="#4b4a40" />
        <path d={surface} fill="url(#hutan-peat)" />
        <path d={surfaceLine} fill="none" stroke="#7a5b3c" strokeWidth={2} />
        <text x={xOf(11.8)} y={BASE_Y - 22} fill="#d9b48a" fillOpacity={0.8} fontSize={15} textAnchor="middle">
          gambut
        </text>
        <text x={xOf(7)} y={BASE_Y + 42} fill="#ffffff" fillOpacity={0.45} fontSize={15} textAnchor="middle">
          tanah mineral
        </text>

        {/* Pohon. */}
        {trees.map((t, i) => {
          const x = xOf(t.km);
          const y = surfaceY(t.km);
          const h = t.heightM * PX_PER_M;
          const r = Math.max(5, h * 0.16 * t.crown);
          const g = 0.75 + t.shade * 0.25;
          return (
            <g key={i}>
              <line x1={x} y1={y} x2={x} y2={y - h + r * 0.6} stroke="#3b2e22" strokeWidth={t.heightM > 30 ? 3 : 2} />
              <ellipse cx={x} cy={y - h + r * 0.4} rx={r * 1.3} ry={r} fill={`rgb(${Math.round(42 * g)},${Math.round(84 * g)},${Math.round(46 * g)})`} />
            </g>
          );
        })}

        {/* Banjir sungai: hanya sampai batas jangkauannya di tepi hutan. */}
        <g opacity={flood ? 1 : 0} className="transition-opacity duration-700">
          <rect x={-40} y={surfaceY(0) - 22} width={40 + xOf(0.9)} height={30} fill="url(#hutan-flood)" />
          <line x1={xOf(0.9)} y1={surfaceY(0.9) - 60} x2={xOf(0.9)} y2={surfaceY(0.9)} stroke="#9fd3f0" strokeDasharray="4 4" />
          <text x={xOf(0.9) + 6} y={surfaceY(0.9) - 48} fill="#9fd3f0" fontSize={14}>
            batas banjir sungai
          </text>
        </g>

        {/* Hujan: di seluruh kubah. */}
        <g opacity={rain ? 1 : 0} className="transition-opacity duration-700">
          {Array.from({ length: 70 }, (_, i) => {
            const x = (i / 70) * W + ((i * 37) % 13);
            return <line key={i} x1={x} y1={10 + ((i * 53) % 40)} x2={x - 6} y2={60 + ((i * 53) % 40)} stroke="#9fd3f0" strokeOpacity={0.55} strokeWidth={1.4} className="hutan-rain" style={{ animationDelay: `${(i % 7) * 0.12}s` }} />;
          })}
        </g>

        {/* Batas jenis hutan. */}
        {FOREST_ZONES.slice(1).map((z) => (
          <line key={z.id} x1={xOf(z.fromKm)} y1={30} x2={xOf(z.fromKm)} y2={BASE_Y} stroke="#ffffff" strokeOpacity={0.25} strokeDasharray="4 5" />
        ))}

        {/* Pembaca yang berjalan. */}
        {walkerX !== null && walkerKm !== null && (
          <g>
            <line x1={walkerX} y1={surfaceY(walkerKm) - 70} x2={walkerX} y2={BASE_Y} stroke="#f0a35e" strokeWidth={2} />
            <circle cx={walkerX} cy={surfaceY(walkerKm) - 12} r={7} fill="#f0a35e" />
            {/* Tebal gambut di titik itu. */}
            <line x1={walkerX + 10} y1={surfaceY(walkerKm)} x2={walkerX + 10} y2={BASE_Y} stroke="#f0a35e" strokeWidth={4} strokeOpacity={0.8} />
          </g>
        )}
      </svg>

      {/* Nama jenis hutan sebagai DOM (dan tombol di babak 03). */}
      <div className="relative mt-2 h-14 w-full">
        {FOREST_ZONES.map((z) => {
          const left = `${((xOf((z.fromKm + z.toKm) / 2) + 40) / (W + 60)) * 100}%`;
          const opened = openedZones?.has(z.id);
          const active = activeZone === z.id;
          const content = (
            <>
              <span className="block text-[11px] font-medium leading-tight text-white sm:text-xs">{z.name}</span>
              <span className="block text-[10px] text-white/55">
                gambut {z.peat} · kanopi {z.canopy}
              </span>
            </>
          );
          return openedZones ? (
            <button
              key={z.id}
              type="button"
              onClick={() => onZone?.(z.id)}
              className={`absolute top-0 -translate-x-1/2 cursor-pointer rounded-xl border px-2.5 py-1.5 text-center transition-colors ${
                active ? "border-[#f0a35e] bg-[#f0a35e]/20" : opened ? "border-white/30 bg-black/50" : "animate-pulse border-[#6fb6d8] bg-[#6fb6d8]/20"
              }`}
              style={{ left }}
            >
              {content}
            </button>
          ) : (
            <div key={z.id} className="absolute top-0 -translate-x-1/2 text-center" style={{ left }}>
              {content}
            </div>
          );
        })}
      </div>
      <p className="mt-1 text-center text-[10px] text-white/40">{HUTAN_TEXT.scaleNote}</p>
    </div>
  );
}
