"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Check, FastForward, MousePointerClick, Pause, RotateCcw } from "lucide-react";
import {
  BURN_REFERENCE_NOTE,
  BURN_REFERENCES,
  FIGURE_NOTE,
  KARBON_ACTS,
  KARBON_HOOK,
  KARBON_TEXT,
  LIMIT_NOTES,
  MATCH_TEXT,
  TIME_SPEEDS,
} from "@/config/karbon-content";
import { moduleAt } from "@/config/modules-content";
import ModuleHook from "@/components/modul/ModuleHook";
import {
  AREA_MAX_HA,
  AREA_MIN_HA,
  BURN_DEPTH_MAX_M,
  CarbonSim,
  formatArea,
  formatPeople,
  formatThickness,
  formatTonnes,
  formatYearCount,
  HEADLINE_FIRE,
  HEADLINE_CO2_T,
  judgeMatch,
  matchSolved,
  type CarbonStats,
} from "@/lib/carbon";
import { createKarbonState, type KarbonState, type Quality } from "./scene/karbonState";

// Kanvas 3D dimuat terpisah (tanpa SSR) agar halaman awal tetap ringan.
const KarbonScene = dynamic(() => import("./scene/KarbonScene"), { ssr: false });

// Diambil lewat alamatnya, bukan urutannya, supaya urutan modul dapat diubah.
const MODULE = moduleAt("/modul/karbon");

/**
 * Babak paling awal yang sudah menampilkan tiap alat.
 *
 * Mengikuti pola Modul 02 dan 03: alat sebuah babak baru muncul ketika
 * babaknya tiba, lalu tetap ada di babak sesudahnya.
 */
const TOOL_FROM = { burn: 0, area: 1, time: 2 } as const;

/** Kedalaman terbakar yang harus dicapai babak "Sekali bakar" (m). */
const BURN_TARGET_M = 0.5;

/** Lama pemulihan yang harus dijalankan babak terakhir (tahun). */
const RECOVERY_TARGET_YEARS = 100;

/** Jarak usapan ke atas yang menutup layar pembuka di layar sentuh (piksel). */
const HOOK_SWIPE = 30;

/**
 * Modul 04 — Gudang Karbon.
 *
 * Bongkahan gambut yang sama dengan Modul 01 dan 03, dibaca ulang sebagai
 * gudang karbon. Pembaca membakarnya sendiri, menukar luas dengan kedalaman,
 * lalu mencoba menimbunnya kembali dan menemukan berapa lama itu.
 */
export default function KarbonModule() {
  const rootRef = useRef<HTMLDivElement>(null);

  const sim = useMemo(() => new CarbonSim(), []);

  const [hookOpen, setHookOpen] = useState(true);
  const [act, setAct] = useState(0);
  const [stats, setStats] = useState<CarbonStats>(() => sim.stats);
  const [burnCm, setBurnCm] = useState(0);
  const [areaHa, setAreaHa] = useState(1);
  const [speedIndex, setSpeedIndex] = useState(0);
  /**
   * Pembaca pernah menyamakan luas-kedalaman dengan benar.
   *
   * Diingat, bukan dihitung ulang: pengaturnya masih dapat digeser di babak
   * terakhir, dan tanpa kunci ini penanda babak yang sudah selesai akan
   * berubah kelabu lagi seolah pekerjaannya batal. Pola dan alasannya sama
   * dengan `probeSolvedOnce` pada Modul 02.
   */
  const [matchSolvedOnce, setMatchSolvedOnce] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [quality, setQuality] = useState<Quality>("high");
  const handleOverload = useCallback(() => setQuality("low"), []);

  const stateRef = useRef<KarbonState>(createKarbonState());

  // Salurkan keadaan antarmuka ke adegan 3D (dibaca tiap bingkai).
  useEffect(() => {
    Object.assign(stateRef.current, {
      act,
      burnDepthM: burnCm / 100,
      yearsPerSecond: TIME_SPEEDS[speedIndex].yearsPerSecond,
      reducedMotion,
    });
  }, [act, burnCm, speedIndex, reducedMotion]);

  // Layar pembuka tertutup oleh tombolnya, oleh gulir ke bawah, atau oleh
  // usapan ke atas, sama dengan Modul 02 dan 03.
  useEffect(() => {
    if (!hookOpen) return;
    let startY: number | null = null;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY > 0) setHookOpen(false);
    };
    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (startY !== null && startY - e.touches[0].clientY > HOOK_SWIPE) setHookOpen(false);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [hookOpen]);

  // Luas tidak mengubah bentuk apa pun, hanya angkanya — jadi ia dikirim
  // langsung ke simulasi, bukan lewat keadaan bersama yang dibaca tiap bingkai.
  useEffect(() => {
    sim.setArea(areaHa);
  }, [sim, areaHa]);

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
        if (low) setQuality("low");
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

  const handleStats = useCallback((next: CarbonStats) => setStats(next), []);
  const handleReady = useCallback(() => setReady(true), []);

  /**
   * Pembaca menggeser salah satu dari dua pengatur babak 02.
   *
   * Keduanya menentukan jawaban yang sama — karbon yang lepas adalah luas
   * dikali kedalaman — jadi keduanya memanggil penangan ini, dan kuncinya
   * dipasang di sini. Dikerjakan di dalam `useEffect` yang mengawasi kedua
   * nilainya, yang didapat adalah satu render tambahan tiap kali salah satu
   * pengatur bergerak satu langkah; alasan lengkapnya ada pada
   * `probeSolvedOnce` di Modul 02.
   */
  const recordMatch = useCallback((nextAreaHa: number, nextBurnM: number) => {
    if (matchSolved(judgeMatch(nextAreaHa, nextBurnM))) setMatchSolvedOnce(true);
  }, []);

  const handleReset = useCallback(() => {
    sim.reset();
    setStats({ ...sim.stats });
    setAct(0);
    setBurnCm(0);
    setAreaHa(1);
    setSpeedIndex(0);
    setMatchSolvedOnce(false);
    Object.assign(stateRef.current, createKarbonState());
  }, [sim]);

  // --- Syarat lulus tiap babak ---------------------------------------------
  //
  // Tiap syarat harus berupa pekerjaan yang benar-benar dikerjakan pembaca di
  // babak itu, bukan keadaan yang kebetulan sudah benar — aturan yang dibayar
  // mahal di Modul 02 dan tidak boleh dilanggar lagi di sini. Perhatikan
  // bahwa syarat babak 02 tidak mungkin terpenuhi oleh pekerjaan babak 01:
  // babak 01 meminta 50 cm pada satu hektare, yang menghasilkan karbon jauh
  // di bawah angka beritanya dan luas yang tidak pernah disentuh.
  const burnM = burnCm / 100;
  const matchVerdict = judgeMatch(areaHa, burnM);
  const matchFound = matchSolved(matchVerdict) || matchSolvedOnce;

  const actDone = [stats.burnDepthM >= BURN_TARGET_M, matchFound, stats.years >= RECOVERY_TARGET_YEARS];

  /**
   * Sisa pekerjaan babak ini, satu baris, dengan angka yang hidup.
   *
   * Pola yang sama dengan Modul 02: pembaca harus tahu seberapa jauh ia dari
   * selesai, bukan hanya bahwa ia belum.
   */
  const progress: string = [
    stats.burnDepthM >= BURN_TARGET_M
      ? `Terbakar ${formatThickness(stats.burnDepthM)}`
      : `Baru terbakar ${formatThickness(stats.burnDepthM)} dari ${BURN_TARGET_M * 100} cm`,
    matchFound
      ? "Karbonnya sudah disamakan"
      : `${formatTonnes(stats.co2T)} dari ${formatTonnes(HEADLINE_CO2_T)}`,
    stats.years >= RECOVERY_TARGET_YEARS
      ? `${formatYearCount(stats.years)} berlalu`
      : `Baru ${formatYearCount(stats.years)} dari ${RECOVERY_TARGET_YEARS} tahun`,
  ][act];
  const canAdvance = actDone[act] && act < KARBON_ACTS.length - 1;

  const goToAct = (next: number) => {
    if (next > act && !actDone[act]) return;
    setAct(next);
    setSpeedIndex(0);
  };

  const current = KARBON_ACTS[act];
  const dense = act >= 1;

  /** Semua panel disembunyikan selama layar pembuka tampil, sama dengan Modul 01–03. */
  const panelFade = `transition-opacity duration-700 ${hookOpen ? "opacity-0" : "opacity-100"}`;

  return (
    <div ref={rootRef} id="modul-karbon" className="relative h-[100dvh] w-full overflow-hidden bg-[#070708]">
      <div className="absolute inset-0">
        {mounted && (
          <KarbonScene
            sim={sim}
            stateRef={stateRef}
            active={visible}
            quality={quality}
            onOverload={handleOverload}
            onStats={handleStats}
            onReady={handleReady}
            showLabels={!hookOpen}
          />
        )}
      </div>

      <ModuleHook
        open={hookOpen}
        kicker={`Modul ${MODULE.number} · ${MODULE.title}`}
        setup={KARBON_HOOK.setup}
        question={KARBON_HOOK.question}
        cta={KARBON_HOOK.cta}
        scrollHint={KARBON_HOOK.scrollHint}
        onStart={() => setHookOpen(false)}
      />

      {/* Tirai pemuatan */}
      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-[#070708] transition-opacity duration-1000 ${
          ready ? "opacity-0" : "opacity-100"
        }`}
        aria-hidden={ready}
      >
        <p className="animate-pulse text-xs uppercase tracking-[0.25em] text-white/40">Membuka arsip gambut…</p>
      </div>

      {/* Gradasi agar teks tetap terbaca di atas gambar */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r from-black/85 via-black/40 to-transparent md:w-[62%]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/75 to-transparent" />

      {/* Panel cerita babak (kiri atas) */}
      <div inert={hookOpen} className={`pointer-events-none absolute left-5 right-5 top-14 sm:left-10 sm:top-14 md:left-14 md:right-auto md:max-w-[404px] [@media(min-height:651px)]:top-16 [@media(min-height:651px)]:sm:top-20 [@media(min-height:901px)]:top-20 [@media(min-height:901px)]:sm:top-24 ${panelFade}`}>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/50">
          Modul {MODULE.number} · {MODULE.title}
        </p>
        <div key={act} aria-live="polite">
          <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-[#e0a265] [@media(min-height:901px)]:mt-3">
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
            <MousePointerClick size={14} className="mt-0.5 shrink-0 text-[#e0a265]" />
            {current.task}
          </p>
          <p
            className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] tabular-nums transition-colors ${
              actDone[act]
                ? "border-emerald-300/35 bg-emerald-400/10 text-emerald-100"
                : "border-white/15 bg-white/5 text-white/55"
            }`}
          >
            {actDone[act] ? (
              <Check size={12} className="shrink-0" />
            ) : (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/35" />
            )}
            {progress}
          </p>
        </div>
      </div>

      {/* Panel kendali (kiri bawah) */}
      <div inert={hookOpen} className={`absolute bottom-14 left-5 right-5 sm:left-10 md:left-14 md:right-auto md:w-[404px] [@media(min-height:651px)]:bottom-20 ${panelFade}`}>
        <div className="rounded-3xl border border-white/10 bg-black/50 p-3.5 shadow-2xl shadow-black/60 backdrop-blur-xl [@media(min-height:901px)]:p-4">
          {/* Kedalaman terbakar — sejak babak pertama, babak yang membakarnya. */}
          {act >= TOOL_FROM.burn && (
            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor="karbon-burn" className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
                  {KARBON_TEXT.burnLabel}
                </label>
                <span className="font-playfair text-xl italic tabular-nums text-white">
                  {burnCm === 0 ? KARBON_TEXT.burnIdle : formatThickness(burnM)}
                </span>
              </div>
              <input
                id="karbon-burn"
                type="range"
                min={0}
                max={BURN_DEPTH_MAX_M * 100}
                step={1}
                value={burnCm}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setBurnCm(next);
                  recordMatch(areaHa, next / 100);
                }}
                aria-valuetext={`Terbakar sedalam ${burnCm} sentimeter, yaitu ${Math.round(burnCm * 10)} tahun penimbunan`}
                className="water-slider relative z-10 mt-2 w-full"
              />
              {/* Kedalaman yang pernah diukur pada kebakaran sungguhan. */}
              <div className="relative mt-0.5 h-4" aria-hidden="true">
                {BURN_REFERENCES.map((r) => (
                  <span
                    key={r.label}
                    className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                    style={{ left: `${(r.depthM / BURN_DEPTH_MAX_M) * 100}%` }}
                  >
                    <span className="h-1.5 w-px bg-[#e0a265]" />
                    <span className="text-[9px] leading-none tabular-nums text-[#e0a265]/80">{r.label}</span>
                  </span>
                ))}
              </div>
              <p className="mt-1 hidden text-[10px] leading-snug text-white/40 sm:block">{BURN_REFERENCE_NOTE}</p>
              <p className="mt-1 text-[11px] tabular-nums text-white/45">
                {burnCm === 0
                  ? "Gambutnya masih utuh."
                  : `Setara ${formatYearCount(stats.lostYears)} penimbunan.`}
              </p>
            </div>
          )}

          {/* Luas terbakar — babak 02. */}
          {act >= TOOL_FROM.area && (
            <div className="mt-3 border-t border-white/10 pt-3">
              <div className="flex items-baseline justify-between">
                <label htmlFor="karbon-area" className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
                  {KARBON_TEXT.areaLabel}
                </label>
                <span className="font-playfair text-xl italic tabular-nums text-white">{formatArea(areaHa)}</span>
              </div>
              <input
                id="karbon-area"
                type="range"
                min={AREA_MIN_HA}
                max={AREA_MAX_HA}
                step={1}
                value={areaHa}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setAreaHa(next);
                  recordMatch(next, burnM);
                }}
                aria-valuetext={`Terbakar seluas ${areaHa} hektare`}
                className="water-slider relative z-10 mt-2 w-full"
              />
              {act === TOOL_FROM.area && (
                <p
                  className={`mt-1.5 text-[11px] leading-snug ${
                    matchVerdict === "matched" ? "text-[#7fd4a8]" : "text-white/55"
                  }`}
                >
                  {MATCH_TEXT[matchVerdict]}
                </p>
              )}
            </div>
          )}

          {/* Waktu pemulihan — babak 03. */}
          {act >= TOOL_FROM.time && (
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
                  {KARBON_TEXT.timeLabel}
                </p>
                <p className="mt-1 whitespace-nowrap font-playfair text-xl italic leading-none text-white">
                  {formatYearCount(stats.years)}
                  {stats.atTimeLimit && (
                    <span className="ml-2 font-sans text-[10px] not-italic text-white/40">
                      {KARBON_TEXT.timeLimit}
                    </span>
                  )}
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
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/20 px-3.5 py-2 text-xs font-medium text-white/75 transition-colors hover:border-white/40 hover:text-white"
            >
              <RotateCcw size={14} />
              {KARBON_TEXT.resetLabel}
            </button>
          </div>

          {/* Kabar bahwa takiknya akhirnya tertutup.
              Tempatnya di panel kiri, bukan di kolom kanan — kolom itu tidak
              boleh bertambah tinggi di babak mana pun, pelajaran yang dibayar
              di Modul 02 ketika kartu ketiga menjulur melewati tepi layar. */}
          {act >= TOOL_FROM.time && stats.burnDepthM > 0 && stats.remainingM <= 0.001 && (
            <p className="mt-3 border-t border-emerald-300/20 pt-3 text-[11px] leading-relaxed text-emerald-50/85">
              {KARBON_TEXT.healed}
            </p>
          )}
        </div>
      </div>

      {/* Kolom kanan: angka hidup dan keterangan. Tingginya dibatasi sejak
          awal, jadi ia tidak pernah dapat menjulur melewati tepi layar. */}
      <div inert={hookOpen} className={`absolute bottom-24 right-5 top-32 hidden w-[236px] flex-col gap-3 overflow-y-auto lg:flex xl:right-10 [&>*]:shrink-0 ${panelFade}`}>
        {/* Angka kunci babak */}
        <div className="rounded-3xl border border-white/10 bg-black/45 p-3.5 backdrop-blur-xl [@media(min-height:769px)]:p-4">
          <p className="font-playfair text-2xl italic leading-none text-[#e0a265]">{current.fact.value}</p>
          <p
            className="mt-1.5 hidden text-[10px] leading-snug text-white/55 [@media(min-height:701px)]:block"
            title={current.fact.caption}
          >
            {current.fact.caption}
          </p>
        </div>

        {/* Angka hidup */}
        <div className="rounded-3xl border border-white/10 bg-black/45 p-3.5 backdrop-blur-xl [@media(min-height:769px)]:p-4">
          <dl className="space-y-2 [@media(min-height:769px)]:space-y-2.5">
            {(
              [
                ["Terbakar", stats.burnDepthM > 0 ? formatThickness(stats.burnDepthM) : "—"],
                ["Penimbunan hilang", stats.lostYears > 0 ? formatYearCount(stats.lostYears) : "—"],
                ["Luas", formatArea(stats.areaHa)],
                ["Karbon lepas", stats.carbonT >= 1 ? formatTonnes(stats.carbonT) : "—"],
                ["CO₂ lepas", stats.co2T >= 1 ? formatTonnes(stats.co2T) : "—"],
                ["Setara emisi setahun", stats.peopleYears >= 1 ? formatPeople(stats.peopleYears) : "—"],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3">
                <dt className="text-[11px] text-white/50">{label}</dt>
                <dd className="text-xs font-medium tabular-nums text-white">{value}</dd>
              </div>
            ))}
          </dl>

          {/* Babak 02: angka yang harus disamai, dicetak berdampingan dengan
              angka yang sedang disetel pembaca. Tanpa keduanya terlihat
              sekaligus, tugasnya berubah menjadi menebak. */}
          {act === TOOL_FROM.area && (
            <div className="mt-3 border-t border-white/10 pt-2.5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/40">Yang harus disamai</p>
              <p className="mt-1 text-xs tabular-nums text-white">
                {formatTonnes(HEADLINE_CO2_T)}
                <span className="ml-1.5 text-[10px] text-white/45">
                  ({formatArea(HEADLINE_FIRE.areaHa)} × {formatThickness(HEADLINE_FIRE.depthM)})
                </span>
              </p>
            </div>
          )}

          {/* Babak 03: sisa takik dan sisa waktunya. */}
          {act === TOOL_FROM.time && stats.burnDepthM > 0 && (
            <div className="mt-3 space-y-2 border-t border-white/10 pt-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[11px] text-white/50">Sudah tertimbun</span>
                <span className="text-xs font-medium tabular-nums text-white">
                  {formatThickness(stats.regrownM)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[11px] text-white/50">Masih kurang</span>
                <span className="text-xs font-medium tabular-nums text-[#e0a265]">
                  {stats.remainingM > 0 ? formatYearCount(stats.yearsLeft) : "—"}
                </span>
              </div>
            </div>
          )}

          <div className="mt-3 space-y-1 border-t border-white/10 pt-2.5 text-[10px] leading-snug text-white/45">
            <p>{FIGURE_NOTE.block}</p>
            <p>{FIGURE_NOTE.calendar}</p>
            <p>{FIGURE_NOTE.area}</p>
            {LIMIT_NOTES.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Navigasi babak (bawah) */}
      <nav inert={hookOpen} aria-label="Babak modul" className={`absolute bottom-6 left-5 flex items-end gap-4 sm:left-10 md:left-14 ${panelFade}`}>
        <div className="flex gap-2">
          {KARBON_ACTS.map((a, i) => {
            const locked = i > act && !actDone[act];
            return (
              <button
                key={a.number}
                type="button"
                onClick={() => goToAct(i)}
                disabled={locked}
                aria-current={i === act ? "step" : undefined}
                title={locked ? current.hint : a.title}
                className={`group flex flex-col items-start gap-2 text-left ${locked ? "cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span
                  className={`h-0.5 w-12 rounded-full transition-colors duration-500 ${
                    i === act ? "bg-white" : actDone[i] ? "bg-[#e0a265]" : locked ? "bg-white/12" : "bg-white/25 group-hover:bg-white/50"
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
