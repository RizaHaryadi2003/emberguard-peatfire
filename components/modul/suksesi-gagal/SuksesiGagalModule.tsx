"use client";

import { useEffect, useRef, useState } from "react";
import ActModuleShell from "@/components/modul/shared/ActModuleShell";
import ModuleAudio from "@/components/modul/shared/ModuleAudio";
import SliderTrack from "@/components/modul/shared/SliderTrack";
import GuideLayer from "@/components/modul/shared/GuideLayer";
import { karbonMix, peatForestMix } from "@/lib/sound/soundscapes";
import {
  FIRES,
  SAPLINGS_PER_M2,
  SEEDLINGS_PER_M2,
  SPECIES_UNBURNED,
  TRANSECT,
  aliveAfter,
  transectTrees,
  treesInTransect,
  type Fires,
} from "@/lib/model/succession";
import {
  FIRES_LABEL,
  FLOOR_FROM,
  SUKSESI_ACTS,
  SUKSESI_GUIDE,
  SUKSESI_HOOK,
  SUKSESI_TEXT,
  explainFires,
  guideLevel,
} from "@/config/modul/suksesi-gagal";
import TransectView, { type TransectState } from "./TransectView";

const TREES = transectTrees();
/** Tahun terlama yang bisa ditunggu di babak 03. */
const MAX_YEARS = 10;
/** Lama api menjalar melintasi layar (detik). */
const BURN_SEC = 3.5;

/** Keadaan lahan tepat sesudah sejumlah kebakaran (babak 02), ilustratif. */
const AFTER_FIRE: Record<Fires, { fern: number; char: number }> = {
  0: { fern: 0, char: 0 },
  1: { fern: 0.15, char: 0.85 },
  2: { fern: 0.55, char: 0.5 },
  3: { fern: 1, char: 0.2 },
};

/** Pohon yang sudah dilewati (tercatat) sampai jarak tertentu. */
const countedUpTo = (m: number, fires: Fires) =>
  aliveAfter(TREES, fires).filter((t) => t.x <= m).length;

/**
 * Modul 10 — Suksesi Gagal.
 *
 * Pembaca menjadi peneliti yang berjalan di satu jalur ukur (transek) hutan
 * rawa gambut dan mencatat pohon hidup: di hutan utuh, sesudah satu, dua,
 * atau lebih kebakaran, lalu menyaksikan mengapa api datang lagi. Sumbernya
 * di docs/md/acuan-modul/acuan-modul-suksesi-gagal.md; angkanya dari
 * lib/model/succession.ts.
 */
export default function SuksesiGagalModule() {
  const [act, setAct] = useState(0);
  const [walked, setWalked] = useState(0);
  const [maxWalked, setMaxWalked] = useState(0);
  // Babak 02: jumlah kebakaran yang dipilih dan yang sudah dicoba.
  const [fires2, setFires2] = useState<Fires>(0);
  const [tried, setTried] = useState<ReadonlySet<Fires>>(new Set([0]));
  // Babak 03: lahan bekas sekali terbakar yang ditunggu, lalu kemarau.
  const [fires3, setFires3] = useState<Fires>(1);
  const [years, setYears] = useState(0);
  const [maxYears, setMaxYears] = useState(0);
  const [droughts, setDroughts] = useState(0);
  const [burning, setBurning] = useState(0);
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const [acked, setAcked] = useState<readonly number[]>([0, 0, 0]);

  const actDone = [maxWalked >= TRANSECT.lengthM, tried.size === FIRES.length, droughts >= 1];
  const counted = countedUpTo(walked, 0);
  const progress = [
    `${SUKSESI_TEXT.walked(walked)} · ${SUKSESI_TEXT.counted(counted)}`,
    `${tried.size} dari ${FIRES.length} pilihan dicoba`,
    `${SUKSESI_TEXT.fireCount(fires3)} · ${treesInTransect(fires3)} pohon`,
  ][act];

  const reset = () => {
    cancelAnimationFrame(raf.current);
    setAct(0);
    setWalked(0);
    setMaxWalked(0);
    setFires2(0);
    setTried(new Set([0]));
    setFires3(1);
    setYears(0);
    setMaxYears(0);
    setDroughts(0);
    setBurning(0);
    setAcked([0, 0, 0]);
  };

  const steps = SUKSESI_GUIDE[act];
  const level = guideLevel(act, { maxWalked, firesTried: tried.size, maxYears, droughts }, acked[act]);
  const step = steps[level];
  const shown = (floor: string) => level >= ((FLOOR_FROM[act] as Record<string, number>)[floor] ?? Infinity);
  const ackStep = () => setAcked((a) => a.map((v, i) => (i === act ? Math.max(v, level + 1) : v)));

  const walk = (m: number) => {
    setWalked(m);
    setMaxWalked((x) => Math.max(x, m));
  };
  const chooseFires = (f: Fires) => {
    setFires2(f);
    setTried((s) => new Set(s).add(f));
  };
  const wait = (y: number) => {
    setYears(y);
    setMaxYears((m) => Math.max(m, y));
  };
  const drought = () => {
    if (burning > 0 || fires3 >= 3) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const done = () => {
      setBurning(0);
      setFires3((f) => Math.min(3, f + 1) as Fires);
      setYears(0);
      setDroughts((d) => d + 1);
    };
    if (reduced) return done();
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = (now - t0) / 1000 / BURN_SEC;
      if (p >= 1) return done();
      setBurning(Math.max(0.001, p));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  // Keadaan gambar untuk babak ini.
  const view: TransectState = (() => {
    if (act === 0) return { walkedM: walked, fires: 0, fern: 0, char: 0, burning: 0, seedlingsPerM2: SEEDLINGS_PER_M2.unburned };
    if (act === 1)
      return {
        walkedM: walked,
        fires: fires2,
        ...AFTER_FIRE[fires2],
        burning: 0,
        seedlingsPerM2: fires2 === 0 ? SEEDLINGS_PER_M2.unburned : SEEDLINGS_PER_M2.burned,
      };
    // Babak 03: pakis menutup lahan dalam beberapa tahun; abu memudar.
    const fern = Math.min(1, 0.12 + years / 4);
    return {
      walkedM: walked,
      fires: fires3,
      fern: burning > 0 ? fern * (1 - burning) : fern,
      char: burning > 0 ? burning : Math.max(0, 0.8 - years / 2.5),
      burning,
      seedlingsPerM2: SEEDLINGS_PER_M2.burned,
    };
  })();

  return (
    <>
      <ModuleAudio
        getMix={() =>
          view.fires === 0
            ? peatForestMix(0)
            : karbonMix({ burning: burning > 0 ? 1 : 0, burnt: true, recovery: view.fern * 0.4 })
        }
      />
      <ActModuleShell
        href="/modul/suksesi-gagal"
        hook={SUKSESI_HOOK}
        acts={SUKSESI_ACTS}
        act={act}
        onAct={setAct}
        actDone={actDone}
        progress={progress}
        onReset={reset}
        background="#11140f"
        figure={
          <div data-guide="figure" className="absolute inset-0 overflow-clip">
            <TransectView state={view} onWalk={walk} />
            {act === 2 && burning > 0 && (
              <p className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-[#ffb37a]">
                {SUKSESI_TEXT.burningNow}
              </p>
            )}
          </div>
        }
        controls={
          <div className="-mx-2 rounded-2xl px-2 py-1.5">
            <div data-guide="walk">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="suksesi-walk" className={LABEL}>
                  {SUKSESI_TEXT.walk}
                </label>
                <span className="text-[11px] tabular-nums text-white/75">{SUKSESI_TEXT.walked(walked)}</span>
              </div>
              <SliderTrack tone="neutral" pct={(walked / TRANSECT.lengthM) * 100} ticks={[25, 50, 75]}>
                <input
                  id="suksesi-walk"
                  type="range"
                  min={0}
                  max={TRANSECT.lengthM}
                  step={1}
                  value={Math.round(walked)}
                  onChange={(e) => walk(Number(e.target.value))}
                  aria-valuetext={SUKSESI_TEXT.walked(walked)}
                  className="water-slider relative z-10 w-full"
                />
              </SliderTrack>
            </div>

            {act === 0 && (
              <p className="mt-2 text-[12px] tabular-nums text-white/80 lg:hidden">
                {SUKSESI_TEXT.counted(counted)}
              </p>
            )}

            {act === 1 && (
              <div data-guide="fires" className="mt-2.5">
                <p className={`${LABEL} mb-1.5`}>{SUKSESI_TEXT.fires}</p>
                <div role="radiogroup" aria-label={SUKSESI_TEXT.fires} className="flex flex-wrap gap-2">
                  {FIRES.map((f) => (
                    <button
                      key={f}
                      type="button"
                      role="radio"
                      aria-checked={fires2 === f}
                      onClick={() => chooseFires(f)}
                      className="btn-mono"
                    >
                      {FIRES_LABEL[f]}
                      {tried.has(f) && <span className="tabular-nums opacity-60">· {treesInTransect(f)}</span>}
                    </button>
                  ))}
                </div>
                <p className="mt-2 rounded-xl bg-white/[0.07] px-3 py-2 text-[12px] leading-snug text-white/80 lg:hidden">
                  {explainFires(fires2)}
                </p>
              </div>
            )}

            {act === 2 && (
              <>
                <div data-guide="wait" className="mt-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <label htmlFor="suksesi-years" className={LABEL}>
                      {SUKSESI_TEXT.wait}
                    </label>
                    <span className="text-[11px] tabular-nums text-white/75">{SUKSESI_TEXT.years(years)}</span>
                  </div>
                  <SliderTrack tone="neutral" pct={(years / MAX_YEARS) * 100}>
                    <input
                      id="suksesi-years"
                      type="range"
                      min={0}
                      max={MAX_YEARS}
                      step={1}
                      value={years}
                      disabled={burning > 0}
                      onChange={(e) => wait(Number(e.target.value))}
                      aria-valuetext={SUKSESI_TEXT.years(years)}
                      className="water-slider relative z-10 w-full"
                    />
                  </SliderTrack>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <button
                    type="button"
                    data-guide="dry"
                    onClick={drought}
                    disabled={burning > 0 || fires3 >= 3 || years < 2}
                    className="btn-mono is-on"
                  >
                    {burning > 0 ? SUKSESI_TEXT.burningNow : SUKSESI_TEXT.dry}
                  </button>
                  <span className="text-[12px] tabular-nums text-white/75">
                    {SUKSESI_TEXT.fireCount(fires3)} · {treesInTransect(fires3)} pohon
                  </span>
                </div>
                {fires3 >= 3 && (
                  <p className="mt-2 text-[11px] leading-snug text-white/60">{SUKSESI_TEXT.maxFires}</p>
                )}
              </>
            )}
          </div>
        }
        aside={
          <>
            {act === 0 && (
              <>
                {shown("count") && (
                  <section data-guide="count" className={`${CARD} stage-in`}>
                    <p className={EYEBROW}>{SUKSESI_TEXT.treesNow}</p>
                    <p className="mt-1.5 font-playfair text-4xl italic leading-none tabular-nums text-white">{counted}</p>
                    <p className="mt-1.5 text-[11px] text-white/55">{SUKSESI_TEXT.walked(walked)}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-white/70" style={{ width: `${(walked / TRANSECT.lengthM) * 100}%` }} />
                    </div>
                    {maxWalked >= TRANSECT.lengthM && (
                      <p className="stage-in mt-2 text-[12px] text-white/80">{SUKSESI_TEXT.species(SPECIES_UNBURNED)}</p>
                    )}
                  </section>
                )}
                {shown("why") && (
                  <section className={`${CARD} stage-in`}>
                    <p className={EYEBROW}>{SUKSESI_TEXT.why}</p>
                    <p className="mt-1.5 text-[12px] leading-snug text-white/85">{SUKSESI_ACTS[0].observe}</p>
                  </section>
                )}
              </>
            )}

            {act === 1 && (
              <>
                {shown("chart") && (
                  <section data-guide="chart" className={`${CARD} stage-in`}>
                    <p className={EYEBROW}>
                      {SUKSESI_TEXT.trees} · {SUKSESI_TEXT.perTransect}
                    </p>
                    <div className="mt-2.5 space-y-1.5">
                      {FIRES.map((f) => (
                        <div key={f} className="flex items-center gap-2 text-[11px]">
                          <span className={`w-28 shrink-0 ${fires2 === f ? "text-white" : "text-white/65"}`}>{FIRES_LABEL[f]}</span>
                          <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                            {tried.has(f) && (
                              <span
                                className="chart-bar absolute inset-y-0 left-0 rounded-full bg-[#9cc27a]"
                                style={{ width: `${Math.max(1.5, (treesInTransect(f) / treesInTransect(0)) * 100)}%` }}
                              />
                            )}
                          </span>
                          <span className="w-8 shrink-0 text-right tabular-nums text-white">
                            {tried.has(f) ? treesInTransect(f) : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                {shown("why") && (
                  <section data-guide="why" className={`${CARD} stage-in`}>
                    <p className={EYEBROW}>{FIRES_LABEL[fires2]}</p>
                    <p className="mt-1.5 text-[12px] leading-snug text-white/85">{explainFires(fires2)}</p>
                  </section>
                )}
              </>
            )}

            {act === 2 && (
              <>
                {shown("seedlings") && (
                  <section data-guide="seedlings" className={`${CARD} stage-in`}>
                    <p className={EYEBROW}>{SUKSESI_TEXT.compare}</p>
                    <div className="mt-2 grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1 text-[11px] tabular-nums">
                      <span />
                      <span className="text-white/45">{SUKSESI_TEXT.unburned}</span>
                      <span className="text-white/45">{SUKSESI_TEXT.burned}</span>
                      <span className="text-white/75">{SUKSESI_TEXT.seedlings}</span>
                      <span className="text-right text-white">{SEEDLINGS_PER_M2.unburned.toLocaleString("id-ID")}</span>
                      <span className="text-right text-[#ffb37a]">{SEEDLINGS_PER_M2.burned.toLocaleString("id-ID")}</span>
                      <span className="text-white/75">{SUKSESI_TEXT.saplings}</span>
                      <span className="text-right text-white">{SAPLINGS_PER_M2.unburned.toLocaleString("id-ID")}</span>
                      <span className="text-right text-[#ffb37a]">{SAPLINGS_PER_M2.burned.toLocaleString("id-ID")}</span>
                    </div>
                  </section>
                )}
                {shown("why") && (
                  <section className={`${CARD} stage-in`}>
                    <p className={EYEBROW}>{SUKSESI_TEXT.why}</p>
                    <p className="mt-1.5 text-[12px] leading-snug text-white/85">{SUKSESI_ACTS[2].observe}</p>
                  </section>
                )}
              </>
            )}
          </>
        }
        guide={
          <GuideLayer
            key={`${act}-${level}`}
            target={step.target}
            text={step.text}
            index={level + 1}
            total={steps.length}
            onAuto={level < steps.length - 1 && !step.done ? ackStep : undefined}
            delayMs={level === 0 ? 1500 : 350}
          />
        }
      />
    </>
  );
}

const CARD =
  "rounded-2xl border border-white/10 bg-[#0a0d0f]/55 p-3.5 [@media(max-height:820px)]:p-3 shadow-lg shadow-black/20 [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]";
const EYEBROW = "text-[10px] font-medium uppercase tracking-[0.18em] text-white/45";
const LABEL = "text-[11px] font-medium uppercase tracking-[0.18em] text-white/45";
