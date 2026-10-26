"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { FastForward, MousePointerClick, Pause, RotateCcw, Waves } from "lucide-react";
import { CANAL_TEXT, KANAL_ACTS, SCALE_NOTE, TIME_SPEEDS } from "@/config/kanal-content";
import { GAMBUT_MODULES } from "@/config/gambut-content";
import {
  CANAL_DEPTH_MAX_M,
  DrainageSim,
  formatDistance,
  formatDrop,
  formatYears,
  SIM_MAX_YEARS,
  WATER_LIMIT_M,
  type DrainageStats,
} from "@/lib/drainage";
import { CANAL_LABEL_WIDTH_M, NEAR_LENGTH_M, VERTICAL_EXAGGERATION } from "./scene/transect";
import WaterTableChart from "./WaterTableChart";
import { createKanalState, type KanalState, type Quality } from "./scene/kanalState";

// Kanvas 3D dimuat terpisah (tanpa SSR) agar halaman awal tetap ringan.
const KanalScene = dynamic(() => import("./scene/KanalScene"), { ssr: false });

const MODULE = GAMBUT_MODULES[2];

/** Kecepatan waktu awal tiap babak (indeks pada TIME_SPEEDS). */
const ACT_SPEED = [0, 0, 2, 0];

/**
 * Modul 03 — Kanal & Pengeringan.
 *
 * Penampang lanskap sepanjang satu kilometer, bukan bongkahan seperti dua
 * modul sebelumnya: pengeringan tidak terjadi pada skala beberapa meter.
 * Pembaca menggali kanalnya sendiri, memajukan tahun, lalu mencoba
 * memperbaikinya dengan sekat.
 */
export default function KanalModule() {
  const rootRef = useRef<HTMLDivElement>(null);

  const sim = useMemo(() => new DrainageSim(), []);

  const [act, setAct] = useState(0);
  const [stats, setStats] = useState<DrainageStats>(() => sim.stats);
  const [canalDepthCm, setCanalDepthCm] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [quality, setQuality] = useState<Quality>("high");

  const stateRef = useRef<KanalState>(createKanalState());

  // Salurkan keadaan antarmuka ke adegan 3D (dibaca tiap bingkai).
  useEffect(() => {
    Object.assign(stateRef.current, {
      act,
      canalDepthM: canalDepthCm / 100,
      yearsPerSecond: TIME_SPEEDS[speedIndex].yearsPerSecond,
      blocked,
      reducedMotion,
    });
  }, [act, canalDepthCm, speedIndex, blocked, reducedMotion]);

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

  const handleStats = useCallback((next: DrainageStats) => setStats(next), []);
  const handleReady = useCallback(() => setReady(true), []);

  const handleReset = useCallback(() => {
    sim.reset();
    setStats({ ...sim.stats });
    setAct(0);
    setCanalDepthCm(0);
    setSpeedIndex(0);
    setBlocked(false);
    Object.assign(stateRef.current, createKanalState());
  }, [sim]);

  // --- Syarat lulus tiap babak ---------------------------------------------
  const actDone = [
    canalDepthCm >= 100,
    stats.riskReachM >= 100,
    stats.years >= 10,
    blocked && stats.maxSubsidenceM > 0.1,
  ];
  const canAdvance = actDone[act] && act < KANAL_ACTS.length - 1;

  const goToAct = (next: number) => {
    if (next > act && !actDone[act]) return;
    setAct(next);
    setSpeedIndex(ACT_SPEED[next]);
  };

  const current = KANAL_ACTS[act];
  const dense = act >= 2;

  return (
    <div ref={rootRef} id="modul-kanal" className="relative h-[100dvh] w-full overflow-hidden bg-[#070708]">
      <div className="absolute inset-0">
        {mounted && (
          <KanalScene
            sim={sim}
            stateRef={stateRef}
            active={visible}
            quality={quality}
            onStats={handleStats}
            onReady={handleReady}
          />
        )}
      </div>

      {/* Tirai pemuatan */}
      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-[#070708] transition-opacity duration-1000 ${
          ready ? "opacity-0" : "opacity-100"
        }`}
        aria-hidden={ready}
      >
        <p className="animate-pulse text-xs uppercase tracking-[0.25em] text-white/40">Membuka penampang lanskap…</p>
      </div>

      {/* Gradasi agar teks tetap terbaca di atas gambar */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r from-black/85 via-black/40 to-transparent md:w-[62%]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/75 to-transparent" />

      {/* Panel cerita babak (kiri atas). Ambang tingginya mengikuti Modul 02:
          min-height, sehingga keadaan sempit menjadi keadaan dasar. */}
      <div className="pointer-events-none absolute left-5 right-5 top-14 sm:left-10 sm:top-14 md:left-14 md:right-auto md:max-w-[404px] [@media(min-height:651px)]:top-16 [@media(min-height:651px)]:sm:top-20 [@media(min-height:901px)]:top-20 [@media(min-height:901px)]:sm:top-24">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/50">
          Modul {MODULE.number} · {MODULE.title}
        </p>
        <div key={act} aria-live="polite">
          <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-[#6fb6d8] [@media(min-height:901px)]:mt-3">
            Babak {current.number}
          </p>
          <h1
            className="mt-1 font-playfair text-3xl italic leading-[1.02] text-white [@media(min-height:651px)]:text-4xl [@media(min-height:901px)]:sm:text-5xl"
            style={{ letterSpacing: "-0.03em" }}
          >
            {current.title}
          </h1>
          <p
            className={`mt-2 hidden text-sm leading-snug text-white/75 [@media(min-height:901px)]:mt-3 [@media(min-height:901px)]:leading-relaxed ${
              dense ? "[@media(min-height:861px)]:sm:block" : "[@media(min-height:701px)]:sm:block"
            }`}
          >
            {current.body}
          </p>
          <p className="mt-2 inline-flex items-start gap-2 text-xs leading-relaxed text-white/90 [@media(min-height:901px)]:mt-3">
            <MousePointerClick size={14} className="mt-0.5 shrink-0 text-[#6fb6d8]" />
            {current.task}
          </p>
        </div>
      </div>

      {/* Panel kendali (kiri bawah) */}
      <div className="absolute bottom-14 left-5 right-5 sm:left-10 md:left-14 md:right-auto md:w-[404px] [@media(min-height:651px)]:bottom-20">
        <div className="rounded-3xl border border-white/10 bg-black/50 p-3.5 shadow-2xl shadow-black/60 backdrop-blur-xl [@media(min-height:901px)]:p-4">
          {/* Kedalaman kanal */}
          <div className="flex items-baseline justify-between">
            <label htmlFor="kanal-depth" className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
              {CANAL_TEXT.depthLabel}
            </label>
            <span className="font-playfair text-xl italic text-white tabular-nums">
              {canalDepthCm === 0 ? "belum digali" : `${canalDepthCm} cm`}
            </span>
          </div>
          <input
            id="kanal-depth"
            type="range"
            min={0}
            max={CANAL_DEPTH_MAX_M * 100}
            step={10}
            value={canalDepthCm}
            onChange={(e) => {
              setCanalDepthCm(Number(e.target.value));
              if (Number(e.target.value) > 0) setBlocked(false);
            }}
            aria-valuetext={`Kanal sedalam ${canalDepthCm} sentimeter`}
            className="water-slider relative z-10 mt-2 w-full"
          />

          {/* Waktu */}
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">Waktu berjalan</p>
              <p className="mt-1 whitespace-nowrap font-playfair text-xl italic leading-none text-white">
                {formatYears(stats.years)}
                {stats.atTimeLimit && <span className="ml-2 font-sans text-[10px] not-italic text-white/40">batas model</span>}
              </p>
            </div>
            <div className="flex shrink-0 gap-1 rounded-full border border-white/15 bg-black/30 p-1">
              {TIME_SPEEDS.map((speed, i) => (
                <button
                  key={speed.label}
                  type="button"
                  onClick={() => setSpeedIndex(i)}
                  aria-pressed={speedIndex === i}
                  title={speed.yearsPerSecond === 0 ? "Hentikan waktu" : `${speed.yearsPerSecond} tahun per detik`}
                  className={`cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    speedIndex === i ? "bg-white text-black" : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {i === 0 ? <Pause size={12} className="inline" /> : i === TIME_SPEEDS.length - 1 ? <FastForward size={12} className="inline" /> : null}
                  <span className={i === 0 ? "sr-only sm:not-sr-only sm:ml-1" : "ml-1"}>{speed.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sekat & mulai ulang */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setBlocked(true)}
              disabled={blocked || canalDepthCm === 0}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-emerald-300/35 bg-emerald-400/15 px-3.5 py-2 text-xs font-medium text-emerald-100 transition-colors hover:bg-emerald-400/25 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Waves size={14} />
              {blocked ? CANAL_TEXT.blockedLabel : CANAL_TEXT.blockLabel}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/20 px-3.5 py-2 text-xs font-medium text-white/75 transition-colors hover:border-white/40 hover:text-white"
            >
              <RotateCcw size={14} />
              {CANAL_TEXT.resetLabel}
            </button>
          </div>
        </div>
      </div>

      {/* Kolom kanan: angka hidup dan keterangan skala. Satu tumpukan yang
          ditambatkan ke tepi atas, seperti perbaikan pada Modul 02. */}
      <div className="absolute right-5 top-32 hidden w-[236px] flex-col gap-3 lg:flex xl:right-10">
        {/* Grafik satu kilometer. Ditempatkan di atas angka-angkanya, bukan di
            bawah, karena inilah yang menjawab pertanyaan babak 02 — angka
            "jangkauan rawan" di bawahnya hanya membacakan ulang satu titik
            dari kurva ini. */}
        <div className="rounded-3xl border border-white/10 bg-black/45 p-3.5 backdrop-blur-xl [@media(min-height:769px)]:p-4">
          <WaterTableChart sim={sim} stats={stats} />
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/45 p-3.5 backdrop-blur-xl [@media(min-height:769px)]:p-4">
          <div className="mb-2 border-b border-white/10 pb-2 [@media(min-height:769px)]:mb-3 [@media(min-height:769px)]:pb-3">
            <p className="font-playfair text-2xl italic leading-none text-[#6fb6d8]">{current.fact.value}</p>
            <p
              className="mt-1.5 hidden text-[10px] leading-snug text-white/55 [@media(min-height:701px)]:block"
              title={current.fact.caption}
            >
              {current.fact.caption}
            </p>
          </div>
          <dl className="space-y-2 [@media(min-height:769px)]:space-y-2.5">
            {(
              [
                ["Muka air di tepi kanal", formatDrop(stats.waterAtCanalM)],
                ["Jangkauan rawan", stats.riskReachM > 0 ? formatDistance(stats.riskReachM) : "—"],
                ["Permukaan turun", stats.maxSubsidenceM > 0.005 ? formatDrop(stats.maxSubsidenceM) : "—"],
                ["Karbon terlepas", stats.emittedTPerHa >= 1 ? `${Math.round(stats.emittedTPerHa)} t/ha` : "—"],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3">
                <dt className="text-[11px] text-white/50">{label}</dt>
                <dd className="text-xs font-medium tabular-nums text-white">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 space-y-1 border-t border-white/10 pt-2.5 text-[10px] leading-snug text-white/45">
            <p>{SCALE_NOTE.exaggeration(VERTICAL_EXAGGERATION)}</p>
            <p>{SCALE_NOTE.canal(CANAL_LABEL_WIDTH_M)}</p>
            <p>{SCALE_NOTE.near(NEAR_LENGTH_M)}</p>
            <p>{SCALE_NOTE.trees}</p>
            <p>
              Garis jingga: batas {Math.round(WATER_LIMIT_M * 100)} cm · Waktu dibatasi {SIM_MAX_YEARS} tahun
            </p>
          </div>
        </div>

        {blocked && (
          <div className="pointer-events-none rounded-2xl border border-emerald-300/30 bg-black/60 p-3.5 backdrop-blur-xl">
            <p className="text-xs leading-relaxed text-white/85">{CANAL_TEXT.blockedMessage}</p>
          </div>
        )}
      </div>

      {/* Navigasi babak (bawah) */}
      <nav aria-label="Babak modul" className="absolute bottom-6 left-5 flex items-end gap-4 sm:left-10 md:left-14">
        <div className="flex gap-2">
          {KANAL_ACTS.map((a, i) => {
            const locked = i > act && !actDone[act];
            return (
              <button
                key={a.number}
                type="button"
                onClick={() => goToAct(i)}
                disabled={locked}
                aria-current={i === act ? "step" : undefined}
                title={locked ? a.title : a.title}
                className={`group flex flex-col items-start gap-2 text-left ${locked ? "cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span
                  className={`h-0.5 w-12 rounded-full transition-colors duration-500 ${
                    i === act ? "bg-white" : actDone[i] ? "bg-[#6fb6d8]" : locked ? "bg-white/12" : "bg-white/25 group-hover:bg-white/50"
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
          </button>
        )}
      </nav>
    </div>
  );
}
