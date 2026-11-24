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

  const hairW = HAIR_UM * pxPerUm;
  const hairX = HAIR_X * pxPerUm;
  const visible = (um: number) => um * pxPerUm >= 2.5;
  const ring = (part: ScopePart) => (selected === part ? "stroke-[#ffb35c]" : "stroke-transparent");

  // Sisik kutikula rambut: garis lengkung berulang, baru digambar saat rambut cukup lebar.
  const scaleLines = useMemo(() => {
    if (hairW < 60) return [];
    const stepPx = 9 * pxPerUm;
    if (stepPx < 6) return [];
    const n = Math.ceil(D / stepPx) + 2;
    return Array.from({ length: n }, (_, i) => -R - stepPx + i * stepPx + ((hash(i) - 0.5) * stepPx) / 3);
  }, [hairW, pxPerUm, D, R]);

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
          {/* Rambut: batang silinder bercahaya di tengah, gelap di tepi. */}
          <linearGradient id="hairShade" x1="0" x2="1">
            <stop offset="0" stopColor="#2a1c12" />
            <stop offset="0.22" stopColor="#6b4a2f" />
            <stop offset="0.5" stopColor="#9a7350" />
            <stop offset="0.78" stopColor="#6b4a2f" />
            <stop offset="1" stopColor="#24180f" />
          </linearGradient>
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
            <rect x={hairX - Math.max(hairW, 1.2) / 2} y={-R - 10} width={Math.max(hairW, 1.2)} height={D + 20} fill="url(#hairShade)" />
            {scaleLines.map((y, i) => (
              <path
                key={i}
                d={`M ${hairX - hairW / 2} ${y} Q ${hairX} ${y - 5 * pxPerUm} ${hairX + hairW / 2} ${y}`}
                fill="none"
                stroke="#2a1c12"
                strokeOpacity={0.35}
                strokeWidth={1}
              />
            ))}
            <rect
              x={hairX - Math.max(hairW, 1.2) / 2 - 3}
              y={-R - 10}
              width={Math.max(hairW, 1.2) + 6}
              height={D + 20}
              fill="none"
              strokeWidth={2}
              className={ring("hair")}
            />
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
                const x = hairX - hairW / 2 + d / 2 + i * d;
                return <circle key={i} cx={x} cy={R * 0.45} r={d * 0.46} fill="url(#soot)" stroke="#f4efe2" strokeWidth={0.6} />;
              })}
              <path
                d={`M ${hairX - hairW / 2} ${R * 0.45 - PM25_UM * pxPerUm} v -6 H ${hairX + hairW / 2} v 6`}
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
          {hairW >= 1 && Math.abs(hairX) < R * 0.7 && (
            <Tag x={R + hairX} y={R * 0.28} text={`${KABUT_TEXT.hair} · ${KABUT_TEXT.um(HAIR_UM)}`} />
          )}
          {visible(PM10_UM * 0.7) && Math.hypot(PM10[0].x, PM10[0].y) * pxPerUm < R * 0.8 && (
            <Tag x={R + PM10[0].x * pxPerUm} y={R + PM10[0].y * pxPerUm - PM10[0].d * pxPerUm * 0.7 - 6} text={`${KABUT_TEXT.pm10} · ${KABUT_TEXT.um(PM10_UM)}`} />
          )}
          {reveal > 0.5 && (
            <Tag x={R + hairX} y={R * 1.45 + PM25_UM * pxPerUm + 6} text={KABUT_TEXT.rowLabel} accent />
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
