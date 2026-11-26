"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import * as THREE from "three";
import { BRAND_NAME } from "@/config/hero-content";
import { apply, attitudeAlong, clamp, rotation, wingAngle } from "@/lib/bird3d";
import { COMMA_DURATION, COMMA_START, COMMA_STEPS, type CommaState } from "@/lib/introComma";
import { INTRO_DONE, INTRO_SEEN_KEY, introPlaying } from "@/lib/introGate";
import { INTRO, orbitKeys, sampleFlight, sweepKeys, typingTimes, type FlightKey, type FlightLayout } from "@/lib/introFlight";
import { HornbillRig } from "./hornbill3d/HornbillRig";
import { HORNBILL_REACH } from "./hornbillShape";

/** Satuan model rangkong → piksel pada laptop 1440 px. */
const BIRD_UNIT = 0.5;
/** Ketajaman kanvas dibatasi agar layar beresolusi tinggi tidak terbebani. */
const MAX_DPR = 1.5;
/** Jangkauan terjauh bagian rangkong dari bahu (satuan model): sisi kanvas = 2 × ini. */
const BIRD_RADIUS = 260;
/** Skala terbesar rangkong per tahap (mengitari, menyapu), menentukan ukuran kanvas. */
const ORBIT_MAX_SCALE = 1.1;
const SWEEP_MAX_SCALE = 3.2;

/** Fase kepakan (radian): ±2,4 kepakan/detik saat mengitari, melambat ke ±1,9 saat menyapu. */
function flapPhase(t: number, sweepAt: number): number {
  const f0 = 2.4;
  const f1 = 1.9;
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
 * kursor berkedip → nama diketik → kursor menjadi bola yang memantul lalu
 * menjadi koma (lib/introComma.ts) → rangkong badak 3D mengitari teks sambil
 * memiringkan badan di tiap belokan, menjauh, lalu menyapu dari depan sambil
 * menghapus huruf → layar masuk ke tengah dan beranda tampil.
 *
 * Rangkong adalah model 3D hitam pekat (hornbill3d/HornbillRig.ts) yang
 * digambar three.js, jadi tampil sebagai siluet dari sudut mana pun dengan
 * sayap, bulu, dan ekor yang ikut bergerak.
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
  const markRef = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<SVGLineElement>(null);
  const ballRef = useRef<SVGGElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
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

    // ---- Kursor berkedip, lalu ketikan ----
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
    const typed = times[times.length - 1];

    // ---- Kursor → bola → titik → koma ----
    const comma: CommaState = { ...COMMA_START };
    const renderComma = () => {
      cursor.setAttribute("y2", String(comma.cursorBottom));
      ballRef.current!.setAttribute("transform", `translate(${comma.x} ${comma.y}) rotate(${comma.rot})`);
      dotRef.current!.setAttribute("r", String(comma.r));
      tailRef.current!.setAttribute("transform", `scale(${comma.tail})`);
    };
    renderComma();
    for (const step of COMMA_STEPS) {
      tl.to(comma, { ...step.to, duration: step.dur, ease: step.ease, onUpdate: renderComma }, typed + step.at);
    }
    // Kursor (garis) disembunyikan begitu susut habis.
    const shrink = COMMA_STEPS[0];
    tl.set(cursor, { autoAlpha: 0 }, typed + shrink.at + shrink.dur);

    // ---- Rangkong 3D ----
    const birdAt = typed + COMMA_DURATION + INTRO.holdAfterComma;
    const canvas = canvasRef.current!;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -4000, 4000);
    const rig = new HornbillRig();
    scene.add(rig.group);
    const rot4 = new THREE.Matrix4();
    // Siapkan shader dan unggah geometri sekarang, selagi layar baru menampilkan
    // kursor, supaya rangkong tidak tersendat saat pertama kali muncul.
    renderer.setSize(2, 2, false);
    renderer.compile(scene, camera);
    renderer.render(scene, camera);

    let layout: FlightLayout | null = null;
    let orbit: FlightKey[] = [];
    let sweep: FlightKey[] = [];
    let wipeTargets: { el: HTMLElement; x: number }[] = [];
    let unit = 0;
    let dpr = 1;
    /** Setengah sisi kanvas (px CSS). Kanvas hanya seukuran rangkong dan digeser dengan
     *  CSS transform, jadi peramban tidak menyusun ulang lapisan selebar layar. */
    let half = 0;
    let sizedFor = 0;
    const sizeCanvas = (maxScale: number) => {
      if (sizedFor === maxScale) return;
      sizedFor = maxScale;
      half = Math.ceil(BIRD_RADIUS * unit * maxScale);
      renderer.setPixelRatio(dpr);
      renderer.setSize(2 * half, 2 * half, false);
      canvas.style.width = canvas.style.height = `${2 * half}px`;
      camera.left = -half;
      camera.right = half;
      camera.top = half;
      camera.bottom = -half;
      camera.updateProjectionMatrix();
    };

    const measure = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      unit = BIRD_UNIT * Math.min(1.1, Math.max(0.6, vw / 1440));
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
      wipeTargets = [...letters, markRef.current!].map((el) => {
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
      const { att, yawRate } = attitudeAlong(sample, t);
      const k = unit * p.s;
      const x = layout.vw / 2 + p.x;
      const y = layout.vh / 2 + p.y;

      // Sikap → putaran model; ukuran → skala model.
      const m = rotation(att);
      rot4.set(m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, 0, 0, 0, 1);
      rig.group.quaternion.setFromRotationMatrix(rot4);
      rig.group.scale.setScalar(k);
      const phase = flapPhase(t, sweepAt);
      const glide = clamp(Math.abs(att.roll) / 0.9, 0, 1);
      rig.pose({ phase, wing: wingAngle(phase, att.roll), glide, roll: att.roll, yawRate, pitch: att.pitch });

      canvas.style.transform = `translate3d(${x - half}px, ${y - half}px, 0)`;
      renderer.render(scene, camera);

      // Huruf hilang saat pangkal leher melewatinya, yaitu saat tertutup badan.
      if (t >= sweepAt) {
        const coverX = x + apply(m, [HORNBILL_REACH.neck, 0, 0])[0] * k;
        for (const w of wipeTargets) if (w.x < coverX) w.el.style.opacity = "0";
      }
    };

    tl.call(measure, undefined, birdAt);
    tl.set(canvas, { autoAlpha: 1 }, birdAt);
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
      renderer.dispose();
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
          className="font-cormorant whitespace-nowrap text-[clamp(3.6rem,8.6vw,8rem)] leading-none tracking-[-0.005em] text-[#0a0a0a]"
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
          {/* Kursor dan koma: lebar nol supaya teks tetap di tengah. Satuan SVG: 100 = 1 em,
              asal di garis dasar tepat di kanan huruf terakhir (lihat lib/introComma.ts). */}
          <span ref={markRef} className="relative inline-block h-0 w-0 align-baseline transition-opacity duration-200">
            <svg
              viewBox="-100 -200 300 300"
              className="absolute left-[-1em] top-[-2em] h-[3em] w-[3em] overflow-visible"
              aria-hidden
            >
              <line
                ref={cursorRef}
                className="intro-cursor-blink invisible opacity-0"
                x1="4"
                y1="-80"
                x2="4"
                y2="24"
                stroke="#5a5a5a"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <g ref={ballRef}>
                <circle ref={dotRef} r="0" fill="#0a0a0a" />
                {/* Ekor koma: tumbuh dari sisi kanan bawah titik, melengkung turun ke kiri. */}
                <path ref={tailRef} d="M 5.8 2.2 C 6.8 10.5 3.6 17.5 -5.6 23.5 C -1.6 16.8 0.2 10.4 -0.6 5.6 Z" fill="#0a0a0a" transform="scale(0)" />
              </g>
            </svg>
          </span>
        </div>
      </div>

      <canvas ref={canvasRef} aria-hidden className="invisible pointer-events-none absolute left-0 top-0 h-0 w-0 opacity-0 will-change-transform" />

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
