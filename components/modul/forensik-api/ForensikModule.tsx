"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import dynamic from "next/dynamic";
import ActModuleShell from "@/components/modul/shared/ActModuleShell";
import ModuleAudio from "@/components/modul/shared/ModuleAudio";
import SliderTrack from "@/components/modul/shared/SliderTrack";
import GuideLayer from "@/components/modul/shared/GuideLayer";
import type { Quality } from "@/components/modul/shared/scene/dioramaConstants";
import { forensikMix } from "@/lib/sound/soundscapes";
import {
  BURNS,
  CASE_IGNITION,
  IGNITION_SHARE,
  burnTally,
  dropSpark,
  landAt,
  type Land,
  type SparkResult,
  type Wetness,
  type Wind,
} from "@/lib/model/ignition";
import {
  CASE_FIRE,
  CASE_LAST_DAY,
  FLOOR_FROM,
  FORENSIK_ACTS,
  FORENSIK_GUIDE,
  FORENSIK_HOOK,
  FORENSIK_TEXT,
  GUESS_OPTIONS,
  LAND_LABEL,
  WETNESS_LABEL,
  WIND_LABEL,
  explainSpark,
  guideLevel,
  inspectText,
  type InspectPart,
} from "@/config/modul/forensik-api";
import { burnAnimMs, fireAt } from "./fireView";
import type { BurnAnim, Drop } from "./scene/ForensikScene";

// Adegan 3D hanya dimuat di peramban (WebGL), sama seperti modul 3D lainnya.
const ForensikScene = dynamic(() => import("./scene/ForensikScene"), { ssr: false });

const WETNESS: readonly Wetness[] = ["basah", "lembap", "kering"];
const WINDS: readonly Wind[] = ["tenang", "berangin"];

/** Lama bara jatuh sampai menyentuh gambut (detik); hasilnya ditulis sesudahnya. */
const LAND_DELAY_S = 0.8;

/** Jenis lahan tempat api kasus babak 02 lahir: jawaban tebakan. */
const CASE_LAND = landAt(CASE_IGNITION.x, CASE_IGNITION.y);

/** Warna hasil satu percobaan bara. */
const RESULT_COLOR: Record<SparkResult, string> = { menyala: "#ff9a4a", padam: "#8fc7e8" };

/** Warna batang porsi titik sulut per jenis lahan. */
const SHARE_COLOR = { terbuka: "#c9ad6e", kebun: "#9cbf5a", hutan: "#4f8f57" } as const;

/**
 * Modul 06 — Forensik Api.
 *
 * Pembaca menjadi penyelidik yang menelusuri kebakaran mundur: seberapa kecil
 * percikan yang cukup (babak 01), di mana api lahir (babak 02), dan mengapa
 * api kecil bisa menjadi kebakaran hutan (babak 03). Sumbernya ada di
 * docs/md/acuan-modul/acuan-modul-forensik-api.md; angkanya dihitung
 * lib/model/ignition.ts.
 */
export default function ForensikModule() {
  const [act, setAct] = useState(0);
  // Babak 01: keadaan petak, bara terakhir, dan pasangan yang sudah dicoba.
  const [wetness, setWetness] = useState<Wetness>("basah");
  const [wind, setWind] = useState<Wind>("tenang");
  const [drop, setDrop] = useState<Drop | null>(null);
  const [trials, setTrials] = useState<ReadonlyMap<string, SparkResult>>(new Map());
  // Babak 02: tebakan, hari yang dilihat, dan hari terkecil yang pernah dicapai.
  const [guess, setGuess] = useState<Land | null>(null);
  const [day, setDay] = useState(CASE_LAST_DAY);
  const [minDay, setMinDay] = useState(CASE_LAST_DAY);
  // Babak 03: api yang sudah dinyalakan dan yang sedang dianimasikan.
  const [burnsLit, setBurnsLit] = useState(0);
  const [burnAnim, setBurnAnim] = useState<BurnAnim | null>(null);
  const [burning, setBurning] = useState(false);
  const burnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(burnTimer.current ?? undefined), []);
  // Bagian peta yang sedang dijelaskan, dan tuntunan per babak.
  const [inspect, setInspect] = useState<InspectPart | null>(null);
  const [inspectedActs, setInspectedActs] = useState<readonly boolean[]>([false, false, false]);
  const [acked, setAcked] = useState<readonly number[]>([0, 0, 0]);
  // Mutu grafis: rendah di ponsel sejak awal, dan turun sendiri bila perangkat kewalahan.
  const [quality, setQuality] = useState<Quality>("high");
  const handleOverload = useCallback(() => setQuality("low"), []);
  useEffect(() => {
    const low = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hanya sekali saat dipasang, membaca perangkat
    if (low) setQuality("low");
  }, []);

  const tried = useMemo(() => new Set(trials.keys()), [trials]);
  const caseNow = useMemo(() => fireAt(CASE_FIRE, day), [day]);
  const hotNow = [...caseNow.values()].filter((v) => v === "hot").length;
  const tally = burnTally(burnsLit);
  const lastBurn = burnsLit > 0 && !burning ? BURNS[burnsLit - 1] : null;
  const triedWetness = (w: Wetness) => [...tried].some((k) => k.startsWith(`${w}-`));

  const actDone = [
    WETNESS.every(triedWetness) && tried.has("lembap-berangin"),
    guess !== null && minDay === 0,
    burnsLit === BURNS.length && !burning,
  ];
  const progress = [
    FORENSIK_TEXT.tried(tried.size),
    `${FORENSIK_TEXT.dayValue(day)} · ${FORENSIK_TEXT.cellsBurned(caseNow.size)}`,
    FORENSIK_TEXT.tally(tally.lit, tally.out1Day, tally.escaped),
  ][act];

  const reset = () => {
    clearTimeout(burnTimer.current ?? undefined);
    setAct(0);
    setWetness("basah");
    setWind("tenang");
    setDrop(null);
    setTrials(new Map());
    setGuess(null);
    setDay(CASE_LAST_DAY);
    setMinDay(CASE_LAST_DAY);
    setBurnsLit(0);
    setBurnAnim(null);
    setBurning(false);
    setInspect(null);
    setInspectedActs([false, false, false]);
    setAcked([0, 0, 0]);
  };

  // Arahan yang sedang aktif dan kartu kolom kanan yang sudah boleh tampil.
  const guideSteps = FORENSIK_GUIDE[act];
  const level = guideLevel(act, { tried, guessed: guess !== null, minDay, burnsLit, inspected: inspectedActs[act] }, acked[act]);
  const step = guideSteps[level];
  const shown = (floor: string) => level >= ((FLOOR_FROM[act] as Record<string, number>)[floor] ?? Infinity);
  const ackStep = () => setAcked((a) => a.map((v, i) => (i === act ? Math.max(v, level + 1) : v)));

  const handleInspect = (part: InspectPart) => {
    setInspect(part);
    setInspectedActs((a) => a.map((v, i) => (i === act ? true : v)));
  };

  const chooseWetness = (w: Wetness) => {
    setWetness(w);
    setDrop(null);
  };
  const chooseWind = (w: Wind) => {
    setWind(w);
    setDrop(null);
  };
  const dropEmber = () => {
    const result = dropSpark(wetness, wind);
    setDrop((d) => ({ id: (d?.id ?? 0) + 1, result }));
    setTrials((m) => new Map(m).set(`${wetness}-${wind}`, result));
  };

  const lightBurn = () => {
    if (burning || burnsLit >= BURNS.length) return;
    const i = burnsLit;
    setBurnsLit(i + 1);
    setBurnAnim({ index: i, start: performance.now() });
    setBurning(true);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    burnTimer.current = setTimeout(() => setBurning(false), reduced ? 0 : burnAnimMs(i));
  };

  const moveDay = (v: number) => {
    setDay(v);
    setMinDay((m) => Math.min(m, v));
  };

  // Takaran api untuk suara: bara yang membara, kotak panas, atau api yang sedang menyala.
  const fireSound =
    act === 0
      ? drop?.result === "menyala"
        ? 1
        : 0
      : act === 1
        ? Math.min(1, hotNow / 12)
        : burning
          ? BURNS[burnsLit - 1]?.escaped
            ? 0.9
            : 0.35
          : 0;

  const result = drop ? (
    <p
      key={drop.id}
      aria-live="polite"
      className="stage-in mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium"
      style={{ color: RESULT_COLOR[drop.result], background: `${RESULT_COLOR[drop.result]}1f`, ["--stage-delay" as string]: `${LAND_DELAY_S}s` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: RESULT_COLOR[drop.result] }} />
      {FORENSIK_TEXT.result(drop.result)}
    </p>
  ) : null;

  const sparkWhy = drop ? explainSpark(wetness, wind, drop.result) : FORENSIK_TEXT.sparkWait;

  return (
    <>
      <ModuleAudio getMix={() => forensikMix({ act, windy: act === 0 && wind === "berangin", fire: fireSound })} />
      <ActModuleShell
        href="/modul/forensik-api"
        hook={FORENSIK_HOOK}
        acts={FORENSIK_ACTS}
        act={act}
        onAct={(i) => {
          setAct(i);
          setInspect(null);
        }}
        actDone={actDone}
        progress={progress}
        onReset={reset}
        background="#10120f"
        figure={
          <>
            <ForensikScene
              act={act}
              wetness={wetness}
              wind={wind}
              drop={drop}
              day={day}
              burnsLit={burnsLit}
              burnAnim={burnAnim}
              inspect={act === 0 ? null : inspect}
              onInspect={handleInspect}
              quality={quality}
              onOverload={handleOverload}
            />
            {/* Kartu penjelasan di atas gambar, hanya di layar < 1024 px. */}
            {inspect && act > 0 && (
              <div className="absolute left-0 right-0 top-0 z-20 md:right-auto md:top-6 md:w-[300px] lg:hidden">
                <InspectCard part={inspect} onClose={() => setInspect(null)} />
              </div>
            )}
            <p className="pointer-events-none absolute inset-x-0 top-0 hidden text-right text-[10px] text-white/50 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)] sm:block">
              {act === 0 ? FORENSIK_TEXT.plotNote : `${FORENSIK_TEXT.cellScale} · ${FORENSIK_TEXT.illustrative}`}
            </p>
          </>
        }
        controls={
          <div className="-mx-2 rounded-2xl px-2 py-1.5">
            {act === 0 && (
              <>
                <ChoiceRow label={FORENSIK_TEXT.wetness} guide="wetness" options={WETNESS} labels={WETNESS_LABEL} value={wetness} onChange={chooseWetness} />
                <ChoiceRow label={FORENSIK_TEXT.wind} guide="wind" options={WINDS} labels={WIND_LABEL} value={wind} onChange={chooseWind} />
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3">
                  <button type="button" data-guide="drop" onClick={dropEmber} className="btn-mono is-on">
                    {drop ? FORENSIK_TEXT.again : FORENSIK_TEXT.drop}
                  </button>
                  {result}
                </div>
                {/* Layar < 1024 px tidak punya kolom kanan: catatan dan alasannya diringkas di sini. */}
                <div className="lg:hidden">
                  <div data-guide="table" className="mt-2">
                    <TrialDots trials={trials} />
                  </div>
                  {drop && (
                    <p data-guide="why" aria-live="polite" className="mt-2 rounded-xl bg-white/[0.07] px-3 py-2 text-[12px] leading-snug text-white/80">
                      {sparkWhy}
                    </p>
                  )}
                </div>
              </>
            )}

            {act === 1 && (
              <>
                <div data-guide="guess">
                  {guess === null ? (
                    <>
                      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">{FORENSIK_TEXT.guessTitle}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {GUESS_OPTIONS.map((l) => (
                          <button key={l} type="button" onClick={() => setGuess(l)} className="btn-mono">
                            {LAND_LABEL[l]}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p aria-live="polite" className="text-[12px] leading-snug text-white/80">
                      {minDay > 0 ? (
                        FORENSIK_TEXT.guessLocked(LAND_LABEL[guess])
                      ) : (
                        <span className="stage-in inline-block">
                          <span className="font-medium text-white">
                            {guess === CASE_LAND ? FORENSIK_TEXT.guessRight : FORENSIK_TEXT.guessWrong(LAND_LABEL[guess])}
                          </span>{" "}
                          {FORENSIK_TEXT.caseFound}
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div data-guide="rewind" className={`mt-3 transition-opacity ${guess === null ? "pointer-events-none opacity-35" : ""}`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <label htmlFor="forensik-rewind" className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
                      ← {FORENSIK_TEXT.rewind}
                    </label>
                    <span className="text-[11px] tabular-nums text-white/75">{FORENSIK_TEXT.dayValue(day)}</span>
                  </div>
                  <SliderTrack tone="neutral" pct={(day / CASE_LAST_DAY) * 100} ticks={[]}>
                    <input
                      id="forensik-rewind"
                      type="range"
                      min={0}
                      max={CASE_LAST_DAY}
                      step={1}
                      value={day}
                      disabled={guess === null}
                      onChange={(e) => moveDay(Number(e.target.value))}
                      aria-valuetext={`${FORENSIK_TEXT.dayValue(day)}, ${FORENSIK_TEXT.cellsBurned(caseNow.size)}`}
                      className="water-slider relative z-10 w-full"
                    />
                  </SliderTrack>
                </div>
                <div className="lg:hidden">
                  <p className="mt-2 text-[11px] tabular-nums text-white/60">{FORENSIK_TEXT.cellsBurned(caseNow.size)}</p>
                  {shown("share") && (
                    <p data-guide="share" className="stage-in mt-1.5 text-[11px] leading-snug text-white/75">
                      {FORENSIK_TEXT.shareShort}
                    </p>
                  )}
                </div>
              </>
            )}

            {act === 2 && (
              <>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <button
                    type="button"
                    data-guide="burn"
                    onClick={lightBurn}
                    disabled={burning || burnsLit >= BURNS.length}
                    className="btn-mono is-on"
                  >
                    {burnsLit >= BURNS.length ? FORENSIK_TEXT.allBurnt : FORENSIK_TEXT.burn}
                  </button>
                  <span className="text-[11px] tabular-nums text-white/55">
                    {FORENSIK_TEXT.burnNo(Math.min(burnsLit + (burning ? 0 : 1), BURNS.length), BURNS.length)}
                  </span>
                </div>
                <p aria-live="polite" className="mt-2 min-h-[1.25rem] text-[12px] leading-snug text-white/80">
                  {burning ? (
                    FORENSIK_TEXT.burning
                  ) : lastBurn ? (
                    <span className="stage-in inline-block" style={{ color: lastBurn.escaped ? "#ff7a3d" : undefined }}>
                      {FORENSIK_TEXT.burnNo(burnsLit, BURNS.length)}:{" "}
                      {lastBurn.escaped ? FORENSIK_TEXT.burnEscaped(lastBurn.days) : FORENSIK_TEXT.burnOut(lastBurn.days)}
                    </span>
                  ) : null}
                </p>
                <div className="lg:hidden">
                  <div data-guide="tally" className="mt-2">
                    <BurnDots lit={burnsLit} burning={burning} />
                  </div>
                  {shown("why") && (
                    <p data-guide="why" className="stage-in mt-2 rounded-xl bg-white/[0.07] px-3 py-2 text-[12px] leading-snug text-white/80">
                      {FORENSIK_TEXT.burnWhy}
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
                {shown("table") && (
                  <section data-guide="table" className={`${CARD} stage-in`}>
                    <p className={EYEBROW}>{FORENSIK_TEXT.table}</p>
                    <div className="mt-2">
                      <TrialGrid trials={trials} current={`${wetness}-${wind}`} />
                    </div>
                  </section>
                )}
                {shown("why") && (
                  <section data-guide="why" className={`${CARD} stage-in`}>
                    <p className={EYEBROW}>{FORENSIK_TEXT.why}</p>
                    <p aria-live="polite" className="mt-1.5 text-[12px] leading-snug text-white/85">
                      {sparkWhy}
                    </p>
                  </section>
                )}
              </>
            )}

            {act === 1 && (
              <>
                {shown("readout") && (
                  <section className={`${CARD} stage-in`}>
                    <p className={EYEBROW}>{FORENSIK_TEXT.dayValue(day)}</p>
                    <p className="mt-1.5 font-playfair text-4xl italic leading-none tabular-nums text-white [@media(max-height:820px)]:text-3xl">
                      {caseNow.size} km²
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/40">{FORENSIK_TEXT.burnedSoFar}</p>
                    <div className="mt-3 flex gap-4 border-t border-white/10 pt-2.5 text-[11px] text-white/70">
                      <Legend color="#ff6f1c" glow label={FORENSIK_TEXT.hot} />
                      <Legend color="#2a221c" label={FORENSIK_TEXT.scar} />
                    </div>
                  </section>
                )}
                {shown("share") && (
                  <section data-guide="share" className={`${CARD} stage-in`}>
                    <p className={EYEBROW}>{FORENSIK_TEXT.share}</p>
                    <div className="mt-2.5">
                      <ShareBars />
                    </div>
                  </section>
                )}
                {inspect ? (
                  <InspectCard part={inspect} onClose={() => setInspect(null)} />
                ) : (
                  shown("invite") && <p className={`${INVITE} stage-in`}>{FORENSIK_TEXT.clickInvite}</p>
                )}
              </>
            )}

            {act === 2 && (
              <>
                {shown("tally") && (
                  <section data-guide="tally" className={`${CARD} stage-in`}>
                    <p className={EYEBROW}>{FORENSIK_TEXT.burnsTitle}</p>
                    <div className="mt-2.5">
                      <BurnDots lit={burnsLit} burning={burning} />
                    </div>
                    <p className="mt-2 text-[11px] tabular-nums text-white/70">{FORENSIK_TEXT.tally(tally.lit, tally.out1Day, tally.escaped)}</p>
                  </section>
                )}
                {shown("why") && (
                  <section data-guide="why" className={`${CARD} stage-in`}>
                    <p className={EYEBROW}>{FORENSIK_TEXT.why}</p>
                    <p className="mt-1.5 text-[12px] leading-snug text-white/85">{FORENSIK_TEXT.burnWhy}</p>
                    <p className="mt-2 border-t border-white/10 pt-2 text-[11px] leading-snug text-white/65">{FORENSIK_TEXT.forestFromOpen}</p>
                  </section>
                )}
                {inspect && <InspectCard part={inspect} onClose={() => setInspect(null)} />}
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
            onAuto={level < guideSteps.length - 1 && !step.done ? ackStep : undefined}
            // Arahan pertama tiap babak menunggu penjelasan babaknya tampil dulu.
            delayMs={level === 0 ? 1500 : 350}
          />
        }
      />
    </>
  );
}

/** Gaya kartu kolom kanan, sama dengan modul lain. */
const CARD =
  "rounded-2xl border border-white/10 bg-[#0a0d0f]/50 p-3.5 [@media(max-height:820px)]:p-3 shadow-lg shadow-black/20 [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]";
const EYEBROW = "text-[10px] font-medium uppercase tracking-[0.18em] text-white/45";
const INVITE =
  "rounded-2xl border border-dashed border-white/20 bg-black/15 px-3.5 py-3 text-[11px] leading-snug text-white/65 [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]";

/** Satu baris pilihan (keadaan gambut atau angin). */
function ChoiceRow<T extends string>({
  label,
  guide,
  options,
  labels,
  value,
  onChange,
}: {
  label: string;
  guide: string;
  options: readonly T[];
  labels: Record<T, string>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div data-guide={guide} className="mb-2 sm:mb-2.5">
      {/* Di ponsel judul baris disembunyikan: pilihannya sudah menjelaskan diri, dan petak gambut perlu ruang. */}
      <p className="mb-1.5 hidden text-[11px] font-medium uppercase tracking-[0.18em] text-white/45 sm:block">{label}</p>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o} type="button" role="radio" aria-checked={value === o} onClick={() => onChange(o)} className="btn-mono">
            {labels[o]}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Catatan percobaan babak 01: tiga keadaan gambut × dua angin. Pasangan yang
 * sedang dipilih diberi bingkai, supaya pembaca tahu baris mana yang diisi.
 */
function TrialGrid({ trials, current }: { trials: ReadonlyMap<string, SparkResult>; current: string }) {
  return (
    <table className="w-full table-fixed border-separate border-spacing-1 text-left text-[11px]">
      <thead>
        <tr className="text-[10px] uppercase tracking-[0.12em] text-white/40">
          <th className="w-[30%] font-medium" />
          {WINDS.map((w) => (
            <th key={w} className="font-medium">
              {WIND_LABEL[w]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {WETNESS.map((we) => (
          <tr key={we}>
            <th className="font-medium text-white/70">{WETNESS_LABEL[we]}</th>
            {WINDS.map((wi) => {
              const r = trials.get(`${we}-${wi}`);
              const isNow = current === `${we}-${wi}`;
              return (
                <td
                  key={wi}
                  className={`rounded-lg px-2 py-1.5 ${isNow ? "ring-1 ring-white/45" : ""}`}
                  style={{ background: r ? `${RESULT_COLOR[r]}1c` : "rgb(255 255 255 / 0.04)", color: r ? RESULT_COLOR[r] : "rgb(255 255 255 / 0.35)" }}
                >
                  {r ? (r === "menyala" ? "Tersulut" : "Padam") : FORENSIK_TEXT.untried}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Catatan percobaan versi ponsel: satu baris, tiap keadaan gambut dengan dua
 * titik (tenang, berangin) berwarna hasilnya.
 */
function TrialDots({ trials }: { trials: ReadonlyMap<string, SparkResult> }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/70" aria-label={FORENSIK_TEXT.table}>
      {WETNESS.map((we) => (
        <span key={we} className="inline-flex items-center gap-1">
          {WETNESS_LABEL[we]}
          {WINDS.map((wi) => {
            const r = trials.get(`${we}-${wi}`);
            return (
              <span
                key={wi}
                title={`${WETNESS_LABEL[we]} · ${WIND_LABEL[wi]}`}
                className="h-2 w-2 rounded-full"
                style={{ background: r ? RESULT_COLOR[r] : "rgb(255 255 255 / 0.18)" }}
              />
            );
          })}
        </span>
      ))}
    </div>
  );
}

/** Porsi titik sulut per jenis lahan (Cattau dkk., 2016), sebagai batang mendatar. */
function ShareBars() {
  const rows = (["terbuka", "kebun", "hutan"] as const).map((k) => ({ k, v: IGNITION_SHARE[k] }));
  return (
    <div className="stage-kids space-y-1.5">
      {rows.map(({ k, v }) => (
        <div key={k} className="flex items-center gap-2 text-[11px]">
          <span className="w-24 shrink-0 text-white/75">{LAND_LABEL[k]}</span>
          <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
            <span className="chart-bar absolute inset-y-0 left-0 rounded-full" style={{ width: `${v}%`, background: SHARE_COLOR[k] }} />
          </span>
          <span className="w-9 shrink-0 text-right tabular-nums text-white">{Math.round(v)} %</span>
        </div>
      ))}
      <p className="pt-1 text-[10px] leading-snug text-white/50">{FORENSIK_TEXT.nearVillage}</p>
    </div>
  );
}

/** Sepuluh titik, satu per api: kosong, padam di petaknya, atau lolos ke hutan. */
function BurnDots({ lit, burning }: { lit: number; burning: boolean }) {
  return (
    <div className="flex gap-1.5" aria-hidden>
      {BURNS.map((b, i) => {
        const on = i < lit;
        const live = burning && i === lit - 1;
        const color = !on ? "rgb(255 255 255 / 0.12)" : live ? "#ffb35c" : b.escaped ? "#ff5a2a" : "#6d6259";
        return (
          <span
            key={i}
            className={`h-3 flex-1 rounded-full transition-colors duration-500 ${live ? "animate-pulse" : ""}`}
            style={{ background: color, boxShadow: on && b.escaped && !live ? "0 0 8px #ff5a2a" : undefined }}
          />
        );
      })}
    </div>
  );
}

function Legend({ color, label, glow = false }: { color: string; label: string; glow?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color, boxShadow: glow ? `0 0 6px ${color}` : undefined }} />
      {label}
    </span>
  );
}

/** Kartu penjelasan bagian peta yang diklik. */
function InspectCard({ part, onClose }: { part: InspectPart; onClose: () => void }) {
  const { title, body } = inspectText(part);
  return (
    <div key={part} role="dialog" aria-label={title} className={`sekitarmu-rise ${CARD} bg-[#0a0d0f]/65`}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-playfair text-lg italic leading-tight text-white">{title}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label={FORENSIK_TEXT.close}
          className="-mr-1 -mt-1 cursor-pointer rounded-full p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
      <p className="mt-1.5 text-[12px] leading-snug text-white/80">{body}</p>
    </div>
  );
}
