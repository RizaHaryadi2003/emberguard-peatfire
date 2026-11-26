"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { BRAND_NAME } from "@/config/hero-content";
import { apply, rotation } from "@/lib/bird3d";
import { INTRO_DONE, INTRO_SEEN_KEY, introPlaying } from "@/lib/introGate";
import { INTRO, orbitKeys, sampleFlight, sweepKeys, typingTimes, type FlightKey, type FlightLayout } from "@/lib/introFlight";
import { attitudeAt, drawHornbill, wingAngle } from "./hornbillModel";
import { HORNBILL_REACH } from "./hornbillShape";

/** Satuan model rangkong → piksel pada laptop 1440 px (badan ±190 px, seukuran beruang acuan). */
const BIRD_UNIT = 0.62;
/** Ketajaman kanvas dibatasi agar layar beresolusi tinggi tidak terbebani. */
const MAX_DPR = 1.5;
/** Jangkauan terjauh bagian rangkong dari bahu (satuan model): sisi kanvas = 2 × ini. */
const BIRD_RADIUS = 200;
/** Skala terbesar rangkong per tahap (mengitari, menyapu), menentukan ukuran kanvas. */
const ORBIT_MAX_SCALE = 1.1;
const SWEEP_MAX_SCALE = 3.2;

/** Fase kepakan (radian): ±2,8 kepakan/detik saat mengitari, melambat ke ±2,2 saat menyapu. */
function flapPhase(t: number, sweepAt: number): number {
  const f0 = 2.8;
  const f1 = 2.2;
  const a = sweepAt - 0.3;
  const b = sweepAt + 0.2;
  if (t <= a) return 2 * Math.PI * f0 * t;
  if (t <= b) {
    const k = (t - a) / (b - a);
    return 2 * Math.PI * (f0 * a + (t - a) * (f0 + (f1 - f0) * k * 0.5));
  }
  return 2 * Math.PI * (f0 * a + (b - a) * (f0 + f1) * 0.5 + f1 * (t - b));
}

/**
 * Pembuka situs (hanya di beranda, sekali per sesi):
 * kursor berkedip → nama diketik → titik memantul menjadi koma → rangkong
 * badak mengitari teks sambil memiringkan badan di tiap belokan, menjauh,
 * lalu menyapu dari depan sambil menghapus huruf → layar masuk ke tengah dan
 * beranda tampil.
 *
 * Rangkong digambar di kanvas dari model 3D sederhana (hornbillModel.ts),
 * jadi tampak dari samping, depan, belakang, atas, atau bawah sesuai arah
 * terbangnya, walau tetap berupa siluet hitam 2D.
 *
 * Tampil-tidaknya ditentukan skrip INTRO_GATE_SCRIPT sebelum halaman digambar,
 * jadi beranda tidak sempat berkedip muncul lebih dulu.
 */
export default function IntroSplash() {
  const [done, setDone] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const commaRef = useRef<HTMLSpanElement>(null);
  const dotRef = useRef<SVGGElement>(null);
  const tailRef = useRef<SVGPathElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const exitRef = useRef<() => void>(() => {});

  useEffect(() => {
    // Pembuka tidak tayang: elemennya sudah disembunyikan CSS, cukup diam.
    if (!introPlaying()) return;
    const root = rootRef.current!;
    const html = document.documentElement;
    let exiting = false;

    // ---- Keluar: layar masuk ke tengah, beranda mulai ----
    const exit = () => {
      if (exiting) return;
      exiting = true;
      tl.kill();
      try {
        sessionStorage.setItem(INTRO_SEEN_KEY, "1");
      } catch {
        // Penyimpanan diblokir: pembuka mungkin tampil lagi saat dimuat ulang.
      }
      html.classList.add("intro-exiting", "intro-entering");
      html.classList.remove("intro-playing");
      window.dispatchEvent(new Event(INTRO_DONE));
      gsap.to(stageRef.current, { scale: 1.3, duration: INTRO.exit, ease: "power2.in" });
      gsap.to(root, {
        opacity: 0,
        duration: INTRO.exit,
        ease: "power1.inOut",
        onComplete: () => {
          html.classList.remove("intro-exiting");
          window.setTimeout(() => html.classList.remove("intro-entering"), 1200);
          setDone(true);
        },
      });
    };
    exitRef.current = exit;

    const tl = gsap.timeline();
    const letters = letterRefs.current.filter((el): el is HTMLSpanElement => !!el);
    const cursor = cursorRef.current!;

    // ---- Kursor dan ketikan ----
    tl.set(cursor, { autoAlpha: 1 }, INTRO.cursorIn);
    const times = typingTimes(BRAND_NAME);
    times.forEach((t, i) => {
      tl.call(
        () => {
          cursor.classList.remove("intro-cursor-blink");
          letters[i].style.display = "inline";
        },
        undefined,
        t,
      );
    });
    const typed = times[times.length - 1] + INTRO.holdAfterType;
    tl.set(cursor, { autoAlpha: 0 }, typed);

    // ---- Titik memantul lalu tumbuh menjadi koma ----
    const dotAt = typed + 0.1;
    tl.set(commaRef.current, { autoAlpha: 1 }, dotAt);
    tl.fromTo(dotRef.current, { y: -44, scale: 0.6 }, { y: 0, scale: 1, duration: INTRO.dotDrop, ease: "bounce.out" }, dotAt);
    tl.fromTo(
      tailRef.current,
      { strokeDashoffset: 1 },
      { strokeDashoffset: 0, duration: INTRO.commaTail, ease: "power2.out" },
      dotAt + INTRO.dotDrop,
    );

    // ---- Rangkong ----
    const birdAt = dotAt + INTRO.dotDrop + INTRO.commaTail + INTRO.holdAfterComma;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let layout: FlightLayout | null = null;
    let orbit: FlightKey[] = [];
    let sweep: FlightKey[] = [];
    let wipeTargets: { el: HTMLElement; x: number }[] = [];
    let unit = 0;
    let dpr = 1;
    let base = new DOMMatrix();
    /** Setengah sisi kanvas (px CSS). Kanvas hanya seukuran rangkong terbesar dan digeser
     *  dengan CSS transform, jadi peramban tidak menyusun ulang lapisan selebar layar. */
    let half = 0;

    /** Ukuran kanvas untuk skala rangkong terbesar pada tahap ini (diubah sekali per tahap). */
    let sizedFor = 0;
    const sizeCanvas = (maxScale: number) => {
      if (sizedFor === maxScale) return;
      sizedFor = maxScale;
      half = Math.ceil(BIRD_RADIUS * unit * maxScale);
      canvas.width = Math.round(2 * half * dpr);
      canvas.height = Math.round(2 * half * dpr);
      canvas.style.width = canvas.style.height = `${2 * half}px`;
    };

    const measure = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      unit = BIRD_UNIT * Math.min(1.1, Math.max(0.6, vw / 1440));
      base = new DOMMatrix([dpr, 0, 0, dpr, 0, 0]);
      sizeCanvas(ORBIT_MAX_SCALE);
      const rect = wordRef.current!.getBoundingClientRect();
      layout = {
        vw,
        vh,
        textW: rect.width,
        textH: parseFloat(getComputedStyle(wordRef.current!).fontSize),
        birdFront: HORNBILL_REACH.front * unit,
        birdBack: HORNBILL_REACH.back * unit,
      };
      orbit = orbitKeys(layout);
      sweep = sweepKeys(layout);
      wipeTargets = [...letters, commaRef.current!].map((el) => {
        const r = el.getBoundingClientRect();
        return { el, x: r.left + r.width / 2 };
      });
    };

    // Waktu sapuan dan akhir terbang dibaca dari titik kunci (lihat introFlight.ts).
    const probe = sweepKeys({ vw: 1, vh: 1, textW: 1, textH: 1, birdFront: 1, birdBack: 1 });
    const sweepAt = probe[0].t;
    const flightS = probe[probe.length - 1].t;

    const flight = { t: 0 };
    const renderBird = () => {
      if (!layout) return;
      const t = flight.t;
      const sweeping = t >= sweepAt - 0.1;
      const keys = sweeping ? sweep : orbit;
      sizeCanvas(sweeping ? SWEEP_MAX_SCALE : ORBIT_MAX_SCALE);
      const sample = (tt: number) => sampleFlight(keys, tt);
      const p = sample(t);
      const att = attitudeAt(sample, t);
      const k = unit * p.s;
      const x = layout.vw / 2 + p.x;
      const y = layout.vh / 2 + p.y;
      // Kanvas digeser ke posisi rangkong; rangkong digambar di tengah kanvas.
      canvas.style.transform = `translate3d(${x - half}px, ${y - half}px, 0)`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawHornbill(ctx, base, { x: half, y: half, k, att, wing: wingAngle(flapPhase(t, sweepAt), att.roll) });
      // Huruf hilang saat pangkal leher melewatinya, yaitu saat tertutup badan.
      if (t >= sweepAt) {
        const coverX = x + apply(rotation(att), [HORNBILL_REACH.neck, 0, 0])[0] * k;
        for (const w of wipeTargets) if (w.x < coverX) w.el.style.opacity = "0";
      }
    };

    tl.call(measure, undefined, birdAt);
    tl.to(flight, { t: flightS, duration: flightS, ease: "none", onUpdate: renderBird }, birdAt);
    // Layar masuk ke beranda sesudah ekor rangkong lewat tepi kanan.
    tl.call(exit, undefined, birdAt + flightS);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exit();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      tl.kill();
    };
  }, []);

  if (done) return null;

  return (
    <div
      ref={rootRef}
      className="intro-splash fixed inset-0 z-[200] overflow-hidden bg-[#fafafa]"
      role="img"
      aria-label={`${BRAND_NAME}: nama situs diketik, lalu seekor rangkong badak terbang mengitarinya`}
    >
      <div ref={stageRef} className="absolute inset-0 flex items-center justify-center">
        <div
          ref={wordRef}
          className="font-cormorant whitespace-nowrap text-[clamp(3.6rem,8.6vw,8rem)] font-light leading-none tracking-[-0.005em] text-[#0a0a0a]"
        >
          {[...BRAND_NAME].map((ch, i) => (
            <span
              key={i}
              ref={(el) => {
                letterRefs.current[i] = el;
              }}
              className="hidden transition-opacity duration-200"
            >
              {ch}
            </span>
          ))}
          {/* Kursor: lebar nol supaya teks tetap di tengah saat ia hilang */}
          <span className="relative inline-block h-[0.2em] w-0 align-baseline">
            <span
              ref={cursorRef}
              className="intro-cursor-blink invisible absolute bottom-[-0.2em] left-[0.05em] h-[1.05em] w-px bg-[#5a5a5a] opacity-0"
            />
          </span>
          {/* Koma: titik (dot) jatuh memantul, lalu ekornya (tail) tumbuh; tipis seperti huruf Light */}
          <span ref={commaRef} className="invisible relative inline-block h-[0.2em] w-0 align-baseline transition-opacity duration-200">
            <svg viewBox="0 0 30 50" className="absolute left-[0.02em] top-0 h-[0.5em] w-[0.3em] overflow-visible" aria-hidden>
              <g ref={dotRef} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
                <circle cx="9" cy="14" r="5.6" fill="#0a0a0a" />
              </g>
              <path
                ref={tailRef}
                d="M 13.8 15.5 C 15 23 12 31 4 37"
                pathLength={1}
                strokeDasharray="1"
                strokeDashoffset="1"
                fill="none"
                stroke="#0a0a0a"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </div>
      </div>

      <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute left-0 top-0 h-0 w-0 will-change-transform" />

      <button
        type="button"
        onClick={() => exitRef.current()}
        className="font-cormorant absolute bottom-5 right-5 cursor-pointer text-[16px] text-[#0a0a0a]/45 transition-colors hover:text-[#0a0a0a]"
      >
        Lewati
      </button>
    </div>
  );
}
