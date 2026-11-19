"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import dynamic from "next/dynamic";
import ActModuleShell from "@/components/modul/shared/ActModuleShell";
import GuideLayer from "@/components/modul/shared/GuideLayer";
import type { Quality } from "@/components/modul/shared/scene/dioramaConstants";
import {
  AUGUST_DRY_END_DAY,
  AUGUST_START_CM,
  MAX_DRY_DAYS,
  MUSIM_ACTS,
  MUSIM_HOOK,
  MUSIM_TEXT,
  STAGE_COLOR,
  STAGE_LABEL,
  FLOOR_FROM,
  MUSIM_GUIDE,
  explainDay,
  guideLevel,
  inspectText,
  type InspectPart,
} from "@/config/modul/musim-api";
import {
  BURN_CM,
  DAYS_PER_YEAR,
  MONTH_SHORT,
  MONTH_START_DAY,
  dasarianOfDay,
  dateOfDay,
  depthAfterDryDays,
  fireLevel,
  fireStage,
  rainfall,
  simulateYear,
  type FireStage,
  type YearKind,
} from "@/lib/model/fireSeason";
import SeasonChart from "./SeasonChart";

// Adegan 3D hanya dimuat di peramban (WebGL), sama seperti modul 3D lainnya.
const MusimScene = dynamic(() => import("./scene/MusimScene"), { ssr: false });

/** Hari yang dihitung "sudah sampai Desember" untuk tugas babak 01 dan 03. */
const DECEMBER = MONTH_START_DAY[11];

/** Hari awal kalender saat babak dibuka: 1 Januari. */
const START_DAY = 0;

/**
 * Modul 05 — Musim Api.
 *
 * Satu petak gambut di pinggir Pontianak sepanjang satu tahun. Pembaca
 * memutar kalender dan melihat muka air turun dua kali setahun, memperpanjang
 * kemarau Agustus sampai air melewati ambang 40 dan 60 cm yang diukur di Kubu
 * Raya, lalu membandingkan tahun biasa dengan tahun El Niño. Sumbernya ada di
 * docs/md/acuan-modul-musim-api.md; angkanya dihitung lib/model/fireSeason.ts.
 */
export default function MusimApiModule() {
  const [act, setAct] = useState(0);
  const [day, setDay] = useState(START_DAY);
  const [maxDay, setMaxDay] = useState(START_DAY);
  const [dryDays, setDryDays] = useState(0);
  const [kind, setKind] = useState<YearKind>("normal");
  // Hari terjauh yang sudah dilihat pada tahun El Niño (babak 03).
  const [elninoMaxDay, setElninoMaxDay] = useState(-1);
  // Bagian bongkahan yang sedang dijelaskan setelah diklik.
  const [inspect, setInspect] = useState<InspectPart | null>(null);
  // Tuntunan: hari tanpa hujan terjauh (babak 02), babak yang sudah pernah
  // mengeklik bongkahan, dan arahan "Perhatikan" yang sudah lewat per babak.
  const [maxDryDays, setMaxDryDays] = useState(0);
  const [inspectedActs, setInspectedActs] = useState<readonly boolean[]>([
    false,
    false,
    false,
  ]);
  const [acked, setAcked] = useState<readonly number[]>([0, 0, 0]);
  // Mutu grafis: rendah di ponsel sejak awal, dan turun sendiri bila
  // PerformanceGuard mendapati perangkat kewalahan.
  const [quality, setQuality] = useState<Quality>("high");
  const handleOverload = useCallback(() => setQuality("low"), []);
  useEffect(() => {
    const low =
      window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hanya sekali saat dipasang, membaca perangkat
    if (low) setQuality("low");
  }, []);

  const normal = useMemo(() => simulateYear("normal"), []);
  const elnino = useMemo(() => simulateYear("elnino"), []);

  // Keadaan hari yang sedang dilihat. Babak 02 memakai kemarau yang
  // diperpanjang dari 20 Agustus tahun biasa; babak lain membaca kalender.
  const year = act === 2 && kind === "elnino" ? elnino : normal;
  const extended = act === 1;
  const depthCm = extended
    ? depthAfterDryDays(AUGUST_START_CM, dryDays)
    : year[day];
  const viewDay = extended
    ? Math.min(DAYS_PER_YEAR - 1, AUGUST_DRY_END_DAY + dryDays)
    : day;
  const rainMmDay = extended
    ? 0
    : rainfall(act === 2 ? kind : "normal", dasarianOfDay(day));
  const stage = fireStage(depthCm);
  const fire = fireLevel(depthCm);
  const date = dateOfDay(viewDay);

  const actDone = [
    maxDay >= DECEMBER,
    depthAfterDryDays(AUGUST_START_CM, dryDays) >= BURN_CM,
    elninoMaxDay >= DECEMBER,
  ];
  const progress = [
    `Sampai ${MUSIM_TEXT.date(dateOfDay(maxDay).date, MONTH_SHORT[dateOfDay(maxDay).month])}`,
    `${MUSIM_TEXT.dryDaysValue(dryDays)} · ${MUSIM_TEXT.depthValue(depthCm)}`,
    elninoMaxDay < 0
      ? "Tahun El Niño belum dipilih"
      : `Tahun El Niño sampai ${MUSIM_TEXT.date(dateOfDay(elninoMaxDay).date, MONTH_SHORT[dateOfDay(elninoMaxDay).month])}`,
  ][act];
  const guide = (forAct: number) =>
    act === forAct && !actDone[act] ? "guide-ring" : "";

  const reset = () => {
    setAct(0);
    setDay(START_DAY);
    setMaxDay(START_DAY);
    setDryDays(0);
    setKind("normal");
    setElninoMaxDay(-1);
    setInspect(null);
    setMaxDryDays(0);
    setInspectedActs([false, false, false]);
    setAcked([0, 0, 0]);
  };

  // Arahan yang sedang aktif dan lantai kolom kanan yang sudah boleh tampil.
  const guideSteps = MUSIM_GUIDE[act];
  const level = guideLevel(
    act,
    {
      maxDay,
      maxDryDays,
      maxDepthCm: depthAfterDryDays(AUGUST_START_CM, maxDryDays),
      kind,
      elninoMaxDay,
      inspected: inspectedActs[act],
    },
    acked[act],
  );
  const step = guideSteps[level];
  const floorShown = (f: keyof (typeof FLOOR_FROM)[number]) =>
    level >= FLOOR_FROM[act][f];
  const ackStep = () =>
    setAcked((a) => a.map((v, i) => (i === act ? Math.max(v, level + 1) : v)));
  const handleInspect = (part: InspectPart) => {
    setInspect(part);
    setInspectedActs((a) => a.map((v, i) => (i === act ? true : v)));
  };

  const moveDay = (v: number) => {
    setDay(v);
    if (act === 0) setMaxDay((m) => Math.max(m, v));
    if (act === 2 && kind === "elnino") setElninoMaxDay((m) => Math.max(m, v));
  };

  const chooseKind = (k: YearKind) => {
    setKind(k);
    if (k === "elnino") setElninoMaxDay((m) => Math.max(m, day));
  };

  return (
    <ActModuleShell
      href="/modul/musim-api"
      hook={MUSIM_HOOK}
      acts={MUSIM_ACTS}
      act={act}
      onAct={(i) => {
        setAct(i);
        // Tiap babak mulai dari awal kalender, kecuali babak 02 yang
        // berangkat dari akhir kemarau Agustus.
        setDay(START_DAY);
        if (i !== 2) setKind("normal");
        setInspect(null);
      }}
      actDone={actDone}
      progress={progress}
      onReset={reset}
      background="#10120f"
      figure={
        <>
          <MusimScene
            depthCm={depthCm}
            rainMmDay={rainMmDay}
            fire={fire}
            quality={quality}
            onOverload={handleOverload}
            inspect={inspect}
            onInspect={handleInspect}
          />
          {/* Kartu penjelasan di atas gambar, hanya di layar < 1024 px; di
              layar lebih lebar kartunya ada di kolom kanan. */}
          {inspect && (
            <div className="absolute left-0 right-0 top-0 z-20 md:right-auto md:top-6 md:w-[300px] lg:hidden">
              <InspectCard
                part={inspect}
                depthCm={depthCm}
                onClose={() => setInspect(null)}
              />
            </div>
          )}
          <p className="pointer-events-none absolute inset-x-0 top-0 hidden text-right text-[10px] text-white/50 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)] sm:block">
            {act === 2 ? MUSIM_TEXT.elninoNote : MUSIM_TEXT.scaleNote}
          </p>
        </>
      }
      controls={
        <div className={`-mx-2 rounded-2xl px-2 py-1.5 ${guide(act)}`}>
          {act === 2 && (
            <div
              role="radiogroup"
              aria-label="Jenis tahun"
              data-guide="yearToggle"
              className="mb-2.5 flex gap-2"
            >
              {(["normal", "elnino"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={kind === k}
                  onClick={() => chooseKind(k)}
                  className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    kind === k
                      ? k === "elnino"
                        ? "border-[#ff8a4d] bg-[#ff8a4d]/20 text-white"
                        : "border-[#8fd8ff] bg-[#8fd8ff]/15 text-white"
                      : "border-white/20 text-white/75 hover:border-white/40"
                  }`}
                >
                  {k === "elnino"
                    ? MUSIM_TEXT.elninoYear
                    : MUSIM_TEXT.normalYear}
                </button>
              ))}
            </div>
          )}

          {/* Penggeser: kalender di babak 01 dan 03, hari tanpa hujan di babak 02. */}
          <div data-guide={extended ? "dryDays" : "calendar"}>
            <div className="flex items-baseline justify-between gap-3">
              <label
                htmlFor="musim-slider"
                className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45"
              >
                {extended ? MUSIM_TEXT.dryDays : MUSIM_TEXT.calendar}
              </label>
              <span className="text-[11px] tabular-nums text-white/75">
                {extended
                  ? MUSIM_TEXT.dryDaysValue(dryDays)
                  : MUSIM_TEXT.date(date.date, MONTH_SHORT[date.month])}
              </span>
            </div>
            {extended ? (
              <input
                id="musim-slider"
                type="range"
                min={0}
                max={MAX_DRY_DAYS}
                step={1}
                value={dryDays}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setDryDays(v);
                  setMaxDryDays((m) => Math.max(m, v));
                }}
                aria-valuetext={`${MUSIM_TEXT.dryDaysValue(dryDays)}, ${MUSIM_TEXT.depth} ${MUSIM_TEXT.depthValue(depthCm)}, ${STAGE_LABEL[stage]}`}
                className="water-slider w-full"
              />
            ) : (
              <input
                id="musim-slider"
                type="range"
                min={0}
                max={DAYS_PER_YEAR - 1}
                step={1}
                value={day}
                onChange={(e) => moveDay(Number(e.target.value))}
                aria-valuetext={`${MUSIM_TEXT.date(date.date, MONTH_SHORT[date.month])}, ${MUSIM_TEXT.depth} ${MUSIM_TEXT.depthValue(depthCm)}, ${STAGE_LABEL[stage]}`}
                className="water-slider w-full"
              />
            )}
            {/* Kalender bulan di bawah penggeser, supaya posisinya terbaca. */}
            {!extended && (
              <div
                className="mt-0.5 flex justify-between text-[9px] uppercase tracking-[0.08em] text-white/35"
                aria-hidden
              >
                {MONTH_SHORT.filter((_, m) => m % 2 === 0).map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
            )}
          </div>

          {/* Layar < 1024 px tidak punya kolom kanan: pembacaan hari ini,
              grafik, dan penjelasannya diringkas di sini. */}
          <div className="lg:hidden">
            <div
              data-guide="today"
              className="mt-2.5 flex items-center justify-between gap-3"
            >
              <p className="font-playfair text-2xl italic leading-none tabular-nums text-white">
                {MUSIM_TEXT.depthValue(depthCm)}
                <span className="ml-1.5 font-sans text-[10px] not-italic uppercase tracking-[0.12em] text-white/40">
                  {MUSIM_TEXT.depth}
                </span>
              </p>
              <StageChip stage={stage} />
            </div>
            <div data-guide="chart" className="mt-2 hidden [@media(min-height:900px)]:sm:block">
              <SeasonChart
                revealDelay={1.5}
                kind={act === 2 ? kind : "normal"}
                normal={normal}
                elnino={act === 2 && kind === "elnino" ? elnino : undefined}
                day={viewDay}
                extension={
                  extended
                    ? {
                        from: AUGUST_DRY_END_DAY,
                        days: dryDays,
                        fromCm: AUGUST_START_CM,
                        toCm: depthCm,
                      }
                    : undefined
                }
              />
            </div>
            <p
              data-guide="why"
              aria-live="polite"
              className="mt-2 rounded-xl bg-white/[0.07] px-3 py-2 text-[12px] leading-snug text-white/80"
            >
              {explainDay({ depthCm, rainMmDay, dryRun: extended, dryDays })}
            </p>
          </div>
        </div>
      }
      aside={
        <>
          {/* Lantai kolom kanan muncul satu per satu, masing-masing saat
              arahannya tiba (FLOOR_FROM), dengan animasi naik. */}
          {/* Lantai 1: keadaan hari ini. */}
          {floorShown("today") && (
            <section data-guide="today" className={`${CARD} stage-in`}>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">
                {MUSIM_TEXT.today(date.date, MONTH_SHORT[date.month])}
              </p>
              <p className="mt-1.5 font-playfair text-4xl italic leading-none tabular-nums text-white [@media(max-height:820px)]:mt-1 [@media(max-height:820px)]:text-3xl">
                {MUSIM_TEXT.depthValue(depthCm)}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/40 [@media(max-height:820px)]:hidden">
                {MUSIM_TEXT.depthBelow}
              </p>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-2.5 [@media(max-height:820px)]:mt-2 [@media(max-height:820px)]:pt-2">
                <span className="text-[11px] tabular-nums text-[#9fd3f0]">
                  {MUSIM_TEXT.rain}:{" "}
                  {rainMmDay > 0
                    ? MUSIM_TEXT.rainValue(rainMmDay)
                    : MUSIM_TEXT.noRain}
                </span>
                <StageChip stage={stage} />
              </div>
            </section>
          )}

          {/* Lantai 2: setahun dalam satu gambar. */}
          {floorShown("chart") && (
            <section data-guide="chart" className={`${CARD} stage-in`}>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-white/45 [@media(max-height:820px)]:mb-1.5">
                {MUSIM_TEXT.yearChart}
              </p>
              <SeasonChart
                revealDelay={0.35}
                kind={act === 2 ? kind : "normal"}
                normal={normal}
                elnino={act === 2 && kind === "elnino" ? elnino : undefined}
                day={viewDay}
                extension={
                  extended
                    ? {
                        from: AUGUST_DRY_END_DAY,
                        days: dryDays,
                        fromCm: AUGUST_START_CM,
                        toCm: depthCm,
                      }
                    : undefined
                }
              />
            </section>
          )}

          {/* Lantai 3: mengapa begitu, berubah mengikuti setiap geseran. */}
          {floorShown("why") && (
            <section data-guide="why" className={`${CARD} stage-in`}>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">
                {MUSIM_TEXT.why}
              </p>
              <p
                aria-live="polite"
                className="mt-1.5 text-[12px] leading-snug text-white/85"
              >
                {explainDay({ depthCm, rainMmDay, dryRun: extended, dryDays })}
              </p>
            </section>
          )}

          {/* Lantai 4: penjelasan bagian yang diklik, atau ajakan mengekliknya. */}
          {inspect ? (
            <InspectCard
              part={inspect}
              depthCm={depthCm}
              onClose={() => setInspect(null)}
            />
          ) : (
            floorShown("invite") && (
              <p className="stage-in rounded-2xl border border-dashed border-white/20 bg-black/15 px-3.5 py-3 text-[11px] leading-snug text-white/65 [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">
                {MUSIM_TEXT.clickInvite}
              </p>
            )
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
  );
}

/** Gaya kartu kolom kanan, sama untuk tiap lantai. */
const CARD =
  "rounded-2xl border border-white/10 bg-[#0a0d0f]/50 p-3.5 [@media(max-height:820px)]:p-3 shadow-lg shadow-black/20 [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]";

/** Penanda golongan bahaya hari ini. */
function StageChip({ stage }: { stage: FireStage }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{
        color: STAGE_COLOR[stage],
        background: `${STAGE_COLOR[stage]}22`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: STAGE_COLOR[stage] }}
      />
      {STAGE_LABEL[stage]}
    </span>
  );
}

/**
 * Kartu penjelasan bagian bongkahan yang diklik. Teksnya mengikuti hari yang
 * sedang dilihat, jadi tetap benar saat kalender digeser.
 */
function InspectCard({
  part,
  depthCm,
  onClose,
}: {
  part: InspectPart;
  depthCm: number;
  onClose: () => void;
}) {
  const { title, body } = inspectText(part, depthCm);
  return (
    <div
      key={part}
      role="dialog"
      aria-label={title}
      className={`sekitarmu-rise ${CARD} bg-[#0a0d0f]/65`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-playfair text-lg italic leading-tight text-white">
          {title}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label={MUSIM_TEXT.close}
          className="-mr-1 -mt-1 cursor-pointer rounded-full p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
      <p className="mt-1.5 text-[12px] leading-snug text-white/80">{body}</p>
      <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-white/40">
        {MUSIM_TEXT.inspectToday(depthCm)}
      </p>
    </div>
  );
}
