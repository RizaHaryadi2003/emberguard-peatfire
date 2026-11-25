"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MASKS, breath, type Fate, type Mask } from "@/lib/model/haze";
import { KABUT_TEXT } from "@/config/modul/kabut-asap";
import LungArt from "./LungArt";
import { BRONCHI, CARINA, SACS, TRACHEA } from "./lungGeometry";

// Babak 03 · Satu Tarikan Napas, digambar 2D. Kepala dalam potongan samping,
// rongga hidung, mulut, dan tekak diambil dari ilustrasi sistem pernapasan
// Wikipedia (LadyofHats, domain publik; lihat public/images/kabut-asap/
// SUMBER.md), dipotong sebatas leher. Trakea, bronkus, paru-paru, dan lensa
// alveolus digambar ulang sebagai vektor (LungArt) agar menyatu dengan latar
// gelap.
//
// Seratus butir asap melayang di udara di depan wajah. Saat pembaca menarik
// napas, tiap butir menjalani nasibnya dari model (lib/model/haze.ts, Kodros
// dkk. 2021): tertahan di masker, menembus kainnya, atau lewat celah tepi;
// yang lolos menyusuri hidung atau mulut, tekak, trakea, dan bronkus sampai ke
// paru-paru, lalu tampak mengendap di alveolus pada sisipan.
//
// Semua titik dinyatakan dalam koordinat gambar asli (907 × 966), lalu kanvas
// diskalakan mengikuti gambar, jadi lintasan selalu tepat di atas anatominya.
// Ukuran butir tidak berskala (PM2.5 = 2,5 µm).

/** Lama satu tarikan napas di layar (detik). */
export const BREATH_SEC = 4.6;

const IMG = {
  w: 907.08,
  h: 966.42,
  src: "/images/kabut-asap/sistem-pernapasan.svg",
};

type Pt = { x: number; y: number };
const P = (x: number, y: number): Pt => ({ x, y });

// Titik-titik anatomi pada gambar.
/** Rongga hidung: dari lubang hidung ke belakang. */
const NOSE = [P(286, 182), P(318, 170), P(372, 160), P(420, 188)];
/** Rongga mulut: dari bibir di atas lidah ke belakang. */
const MOUTH = [P(306, 238), P(340, 226), P(392, 222), P(424, 236)];
/** Tekak dan pangkal tenggorok, lalu trakea sampai karina. */
const THROAT = [P(430, 262), P(424, 300), P(414, 340), ...TRACHEA, CARINA];
/** Bronkus utama kanan (kiri gambar) dan kiri (kanan gambar). */
const BRONCHUS_R = BRONCHI.R.slice(1);
const BRONCHUS_L = BRONCHI.L.slice(1);
/** Wilayah tujuan di dalam paru-paru: elips yang muat di dalam tiap paru. */
const LUNG_R = { cx: 338, cy: 650, rx: 68, ry: 110 };
const LUNG_L = { cx: 580, cy: 650, rx: 48, ry: 108 };
/** Ilustrasi Wikipedia hanya dipakai sebatas kepala dan leher. */
const HEAD_CLIP = { x0: 255, x1: 500, y1: 392 };
/** Udara di depan wajah, tempat butir melayang. */
const AIR = { x0: 22, x1: 248, y0: 70, y1: 470 };

/** Garis wajah tempat masker menempel: pangkal hidung → dagu. */
const FACE = { top: P(298, 132), bottom: P(310, 308) };
/** Tonjolan masker ke depan (titik kendali kurva). */
const MASK_CTRL: Record<Exclude<Mask, "tanpa">, Pt> = {
  kain: P(240, 222),
  sintetis: P(240, 222),
  medis: P(246, 222),
  n95: P(226, 222),
};
const MASK_STYLE: Record<
  Exclude<Mask, "tanpa">,
  { color: string; width: number }
> = {
  kain: { color: "#6f8fa8", width: 11 },
  sintetis: { color: "#535767", width: 11 },
  medis: { color: "#86c8e2", width: 9 },
  n95: { color: "#ece6d8", width: 15 },
};

/** Titik pada kurva kuadrat a → c dengan kendali b. */
function quad(a: Pt, b: Pt, c: Pt, t: number): Pt {
  const u = 1 - t;
  return P(
    u * u * a.x + 2 * u * t * b.x + t * t * c.x,
    u * u * a.y + 2 * u * t * b.y + t * t * c.y,
  );
}

/** Titik pada garis wajah (pangkal hidung → dagu) untuk t = 0–1. */
const faceAt = (t: number) =>
  P(
    FACE.top.x + (FACE.bottom.x - FACE.top.x) * t,
    FACE.top.y + (FACE.bottom.y - FACE.top.y) * t,
  );

/** Bilangan semu 0–1 yang tetap untuk masukan yang sama. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Bagian tepi masker yang tidak menempel (porsi dari tiap ujung). */
const gapOf = (mask: Mask) =>
  mask === "tanpa" ? 0 : Math.min(0.32, MASKS[mask].leak * 0.6);

type Path = { pts: Pt[]; cum: number[]; total: number };
function makePath(pts: Pt[]): Path {
  const cum = [0];
  for (let i = 1; i < pts.length; i++)
    cum.push(
      cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y),
    );
  return { pts, cum, total: cum[cum.length - 1] };
}
function along(p: Path, s: number): Pt {
  const d = clamp01(s) * p.total;
  let i = 1;
  while (i < p.cum.length - 1 && p.cum[i] < d) i++;
  const f = (d - p.cum[i - 1]) / (p.cum[i] - p.cum[i - 1] || 1);
  const a = p.pts[i - 1];
  const b = p.pts[i];
  return P(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f);
}

/** Gambar kecil sekali jadi: pendar lembut, dengan atau tanpa gumpalan jelaga di tengahnya. */
function makeSprite(rgb: string, withSoot: boolean): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  if (!g) return c;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, `rgba(${rgb},1)`);
  grad.addColorStop(0.35, `rgba(${rgb},0.35)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  if (withSoot) {
    // Rantai bola kecil yang menempel, seperti jelaga di bawah mikroskop.
    g.fillStyle = "#2a221d";
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4;
      g.beginPath();
      g.arc(
        32 + Math.cos(a) * i * 1.3,
        32 + Math.sin(a) * i * 1.1,
        3 + (i % 3),
        0,
        Math.PI * 2,
      );
      g.fill();
    }
  }
  return c;
}

/** Panjang jejak cahaya (jumlah posisi terakhir). */
const TRAIL = 9;

export default function BreathView({
  mask,
  breathId,
}: {
  mask: Mask;
  breathId: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState({ s: 0, ox: 0, oy: 0, W: 0, H: 0 });
  const fates = useMemo<Fate[]>(() => breath(mask), [mask]);
  // Saat napas terakhir dimulai (ms), atau null bila belum menarik napas dengan masker ini.
  const startRef = useRef<number | null>(null);
  const seenBreath = useRef(breathId);
  useEffect(() => {
    startRef.current = null;
  }, [mask]);
  useEffect(() => {
    if (breathId !== seenBreath.current) {
      seenBreath.current = breathId;
      startRef.current = performance.now();
    }
  }, [breathId]);

  // Jalur tiap butir untuk masker ini.
  const plan = useMemo(() => {
    const gap = gapOf(mask);
    const ctrl = mask === "tanpa" ? P(250, 222) : MASK_CTRL[mask];
    return fates.map((fate, i) => {
      const home = P(
        AIR.x0 + hash(i * 1.3) * (AIR.x1 - AIR.x0),
        AIR.y0 + hash(i * 2.7) * (AIR.y1 - AIR.y0),
      );
      // Celah: ujung garis wajah yang tak tertutup masker; lainnya: badan masker.
      const u =
        fate === "celah"
          ? hash(i * 4.1) < 0.5
            ? hash(i * 5.3) * gap
            : 1 - hash(i * 5.3) * gap
          : gap + 0.04 + hash(i * 5.3) * (1 - 2 * gap - 0.08);
      const onMask = quad(FACE.top, ctrl, FACE.bottom, u);
      const faceLine = faceAt(u);
      const outside =
        fate === "celah"
          ? P(faceLine.x - 14, faceLine.y)
          : P(onMask.x - 7, onMask.y);
      const lungR = hash(i * 6.6) < 0.52;
      const lung = lungR ? LUNG_R : LUNG_L;
      const a = hash(i * 7.7) * Math.PI * 2;
      const rr = Math.sqrt(hash(i * 8.8));
      const target = P(
        lung.cx + Math.cos(a) * lung.rx * rr,
        lung.cy + Math.sin(a) * lung.ry * rr,
      );
      const entry = onMask.y < 205 ? NOSE : MOUTH;
      const route = makePath([
        outside,
        onMask,
        faceLine,
        ...entry,
        ...THROAT,
        ...(lungR ? BRONCHUS_R : BRONCHUS_L),
        target,
      ]);
      const sac = SACS[Math.floor(hash(i * 2.2) * SACS.length)];
      const b = hash(i * 9.9) * Math.PI * 2;
      const br = Math.sqrt(hash(i * 3.1)) * sac.r * 0.7;
      return {
        home,
        outside,
        route: fate === "tertahan" && mask !== "tanpa" ? null : route,
        delay: hash(i * 9.1) * 0.14,
        deposit: P(sac.x + Math.cos(b) * br, sac.y + Math.sin(b) * br),
        size: 0.8 + hash(i * 4.6) * 0.5,
      };
    });
  }, [fates, mask]);

  // Kotak gambar di dalam bingkai (seperti object-fit: contain).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const W = el.clientWidth;
      const H = el.clientHeight;
      const s = Math.min(W / IMG.w, H / IMG.h);
      setBox({ s, ox: (W - IMG.w * s) / 2, oy: (H - IMG.h * s) / 2, W, H });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || box.s === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = box.W * dpr;
    canvas.height = box.H * dpr;
    canvas.style.width = `${box.W}px`;
    canvas.style.height = `${box.H}px`;

    const sprites = {
      idle: makeSprite("232,185,138", true),
      kain: makeSprite("255,194,122", true),
      celah: makeSprite("255,122,46", true),
      stuck: makeSprite("141,122,102", true),
      deposit: makeSprite("90,60,40", false),
    };
    const dustSpan = AIR.x1 - AIR.x0 + 50;
    const dust = Array.from({ length: 320 }, (_, i) => ({
      x: hash(i * 1.7) * dustSpan,
      y: 30 + hash(i * 2.9) * 560,
      r: 0.5 + hash(i * 3.3) ** 3 * 1.8,
      a: 0.12 + hash(i * 4.1) * 0.45,
      ph: hash(i * 5.7) * 6.28,
    }));
    const history = plan.map(() => [] as Pt[]);
    const gap = gapOf(mask);
    const ctrl = mask === "tanpa" ? null : MASK_CTRL[mask];

    let raf = 0;
    const draw = (now: number) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Semua gambar di bawah ini dalam koordinat ilustrasi.
      ctx.setTransform(
        box.s * dpr,
        0,
        0,
        box.s * dpr,
        box.ox * dpr,
        box.oy * dpr,
      );
      const time = reduced ? 0 : now / 1000;

      // Udara berasap: kabut hangat, berkas cahaya, dan debu halus yang berkilau.
      const haze = ctx.createRadialGradient(130, 270, 10, 130, 270, 240);
      haze.addColorStop(0, "rgba(201,154,99,0.22)");
      haze.addColorStop(1, "rgba(201,154,99,0)");
      ctx.fillStyle = haze;
      ctx.fillRect(-120, 20, 420, 560);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const [x, w, a] of [
        [40, 70, 0.06],
        [150, 50, 0.045],
      ]) {
        const beam = ctx.createLinearGradient(x, 0, x + 120, 560);
        beam.addColorStop(0, `rgba(255,220,170,${a})`);
        beam.addColorStop(1, "rgba(255,220,170,0)");
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + w, 0);
        ctx.lineTo(x + w + 140, 560);
        ctx.lineTo(x + 140, 560);
        ctx.fill();
      }
      ctx.fillStyle = "#ffe2bd";
      for (const d of dust) {
        // Hanyut pelan ke arah wajah, berulang dari kiri.
        const x =
          AIR.x0 -
          20 +
          ((d.x + time * (3 + d.r * 2) + Math.sin(time * 0.3 + d.ph) * 6) %
            dustSpan);
        const y = d.y + Math.cos(time * 0.25 + d.ph) * 5;
        ctx.globalAlpha = d.a * (0.6 + 0.4 * Math.sin(time * 1.4 + d.ph * 3));
        ctx.beginPath();
        ctx.arc(x, y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Masker menempel di wajah, tali melingkar ke belakang kepala.
      if (ctrl && mask !== "tanpa") {
        const st = MASK_STYLE[mask];
        ctx.save();
        ctx.lineCap = "round";
        ctx.strokeStyle = "rgba(236,230,218,0.8)";
        ctx.lineWidth = 2;
        const a = quad(FACE.top, ctrl, FACE.bottom, gap + 0.04);
        const b = quad(FACE.top, ctrl, FACE.bottom, 1 - gap - 0.04);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(380, 120, 462, 172);
        ctx.moveTo(b.x, b.y);
        ctx.quadraticCurveTo(380, 300, 452, 292);
        ctx.stroke();
        // Badan masker: kurva tebal dari celah atas sampai celah bawah.
        ctx.strokeStyle = st.color;
        ctx.lineWidth = st.width;
        ctx.beginPath();
        for (let k = 0; k <= 40; k++) {
          const p = quad(
            FACE.top,
            ctrl,
            FACE.bottom,
            gap + (k / 40) * (1 - 2 * gap),
          );
          if (k === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        // Tekstur bahan: anyaman, rajutan, lipatan, atau serat rapat.
        ctx.strokeStyle = "rgba(0,0,0,0.28)";
        for (let k = 1; k < 30; k++) {
          const p = quad(
            FACE.top,
            ctrl,
            FACE.bottom,
            gap + (k / 30) * (1 - 2 * gap),
          );
          const w = st.width / 2 - 1;
          ctx.beginPath();
          if (mask === "medis") {
            if (k % 6 !== 0) continue;
            ctx.lineWidth = 2;
            ctx.moveTo(p.x - w, p.y - 1);
            ctx.lineTo(p.x + w, p.y + 1);
          } else if (mask === "n95") {
            ctx.lineWidth = 0.6;
            ctx.moveTo(p.x - w + hash(k) * 3, p.y);
            ctx.lineTo(
              p.x + w - hash(k * 2) * 3,
              p.y + (hash(k * 3) - 0.5) * 4,
            );
          } else {
            const tilt = mask === "sintetis" ? 2 : 1;
            ctx.lineWidth = 1;
            ctx.moveTo(p.x - w, p.y - tilt);
            ctx.lineTo(p.x + w, p.y + tilt);
          }
          ctx.stroke();
        }
        // Celah tepi yang renggang ditandai garis jingga putus-putus.
        if (MASKS[mask].leak >= 0.2) {
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = "rgba(255,138,61,0.9)";
          ctx.lineWidth = 2;
          for (const [t0, t1] of [
            [0, gap],
            [1 - gap, 1],
          ]) {
            const p0 = faceAt(t0);
            const p1 = faceAt(t1);
            ctx.beginPath();
            ctx.moveTo(p0.x - 3, p0.y);
            ctx.lineTo(p1.x - 3, p1.y);
            ctx.stroke();
          }
          ctx.setLineDash([]);
        }
        ctx.restore();
      }

      // Butir asap.
      const start = startRef.current;
      const t =
        start === null ? -1 : reduced ? 1.4 : (now - start) / 1000 / BREATH_SEC;
      let arrived = 0;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < plan.length; i++) {
        const pl = plan[i];
        let p = P(
          pl.home.x + Math.sin(time * 0.4 + i) * 4,
          pl.home.y + Math.cos(time * 0.33 + i * 1.7) * 4,
        );
        let sprite = sprites.idle;
        let size = 13 * pl.size;
        let moving = false;
        if (t >= 0) {
          const k = clamp01((t - pl.delay) / 0.86);
          const approach = ease(clamp01(k / 0.22));
          if (!pl.route) {
            p = P(
              p.x + (pl.outside.x - p.x) * approach,
              p.y + (pl.outside.y - p.y) * approach,
            );
            sprite = approach >= 1 ? sprites.stuck : sprites.idle;
            moving = approach < 1;
          } else if (k < 0.22) {
            p = P(
              p.x + (pl.outside.x - p.x) * approach,
              p.y + (pl.outside.y - p.y) * approach,
            );
            sprite = fates[i] === "celah" ? sprites.celah : sprites.kain;
            moving = true;
          } else {
            p = along(pl.route, ease((k - 0.22) / 0.78));
            sprite = fates[i] === "celah" ? sprites.celah : sprites.kain;
            size = 11 * pl.size;
            moving = k < 1;
            if (k >= 1) arrived++;
          }
        }
        // Jejak cahaya di belakang butir yang sedang bergerak.
        const hist = history[i];
        hist.unshift(p);
        if (hist.length > TRAIL) hist.pop();
        if (moving && hist.length > 1) {
          ctx.strokeStyle =
            sprite === sprites.celah
              ? "rgba(255,122,46,0.5)"
              : "rgba(255,194,122,0.45)";
          for (let h = 1; h < hist.length; h++) {
            ctx.lineWidth = 3 * (1 - h / TRAIL);
            ctx.beginPath();
            ctx.moveTo(hist[h - 1].x, hist[h - 1].y);
            ctx.lineTo(hist[h].x, hist[h].y);
            ctx.stroke();
          }
        }
        ctx.drawImage(sprite, p.x - size / 2, p.y - size / 2, size, size);
      }
      ctx.restore();

      // Sisipan: butir yang sampai tampak mengendap di alveolus.
      if (t >= 1 && arrived > 0) {
        const show = clamp01((t - 1) / 0.25);
        let n = 0;
        for (let i = 0; i < plan.length && n < arrived; i++) {
          if (!plan[i].route) continue;
          n++;
          const d = plan[i].deposit;
          ctx.globalAlpha = show * 0.9;
          ctx.drawImage(sprites.deposit, d.x - 7, d.y - 7, 14, 14);
          ctx.fillStyle = "#2a1d16";
          ctx.beginPath();
          ctx.arc(d.x, d.y, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [plan, fates, mask, box]);

  const at = (x: number, y: number) => ({
    left: box.ox + x * box.s,
    top: box.oy + y * box.s,
  });
  return (
    <div ref={wrapRef} className="absolute inset-0">
      {box.s > 0 && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- ilustrasi SVG dipakai apa adanya */}
          <img
            src={IMG.src}
            alt="Ilustrasi sistem pernapasan: rongga hidung dan mulut, tekak, trakea, bronkus, paru-paru, dan alveolus"
            className="pointer-events-none absolute select-none"
            style={{
              left: box.ox,
              top: box.oy,
              width: IMG.w * box.s,
              height: IMG.h * box.s,
              clipPath: `inset(0 ${(1 - HEAD_CLIP.x1 / IMG.w) * 100}% 0 ${(HEAD_CLIP.x0 / IMG.w) * 100}%)`,
              // Leher memudar ke trakea buatan, tanpa tepi potong yang keras.
              maskImage: `linear-gradient(to bottom, #000 ${(HEAD_CLIP.y1 / IMG.h) * 100 - 3}%, transparent ${(HEAD_CLIP.y1 / IMG.h) * 100}%)`,
            }}
            draggable={false}
          />
          <div
            className="pointer-events-none absolute"
            style={{
              left: box.ox,
              top: box.oy,
              width: IMG.w * box.s,
              height: IMG.h * box.s,
            }}
          >
            <LungArt breathId={breathId} breathSec={BREATH_SEC} />
          </div>
          {/* Label hanya bila gambar cukup besar; di ponsel saling bertumpuk. */}
          {box.s >= 0.45 && (
            <>
              <p
                className="pointer-events-none absolute text-[10px] font-medium uppercase tracking-[0.18em] text-white/55"
                style={at(AIR.x0, AIR.y0 - 34)}
              >
                {KABUT_TEXT.outside}
              </p>
              <p
                className="pointer-events-none absolute text-[10px] font-medium uppercase tracking-[0.18em] text-[#ffb0b0]/80"
                style={at(668, 690)}
              >
                {KABUT_TEXT.lungs}
              </p>
              <p
                className="pointer-events-none absolute text-[10px] font-medium uppercase tracking-[0.18em] text-white/55"
                style={at(628, 338)}
              >
                {KABUT_TEXT.alveoliZoom}
              </p>
            </>
          )}
        </>
      )}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0"
      />
    </div>
  );
}
