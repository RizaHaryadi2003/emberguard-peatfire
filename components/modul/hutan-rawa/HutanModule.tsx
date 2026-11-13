"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { CloudRain, Waves } from "lucide-react";
import ActModuleShell from "@/components/modul/shared/ActModuleShell";
import { FOREST_ZONES, HUTAN_ACTS, HUTAN_HOOK, HUTAN_TEXT, SEBANGAU_SPECIES, type ForestZone } from "@/config/modul/hutan-rawa";
import type { Quality } from "@/components/modul/shared/scene/dioramaConstants";
import { zoneAt } from "./scene/dome";

// Adegan 3D hanya dimuat di peramban (WebGL), sama seperti modul 3D lainnya.
const HutanScene = dynamic(() => import("./scene/HutanScene"), { ssr: false });

/** Panjang penampang yang dapat dijalani (km). */
const SPAN_KM = 14;

/** Jarak dari tepi hutan yang dihitung sudah "sampai puncak kubah" (km). */
const SUMMIT_KM = 12;

/**
 * Modul 03 — Hutan Rawa Gambut.
 *
 * Penampang samping kubah gambut Sebangau: pembaca berjalan dari tepi hutan
 * ke puncak kubah dan melihat hutan berganti mengikuti tebal gambut, melihat
 * bahwa sungai hanya membasahi tepinya sementara tengah kubah hidup dari
 * hujan, lalu membuka siapa yang tinggal di tiap jenis hutan. Sumbernya ada
 * di docs/md/acuan-modul-hutan-rawa.md.
 */
export default function HutanModule() {
  const [act, setAct] = useState(0);
  const [walkKm, setWalkKm] = useState(0);
  const [maxKm, setMaxKm] = useState(0);
  const [flood, setFlood] = useState(false);
  const [rain, setRain] = useState(false);
  // Sumber air yang terakhir ditekan: keterangannya yang ditampilkan,
  // karena kedua tombol bisa menyala bersamaan.
  const [lastSource, setLastSource] = useState<"flood" | "rain" | null>(null);
  const [triedFlood, setTriedFlood] = useState(false);
  const [triedRain, setTriedRain] = useState(false);
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [activeZone, setActiveZone] = useState<ForestZone["id"] | null>(null);
  // Mutu grafis: rendah di ponsel sejak awal, dan turun sendiri bila
  // PerformanceGuard mendapati perangkat kewalahan.
  const [quality, setQuality] = useState<Quality>("high");
  const handleOverload = useCallback(() => setQuality("low"), []);
  useEffect(() => {
    const low = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hanya sekali saat dipasang, membaca perangkat
    if (low) setQuality("low");
  }, []);

  const actDone = [maxKm >= SUMMIT_KM, triedFlood && triedRain, FOREST_ZONES.every((z) => opened.has(z.id))];
  const progress = [
    HUTAN_TEXT.fromRiver(walkKm),
    `${[triedFlood && "banjir sungai", triedRain && "hujan"].filter(Boolean).join(" dan ") || "belum ada"} dicoba`,
    `${opened.size} dari ${FOREST_ZONES.length} jenis hutan dibuka`,
  ][act];
  const guide = (forAct: number) => (act === forAct && !actDone[act] ? "guide-ring" : "");

  const reset = () => {
    setAct(0);
    setWalkKm(0);
    setMaxKm(0);
    setFlood(false);
    setRain(false);
    setLastSource(null);
    setTriedFlood(false);
    setTriedRain(false);
    setOpened(new Set());
    setActiveZone(null);
  };

  const openZone = (id: ForestZone["id"]) => {
    setActiveZone(id);
    setOpened((prev) => new Set(prev).add(id));
  };

  const here = zoneAt(walkKm);
  const zone = FOREST_ZONES.find((z) => z.id === activeZone);

  return (
    <ActModuleShell
      href="/modul/hutan-rawa"
      hook={HUTAN_HOOK}
      acts={HUTAN_ACTS}
      act={act}
      onAct={(i) => {
        setAct(i);
        setFlood(false);
        setRain(false);
        setLastSource(null);
      }}
      actDone={actDone}
      progress={progress}
      onReset={reset}
      background="#0d1712"
      figure={
        <>
          <HutanScene
            walkerKm={act === 0 ? walkKm : null}
            flood={act === 1 && flood}
            rain={act === 1 && rain}
            openedZones={act === 2 ? opened : null}
            activeZone={act === 2 ? activeZone : null}
            onZone={openZone}
            quality={quality}
            onOverload={handleOverload}
          />
          <p className="pointer-events-none absolute inset-x-0 top-0 hidden text-right text-[10px] text-white/50 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)] sm:block">
            {act === 2 ? HUTAN_TEXT.apesNote : HUTAN_TEXT.scaleNote}
          </p>
        </>
      }
      controls={
        <>
          {act === 0 && (
            <div className={`-mx-2 rounded-2xl px-2 py-1.5 ${guide(0)}`}>
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="hutan-walk" className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
                  {HUTAN_TEXT.stepLabel}
                </label>
                <span className="text-[11px] tabular-nums text-white/70">{HUTAN_TEXT.fromRiver(walkKm)}</span>
              </div>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#5fb0dc] to-[#4f8a4a]" style={{ width: `${(walkKm / SPAN_KM) * 100}%` }} />
                </div>
                <input
                  id="hutan-walk"
                  type="range"
                  min={0}
                  max={SPAN_KM}
                  step={0.1}
                  value={walkKm}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setWalkKm(v);
                    setMaxKm((m) => Math.max(m, v));
                  }}
                  aria-valuetext={`${HUTAN_TEXT.fromRiver(walkKm)}, ${here.name}`}
                  className="water-slider relative z-10 w-full"
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-white/45">
                <span>Tepi sungai</span>
                <span>Puncak kubah</span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
                <div className="col-span-2">
                  <dt className="sr-only">Jenis hutan</dt>
                  <dd className="font-playfair text-xl italic leading-none text-white">{here.name}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.12em] text-white/40">{HUTAN_TEXT.peat}</dt>
                  <dd className="text-sm text-[#f0a35e]">{here.peat}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.12em] text-white/40">{HUTAN_TEXT.canopy}</dt>
                  <dd className="text-sm text-[#9fd3a0]">{here.canopy}</dd>
                </div>
              </dl>
            </div>
          )}

          {act === 1 && (
            <div>
              <div className={`flex flex-wrap gap-2 rounded-2xl ${guide(1)}`}>
                <button
                  type="button"
                  aria-pressed={flood}
                  onClick={() => {
                    setFlood((v) => !v);
                    setLastSource("flood");
                    setTriedFlood(true);
                  }}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors ${
                    flood ? "border-[#5fb0dc] bg-[#5fb0dc]/25 text-white" : "border-white/20 text-white/80 hover:border-white/40"
                  }`}
                >
                  <Waves size={14} /> {HUTAN_TEXT.flood}
                </button>
                <button
                  type="button"
                  aria-pressed={rain}
                  onClick={() => {
                    setRain((v) => !v);
                    setLastSource("rain");
                    setTriedRain(true);
                  }}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors ${
                    rain ? "border-[#9fd3f0] bg-[#9fd3f0]/20 text-white" : "border-white/20 text-white/80 hover:border-white/40"
                  }`}
                >
                  <CloudRain size={14} /> {HUTAN_TEXT.rain}
                </button>
              </div>
              <p className="mt-2 text-[12px] leading-snug text-white/75">
                {lastSource === "rain" && rain
                  ? HUTAN_TEXT.rainNote
                  : lastSource === "flood" && flood
                    ? HUTAN_TEXT.floodNote
                    : rain
                      ? HUTAN_TEXT.rainNote
                      : flood
                        ? HUTAN_TEXT.floodNote
                        : "Tekan salah satu sumber air."}
              </p>
            </div>
          )}

          {act === 2 &&
            (zone ? (
              <div>
                <p className="font-playfair text-xl italic leading-none text-white">{zone.name}</p>
                <dl className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.12em] text-white/40">{HUTAN_TEXT.richness}</dt>
                    <dd className="text-sm capitalize text-[#9fd3a0]">{zone.richness}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.12em] text-white/40">{HUTAN_TEXT.apes}</dt>
                    <dd className="text-sm capitalize text-[#f0a35e]">{zone.apes}</dd>
                  </div>
                </dl>
                <p className="mt-2 text-[12px] leading-snug text-white/75">{zone.note}</p>
                {/* Di ponsel daftar jenis disembunyikan supaya panel tidak
                    menutupi penampang; versi laptop memuatnya lengkap. */}
                <p className="mt-3 hidden border-t border-white/10 pt-2 text-[10px] uppercase tracking-[0.12em] text-white/40 sm:block">{HUTAN_TEXT.totals}</p>
                <ul className="mt-1 hidden grid-cols-3 gap-x-2 gap-y-1 sm:grid">
                  {SEBANGAU_SPECIES.map((s) => (
                    <li key={s.label} className="text-[11px] text-white/70">
                      <span className="font-medium tabular-nums text-white">{s.value}</span> {s.label}
                    </li>
                  ))}
                </ul>
                <p className="mt-1 hidden text-[10px] text-white/40 sm:block">{HUTAN_TEXT.source}</p>
              </div>
            ) : (
              <p className="text-[12px] leading-snug text-white/75">Tekan salah satu jenis hutan di bawah penampang.</p>
            ))}
        </>
      }
    />
  );
}
