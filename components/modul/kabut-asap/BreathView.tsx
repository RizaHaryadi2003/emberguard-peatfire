"use client";

import { useEffect, useMemo, useRef } from "react";
import { MASKS, breath, type Fate, type Mask } from "@/lib/model/haze";
import { KABUT_TEXT } from "@/config/modul/kabut-asap";

// Babak 03 · Satu Tarikan Napas: seratus butir asap di udara luar, satu
// penampang masker, dan paru-paru. Saat pembaca menarik napas, tiap butir
// menempuh nasibnya dari model (lib/model/haze.ts, Kodros dkk. 2021):
// tertahan di permukaan masker, menembus kainnya, atau mengambil jalan pintas
// lewat celah di tepi masker. Digambar di kanvas 2D supaya seratus butir
// bergerak ringan.

/** Lama satu tarikan napas (detik). */
export const BREATH_SEC = 2.8;

const MASK_COLOR: Record<Mask, string> = {
  tanpa: "transparent",
  kain: "#6f8fa8",
  sintetis: "#5b5d6a",
  medis: "#8fd0e8",
  n95: "#e8e2d4",
};

/** Bilangan semu 0–1 yang tetap untuk masukan yang sama. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Pt = { x: number; y: number };

/** Titik pada lintasan bersegmen `pts` untuk kemajuan 0–1 (tiap segmen sama lama). */
function along(pts: Pt[], t: number): Pt {
  const k = Math.min(0.9999, Math.max(0, t)) * (pts.length - 1);
  const i = Math.floor(k);
  const f = ease(k - i);
  return { x: lerp(pts[i].x, pts[i + 1].x, f), y: lerp(pts[i].y, pts[i + 1].y, f) };
}

export default function BreathView({ mask, breathId }: { mask: Mask; breathId: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fates = useMemo<Fate[]>(() => breath(mask), [mask]);
  // Saat napas terakhir dimulai (ms), atau null bila belum menarik napas
  // dengan masker ini.
  const startRef = useRef<number | null>(null);
  const seenBreath = useRef(breathId);
  useEffect(() => {
    // Ganti masker: butir kembali ke udara luar.
    startRef.current = null;
  }, [mask]);
  useEffect(() => {
    if (breathId !== seenBreath.current) {
      seenBreath.current = breathId;
      startRef.current = performance.now();
    }
  }, [breathId]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let W = 0;
    let H = 0;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = wrap.clientWidth;
      H = wrap.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const leak = MASKS[mask].leak;
    const draw = (now: number) => {
      ctx.clearRect(0, 0, W, H);
      const maskX = W * 0.56;
      const top = H * 0.12;
      const bottom = H * 0.88;
      // Celah tepi: makin besar kebocoran, makin pendek masker dari tepinya.
      const gap = mask === "tanpa" ? 0 : Math.max(6, (bottom - top) * leak * 0.32);
      const bandTop = top + gap;
      const bandBottom = bottom - gap;
      // Paru-paru: perbandingan tinggi-lebar dijaga, supaya tidak lonjong di bingkai sempit.
      const lrx = Math.min(W * 0.1, H * 0.16);
      const lungs = { x: W * 0.83, y: H * 0.55, rx: lrx, ry: Math.min(H * 0.3, lrx * 1.7) };

      // Udara luar: kabut tipis di kiri.
      const g = ctx.createRadialGradient(W * 0.22, H * 0.5, 10, W * 0.22, H * 0.5, W * 0.32);
      g.addColorStop(0, "rgba(201,154,99,0.20)");
      g.addColorStop(1, "rgba(201,154,99,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W * 0.6, H);

      // Paru-paru: dua lobus dan batang tenggorok.
      ctx.save();
      ctx.strokeStyle = "rgba(255,170,170,0.55)";
      ctx.fillStyle = "rgba(255,120,130,0.10)";
      ctx.lineWidth = 2;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(lungs.x + side * lungs.rx * 0.62, lungs.y, lungs.rx * 0.55, lungs.ry, side * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      // Batang tenggorok turun di antara kedua lobus.
      ctx.beginPath();
      ctx.moveTo(maskX + 18, H * 0.5);
      ctx.bezierCurveTo(W * 0.68, H * 0.5, lungs.x, lungs.y - lungs.ry * 1.5, lungs.x, lungs.y - lungs.ry * 0.55);
      ctx.stroke();
      ctx.restore();

      // Masker: penampang melengkung, bertekstur serat.
      if (mask !== "tanpa") {
        ctx.save();
        ctx.lineCap = "round";
        ctx.strokeStyle = MASK_COLOR[mask];
        ctx.lineWidth = mask === "n95" ? 16 : 12;
        ctx.beginPath();
        ctx.moveTo(maskX - 10, bandTop);
        ctx.quadraticCurveTo(maskX + 14, (bandTop + bandBottom) / 2, maskX - 10, bandBottom);
        ctx.stroke();
        ctx.strokeStyle = "rgba(0,0,0,0.25)";
        ctx.lineWidth = 1;
        for (let y = bandTop + 6; y < bandBottom - 4; y += 7) {
          const k = (y - bandTop) / (bandBottom - bandTop);
          const cx = maskX - 10 + 24 * 2 * k * (1 - k);
          ctx.beginPath();
          ctx.moveTo(cx - 5, y);
          ctx.lineTo(cx + 5, y + 2);
          ctx.stroke();
        }
        // Celah di kedua ujung masker ditandai garis putus-putus.
        if (leak >= 0.2) {
          ctx.setLineDash([3, 4]);
          ctx.strokeStyle = "rgba(255,140,80,0.7)";
          for (const [a, b] of [
            [top, bandTop],
            [bandBottom, bottom],
          ]) {
            ctx.beginPath();
            ctx.moveTo(maskX - 10, a);
            ctx.lineTo(maskX - 10, b);
            ctx.stroke();
          }
          ctx.setLineDash([]);
        }
        ctx.restore();
      }

      // Butir asap.
      const start = startRef.current;
      const t = start === null ? -1 : reduced ? 1 : (now - start) / 1000 / BREATH_SEC;
      for (let i = 0; i < fates.length; i++) {
        const home: Pt = {
          x: W * (0.05 + hash(i * 1.3) * 0.38) + Math.sin(now / 1400 + i) * 3,
          y: H * (0.14 + hash(i * 2.7) * 0.72) + Math.cos(now / 1700 + i * 1.7) * 3,
        };
        let p = home;
        const fate = fates[i];
        if (t >= 0) {
          const delay = hash(i * 9.1) * 0.25;
          const k = Math.min(1, Math.max(0, (t - delay) / (1 - 0.25)));
          const hitY = lerp(bandTop + 8, bandBottom - 8, hash(i * 5.3));
          const inLung: Pt = {
            x: lungs.x + (hash(i * 7.7) > 0.5 ? 1 : -1) * lungs.rx * (0.62 + (hash(i * 3.9) - 0.5) * 0.6),
            y: lungs.y + (hash(i * 8.3) - 0.5) * lungs.ry * 1.4,
          };
          if (fate === "tertahan" && mask !== "tanpa") p = along([home, { x: maskX - 18, y: hitY }], Math.min(1, k * 1.8));
          else if (fate === "celah") {
            const edgeY = hash(i * 4.1) > 0.5 ? lerp(top, bandTop, 0.5) : lerp(bandBottom, bottom, 0.5);
            p = along([home, { x: maskX - 16, y: edgeY }, { x: maskX + 20, y: edgeY }, inLung], k);
          } else p = along([home, { x: maskX - 16, y: hitY }, { x: maskX + 22, y: hitY }, inLung], k);
        }
        const isIn = t >= 0 && fate !== "tertahan" && t > 0.6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = fate === "celah" && t >= 0 ? "#ff8a3d" : isIn ? "#e8b98a" : "#cdb08c";
        ctx.globalAlpha = t >= 0 && fate === "tertahan" ? 0.65 : 0.95;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [fates, mask]);

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <p className="pointer-events-none absolute left-[8%] top-[4%] text-[10px] font-medium uppercase tracking-[0.18em] text-white/50">{KABUT_TEXT.outside}</p>
      <p className="pointer-events-none absolute right-[6%] top-[14%] text-[10px] font-medium uppercase tracking-[0.18em] text-[#ffb0b0]/70">{KABUT_TEXT.lungs}</p>
    </div>
  );
}
