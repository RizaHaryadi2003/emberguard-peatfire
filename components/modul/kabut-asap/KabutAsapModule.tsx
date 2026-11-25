"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import ActModuleShell from "@/components/modul/shared/ActModuleShell";
import ModuleAudio from "@/components/modul/shared/ModuleAudio";
import SliderTrack from "@/components/modul/shared/SliderTrack";
import GuideLayer from "@/components/modul/shared/GuideLayer";
import { kabutAsapMix } from "@/lib/sound/soundscapes";
import {
  CATEGORY_COLOR,
  HAIR_UM,
  ISPU_MAX,
  PM10_UM,
  PM25_UM,
  REAL_DAYS,
  breath,
  hazeLevel,
  inhaled,
  ispuCategory,
  pm25FromIspu,
  type IspuCategory,
  type Mask,
  type RealDayId,
} from "@/lib/model/haze";
import {
  CATEGORY_ADVICE,
  CATEGORY_LABEL,
  FLOOR_FROM,
  KABUT_ACTS,
  KABUT_GUIDE,
  KABUT_HOOK,
  KABUT_TEXT,
  MASK_LABEL,
  MASK_OPTIONS,
  MAX_ZOOM,
  REAL_DAY_LABEL,
  REVEAL_ZOOM,
  explainMask,
  guideLevel,
  scopeText,
  type ScopePart,
} from "@/config/modul/kabut-asap";
import MicroscopeView from "./MicroscopeView";
import WindowView from "./WindowView";
import { dayPart, formatHour, parseHour } from "@/lib/model/daylight";
import { BREATH_SEC } from "./BreathView";

/** Perbesaran awal mikroskop: rambut baru setipis garis. */
const START_ZOOM = 12;

/** ISPU awal jendela: udara bersih. */
const START_ISPU = 25;

/** Jam awal jendela: pukul 08.00, sama dengan jam pembuka modul. */
const START_HOUR = 8;

/** Penggeser perbesaran bekerja dalam skala logaritma, 0–1000. */
const zoomFromSlider = (v: number) =>
  START_ZOOM * Math.pow(MAX_ZOOM / START_ZOOM, v / 1000);
const sliderFromZoom = (z: number) =>
  (1000 * Math.log(z / START_ZOOM)) / Math.log(MAX_ZOOM / START_ZOOM);

/**
 * Modul 09 — Kabut Asap.
 *
 * Tiga skala, dari yang terkecil ke yang terdekat dengan tubuh: butir asap di
 * bawah mikroskop, udara Pontianak dari jendela, dan satu tarikan napas di
 * balik masker. Sumbernya di docs/md/acuan-modul/acuan-modul-kabut-asap.md;
 * angkanya dari lib/model/haze.ts.
 */
export default function KabutAsapModule() {
  const [act, setAct] = useState(0);
  // Babak 01: perbesaran dan benda yang sedang dijelaskan.
  const [zoom, setZoom] = useState(START_ZOOM);
  const [maxZoom, setMaxZoom] = useState(START_ZOOM);
  const [scope, setScope] = useState<ScopePart | null>(null);
  // Babak 02: ISPU di jendela dan hari sungguhan yang sudah dibuka.
  const [ispu, setIspu] = useState(START_ISPU);
  const [maxIspu, setMaxIspu] = useState(START_ISPU);
  const [day, setDay] = useState<RealDayId | null>(null);
  const [daysSeen, setDaysSeen] = useState<ReadonlySet<RealDayId>>(new Set());
  const [hour, setHour] = useState(START_HOUR);
  // Babak 03: masker, napas, dan hasil tiap masker.
  const [mask, setMask] = useState<Mask>("kain");
  // Nomor tarikan napas; dipakai lagi saat visual Babak 03 kembali.
  const [, setBreathId] = useState(0);
  const [breathing, setBreathing] = useState(false);
  const [results, setResults] = useState<ReadonlyMap<Mask, number>>(new Map());
  const [lastMask, setLastMask] = useState<Mask | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(timer.current ?? undefined), []);
  const [acked, setAcked] = useState<readonly number[]>([0, 0, 0]);

  const category = ispuCategory(ispu);
  const actDone = [
    maxZoom >= REVEAL_ZOOM,
    maxIspu >= 301 && daysSeen.size === REAL_DAYS.length,
    results.size >= MASK_OPTIONS.length,
  ];
  const progress = [
    KABUT_TEXT.zoomValue(zoom),
    `ISPU ${Math.round(ispu)} · ${CATEGORY_LABEL[category]}`,
    `${results.size} dari ${MASK_OPTIONS.length} masker dicoba`,
  ][act];

  const reset = () => {
    clearTimeout(timer.current ?? undefined);
    setAct(0);
    setZoom(START_ZOOM);
    setMaxZoom(START_ZOOM);
    setScope(null);
    setIspu(START_ISPU);
    setMaxIspu(START_ISPU);
    setDay(null);
    setDaysSeen(new Set());
    setHour(START_HOUR);
    setMask("kain");
    setBreathing(false);
    setResults(new Map());
    setLastMask(null);
    setAcked([0, 0, 0]);
  };

  const guideSteps = KABUT_GUIDE[act];
  const level = guideLevel(
    act,
    {
      maxZoom,
      inspected: scope !== null,
      maxIspu,
      daysSeen: daysSeen.size,
      masksTried: results.size,
    },
    acked[act],
  );
  const step = guideSteps[level];
  const shown = (floor: string) =>
    level >= ((FLOOR_FROM[act] as Record<string, number>)[floor] ?? Infinity);
  const ackStep = () =>
    setAcked((a) => a.map((v, i) => (i === act ? Math.max(v, level + 1) : v)));

  const moveZoom = (z: number) => {
    setZoom(z);
    setMaxZoom((m) => Math.max(m, z));
  };
  const moveIspu = (v: number, fromDay: RealDayId | null = null) => {
    setIspu(v);
    setMaxIspu((m) => Math.max(m, v));
    setDay(fromDay);
    if (fromDay) setDaysSeen((s) => new Set(s).add(fromDay));
  };
  const chooseMask = (m: Mask) => {
    if (breathing) return;
    setMask(m);
  };
  const breathe = () => {
    if (breathing) return;
    setBreathId((b) => b + 1);
    setBreathing(true);
    const m = mask;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    timer.current = setTimeout(
      () => {
        setBreathing(false);
        setResults((r) => new Map(r).set(m, inhaled(breath(m))));
        setLastMask(m);
      },
      reduced ? 0 : BREATH_SEC * 1000,
    );
  };

  const lastFates = lastMask ? breath(lastMask) : null;

  return (
    <>
      <ModuleAudio
        getMix={() =>
          kabutAsapMix({
            act,
            haze: act === 1 ? hazeLevel(ispu) : act === 2 ? 0.7 : 0,
            hour,
          })
        }
      />
      <ActModuleShell
        href="/modul/kabut-asap"
        hook={KABUT_HOOK}
        acts={KABUT_ACTS}
        act={act}
        onAct={(i) => {
          setAct(i);
          setScope(null);
        }}
        actDone={actDone}
        progress={progress}
        onReset={reset}
        background={act === 0 ? "#141210" : act === 2 ? "#0f1114" : "#1a1612"}
        figure={
          <>
            {act === 0 && (
              <div data-guide="scope" className="absolute inset-0">
                <MicroscopeView
                  zoom={zoom}
                  selected={scope}
                  onInspect={setScope}
                />
              </div>
            )}
            {act === 1 && (
              <>
                <WindowView ispu={ispu} hour={hour} />
                <div data-guide="window" className="absolute inset-0" />
                <p className="pointer-events-none absolute inset-x-0 top-0 hidden text-right text-[10px] text-white/70 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)] sm:block">
                  {KABUT_TEXT.windowNote}
                </p>
              </>
            )}
            {/* Visual Babak 03 sengaja dikosongkan sementara atas permintaan pengguna
                (paru-paru dirancang ulang nanti); teks, panel masker, dan
                hasilnya tetap berjalan. Komponen lama: BreathView. */}
            {/* Kartu penjelasan benda mikroskop, hanya di layar < 1024 px. */}
            {act === 0 && scope && (
              <div className="absolute left-0 right-0 top-0 z-20 md:right-auto md:w-[300px] lg:hidden">
                <ScopeCard part={scope} onClose={() => setScope(null)} />
              </div>
            )}
          </>
        }
        controls={
          <div className="-mx-2 rounded-2xl px-2 py-1.5">
            {act === 0 && (
              <div data-guide="zoom">
                <div className="flex items-baseline justify-between gap-3">
                  <label htmlFor="kabut-zoom" className={LABEL}>
                    {KABUT_TEXT.zoom}
                  </label>
                  <span className="text-[11px] tabular-nums text-white/75">
                    {KABUT_TEXT.zoomValue(zoom)}
                  </span>
                </div>
                <SliderTrack
                  tone="neutral"
                  pct={sliderFromZoom(zoom) / 10}
                  ticks={[sliderFromZoom(REVEAL_ZOOM) / 10]}
                >
                  <input
                    id="kabut-zoom"
                    type="range"
                    min={0}
                    max={1000}
                    step={1}
                    value={Math.round(sliderFromZoom(zoom))}
                    onChange={(e) =>
                      moveZoom(zoomFromSlider(Number(e.target.value)))
                    }
                    aria-valuetext={KABUT_TEXT.zoomValue(zoom)}
                    className="water-slider relative z-10 w-full"
                  />
                </SliderTrack>
                <div className="lg:hidden">
                  <SizeList zoom={zoom} compact />
                </div>
              </div>
            )}

            {act === 1 && (
              <>
                <div data-guide="ispu">
                  <div className="flex items-baseline justify-between gap-3">
                    <label htmlFor="kabut-ispu" className={LABEL}>
                      {KABUT_TEXT.ispu}
                    </label>
                    <span className="inline-flex items-center gap-2 text-[11px] tabular-nums text-white/80">
                      {Math.round(ispu)}
                      <CategoryChip category={category} />
                    </span>
                  </div>
                  <IspuTrack ispu={ispu} onChange={(v) => moveIspu(v)} />
                  <p className="mt-1 text-[10px] text-white/40">
                    {KABUT_TEXT.slideHint}
                  </p>
                </div>
                <div className="mt-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <label htmlFor="kabut-hour" className={LABEL}>
                      {KABUT_TEXT.time}
                    </label>
                    <span className="text-[11px] tabular-nums text-white/80">
                      {KABUT_TEXT.dayPart[dayPart(hour)]} · {formatHour(hour)}
                    </span>
                  </div>
                  <SliderTrack
                    tone="neutral"
                    pct={(hour / 24) * 100}
                    ticks={[25, 50, 75]}
                  >
                    <input
                      id="kabut-hour"
                      type="range"
                      min={0}
                      max={23.75}
                      step={0.25}
                      value={hour}
                      onChange={(e) => setHour(Number(e.target.value))}
                      aria-valuetext={`Pukul ${formatHour(hour)}`}
                      className="water-slider relative z-10 w-full"
                    />
                  </SliderTrack>
                </div>
                <div data-guide="days" className="mt-2.5">
                  <p className="mb-1.5 text-[11px] text-white/60">
                    {KABUT_TEXT.realDayInvite}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {REAL_DAYS.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        aria-pressed={day === d.id}
                        onClick={() => {
                          moveIspu(d.ispu, d.id);
                          setHour(parseHour(d.time));
                        }}
                        className="btn-mono"
                      >
                        {REAL_DAY_LABEL[d.id]}
                        <span className="tabular-nums opacity-60">
                          · {d.ispu}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="lg:hidden">
                  <p
                    data-guide="advice"
                    className="mt-2 rounded-xl bg-white/[0.07] px-3 py-2 text-[12px] leading-snug text-white/80"
                  >
                    <span className="font-medium text-white">
                      {CATEGORY_LABEL[category]}:
                    </span>{" "}
                    {CATEGORY_ADVICE[category].everyone}
                  </p>
                </div>
              </>
            )}

            {act === 2 && (
              <>
                <div data-guide="mask">
                  <p className={`${LABEL} mb-1.5`}>{KABUT_TEXT.mask}</p>
                  <div
                    role="radiogroup"
                    aria-label={KABUT_TEXT.mask}
                    className="flex flex-wrap gap-2"
                  >
                    {MASK_OPTIONS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        role="radio"
                        aria-checked={mask === m}
                        disabled={breathing}
                        onClick={() => chooseMask(m)}
                        className="btn-mono"
                      >
                        {MASK_LABEL[m]}
                        {results.has(m) && (
                          <span className="tabular-nums opacity-60">
                            · {results.get(m)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <button
                    type="button"
                    data-guide="breathe"
                    onClick={breathe}
                    disabled={breathing}
                    className="btn-mono is-on"
                  >
                    {breathing ? KABUT_TEXT.breathing : KABUT_TEXT.breathe}
                  </button>
                  {lastMask === mask && !breathing && lastFates && (
                    <span
                      aria-live="polite"
                      className="stage-in text-[12px] font-medium text-[#ffb37a]"
                    >
                      {KABUT_TEXT.inhaled(inhaled(lastFates))}
                    </span>
                  )}
                </div>
                <div className="lg:hidden">
                  {lastMask && !breathing && (
                    <p className="mt-2 rounded-xl bg-white/[0.07] px-3 py-2 text-[12px] leading-snug text-white/80">
                      {explainMask(lastMask)}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        }
        aside={
          <>
            {act === 0 && (
              <>
                {shown("sizes") && (
                  <section data-guide="sizes" className={`${CARD} stage-in`}>
                    <p className={EYEBROW}>{KABUT_TEXT.sizes}</p>
                    <div className="mt-2">
                      <SizeList zoom={zoom} />
                    </div>
                  </section>
                )}
                {scope ? (
                  <ScopeCard part={scope} onClose={() => setScope(null)} />
                ) : (
                  shown("why") && (
                    <p className={`${INVITE} stage-in`}>
                      {KABUT_TEXT.zoomInvite}
                    </p>
                  )
                )}
                {shown("why") && (
                  <section data-guide="why" className={`${CARD} stage-in`}>
                    <p className={EYEBROW}>{KABUT_TEXT.why}</p>
                    <p className="mt-1.5 text-[12px] leading-snug text-white/85">
                      {KABUT_ACTS[0].observe}
                    </p>
                  </section>
                )}
              </>
            )}

            {act === 1 && (
              <>
                {shown("ispu") && (
                  <section className={`${CARD} stage-in`}>
                    <p className={EYEBROW}>
                      {day
                        ? KABUT_TEXT.realDayNote(
                            REAL_DAYS.find((d) => d.id === day)!.date,
                            REAL_DAYS.find((d) => d.id === day)!.time,
                          )
                        : KABUT_TEXT.ispu}
                    </p>
                    <div className="mt-1.5 flex items-end justify-between gap-2">
                      <p className="font-playfair text-4xl italic leading-none tabular-nums text-white [@media(max-height:820px)]:text-3xl">
                        {Math.round(ispu)}
                      </p>
                      <CategoryChip category={category} />
                    </div>
                    <p className="mt-2 text-[10px] leading-snug text-white/50">
                      {KABUT_TEXT.pm25Equal(pm25FromIspu(ispu))}
                    </p>
                    <IspuScale ispu={ispu} />
                  </section>
                )}
                {shown("advice") && (
                  <section data-guide="advice" className={`${CARD} stage-in`}>
                    <p className={EYEBROW}>{KABUT_TEXT.advice}</p>
                    <p className="mt-1.5 text-[10px] uppercase tracking-[0.12em] text-white/40">
                      {KABUT_TEXT.everyone}
                    </p>
                    <p className="text-[12px] leading-snug text-white/90">
                      {CATEGORY_ADVICE[category].everyone}
                    </p>
                    <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-white/40">
                      {KABUT_TEXT.sensitive}
                    </p>
                    <p className="text-[12px] leading-snug text-white/75">
                      {CATEGORY_ADVICE[category].sensitive}
                    </p>
                  </section>
                )}
              </>
            )}

            {act === 2 && (
              <>
                {shown("results") && (
                  <section data-guide="results" className={`${CARD} stage-in`}>
                    <p className={EYEBROW}>{KABUT_TEXT.results}</p>
                    <div className="mt-2.5 space-y-1.5">
                      {MASK_OPTIONS.map((m) => {
                        const v = results.get(m);
                        return (
                          <div
                            key={m}
                            className="flex items-center gap-2 text-[11px]"
                          >
                            <span className="w-24 shrink-0 text-white/75">
                              {MASK_LABEL[m]}
                            </span>
                            <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                              {v !== undefined && (
                                <span
                                  className="chart-bar absolute inset-y-0 left-0 rounded-full bg-[#e8b98a]"
                                  style={{ width: `${v}%` }}
                                />
                              )}
                            </span>
                            <span className="w-8 shrink-0 text-right tabular-nums text-white">
                              {v ?? "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
                {shown("why") && (
                  <section data-guide="why" className={`${CARD} stage-in`}>
                    <p className={EYEBROW}>{KABUT_TEXT.why}</p>
                    {lastMask && lastFates && !breathing ? (
                      <>
                        <p className="mt-1.5 text-[12px] leading-snug text-white/85">
                          {explainMask(lastMask)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-white/10 pt-2 text-[11px] tabular-nums">
                          <span className="text-[#ff8a3d]">
                            {KABUT_TEXT.viaGap(
                              lastFates.filter((f) => f === "celah").length,
                            )}
                          </span>
                          <span className="text-[#e8b98a]">
                            {KABUT_TEXT.viaFabric(
                              lastFates.filter((f) => f === "kain").length,
                            )}
                          </span>
                          <span className="text-white/55">
                            {KABUT_TEXT.stopped(
                              lastFates.filter((f) => f === "tertahan").length,
                            )}
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="mt-1.5 text-[12px] leading-snug text-white/70">
                        {breathing
                          ? KABUT_TEXT.breathing
                          : KABUT_TEXT.breatheInvite}
                      </p>
                    )}
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
            total={guideSteps.length}
            onAuto={
              level < guideSteps.length - 1 && !step.done ? ackStep : undefined
            }
            delayMs={level === 0 ? 1500 : 350}
          />
        }
      />
    </>
  );
}

const CARD =
  "rounded-2xl border border-white/10 bg-[#0a0d0f]/55 p-3.5 [@media(max-height:820px)]:p-3 shadow-lg shadow-black/20 [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]";
const EYEBROW =
  "text-[10px] font-medium uppercase tracking-[0.18em] text-white/45";
const LABEL =
  "text-[11px] font-medium uppercase tracking-[0.18em] text-white/45";
const INVITE =
  "rounded-2xl border border-dashed border-white/20 bg-black/15 px-3.5 py-3 text-[11px] leading-snug text-white/65 [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]";

/** Lencana kategori ISPU dengan status warnanya. */
function CategoryChip({ category }: { category: IspuCategory }) {
  const color = CATEGORY_COLOR[category];
  const dark = category === "berbahaya";
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{
        color: dark ? "#fff" : color,
        background: dark ? "#000" : `${color}26`,
        boxShadow: dark ? "inset 0 0 0 1px rgba(255,255,255,0.35)" : undefined,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: dark ? "#fff" : color }}
      />
      {CATEGORY_LABEL[category]}
    </span>
  );
}

/** Lima pita kategori ISPU dengan penanda nilai sekarang. */
function IspuScale({ ispu }: { ispu: number }) {
  const bands: [IspuCategory, number, number][] = [
    ["baik", 0, 50],
    ["sedang", 50, 100],
    ["tidakSehat", 100, 200],
    ["sangatTidakSehat", 200, 300],
    ["berbahaya", 300, ISPU_MAX],
  ];
  return (
    <div className="relative mt-3">
      <div className="flex h-1.5 overflow-hidden rounded-full">
        {bands.map(([c, a, b]) => (
          <span
            key={c}
            style={{
              flex: b - a,
              background: c === "berbahaya" ? "#000" : CATEGORY_COLOR[c],
              boxShadow:
                c === "berbahaya"
                  ? "inset 0 0 0 1px rgba(255,255,255,0.3)"
                  : undefined,
            }}
          />
        ))}
      </div>
      <span
        className="absolute -top-1 h-3.5 w-[3px] -translate-x-1/2 rounded-full bg-white shadow"
        style={{ left: `${(Math.min(ispu, ISPU_MAX) / ISPU_MAX) * 100}%` }}
      />
    </div>
  );
}

/** Penggeser ISPU dengan pita kategori sebagai lintasannya. */
function IspuTrack({
  ispu,
  onChange,
}: {
  ispu: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="relative mt-1">
      <SliderTrack
        tone="neutral"
        pct={(ispu / ISPU_MAX) * 100}
        ticks={[50, 100, 200, 300].map((v) => (v / ISPU_MAX) * 100)}
      >
        <input
          id="kabut-ispu"
          type="range"
          min={0}
          max={ISPU_MAX}
          step={1}
          value={Math.round(ispu)}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-valuetext={`ISPU ${Math.round(ispu)}, ${CATEGORY_LABEL[ispuCategory(ispu)]}`}
          className="water-slider relative z-10 w-full"
        />
      </SliderTrack>
    </div>
  );
}

/** Ukuran sebenarnya tiap benda dan apakah sudah terlihat di lensa. */
function SizeList({
  zoom,
  compact = false,
}: {
  zoom: number;
  compact?: boolean;
}) {
  // Sama dengan MicroscopeView: rambut selebar ±55 % lensa pada REVEAL_ZOOM.
  const seen = (um: number) =>
    (um / HAIR_UM) * (zoom / REVEAL_ZOOM) * 0.55 * 600 >= 2.5;
  const rows: [string, number][] = [
    [KABUT_TEXT.hair, HAIR_UM],
    [KABUT_TEXT.pm10, PM10_UM],
    [KABUT_TEXT.pm25, PM25_UM],
  ];
  return (
    <div
      className={
        compact
          ? "mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]"
          : "space-y-1.5 text-[12px]"
      }
    >
      {rows.map(([label, um]) => (
        <div key={label} className="flex items-center justify-between gap-2">
          <span className="text-white/80">{label}</span>
          <span
            className={`tabular-nums ${seen(um) ? "text-white" : "text-white/35"}`}
          >
            {KABUT_TEXT.um(um)}
            {!compact && !seen(um) && (
              <span className="ml-1.5 text-[10px] text-white/35">
                {KABUT_TEXT.tooSmall}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Kartu penjelasan benda di mikroskop yang diklik. */
function ScopeCard({
  part,
  onClose,
}: {
  part: ScopePart;
  onClose: () => void;
}) {
  const { title, body } = scopeText(part);
  return (
    <div
      key={part}
      role="dialog"
      aria-label={title}
      className={`sekitarmu-rise ${CARD} bg-[#0a0d0f]/70`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-playfair text-lg italic leading-tight text-white">
          {title}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label={KABUT_TEXT.close}
          className="-mr-1 -mt-1 cursor-pointer rounded-full p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
      <p className="mt-1.5 text-[12px] leading-snug text-white/80">{body}</p>
    </div>
  );
}
