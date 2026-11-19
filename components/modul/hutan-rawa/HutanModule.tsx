"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { CloudRain, Waves } from "lucide-react";
import ActModuleShell from "@/components/modul/shared/ActModuleShell";
import GuideLayer from "@/components/modul/shared/GuideLayer";
import { guideLevel, guideTarget } from "@/lib/guide";
import { APE_PHOTOS, FOREST_ZONES, HUTAN_ACTS, HUTAN_GUIDE, HUTAN_HOOK, HUTAN_TEXT, IUCN_LABEL, SEBANGAU_SPECIES, SEBANGAU_THREATENED, type ForestZone } from "@/config/modul/hutan-rawa";
import type { Quality } from "@/components/modul/shared/scene/dioramaConstants";
import { peatThicknessM, zoneAt } from "./scene/dome";

// Adegan 3D hanya dimuat di peramban (WebGL), sama seperti modul 3D lainnya.
const HutanScene = dynamic(() => import("./scene/HutanScene"), { ssr: false });

/** Panjang penampang yang dapat dijalani (km). */
const SPAN_KM = 14;

/** Warna tiap jenis hutan pada trek penggeser, dari tepi sungai ke puncak. */
const ZONE_COLOR: Record<ForestZone["id"], string> = {
  campuran: "linear-gradient(90deg, #5fb0dc, #6fb98f)",
  tiang: "linear-gradient(90deg, #8fbf72, #a9b86a)",
  tinggi: "linear-gradient(90deg, #6fa65a, #3f7f45)",
};

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
  // Arahan "Perhatikan" yang waktu bacanya sudah habis, per babak (tuntunan).
  const [acked, setAcked] = useState<readonly number[]>([0, 0, 0]);
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

  // Tuntunan: arahan aktif dibaca dari keadaan terjauh yang pernah dicapai.
  const guideState = {
    maxKm,
    triedFlood,
    triedRain,
    opened: FOREST_ZONES.filter((z) => opened.has(z.id)).map((z) => z.id),
  };
  const guideSteps = HUTAN_GUIDE[act];
  const level = guideLevel(guideSteps, guideState, acked[act]);
  const step = guideSteps[level];

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
    setAcked([0, 0, 0]);
  };

  const openZone = (id: ForestZone["id"]) => {
    setActiveZone(id);
    setOpened((prev) => new Set(prev).add(id));
  };

  const here = zoneAt(walkKm);
  const zone = FOREST_ZONES.find((z) => z.id === activeZone);

  // Pembacaan tiap babak. Di layar >= 1024 px dipindah ke kolom kanan
  // (`aside`) supaya kolom kiri tidak sesak dan panel cerita tidak
  // terpotong; di layar lebih sempit tetap di panel kendali.
  const peatReadout = (
    <>
                <p className="font-playfair text-xl italic leading-none text-white">{here.name}</p>
                <div className="mt-2 grid sm:mt-2.5 grid-cols-[1fr_auto] items-end gap-x-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">{HUTAN_TEXT.peatHere}</p>
                    <p className="mt-0.5 font-playfair text-2xl italic leading-none tabular-nums text-[#f0a35e] sm:text-3xl">
                      ± {Math.max(1, Math.round(peatThicknessM(walkKm)))} m
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">{HUTAN_TEXT.canopy}</p>
                    <p className="mt-0.5 text-sm tabular-nums text-[#9fd3a0]">{here.canopy}</p>
                  </div>
                </div>
                {/* Batang tebal gambut terhadap tebal terbesar di puncak kubah. */}
                <div className="mt-2 hidden h-1 overflow-hidden rounded-full bg-white/10 sm:block" aria-hidden>
                  <div className="h-full rounded-full bg-[#f0a35e] transition-[width] duration-150" style={{ width: `${(peatThicknessM(walkKm) / peatThicknessM(SPAN_KM)) * 100}%` }} />
                </div>
                <p className="mt-1 hidden text-[10px] text-white/40 sm:block">{HUTAN_TEXT.peatRange(here.peat)}</p>
                  </>
  );
  const waterNote = lastSource === "rain" && rain
                  ? HUTAN_TEXT.rainNote
                  : lastSource === "flood" && flood
                    ? HUTAN_TEXT.floodNote
                    : rain
                      ? HUTAN_TEXT.rainNote
                      : flood
                        ? HUTAN_TEXT.floodNote
                        : "Tekan salah satu sumber air.";
  const zonePanel = (zone ? (
              <div data-guide="zoneInfo">
                <p className="font-playfair text-xl italic leading-none text-white">{zone.name}</p>
                {/* Di ponsel label dan nilainya sebaris, supaya panel tidak
                    menindih tombol jenis hutan di bawah penampang. */}
                <dl className="mt-2 grid grid-cols-2 gap-2">
                  <div className="flex items-baseline gap-1.5 sm:block">
                    <dt className="text-[10px] uppercase tracking-[0.12em] text-white/40">{HUTAN_TEXT.richness}</dt>
                    <dd className="text-sm capitalize text-[#9fd3a0]">{zone.richness}</dd>
                  </div>
                  <div className="flex items-baseline gap-1.5 sm:block">
                    <dt className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                      <span className="sm:hidden">{HUTAN_TEXT.apesShort}</span>
                      <span className="hidden sm:inline">{HUTAN_TEXT.apes}</span>
                    </dt>
                    <dd className="text-sm capitalize text-[#f0a35e]">{zone.apes}</dd>
                  </div>
                </dl>
                <p className="mt-2 text-[12px] leading-snug text-white/75">{zone.note}</p>
                <div className="mt-2 md:hidden">
                  <ApePhotos size="small" />
                </div>
                {/* Di ponsel daftar jenis disembunyikan supaya panel tidak
                    menutupi penampang; versi laptop memuatnya lengkap. */}
                <p className="mt-3 hidden border-t border-white/10 pt-2 text-[10px] uppercase tracking-[0.12em] text-white/40 sm:block lg:hidden">{HUTAN_TEXT.totals}</p>
                <ul className="mt-1 hidden grid-cols-3 gap-x-2 gap-y-1 sm:grid lg:hidden">
                  {SEBANGAU_SPECIES.map((s) => (
                    <li key={s.label} className="text-[11px] text-white/70">
                      <span className="font-medium tabular-nums text-white">{s.value}</span> {s.label}
                    </li>
                  ))}
                </ul>
                <p className="mt-1 hidden text-[10px] text-white/40 sm:block lg:hidden">{HUTAN_TEXT.source}</p>
              </div>
            ) : (
              <p className="text-[12px] leading-snug text-white/75">Tekan salah satu jenis hutan di bawah penampang.</p>
            ));

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
      guide={
        <GuideLayer
          key={`${act}-${level}`}
          target={guideTarget(step, guideState)}
          text={step.text}
          index={level + 1}
          total={guideSteps.length}
          onAuto={level < guideSteps.length - 1 && !step.done ? () => setAcked((a) => a.map((v, i) => (i === act ? Math.max(v, level + 1) : v))) : undefined}
          // Arahan pertama tiap babak menunggu penjelasan babaknya tampil dulu.
          delayMs={level === 0 ? 1500 : 350}
        />
      }
      figure={
        <>
          <HutanScene
            walkerKm={act === 0 ? walkKm : null}
            flood={act === 1 && flood}
            rain={act === 1 && rain}
            waterAct={act === 1}
            openedZones={act === 2 ? opened : null}
            activeZone={act === 2 ? activeZone : null}
            onZone={openZone}
            quality={quality}
            onOverload={handleOverload}
          />
          <p className="pointer-events-none absolute inset-x-0 top-0 hidden text-right text-[10px] text-white/50 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)] sm:block lg:hidden">
            {act === 2 ? HUTAN_TEXT.apesNote : HUTAN_TEXT.scaleNote}
          </p>
        </>
      }
      aside={
        <>
          {act === 0 && (
            <section data-guide="peatHere" className={`${CARD} stage-in`}>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">{HUTAN_TEXT.underFoot}</p>
              {peatReadout}
            </section>
          )}
          {act === 1 && (
            <section className={`${CARD} stage-in`}>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">{HUTAN_TEXT.waterSource}</p>
              <p className="mt-1.5 text-[12px] leading-snug text-white/85">{waterNote}</p>
            </section>
          )}
          {act === 2 && <section className={`${CARD} stage-in`}>{zonePanel}</section>}
          {/* Penghuni yang terancam: muncul setelah satu jenis hutan dibuka. */}
          {act === 2 && opened.size > 0 && (
            <section className={`${CARD} stage-in`}>
              <ThreatenedList />
            </section>
          )}
          {act !== 2 && <p className={`${CARD} stage-in text-[11px] leading-snug text-white/60`}>{HUTAN_TEXT.scaleNote}</p>}
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
              {/* Trek penggeser dibagi tiga menurut batas jenis hutan (Husson
                  dkk., 2018), jadi pembaca melihat di mana hutan berganti. */}
              <div data-guide="walk" className="relative mt-2.5">
                <div className="pointer-events-none absolute inset-x-0 top-1/2 flex h-2 -translate-y-1/2 gap-[3px]">
                  {FOREST_ZONES.map((z) => {
                    const fill = Math.min(1, Math.max(0, (walkKm - z.fromKm) / (z.toKm - z.fromKm)));
                    return (
                      <div key={z.id} className="relative h-full overflow-hidden rounded-full bg-white/10" style={{ flexGrow: z.toKm - z.fromKm, flexBasis: 0 }}>
                        <div className="h-full rounded-full transition-[width] duration-75" style={{ width: `${fill * 100}%`, background: ZONE_COLOR[z.id] }} />
                      </div>
                    );
                  })}
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
              <div className="mt-1 flex gap-[3px] text-[10px] leading-tight">
                {FOREST_ZONES.map((z) => (
                  <span
                    key={z.id}
                    className={`truncate transition-colors ${z.id === here.id ? "font-medium text-white" : "text-white/35"}`}
                    style={{ flexGrow: z.toKm - z.fromKm, flexBasis: 0 }}
                  >
                    {z.short}
                  </span>
                ))}
              </div>

              {/* Di ponsel batang pembanding dan keterangan rentang disembunyikan
                  supaya panel tidak menutupi penampang; angkanya tetap ada. */}
              {/* Di ponsel rincian ini disembunyikan supaya panel tidak menutupi
                  bongkahan; nama zona tetap terbaca di bawah penggeser. */}
              <div data-guide="peatHere" className="mt-2 hidden border-t border-white/10 pt-2 sm:mt-3 sm:block sm:pt-3 lg:hidden">{peatReadout}</div>
            </div>
          )}

          {act === 1 && (
            <div>
              <div className={`flex flex-wrap gap-2 rounded-2xl ${guide(1)}`}>
                <button
                  type="button"
                  data-guide="flood"
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
                  data-guide="rain"
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
              <p className="mt-2 text-[12px] leading-snug text-white/75 lg:hidden">{waterNote}</p>
            </div>
          )}

          {act === 2 && <div className="lg:hidden">{zonePanel}</div>}
          {/* Di laptop rinciannya ada di kolom kanan; di sini tinggal ajakannya. */}
          {act === 2 && <p className="hidden text-[12px] leading-snug text-white/75 lg:block">Tekan jenis hutan di bawah penampang. Rinciannya muncul di kanan.</p>}
        </>
      }
    />
  );
}

/**
 * Foto asli kedua satwa, berdampingan, dengan nama dan pemotretnya. Rupa
 * aslinya hanya bisa ditunjukkan di sini: di diorama, satwa setinggi ±1,2 m
 * di samping pohon 45 m tinggal sebesar satu dua piksel.
 */
function ApePhotos({ size }: { size: "large" | "small" }) {
  const large = size === "large";
  return (
    <ul className="grid grid-cols-2 gap-2">
      {APE_PHOTOS.map((p) => (
        // Di layar sempit foto mengecil menjadi gambar kecil di samping
        // namanya, supaya panel tidak menutupi penampang.
        <li key={p.src} className={`min-w-0 ${large ? "" : "flex items-center gap-2"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- foto kecil berukuran tetap, sudah dikompres ke WebP */}
          <img
            src={p.src}
            alt={`${p.name} (${p.latin})`}
            width={720}
            height={540}
            loading="lazy"
            className={`rounded-lg object-cover ${large ? "aspect-[4/3] w-full" : "h-9 w-12 shrink-0"}`}
          />
          <div className="min-w-0">
            <p className={`truncate font-medium text-white ${large ? "mt-1 text-[12px]" : "text-[11px] leading-tight"}`}>{p.name}</p>
            {large && <p className="truncate text-[11px] italic text-white/55">{p.latin}</p>}
            <a href={p.href} target="_blank" rel="noopener noreferrer" className={`block text-[9px] leading-tight text-white/40 hover:text-white/70 ${large ? "" : "truncate"}`}>
              {p.credit}
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Gaya kartu kolom kanan, sama dengan Modul Musim Api. */
const CARD = "rounded-2xl border border-white/10 bg-[#0a0d0f]/50 p-3.5 shadow-lg shadow-black/20 [text-shadow:0_1px_2px_rgba(0,0,0,0.6)] [@media(max-height:820px)]:p-3";

/** Warna penanda status IUCN: kritis paling mencolok. */
const IUCN_COLOR = { CR: "#ff6a3d", EN: "#f0a35e", VU: "#e8d27a" } as const;

/**
 * Satwa endemik dan pohon terancam di hutan rawa gambut Sebangau, dengan
 * status IUCN dalam bahasa sehari-hari. Foto asli kedua kera tetap
 * ditampilkan kecil beserta pemotretnya (wajib menurut lisensinya).
 */
function ThreatenedList() {
  const row = (item: { name: string; latin: string; iucn: keyof typeof IUCN_LABEL }) => (
    <li key={item.latin} className="flex items-baseline justify-between gap-2">
      <span className="min-w-0 truncate text-[12px] text-white/90">
        {item.name} <span className="text-[10px] italic text-white/45">{item.latin}</span>
      </span>
      <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{ color: IUCN_COLOR[item.iucn], background: `${IUCN_COLOR[item.iucn]}22` }}>
        {IUCN_LABEL[item.iucn]}
      </span>
    </li>
  );
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">{HUTAN_TEXT.threatened}</p>
      <p className="mt-1 text-[10px] leading-snug text-white/45">{HUTAN_TEXT.apesNote}</p>
      <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-[#9fd3a0]">{HUTAN_TEXT.animals}</p>
      <ul className="mt-1 space-y-1">{SEBANGAU_THREATENED.animals.map(row)}</ul>
      <div className="mt-2">
        <ApePhotos size="small" />
      </div>
      <p className="mt-2.5 text-[10px] uppercase tracking-[0.12em] text-[#9fd3a0]">{HUTAN_TEXT.plants}</p>
      <ul className="mt-1 space-y-1">{SEBANGAU_THREATENED.plants.map(row)}</ul>
    </div>
  );
}
