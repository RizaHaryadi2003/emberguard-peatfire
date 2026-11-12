"use client";

import { useEffect, useState } from "react";
import ActModuleShell from "@/components/modul/ActModuleShell";
import {
  BORE_SITES,
  DISTRICT_PEAT,
  FIRE_SITES,
  SEKITARMU_ACTS,
  SEKITARMU_HOOK,
  SEKITARMU_TEXT,
  ZOOM_LEVELS,
} from "@/config/sekitarmu-content";
import mapData from "@/data/sekitarmu-map.json";
import SekitarmuMap from "./SekitarmuMap";

/** Perbesaran terjauh babak 01: tingkat Kota Pontianak. */
const ZOOM_MAX = 2;

/** Tebal gambut terbesar yang digambar pada kolom bor (m). */
const CORE_MAX_M = 15;

/** Tinggi orang dewasa sebagai pembanding pada kolom bor (m). */
const PERSON_M = 1.7;

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

  const allDistricts = mapData.districts.map((d) => d.name);
  const rightGuesses = allDistricts.filter((n) => selected.has(n) === Boolean(DISTRICT_PEAT[n])).length;

  const actDone = [
    zoom >= ZOOM_MAX - 0.02,
    revealed,
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
    setBoresOpened((prev) => new Set(prev).add(id));
  };
  const openFire = (id: string) => {
    setActiveFire(id);
    setFiresOpened((prev) => new Set(prev).add(id));
  };

  const level = ZOOM_LEVELS[Math.min(2, Math.round(zoom))];
  const bore = BORE_SITES.find((b) => b.id === activeBore);
  const fire = FIRE_SITES.find((f) => f.id === activeFire);
  const fireTitle = fire ? BORE_SITES.find((b) => b.id === fire.id)?.title : null;

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
        revealed && (
          <p className="mt-2 border-t border-white/10 pt-2 text-[12px] font-medium leading-snug text-[#f0a35e]">
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
          <div className="flex gap-4">
            {/* Kolom bor: tebal gambut terhadap tinggi orang dewasa. */}
            <div className="relative h-36 w-16 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-[#6b5a45]" aria-hidden>
              <div
                className="absolute inset-x-0 top-0 bg-gradient-to-b from-[#3a2a1c] to-[#2a1e14]"
                style={{ height: `${(bore.maxM / CORE_MAX_M) * 100}%` }}
              />
              {/* Garis jingga: batas tertipis yang terukur di lokasi ini. */}
              <div
                className="absolute inset-x-0 border-t border-dashed border-[#f0a35e]"
                style={{ top: `${(bore.minM / CORE_MAX_M) * 100}%` }}
              />
              {/* Tinggi orang dewasa, diukur dari permukaan ke bawah:
                  itulah pembanding yang dipahami pembaca. */}
              <div className="absolute right-1 top-0 w-1.5 rounded-b bg-white/85" style={{ height: `${(PERSON_M / CORE_MAX_M) * 100}%` }} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">{bore.title}</p>
              <p className="mt-1 font-playfair text-2xl italic leading-none text-[#f0a35e]">
                {bore.display}
              </p>
              <p className="mt-1.5 text-[12px] leading-snug text-white/80">{bore.reading}</p>
              <p className="mt-1 text-[10px] text-white/45">
                {bore.method} · {bore.source}
              </p>
              <p className="mt-1 text-[10px] text-white/40">Kolom 0–15 m · garis putih: {SEKITARMU_TEXT.personNote}</p>
            </div>
          </div>
        ) : (
          <p className="text-[12px] leading-snug text-white/75">Tekan salah satu titik bor di peta.</p>
        ))}

      {act === 3 &&
        (fire ? (
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">{fireTitle}</p>
            <ul className="mt-2 space-y-2">
              {fire.events.map((e) => (
                <li key={e.when}>
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
