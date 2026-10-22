"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { MousePointer2, Rotate3d, Volume2, VolumeX } from "lucide-react";
import { ANATOMI_STEPS, GAMBUT_MODULES } from "@/config/gambut-content";
import { formatYears, getFireDanger, PEAT_LAYERS, PEAT_MAX_YEARS, type PeatLayerId } from "@/lib/peat";
import { AmbientSound } from "@/lib/ambientSound";
import DepthLegend from "./DepthLegend";
import GrowthControl from "./GrowthControl";
import LayerDetail from "./LayerDetail";
import StepAdvance from "./StepAdvance";
import WaterControl from "./WaterControl";
import { EXPLODE_STEP, GROWTH_STEP, INTERACTIVE_STEP, MAX_ROTATION, type Quality, type SceneState } from "./scene/sceneState";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// Kanvas 3D dimuat terpisah (tanpa SSR) agar tidak membebani halaman awal.
const PeatScene = dynamic(() => import("./scene/PeatScene"), { ssr: false });

const STEP_COUNT = ANATOMI_STEPS.length;

/** Muka air tanah (cm) yang ditampilkan otomatis pada tahap non-interaktif. */
const STEP_WATER_CM = [15, 15, 4];

/** Nilai awal pengatur & sasaran demo otomatis pada tahap interaktif. */
const DEFAULT_WATER_CM = 15;
const DEMO_WATER_CM = 62;

/**
 * Sasaran demo otomatis pada tahap pertumbuhan (tahun).
 *
 * Sengaja berhenti jauh sebelum penuh. Demo hanya bertugas memperlihatkan
 * bahwa waktu dapat digeser dan bongkahannya memang tumbuh; sisa perjalanan
 * sampai 2.800 tahun ditinggalkan untuk pembaca, karena babak ini tidak boleh
 * tetap bermakna bila aksinya dihapus.
 */
const DEMO_YEARS = 620;

const MODULE = GAMBUT_MODULES[0];

/** Modul sesudah ini; menjadi tujuan panah pada tahap terakhir. */
const NEXT_MODULE = GAMBUT_MODULES[1];

/**
 * Arahan tiap tahap: apa yang harus dikerjakan pembaca sebelum tahap
 * berikutnya terbuka. Tahap "Menyimpan air" tidak menuntut apa pun, jadi
 * arahannya kosong dan panahnya langsung dapat diklik.
 */
const STEP_HINT = [
  `Seret pengatur umur sampai ${formatYears(PEAT_MAX_YEARS)} tahun untuk melanjutkan.`,
  "Klik salah satu lapisan untuk melihatnya lebih dekat.",
  "",
  "",
];

/** Tahap yang tidak menuntut tindakan apa pun; panahnya terbuka begitu tiba. */
const STEP_FREE = [false, false, true, true];

/**
 * Modul 01 — Anatomi Gambut.
 * Bagian ini "menempel" di layar selama empat layar gulir; tiap seperempat
 * gulir memindahkan cerita ke tahap berikutnya, sementara model 3D di
 * belakangnya berubah (kamera, lapisan terurai, muka air, bara).
 */
export default function AnatomiModule() {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);

  const [step, setStep] = useState(0);
  /** Tahap terjauh yang sudah terbuka; bertambah setelah syarat tahap ini tuntas. */
  const [unlocked, setUnlocked] = useState(0);
  /** Pembaca mencoba melanjutkan padahal syaratnya belum tuntas (arahan disorot sebentar). */
  const [urgent, setUrgent] = useState(false);
  /** Tahap terjauh yang terbuka, dibaca di dalam penangan gulir yang dibuat sekali. */
  const unlockedRef = useRef(0);
  useEffect(() => {
    unlockedRef.current = unlocked;
  }, [unlocked]);
  const [userWaterCm, setUserWaterCm] = useState(DEFAULT_WATER_CM);
  const [userYears, setUserYears] = useState(0);
  const [hovered, setHovered] = useState<PeatLayerId | null>(null);
  const [focused, setFocused] = useState<PeatLayerId | null>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [quality, setQuality] = useState<Quality>("high");
  const [soundOn, setSoundOn] = useState(false);

  /**
   * Buka tahap sesudah `i`. Sekali terbuka tetap terbuka: pembaca yang
   * menarik kembali pengatur umurnya tidak kehilangan tahap yang sudah ia
   * lewati.
   */
  const unlockAfter = useCallback((i: number) => {
    setUnlocked((u) => Math.max(u, Math.min(i + 1, STEP_COUNT - 1)));
  }, []);

  const waterCm = step === INTERACTIVE_STEP ? userWaterCm : STEP_WATER_CM[step];
  // Di luar tahap pertumbuhan, gambut selalu ditampilkan utuh.
  const years = step === GROWTH_STEP ? userYears : PEAT_MAX_YEARS;
  /** Tahap yang memunculkan panel pengatur di sudut kiri bawah. */
  const hasPanel = step === GROWTH_STEP || step === INTERACTIVE_STEP;

  const sceneState = useRef<SceneState>({
    step: 0,
    waterCm: STEP_WATER_CM[0],
    years: 0,
    peat: 0,
    hovered: null,
    focused: null,
    reducedMotion: false,
    rotation: 0,
    explode: 0,
    danger: 0,
  });

  // Salurkan keadaan antarmuka ke adegan 3D (dibaca tiap bingkai).
  useEffect(() => {
    Object.assign(sceneState.current, { step, waterCm, years, hovered, focused, reducedMotion });
  }, [step, waterCm, years, hovered, focused, reducedMotion]);

  /**
   * Semua perubahan umur lewat sini — baik dari pengatur maupun dari demo
   * otomatis — supaya syarat tahap pertama dinilai di satu tempat saja.
   */
  const applyYears = useCallback(
    (years: number) => {
      setUserYears(years);
      if (years >= PEAT_MAX_YEARS) unlockAfter(GROWTH_STEP);
    },
    [unlockAfter],
  );

  // Tombol Esc melepaskan lapisan yang sedang dipilih.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFocused(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Suara suasana: dibuat saat pertama dinyalakan (peramban mewajibkan klik
  // pengguna), dijeda saat modul tidak terlihat, dan dibebaskan saat keluar.
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
    soundRef.current?.setDanger(getFireDanger(waterCm));
  }, [waterCm, soundOn]);
  useEffect(() => () => soundRef.current?.dispose(), []);

  // Muat kanvas saat modul mendekati layar; jeda render saat tidak terlihat.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const near = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        // Ponsel & layar sentuh memakai mutu grafis ringan (tanpa pantulan air nyata).
        const low = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
        setQuality(low ? "low" : "high");
        setMounted(true);
      },
      { rootMargin: "800px 0px" },
    );
    const onScreen = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    near.observe(el);
    onScreen.observe(el);
    return () => {
      near.disconnect();
      onScreen.disconnect();
    };
  }, []);

  // Gulir → tahap cerita, dengan tambatan (snap) ke tiap tahap. Gulirannya
  // ditahan pada tahap terjauh yang sudah terbuka: selama syarat tahap ini
  // belum tuntas, halaman tidak dapat dibawa lewat batasnya, sehingga panah
  // lanjut yang terkunci itu benar-benar berarti.
  useGSAP(
    () => {
      const limit = () => unlockedRef.current / (STEP_COUNT - 1);
      const st = ScrollTrigger.create({
        trigger: rootRef.current,
        start: "top top",
        end: "bottom bottom",
        snap: {
          snapTo: (value) => Math.min(Math.round(value * (STEP_COUNT - 1)) / (STEP_COUNT - 1), limit()),
          duration: { min: 0.25, max: 0.7 },
          delay: 0.08,
          ease: "power2.inOut",
        },
        onUpdate: (self) => {
          const max = limit();
          if (self.progress > max + 0.002) {
            // Ditahan di batas tahap yang terbuka, lalu arahannya disorot
            // supaya pembaca tahu mengapa halamannya tidak mau bergerak.
            window.scrollTo({ top: self.start + (self.end - self.start) * max, behavior: "auto" });
            setUrgent(true);
            return;
          }
          const next = Math.round(self.progress * (STEP_COUNT - 1));
          if (STEP_FREE[next]) setUnlocked((u) => Math.max(u, Math.min(next + 1, STEP_COUNT - 1)));
          setStep((prev) => {
            // Sorotan & pilihan lapisan dari tahap sebelumnya tidak dibawa ke tahap baru.
            if (prev !== next) {
              setHovered(null);
              setFocused(null);
            }
            return next;
          });
        },
      });
      triggerRef.current = st;
    },
    { scope: rootRef },
  );

  // Teks tahap masuk dengan gerak naik-dan-menjernih setiap kali tahap berganti.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".step-anim",
          { opacity: 0, y: 22, filter: "blur(10px)" },
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9, stagger: 0.07, ease: "expo.out" },
        );
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(".step-anim", { opacity: 1, y: 0, filter: "none" });
      });
    },
    { scope: textRef, dependencies: [step], revertOnUpdate: true },
  );

  // Demo otomatis sekali: saat pertama tiba di tahap interaktif, muka air
  // diturunkan perlahan agar pengguna melihat akibatnya, lalu kendali diserahkan.
  const demoPlayed = useRef(false);
  const demoTween = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    if (step !== INTERACTIVE_STEP || demoPlayed.current || reducedMotion) return;
    demoPlayed.current = true;
    const proxy = { v: DEFAULT_WATER_CM };
    const tween = gsap.to(proxy, {
      v: DEMO_WATER_CM,
      duration: 3.2,
      delay: 0.6,
      ease: "power2.inOut",
      onUpdate: () => setUserWaterCm(Math.round(proxy.v)),
    });
    demoTween.current = tween;
    // Bila pengguna meninggalkan tahap ini di tengah demo, demo dihentikan.
    return () => {
      tween.kill();
    };
  }, [step, reducedMotion]);

  // Demo pertumbuhan: setelah adegan siap, waktu berjalan sendiri sebentar
  // agar pembaca melihat bahwa bongkahan itu memang tumbuh, lalu berhenti jauh
  // sebelum penuh supaya sisanya ia seret sendiri.
  const growthDemoPlayed = useRef(false);
  const growthTween = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    if (step !== GROWTH_STEP || !ready || growthDemoPlayed.current) return;
    growthDemoPlayed.current = true;
    // Bila gerak dikurangi, demo tidak dijalankan: timbunan langsung tampil
    // utuh supaya pembaca tidak disambut tanah kosong.
    const target = reducedMotion ? PEAT_MAX_YEARS : DEMO_YEARS;
    const proxy = { v: 0 };
    const tween = gsap.to(proxy, {
      v: target,
      duration: reducedMotion ? 0 : 2.8,
      delay: reducedMotion ? 0 : 0.5,
      ease: "power2.out",
      onUpdate: () => applyYears(Math.round(proxy.v)),
      onComplete: () => applyYears(target),
    });
    growthTween.current = tween;
    return () => {
      tween.kill();
    };
  }, [step, ready, reducedMotion, applyYears]);

  const stopGrowthDemo = useCallback(() => {
    growthTween.current?.kill();
    growthTween.current = null;
  }, []);

  const stopDemo = useCallback(() => {
    demoTween.current?.kill();
    demoTween.current = null;
  }, []);

  // Seret horizontal untuk memutar diorama.
  const drag = useRef<{ x: number; start: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return; // di layar sentuh, gulir tetap diutamakan
    drag.current = { x: e.clientX, start: sceneState.current.rotation };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const next = drag.current.start + (e.clientX - drag.current.x) * 0.005;
    sceneState.current.rotation = Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, next));
  };
  const endDrag = () => {
    drag.current = null;
  };

  const goToStep = (i: number) => {
    const st = triggerRef.current;
    if (!st || i > unlocked) return;
    const y = st.start + ((st.end - st.start) * i) / (STEP_COUNT - 1);
    window.scrollTo({ top: y, behavior: reducedMotion ? "auto" : "smooth" });
  };

  // --- Syarat lanjut tiap tahap ---------------------------------------------
  //
  // Tiap tahap meminta satu tindakan sebelum tahap berikutnya terbuka, supaya
  // pembaca tidak sekadar menggulir melewatinya: angka "2.800 tahun" baru
  // terasa setelah ia sendiri yang menyeretnya sampai ke sana. Tindakan itu
  // dinilai di tempatnya masing-masing (`applyYears`, `selectLayer`), yang
  // memanggil `unlockAfter`; di sini tinggal dibaca hasilnya.
  const lastStep = step === STEP_COUNT - 1;
  const locked = unlocked <= step;

  // Sorotan arahan padam sendiri setelah sempat terbaca.
  useEffect(() => {
    if (!urgent) return;
    const id = window.setTimeout(() => setUrgent(false), 1800);
    return () => window.clearTimeout(id);
  }, [urgent]);

  /** Panah tahap terakhir: tidak ada tahap lagi, jadi ia menuju modul berikutnya. */
  const toNextModule = lastStep && NEXT_MODULE.available && NEXT_MODULE.href ? NEXT_MODULE : null;

  const advance = useCallback(() => {
    const st = triggerRef.current;
    if (!st) return;
    const y = st.start + ((st.end - st.start) * (step + 1)) / (STEP_COUNT - 1);
    window.scrollTo({ top: y, behavior: reducedMotion ? "auto" : "smooth" });
  }, [step, reducedMotion]);

  const current = ANATOMI_STEPS[step];
  const hoveredLayer = PEAT_LAYERS.find((l) => l.id === hovered);
  const focusedLayer = step === EXPLODE_STEP ? PEAT_LAYERS.find((l) => l.id === focused) : undefined;
  const selectLayer = useCallback(
    (id: PeatLayerId | null) => {
      setFocused(id);
      if (id) unlockAfter(EXPLODE_STEP);
    },
    [unlockAfter],
  );
  const handleReady = useCallback(() => setReady(true), []);

  return (
    <div
      ref={rootRef}
      id="modul-anatomi"
      className="relative"
      style={{ height: `${STEP_COUNT * 100}vh` }}
    >
      <div ref={stageRef} className="sticky top-0 h-[100dvh] w-full overflow-hidden bg-[#050505]">
        {/* Lapisan 3D */}
        <div
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
        >
          {mounted && (
            <PeatScene
              stateRef={sceneState}
              active={visible}
              quality={quality}
              onHoverLayer={setHovered}
              onSelectLayer={selectLayer}
              onReady={handleReady}
            />
          )}
        </div>

        {/* Tirai pemuatan */}
        <div
          className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-[#050505] transition-opacity duration-1000 ${
            ready ? "opacity-0" : "opacity-100"
          }`}
          aria-hidden={ready}
        >
          <p className="animate-pulse text-xs uppercase tracking-[0.25em] text-white/40">Menggali lapisan gambut…</p>
        </div>

        {/* Gradasi agar teks tetap terbaca di atas model */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r from-black/75 via-black/35 to-transparent md:w-[58%]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/45 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[34%] bg-gradient-to-l from-black/65 via-black/25 to-transparent lg:block" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />

        {/* Panel cerita (kiri atas) */}
        <div className="pointer-events-none absolute left-5 right-5 top-20 sm:left-10 sm:top-24 md:left-14 md:right-auto md:max-w-[400px] [@media(max-height:880px)]:top-16 [@media(max-height:880px)]:sm:top-16">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/50">
            Modul {MODULE.number} · {MODULE.title}
          </p>
          <div ref={textRef} key={step} aria-live="polite">
            <h3
              className="step-anim mt-4 font-playfair text-4xl italic leading-[1.02] text-white sm:text-5xl md:text-6xl [@media(max-height:880px)]:mt-2 [@media(max-height:880px)]:!text-4xl"
              style={{ letterSpacing: "-0.03em" }}
            >
              {current.title}
            </h3>
            <p className="step-anim mt-4 text-sm leading-relaxed text-white/75 sm:text-[15px] [@media(max-height:880px)]:mt-3">
              {current.body}
            </p>
            <div
              className={`step-anim mt-6 hidden items-baseline gap-4 border-t border-white/10 pt-5 sm:flex ${
                // Di layar pendek, fakta disembunyikan saat panel pengatur tampil agar tidak bertumpuk.
                hasPanel ? "[@media(max-height:820px)]:!hidden" : ""
              } ${step === GROWTH_STEP ? "!hidden" : ""} ${focusedLayer ? "!hidden" : ""}`}
            >
              <span className="shrink-0 font-playfair text-3xl italic text-[#f0a060] md:text-4xl">{current.fact.value}</span>
              <span className="text-xs leading-relaxed text-white/55">{current.fact.caption}</span>
            </div>
          </div>
          {/* Rincian lapisan terpilih (tahap "Lapis demi lapis") */}
          {focusedLayer && (
            <div key={focusedLayer.id} className="hero-anim hero-fade mt-6">
              <LayerDetail layer={focusedLayer} onClose={() => setFocused(null)} />
            </div>
          )}
        </div>

        {/* Navigasi tahap (kiri bawah) */}
        <nav
          aria-label="Tahap modul"
          className="absolute bottom-8 left-5 hidden gap-2 sm:left-10 md:left-14 md:flex"
        >
          {ANATOMI_STEPS.map((s, i) => {
            const shut = i > unlocked;
            return (
              <button
                key={s.title}
                type="button"
                onClick={() => goToStep(i)}
                disabled={shut}
                aria-current={i === step ? "step" : undefined}
                title={shut ? STEP_HINT[step] : s.title}
                className={`group flex flex-col items-start gap-2 text-left ${shut ? "cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span
                  className={`h-0.5 w-14 rounded-full transition-colors duration-500 ${
                    i === step ? "bg-white" : shut ? "bg-white/12" : "bg-white/20 group-hover:bg-white/50"
                  }`}
                />
                <span className={`text-[11px] tabular-nums transition-colors ${i === step ? "text-white" : "text-white/40"}`}>
                  0{i + 1}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Penggaris kedalaman (kanan) */}
        <div
          className={`absolute bottom-[18%] right-10 top-[22%] hidden transition-opacity duration-700 lg:block xl:right-14 ${
            step === GROWTH_STEP ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
          inert={step === GROWTH_STEP}
        >
          <DepthLegend
            waterCm={waterCm}
            hovered={hovered}
            focused={focusedLayer?.id ?? null}
            onHover={setHovered}
            onSelect={step === EXPLODE_STEP ? selectLayer : undefined}
          />
        </div>

        {/* Info lapisan yang disentuh (layar kecil, tanpa penggaris) */}
        {hoveredLayer && (
          <div className="pointer-events-none absolute left-5 right-5 top-[58%] rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-md lg:hidden">
            <p className="text-sm font-medium text-white">{hoveredLayer.name}</p>
            <p className="mt-1 text-xs leading-relaxed text-white/70">{hoveredLayer.summary}</p>
          </div>
        )}

        {/* Pengatur umur timbunan (tahap pertumbuhan) */}
        <div
          className={`absolute bottom-6 left-1/2 w-[min(560px,calc(100%-2.5rem))] -translate-x-1/2 md:bottom-20 md:left-14 md:w-[400px] md:translate-x-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            step === GROWTH_STEP ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-8 opacity-0"
          }`}
          inert={step !== GROWTH_STEP}
        >
          {/* Di layar sempit panel ini menempati seluruh tepi bawah, jadi panah
              lanjut duduk tepat di atasnya; di layar lebar panahnya ada di
              gugus kanan bawah bersama tombol suara. */}
          <div className="absolute bottom-full right-0 mb-3 md:hidden">
            <StepAdvance
              nextTitle={ANATOMI_STEPS[1].title}
              label="Tahap berikutnya"
              hint={STEP_HINT[0]}
              locked={locked}
              urgent={urgent}
              onAdvance={advance}
            />
          </div>
          <GrowthControl years={userYears} onChange={applyYears} onInteract={stopGrowthDemo} />
        </div>

        {/* Pengatur muka air (tahap interaktif) */}
        <div
          className={`absolute bottom-6 left-1/2 w-[min(560px,calc(100%-2.5rem))] -translate-x-1/2 md:bottom-20 md:left-14 md:w-[400px] md:translate-x-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            step === INTERACTIVE_STEP ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-8 opacity-0"
          }`}
          inert={step !== INTERACTIVE_STEP}
        >
          {/* Seperti pada panel umur: di layar sempit panah duduk di atas panel. */}
          {toNextModule && (
            <div className="absolute bottom-full right-0 mb-3 md:hidden">
              <StepAdvance
                nextTitle={`Modul ${toNextModule.number} · ${toNextModule.title}`}
                label="Modul berikutnya"
                href={toNextModule.href ?? undefined}
              />
            </div>
          )}
          <WaterControl
            waterCm={userWaterCm}
            onChange={setUserWaterCm}
            onInteract={stopDemo}
          />
        </div>

        {/* Kanan bawah: petunjuk interaksi, tombol suara, dan panah lanjut */}
        <div className="absolute bottom-6 right-5 flex items-end gap-4 text-[11px] text-white/60 sm:bottom-8 sm:right-10 xl:right-14">
          <div
            className={`pointer-events-none hidden items-center gap-4 pb-2 transition-opacity duration-500 lg:flex ${
              hasPanel ? "opacity-0" : "opacity-100"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Rotate3d size={14} /> Seret untuk memutar
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MousePointer2 size={14} /> Arahkan ke lapisan
            </span>
          </div>
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={soundOn}
            className={`cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 backdrop-blur-md transition-colors ${
              soundOn ? "border-white/40 bg-white/15 text-white" : "border-white/20 bg-black/30 text-white/70 hover:text-white"
            } ${
              // Di layar kecil tombol disembunyikan saat panel pengatur tampil agar tidak bertumpuk.
              hasPanel ? "hidden md:inline-flex" : "inline-flex"
            }`}
          >
            {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
            Suara alam
          </button>

          {/* Panah lanjut: ke tahap berikutnya, lalu ke modul berikutnya pada
              tahap terakhir. Di layar sempit panah ini pindah ke atas panel
              pengatur, jadi di sini ia disembunyikan. */}
          {!lastStep ? (
            <StepAdvance
              nextTitle={ANATOMI_STEPS[step + 1].title}
              label="Tahap berikutnya"
              hint={STEP_HINT[step]}
              locked={locked}
              urgent={urgent}
              onAdvance={advance}
              className={hasPanel ? "hidden md:flex" : "flex"}
            />
          ) : toNextModule ? (
            <StepAdvance
              nextTitle={`Modul ${toNextModule.number} · ${toNextModule.title}`}
              label="Modul berikutnya"
              href={toNextModule.href ?? undefined}
              className={hasPanel ? "hidden md:flex" : "flex"}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
