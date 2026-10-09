"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowRight, MousePointerClick, Volume2, VolumeX } from "lucide-react";
import { BARA_ACTS, IGNITION_SOURCES, SUPPRESSION_TEXT, TIME_SPEEDS, type IgnitionSource, type ViewMode } from "@/config/bara-content";
import { GAMBUT_MODULES } from "@/config/gambut-content";
import { SmolderSim, type SmolderStats } from "@/lib/smolder";
import { AmbientSound } from "@/lib/ambientSound";
import IgnitionPicker from "./IgnitionPicker";
import ControlDock, { WATER_MAX_CM } from "./ControlDock";
import StatsPanel from "./StatsPanel";
import ProbeCard, { type ProbeResult } from "./ProbeCard";
import SummaryCard from "./SummaryCard";
import {
  createBaraState,
  BARA_MAX_TILT_DOWN,
  BARA_MAX_TILT_UP,
  type BaraState,
  type Quality,
} from "./scene/baraState";

gsap.registerPlugin(useGSAP);

// Kanvas 3D dimuat terpisah (tanpa SSR) agar halaman awal tetap ringan.
const BaraScene = dynamic(() => import("./scene/BaraScene"), { ssr: false });

const MODULE = GAMBUT_MODULES[1];

/** Muka air tanah awal: gambut sudah dikeringkan sehingga dapat terbakar. */
const START_WATER_CM = 120;

/** Kecepatan waktu awal tiap babak (indeks pada TIME_SPEEDS). */
const ACT_SPEED = [0, 2, 2, 2];

/** Syarat lulus tiap babak, dibaca dari keadaan simulasi & tindakan pembaca. */
const ACT_HINT = [
  "Sulut permukaan untuk melanjutkan.",
  "Butuh dua hari perjalanan waktu untuk melanjutkan.",
  "Siram permukaan lalu buka tampilan termal untuk melanjutkan.",
  "Naikkan muka air tanah sampai seluruh bara padam.",
];

/**
 * Modul 02 — Bara di Bawah Tanah.
 *
 * Berbeda dari Modul 01 yang bercerita mengikuti gulir halaman, modul ini
 * adalah ruang uji: bongkahan gambut dipotong sehingga penampangnya menghadap
 * pembaca, lalu pembaca sendiri yang menyulut, memajukan waktu, mencoba
 * memadamkan, dan akhirnya membasahi gambutnya kembali. Tiap tindakan langsung
 * mengubah simulasi bara (`lib/smolder.ts`) yang digambar pada penampang.
 */
export default function BaraModule() {
  const rootRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  // Simulasi dibuat sekali dan dipakai bersama antarmuka & adegan 3D.
  const sim = useMemo(() => {
    const instance = new SmolderSim();
    instance.setWaterTable(START_WATER_CM / 100);
    return instance;
  }, []);

  const [act, setAct] = useState(0);
  const [stats, setStats] = useState<SmolderStats>(() => sim.stats);
  const [source, setSource] = useState<IgnitionSource | null>(null);
  const [ignited, setIgnited] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [waterCm, setWaterCm] = useState(START_WATER_CM);
  const [view, setView] = useState<ViewMode>("permukaan");
  const [probe, setProbe] = useState<ProbeResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dousedOnce, setDousedOnce] = useState(false);
  const [thermalSeen, setThermalSeen] = useState(false);
  const [rewetOnce, setRewetOnce] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [quality, setQuality] = useState<Quality>("high");
  const [soundOn, setSoundOn] = useState(false);

  const stateRef = useRef<BaraState>(createBaraState(START_WATER_CM / 100));

  // Salurkan keadaan antarmuka ke adegan 3D (dibaca tiap bingkai).
  useEffect(() => {
    Object.assign(stateRef.current, {
      act,
      view,
      hoursPerSecond: TIME_SPEEDS[speedIndex].hoursPerSecond,
      waterM: waterCm / 100,
      reducedMotion,
    });
  }, [act, view, speedIndex, waterCm, reducedMotion]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Muat kanvas saat modul mendekati layar; jeda render saat tidak terlihat.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const near = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        const low = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
        setQuality(low ? "low" : "high");
        setMounted(true);
      },
      { rootMargin: "600px 0px" },
    );
    const onScreen = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    near.observe(el);
    onScreen.observe(el);
    return () => {
      near.disconnect();
      onScreen.disconnect();
    };
  }, []);

  // Suara suasana: derak bara menguat seiring luas gambut yang terbakar.
  const soundRef = useRef<AmbientSound | null>(null);
  const toggleSound = () => {
    if (!soundRef.current) soundRef.current = new AmbientSound();
    setSoundOn((on) => !on);
  };
  useEffect(() => {
    const sound = soundRef.current;
    if (!sound) return;
    if (soundOn && visible) void sound.start();
    else sound.stop();
  }, [soundOn, visible]);
  useEffect(() => {
    soundRef.current?.setDanger(Math.min(1, stats.active / 90 + stats.consumed * 0.5));
  }, [stats.active, stats.consumed]);
  useEffect(() => () => soundRef.current?.dispose(), []);

  // Teks babak masuk dengan gerak naik-dan-menjernih setiap kali babak berganti.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".act-anim",
          { opacity: 0, y: 22, filter: "blur(10px)" },
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9, stagger: 0.07, ease: "expo.out" },
        );
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(".act-anim", { opacity: 1, y: 0, filter: "none" });
      });
    },
    { scope: textRef, dependencies: [act], revertOnUpdate: true },
  );

  // Pesan kejadian (hasil penyiraman, pohon tumbang) hilang sendiri.
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 11000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const current = BARA_ACTS[act];

  // --- Tindakan pembaca -----------------------------------------------------

  /** Klik permukaan pada babak 01: sulut di titik itu. */
  const handleSurfaceClick = useCallback(
    (xFraction: number) => {
      if (act !== 0) return;
      const chosen = source ?? IGNITION_SOURCES[0];
      if (!source) setSource(chosen);
      const lit = sim.ignite(Math.min(0.92, Math.max(0.08, xFraction)));
      const s = stateRef.current;
      s.flameX = Math.min(0.92, Math.max(0.08, xFraction));
      s.flame = 1;
      s.flameDecay = 1 / chosen.flameSeconds;
      if (!lit) {
        setMessage("Gambut di titik itu masih terlalu basah untuk menyala. Turunkan muka air tanah lebih dulu.");
        return;
      }
      setIgnited(true);
      setMessage(chosen.after);
      // Waktu mulai berjalan sendiri agar pembaca langsung melihat akibatnya.
      setSpeedIndex(ACT_SPEED[1]);
      setStats({ ...sim.stats });
    },
    [act, sim, source],
  );

  /** Klik satu titik pada penampang: tampilkan keadaannya. */
  const handleProbe = useCallback(
    (col: number, row: number) => {
      if (act === 0) return;
      const result = sim.probe(col, row);
      setProbe({
        state: result.state,
        depth: result.depth,
        layer: result.layer,
        moisture: result.moisture,
        temperature: result.temperature,
      });
    },
    [act, sim],
  );

  const handleDouse = useCallback(() => {
    sim.douseSurface();
    stateRef.current.spray = 1;
    setDousedOnce(true);
    setMessage(SUPPRESSION_TEXT.douse.result);
  }, [sim]);

  const handleRewet = useCallback(() => {
    // Muka air dinaikkan sampai di atas bara terdalam, dengan batas aman 40 cm.
    setWaterCm(30);
    stateRef.current.spray = 1;
    setRewetOnce(true);
    setMessage(SUPPRESSION_TEXT.rewet.result);
  }, []);

  const handleCollapse = useCallback(() => {
    setCollapsed(true);
    setMessage(SUPPRESSION_TEXT.collapse);
  }, []);

  const handleView = useCallback((next: ViewMode) => {
    setView(next);
    if (next === "termal") setThermalSeen(true);
  }, []);

  const handleReset = useCallback(() => {
    sim.reset();
    sim.setWaterTable(START_WATER_CM / 100);
    setStats({ ...sim.stats });
    setAct(0);
    setSource(null);
    setIgnited(false);
    setSpeedIndex(0);
    setWaterCm(START_WATER_CM);
    setView("permukaan");
    setProbe(null);
    setMessage(null);
    setDousedOnce(false);
    setThermalSeen(false);
    setRewetOnce(false);
    setCollapsed(false);
    Object.assign(stateRef.current, createBaraState(START_WATER_CM / 100));
  }, [sim]);

  // --- Syarat lanjut tiap babak --------------------------------------------

  const actDone = [ignited, ignited && stats.hours >= 48, dousedOnce && thermalSeen, stats.extinguished && rewetOnce];
  const canAdvance = actDone[act] && act < BARA_ACTS.length - 1;
  const finished = act === BARA_ACTS.length - 1 && stats.extinguished;

  const goToAct = (next: number) => {
    if (next > act && !actDone[act]) return;
    setAct(next);
    setProbe(null);
    setSpeedIndex(ACT_SPEED[next]);
    // Babak "tak terlihat dari atas" selalu dimulai dari tampilan permukaan.
    if (next === 2) setView("permukaan");
  };

  // Seret mendatar untuk memutar diorama. Jarak tempuhnya disimpan agar
  // penangan klik di dalam adegan dapat membedakan seretan dari ketukan.
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const handleDragStart = useCallback((e: React.PointerEvent) => {
    stateRef.current.dragMoved = 0;
    drag.current = { x: e.clientX, y: e.clientY, yaw: stateRef.current.rotation, pitch: stateRef.current.tilt };
  }, []);
  const handleDragMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    // Jarak tempuh diukur pada kedua arah; menyeret tegak pun bukan ketukan.
    stateRef.current.dragMoved = Math.max(stateRef.current.dragMoved, Math.hypot(dx, dy));
    // Tanpa batas: diorama boleh diputar berkali-kali penuh.
    stateRef.current.rotation = d.yaw + dx * 0.005;
    // Menyeret ke bawah berarti ingin melihat dari atas, jadi tandanya dibalik.
    stateRef.current.tilt = Math.max(-BARA_MAX_TILT_UP, Math.min(BARA_MAX_TILT_DOWN, d.pitch + dy * 0.004));
  }, []);
  const handleDragEnd = useCallback(() => {
    drag.current = null;
  }, []);

  const handleStats = useCallback((next: SmolderStats) => setStats(next), []);
  const handleReady = useCallback(() => setReady(true), []);

  return (
    <div ref={rootRef} id="modul-bara" className="relative h-[100dvh] w-full overflow-hidden bg-[#050505]">
      {/* Lapisan 3D. Seretan mendatar memutar diorama; sentuhan ikut dilayani
          karena halaman ini tidak dapat digulir, jadi tidak ada yang direbut. */}
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        onPointerLeave={handleDragEnd}
      >
        {mounted && (
          <BaraScene
            sim={sim}
            stateRef={stateRef}
            active={visible}
            quality={quality}
            onStats={handleStats}
            onProbe={handleProbe}
            onSurfaceClick={handleSurfaceClick}
            onCollapse={handleCollapse}
            onReady={handleReady}
          />
        )}
      </div>

      {/* Tirai pemuatan */}
      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-[#050505] transition-opacity duration-1000 ${
          ready ? "opacity-0" : "opacity-100"
        }`}
        aria-hidden={ready}
      >
        <p className="animate-pulse text-xs uppercase tracking-[0.25em] text-white/40">Membuka penampang gambut…</p>
      </div>

      {/* Gradasi agar teks tetap terbaca di atas model */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r from-black/80 via-black/35 to-transparent md:w-[60%]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/55 to-transparent" />
      {/* Peredup tambahan khusus layar sempit. Di layar lebar teks cerita duduk
          di kolom kirinya sendiri, tetapi di ponsel ia melebar sampai ke atas
          diorama; tanpa peredup ini angka kunci dan keterangannya jatuh tepat
          di atas dedaunan dan tidak terbaca. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[46%] bg-gradient-to-b from-black/85 via-black/55 to-transparent md:hidden" />
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[30%] bg-gradient-to-l from-black/70 via-black/20 to-transparent lg:block" />
      {/* Tepi bawah dibuat hitam penuh supaya adegan menyatu dengan footer hitam
          di bawahnya. Sebelumnya berhenti di 80% sehingga tersisa beda terang
          yang terbaca sebagai garis mendatar, dan footer tampak seperti balok
          hitam yang ditempel. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black via-black/55 to-transparent" />

      {/* Panel cerita babak (kiri atas) */}
      <div className="pointer-events-none absolute left-5 right-5 top-20 sm:left-10 sm:top-24 md:left-14 md:right-auto md:max-w-[404px]">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/50">
          Modul {MODULE.number} · {MODULE.title}
        </p>
        <div ref={textRef} key={act} aria-live="polite">
          <p className="act-anim mt-3 text-[11px] uppercase tracking-[0.2em] text-[#f0a060]">Babak {current.number}</p>
          <h1
            className="act-anim mt-1 font-playfair text-4xl italic leading-[1.02] text-white sm:text-5xl"
            style={{ letterSpacing: "-0.03em" }}
          >
            {current.title}
          </h1>
          <p className="act-anim mt-3 hidden text-sm leading-relaxed text-white/75 sm:block">{current.body}</p>
          <p className="act-anim mt-3 inline-flex items-start gap-2 text-xs leading-relaxed text-white/90">
            <MousePointerClick size={14} className="mt-0.5 shrink-0 text-[#f0a060]" />
            {current.task}
          </p>
          <div className="act-anim mt-4 hidden items-baseline gap-4 border-t border-white/10 pt-4 [@media(min-height:760px)]:flex">
            <span className="shrink-0 font-playfair text-2xl italic text-[#f0a060]">{current.fact.value}</span>
            <span className="text-[11px] leading-relaxed text-white/55">{current.fact.caption}</span>
          </div>
        </div>
      </div>

      {/* Panel kendali (kiri bawah) */}
      <div className="absolute bottom-20 left-5 right-5 sm:left-10 md:left-14 md:right-auto md:w-[404px]">
        {finished ? (
          <SummaryCard stats={stats} onReset={handleReset} />
        ) : probe ? (
          <ProbeCard probe={probe} onClose={() => setProbe(null)} />
        ) : act === 0 ? (
          <IgnitionPicker selected={source?.id ?? null} onSelect={setSource} ignited={ignited} />
        ) : (
          <ControlDock
            hours={stats.hours}
            speedIndex={speedIndex}
            onSpeed={setSpeedIndex}
            waterCm={waterCm}
            onWater={setWaterCm}
            showDouse={act >= 2}
            onDouse={handleDouse}
            dousing={stats.surfaceSmoke < 0.02 && dousedOnce && act === 2}
            showRewet={act >= 3}
            onRewet={handleRewet}
            view={view}
            onView={handleView}
            urgeThermal={dousedOnce && !thermalSeen}
          />
        )}
      </div>

      {/* Angka hidup & keterangan warna (kanan) */}
      <div className="absolute right-5 top-32 hidden lg:block xl:right-10">
        <StatsPanel stats={stats} />
      </div>

      {/* Pesan kejadian (kanan bawah) */}
      {message && (
        <div className="pointer-events-none absolute bottom-20 right-5 hidden w-[300px] rounded-2xl border border-[#e8702a]/30 bg-black/60 p-4 backdrop-blur-xl lg:block xl:right-10">
          <p className="text-xs leading-relaxed text-white/85">{message}</p>
        </div>
      )}

      {/* Navigasi babak (bawah) */}
      <nav aria-label="Babak modul" className="absolute bottom-6 left-5 flex items-end gap-4 sm:left-10 md:left-14">
        <div className="flex gap-2">
          {BARA_ACTS.map((a, i) => {
            const locked = i > act && !actDone[act];
            return (
              <button
                key={a.number}
                type="button"
                onClick={() => goToAct(i)}
                disabled={locked}
                aria-current={i === act ? "step" : undefined}
                title={locked ? ACT_HINT[act] : a.title}
                className={`group flex flex-col items-start gap-2 text-left ${locked ? "cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span
                  className={`h-0.5 w-12 rounded-full transition-colors duration-500 ${
                    i === act ? "bg-white" : actDone[i] ? "bg-[#e8702a]" : locked ? "bg-white/12" : "bg-white/25 group-hover:bg-white/50"
                  }`}
                />
                <span className={`text-[11px] tabular-nums transition-colors ${i === act ? "text-white" : "text-white/40"}`}>
                  {a.number}
                </span>
              </button>
            );
          })}
        </div>

        {canAdvance && (
          <button
            type="button"
            onClick={() => goToAct(act + 1)}
            className="group mb-1 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur-md transition-colors hover:bg-white/20"
          >
            Babak berikutnya
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        )}
      </nav>

      {/* Kanan bawah: petunjuk & tombol suara */}
      <div className="absolute bottom-6 right-5 flex items-center gap-4 text-[11px] text-white/60 sm:right-10">
        <span className="hidden lg:inline">
          {act === 0 ? "Klik permukaan untuk menyulut" : "Klik penampang untuk memeriksa satu titik"}
          <span className="text-white/35"> · seret untuk memutar</span>
        </span>
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={soundOn}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 backdrop-blur-md transition-colors ${
            soundOn ? "border-white/40 bg-white/15 text-white" : "border-white/20 bg-black/30 text-white/70 hover:text-white"
          }`}
        >
          {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
          Suara
        </button>
      </div>

      {/* Peringatan bila muka air dinaikkan melebihi jangkauan pengatur */}
      <span className="sr-only">
        Rentang pengatur muka air tanah 0 sampai {WATER_MAX_CM} sentimeter. Pohon tumbang: {collapsed ? "sudah terjadi" : "belum"}.
      </span>
    </div>
  );
}
