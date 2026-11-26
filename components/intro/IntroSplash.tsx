"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { BRAND_NAME } from "@/config/hero-content";
import { INTRO_DONE, INTRO_SEEN_KEY, introPlaying } from "@/lib/introGate";
import { attitude, INTRO, orbitKeys, sampleFlight, SWEEP_SCALE, sweepKeys, typingTimes, type FlightLayout } from "@/lib/introFlight";
import { HORNBILL_REACH, HORNBILL_VIEWBOX, WING_PIVOT } from "./hornbillShape";
import Hornbill, { wingTransform } from "./Hornbill";

/** Lama terbang rangkong (detik): sama dengan titik kunci terakhir sweepKeys. */
const FLIGHT_S = 4.5;
/** Saat sapuan dimulai (detik sejak rangkong masuk), sama dengan sweepKeys pertama. */
const SWEEP_START = 3.2;
/** Satuan gambar rangkong → piksel pada laptop 1440 px (lebar badan ±190 px, seukuran beruang acuan). */
const BIRD_UNIT = 0.62;
/**
 * Elemen rangkong dibuat seukuran skala terbesarnya (saat menyapu) lalu
 * diperkecil. Peramban menggambar lapisan sekali pada ukuran elemen; bila
 * elemen kecil lalu diperbesar 3×, tepinya kabur. Diperkecil tetap tajam.
 */
const BIRD_BASE = SWEEP_SCALE * 1.03;

/** Fase kepakan (radian): ±3 kepakan/detik saat mengitari, melambat ke ±2,3 saat menyapu. */
function flapPhase(t: number): number {
  const f0 = 3.0;
  const f1 = 2.3;
  const a = 3.0;
  const b = 3.4;
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
 * badak mengitari teks, menjauh, lalu menyapu dari depan sambil menghapus
 * huruf → layar masuk ke tengah dan beranda tampil.
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
  const birdRef = useRef<HTMLDivElement>(null);
  const farWingRef = useRef<SVGGElement>(null);
  const nearWingRef = useRef<SVGGElement>(null);
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
    const bird = birdRef.current!;
    let layout: FlightLayout | null = null;
    let orbit: ReturnType<typeof orbitKeys> = [];
    let sweep: ReturnType<typeof sweepKeys> = [];
    let wipeTargets: { el: HTMLElement; x: number }[] = [];
    let birdUnit = 0;

    const measure = () => {
      const rect = wordRef.current!.getBoundingClientRect();
      const vw = window.innerWidth;
      const unit = BIRD_UNIT * Math.min(1.1, Math.max(0.6, vw / 1440));
      birdUnit = unit;
      layout = {
        vw,
        vh: window.innerHeight,
        textW: rect.width,
        textH: parseFloat(getComputedStyle(wordRef.current!).fontSize),
        birdFront: HORNBILL_REACH.front * unit,
        birdBack: HORNBILL_REACH.back * unit,
      };
      orbit = orbitKeys(layout);
      sweep = sweepKeys(layout);
      const big = unit * BIRD_BASE;
      const ox = (WING_PIVOT.x - HORNBILL_VIEWBOX.x) * big;
      const oy = (WING_PIVOT.y - HORNBILL_VIEWBOX.y) * big;
      gsap.set(bird, {
        width: HORNBILL_VIEWBOX.w * big,
        height: HORNBILL_VIEWBOX.h * big,
        // Titik putar elemen = bahu rangkong, diletakkan di pusat teks.
        left: `calc(50% - ${ox}px)`,
        top: `calc(50% - ${oy}px)`,
        transformOrigin: `${ox}px ${oy}px`,
      });
      wipeTargets = [...letters, commaRef.current!].map((el) => {
        const r = el.getBoundingClientRect();
        return { el, x: r.left + r.width / 2 };
      });
    };

    const flight = { t: 0 };
    const renderBird = () => {
      if (!layout) return;
      const t = flight.t;
      const p = sampleFlight(t < SWEEP_START - 0.1 ? orbit : sweep, t);
      const { facing, bank } = attitude(p.vx, p.vy);
      const k = p.s / BIRD_BASE;
      gsap.set(bird, { x: p.x, y: p.y, rotation: (bank * 180) / Math.PI, scaleX: k * facing, scaleY: k });
      const phase = flapPhase(t);
      farWingRef.current?.setAttribute("transform", wingTransform(0.85 * (0.14 + 0.86 * Math.cos(phase - 0.5))));
      nearWingRef.current?.setAttribute("transform", wingTransform(0.14 + 0.86 * Math.cos(phase)));
      // Huruf hilang saat bagian depan badan (pangkal leher) melewatinya,
      // yaitu saat huruf itu tertutup badan rangkong.
      if (t >= SWEEP_START) {
        const coverX = layout.vw / 2 + p.x + HORNBILL_REACH.neck * birdUnit * p.s;
        for (const w of wipeTargets) if (w.x < coverX) w.el.style.opacity = "0";
      }
    };

    tl.call(measure, undefined, birdAt);
    tl.set(bird, { autoAlpha: 1 }, birdAt);
    tl.to(flight, { t: FLIGHT_S, duration: FLIGHT_S, ease: "none", onUpdate: renderBird }, birdAt);
    // Layar masuk ke beranda sesudah ekor rangkong lewat tepi kanan.
    tl.call(exit, undefined, birdAt + FLIGHT_S);

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
          className="font-garamond whitespace-nowrap text-[clamp(3.2rem,7.6vw,7rem)] font-medium leading-none tracking-[-0.01em] text-[#0a0a0a]"
        >
          {[...BRAND_NAME].map((ch, i) => (
            <span
              key={i}
              ref={(el) => {
                letterRefs.current[i] = el;
              }}
              className="hidden transition-opacity duration-150"
            >
              {ch}
            </span>
          ))}
          {/* Kursor: lebar nol supaya teks tetap di tengah saat ia hilang */}
          <span className="relative inline-block h-[0.2em] w-0 align-baseline">
            <span
              ref={cursorRef}
              className="intro-cursor-blink invisible absolute bottom-[-0.2em] left-[0.05em] h-[1.05em] w-[1.5px] bg-[#5a5a5a] opacity-0"
            />
          </span>
          {/* Koma: titik (dot) jatuh memantul, lalu ekornya (tail) tumbuh */}
          <span ref={commaRef} className="invisible relative inline-block h-[0.2em] w-0 align-baseline transition-opacity duration-150">
            <svg viewBox="0 0 30 50" className="absolute left-[0.03em] top-0 h-[0.5em] w-[0.3em] overflow-visible" aria-hidden>
              <g ref={dotRef} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
                <circle cx="10" cy="12.5" r="7.5" fill="#0a0a0a" />
              </g>
              <path
                ref={tailRef}
                d="M 16.6 14 C 18 23 14 32 4 39"
                pathLength={1}
                strokeDasharray="1"
                strokeDashoffset="1"
                fill="none"
                stroke="#0a0a0a"
                strokeWidth="4.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </div>
      </div>

      <div ref={birdRef} className="invisible pointer-events-none absolute left-1/2 top-1/2 opacity-0 will-change-transform">
        <Hornbill farWingRef={farWingRef} nearWingRef={nearWingRef} className="h-full w-full" />
      </div>

      <button
        type="button"
        onClick={() => exitRef.current()}
        className="absolute bottom-5 right-5 cursor-pointer font-garamond text-[15px] text-[#0a0a0a]/45 transition-colors hover:text-[#0a0a0a]"
      >
        Lewati
      </button>
    </div>
  );
}
