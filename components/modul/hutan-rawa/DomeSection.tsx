"use client";

import { useMemo, type ReactNode } from "react";
import { FOREST_ZONES, HUTAN_TEXT, type ForestZone } from "@/config/modul/hutan-rawa";

// Penampang samping kubah gambut, dari tepi hutan (kiri) ke puncak kubah
// (kanan).
//
// Dua sumbu, dua satuan, dan keduanya ditulis: mendatar dalam kilometer,
// tegak dalam meter. Tebal gambut, tinggi pohon, dan tinggi pejalan memakai
// skala tegak yang SAMA, sebab yang dibandingkan pembaca justru ketiganya:
// orang 1,7 m di bawah pohon 45 m, di atas gambut 13 m. Mendatarnya jauh lebih
// rapat (14 km), dan itu dikatakan di bawah gambar, tidak disembunyikan.
//
// Kinerja: pohon, tanah, dan langit digambar sekali (useMemo) lalu tidak
// berubah. Yang bergerak hanya pejalan, air, dan siluet satwa. Hujan berupa
// lapisan HTML terpisah yang digeser GPU, bukan garis-garis di dalam SVG.

const W = 1000;
const H = 640;
/** Panjang penampang (km). */
const SPAN_KM = 14;
/** Piksel per meter tegak. */
const PX_PER_M = 9;
/** Garis dasar tanah mineral di bawah gambut. */
const BASE_Y = 560;
/** Tinggi orang dewasa sebagai pejalan (m). */
const PERSON_M = 1.7;
/**
 * Seberapa tinggi banjir naik di atas tepi sungai (m). Ilustratif: sumber
 * hanya menyebut "batas banjir sungai" tanpa angka, jadi batasnya dihitung
 * dari titik pertemuan muka banjir dengan lereng kubah, bukan ditulis sebagai
 * jarak.
 */
const FLOOD_RISE_M = 3;

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

/** Muka air banjir dan jarak tempat air itu bertemu lereng kubah. */
const FLOOD_Y = surfaceY(0) - FLOOD_RISE_M * PX_PER_M;
const FLOOD_KM = (() => {
  for (let k = 0; k <= SPAN_KM; k += 0.02) if (surfaceY(k) <= FLOOD_Y) return k;
  return SPAN_KM;
})();

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

type Tree = { km: number; heightM: number; crown: number; zone: ForestZone["id"]; shade: number; lean: number };

/** Garis permukaan gambut dari `fromKm` ke `toKm`, sebagai titik-titik "x,y". */
function surfacePoints(fromKm: number, toKm: number, step = 0.1): string[] {
  const pts: string[] = [];
  for (let k = fromKm; k < toKm; k += step) pts.push(`${xOf(k).toFixed(1)},${surfaceY(k).toFixed(1)}`);
  pts.push(`${xOf(toKm).toFixed(1)},${surfaceY(toKm).toFixed(1)}`);
  return pts;
}

const SURFACE = surfacePoints(0, SPAN_KM);
const PEAT_PATH = `M0,${BASE_Y} L${SURFACE.join(" L")} L${W},${BASE_Y} Z`;
const VIEWBOX = `-50 0 ${W + 70} ${H}`;

/** Satu pohon. Bentuknya mengikuti jenis hutan, warnanya sedikit beragam. */
function TreeShape({ t }: { t: Tree }) {
  const x = xOf(t.km);
  const y = surfaceY(t.km);
  const h = t.heightM * PX_PER_M;
  const g = 0.72 + t.shade * 0.3;
  const dark = `rgb(${Math.round(30 * g)},${Math.round(66 * g)},${Math.round(38 * g)})`;
  const mid = `rgb(${Math.round(44 * g)},${Math.round(92 * g)},${Math.round(50 * g)})`;
  const light = `rgb(${Math.round(70 * g)},${Math.round(128 * g)},${Math.round(68 * g)})`;
  const top = y - h;
  const tx = x + t.lean * h * 0.05;

  if (t.zone === "tiang") {
    // Hutan tiang rendah: batang ramping, tajuk sempit.
    const ry = h * (0.13 + t.crown * 0.04);
    const rx = 6 + t.crown * 3;
    return (
      <g>
        <line x1={x} y1={y} x2={tx} y2={top + ry} stroke="#4a3a2b" strokeWidth={1.6} />
        <ellipse cx={tx} cy={top + ry} rx={rx} ry={ry} fill={dark} />
        <ellipse cx={tx - rx * 0.25} cy={top + ry * 0.75} rx={rx * 0.6} ry={ry * 0.6} fill={mid} />
      </g>
    );
  }

  // Hutan campuran dan hutan tinggi: tajuk bergumpal, hutan tinggi berbanir.
  const tall = t.zone === "tinggi";
  // Lebar tajuk sebanding dengan tinggi pohon, supaya tajuk-tajuk saling
  // bertaut menjadi kanopi, bukan bola kecil di ujung tiang.
  const r = h * (tall ? 0.1 + t.crown * 0.05 : 0.12 + t.crown * 0.05);
  const trunkW = tall ? 2.6 + (t.heightM / 45) * 2.4 : 2;
  return (
    <g>
      <path d={`M${x - trunkW},${y} L${tx - trunkW * 0.4},${top + r} L${tx + trunkW * 0.4},${top + r} L${x + trunkW},${y} Z`} fill="#4a3a2b" />
      {tall && t.heightM > 30 && <path d={`M${x - trunkW * 3},${y} L${x},${y - 14} L${x + trunkW * 3},${y} Z`} fill="#3f3124" />}
      <circle cx={tx - r * 0.7} cy={top + r * 1.05} r={r * 0.75} fill={dark} />
      <circle cx={tx + r * 0.7} cy={top + r * 1.0} r={r * 0.8} fill={dark} />
      <circle cx={tx} cy={top + r * 0.8} r={r} fill={mid} />
      <circle cx={tx - r * 0.3} cy={top + r * 0.5} r={r * 0.5} fill={light} fillOpacity={0.8} />
    </g>
  );
}

/** Orangutan bergelantung: tubuh besar kemerahan, lengan panjang ke dahan. */
function Orangutan({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(1.7) translate(${-x} ${-y})`}>
    <g className="hutan-pop" style={{ animationDelay: `${delay}s` }}>
      <path d={`M${x - 6},${y} Q${x - 7},${y + 8} ${x - 3},${y + 12}`} stroke="#b4562a" strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <path d={`M${x + 6},${y} Q${x + 7},${y + 8} ${x + 3},${y + 12}`} stroke="#b4562a" strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <ellipse cx={x} cy={y + 15} rx={5.5} ry={6.5} fill="#c0602e" />
      <circle cx={x} cy={y + 7.5} r={3.6} fill="#a24c25" />
      <path d={`M${x - 3},${y + 20} L${x - 4},${y + 25} M${x + 3},${y + 20} L${x + 4},${y + 25}`} stroke="#b4562a" strokeWidth={2.2} strokeLinecap="round" />
    </g>
    </g>
  );
}

/** Owa berayun: tubuh ramping gelap, lengan sangat panjang terentang. */
// Owa kalimantan berbulu cokelat keabuan; dibuat lebih terang dari warna
// aslinya supaya terbaca di atas tajuk yang gelap.
function Gibbon({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(1.7) translate(${-x} ${-y})`}>
    <g className="hutan-pop" style={{ animationDelay: `${delay}s` }}>
      <path d={`M${x - 10},${y} Q${x - 4},${y + 4} ${x},${y + 8} Q${x + 6},${y + 3} ${x + 9},${y - 2}`} stroke="#b9ab98" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      <circle cx={x} cy={y + 8} r={2.6} fill="#c9bba6" />
      <circle cx={x} cy={y + 8} r={1.3} fill="#3a332d" />
      <ellipse cx={x} cy={y + 13.5} rx={2.8} ry={4.2} fill="#b9ab98" />
      <path d={`M${x - 1.5},${y + 17} L${x - 3},${y + 21} M${x + 1.5},${y + 17} L${x + 3},${y + 21}`} stroke="#b9ab98" strokeWidth={1.6} strokeLinecap="round" />
    </g>
    </g>
  );
}

/** Banyaknya siluet menurut tingkat relatif di config (bukan hitungan). */
const APE_COUNT: Record<string, number> = { rendah: 1, sedang: 2, tinggi: 4 };

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
    for (let km = 0.1; km < SPAN_KM - 0.05; ) {
      const z = zoneAt(km);
      const h = z.treeMinM + (z.treeMaxM - z.treeMinM) * Math.pow(rand(), z.id === "tinggi" ? 1.6 : 1);
      out.push({ km, heightM: h, crown: rand(), zone: z.id, shade: rand(), lean: rand() - 0.5 });
      // Hutan tiang rapat dan kecil, hutan tinggi lebih jarang.
      km += z.id === "tiang" ? 0.12 + rand() * 0.06 : z.id === "tinggi" ? 0.22 + rand() * 0.1 : 0.18 + rand() * 0.08;
    }
    return out;
  }, []);

  // Lapisan diam: langit, tanah, gambut, pohon. Digambar sekali saja.
  const staticLayer = useMemo<ReactNode>(() => {
    // Pohon yang lebih rendah digambar dulu, supaya tajuk tinggi tampak di depan.
    const ordered = [...trees].sort((a, b) => a.heightM - b.heightM);
    return (
      <>
        <defs>
          <linearGradient id="hutan-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f1d17" stopOpacity="0" />
            <stop offset="100%" stopColor="#1d3326" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="hutan-peat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f3925" />
            <stop offset="100%" stopColor="#2a1d14" />
          </linearGradient>
          {/* Serat sisa tumbuhan di dalam gambut. */}
          <pattern id="hutan-fibre" patternUnits="userSpaceOnUse" width="46" height="14">
            <path d="M3,4 l14,-1.5 M24,10 l16,1 M8,12 l9,-1" stroke="#6b4e33" strokeOpacity="0.55" strokeWidth="1.1" fill="none" />
          </pattern>
          <pattern id="hutan-mineral" patternUnits="userSpaceOnUse" width="10" height="10">
            <circle cx="3" cy="4" r="0.9" fill="#6a685b" />
            <circle cx="8" cy="8" r="0.7" fill="#5c5a4f" />
          </pattern>
        </defs>

        <rect x={-50} y={0} width={W + 70} height={BASE_Y} fill="url(#hutan-sky)" />

        {/* Pohon. */}
        {ordered.map((t, i) => (
          <TreeShape key={i} t={t} />
        ))}

        {/* Tanah mineral dan gambut. */}
        <rect x={-50} y={BASE_Y} width={W + 70} height={H - BASE_Y} fill="#4b4a40" />
        <rect x={-50} y={BASE_Y} width={W + 70} height={H - BASE_Y} fill="url(#hutan-mineral)" />
        <path d={PEAT_PATH} fill="url(#hutan-peat)" />
        <path d={PEAT_PATH} fill="url(#hutan-fibre)" />
        <polyline points={SURFACE.join(" ")} fill="none" stroke="#2f5a32" strokeWidth={3} />
        <text x={xOf(12)} y={BASE_Y - 30} fill="#e0bb90" fillOpacity={0.85} fontSize={17} textAnchor="middle">
          gambut
        </text>
        <text x={xOf(7)} y={BASE_Y + 48} fill="#ffffff" fillOpacity={0.45} fontSize={17} textAnchor="middle">
          tanah mineral
        </text>
      </>
    );
  }, [trees]);

  // Pohon tempat siluet satwa bergantung: yang tertinggi di tiap jenis hutan.
  const apeSpots = useMemo(() => {
    const spots: Record<string, { x: number; y: number }[]> = {};
    for (const z of FOREST_ZONES) {
      const n = APE_COUNT[z.apes] ?? 1;
      const span = (z.toKm - z.fromKm) / n;
      // Zona dibagi n ruas sama panjang; satwa bergantung di pohon tertinggi
      // tiap ruas, supaya tersebar dan tidak berkumpul di satu pohon.
      spots[z.id] = Array.from({ length: n }, (_, i) => {
        const from = z.fromKm + span * i;
        const inBin = trees.filter((t) => t.zone === z.id && t.km >= from && t.km < from + span);
        const t = inBin.reduce((a, b) => (b.heightM > a.heightM ? b : a), inBin[0]);
        const h = t.heightM * PX_PER_M;
        // Tepat di bawah tajuk, tempat satwa bergantung pada dahan.
        const below = t.zone === "tiang" ? h * (0.26 + t.crown * 0.08) : h * (t.zone === "tinggi" ? 0.1 + t.crown * 0.05 : 0.12 + t.crown * 0.05) * 1.9;
        return { x: xOf(t.km) + t.lean * h * 0.05, y: surfaceY(t.km) - h + below };
      });
    }
    return spots;
  }, [trees]);

  const walkerX = walkerKm === null ? null : xOf(walkerKm);
  const walkerZone = walkerKm === null ? null : zoneAt(walkerKm);
  const walkerPeat = walkerKm === null ? 0 : peatThicknessM(walkerKm);

  // Air banjir: ruang antara muka banjir dan tanah, dari sungai sampai lereng.
  const floodPath = useMemo(() => {
    const ground = surfacePoints(0, FLOOD_KM, 0.05).reverse();
    return `M-50,${FLOOD_Y} L${xOf(FLOOD_KM).toFixed(1)},${FLOOD_Y} L${ground.join(" L")} L0,${BASE_Y} L-50,${BASE_Y} Z`;
  }, []);

  return (
    // Di ponsel panel kendali menindih tepi bawah gambar: diberi jarak di
    // babak 01–02, dan baris nama jenis hutan hanya tampil di babak 03 saat
    // memang perlu ditekan (nama jenis hutan sudah ada di panel).
    <div className={`absolute inset-0 flex flex-col ${openedZones ? "" : "pb-12 sm:pb-0"}`}>
      <div className="relative min-h-0 flex-1">
        {/* Lapis diam: dijadikan lapisan GPU sendiri (will-change), jadi
            ratusan tajuk pohon tidak digambar ulang saat pejalan bergeser. */}
        <svg
          viewBox={VIEWBOX}
          preserveAspectRatio="xMidYMax meet"
          className="absolute inset-0 h-full w-full overflow-visible"
          style={{ willChange: "transform" }}
          role="img"
          aria-label="Penampang kubah gambut dari tepi hutan ke puncak kubah"
        >
          {staticLayer}
        </svg>

        {/* Lapis gerak: pejalan, air, satwa, sorotan. */}
        <svg viewBox={VIEWBOX} preserveAspectRatio="xMidYMax meet" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id="hutan-soak" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1f6fa3" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#1f4f73" stopOpacity="0.35" />
            </linearGradient>
            <clipPath id="hutan-peat-clip">
              <path d={PEAT_PATH} />
            </clipPath>
          </defs>

          {/* Sorotan jenis hutan yang sedang dilalui atau dibuka. */}
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
                fillOpacity={lit ? 0.05 : 0}
                pointerEvents="none"
                className="transition-[fill-opacity] duration-500"
              />
            );
          })}

          {/* Batas jenis hutan. */}
          {FOREST_ZONES.slice(1).map((z) => (
            <line key={z.id} x1={xOf(z.fromKm)} y1={30} x2={xOf(z.fromKm)} y2={BASE_Y} stroke="#ffffff" strokeOpacity={0.22} strokeDasharray="4 5" />
          ))}

          {/* Sungai di tepi kiri; permukaannya naik saat banjir. */}
          <path
            d={`M-50,${surfaceY(0) + 4} L2,${surfaceY(0) + 4} Q-4,${BASE_Y + 24} -26,${BASE_Y + 28} L-50,${BASE_Y + 28} Z`}
            fill="#2f6f93"
          />

          {/* Hujan meresap: gambut di seluruh kubah menjadi basah dari atas. */}
          <g clipPath="url(#hutan-peat-clip)" pointerEvents="none">
            <rect
              x={0}
              y={0}
              width={W}
              height={BASE_Y}
              fill="url(#hutan-soak)"
              opacity={rain ? 1 : 0}
              className="transition-opacity duration-[1600ms] ease-out"
              style={{ transitionDelay: rain ? "500ms" : "0ms" }}
            />
          </g>
          {rain && (
            <text x={xOf(9)} y={surfaceY(9) + 34} fill="#cfe9f7" fontSize={15} textAnchor="middle" className="sekitarmu-rise" style={{ animationDelay: "0.9s" }}>
              {HUTAN_TEXT.rainSoak}
            </text>
          )}

          {/* Banjir sungai: muka air naik dari sungai, lalu berhenti di lereng
              kubah karena tanah di belakangnya lebih tinggi. */}
          <g
            pointerEvents="none"
            style={{
              transform: flood ? "translateY(0px)" : `translateY(${FLOOD_RISE_M * PX_PER_M + 6}px)`,
              opacity: flood ? 1 : 0,
              transition: "transform 1.2s cubic-bezier(0.22,1,0.36,1), opacity 0.5s",
            }}
          >
            <path d={floodPath} fill="#3f88b0" fillOpacity={0.85} />
            {/* Lumpur dan hara yang dibawa air sungai. */}
            {Array.from({ length: 14 }, (_, i) => (
              <circle key={i} cx={-40 + ((i * 37) % Math.max(20, xOf(FLOOD_KM) + 30))} cy={FLOOD_Y + 4 + ((i * 7) % 12)} r={1.6} fill="#c79a62" fillOpacity={0.9} />
            ))}
          </g>
          {flood && (
            <g className="sekitarmu-rise" style={{ animationDelay: "0.9s" }}>
              <line x1={xOf(FLOOD_KM)} y1={FLOOD_Y - 70} x2={xOf(FLOOD_KM)} y2={FLOOD_Y} stroke="#9fd3f0" strokeDasharray="4 4" />
              <text x={xOf(FLOOD_KM) + 8} y={FLOOD_Y - 56} fill="#cfe9f7" fontSize={15}>
                {HUTAN_TEXT.floodLimit}
              </text>
              <text x={xOf(FLOOD_KM) + 8} y={FLOOD_Y - 38} fill="#c79a62" fontSize={13}>
                {HUTAN_TEXT.floodCarry}
              </text>
            </g>
          )}

          {/* Satwa di tajuk jenis hutan yang sudah dibuka (babak 03). */}
          {openedZones &&
            FOREST_ZONES.filter((z) => openedZones.has(z.id)).map((z) => (
              <g key={z.id} pointerEvents="none">
                {apeSpots[z.id].map((p, i) =>
                  i % 2 === 0 ? <Orangutan key={i} x={p.x} y={p.y} delay={i * 0.15} /> : <Gibbon key={i} x={p.x} y={p.y} delay={i * 0.15} />,
                )}
              </g>
            ))}

          {/* Jenis hutan dapat ditekan langsung pada penampang (babak 03). */}
          {openedZones &&
            FOREST_ZONES.map((z) => (
              <rect
                key={z.id}
                x={xOf(z.fromKm)}
                y={20}
                width={xOf(z.toKm) - xOf(z.fromKm)}
                height={H - 20}
                fill="transparent"
                className="cursor-pointer"
                onClick={() => onZone?.(z.id)}
                aria-hidden
              />
            ))}

          {/* Pejalan setinggi orang dewasa, dengan pengukur tebal gambut di
              bawah kakinya. */}
          {walkerX !== null && walkerKm !== null && (
            <g pointerEvents="none">
              {/* Pengukur: dari permukaan sampai tanah mineral. */}
              <rect x={walkerX - 3} y={surfaceY(walkerKm)} width={6} height={walkerPeat * PX_PER_M} fill="#f0a35e" fillOpacity={0.9} rx={2} />
              {Array.from({ length: Math.floor(walkerPeat) }, (_, i) => (
                <line key={i} x1={walkerX - 6} x2={walkerX + 6} y1={surfaceY(walkerKm) + (i + 1) * PX_PER_M} y2={surfaceY(walkerKm) + (i + 1) * PX_PER_M} stroke="#2a1d14" strokeWidth={1} />
              ))}
              <text
                x={walkerX + (walkerKm > 11 ? -12 : 12)}
                y={surfaceY(walkerKm) + (walkerPeat * PX_PER_M) / 2 + 5}
                fill="#ffd7b0"
                fontSize={16}
                fontWeight={600}
                textAnchor={walkerKm > 11 ? "end" : "start"}
              >
                {HUTAN_TEXT.gauge(Math.max(1, Math.round(walkerPeat)))}
              </text>
              {/* Orang dewasa 1,7 m, dengan skala yang sama dengan pohon. */}
              <g transform={`translate(${walkerX}, ${surfaceY(walkerKm)})`}>
                <circle cx={0} cy={-PERSON_M * PX_PER_M + 2.2} r={2.4} fill="#ffd7b0" />
                <path d={`M0,${-PERSON_M * PX_PER_M + 4.6} L0,-6 M0,-6 L-2.6,0 M0,-6 L2.6,0 M-3,-11 L3,-11`} stroke="#ffd7b0" strokeWidth={1.8} strokeLinecap="round" />
              </g>
              <g transform={`translate(${walkerX}, ${surfaceY(walkerKm) - PERSON_M * PX_PER_M - 10})`}>
                <rect x={-24} y={-22} width={48} height={20} rx={10} fill="#f0a35e" />
                <text x={0} y={-7.5} fill="#1a120b" fontSize={14} fontWeight={700} textAnchor="middle">
                  {HUTAN_TEXT.you}
                </text>
                <path d="M-4,-2 L0,3 L4,-2 Z" fill="#f0a35e" />
              </g>
            </g>
          )}
        </svg>

        {/* Hujan: satu lapisan HTML yang digeser GPU di atas penampang. */}
        <div
          className={`pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-700 ${rain ? "opacity-100" : "opacity-0"}`}
          style={{ maskImage: "linear-gradient(to bottom, #000 0%, #000 55%, transparent 85%)", WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 55%, transparent 85%)" }}
          aria-hidden
        >
          {rain && (
            <div
              className="hutan-rain absolute -left-4 -right-4 -top-[60px] bottom-0"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cg stroke='%239fd3f0' stroke-opacity='.55' stroke-width='1.3' stroke-linecap='round'%3E%3Cline x1='10' y1='0' x2='8' y2='12'/%3E%3Cline x1='40' y1='22' x2='38' y2='34'/%3E%3Cline x1='25' y1='44' x2='23' y2='56'/%3E%3Cline x1='53' y1='6' x2='51' y2='18'/%3E%3C/g%3E%3C/svg%3E\")",
                backgroundSize: "60px 60px",
              }}
            />
          )}
        </div>
      </div>

      {/* Nama jenis hutan sebagai DOM (dan tombol di babak 03). Di ponsel
          hanya nama pendek, supaya tetap di dalam bingkai gambar. */}
      <div className={`relative mt-1 h-9 w-full shrink-0 sm:block sm:h-14 ${openedZones ? "" : "hidden"}`}>
        {FOREST_ZONES.map((z) => {
          const left = `${((xOf((z.fromKm + z.toKm) / 2) + 50) / (W + 70)) * 100}%`;
          const opened = openedZones?.has(z.id);
          const active = activeZone === z.id;
          const content = (
            <>
              <span className="block whitespace-nowrap text-[11px] font-medium leading-tight text-white sm:text-xs">
                <span className="sm:hidden">{z.short}</span>
                <span className="hidden sm:inline">{z.name}</span>
              </span>
              <span className="hidden text-[10px] text-white/55 sm:block">
                gambut {z.peat} · kanopi {z.canopy}
              </span>
            </>
          );
          return openedZones ? (
            <button
              key={z.id}
              type="button"
              onClick={() => onZone?.(z.id)}
              className={`absolute top-0 -translate-x-1/2 cursor-pointer rounded-xl border px-2 py-1 text-center transition-colors sm:px-2.5 sm:py-1.5 ${
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
      <p className="mt-1 hidden shrink-0 text-center text-[10px] text-white/40 sm:block">
        {openedZones ? HUTAN_TEXT.apesNote : HUTAN_TEXT.scaleNote}
      </p>
    </div>
  );
}
