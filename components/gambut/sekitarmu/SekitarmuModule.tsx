"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, MousePointerClick, RotateCcw } from "lucide-react";
import ModuleHook from "@/components/gambut/ModuleHook";
import StepAdvance from "@/components/gambut/StepAdvance";
import { BACK_TO_MODULE_LIST, moduleAt, nextAvailableModule } from "@/config/modules-content";
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

const MODULE = moduleAt("/modul/sekitarmu");
const NEXT = nextAvailableModule("/modul/sekitarmu");

/** Jarak usapan ke atas yang menutup layar pembuka di layar sentuh (piksel). */
const HOOK_SWIPE = 30;

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
  const [hookOpen, setHookOpen] = useState(true);
  const [act, setAct] = useState(0);
  const [zoom, setZoom] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [boresOpened, setBoresOpened] = useState<Set<string>>(new Set());
  const [activeBore, setActiveBore] = useState<string | null>(null);
  const [firesOpened, setFiresOpened] = useState<Set<string>>(new Set());
  const [activeFire, setActiveFire] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Layar pembuka tertutup oleh tombolnya, oleh gulir, atau oleh usapan ke
  // atas — sama dengan modul lain.
  useEffect(() => {
    if (!hookOpen) return;
    let startY: number | null = null;
    const onWheel = (e: WheelEvent) => e.deltaY > 0 && setHookOpen(false);
    const onTouchStart = (e: TouchEvent) => (startY = e.touches[0].clientY);
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

  const current = SEKITARMU_ACTS[act];
  const isLast = act === SEKITARMU_ACTS.length - 1;
  const panelFade = `transition-opacity duration-700 ${hookOpen ? "opacity-0" : "opacity-100"}`;
  const guide = (forAct: number) => (act === forAct && !actDone[act] && !hookOpen ? "guide-ring" : "");

  const goToAct = (next: number) => {
    if (next > act && !actDone[act]) return;
    setAct(next);
  };

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

  const advance = isLast ? (
    NEXT?.href ? (
      <StepAdvance nextTitle={`Modul ${NEXT.number} · ${NEXT.title}`} label="Modul berikutnya" href={NEXT.href} forward />
    ) : (
      <StepAdvance {...BACK_TO_MODULE_LIST} />
    )
  ) : (
    <StepAdvance
      nextTitle={SEKITARMU_ACTS[act + 1].title}
      label="Babak berikutnya"
      hint={current.hint}
      locked={!actDone[act]}
      onAdvance={() => goToAct(act + 1)}
    />
  );

  const level = ZOOM_LEVELS[Math.min(2, Math.round(zoom))];
  const bore = BORE_SITES.find((b) => b.id === activeBore);
  const fire = FIRE_SITES.find((f) => f.id === activeFire);
  const fireTitle = fire ? BORE_SITES.find((b) => b.id === fire.id)?.title : null;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#0b1a24]">
      {/* Peta: di layar lebar mengisi ruang di kanan panel cerita, di layar
          sempit pita di antara panel cerita dan panel kendali. */}
      <div className="absolute bottom-[34%] left-4 right-4 top-[44%] md:bottom-[8%] md:left-[36%] md:right-[4%] md:top-[12%]">
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
      </div>

      <ModuleHook
        open={hookOpen}
        kicker={`Modul ${MODULE.number} · ${MODULE.title}`}
        setup={SEKITARMU_HOOK.setup}
        question={SEKITARMU_HOOK.question}
        cta={SEKITARMU_HOOK.cta}
        scrollHint={SEKITARMU_HOOK.scrollHint}
        onStart={() => setHookOpen(false)}
      />

      {/* Peredup di sisi kiri agar teks terbaca di atas peta. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r from-black/80 via-black/30 to-transparent md:w-[55%]" />

      {/* Panel cerita (kiri atas). */}
      <div
        inert={hookOpen}
        className={`pointer-events-none absolute left-5 right-5 top-14 z-20 sm:left-10 md:left-14 md:right-auto md:max-w-[404px] [@media(min-height:651px)]:top-16 [@media(min-height:901px)]:top-24 ${panelFade}`}
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/50">
          Modul {MODULE.number} · {MODULE.title}
        </p>
        <div key={act} aria-live="polite">
          <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-[#6fb6d8]">Babak {current.number}</p>
          <h1 className="mt-1 font-playfair text-3xl italic leading-[1.02] text-white [@media(min-height:651px)]:text-4xl" style={{ letterSpacing: "-0.03em" }}>
            {current.title}
          </h1>
          <p className="mt-2 hidden text-sm leading-snug text-white/75 sm:block">{current.body}</p>
          <p className="mt-2 text-[11px] leading-snug text-white/60">
            <span className="font-medium text-[#8fcce8]">{current.term.word}:</span> {current.term.meaning}
          </p>
          <div
            className={`pointer-events-auto mt-3 rounded-2xl border p-3 backdrop-blur-md transition-colors duration-500 ${
              actDone[act] ? "border-emerald-300/30 bg-emerald-950/40" : "border-[#6fb6d8]/30 bg-black/45"
            }`}
          >
            <p className={`inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] ${actDone[act] ? "text-emerald-200" : "text-[#8fcce8]"}`}>
              {actDone[act] ? <Check size={12} /> : <MousePointerClick size={12} />}
              {actDone[act] ? "Berhasil · perhatikan" : "Tugasmu"}
            </p>
            <p className="mt-1.5 text-[13px] leading-snug text-white">{actDone[act] ? current.observe : current.task}</p>
            {!actDone[act] && <p className="mt-1.5 text-[11px] tabular-nums text-white/55">{progress}</p>}
            {act === 1 && revealed && (
              <p className="mt-2 border-t border-white/10 pt-2 text-[12px] font-medium leading-snug text-[#f0a35e]">
                {SEKITARMU_TEXT.checked(rightGuesses, allDistricts.length)}
              </p>
            )}
          </div>
          {/* Angka kunci babak, beserta sumbernya. */}
          <div className="mt-3 hidden items-baseline gap-3 border-t border-white/10 pt-3 [@media(min-height:760px)]:sm:flex">
            <span className="shrink-0 font-playfair text-2xl italic text-[#f0a35e]">{current.fact.value}</span>
            <span className="text-[11px] leading-snug text-white/55">{current.fact.caption}</span>
          </div>
        </div>
      </div>

      {/* Panel kendali (kiri bawah). */}
      <div
        inert={hookOpen}
        className={`absolute bottom-14 left-5 right-5 z-20 sm:left-10 md:left-14 md:right-auto md:w-[404px] [@media(min-height:651px)]:bottom-20 ${panelFade}`}
      >
        <div className="rounded-3xl border border-white/10 bg-black/55 p-3.5 shadow-2xl shadow-black/60 backdrop-blur-xl">
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

          <button
            type="button"
            onClick={reset}
            className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/20 px-3.5 py-2 text-xs font-medium text-white/75 transition-colors hover:border-white/40 hover:text-white"
          >
            <RotateCcw size={14} /> {SEKITARMU_TEXT.reset}
          </button>
        </div>
      </div>

      {/* Navigasi babak (bawah). */}
      <nav inert={hookOpen} aria-label="Babak modul" className={`absolute bottom-6 left-5 z-20 flex items-end gap-4 sm:left-10 md:left-14 ${panelFade}`}>
        <div className="flex gap-2">
          {SEKITARMU_ACTS.map((a, i) => {
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
                  className={`h-0.5 w-14 rounded-full transition-colors duration-500 ${
                    i === act ? "bg-white" : i < act ? "bg-[#e8702a]" : locked ? "bg-white/12" : "bg-white/20 group-hover:bg-white/50"
                  }`}
                />
                <span className={`text-[11px] tabular-nums ${i === act ? "text-white" : "text-white/40"}`}>{a.number}</span>
              </button>
            );
          })}
        </div>
        {/* Di ponsel tombolnya baru muncul setelah tugas selesai, di samping
            penanda babak, sama dengan Modul Kanal: lebar layar tidak cukup
            untuk panah terkunci beserta arahannya, dan arahannya sudah ada
            di kartu tugas. */}
        {actDone[act] &&
          (isLast ? (
            NEXT?.href && (
              <Link
                href={NEXT.href}
                className="mb-1 inline-flex items-center whitespace-nowrap rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur-md md:hidden"
              >
                Modul berikutnya
              </Link>
            )
          ) : (
            <button
              type="button"
              onClick={() => goToAct(act + 1)}
              className="mb-1 inline-flex cursor-pointer items-center whitespace-nowrap rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur-md md:hidden"
            >
              Babak berikutnya
            </button>
          ))}
      </nav>

      {/* Panah lanjut (kanan bawah), hanya di layar lebar. */}
      <div inert={hookOpen} className={`absolute bottom-6 right-5 z-20 hidden sm:right-10 md:block ${panelFade}`}>
        {advance}
      </div>
    </div>
  );
}
