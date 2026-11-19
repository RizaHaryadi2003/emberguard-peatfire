"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { PEAT_MAX_YEARS, PEAT_THICKNESS, PROFILE_DEPTH } from "@/lib/model/peat";
import { BURN_CM, HIGH_DANGER_CM } from "@/lib/model/fireSeason";
import { MUSIM_TEXT, STAGE_COLOR, classifyDepth, type InspectPart } from "@/config/modul/musim-api";
import PeatBlock from "@/components/modul/anatomi/scene/PeatBlock";
import Vegetation from "@/components/modul/anatomi/scene/Vegetation";
import Embers from "@/components/modul/anatomi/scene/Embers";
import type { SceneState } from "@/components/modul/anatomi/scene/sceneState";
import SkyLighting from "@/components/modul/shared/scene/SkyLighting";
import Backdrop from "@/components/modul/shared/scene/Backdrop";
import PerformanceGuard from "@/components/modul/shared/scene/PerformanceGuard";
import FpsMeter, { wantsFpsMeter } from "@/components/modul/shared/scene/FpsMeter";
import { createRibbon, updateRibbon, wallPoint } from "@/components/modul/shared/scene/terrain";
import { createSmokeTexture } from "@/components/modul/shared/scene/proceduralTextures";
import {
  DIORAMA_BASE_YAW,
  DIORAMA_CAMERA_POSES,
  DIORAMA_EXPOSURE,
  DIORAMA_HEMISPHERE,
  DIORAMA_Y,
  QUALITY_PROFILE,
  type Quality,
} from "@/components/modul/shared/scene/dioramaConstants";

// Kanvas 3D Modul Musim Api: satu bongkahan gambut di pinggir Pontianak pada
// satu hari dalam setahun. Bongkahan, tumbuhan, dan bara dipakai ulang dari
// Modul Anatomi, karena yang ditunjukkan sama — muka air yang turun membuat
// gambut di atasnya kering dan bisa terbakar — dan pembaca sudah mengenal
// bentuknya. Yang baru di sini: hujan dan awan yang mengikuti kalender, dan
// dua garis ambang yang diukur di Kubu Raya.

/** Pose kamera: sama dengan tahap muka air di Modul Anatomi. */
const POSE = DIORAMA_CAMERA_POSES[3];

/** Sudut pandang vertikal kamera (derajat), sama dengan Modul Anatomi. */
const FOV = 34;

/**
 * Jari-jari bola yang memuat seluruh isi diorama (m): bongkahan 4,4 m × 3,4 m
 * ditambah pohon dan awan di atasnya. Dipakai untuk memaskan diorama ke
 * bingkai gambar.
 */
const CONTENT_RADIUS = 3.3;

/** Titik tengah isi diorama yang dipaskan ke tengah bingkai (m). */
const CONTENT_CENTER = new THREE.Vector3(0, -0.2, 0);

/** Jumlah tetes hujan menurut mutu grafis. */
const DROPS = { high: 900, low: 380 } as const;

/** Hujan (mm/hari) yang dihitung "deras penuh" untuk tampilan. */
const RAIN_FULL_MM = 12;

/** Ruang jatuhnya hujan di atas bongkahan (m). */
const RAIN_BOX = { x: 2.5, z: 1.6, top: 5.2, bottom: 0.05 };

/** Kecepatan jatuh tetes (m/detik) dan panjang garisnya (m). */
const DROP_SPEED = 7.5;
const DROP_LENGTH = 0.22;

/**
 * Selisih sudut (radian) antara arah kamera dan titik tempel label ambang di
 * dinding. Sekitar satu radian menaruh label di tepi kanan bongkahan seperti
 * terlihat dari kamera, sehingga tulisannya menjulur ke ruang kosong dan
 * tidak menutupi muka gambut.
 */
const LABEL_SIDE = 1.1;

/** Radian putaran per piksel seretan. */
const DRAG_SPEED = 0.008;

/** Radian putaran per tekan tombol panah. */
const KEY_STEP = 0.2;

/** Geseran penunjuk (px) yang masih dihitung klik, bukan seretan. */
const CLICK_SLOP = 6;

/** Warna sorotan bagian yang diklik. */
const PART_COLOR: Record<InspectPart, string> = {
  kering: "#ffb36b",
  basah: "#6fc3ff",
  ambang40: STAGE_COLOR.bahaya,
  ambang60: STAGE_COLOR.terbakar,
  mineral: "#d8cfc2",
};

/** Yang dibutuhkan untuk menebak bagian yang diklik dari luar kanvas. */
type Picker = { camera: THREE.Camera; block: THREE.Object3D; root: THREE.Object3D };


export type MusimSceneProps = {
  /** Kedalaman muka air tanah hari ini (cm di bawah permukaan). */
  depthCm: number;
  /** Hujan hari ini (mm/hari). */
  rainMmDay: number;
  /** Tingkat api relatif 0–1 dari model. */
  fire: number;
  quality: Quality;
  onOverload: () => void;
  /** Bagian yang sedang dijelaskan (disorot), atau null. */
  inspect: InspectPart | null;
  /** Pembaca mengeklik satu bagian bongkahan. */
  onInspect: (part: InspectPart) => void;
};

/**
 * Kanvas memenuhi layar di belakang panel, dan dioramanya dipaskan ke bingkai
 * gambar milik kerangka modul — cara yang sama dengan Modul Hutan Rawa,
 * supaya langit menyambung ke seluruh layar.
 */
export default function MusimScene(props: MusimSceneProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [showFps] = useState(wantsFpsMeter);
  const profile = QUALITY_PROFILE[props.quality];
  const reducedMotion = useReducedMotion();

  // Keadaan bersama komponen Modul Anatomi. Hanya muka air, bahaya, dan
  // gerak yang berubah; sisanya dipatok pada profil gambut penuh tanpa urai.
  const stateRef = useRef<SceneState>({
    step: 3,
    waterCm: props.depthCm,
    years: PEAT_MAX_YEARS,
    hovered: null,
    focused: null,
    reducedMotion,
    rotation: 0,
    explode: 0,
    danger: 0,
    peat: PEAT_THICKNESS,
  });
  useEffect(() => {
    stateRef.current.waterCm = props.depthCm;
    stateRef.current.reducedMotion = reducedMotion;
  }, [props.depthCm, reducedMotion]);

  // Putaran hasil seretan. Disimpan di keadaan bersama (dibaca tiap
  // bingkai) dan di state React hanya untuk keterangan aksesibilitas.
  const dragFrom = useRef<number | null>(null);
  const downAt = useRef<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [overBlock, setOverBlock] = useState(false);
  const pickRef = useRef<Picker | null>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  // Titik bongkahan di bawah penunjuk, dalam cm dari permukaan; null bila
  // penunjuk tidak mengenai bongkahan. Kanvas memenuhi seluruh jendela, jadi
  // koordinat layar langsung menjadi koordinat kanvas.
  const depthUnder = (clientX: number, clientY: number): number | null => {
    const p = pickRef.current;
    if (!p) return null;
    const ndc = new THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, p.camera);
    const hit = raycaster.intersectObject(p.block, true)[0];
    if (!hit) return null;
    const local = p.root.worldToLocal(hit.point.clone());
    return Math.min(PROFILE_DEPTH * 100, Math.max(0, -local.y * 100));
  };
  const [rotation, setRotation] = useState(0);
  const [turned, setTurned] = useState(false);
  const [clicked, setClicked] = useState(false);
  const degrees = (((Math.round((rotation * 180) / Math.PI) % 360) + 360) % 360);
  const rotate = (delta: number) => {
    stateRef.current.rotation += delta;
    setRotation(stateRef.current.rotation);
    setTurned(true);
  };

  return (
    <>
      {/* Bingkai tempat diorama dipaskan, sekaligus bidang seret untuk
          memutarnya. Di ponsel panel kendali menindih tepi bawah bingkai,
          jadi bingkainya dipendekkan di sana. */}
      <div
        ref={anchorRef}
        role="slider"
        tabIndex={0}
        aria-label="Putar bongkahan gambut"
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={degrees}
        aria-valuetext={`diputar ${degrees} derajat`}
        className={`absolute inset-0 bottom-10 touch-none select-none rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:bottom-0 ${
          dragging ? "cursor-grabbing" : overBlock ? "cursor-pointer" : "cursor-grab"
        }`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          dragFrom.current = e.clientX;
          downAt.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          if (dragFrom.current === null) {
            // Tanpa tombol ditekan: kursor menjadi tangan di atas bongkahan.
            if (e.pointerType === "mouse") setOverBlock(depthUnder(e.clientX, e.clientY) !== null);
            return;
          }
          const start = downAt.current;
          if (start && !dragging && Math.hypot(e.clientX - start.x, e.clientY - start.y) <= CLICK_SLOP) return;
          setDragging(true);
          const dx = e.clientX - dragFrom.current;
          dragFrom.current = e.clientX;
          rotate(dx * DRAG_SPEED);
        }}
        onPointerUp={(e) => {
          // Tekan tanpa geser = klik: jelaskan bagian yang dikenai.
          if (!dragging) {
            const cm = depthUnder(e.clientX, e.clientY);
            if (cm !== null) {
              props.onInspect(classifyDepth(cm, props.depthCm));
              setClicked(true);
            }
          }
          dragFrom.current = null;
          downAt.current = null;
          setDragging(false);
        }}
        onPointerCancel={() => {
          dragFrom.current = null;
          downAt.current = null;
          setDragging(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") rotate(-KEY_STEP);
          else if (e.key === "ArrowRight") rotate(KEY_STEP);
          else return;
          e.preventDefault();
        }}
      >
        {/* Petunjuk bertahan sampai pembaca sudah memutar dan mengeklik. */}
        {!(turned && clicked) && (
          <p className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[11px] text-white/55 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
            ↔ {MUSIM_TEXT.dragHint}
          </p>
        )}
      </div>
      {/* Kanvas dibuat tembus klik: seretan ditangkap bingkai di bawahnya,
          dan kursor tidak berubah menjadi tangan di atas lapisan seperti di
          Modul Anatomi. */}
      <div className="pointer-events-none fixed inset-0">
        <Canvas
          dpr={[1, profile.maxDpr]}
          frameloop="demand"
          shadows={profile.softShadow ? "percentage" : "basic"}
          camera={{ fov: FOV, near: 0.1, far: 400, position: POSE.pos }}
          gl={{ antialias: profile.antialias, powerPreference: "default" }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = DIORAMA_EXPOSURE;
          }}
          fallback={<p className="p-6 text-sm text-white/70">Peramban Anda tidak mendukung WebGL, jadi diorama gambut tidak dapat ditampilkan.</p>}
        >
          <CameraRig anchorRef={anchorRef} />
          <PerformanceGuard maxDpr={profile.maxDpr} onOverload={props.onOverload} />
          {showFps && <FpsMeter />}
          <SkyLighting stateRef={stateRef} quality={props.quality} backgroundDim={0.55} />
          <hemisphereLight args={DIORAMA_HEMISPHERE} />
          <Suspense fallback={null}>
            <Backdrop />
          </Suspense>
          <Suspense fallback={null}>
            <Diorama stateRef={stateRef} pickRef={pickRef} reducedMotion={reducedMotion} {...props} />
          </Suspense>
        </Canvas>
      </div>
    </>
  );
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

/**
 * Kamera perspektif yang memaskan diorama ke bingkai gambar.
 *
 * Jaraknya dihitung dari tinggi dan lebar bingkai agar bola isi muat, lalu
 * gambar digeser dengan `setViewOffset` supaya titik tengah diorama jatuh di
 * tengah bingkai, bukan di tengah layar yang tertutup panel.
 */
function CameraRig({ anchorRef }: { anchorRef: RefObject<HTMLDivElement | null> }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const update = () => setRect(el.getBoundingClientRect());
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [anchorRef]);

  useEffect(() => {
    if (!rect || rect.width < 10 || rect.height < 10) return;
    const { width: W, height: H } = size;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    // Jarak agar bola isi memenuhi tinggi bingkai, atau lebarnya bila
    // bingkainya lebih sempit daripada tinggi.
    const byHeight = (CONTENT_RADIUS * H) / (rect.height * tanHalf);
    const byWidth = (CONTENT_RADIUS * H) / (rect.width * tanHalf);
    const distance = Math.max(byHeight, byWidth) * 1.02;

    const dir = new THREE.Vector3(...POSE.pos).sub(new THREE.Vector3(...POSE.target)).normalize();
    camera.position.copy(CONTENT_CENTER).addScaledVector(dir, distance);
    camera.lookAt(CONTENT_CENTER);
    camera.fov = FOV;
    camera.far = distance + 400;

    const offsetX = -(rect.left + rect.width / 2 - W / 2);
    const offsetY = -(rect.top + rect.height / 2 - H / 2);
    camera.setViewOffset(W, H, offsetX, offsetY, W, H);
    camera.updateProjectionMatrix();
    invalidate();
  }, [rect, size, camera, invalidate]);

  return null;
}

/** Diorama: bongkahan Modul Anatomi + hujan, awan, garis ambang, dan label. */
function Diorama({
  stateRef,
  pickRef,
  reducedMotion,
  depthCm,
  rainMmDay,
  fire,
  quality,
  inspect,
}: MusimSceneProps & { stateRef: RefObject<SceneState>; pickRef: RefObject<Picker | null>; reducedMotion: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const blockRef = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera);
  // Serahkan kamera dan bongkahan ke bingkai seret, yang menebak bagian yang diklik.
  useEffect(() => {
    // `pickRef` diperiksa juga: saat muat ulang panas (HMR) adegan sempat
    // dirender oleh versi induk lama yang belum mengirimkannya.
    if (!pickRef || !ref.current || !blockRef.current) return;
    pickRef.current = { camera, block: blockRef.current, root: ref.current };
    return () => {
      pickRef.current = null;
    };
  }, [camera, pickRef]);
  // Nilai hari ini dibaca tiap bingkai oleh hujan, awan, dan bara.
  const rainRef = useRef(0);
  const fireRef = useRef(0);
  useEffect(() => {
    rainRef.current = Math.min(1, rainMmDay / RAIN_FULL_MM);
    fireRef.current = fire;
  }, [rainMmDay, fire]);

  useFrame((_, delta) => {
    const s = stateRef.current;
    const g = ref.current;
    if (!s || !g) return;
    const dt = Math.min(delta, 0.05);
    const fast = s.reducedMotion;
    // Bahaya dihaluskan di sini, satu kali untuk seluruh adegan: dipakai
    // bara, pijar lapisan kering, dan kabut asap di langit.
    s.danger = THREE.MathUtils.damp(s.danger, fireRef.current, fast ? 30 : 1.6, dt);
    // Bongkahan hanya berputar bila diseret; tanpa seretan ia diam.
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, DIORAMA_BASE_YAW + s.rotation, fast ? 30 : 10, dt);
  });

  return (
    <group ref={ref} position={[0, DIORAMA_Y, 0]}>
      <group ref={blockRef}>
        <PeatBlock stateRef={stateRef} onHoverLayer={noop} onSelectLayer={noop} />
      </group>
      <ZoneGlow part={inspect} depthCm={depthCm} reducedMotion={reducedMotion} />
      <Vegetation stateRef={stateRef} />
      <Embers stateRef={stateRef} />
      <ThresholdRibbons active={inspect} reducedMotion={reducedMotion} />
      <Rain intensityRef={rainRef} count={DROPS[quality]} reducedMotion={reducedMotion} />
      <Clouds intensityRef={rainRef} />
      <Labels />
    </group>
  );
}

function noop() {}

/**
 * Dua garis ambang yang mengelilingi dinding bongkahan: 40 cm dan 60 cm.
 *
 * Garis yang diklik mendapat pita cahaya lebar yang berdenyut, sehingga
 * pembaca melihat garis mana yang sedang dijelaskan.
 */
function ThresholdRibbons({ active, reducedMotion }: { active: InspectPart | null; reducedMotion: boolean }) {
  const res = useMemo(() => {
    const make = (part: "ambang40" | "ambang60", cm: number) => {
      const geom = createRibbon();
      updateRibbon(geom, -cm / 100, 0.006);
      const mat = new THREE.MeshBasicMaterial({ color: PART_COLOR[part], transparent: true, opacity: 0.85, toneMapped: false, side: THREE.DoubleSide });
      const glowGeom = createRibbon();
      updateRibbon(glowGeom, -cm / 100, 0.035);
      const glowMat = new THREE.MeshBasicMaterial({
        color: PART_COLOR[part],
        transparent: true,
        opacity: 0,
        toneMapped: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      return { part, geom, mat, glowGeom, glowMat };
    };
    return [make("ambang40", HIGH_DANGER_CM), make("ambang60", BURN_CM)];
  }, []);
  useEffect(
    () => () => {
      for (const r of res) {
        r.geom.dispose();
        r.mat.dispose();
        r.glowGeom.dispose();
        r.glowMat.dispose();
      }
    },
    [res],
  );

  useFrame((state, delta) => {
    const pulse = reducedMotion ? 1 : 0.6 + 0.4 * Math.sin(state.clock.elapsedTime * 5);
    for (const r of res) {
      const on = active === r.part;
      r.glowMat.opacity = THREE.MathUtils.damp(r.glowMat.opacity, on ? 0.55 * pulse : 0, 8, Math.min(delta, 0.05));
      r.mat.opacity = on ? 1 : 0.85;
    }
  });

  return (
    <>
      {res.map((r) => (
        <group key={r.part}>
          <mesh geometry={r.geom} material={r.mat} />
          <mesh geometry={r.glowGeom} material={r.glowMat} />
        </group>
      ))}
    </>
  );
}

/** Jumlah pita bertumpuk yang membentuk satu sorotan lapisan. */
const ZONE_STRIPS = 10;

/**
 * Sorotan lapisan yang diklik: kulit cahaya berdenyut di dinding bongkahan,
 * dari batas atas sampai batas bawah bagian itu.
 *
 * Untuk gambut kering batasnya permukaan sampai muka air hari ini, jadi
 * sorotannya ikut menebal saat kalender digeser ke masa kering — pembaca
 * melihat sendiri berapa tebal "bahan bakar" hari itu. Dinding sedikit
 * menyempit ke bawah, jadi sorotannya dibangun dari pita-pita pendek yang
 * masing-masing mengikuti dindingnya, bukan satu pita tinggi.
 */
function ZoneGlow({ part, depthCm, reducedMotion }: { part: InspectPart | null; depthCm: number; reducedMotion: boolean }) {
  const res = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      toneMapped: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const strips = Array.from({ length: ZONE_STRIPS }, () => createRibbon());
    return { mat, strips };
  }, []);
  useEffect(
    () => () => {
      res.mat.dispose();
      res.strips.forEach((g) => g.dispose());
    },
    [res],
  );

  // Batas atas dan bawah bagian yang disorot (m di bawah permukaan).
  const span = useMemo((): [number, number] | null => {
    const water = Math.min(depthCm, PEAT_THICKNESS * 100) / 100;
    if (part === "kering") return water > 0.02 ? [0, water] : null;
    if (part === "basah") return [water, PEAT_THICKNESS];
    if (part === "mineral") return [PEAT_THICKNESS, PROFILE_DEPTH];
    return null;
  }, [part, depthCm]);

  useEffect(() => {
    if (!span) return;
    const [top, bottom] = span;
    const h = (bottom - top) / ZONE_STRIPS;
    res.strips.forEach((g, i) => updateRibbon(g, -(top + h * (i + 0.5)), h / 2 + 0.002));
    if (part) res.mat.color.set(PART_COLOR[part]);
  }, [span, part, res]);

  useFrame((state, delta) => {
    const pulse = reducedMotion ? 1 : 0.65 + 0.35 * Math.sin(state.clock.elapsedTime * 4);
    res.mat.opacity = THREE.MathUtils.damp(res.mat.opacity, span ? 0.32 * pulse : 0, 8, Math.min(delta, 0.05));
  });

  return (
    <group visible={span !== null}>
      {res.strips.map((g, i) => (
        <mesh key={i} geometry={g} material={res.mat} />
      ))}
    </group>
  );
}

/**
 * Label kedua ambang di dinding bongkahan.
 *
 * Ditempel di tepi kanan bongkahan seperti terlihat dari kamera, dan pindah
 * mengikuti putaran, sehingga selalu terbaca dan tidak pernah tertutup
 * bongkahan atau menutupi muka gambut. Kedalaman muka air hari ini tidak
 * dilabeli di sini: angkanya sudah besar di panel kendali, dan garis birunya
 * terlihat di dinding.
 */
function Labels() {
  const camera = useThree((s) => s.camera);
  const anchorRef = useRef<THREE.Group>(null);
  const [theta, setTheta] = useState<number | null>(null);
  const local = useMemo(() => new THREE.Vector3(), []);

  // Arah kamera dalam koordinat diorama (yang ikut berputar). State hanya
  // diperbarui bila arahnya bergeser cukup jauh, supaya label tidak
  // dirender ulang tiap bingkai.
  useFrame(() => {
    const g = anchorRef.current;
    if (!g) return;
    local.copy(camera.position);
    g.worldToLocal(local);
    const camTheta = Math.atan2(local.z, local.x);
    if (theta === null || Math.abs(Math.atan2(Math.sin(camTheta - theta), Math.cos(camTheta - theta))) > 0.03) setTheta(camTheta);
  });

  const at = (cm: number) => (theta === null ? null : wallPoint(theta - LABEL_SIDE, -cm / 100, -0.04));
  const dangerAt = at(HIGH_DANGER_CM);
  const burnAt = at(BURN_CM);
  // Label menjulur ke kanan dari titik tempelnya, ke ruang kosong di luar bongkahan.
  const style =
    "pointer-events-none ml-2 inline-block translate-x-1/2 whitespace-nowrap rounded-full bg-black/75 px-2 py-0.5 text-[9px] font-medium sm:text-[10px] [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]";
  return (
    <group ref={anchorRef}>
      {dangerAt && (
        <Html position={dangerAt} center zIndexRange={[10, 0]}>
          <span className={style} style={{ color: STAGE_COLOR.bahaya }}>
            {MUSIM_TEXT.danger}
          </span>
        </Html>
      )}
      {burnAt && (
        <Html position={burnAt} center zIndexRange={[10, 0]}>
          <span className={style} style={{ color: STAGE_COLOR.terbakar }}>
            {MUSIM_TEXT.burn}
          </span>
        </Html>
      )}
    </group>
  );
}

/**
 * Hujan: garis-garis tipis yang jatuh di atas bongkahan.
 *
 * Satu `LineSegments` untuk semua tetes (satu panggilan gambar). Jumlah tetes
 * yang terlihat mengikuti hujan hari itu; tetes sisanya disembunyikan di
 * bawah lantai, bukan dibuat dan dibuang, supaya tidak ada alokasi memori
 * tiap bingkai.
 */
function Rain({ intensityRef, count, reducedMotion }: { intensityRef: RefObject<number>; count: number; reducedMotion: boolean }) {
  const res = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 2 * 3);
    geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, RAIN_BOX.top / 2, 0), 6);
    const mat = new THREE.LineBasicMaterial({ color: "#cfe8ff", transparent: true, opacity: 0.55, depthWrite: false });
    // Letak awal dan kecepatan tiap tetes; ditetapkan sekali agar polanya
    // tidak berkedip saat jumlah tetes berubah.
    const seeds = Array.from({ length: count }, (_, i) => ({
      x: (hash(i * 3.1) * 2 - 1) * RAIN_BOX.x,
      z: (hash(i * 7.7) * 2 - 1) * RAIN_BOX.z,
      y: RAIN_BOX.bottom + hash(i * 1.9) * (RAIN_BOX.top - RAIN_BOX.bottom),
      v: DROP_SPEED * (0.8 + 0.4 * hash(i * 5.3)),
    }));
    return { geom, mat, pos, seeds };
  }, [count]);
  useEffect(
    () => () => {
      res.geom.dispose();
      res.mat.dispose();
    },
    [res],
  );
  const shown = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    shown.current = THREE.MathUtils.damp(shown.current, intensityRef.current ?? 0, 2, dt);
    const active = Math.round(shown.current * count);
    const { pos, seeds } = res;
    for (let i = 0; i < count; i++) {
      const s = seeds[i];
      if (i < active) {
        if (!reducedMotion) s.y -= s.v * dt;
        if (s.y < RAIN_BOX.bottom) s.y += RAIN_BOX.top - RAIN_BOX.bottom;
        pos[i * 6] = s.x;
        pos[i * 6 + 1] = s.y;
        pos[i * 6 + 2] = s.z;
        pos[i * 6 + 3] = s.x;
        pos[i * 6 + 4] = s.y + DROP_LENGTH;
        pos[i * 6 + 5] = s.z;
      } else {
        // Disembunyikan: kedua ujung garis di satu titik di bawah bongkahan.
        pos.fill(0, i * 6, i * 6 + 6);
        pos[i * 6 + 1] = pos[i * 6 + 4] = -10;
      }
    }
    (res.geom.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    res.mat.opacity = 0.55 * Math.min(1, shown.current * 3);
  });

  return <lineSegments geometry={res.geom} material={res.mat} frustumCulled={false} />;
}

/** Awan hujan di atas bongkahan; makin deras hujan, makin pekat dan gelap. */
function Clouds({ intensityRef }: { intensityRef: RefObject<number> }) {
  const res = useMemo(() => {
    const tex = createSmokeTexture();
    const puffs = Array.from({ length: 9 }, (_, i) => {
      const mat = new THREE.SpriteMaterial({ map: tex, color: "#9aa3ad", transparent: true, opacity: 0, depthWrite: false, fog: false });
      const sprite = new THREE.Sprite(mat);
      const a = (i / 9) * Math.PI * 2;
      sprite.position.set(Math.cos(a) * 1.6 + (hash(i) - 0.5) * 0.8, 5.4 + hash(i * 2.3) * 0.6, Math.sin(a) * 0.9);
      sprite.scale.setScalar(2.4 + hash(i * 4.1) * 1.4);
      return { sprite, mat, drift: 0.05 + hash(i * 6.1) * 0.05, base: sprite.position.x };
    });
    return { tex, puffs };
  }, []);
  useEffect(
    () => () => {
      res.tex.dispose();
      res.puffs.forEach((p) => p.mat.dispose());
    },
    [res],
  );
  const shown = useRef(0);

  useFrame((state, delta) => {
    shown.current = THREE.MathUtils.damp(shown.current, intensityRef.current ?? 0, 1.5, Math.min(delta, 0.05));
    const t = state.clock.elapsedTime;
    for (const p of res.puffs) {
      p.mat.opacity = 0.75 * shown.current;
      // Makin deras, makin gelap: dari abu-abu muda ke kelabu tua.
      p.mat.color.setRGB(0.62 - 0.28 * shown.current, 0.66 - 0.28 * shown.current, 0.7 - 0.26 * shown.current);
      p.sprite.position.x = p.base + Math.sin(t * p.drift) * 0.4;
      p.sprite.visible = p.mat.opacity > 0.01;
    }
  });

  return (
    <>
      {res.puffs.map((p, i) => (
        <primitive key={i} object={p.sprite} />
      ))}
    </>
  );
}

/** Bilangan semu 0–1 yang tetap untuk masukan yang sama. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
