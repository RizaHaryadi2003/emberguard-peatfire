"use client";

import { TRANSECT_LENGTH_M, type DrainageStats } from "@/lib/drainage";
import { CHART_TEXT, FIGURE_NOTE, GUESS_TEXT } from "@/config/kanal-content";

// Peta lahan: kanal dan daerah rawan terbakar, dilihat dari atas.
//
// --- Mengapa peta, bukan grafik ---------------------------------------------
//
// Bongkahan 3D hanya memuat beberapa puluh meter pertama, terlalu pendek
// untuk memperlihatkan bahwa kanal mengeringkan lahan sampai ratusan meter.
// Jangkauan itu harus digambar di tempat lain.
//
// Dua rancangan sebelumnya gagal dengan cara yang sama. Grafik garis
// kedalaman muka air, lalu gambar tanah tampak samping, keduanya menuntut
// pembaca lebih dulu memahami muka air tanah — sesuatu di bawah tanah yang
// belum pernah ia lihat — sebelum dapat membaca jawabannya. Pembaca 17 tahun
// tidak sampai ke jawabannya.
//
// Peta dari atas tidak menuntut apa pun: setiap orang sudah membaca peta di
// ponselnya. Kanal di tengah, lahan yang rawan terbakar diwarnai jingga di
// kiri-kanannya, dan ukurannya dibandingkan dengan benda yang dikenal semua
// orang — lapangan bola — yang digambar pada skala yang sama. Pertanyaan
// "sejauh apa" lalu dijawab dengan kalimat yang dapat diulang di media
// sosial: berapa lapangan bola yang menjadi rawan terbakar oleh satu
// kilometer kanal.

/** Ukuran peta dalam satuan viewBox. Satu satuan = 10 m. */
const W = 204;
const H = 104;
const CX = W / 2;
/** Meter per satuan viewBox: seluruh lebar memuat 1 km ke tiap sisi. */
const M_PER_UNIT = (TRANSECT_LENGTH_M * 2) / W;

/**
 * Lapangan sepak bola menurut ukuran FIFA (m). Luasnya 7.140 m², atau
 * 0,714 ha — patokan luas yang paling dikenal pembaca.
 */
const FIELD_LENGTH_M = 105;
const FIELD_WIDTH_M = 68;
const FIELD_AREA_M2 = FIELD_LENGTH_M * FIELD_WIDTH_M;

/** Lebar kanal yang digambar (satuan). Delapan meter hanya 0,8 satuan. */
const CANAL_DRAWN = 2.4;

const u = (m: number) => m / M_PER_UNIT;
const pct = (x: number, total: number) => `${(x / total) * 100}%`;

type Props = {
  stats: DrainageStats;
  /** Tampilkan jawabannya. Dimatikan selama tebakan babak 02 belum dijawab. */
  revealReach?: boolean;
  /** Nilai yang berubah memicu ulang animasi daerah rawan. */
  sweepKey?: string | number;
  /** Daerah rawan melebar dari kanal ke luar. */
  animate?: boolean;
  /** Jarak tebakan pembaca (m), digambar sebagai garis pembanding. */
  guessM?: number | null;
  reducedMotion?: boolean;
};

export default function ReachMap({
  stats,
  revealReach = true,
  sweepKey,
  animate = false,
  guessM = null,
  reducedMotion = false,
}: Props) {
  const reach = Math.min(stats.riskReachM, TRANSECT_LENGTH_M);
  const allRisky = stats.riskReachM >= TRANSECT_LENGTH_M - 1;
  const shown = revealReach && reach > 0;
  const spread = animate && !reducedMotion;

  // Luas rawan di sepanjang 1 km kanal, dua sisi, dalam lapangan bola.
  const fields = (2 * reach * 1000) / FIELD_AREA_M2;
  const fieldsText = allRisky ? `lebih dari ${Math.floor(fields)}` : `${Math.max(1, Math.round(fields))}`;

  // Lapangan-lapangan yang dijejerkan dari tepi kanal sampai ujung daerah
  // rawan, sisi kanan saja: memperlihatkan "selebar berapa lapangan" tanpa
  // pembaca perlu menghitung apa pun.
  const fieldCount = shown ? Math.min(9, Math.max(1, Math.round(reach / FIELD_LENGTH_M))) : 0;
  const fieldW = u(FIELD_LENGTH_M);
  const fieldH = u(FIELD_WIDTH_M);
  const fieldY = H - fieldH - 5;

  return (
    <figure className="m-0">
      <figcaption className="mb-2">
        <span className="block text-[10px] uppercase tracking-[0.16em] text-white/50">{FIGURE_NOTE.chart}</span>
        <span className="mt-0.5 block text-[10px] leading-snug text-white/60">{FIGURE_NOTE.chartLead}</span>
      </figcaption>

      <div className="relative overflow-hidden rounded-xl">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full"
          role="img"
          aria-label={
            shown
              ? `Peta dari atas: lahan rawan terbakar ${allRisky ? CHART_TEXT.allReach : CHART_TEXT.reach(`${Math.round(reach)} m`)}, sekitar ${fieldsText} lapangan bola tiap 1 km kanal.`
              : "Peta dari atas: kanal di tengah lahan gambut."
          }
        >
          <defs>
            {/* Tajuk hutan rawa: bintik-bintik gelap, bukan bidang hijau rata. */}
            <pattern id="kanal-forest" width="7" height="7" patternUnits="userSpaceOnUse">
              <rect width="7" height="7" fill="#1f3a22" />
              <circle cx="2" cy="2" r="1.7" fill="#2d5230" />
              <circle cx="5.5" cy="5" r="1.4" fill="#284a2b" />
            </pattern>
            <linearGradient id="kanal-risk-l" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%" stopColor="#e8823a" stopOpacity="0.9" />
              <stop offset="88%" stopColor="#e8a050" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#e8a050" stopOpacity="0.35" />
            </linearGradient>
            <linearGradient id="kanal-risk-r" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#e8823a" stopOpacity="0.9" />
              <stop offset="88%" stopColor="#e8a050" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#e8a050" stopOpacity="0.35" />
            </linearGradient>
          </defs>

          <rect width={W} height={H} fill="url(#kanal-forest)" />

          {/* Daerah rawan, dua sisi, melebar dari kanal. */}
          {shown && (
            <g key={spread ? sweepKey : "diam"} className={spread ? "kanal-spread" : undefined}>
              <rect x={CX - u(reach)} y={0} width={u(reach)} height={H} fill="url(#kanal-risk-l)" />
              <rect x={CX} y={0} width={u(reach)} height={H} fill="url(#kanal-risk-r)" />
            </g>
          )}

          {/* Kanal. */}
          <rect x={CX - CANAL_DRAWN / 2} y={0} width={CANAL_DRAWN} height={H} fill="#5fb0dc" />

          {/* Lapangan bola pada skala yang sama, dijejerkan dari kanal. */}
          {Array.from({ length: fieldCount }, (_, i) => {
            const x = CX + CANAL_DRAWN / 2 + 0.6 + i * fieldW;
            return (
              <g key={i} stroke="#ffffff" strokeOpacity="0.9" strokeWidth="0.45" fill="none">
                <rect x={x} y={fieldY} width={fieldW} height={fieldH} fill="#ffffff" fillOpacity="0.1" />
                <line x1={x + fieldW / 2} y1={fieldY} x2={x + fieldW / 2} y2={fieldY + fieldH} />
              </g>
            );
          })}

          {/* Tebakan pembaca: garis putus-putus di kedua sisi. */}
          {guessM !== null &&
            [CX - u(guessM) - CANAL_DRAWN / 2, CX + u(guessM) + CANAL_DRAWN / 2].map((x) => (
              <line
                key={x}
                x1={x}
                y1={0}
                x2={x}
                y2={H}
                stroke="#ffffff"
                strokeWidth="0.9"
                strokeDasharray="2 1.6"
              />
            ))}

          {/* Penggaris 1 km di pojok kiri bawah. */}
          <g stroke="#ffffff" strokeOpacity="0.85" strokeWidth="0.6">
            <line x1={4} y1={H - 4} x2={4 + u(1000)} y2={H - 4} />
            <line x1={4} y1={H - 6} x2={4} y2={H - 2} />
            <line x1={4 + u(1000)} y1={H - 6} x2={4 + u(1000)} y2={H - 2} />
          </g>
        </svg>

        {/* Label sebagai DOM, supaya ukurannya sama dengan tulisan lain. */}
        <div className="pointer-events-none absolute inset-0 text-[9px] leading-none text-white">
          <span
            className="absolute top-1.5 -translate-x-1/2 rounded-sm bg-black/55 px-1 py-0.5"
            style={{ left: pct(CX, W) }}
          >
            {CHART_TEXT.canal}
          </span>
          {guessM !== null && (
            <span
              className="absolute top-6 whitespace-nowrap rounded-sm bg-black/65 px-1 py-0.5"
              style={{ left: pct(CX + u(guessM) + 3, W) }}
            >
              {GUESS_TEXT.chartLabel}
            </span>
          )}
          <span className="absolute left-1 rounded-sm bg-black/45 px-1 py-0.5 text-white/85" style={{ bottom: pct(7, H) }}>
            {CHART_TEXT.scale}
          </span>
        </div>
      </div>

      {/* Jawabannya, dalam ukuran yang dikenal semua orang. */}
      {shown ? (
        <div className="mt-2">
          <p className="font-playfair text-xl italic leading-none text-[#f0a35e]">{CHART_TEXT.fields(fieldsText)}</p>
          <p className="mt-1 text-[10px] leading-snug text-white/70">{CHART_TEXT.fieldsLead}</p>
          <p className="mt-0.5 text-[10px] leading-snug text-white/45">
            {allRisky ? CHART_TEXT.allReach : CHART_TEXT.reach(`${Math.round(reach)} m`)}
          </p>
        </div>
      ) : revealReach ? (
        <p className="mt-2 text-[10px] leading-snug text-white/60">{CHART_TEXT.noneRisky}</p>
      ) : null}

      <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] text-white/60">
        <li className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-[2px] bg-[#e8823a]" />
          {CHART_TEXT.legendRisky}
        </li>
        <li className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-[2px] bg-[#2d5230]" />
          {CHART_TEXT.legendSafe}
        </li>
        <li className="inline-flex items-center gap-1">
          <span className="h-2 w-2.5 rounded-[1px] border border-white/80" />
          {CHART_TEXT.legendField}
        </li>
      </ul>
    </figure>
  );
}
