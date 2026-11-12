"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Check, FastForward, Info, MousePointerClick, Pause, RotateCcw, Waves, X } from "lucide-react";
import { CANAL_TEXT, FIGURE_NOTE, KANAL_ACTS, KANAL_HOOK, SCALE_NOTE, TIME_SPEEDS } from "@/config/kanal-content";
import { BACK_TO_MODULE_LIST, GAMBUT_MODULES } from "@/config/gambut-content";
import ModuleHook from "@/components/gambut/ModuleHook";
import StepAdvance from "@/components/gambut/StepAdvance";
import {
  CANAL_DEPTH_MAX_M,
  DrainageSim,
  formatDistance,
  formatDrop,
  formatYears,
  SIM_MAX_YEARS,
  WATER_LIMIT_M,
  type DrainageStats,
} from "@/lib/drainage";
import { CANAL_LABEL_WIDTH_M, NEAR_LENGTH_M, VERTICAL_EXAGGERATION } from "./scene/transect";
import WaterTableChart from "./WaterTableChart";
import { judgeProbe, probeSolved } from "./probe";
import { createKanalState, type KanalState, type Quality } from "./scene/kanalState";

// Kanvas 3D dimuat terpisah (tanpa SSR) agar halaman awal tetap ringan.
const KanalScene = dynamic(() => import("./scene/KanalScene"), { ssr: false });

// Diambil lewat alamatnya, bukan urutannya, supaya urutan modul dapat diubah.
const MODULE = GAMBUT_MODULES.find((m) => m.href === "/gambut/kanal")!;

/** Jarak usapan ke atas yang menutup layar pembuka di layar sentuh (piksel). */
const HOOK_SWIPE = 30;

/**
 * Kecepatan waktu awal tiap babak (indeks pada TIME_SPEEDS). Nol di mana-mana.
 *
 * Semula babak 03 dimulai pada kecepatan "Sedang", sehingga tahun-tahunnya
 * berjalan sendiri begitu babak itu dibuka dan syaratnya terpenuhi tanpa
 * pembaca menyentuh apa pun. Yang dipelajarinya dari situ bukan "gambut
 * kering melesak bertahun-tahun", melainkan "tunggu sebentar". Sekarang
 * waktunya berhenti sampai ia sendiri yang menjalankannya.
 */
const ACT_SPEED = [0, 0, 0, 0];

/**
 * Babak paling awal yang sudah menampilkan tiap alat.
 *
 * Mengikuti pola Modul 03 (`showDouse={act >= 2}`, `showRewet={act >= 3}`):
 * alat sebuah babak baru muncul ketika babaknya tiba. Sebelum ini ketiganya
 * tersedia sejak babak 01, sehingga pembaca dapat memasang sekat — pekerjaan
 * babak 04 — sebelum ia sempat tahu bahwa ada empat babak, dan keempat
 * gerbangnya hijau sebelum satu pun babak selesai dibaca.
 */
const TOOL_FROM = { depth: 0, time: 2, weir: 3 } as const;

/** Penurunan permukaan yang harus dicapai babak 03 (m). */
const ACT3_SUBSIDENCE_M = 0.5;

/** Kedalaman kanal yang harus dicapai babak 01 (cm). */
const ACT1_DEPTH_CM = 100;

/**
 * Modul 02 — Kanal & Pengeringan.
 *
 * Penampang lanskap sepanjang satu kilometer, bukan bongkahan seperti dua
 * modul sebelumnya: pengeringan tidak terjadi pada skala beberapa meter.
 * Pembaca menggali kanalnya sendiri, memajukan tahun, lalu mencoba
 * memperbaikinya dengan sekat.
 */
export default function KanalModule() {
  const rootRef = useRef<HTMLDivElement>(null);

  const sim = useMemo(() => new DrainageSim(), []);

  const [hookOpen, setHookOpen] = useState(true);
  const [act, setAct] = useState(0);
  const [stats, setStats] = useState<DrainageStats>(() => sim.stats);
  const [canalDepthCm, setCanalDepthCm] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [blocked, setBlocked] = useState(false);
  /** Jarak yang ditandai pembaca pada grafik (m) — tugas babak 02. */
  const [probeM, setProbeM] = useState<number | null>(null);
  /**
   * Pembaca pernah menandai tepi daerah rawan dengan benar.
   *
   * Diingat, bukan dihitung ulang dari penandanya. Penanda itu dibersihkan
   * begitu babak 02 ditinggalkan — ia tidak berarti apa-apa di babak lain —
   * sehingga `actDone[1]` kembali palsu dan penanda babak 02 pada navigasi
   * berubah kelabu lagi, seolah pekerjaannya batal. Modul 03 memakai cara
   * yang sama untuk hal yang sama: `dousedOnce`, `thermalSeen`, `rewetOnce`.
   *
   * Dikunci di dalam penangan geseran, bukan di dalam `useEffect` yang
   * mengawasi penandanya. Keduanya menghasilkan hal yang sama, tetapi yang
   * kedua memanggil `setState` di dalam badan efek: satu render tambahan
   * tiap kali penandanya bergerak, hanya untuk mencatat sesuatu yang sudah
   * diketahui pada render sebelumnya. Di sini kuncinya dipasang di tempat
   * pembaca benar-benar mengerjakannya.
   */
  const [probeSolvedOnce, setProbeSolvedOnce] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  /** Catatan skala gambar terbuka. Lihat kolom kanan. */
  const [scaleOpen, setScaleOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [quality, setQuality] = useState<Quality>("high");
  const handleOverload = useCallback(() => setQuality("low"), []);

  const stateRef = useRef<KanalState>(createKanalState());

  // Salurkan keadaan antarmuka ke adegan 3D (dibaca tiap bingkai).
  useEffect(() => {
    Object.assign(stateRef.current, {
      act,
      canalDepthM: canalDepthCm / 100,
      yearsPerSecond: TIME_SPEEDS[speedIndex].yearsPerSecond,
      blocked,
      reducedMotion,
    });
  }, [act, canalDepthCm, speedIndex, blocked, reducedMotion]);

  // Layar pembuka tertutup oleh tombolnya, oleh gulir ke bawah, atau oleh
  // usapan ke atas, sama dengan Modul 03: halaman ini dikunci setinggi layar,
  // jadi gerakannya dibaca langsung.
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

  const handleStats = useCallback((next: DrainageStats) => setStats(next), []);

  const handleReady = useCallback(() => setReady(true), []);

  /**
   * Pembaca menggeser penanda jaraknya.
   *
   * Dicatat sekali saat penandanya tepat, lalu tidak pernah dicabut sampai
   * ia memulai dari awal — lihat `probeSolvedOnce`. Jangkauan rawan dibaca
   * dari ringkasan simulasi saat geseran itu terjadi, sebab itulah angka
   * yang sedang dilihat pembaca pada grafik yang sedang ia telusuri.
   */
  const handleProbe = useCallback(
    (m: number) => {
      setProbeM(m);
      if (probeSolved(judgeProbe(m, stats.riskReachM))) setProbeSolvedOnce(true);
    },
    [stats.riskReachM],
  );

  const handleReset = useCallback(() => {
    sim.reset();
    setStats({ ...sim.stats });
    setAct(0);
    setCanalDepthCm(0);
    setSpeedIndex(0);
    setBlocked(false);
    setProbeM(null);
    setProbeSolvedOnce(false);
    Object.assign(stateRef.current, createKanalState());
  }, [sim]);

  // --- Syarat lulus tiap babak ---------------------------------------------
  //
  // Tiap syarat harus berupa pekerjaan yang benar-benar dikerjakan pembaca di
  // babak itu, bukan keadaan yang kebetulan sudah benar. Yang paling salah
  // sebelumnya babak 02: syaratnya "jangkauan rawan sudah melewati 100 m",
  // padahal kanal sedalam satu meter — yang sudah diminta babak 01 — membuat
  // jangkauan itu 209 m. Jadi babak 02 lulus sebelum pembaca selesai membaca
  // tugasnya, dan tombol "Babak berikutnya" sudah menyala ketika babaknya
  // baru dibuka.
  const probeVerdict = judgeProbe(probeM, stats.riskReachM);
  const probeFound = probeSolved(probeVerdict) || probeSolvedOnce;

  const actDone = [
    canalDepthCm >= ACT1_DEPTH_CM,
    probeFound,
    stats.maxSubsidenceM >= ACT3_SUBSIDENCE_M,
    blocked && stats.maxSubsidenceM > 0.1,
  ];

  /**
   * Sisa pekerjaan babak ini, satu baris.
   *
   * Modul 03 hanya menyimpan petunjuknya di atribut `title` penanda babak,
   * yang hanya terlihat kalau pembaca kebetulan menunda tetikusnya di sana.
   * Di sini syaratnya ditulis terus-menerus dan angkanya hidup, sehingga
   * pembaca tahu seberapa jauh ia dari selesai — bukan hanya bahwa ia belum.
   */
  const progress: string = [
    canalDepthCm >= ACT1_DEPTH_CM
      ? `Kanal sedalam ${canalDepthCm} cm`
      : `Kanal baru ${canalDepthCm} cm dari ${ACT1_DEPTH_CM} cm`,
    probeFound
      ? "Tepi daerah rawan sudah ditandai"
      : probeM === null
        ? "Penanda pada grafik belum digeser"
        : `Penanda di ${Math.round(probeM)} m — belum di tepinya`,
    stats.maxSubsidenceM >= ACT3_SUBSIDENCE_M
      ? `Permukaan turun ${formatDrop(stats.maxSubsidenceM)}`
      : `Permukaan baru turun ${formatDrop(stats.maxSubsidenceM)} dari ${ACT3_SUBSIDENCE_M * 100} cm`,
    blocked ? "Sekat terpasang" : "Sekat belum terpasang",
  ][act];
  /**
   * Seberapa jauh tugas ini sudah dikerjakan, 0–1, atau null bila tugasnya
   * tidak bertahap. Babak 02 dan 04 sekali jadi: penandanya tepat atau tidak,
   * sekatnya terpasang atau tidak, jadi bilah kemajuan di sana hanya akan
   * melompat dari kosong ke penuh tanpa memberi tahu apa pun.
   */
  const progressRatio: number | null = [
    Math.min(1, canalDepthCm / ACT1_DEPTH_CM),
    null,
    Math.min(1, stats.maxSubsidenceM / ACT3_SUBSIDENCE_M),
    null,
  ][act];
  const canAdvance = actDone[act] && act < KANAL_ACTS.length - 1;

  /**
   * Cincin sorotan pada alat yang diminta tugas babak ini, selama tugasnya
   * belum selesai. Lihat `.guide-ring` di globals.css.
   */
  const guide = (forAct: number) => (act === forAct && !actDone[act] && !hookOpen ? "guide-ring" : "");

  const goToAct = (next: number) => {
    if (next > act && !actDone[act]) return;
    setAct(next);
    setSpeedIndex(ACT_SPEED[next]);
    // Penanda hanya berarti di babak 02. Dibiarkan menyala di babak lain, ia
    // menjadi garis tegak tanpa keterangan di tengah grafik.
    if (next !== 1) setProbeM(null);
  };

  const current = KANAL_ACTS[act];
  const dense = act >= 2;

  /** Semua panel disembunyikan selama layar pembuka tampil, sama dengan Modul 01 dan 03. */
  const panelFade = `transition-opacity duration-700 ${hookOpen ? "opacity-0" : "opacity-100"}`;

  /**
   * Panah lanjut, sama dengan Modul 01 dan 03. Selalu terlihat: terkunci
   * dengan arahan, atau terbuka dengan nama babak yang menunggu. Dipasang di
   * dua tempat menurut lebar layar, jadi isinya disusun sekali di sini.
   */
  const advance =
    act < KANAL_ACTS.length - 1 ? (
      <StepAdvance
        nextTitle={KANAL_ACTS[act + 1].title}
        label="Babak berikutnya"
        hint={current.hint}
        locked={!actDone[act]}
        onAdvance={() => goToAct(act + 1)}
      />
    ) : (
      <StepAdvance {...BACK_TO_MODULE_LIST} />
    );

  return (
    <div ref={rootRef} id="modul-kanal" className="relative h-[100dvh] w-full overflow-hidden bg-[#070708]">
      <div className="absolute inset-0">
        {mounted && (
          <KanalScene
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
        setup={KANAL_HOOK.setup}
        question={KANAL_HOOK.question}
        cta={KANAL_HOOK.cta}
        scrollHint={KANAL_HOOK.scrollHint}
        onStart={() => setHookOpen(false)}
      />

      {/* Tirai pemuatan */}
      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-[#070708] transition-opacity duration-1000 ${
          ready ? "opacity-0" : "opacity-100"
        }`}
        aria-hidden={ready}
      >
        <p className="animate-pulse text-xs uppercase tracking-[0.25em] text-white/40">Membuka penampang lanskap…</p>
      </div>

      {/* Gradasi agar teks tetap terbaca di atas gambar */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r from-black/85 via-black/40 to-transparent md:w-[62%]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/75 to-transparent" />

      {/* Panel cerita babak (kiri atas). Ambang tingginya mengikuti Modul 03:
          min-height, sehingga keadaan sempit menjadi keadaan dasar. */}
      <div inert={hookOpen} className={`pointer-events-none absolute left-5 right-5 top-14 sm:left-10 sm:top-14 md:left-14 md:right-auto md:max-w-[404px] [@media(min-height:651px)]:top-16 [@media(min-height:651px)]:sm:top-20 [@media(min-height:901px)]:top-20 [@media(min-height:901px)]:sm:top-24 ${panelFade}`}>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/50">
          Modul {MODULE.number} · {MODULE.title}
        </p>
        <div key={act} aria-live="polite">
          <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-[#6fb6d8] [@media(min-height:901px)]:mt-3">
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
          {/* Istilah babak ini. Selalu tampil, juga di layar pendek yang
              menyembunyikan cerita di atasnya, karena tugas babak memakai
              istilah ini. */}
          <p className="mt-2 max-w-[404px] text-[11px] leading-snug text-white/60">
            <span className="font-medium text-[#8fcce8]">{current.term.word}:</span> {current.term.meaning}
          </p>
          {/* Kartu tugas.
              Sebelumnya tugasnya satu baris kecil di bawah judul, dan alat
              yang dimaksud tidak ditunjuk sama sekali — pembaca membaca
              "cari jarak pada grafik" tanpa tahu grafik yang mana, atau bahwa
              grafik itu dapat diseret. Sekarang tugasnya dibingkai sendiri,
              menyebut nama alatnya, dan berganti menjadi kalimat pengamatan
              begitu selesai: apa yang baru saja terjadi, bukan hanya bahwa
              pembaca sudah boleh lanjut. */}
          <div
            className={`mt-3 rounded-2xl border p-3 backdrop-blur-md transition-colors duration-500 [@media(min-height:901px)]:mt-4 ${
              actDone[act] ? "border-emerald-300/30 bg-emerald-950/40" : "border-[#6fb6d8]/30 bg-black/45"
            }`}
          >
            <p
              className={`inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] ${
                actDone[act] ? "text-emerald-200" : "text-[#8fcce8]"
              }`}
            >
              {actDone[act] ? <Check size={12} /> : <MousePointerClick size={12} />}
              {actDone[act] ? "Berhasil · perhatikan" : "Tugasmu"}
            </p>
            <p className="mt-1.5 text-[13px] leading-snug text-white">
              {actDone[act] ? current.observe : current.task}
            </p>
            {!actDone[act] && (
              <div className="mt-2">
                {progressRatio !== null && (
                  <div className="mb-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[#6fb6d8] transition-[width] duration-300"
                      style={{ width: `${Math.round(progressRatio * 100)}%` }}
                    />
                  </div>
                )}
                <p className="text-[11px] tabular-nums text-white/55">{progress}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panel kendali (kiri bawah) */}
      <div inert={hookOpen} className={`absolute bottom-14 left-5 right-5 sm:left-10 md:left-14 md:right-auto md:w-[404px] [@media(min-height:651px)]:bottom-20 ${panelFade}`}>
        <div className="rounded-3xl border border-white/10 bg-black/50 p-3.5 shadow-2xl shadow-black/60 backdrop-blur-xl [@media(min-height:901px)]:p-4">
          {/* Grafik untuk layar sempit.
              Panel kanan tersembunyi di bawah lebar lg, dan di sanalah grafik
              itu berada — artinya tugas babak 02 tidak mungkin diselesaikan
              di ponsel sama sekali, sebab penandanya tidak ada di layar.
              Jadi pada babak itu grafiknya ikut masuk ke panel kendali, di
              mana pembaca memang sedang bekerja. Keduanya satu keadaan, jadi
              penandanya selalu sama di mana pun ia digeser. */}
          {act === 1 && (
            <div className={`mb-3 rounded-2xl border-b border-white/10 p-1.5 pb-3 lg:hidden ${guide(1)}`}>
              {/* Dibatasi lebarnya supaya panel kendali tidak tumbuh sampai
                  menutupi seluruh bongkahan di belakangnya. */}
              <div className="mx-auto max-w-[300px]">
              <WaterTableChart
                sim={sim}
                stats={stats}
                probeM={probeM}
                onProbe={handleProbe}
                interactive
                revealReach={false}
                sweepKey={`hp-${act}-${canalDepthCm}`}
                reducedMotion={reducedMotion}
              />
              </div>
            </div>
          )}

          {/* Kedalaman kanal */}
          <div className={`-mx-2 rounded-2xl px-2 py-1.5 ${guide(0)}`}>
          <div className="flex items-baseline justify-between">
            <label htmlFor="kanal-depth" className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
              {CANAL_TEXT.depthLabel}
            </label>
            <span className="font-playfair text-xl italic text-white tabular-nums">
              {canalDepthCm === 0 ? "belum digali" : `${canalDepthCm} cm`}
            </span>
          </div>
          {/* Trek berwarna. `.water-slider` menyembunyikan trek bawaan peramban
              dan mengandalkan elemen di belakangnya, seperti di Modul 01 —
              tetapi di modul ini elemen itu tidak pernah dipasang, sehingga
              yang terlihat hanya bulatan putih tanpa jalur. Bagian yang sudah
              digali diwarnai seperti penggeser muka air Modul 01 — biru
              (basah) ke jingga (kering) — dan garis tegak menandai 100 cm
              yang diminta babak 01. */}
          <div className="relative mt-2">
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 via-amber-300 to-[#e8702a]"
                style={{ width: `${(canalDepthCm / (CANAL_DEPTH_MAX_M * 100)) * 100}%` }}
              />
            </div>
            <div
              className="pointer-events-none absolute top-1/2 h-4 w-px -translate-y-1/2 bg-white/70"
              style={{ left: `${(ACT1_DEPTH_CM / (CANAL_DEPTH_MAX_M * 100)) * 100}%` }}
              title={`${ACT1_DEPTH_CM} cm`}
            />
          <input
            id="kanal-depth"
            type="range"
            min={0}
            max={CANAL_DEPTH_MAX_M * 100}
            step={10}
            value={canalDepthCm}
            onChange={(e) => {
              setCanalDepthCm(Number(e.target.value));
              if (Number(e.target.value) > 0) setBlocked(false);
            }}
            aria-valuetext={`Kanal sedalam ${canalDepthCm} sentimeter`}
            className="water-slider relative z-10 w-full"
          />
          </div>
          </div>

          {/* Waktu — baru muncul pada babak 03, babak yang memang tentang waktu. */}
          {act >= TOOL_FROM.time && (
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">Waktu berjalan</p>
              <p className="mt-1 whitespace-nowrap font-playfair text-xl italic leading-none text-white">
                {formatYears(stats.years)}
                {stats.atTimeLimit && <span className="ml-2 font-sans text-[10px] not-italic text-white/40">batas model</span>}
              </p>
            </div>
            <div className={`flex shrink-0 gap-1 rounded-full border border-white/15 bg-black/30 p-1 ${guide(2)}`}>
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

          {/* Sekat & mulai ulang */}
          <div className="mt-3 flex flex-wrap gap-2">
            {act >= TOOL_FROM.weir && (
            <button
              type="button"
              onClick={() => setBlocked(true)}
              disabled={blocked || canalDepthCm === 0}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-full border border-emerald-300/35 bg-emerald-400/15 px-3.5 py-2 text-xs font-medium text-emerald-100 transition-colors hover:bg-emerald-400/25 disabled:cursor-not-allowed disabled:opacity-45 ${guide(3)}`}
            >
              <Waves size={14} />
              {blocked ? CANAL_TEXT.blockedLabel : CANAL_TEXT.blockLabel}
            </button>
            )}
  <button
              type="button"
              onClick={handleReset}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/20 px-3.5 py-2 text-xs font-medium text-white/75 transition-colors hover:border-white/40 hover:text-white"
            >
              <RotateCcw size={14} />
              {CANAL_TEXT.resetLabel}
            </button>
          </div>

        </div>
      </div>

      {/* Kolom kanan: grafik dan angka hidup.
          Sebelumnya kolom ini memuat juga lima baris keterangan skala, dan
          tumpukannya lebih tinggi daripada layar laptop, sehingga ia diberi
          gulir sendiri. Kotak yang bergulir di dalam halaman yang tidak
          bergulir membingungkan: pembaca tidak tahu ada isi di bawahnya, dan
          rodanya kadang menggulir kotak itu ketika ia hendak memperbesar
          gambar. Sekarang keterangan skala dilipat ke tombol "Skala gambar",
          sehingga kolom ini cukup pendek untuk tidak pernah perlu digulir. */}
      <div
        inert={hookOpen}
        className={`absolute bottom-6 right-5 top-14 hidden w-[236px] flex-col gap-3 lg:flex xl:right-10 [@media(min-height:801px)]:top-24 ${panelFade}`}
      >
        {/* Grafik satu kilometer. Ditempatkan di atas angka-angkanya, bukan di
            bawah, karena inilah yang menjawab pertanyaan babak 02 — angka
            "jangkauan rawan" di bawahnya hanya membacakan ulang satu titik
            dari kurva ini. */}
        <div className={`rounded-3xl border border-white/10 bg-black/45 p-3.5 backdrop-blur-xl [@media(min-height:769px)]:p-4 ${guide(1)}`}>
          <WaterTableChart
            sim={sim}
            stats={stats}
            probeM={probeM}
            onProbe={handleProbe}
            interactive={act === 1}
            revealReach={act !== 1}
            sweepKey={`${act}-${canalDepthCm}`}
            reducedMotion={reducedMotion}
          />
        </div>

        {/* `min-h-0` membolehkan kotak ini mengalah lebih dulu bila layar
            terlalu pendek, supaya panah lanjut di bawahnya tidak pernah
            terdorong keluar layar. */}
        <div className="relative min-h-0 rounded-3xl border border-white/10 bg-black/45 p-3.5 backdrop-blur-xl [@media(min-height:769px)]:p-4">
          <div className="mb-2 border-b border-white/10 pb-2 [@media(min-height:769px)]:mb-3 [@media(min-height:769px)]:pb-3">
            <p className="font-playfair text-2xl italic leading-none text-[#6fb6d8]">{current.fact.value}</p>
            <p className="mt-1.5 hidden text-[10px] leading-snug text-white/55 [@media(min-height:701px)]:block">
              {current.fact.caption}
            </p>
          </div>
          <dl className="space-y-2">
            {(
              [
                ["Muka air di tepi kanal", formatDrop(stats.waterAtCanalM), "Kedalaman air tanah tepat di samping kanal"],
                [
                  "Jangkauan rawan",
                  // Disembunyikan selama babak 02: itu jawaban yang sedang
                  // dicari pembaca di grafik tepat di atasnya.
                  act === 1 ? "cari di grafik" : stats.riskReachM > 0 ? formatDistance(stats.riskReachM) : "—",
                  "Sejauh ini dari kanal, gambut rawan terbakar",
                ],
                ["Permukaan turun", stats.maxSubsidenceM > 0.005 ? formatDrop(stats.maxSubsidenceM) : "—", "Tanah yang hilang karena gambut kering melesak"],
                ["Karbon terlepas", stats.emittedTPerHa >= 1 ? `${Math.round(stats.emittedTPerHa)} t/ha` : "—", "Ton karbon ke udara dari tiap hektare lahan"],
              ] as [string, string, string][]
            ).map(([label, value, meaning]) => (
              <div key={label}>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-[11px] text-white/50">{label}</dt>
                  <dd className="text-xs font-medium tabular-nums text-white">{value}</dd>
                </div>
                {/* Arti angkanya, hanya di layar yang cukup tinggi supaya
                    kolom ini tetap tidak perlu digulir. */}
                {/* Disembunyikan pula pada babak 02: grafik di atas memuat
                    tambahan bacaan penanda, dan tanpa ruang ini kolomnya lebih
                    tinggi daripada layar sehingga panah lanjut terdorong ke
                    luar. Artinya sudah dibaca pembaca pada babak 01. */}
                {act !== 1 && (
                  <p className="mt-0.5 hidden text-[10px] leading-snug text-white/35 [@media(min-height:801px)]:block">{meaning}</p>
                )}
              </div>
            ))}
          </dl>

          {/* Keterangan skala tetap wajib ada, hanya tidak lagi dibentangkan
              terus-menerus. Ia dibuka ke kiri, di atas gambar, supaya kolom
              ini tidak bertambah tinggi saat dibuka. */}
          <button
            type="button"
            onClick={() => setScaleOpen((v) => !v)}
            aria-expanded={scaleOpen}
            aria-controls="kanal-skala"
            className="mt-3 inline-flex cursor-pointer items-center gap-1.5 border-t border-white/10 pt-2.5 text-[10px] text-white/50 transition-colors hover:text-white"
          >
            <Info size={12} />
            Skala gambar
          </button>
          {scaleOpen && (
            <div
              id="kanal-skala"
              role="dialog"
              aria-label="Skala gambar"
              onKeyDown={(e) => e.key === "Escape" && setScaleOpen(false)}
              className="absolute bottom-0 right-full mr-3 w-64 rounded-2xl border border-white/15 bg-black/80 p-3.5 text-[11px] leading-snug text-white/70 shadow-2xl shadow-black/60 backdrop-blur-xl"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">Skala gambar</p>
                <button
                  type="button"
                  onClick={() => setScaleOpen(false)}
                  aria-label="Tutup keterangan skala"
                  className="cursor-pointer rounded-full p-0.5 text-white/50 hover:text-white"
                >
                  <X size={13} />
                </button>
              </div>
              <ul className="space-y-1.5">
                <li>{FIGURE_NOTE.block(NEAR_LENGTH_M)}. {FIGURE_NOTE.window(NEAR_LENGTH_M)}.</li>
                <li>{SCALE_NOTE.exaggeration(VERTICAL_EXAGGERATION)}.</li>
                <li>{SCALE_NOTE.canal(CANAL_LABEL_WIDTH_M)}.</li>
                <li>{SCALE_NOTE.trees}.</li>
                <li>
                  Garis jingga: batas {Math.round(WATER_LIMIT_M * 100)} cm. Waktu dibatasi {SIM_MAX_YEARS} tahun.
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Panah lanjut di layar lebar ikut mengalir di kolom ini, di bawah
            kotak angka. Sebelumnya ia dipasang sendiri di pojok kanan bawah,
            sementara kolom ini tumbuh ke bawah dari atas layar — keduanya
            tidak saling tahu, dan pada laptop 900 piksel teks arahannya
            tertindih kotak angka. Di dalam satu kolom, ruangnya dibagi:
            `mt-auto` mendorongnya ke dasar layar, dan ia tidak pernah dapat
            naik melewati kotak di atasnya. */}
        <div className="mt-auto shrink-0 self-end pt-2">{advance}</div>
      </div>

      {/* Navigasi babak (bawah) */}
      <nav inert={hookOpen} aria-label="Babak modul" className={`absolute bottom-6 left-5 flex items-end gap-4 sm:left-10 md:left-14 ${panelFade}`}>
        <div className="flex gap-2">
          {KANAL_ACTS.map((a, i) => {
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
                {/* Sama dengan Modul 01, 03, dan 04: putih untuk babak yang
                    sedang dibuka, jingga untuk babak yang sudah dilewati.
                    "Sudah dilewati" dihitung dari urutannya, bukan dari
                    `actDone`: syarat itu dihitung ulang dari keadaan sekarang,
                    jadi mendangkalkan kanal di babak 03 akan memudarkan
                    babak 01 seolah pekerjaannya batal. */}
                <span
                  className={`h-0.5 w-14 rounded-full transition-colors duration-500 ${
                    i === act ? "bg-white" : i < act ? "bg-[#e8702a]" : locked ? "bg-white/12" : "bg-white/20 group-hover:bg-white/50"
                  }`}
                />
                <span className={`text-[11px] tabular-nums transition-colors ${i === act ? "text-white" : "text-white/40"}`}>
                  {a.number}
                </span>
              </button>
            );
          })}
        </div>

        {/* Di ponsel tombolnya tetap muncul hanya saat terbuka: lebar layar
            tidak cukup untuk tombol terkunci beserta arahannya di samping
            penanda babak, dan arahannya sudah ada di kartu tugas. */}
        {canAdvance && (
          <button
            type="button"
            onClick={() => goToAct(act + 1)}
            className="group mb-1 inline-flex md:hidden cursor-pointer items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur-md transition-colors hover:bg-white/20"
          >
            Babak berikutnya
          </button>
        )}
      </nav>

      {/* Panah lanjut (kanan bawah), sama dengan Modul 01 dan 03.
          Sebelumnya tombol lanjut baru muncul setelah tugasnya selesai, jadi
          pembaca yang belum selesai tidak melihat tanda apa pun bahwa ada
          babak berikutnya dan bahwa sesuatu harus dikerjakan untuk sampai ke
          sana. Panah ini selalu terlihat: terkunci dengan arahan, atau
          terbuka dengan nama babak yang menunggu. */}
      {/* Di layar lebar panah ini tinggal di kolom kanan; lihat di sana. */}
      <div inert={hookOpen} className={`absolute bottom-6 right-5 hidden sm:right-10 md:block lg:hidden ${panelFade}`}>
        {advance}
      </div>
    </div>
  );
}
