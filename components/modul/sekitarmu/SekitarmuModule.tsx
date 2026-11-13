"use client";

import { useEffect, useState } from "react";
import ActModuleShell from "@/components/modul/shared/ActModuleShell";
import {
  BORE_SITES,
  DISTRICT_PEAT,
  FIRE_SITES,
  SEKITARMU_ACTS,
  SEKITARMU_HOOK,
  SEKITARMU_TEXT,
  ZOOM_LEVELS,
} from "@/config/modul/sekitarmu";
import mapData from "@/data/sekitarmu-map.json";
import SekitarmuMap from "./SekitarmuMap";

/** Perbesaran terjauh babak 01: tingkat Kota Pontianak. */
const ZOOM_MAX = 2;

/** Tebal gambut terbesar yang digambar pada kolom bor (m). */
const CORE_MAX_M = 15;

/** Tinggi orang dewasa sebagai pembanding pada kolom bor (m). */
const PERSON_M = 1.7;

/** Jeda antarkecamatan saat hasil tebakan dibuka (ms). */
const REVEAL_STEP_MS = 320;

/** Lama mata bor turun sampai dasar gambut (ms). */
const DRILL_MS = 1600;

type Bore = (typeof BORE_SITES)[number];

/**
 * Kolom bor babak 03. Mata bor turun dari permukaan, angka kedalaman ikut
 * berjalan, dan setiap 1,7 m ditandai satu garis: pembaca menghitung sendiri
 * berapa orang dewasa yang muat ditumpuk di dalam gambut itu.
 */
function BoreCore({ bore, reducedMotion }: { bore: Bore; reducedMotion: boolean }) {
  const [drilled, setDrilled] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DRILL_MS);
      // Melambat di dasar, seperti mata bor yang makin berat ditekan.
      setDrilled(bore.maxM * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [bore, reducedMotion]);

  // Gerak dikurangi: kolom langsung penuh, tanpa mata bor yang turun.
  const depth = reducedMotion ? bore.maxM : drilled;
  const done = depth >= bore.maxM - 1e-6;
  const people = Math.floor(depth / PERSON_M);
  const pct = (m: number) => `${(m / CORE_MAX_M) * 100}%`;

  return (
    <div className="flex gap-4">
      <div className="relative h-36 w-16 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-[#6b5a45]" aria-hidden>
        <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-[#3a2a1c] to-[#2a1e14]" style={{ height: pct(depth) }} />
        {/* Garis jingga: batas tertipis yang terukur di lokasi ini. */}
        {depth >= bore.minM && (
          <div className="sekitarmu-fill absolute inset-x-0 border-t border-dashed border-[#f0a35e]" style={{ top: pct(bore.minM) }} />
        )}
        {/* Satu garis untuk setiap tinggi orang dewasa yang sudah dilewati bor. */}
        {Array.from({ length: people }, (_, k) => (
          <div key={k} className="sekitarmu-fill absolute right-0 w-3 border-t border-white/70" style={{ top: pct((k + 1) * PERSON_M) }} />
        ))}
        {/* Tinggi orang dewasa, diukur dari permukaan ke bawah. */}
        <div className="absolute right-1 top-0 w-1.5 rounded-b bg-white/85" style={{ height: pct(PERSON_M) }} />
        {/* Mata bor. */}
        {!done && (
          <div className="absolute left-1/2 h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[7px] border-x-transparent border-t-white" style={{ top: pct(depth) }} />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">{bore.title}</p>
        <p className="mt-1 font-playfair text-2xl italic leading-none text-[#f0a35e]" aria-live="polite">
          {done ? bore.display : `${depth.toFixed(1).replace(".", ",")} m`}
        </p>
        {done ? (
          <>
            <p className="sekitarmu-rise mt-1 text-[12px] font-medium text-white">{SEKITARMU_TEXT.personStack(Math.round(bore.maxM / PERSON_M))}</p>
            <p className="sekitarmu-rise mt-1 text-[12px] leading-snug text-white/80">{bore.reading}</p>
            <p className="mt-1 text-[10px] text-white/45">
              {bore.method} · {bore.source}
            </p>
            <p className="mt-1 text-[10px] text-white/40">Kolom 0–15 m · garis putih: {SEKITARMU_TEXT.personNote}</p>
          </>
        ) : (
          <p className="mt-1.5 text-[12px] text-white/60">{SEKITARMU_TEXT.drilling}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Modul 01 — Gambut di Sekitarmu.
 *
 * Membawa pembaca dari peta Indonesia ke jalan-jalan di kotanya sendiri:
 * seluas apa gambut, di kecamatan mana, sedalam apa, dan bahwa tanah itu
 * pernah terbakar. Peta 2D, bukan adegan 3D: yang diajarkan di sini letak dan
 * ukuran, dan untuk itu peta adalah bentuk yang paling jujur. Sumber setiap
 * angka ada di docs/md/acuan-modul-sekitarmu.md.
 */
export default function SekitarmuModule() {
  const [act, setAct] = useState(0);
  const [zoom, setZoom] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [revealCount, setRevealCount] = useState(0);
  const [tapKey, setTapKey] = useState(0);
  const [boresOpened, setBoresOpened] = useState<Set<string>>(new Set());
  const [activeBore, setActiveBore] = useState<string | null>(null);
  const [firesOpened, setFiresOpened] = useState<Set<string>>(new Set());
  const [activeFire, setActiveFire] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Setelah Periksa, buka hasil kecamatan satu per satu.
  useEffect(() => {
    if (!revealed || reducedMotion) return;
    const total = mapData.districts.length;
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      setRevealCount(n);
      if (n >= total) window.clearInterval(id);
    }, REVEAL_STEP_MS);
    return () => window.clearInterval(id);
  }, [revealed, reducedMotion]);

  const allDistricts = mapData.districts.map((d) => d.name);
  // Gerak dikurangi: semua kecamatan dibuka sekaligus.
  const shownCount = reducedMotion ? allDistricts.length : revealCount;
  const revealDone = revealed && shownCount >= allDistricts.length;
  const rightGuesses = allDistricts.filter((n) => selected.has(n) === Boolean(DISTRICT_PEAT[n])).length;

  const actDone = [
    zoom >= ZOOM_MAX - 0.02,
    revealDone,
    BORE_SITES.every((b) => boresOpened.has(b.id)),
    FIRE_SITES.every((f) => firesOpened.has(f.id)),
  ];

  const progress = [
    `Tingkat ${ZOOM_LEVELS[Math.min(2, Math.round(zoom))].label}`,
    selected.size === 0 ? "Belum ada kecamatan yang dipilih" : `${selected.size} kecamatan dipilih`,
    `${boresOpened.size} dari ${BORE_SITES.length} titik bor dibuka`,
    `${firesOpened.size} dari ${FIRE_SITES.length} titik api dibuka`,
  ][act];

  /** Cincin sorotan pada alat yang diminta tugas babak ini. */
  const guide = (forAct: number) => (act === forAct && !actDone[act] ? "guide-ring" : "");

  const reset = () => {
    setAct(0);
    setZoom(0);
    setSelected(new Set());
    setRevealed(false);
    setRevealCount(0);
    setBoresOpened(new Set());
    setActiveBore(null);
    setFiresOpened(new Set());
    setActiveFire(null);
  };

  const toggleDistrict = (name: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  const openBore = (id: string) => {
    setActiveBore(id);
    setTapKey((k) => k + 1);
    setBoresOpened((prev) => new Set(prev).add(id));
  };
  const openFire = (id: string) => {
    setActiveFire(id);
    setTapKey((k) => k + 1);
    setFiresOpened((prev) => new Set(prev).add(id));
  };

  const level = ZOOM_LEVELS[Math.min(2, Math.round(zoom))];
  const bore = BORE_SITES.find((b) => b.id === activeBore);
  const fire = FIRE_SITES.find((f) => f.id === activeFire);
  const fireBore = fire ? BORE_SITES.find((b) => b.id === fire.id) : undefined;
  const fireTitle = fireBore?.title ?? null;

  return (
    <ActModuleShell
      href="/modul/sekitarmu"
      hook={SEKITARMU_HOOK}
      acts={SEKITARMU_ACTS}
      act={act}
      onAct={setAct}
      actDone={actDone}
      progress={progress}
      onReset={reset}
      taskExtra={
        act === 1 &&
        revealDone && (
          <p className="sekitarmu-rise mt-2 border-t border-white/10 pt-2 text-[12px] font-medium leading-snug text-[#f0a35e]">
            {SEKITARMU_TEXT.checked(rightGuesses, allDistricts.length)}
          </p>
        )
      }
      figure={
        <SekitarmuMap
          act={act}
          zoom={zoom}
          selected={selected}
          revealed={revealed}
          revealCount={shownCount}
          tapKey={tapKey}
          boresOpened={boresOpened}
          activeBore={activeBore}
          firesOpened={firesOpened}
          activeFire={activeFire}
          onToggleDistrict={toggleDistrict}
          onBore={openBore}
          onFire={openFire}
          reducedMotion={reducedMotion}
        />
      }
      controls={
        <>
      {act === 0 && (
        <div className={`-mx-2 rounded-2xl px-2 py-1.5 ${guide(0)}`}>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="sekitarmu-zoom" className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
              {SEKITARMU_TEXT.zoomLabel}
            </label>
            <span className="text-right">
              <span className="block text-[11px] text-white/60">{level.label}</span>
              <span className="font-playfair text-xl italic text-white">{level.value}</span>
            </span>
          </div>
          {/* Trek penggeser. `.water-slider` menyembunyikan trek bawaan
              peramban, jadi jalurnya digambar sendiri, sama dengan
              penggeser kedalaman di Modul Kanal. */}
          <div className="relative mt-2">
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-[#6fb6d8] to-[#f0a35e]" style={{ width: `${(zoom / ZOOM_MAX) * 100}%` }} />
            </div>
          <input
            id="sekitarmu-zoom"
            type="range"
            min={0}
            max={ZOOM_MAX}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-valuetext={`${level.label}, gambut ${level.value}`}
            className="water-slider relative z-10 w-full"
          />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-white/45">
            {ZOOM_LEVELS.map((l) => (
              <span key={l.id}>{l.label}</span>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-white/40">Sumber: {level.note}</p>
        </div>
      )}

      {act === 1 && (
        <div>
          <p className="text-[12px] leading-snug text-white/75">
            {revealed ? SEKITARMU_TEXT.hatchNote : "Tekan kecamatan di peta untuk memilihnya. Tekan sekali lagi untuk membatalkan."}
          </p>
          {!revealed && (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              disabled={selected.size === 0}
              className={`mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-medium text-black transition-colors hover:bg-[#6fb6d8] disabled:cursor-not-allowed disabled:opacity-40 ${guide(1)}`}
            >
              {SEKITARMU_TEXT.check}
            </button>
          )}
        </div>
      )}

      {act === 2 &&
        (bore ? (
          <BoreCore key={bore.id} bore={bore} reducedMotion={reducedMotion} />
        ) : (
          <p className="text-[12px] leading-snug text-white/75">Tekan salah satu titik bor di peta.</p>
        ))}

      {act === 3 &&
        (fire ? (
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">{fireTitle}</p>
            {fireBore && <p className="mt-1 text-[12px] font-medium text-[#f0a35e]">{SEKITARMU_TEXT.firePeat(fireBore.display)}</p>}
            {/* Kejadian muncul berurutan menurut waktu: terbakar, lalu terbakar lagi. */}
            <ul key={fire.id} className="mt-2 space-y-2">
              {fire.events.map((e, i) => (
                <li key={e.when} className="sekitarmu-rise" style={{ animationDelay: `${0.15 + i * 0.35}s` }}>
                  <p className="text-[12px] font-medium text-[#ff9a5c]">{e.when}</p>
                  <p className="text-[12px] leading-snug text-white/80">{e.text}</p>
                  <p className="text-[10px] text-white/40">{e.source}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-[12px] leading-snug text-white/75">Tekan salah satu titik api di peta.</p>
        ))}
        </>
      }
    />
  );
}
