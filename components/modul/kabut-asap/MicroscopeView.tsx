"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { HAIR_UM, PM10_UM, PM25_PER_HAIR, PM25_UM } from "@/lib/model/haze";
import { KABUT_TEXT, REVEAL_ZOOM, type ScopePart } from "@/config/modul/kabut-asap";

// Babak 01 · Sekecil Apa: lensa mikroskop medan terang. Semua benda
// diletakkan dalam mikrometer dan dikali perbesaran, jadi saat pembaca
// memperbesar, rambut melebar sungguhan dan butir-butir asap muncul dari
// titik yang tadinya terlalu kecil untuk terlihat.

/** Bilangan semu 0–1 yang tetap untuk masukan yang sama. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Letak sumbu rambut (µm dari tengah lensa), sedikit ke kiri. */
const HAIR_X = -18;

/** Garis bentuk butir tak beraturan (titik pada lingkaran satuan yang digoyang). */
function blobPath(seed: number, points = 9): string {
  const pts = Array.from({ length: points }, (_, i) => {
    const a = (i / points) * Math.PI * 2;
    const r = 0.75 + hash(seed * 7.1 + i) * 0.35;
    return [Math.cos(a) * r, Math.sin(a) * r];
  });
  return `M${pts.map((p) => p.map((v) => v.toFixed(3)).join(" ")).join(" L")} Z`;
}

/** Butir PM10 dan PM2.5 yang melayang di sekitar rambut (µm). */
const PM10 = Array.from({ length: 6 }, (_, i) => ({
  x: (hash(i * 3.3) - 0.5) * 110 + (i % 2 ? 34 : 28),
  y: (hash(i * 5.1) - 0.5) * 110,
  d: PM10_UM * (0.55 + hash(i * 1.7) * 0.45),
  rot: hash(i * 2.2) * 360,
  seed: i + 1,
}));
const PM25 = Array.from({ length: 34 }, (_, i) => ({
  x: (hash(i * 4.7 + 1) - 0.5) * 120 + 10,
  y: (hash(i * 6.3 + 2) - 0.5) * 120,
  d: PM25_UM * (0.5 + hash(i * 2.9) * 0.5),
  seed: i + 40,
}));

/**
 * Rambut tidak lurus sempurna: sedikit miring dan melengkung landai. Lengkungnya
 * ribuan mikrometer, jadi dari jauh terlihat sebagai helai yang meliuk, sedangkan
 * pada perbesaran tinggi bagian yang tampak hampir lurus, seperti di mikroskop.
 */
const HAIR_TILT = -0.08;
const HAIR_BEND_UM = 650;
const HAIR_BEND_LEN_UM = 2600;
/** Jarak antartepi sisik kutikula di sepanjang rambut (µm). */
const SCALE_STEP_UM = 7;

function hairCenterUm(yUm: number): number {
  return HAIR_X + HAIR_TILT * yUm + HAIR_BEND_UM * Math.sin(yUm / HAIR_BEND_LEN_UM);
}
function hairSlope(yUm: number): number {
  return HAIR_TILT + (HAIR_BEND_UM / HAIR_BEND_LEN_UM) * Math.cos(yUm / HAIR_BEND_LEN_UM);
}

/**
 * Lapisan warna badan rambut [lebar relatif, warna], dari tepi ke inti. Dibuat
 * banyak dengan beda warna kecil supaya peralihan tepi gelap ke inti yang lebih
 * tembus cahaya terlihat mulus seperti batang silinder, bukan pita bertingkat.
 */
const HAIR_BANDS: [number, string][] = Array.from({ length: 14 }, (_, i) => {
  const w = 1 - (i / 14) * 0.78;
  const f = Math.sin(((i / 13) * Math.PI) / 2); // cepat menerang di tepi, landai di inti
  const mix = (a: number, b: number) => Math.round(a + (b - a) * f);
  return [w, `rgb(${mix(30, 140)} ${mix(17, 100)} ${mix(8, 62)})`];
});

type Pt = [number, number];
const toPath = (pts: Pt[]) => `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L")}`;
const arcLength = (pts: Pt[]) => pts.reduce((sum, p, i) => (i ? sum + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);

/**
 * Menghitung semua garis rambut dalam piksel layar. Titik di rambut dinyatakan
 * dengan (y µm di sepanjang rambut, t dari −1 tepi kiri sampai 1 tepi kanan),
 * jadi sisik dan pigmen menempel di tempat yang sama saat diperbesar.
 */
function hairGeometry(pxPerUm: number, R: number, hairW: number) {
  const point = (yUm: number, t: number, along = 0): Pt => {
    const k = hairSlope(yUm);
    const n = Math.hypot(k, 1);
    const cx = hairCenterUm(yUm) * pxPerUm;
    const cy = yUm * pxPerUm;
    // Garis singgung (k, 1)/n dan garis normal (1, −k)/n.
    return [cx + (t * hairW) / 2 / n + (along * k) / n, cy - (t * hairW * k) / 2 / n + along / n];
  };

  // Titik contoh sepanjang rambut, simetris terhadap tengah lensa.
  const stepPx = 6;
  const half = Math.ceil((R + 24) / stepPx);
  const ys = Array.from({ length: half * 2 + 1 }, (_, i) => ((i - half) * stepPx) / pxPerUm);
  const line = (t: number) => ys.map((y) => point(y, t));
  /** Geser pola putus-putus supaya fasenya terikat pada µm, bukan pada awal garis. */
  const anchored = (pts: Pt[], phaseUm: number) => -arcLength(pts.slice(0, half + 1)) + phaseUm * pxPerUm;

  const axis = toPath(line(0));
  const highlight = toPath(line(-0.24));

  const pigment =
    hairW < 14
      ? []
      : Array.from({ length: 18 }, (_, j) => {
          const pts = line((hash(j * 3.1 + 0.4) - 0.5) * 1.55);
          const um = [0.3 + hash(j * 1.9) * 1.5, 2 + hash(j * 2.7) * 7, 0.2 + hash(j * 4.3) * 1, 3 + hash(j * 5.9) * 10];
          return {
            d: toPath(pts),
            dash: um.map((v) => (v * pxPerUm).toFixed(2)).join(" "),
            offset: anchored(pts, hash(j * 7.7) * 40),
            width: Math.min(3, Math.max(0.5, (0.6 + hash(j * 8.3) * 0.6) * pxPerUm)),
            opacity: 0.18 + hash(j * 6.1) * 0.22,
          };
        });

  let medulla: { d: string; dash: string; offset: number } | null = null;
  if (hairW >= 60) {
    const pts = line(0.06);
    medulla = {
      d: toPath(pts),
      dash: [38, 14, 22, 30, 55, 18].map((v) => (v * pxPerUm).toFixed(2)).join(" "),
      offset: anchored(pts, 11),
    };
  }

  let scales: { dark: string; light: string; teeth: string } | null = null;
  const scalePx = SCALE_STEP_UM * pxPerUm;
  if (hairW >= 40 && scalePx >= 6) {
    const yMax = (R + 30) / pxPerUm;
    const first = Math.floor(-yMax / SCALE_STEP_UM) - 1;
    const last = Math.ceil(yMax / SCALE_STEP_UM) + 1;
    const dark: string[] = [];
    const light: string[] = [];
    const teeth: string[] = [];
    const toothPx = Math.min(5, 0.7 * pxPerUm);
    for (let i = first; i <= last; i++) {
      const sUm = i * SCALE_STEP_UM + (hash(i * 1.3) - 0.5) * 2.6;
      const bow = 0.5 * scalePx * (0.6 + 0.8 * hash(i * 2.9 + 5));
      const lean = (hash(i * 4.1) - 0.5) * 0.5 * scalePx;
      const pts: Pt[] = Array.from({ length: 11 }, (_, k) => {
        const t = -1 + (k / 10) * 2;
        // Tepi sisik melengkung ke arah ujung (ke atas), miring, dan bergerigi halus.
        const along = -(bow * (1 - t * t) + lean * t + (hash(i * 9.7 + k * 1.1) - 0.5) * 0.22 * scalePx);
        return point(sUm, t, along);
      });
      dark.push(toPath(pts));
      light.push(toPath(pts.map(([x, y]) => [x, y + 1.3] as Pt)));
      if (toothPx >= 1.5) {
        for (const side of [-1, 1]) {
          const base = point(sUm, side, -lean * side);
          const root = point(sUm + SCALE_STEP_UM * 0.4, side);
          const tip = point(sUm, side * (1 + (2 * toothPx) / hairW), -lean * side - scalePx * 0.15);
          teeth.push(`M${base[0].toFixed(1)} ${base[1].toFixed(1)} L${tip[0].toFixed(1)} ${tip[1].toFixed(1)} L${root[0].toFixed(1)} ${root[1].toFixed(1)} Z`);
        }
      }
    }
    scales = { dark: dark.join(" "), light: light.join(" "), teeth: teeth.join(" ") };
  }

  return { axis, highlight, pigment, medulla, scales };
}

export default function MicroscopeView({
  zoom,
  selected,
  onInspect,
}: {
  zoom: number;
  selected: ScopePart | null;
  onInspect: (part: ScopePart) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 600, h: 600 });
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Garis tengah lensa, dan berapa piksel satu mikrometer pada perbesaran ini:
  // dipilih supaya pada REVEAL_ZOOM rambut selebar ±55 % lensa.
  const D = Math.max(120, Math.min(size.w, size.h) * 0.94);
  const R = D / 2;
  const pxPerUm = ((0.55 * D) / (HAIR_UM * REVEAL_ZOOM)) * zoom;
  const reveal = Math.min(1, Math.max(0, (zoom - REVEAL_ZOOM * 0.75) / (REVEAL_ZOOM * 0.25)));

  // Batang skala: panjang "bulat" yang paling dekat dengan seperempat lensa.
  const scaleUm = useMemo(() => {
    const target = (D * 0.25) / pxPerUm;
    const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
    return steps.reduce((best, s) => (Math.abs(Math.log(s / target)) < Math.abs(Math.log(best / target)) ? s : best), steps[0]);
  }, [D, pxPerUm]);

  const hairW = Math.max(HAIR_UM * pxPerUm, 1.2);
  const hair = useMemo(() => hairGeometry(pxPerUm, R, hairW), [pxPerUm, R, hairW]);
  /** Sumbu rambut (px dari tengah lensa) pada ketinggian y px. */
  const hairXAt = (yPx: number) => hairCenterUm(yPx / pxPerUm) * pxPerUm;
  const visible = (um: number) => um * pxPerUm >= 2.5;
  const ring = (part: ScopePart) => (selected === part ? "stroke-[#ffb35c]" : "stroke-transparent");

  return (
    <div ref={wrapRef} className="absolute inset-0 flex items-center justify-center">
      <svg
        width={D}
        height={D}
        viewBox={`${-R} ${-R} ${D} ${D}`}
        className="overflow-visible drop-shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
        role="img"
        aria-label={`Lensa mikroskop, perbesaran ${KABUT_TEXT.zoomValue(zoom)}`}
      >
        <defs>
          <clipPath id="lens">
            <circle r={R} />
          </clipPath>
          <radialGradient id="lensLight" r="0.62">
            <stop offset="0" stopColor="#f4efe2" />
            <stop offset="0.75" stopColor="#e4dccb" />
            <stop offset="1" stopColor="#b9ae98" />
          </radialGradient>
          <radialGradient id="vignette" r="0.5">
            <stop offset="0.78" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.55" />
          </radialGradient>
          <radialGradient id="soot" r="0.6">
            <stop offset="0" stopColor="#5a5049" />
            <stop offset="1" stopColor="#1d1916" />
          </radialGradient>
        </defs>
        <g clipPath="url(#lens)">
          <circle r={R} fill="url(#lensLight)" />
          {/* Rambut */}
          <g
            role="button"
            tabIndex={0}
            aria-label={KABUT_TEXT.hair}
            className="cursor-pointer focus:outline-none"
            onClick={() => onInspect("hair")}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onInspect("hair")}
          >
            {/* Sasaran klik yang lebar supaya rambut tipis tetap mudah ditekan. */}
            <path d={hair.axis} fill="none" stroke="transparent" strokeWidth={Math.max(hairW, 18)} pointerEvents="stroke" />
            <path d={hair.axis} fill="none" strokeWidth={hairW + 6} className={ring("hair")} />
            {/* Garis terang tipis di luar tepi: cahaya yang dibiaskan batang rambut. */}
            <path d={hair.axis} fill="none" stroke="#fffaf0" strokeOpacity={0.55} strokeWidth={hairW + 2.5} />
            {/* Badan rambut: lapisan dari tepi gelap ke inti yang lebih tembus cahaya. */}
            {HAIR_BANDS.map(([w, color]) => (
              <path key={w} d={hair.axis} fill="none" stroke={color} strokeWidth={hairW * w} />
            ))}
            {hairW >= 8 && <path d={hair.highlight} fill="none" stroke="#c89a6c" strokeOpacity={0.45} strokeWidth={hairW * 0.16} />}
            {/* Butir pigmen melanin: garis putus-putus sejajar sumbu. */}
            {hair.pigment.map((g, i) => (
              <path
                key={i}
                d={g.d}
                fill="none"
                stroke="#24150b"
                strokeOpacity={g.opacity}
                strokeWidth={g.width}
                strokeLinecap="round"
                strokeDasharray={g.dash}
                strokeDashoffset={g.offset}
              />
            ))}
            {/* Medula: rongga di tengah yang terputus-putus. */}
            {hair.medulla && (
              <path
                d={hair.medulla.d}
                fill="none"
                stroke="#3a2210"
                strokeOpacity={Math.min(0.32, (hairW - 60) / 200)}
                strokeWidth={hairW * 0.08}
                strokeLinecap="round"
                strokeDasharray={hair.medulla.dash}
                strokeDashoffset={hair.medulla.offset}
              />
            )}
            {/* Tepi sisik kutikula: bertumpuk seperti genting, tak beraturan, menghadap ujung rambut. */}
            {hair.scales && (
              <>
                <path d={hair.scales.light} fill="none" stroke="#e6c79f" strokeOpacity={0.35} strokeWidth={1} />
                <path d={hair.scales.dark} fill="none" stroke="#1c0f07" strokeOpacity={0.38} strokeWidth={1.1} strokeLinejoin="round" />
                <path d={hair.scales.teeth} fill="#2b1a0f" />
              </>
            )}
          </g>
          {/* Debu kasar PM10 */}
          {PM10.map((p, i) => {
            const d = p.d * pxPerUm;
            if (!visible(p.d)) return null;
            return (
              <g
                key={`a${i}`}
                transform={`translate(${p.x * pxPerUm} ${p.y * pxPerUm}) rotate(${p.rot}) scale(${d / 2})`}
                role="button"
                tabIndex={-1}
                aria-label={KABUT_TEXT.pm10}
                className="cursor-pointer"
                onClick={() => onInspect("pm10")}
              >
                <path d={blobPath(p.seed)} fill="#8a7a66" stroke="#4d4236" strokeWidth={1.2 / (d / 2)} />
                {selected === "pm10" && <circle r={1.35} fill="none" stroke="#ffb35c" strokeWidth={2 / (d / 2)} />}
              </g>
            );
          })}
          {/* Butir asap halus PM2.5: gumpalan jelaga kecil */}
          {PM25.map((p, i) => {
            const d = p.d * pxPerUm;
            if (!visible(p.d)) return null;
            return (
              <g
                key={`b${i}`}
                transform={`translate(${p.x * pxPerUm} ${p.y * pxPerUm}) scale(${d / 2})`}
                className="cursor-pointer"
                onClick={() => onInspect("pm25")}
                style={{ opacity: 0.35 + 0.65 * Math.min(1, (d - 2.5) / 4) }}
              >
                <path d={blobPath(p.seed, 7)} fill="url(#soot)" />
                {selected === "pm25" && <circle r={1.6} fill="none" stroke="#ffb35c" strokeWidth={2 / (d / 2)} />}
              </g>
            );
          })}
          {/* Sebaris butir PM2.5 selebar rambut, muncul di dekat perbesaran ungkap */}
          {reveal > 0 && (
            <g style={{ opacity: reveal }} onClick={() => onInspect("pm25")} className="cursor-pointer">
              {Array.from({ length: PM25_PER_HAIR }, (_, i) => {
                const d = PM25_UM * pxPerUm;
                const x = hairXAt(R * 0.45) - hairW / 2 + d / 2 + i * d;
                return <circle key={i} cx={x} cy={R * 0.45} r={d * 0.46} fill="url(#soot)" stroke="#f4efe2" strokeWidth={0.6} />;
              })}
              <path
                d={`M ${hairXAt(R * 0.45) - hairW / 2} ${R * 0.45 - PM25_UM * pxPerUm} v -6 H ${hairXAt(R * 0.45) + hairW / 2} v 6`}
                fill="none"
                stroke="#ff8a3d"
                strokeWidth={1.5}
              />
            </g>
          )}
          <circle r={R} fill="url(#vignette)" />
        </g>
        <circle r={R} fill="none" stroke="#1b1b1b" strokeWidth={10} />
        <circle r={R - 5} fill="none" stroke="#ffffff" strokeOpacity={0.12} strokeWidth={1} />
      </svg>

      {/* Label dan batang skala sebagai DOM, supaya tulisannya tidak ikut membesar. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative" style={{ width: D, height: D }}>
          {Math.abs(hairXAt(-R * 0.72)) < R * 0.7 && (
            <Tag x={R + hairXAt(-R * 0.72)} y={R * 0.28} text={`${KABUT_TEXT.hair} · ${KABUT_TEXT.um(HAIR_UM)}`} />
          )}
          {visible(PM10_UM * 0.7) && Math.hypot(PM10[0].x, PM10[0].y) * pxPerUm < R * 0.8 && (
            <Tag x={R + PM10[0].x * pxPerUm} y={R + PM10[0].y * pxPerUm - PM10[0].d * pxPerUm * 0.7 - 6} text={`${KABUT_TEXT.pm10} · ${KABUT_TEXT.um(PM10_UM)}`} />
          )}
          {reveal > 0.5 && (
            <Tag x={R + hairXAt(R * 0.45)} y={R * 1.45 + PM25_UM * pxPerUm + 6} text={KABUT_TEXT.rowLabel} accent />
          )}
          <div className="absolute bottom-[9%] left-1/2 -translate-x-1/2 text-center">
            <div className="mx-auto h-[3px] rounded-full bg-[#1b1b1b]" style={{ width: scaleUm * pxPerUm }} />
            <p className="mt-1 text-[10px] font-medium tabular-nums text-[#1b1b1b]">{KABUT_TEXT.um(scaleUm)}</p>
          </div>
          <p className="absolute left-1/2 top-[7%] -translate-x-1/2 rounded-full bg-[#1b1b1b]/80 px-2 py-0.5 text-[10px] font-medium tabular-nums text-white/85">
            {KABUT_TEXT.zoomValue(zoom)}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Label kecil berbentuk pil di atas lensa. */
function Tag({ x, y, text, accent = false }: { x: number; y: number; text: string; accent?: boolean }) {
  return (
    <span
      className={`absolute -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${
        accent ? "bg-[#ff8a3d] text-black" : "-translate-y-full bg-[#1b1b1b]/80 text-white/90"
      }`}
      style={{ left: x, top: y }}
    >
      {text}
    </span>
  );
}
