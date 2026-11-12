"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { MousePointer2, MousePointerClick, Rotate3d, Volume2, VolumeX } from "lucide-react";
import { BARA_ACTS, BARA_HOOK, IGNITION_SOURCES, SUPPRESSION_TEXT, TIME_SPEEDS, type IgnitionSource, type ViewMode } from "@/config/bara-content";
import { BACK_TO_MODULE_LIST, moduleAt } from "@/config/modules-content";
import { resurfacingSettled, SmolderSim, type SmolderStats } from "@/lib/smolder";
import { AmbientSound } from "@/lib/ambientSound";
import IgnitionPicker from "./IgnitionPicker";
import ControlDock, { WATER_MAX_CM } from "./ControlDock";
import StatsPanel from "./StatsPanel";
import ProbeCard, { type ProbeResult } from "./ProbeCard";
import SummaryCard from "./SummaryCard";
import LayerHint from "./LayerHint";
import ModuleHook from "@/components/gambut/ModuleHook";
import StepAdvance from "@/components/gambut/StepAdvance";
import type { SharedBurn } from "@/lib/baraCard";
import { createBaraState, MAX_ROTATION, type BaraState, type Quality } from "./scene/baraState";
import type { LayerHintHandle } from "./scene/layerHint";

gsap.registerPlugin(useGSAP);

// Kanvas 3D dimuat terpisah (tanpa SSR) agar halaman awal tetap ringan.
const BaraScene = dynamic(() => import("./scene/BaraScene"), { ssr: false });

// Diambil lewat alamatnya, bukan urutannya, supaya urutan modul dapat diubah.
const MODULE = moduleAt("/modul/bara");

/**
 * Muka air tanah awal (cm): sedalam yang terendah pada catatan 1993–2002 di
 * hutan rawa gambut Palangka Raya, 94–98 cm (Usup dkk., 2004, Gbr. 5).
 */
const START_WATER_CM = 95;

/**
 * Kecepatan waktu awal tiap babak (indeks pada TIME_SPEEDS).
 *
 * "Lambat", bukan "Sedang": dengan laju rambat lapangan, bara pada bongkahan
 * selebar 4,4 m habis sendiri dalam beberapa hari simulasi, jadi pada kecepatan
 * yang lebih tinggi ia sudah padam sebelum pembaca selesai membaca babaknya.
 */
const ACT_SPEED = [0, 1, 1, 1];

/** Jam simulasi saat waktu dihentikan otomatis pada dua babak pertama. */
const FIRST_PAUSE_HOURS = 48;

/**
 * Jeda sebelum kartu hasil muncul di layar sempit (milidetik): cukup untuk
 * melihat bara terakhir mendingin dan membaca satu baris pesan hasilnya.
 */
const SUMMARY_DELAY_MS = 4000;

/** Lebar layar (piksel) mulai dari mana kartu hasil tidak lagi menutupi bongkahan. */
const NARROW_MAX = 768;

/**
 * Lama waktu berhenti sesudah penyiraman (milidetik). Pada kecepatan "Lambat"
 * air siraman menguap dalam ± 25 detik nyata, dan bara langsung merambat naik
 * lagi. Tanpa jeda, saat permukaan padam terlewat begitu saja, padahal itulah
 * separuh pertama dari pelajaran babak ini: dari atas tampak padam.
 */
const DOUSE_PAUSE_MS = 4000;

/** Jarak usapan ke atas yang menutup layar pembuka di layar sentuh (piksel). */
const HOOK_SWIPE = 30;

/** Syarat lulus tiap babak, dibaca dari keadaan simulasi & tindakan pembaca. */
const ACT_HINT = [
  "Sulut permukaan untuk melanjutkan.",
  "Butuh dua hari perjalanan waktu untuk melanjutkan.",
  "Siram, buka termal, lalu tunggu permukaan menyala lagi.",
  "Naikkan muka air tanah sampai seluruh bara padam.",
];

/**
 * Modul 03 — Bara di Bawah Tanah.
 *
 * Berbeda dari Modul 01 yang bercerita mengikuti gulir halaman, modul ini
 * adalah ruang uji: bongkahan gambut dipotong sehingga penampangnya menghadap
 * pembaca, lalu pembaca sendiri yang menyulut, memajukan waktu, mencoba
 * memadamkan, dan akhirnya membasahi gambutnya kembali. Tiap tindakan langsung
 * mengubah simulasi bara (`lib/smolder.ts`) yang digambar pada penampang.
 */
export default function BaraModule({ shared }: { shared: SharedBurn | null }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const dockStackRef = useRef<HTMLDivElement>(null);

  // Simulasi dibuat sekali dan dipakai bersama antarmuka & adegan 3D.
  const sim = useMemo(() => {
    const instance = new SmolderSim();
    instance.setWaterTable(START_WATER_CM / 100);
    return instance;
  }, []);

  const [hookOpen, setHookOpen] = useState(true);
  const [act, setAct] = useState(0);
  const [stats, setStats] = useState<SmolderStats>(() => sim.stats);
  const [source, setSource] = useState<IgnitionSource | null>(null);
  const [ignited, setIgnited] = useState(false);
  const [fizzled, setFizzled] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [waterCm, setWaterCm] = useState(START_WATER_CM);
  const [view, setView] = useState<ViewMode>("permukaan");
  const [probe, setProbe] = useState<ProbeResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dousedOnce, setDousedOnce] = useState(false);
  const [thermalSeen, setThermalSeen] = useState(false);
  const [rewetOnce, setRewetOnce] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [summaryReady, setSummaryReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [quality, setQuality] = useState<Quality>("high");
  const handleOverload = useCallback(() => setQuality("low"), []);
  const [soundOn, setSoundOn] = useState(false);

  const stateRef = useRef<BaraState>(createBaraState(START_WATER_CM / 100));
  const hintRef = useRef<LayerHintHandle>(null);
  const pausedOnce = useRef(false);
  const announced = useRef({ collapse: false, resurface: false, rekindle: false });

  // Salurkan keadaan antarmuka ke adegan 3D (dibaca tiap bingkai).
  useEffect(() => {
    Object.assign(stateRef.current, {
      act,
      view,
      hoursPerSecond: TIME_SPEEDS[speedIndex].hoursPerSecond,
      waterM: waterCm / 100,
      reducedMotion,
      hookOpen,
    });
  }, [act, view, speedIndex, waterCm, reducedMotion, hookOpen]);

  // Halaman ini dikunci setinggi layar, jadi tidak ada gulir sungguhan yang
  // bisa ditangkap seperti di Modul 01. Gerakannya dibaca langsung.
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

  // Suara suasana: derak bara menguat seiring luas gambut yang terbakar.
  const soundRef = useRef<AmbientSound | null>(null);
  const toggleSound = () => {
    if (!soundRef.current) soundRef.current = new AmbientSound();
    setSoundOn((on) => !on);
  };
  useEffect(() => {
    const sound = soundRef.current;
    if (!sound) return;
    if (soundOn && visible) void sound.start();
    else sound.stop();
  }, [soundOn, visible]);
  useEffect(() => {
    soundRef.current?.setDanger(Math.min(1, stats.active / 90 + stats.consumed * 0.5));
  }, [stats.active, stats.consumed]);
  useEffect(() => () => soundRef.current?.dispose(), []);

  // Teks babak masuk dengan gerak naik-dan-menjernih setiap kali babak berganti.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".act-anim",
          { opacity: 0, y: 22, filter: "blur(10px)" },
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9, stagger: 0.07, ease: "expo.out" },
        );
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(".act-anim", { opacity: 1, y: 0, filter: "none" });
      });
    },
    // Ikut menunggu layar pembuka, agar gerak masuknya tidak habis di balik layar itu.
    { scope: textRef, dependencies: [act, hookOpen], revertOnUpdate: true },
  );

  // Ukur pita kosong di antara panel cerita (atas) dan panel kendali beserta
  // arahan di atasnya (bawah), lalu serahkan ke label 3D agar label hanya
  // tampil di sana. Diukur dengan offsetTop/offsetHeight, bukan
  // getBoundingClientRect, supaya gerak masuk teks (geser naik) tidak ikut
  // terhitung. ResizeObserver menangkap tiap perubahan tinggi: pesan yang
  // muncul, babak yang berganti, atau layar yang diputar.
  useEffect(() => {
    const story = storyRef.current;
    const dock = dockRef.current;
    const stack = dockStackRef.current;
    if (!story || !dock || !stack) return;
    const GAP = 8;
    const measure = () => {
      const top = story.offsetTop + story.offsetHeight + GAP;
      const bottom = Math.min(dock.offsetTop + stack.offsetTop, dock.offsetTop) - GAP;
      // Bila pitanya habis, tetap diserahkan: tidak ada label yang lolos
      // saringan, dan itu lebih baik daripada label yang menindih teks.
      stateRef.current.labelBand = { top, bottom };
    };
    measure();
    const observer = new ResizeObserver(measure);
    [story, dock, stack].forEach((el) => observer.observe(el));
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Pesan kejadian (hasil penyiraman, atap runtuh) hilang sendiri.
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 11000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const current = BARA_ACTS[act];

  // --- Tindakan pembaca -----------------------------------------------------

  const handleSelectSource = useCallback((next: IgnitionSource) => {
    setSource(next);
    setFizzled(false);
  }, []);

  /** Klik permukaan pada babak 01: sulut di titik itu. */
  const handleSurfaceClick = useCallback(
    (xFraction: number) => {
      if (act !== 0) return;
      const chosen = source ?? IGNITION_SOURCES[0];
      if (!source) setSource(chosen);
      const x = Math.min(0.92, Math.max(0.08, xFraction));
      const s = stateRef.current;
      s.flameX = x;
      s.flame = 1;
      s.flameDecay = 1 / chosen.flameSeconds;
      // Api yang cepat lewat tetap terlihat menyala, tetapi tidak menyulut gambut.
      if (!chosen.holdsHeat) {
        setFizzled(true);
        setMessage(chosen.after);
        return;
      }
      setFizzled(false);
      const lit = sim.ignite(x);
      if (!lit) {
        setMessage("Gambut di titik itu masih terlalu basah untuk menyala. Turunkan muka air tanah lebih dulu.");
        return;
      }
      setIgnited(true);
      setMessage(chosen.after);
      // Waktu mulai berjalan sendiri agar pembaca langsung melihat akibatnya.
      setSpeedIndex(ACT_SPEED[1]);
      setStats({ ...sim.stats });
    },
    [act, sim, source],
  );

  /** Klik satu titik pada penampang: tampilkan keadaannya. */
  const handleProbe = useCallback(
    (col: number, row: number) => {
      if (act === 0) return;
      const result = sim.probe(col, row);
      setProbe({
        state: result.state,
        depth: result.depth,
        layer: result.layer,
        moisture: result.moisture,
        temperature: result.temperature,
      });
    },
    [act, sim],
  );

  const dousePause = useRef<number | null>(null);
  const handleDouse = useCallback(() => {
    sim.douseSurface();
    setStats({ ...sim.stats });
    stateRef.current.spray = 1;
    setDousedOnce(true);
    announced.current.rekindle = false;
    setMessage(SUPPRESSION_TEXT.douse.result);
    // Waktu berhenti sebentar supaya permukaan yang padam sempat dilihat,
    // lalu berjalan lagi dengan kecepatan yang sedang dipakai pembaca.
    // Bila pembaca mengubah kecepatan selama jeda, pilihannya yang dipakai.
    const resume = speedIndex === 0 ? ACT_SPEED[2] : speedIndex;
    if (dousePause.current !== null) window.clearTimeout(dousePause.current);
    setSpeedIndex(0);
    dousePause.current = window.setTimeout(() => {
      dousePause.current = null;
      setSpeedIndex((now) => (now === 0 ? resume : now));
    }, DOUSE_PAUSE_MS);
  }, [sim, speedIndex]);
  useEffect(() => () => {
    if (dousePause.current !== null) window.clearTimeout(dousePause.current);
  }, []);

  const handleRewet = useCallback(() => {
    // Muka air dinaikkan sampai di atas bara terdalam, dengan batas aman 40 cm.
    setWaterCm(30);
    stateRef.current.spray = 1;
    setRewetOnce(true);
    setMessage(SUPPRESSION_TEXT.rewet.result);
  }, []);

  const handleView = useCallback((next: ViewMode) => {
    setView(next);
    if (next === "termal") setThermalSeen(true);
  }, []);

  const handleReset = useCallback(() => {
    if (dousePause.current !== null) window.clearTimeout(dousePause.current);
    dousePause.current = null;
    sim.reset();
    sim.setWaterTable(START_WATER_CM / 100);
    setStats({ ...sim.stats });
    setAct(0);
    setSource(null);
    setIgnited(false);
    setFizzled(false);
    setSpeedIndex(0);
    pausedOnce.current = false;
    announced.current = { collapse: false, resurface: false, rekindle: false };
    setWaterCm(START_WATER_CM);
    setView("permukaan");
    setProbe(null);
    setMessage(null);
    setDousedOnce(false);
    setThermalSeen(false);
    setRewetOnce(false);
    setCollapsed(false);
    setSummaryReady(false);
    Object.assign(stateRef.current, createBaraState(START_WATER_CM / 100));
  }, [sim]);

  // --- Syarat lanjut tiap babak --------------------------------------------

  /**
   * Panel kendali ikut tumbuh tiap babak: mulai babak 03 sakelar tampilan dan
   * tombol pemadaman ikut tampil, jadi panel yang ditambatkan ke tepi bawah
   * menjulang 403 px — hampir dua kali tinggi panel babak 02.
   *
   * Teks cerita ditambatkan ke tepi atas, panel ke tepi bawah, sehingga pada
   * layar pendek keduanya bertemu di tengah. Diukur sebelum diperbaiki: pada
   * 1600×900 babak 03 tertindih 43 px dan babak 04 tertindih 110 px; pada
   * 1366×768 — ukuran laptop yang paling umum — tindihnya 53, 175, dan 242 px.
   * Ponsel justru aman, karena di sana paragraf pengantar memang sudah
   * disembunyikan.
   *
   * Bendera ini yang memberi tahu teks seberapa sempit ruangnya: ambang tinggi
   * layarnya sendiri tidak tahu babak mana yang sedang tampil.
   */
  const dense = act >= 2;

  /** Semua panel disembunyikan selama layar pembuka tampil, sama dengan Modul 01. */
  const panelFade = `transition-opacity duration-700 ${hookOpen ? "opacity-0" : "opacity-100"}`;

  const actDone = [
    ignited,
    ignited && stats.hours >= 48,
    dousedOnce && thermalSeen && resurfacingSettled(stats),
    stats.extinguished && rewetOnce,
  ];
  const finished = act === BARA_ACTS.length - 1 && stats.extinguished;

  // Kartu hasil menunggu sebentar di layar sempit. Di sana kartu itu
  // menggantikan panel kendali dan cukup tinggi untuk menutupi bagian bawah
  // bongkahan. Uji di ponsel sungguhan menunjukkan kartu yang langsung muncul
  // merebut saat bara padam, padahal itulah jawaban modul ini. Selama jeda,
  // pesan hasil pembasahan tetap tampil di panel cerita. Di layar lebar kartu
  // duduk di kolom kiri dan tidak menutupi bongkahan, jadi tampil langsung.
  useEffect(() => {
    if (!finished) return;
    const narrow = window.matchMedia(`(max-width: ${NARROW_MAX - 1}px)`).matches;
    const timer = window.setTimeout(() => setSummaryReady(true), narrow ? SUMMARY_DELAY_MS : 0);
    return () => window.clearTimeout(timer);
  }, [finished]);
  const showSummary = finished && summaryReady;

  /**
   * Pesan kejadian yang ditampilkan di panel cerita pada ponsel. Pada babak 01
   * hasil penyulutan sudah tertulis di kartu "Cara api membakar", jadi pesan
   * yang sama tidak diulang di atas.
   */
  const phoneMessage = message !== null && !showSummary && !(act === 0 && (ignited || fizzled));

  const goToAct = (next: number) => {
    if (next > act && !actDone[act]) return;
    setAct(next);
    setProbe(null);
    setSpeedIndex(ACT_SPEED[next]);
    // Babak "tak terlihat dari atas" selalu dimulai dari tampilan permukaan.
    if (next === 2) setView("permukaan");
  };

  /** Panah lanjut: ke babak berikutnya, lalu kembali ke daftar modul pada babak terakhir. */
  const advance =
    act < BARA_ACTS.length - 1 ? (
      <StepAdvance
        nextTitle={BARA_ACTS[act + 1].title}
        label="Babak berikutnya"
        hint={ACT_HINT[act]}
        locked={!actDone[act]}
        onAdvance={() => goToAct(act + 1)}
      />
    ) : (
      <StepAdvance {...BACK_TO_MODULE_LIST} />
    );

  // Seret mendatar untuk memutar diorama, sama dengan Modul 01. Jarak tempuhnya
  // disimpan agar penangan klik di dalam adegan dapat membedakan seretan dari
  // ketukan.
  const drag = useRef<{ x: number; y: number; start: number } | null>(null);
  const handleDragStart = useCallback((e: React.PointerEvent) => {
    stateRef.current.dragMoved = 0;
    if (e.pointerType === "touch") return;
    stateRef.current.dragging = true;
    drag.current = { x: e.clientX, y: e.clientY, start: stateRef.current.rotation };
  }, []);
  const handleDragMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    // Jarak tempuh diukur pada kedua arah; menyeret tegak pun bukan ketukan.
    stateRef.current.dragMoved = Math.max(stateRef.current.dragMoved, Math.hypot(dx, dy));
    stateRef.current.rotation = Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, d.start + dx * 0.005));
  }, []);
  const handleDragEnd = useCallback(() => {
    drag.current = null;
    stateRef.current.dragging = false;
  }, []);

  // Sampai hari ke-2, waktu berhenti sendiri supaya pembaca sempat pindah babak
  // selagi baranya masih hidup. Sekali saja, jadi pembaca tetap bisa melanjutkan.
  const handleStats = useCallback((next: SmolderStats) => {
    setStats(next);
    if (!pausedOnce.current && stateRef.current.act <= 1 && next.hours >= FIRST_PAUSE_HOURS) {
      pausedOnce.current = true;
      setSpeedIndex(0);
    }
    if (next.collapseX !== null && !announced.current.collapse) {
      announced.current.collapse = true;
      setCollapsed(true);
      setMessage(SUPPRESSION_TEXT.collapse);
    }
    if (next.resurfaceX !== null && !announced.current.resurface) {
      announced.current.resurface = true;
      setMessage(SUPPRESSION_TEXT.resurface);
    }
    if (next.rekindleX !== null && !announced.current.rekindle) {
      announced.current.rekindle = true;
      setMessage(SUPPRESSION_TEXT.rekindle);
    }
  }, []);
  const handleReady = useCallback(() => setReady(true), []);

  return (
    <div ref={rootRef} id="modul-bara" className="relative h-[100dvh] w-full overflow-hidden bg-[#050505]">
      {/* Lapisan 3D. Seretan tetikus memutar diorama; sentuhan tidak memutar,
          sama dengan Modul 01. */}
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        onPointerLeave={handleDragEnd}
      >
        {mounted && (
          <BaraScene
            sim={sim}
            stateRef={stateRef}
            hint={hintRef}
            active={visible}
            quality={quality}
            onOverload={handleOverload}
            onStats={handleStats}
            onProbe={handleProbe}
            onSurfaceClick={handleSurfaceClick}
            onReady={handleReady}
          />
        )}
      </div>

      <ModuleHook
        open={hookOpen}
        kicker={`Modul ${MODULE.number} · ${MODULE.title}`}
        setup={BARA_HOOK.setup}
        question={BARA_HOOK.question}
        cta={BARA_HOOK.cta}
        scrollHint={BARA_HOOK.scrollHint}
        lead={shared ? BARA_HOOK.sharedLead(shared.cm) : null}
        onStart={() => setHookOpen(false)}
      />

      {/* Tirai pemuatan */}
      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-[#050505] transition-opacity duration-1000 ${
          ready ? "opacity-0" : "opacity-100"
        }`}
        aria-hidden={ready}
      >
        {!hookOpen && <p className="animate-pulse text-xs uppercase tracking-[0.25em] text-white/40">Membuka penampang gambut…</p>}
      </div>

      {/* Gradasi agar teks tetap terbaca di atas model */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r from-black/80 via-black/35 to-transparent md:w-[60%]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/55 to-transparent" />
      {/* Peredup tambahan khusus layar sempit. Di layar lebar teks cerita duduk
          di kolom kirinya sendiri, tetapi di ponsel ia melebar sampai ke atas
          diorama; tanpa peredup ini angka kunci dan keterangannya jatuh tepat
          di atas dedaunan dan tidak terbaca. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[46%] bg-gradient-to-b from-black/85 via-black/55 to-transparent md:hidden" />
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[30%] bg-gradient-to-l from-black/55 via-black/12 to-transparent lg:block" />
      {/* Peredup tepi bawah, secukupnya agar panel kendali dan navigasi babak
          tetap terbaca di atas diorama.
          Dahulu pekat sampai hitam penuh setinggi 40% layar, karena di
          bawahnya ada footer hitam yang harus disambung. Footer itu sudah
          tidak ada sejak halaman dikunci setinggi layar, sehingga peredup
          sepekat itu hanya menggelapkan bagian bawah bongkahan tanpa guna. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/70 to-transparent" />

      {/* Panel cerita babak (kiri atas) */}
      {/* Panel cerita babak (kiri atas).
          Ambang tingginya memakai min-height, bukan max-height: yang ditulis
          adalah "tampilkan bila layarnya cukup tinggi", sehingga keadaan
          sempit menjadi keadaan dasar dan tidak ada rentang tinggi yang
          terlewat tanpa penanganan. */}
      <div ref={storyRef} inert={hookOpen} className={`pointer-events-none absolute left-5 right-5 top-14 sm:left-10 sm:top-14 md:left-14 md:right-auto md:max-w-[404px] [@media(min-height:651px)]:top-16 [@media(min-height:651px)]:sm:top-20 [@media(min-height:901px)]:top-20 [@media(min-height:901px)]:sm:top-24 ${panelFade}`}>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/50">
          Modul {MODULE.number} · {MODULE.title}
        </p>
        <div ref={textRef} key={act} aria-live="polite">
          <p className="act-anim mt-2 text-[11px] uppercase tracking-[0.2em] text-[#f0a060] [@media(min-height:901px)]:mt-3">
            Babak {current.number}
          </p>
          <h1
            className="act-anim mt-1 font-playfair text-3xl italic leading-[1.02] text-white [@media(min-height:651px)]:text-4xl [@media(min-height:901px)]:sm:text-5xl"
            style={{ letterSpacing: "-0.03em" }}
          >
            {current.title}
          </h1>
          {/* Paragraf pengantar adalah balok tertinggi di panel ini (± 120 px).
              Di ponsel ia memang sudah tidak pernah tampil, dan judul, tugas,
              serta angka kunci sudah menyampaikan isi babaknya — jadi pada
              layar pendek yang panelnya menjulang, inilah yang dilepas lebih
              dulu. Ambangnya lebih longgar untuk babak 02 yang panelnya masih
              pendek. */}
          <p
            className={`act-anim mt-2 hidden text-sm leading-snug text-white/75 [@media(min-height:901px)]:mt-3 [@media(min-height:901px)]:leading-relaxed ${
              dense ? "[@media(min-height:861px)]:sm:block" : "[@media(min-height:701px)]:sm:block"
            }`}
          >
            {current.body}
          </p>
          {/* Inti penjelasan, tepat pada tinggi layar yang tidak memuat paragraf
              di atasnya, jadi selalu ada satu penjelasan yang terbaca. Pada
              babak padat ia menggantikan baris tugas, yang bunyinya sudah sama
              dengan arahan di atas panah lanjut, sehingga tingginya tidak
              bertambah dan tidak menyentuh panel kendali. */}
          <p
            className={`act-anim mt-2 hidden text-sm leading-snug text-white/80 ${showSummary || phoneMessage ? "" : "max-sm:block"} ${
              dense ? "[@media(max-height:860px)]:sm:block" : "[@media(max-height:700px)]:sm:block"
            }`}
          >
            {current.lead}
          </p>
          {/* Pesan kejadian di ponsel. Uji di ponsel sungguhan menunjukkan
              kotak pesan yang melayang di atas panah lanjut jatuh tepat di
              tengah bongkahan dan menutupi bara yang sedang dibahasnya. Di
              sini ia menggantikan sementara inti penjelasan dan baris tugas
              (yang bunyinya sudah ada pada arahan di atas panah lanjut), jadi
              tinggi panel hampir tidak berubah dan diorama tetap terbuka. */}
          {phoneMessage && (
            <p className="mt-2 border-l-2 border-[#e8702a]/70 pl-3 text-sm leading-snug text-white/90 sm:hidden">{message}</p>
          )}
          <p
            className={`act-anim mt-2 inline-flex items-start gap-2 text-xs leading-relaxed text-white/90 [@media(min-height:901px)]:mt-3 ${
              dense ? "[@media(max-height:860px)]:sm:hidden" : ""
            } ${showSummary || phoneMessage ? "max-sm:!hidden" : ""}`}
          >
            <MousePointerClick size={14} className="mt-0.5 shrink-0 text-[#f0a060]" />
            {current.task}
          </p>
          {/* Angka kunci, hanya untuk lebar di bawah lg.
              Mulai lg ia tampil di panel angka sebelah kanan, yang punya
              ruang tegaknya sendiri — di sanalah ia sekarang benar-benar
              terbaca pada babak 03 dan 04. Di bawah lg panel kanan tidak ada,
              jadi angkanya tetap disediakan di sini selama layarnya cukup
              tinggi.

              Ambang babak padat sengaja dibiarkan setinggi 1011 px, yang
              artinya pada babak 03 dan 04 di bawah lg angkanya praktis tidak
              tampil. Diukur: pada layar selebar itu, paragraf pengantar dan
              angka kunci tidak pernah muat bersama panel kendali yang
              menjulang — ambang 821 px sempat dicoba dan justru menindih
              15–24 px di rentang 861–900 px, tempat paragrafnya ikut muncul.
              Yang dipertahankan paragrafnya, sama seperti keputusan di atas:
              ia yang menjelaskan babaknya. */}
          <div
            className={`act-anim mt-3 hidden items-baseline gap-4 border-t border-white/10 pt-3 [@media(min-height:901px)]:mt-4 [@media(min-height:901px)]:pt-4 ${
              dense ? "[@media(min-height:1011px)]:sm:max-lg:flex" : "[@media(min-height:760px)]:sm:max-lg:flex"
            }`}
          >
            <span className="shrink-0 font-playfair text-2xl italic text-[#f0a060]">{current.fact.value}</span>
            <span className="text-[11px] leading-relaxed text-white/55">{current.fact.caption}</span>
          </div>
        </div>
      </div>

      {/* Panel kendali (kiri bawah) */}
      {/* Pada layar sangat pendek panel merapat ke tepi bawah. Navigasi babak
          berakhir di 54 px dari dasar, jadi 56 px masih bersih tanpa saling
          menindih. Di layar sempit navigasi itu tidak ada, jadi panelnya turun
          dan panah lanjut duduk di atasnya, sama dengan Modul 01. */}
      <div ref={dockRef} inert={hookOpen} className={`absolute bottom-6 left-5 right-5 z-30 sm:left-10 md:bottom-14 md:left-14 md:right-auto md:w-[404px] [@media(min-height:651px)]:md:bottom-20 ${panelFade}`}>
        <div ref={dockStackRef} className="pointer-events-none absolute bottom-full left-0 right-0 mb-3 flex flex-col items-end gap-2">
          {/* Kolom kanan tidak ada di bawah lg, jadi pesannya tampil di sini.
              Di ponsel pesannya sudah pindah ke panel cerita di atas. */}
          {message && !showSummary && (
            <p className="hidden w-full rounded-2xl border border-[#e8702a]/30 bg-black/80 p-3 text-xs leading-relaxed text-white/85 sm:block lg:hidden">{message}</p>
          )}
          <div className="pointer-events-auto md:hidden">{advance}</div>
        </div>
        {showSummary ? (
          <SummaryCard stats={stats} onReset={handleReset} />
        ) : probe ? (
          <ProbeCard probe={probe} onClose={() => setProbe(null)} />
        ) : act === 0 ? (
          <IgnitionPicker selected={source?.id ?? null} onSelect={handleSelectSource} ignited={ignited} fizzled={fizzled} />
        ) : (
          <ControlDock
            hours={stats.hours}
            speedIndex={speedIndex}
            onSpeed={setSpeedIndex}
            waterCm={waterCm}
            onWater={setWaterCm}
            showDouse={act >= 2}
            onDouse={handleDouse}
            dousing={stats.surfaceSmoke < 0.02 && dousedOnce && act === 2}
            showRewet={act >= 3}
            onRewet={handleRewet}
            view={view}
            onView={handleView}
            urgeThermal={dousedOnce && !thermalSeen}
          />
        )}
      </div>

      {/* Kolom kanan: angka hidup, keterangan warna, dan pesan kejadian.
          Satu tumpukan yang ditambatkan ke tepi atas, bukan dua kotak yang
          masing-masing ditambatkan ke tepi berlawanan. Dahulu pesan kejadian
          duduk di tepi bawah, sehingga pada layar pendek ia bertemu panel
          angka di tengah — pada 1280×600 keduanya bertindih 136 px. Dengan
          satu tumpukan, keduanya tidak mungkin lagi saling menindih, dan
          pesannya pun kini muncul berdampingan dengan angka yang dibahasnya. */}
      <div inert={hookOpen} className={`absolute right-5 top-32 hidden w-[236px] flex-col gap-3 lg:flex xl:right-10 ${panelFade}`}>
        <StatsPanel stats={stats} fact={current.fact} compact={message !== null} />
        {message && (
          <div className="pointer-events-none rounded-2xl border border-[#e8702a]/30 bg-black/60 p-3.5 backdrop-blur-xl">
            <p className="text-xs leading-relaxed text-white/85">{message}</p>
          </div>
        )}
      </div>

      {/* Navigasi babak (kiri bawah) */}
      <nav
        inert={hookOpen}
        aria-label="Babak modul"
        className={`absolute bottom-6 left-5 hidden gap-2 sm:left-10 md:left-14 md:flex [@media(min-height:651px)]:bottom-8 ${panelFade}`}
      >
        {BARA_ACTS.map((a, i) => {
          const shut = i > act && !actDone[act];
          return (
            <button
              key={a.number}
              type="button"
              onClick={() => goToAct(i)}
              disabled={shut}
              aria-current={i === act ? "step" : undefined}
              title={shut ? ACT_HINT[act] : a.title}
              className={`group flex flex-col items-start gap-2 text-left ${shut ? "cursor-not-allowed" : "cursor-pointer"}`}
            >
              <span
                className={`h-0.5 w-14 rounded-full transition-colors duration-500 ${
                  i === act ? "bg-white" : actDone[i] ? "bg-[#e8702a]" : shut ? "bg-white/12" : "bg-white/20 group-hover:bg-white/50"
                }`}
              />
              <span className={`text-[11px] tabular-nums transition-colors ${i === act ? "text-white" : "text-white/40"}`}>{a.number}</span>
            </button>
          );
        })}
      </nav>

      {/* Kanan bawah: petunjuk interaksi, tombol suara, dan panah lanjut */}
      <div
        inert={hookOpen}
        className={`absolute bottom-6 right-5 flex items-end gap-4 text-[11px] text-white/60 sm:bottom-8 sm:right-10 xl:right-14 ${panelFade}`}
      >
        {/* Baru tampil pada layar lebar; di bawah itu ia menabrak panel kendali. */}
        <div className="pointer-events-none hidden items-center gap-4 pb-2 xl:flex">
          <span className="inline-flex items-center gap-1.5">
            <Rotate3d size={14} /> Seret untuk memutar
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MousePointer2 size={14} /> Arahkan ke tanah
          </span>
        </div>
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={soundOn}
          className={`hidden cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 backdrop-blur-md transition-colors md:inline-flex ${
            soundOn ? "border-white/40 bg-white/15 text-white" : "border-white/20 bg-black/30 text-white/70 hover:text-white"
          }`}
        >
          {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
          Suara alam
        </button>
        <div className="hidden md:block">{advance}</div>
      </div>

      {/* Ditaruh paling akhir agar tidak ikut tergelapkan peredup di atas kanvas. */}
      <LayerHint ref={hintRef} />

      {/* Peringatan bila muka air dinaikkan melebihi jangkauan pengatur */}
      <span className="sr-only">
        Rentang pengatur muka air tanah 0 sampai {WATER_MAX_CM} sentimeter. Tanah amblas: {collapsed ? "sudah terjadi" : "belum"}.
      </span>
    </div>
  );
}
