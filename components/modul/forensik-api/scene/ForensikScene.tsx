"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { PEAT_MAX_YEARS, PEAT_THICKNESS } from "@/lib/model/peat";
import type { SparkResult, Wetness, Wind } from "@/lib/model/ignition";
import { FORENSIK_TEXT, type InspectPart } from "@/config/modul/forensik-api";
import type { SceneState } from "@/components/modul/anatomi/scene/sceneState";
import SkyLighting from "@/components/modul/shared/scene/SkyLighting";
import Backdrop from "@/components/modul/shared/scene/Backdrop";
import PerformanceGuard from "@/components/modul/shared/scene/PerformanceGuard";
import FpsMeter, { wantsFpsMeter } from "@/components/modul/shared/scene/FpsMeter";
import {
  DIORAMA_CAMERA_POSES,
  DIORAMA_EXPOSURE,
  DIORAMA_HEMISPHERE,
  MAX_ROTATION,
  QUALITY_PROFILE,
  type Quality,
} from "@/components/modul/shared/scene/dioramaConstants";
import PeatPlot from "./PeatPlot";
import LandscapeMap, { partAtLocal } from "./LandscapeMap";

// Kanvas 3D Modul Forensik Api. Babak 01 memakai bongkahan gambut yang sama
// dengan Modul Anatomi, sebagai petak tempat bara dijatuhkan. Babak 02 dan
// 03 memakai peta lanskap dari atas: satu kotak = 1 km², sebesar satu titik
// api satelit, karena di sanalah penyelidik membaca jejak api.

/** Sudut pandang vertikal kamera (derajat), sama dengan modul 3D lain. */
const FOV = 34;

/**
 * Pose kamera, ukuran setengah isi (m), dan titik tengah isi tiap panggung.
 * Petak gambut dilihat seperti Modul Anatomi; peta dilihat miring dari atas,
 * cukup tegak untuk terbaca sebagai peta, cukup miring untuk terasa 3D.
 */
const STAGES = {
  plot: {
    pose: DIORAMA_CAMERA_POSES[0],
    halfW: 2.7,
    halfH: 1.75,
    center: new THREE.Vector3(0, -0.35, 0),
  },
  map: {
    // Lebih landai daripada peta datar, supaya dinding bongkahan di bawah
    // peta ikut terlihat dan peta mengisi tinggi bingkai seperti petak babak 01.
    pose: { pos: [0, 5.4, 6.6] as [number, number, number], target: [0, 0, 0] as [number, number, number] },
    halfW: 3.45,
    halfH: 2.3,
    center: new THREE.Vector3(0, -0.6, 0.15),
  },
} as const;

/** Radian putaran per piksel seretan dan per tekan tombol panah. */
const DRAG_SPEED = 0.008;
const KEY_STEP = 0.2;

/** Geseran penunjuk (px) yang masih dihitung klik, bukan seretan. */
const CLICK_SLOP = 6;

/** Bara terakhir yang dijatuhkan; `id` berganti tiap kali tombol ditekan. */
export type Drop = { id: number; result: SparkResult };

/** Api pembersih lahan yang sedang dianimasikan dan saat mulainya (performance.now). */
export type BurnAnim = { index: number; start: number };

export type ForensikSceneProps = {
  act: number;
  wetness: Wetness;
  wind: Wind;
  drop: Drop | null;
  /** Hari yang sedang dilihat pada kasus babak 02. */
  day: number;
  /** Jumlah api pembersih lahan yang sudah dinyalakan (babak 03). */
  burnsLit: number;
  burnAnim: BurnAnim | null;
  inspect: InspectPart | null;
  onInspect: (part: InspectPart) => void;
  quality: Quality;
  onOverload: () => void;
};

/**
 * Yang dibutuhkan untuk menebak bagian peta yang diklik: permukaan tanah yang
 * dikenai sinar, dan grup lanskap untuk menerjemahkan titiknya ke koordinat peta.
 */
export type MapPicker = { camera: THREE.Camera; surface: THREE.Object3D; root: THREE.Object3D };

/**
 * Kanvas memenuhi layar di belakang panel, dan isinya dipaskan ke bingkai
 * gambar milik kerangka modul, sama seperti Modul Musim Api.
 */
export default function ForensikScene(props: ForensikSceneProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [showFps] = useState(wantsFpsMeter);
  const profile = QUALITY_PROFILE[props.quality];
  const reducedMotion = useReducedMotion();
  const stage = props.act === 0 ? "plot" : "map";

  // Keadaan bersama komponen Modul Anatomi; dipatok pada profil gambut
  // penuh. Muka air hanya dipakai untuk rupa basah atau kering petaknya.
  const stateRef = useRef<SceneState>({
    step: 0,
    waterCm: 30,
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
    stateRef.current.reducedMotion = reducedMotion;
  }, [reducedMotion]);

  // Putaran ditulis langsung ke keadaan bersama (bukan state React) supaya
  // seretan tidak merender ulang adegan tiap gerak penunjuk.
  const dragFrom = useRef<number | null>(null);
  const downAt = useRef<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [turned, setTurned] = useState(false);
  const pickRef = useRef<MapPicker | null>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const [hover, setHover] = useState<InspectPart | null>(null);
  const [overMap, setOverMap] = useState(false);
  const hoverAt = useRef<{ x: number; y: number } | null>(null);
  const hoverFrame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(hoverFrame.current), []);

  // Tiap panggung mulai dari sudut hadap awalnya.
  useEffect(() => {
    stateRef.current.rotation = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- keterangan aksesibilitas mengikuti panggung baru
    setRotation(0);
    setHover(null);
  }, [stage]);

  const degrees = Math.round((rotation * 180) / Math.PI);
  const rotate = (delta: number, commit = false) => {
    const s = stateRef.current;
    s.rotation = THREE.MathUtils.clamp(s.rotation + delta, -MAX_ROTATION, MAX_ROTATION);
    if (commit) setRotation(s.rotation);
  };

  /** Bagian peta di bawah titik layar, atau null. */
  const pickAt = (clientX: number, clientY: number): InspectPart | null => {
    const p = pickRef.current;
    if (!p || stage !== "map") return null;
    const ndc = new THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, p.camera);
    const hit = raycaster.intersectObject(p.surface, false)[0];
    if (!hit) return null;
    const local = p.root.worldToLocal(hit.point.clone());
    return partAtLocal(local.x, local.z);
  };

  return (
    <>
      {/* Bingkai tempat isi dipaskan, sekaligus bidang seret untuk memutarnya. */}
      <div
        ref={anchorRef}
        data-guide={stage === "map" ? "map" : "plot"}
        role="slider"
        tabIndex={0}
        aria-label={stage === "map" ? "Putar peta lanskap" : "Putar petak gambut"}
        aria-valuemin={Math.round((-MAX_ROTATION * 180) / Math.PI)}
        aria-valuemax={Math.round((MAX_ROTATION * 180) / Math.PI)}
        aria-valuenow={degrees}
        aria-valuetext={`diputar ${degrees} derajat`}
        className={`absolute inset-0 bottom-10 touch-none select-none rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:bottom-0 ${
          dragging ? "cursor-grabbing" : overMap ? "cursor-pointer" : "cursor-grab"
        }`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          dragFrom.current = e.clientX;
          downAt.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          if (dragFrom.current === null) {
            // Pratinjau bagian di bawah kursor, paling banyak sekali per bingkai.
            if (e.pointerType === "mouse" && stage === "map") {
              hoverAt.current = { x: e.clientX, y: e.clientY };
              if (hoverFrame.current === 0) {
                hoverFrame.current = requestAnimationFrame(() => {
                  hoverFrame.current = 0;
                  const at = hoverAt.current;
                  if (!at) return;
                  const part = pickAt(at.x, at.y);
                  setOverMap(part !== null);
                  setHover(part);
                });
              }
            }
            return;
          }
          const start = downAt.current;
          if (start && !dragging && Math.hypot(e.clientX - start.x, e.clientY - start.y) <= CLICK_SLOP) return;
          if (!dragging) {
            setDragging(true);
            setTurned(true);
          }
          const dx = e.clientX - dragFrom.current;
          dragFrom.current = e.clientX;
          rotate(dx * DRAG_SPEED);
        }}
        onPointerUp={(e) => {
          // Tekan tanpa geser = klik: jelaskan bagian peta yang dikenai.
          if (!dragging) {
            const part = pickAt(e.clientX, e.clientY);
            if (part) props.onInspect(part);
          }
          if (dragging) setRotation(stateRef.current.rotation);
          dragFrom.current = null;
          downAt.current = null;
          setDragging(false);
        }}
        onPointerLeave={() => {
          hoverAt.current = null;
          setHover(null);
          setOverMap(false);
        }}
        onPointerCancel={() => {
          dragFrom.current = null;
          downAt.current = null;
          setDragging(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") rotate(-KEY_STEP, true);
          else if (e.key === "ArrowRight") rotate(KEY_STEP, true);
          else return;
          e.preventDefault();
        }}
      >
        {stage === "map" && !(turned && props.inspect) && (
          <p className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[11px] text-white/55 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
            ↔ {FORENSIK_TEXT.dragHint}
          </p>
        )}
      </div>
      <div className="pointer-events-none fixed inset-0">
        <Canvas
          // R3F memaksa `pointer-events: auto`; tanpa penimpaan ini kanvas
          // selayar penuh menelan seretan sebelum sampai ke bidang seret.
          style={{ pointerEvents: "none" }}
          dpr={[1, profile.maxDpr]}
          frameloop="demand"
          shadows={profile.softShadow ? "percentage" : "basic"}
          camera={{ fov: FOV, near: 0.1, far: 400, position: STAGES.plot.pose.pos }}
          gl={{ antialias: profile.antialias, powerPreference: "default" }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = DIORAMA_EXPOSURE;
          }}
          fallback={<p className="p-6 text-sm text-white/70">Peramban Anda tidak mendukung WebGL, jadi diorama tidak dapat ditampilkan.</p>}
        >
          <CameraRig anchorRef={anchorRef} stage={stage} />
          <PerformanceGuard maxDpr={profile.maxDpr} onOverload={props.onOverload} />
          {showFps && <FpsMeter />}
          <SkyLighting stateRef={stateRef} quality={props.quality} backgroundDim={stage === "map" ? 0.35 : 0.55} />
          <hemisphereLight args={DIORAMA_HEMISPHERE} />
          <Suspense fallback={null}>
            <Backdrop />
          </Suspense>
          <Suspense fallback={null}>
            {stage === "plot" ? (
              <PeatPlot
                stateRef={stateRef}
                wetness={props.wetness}
                wind={props.wind}
                drop={props.drop}
              />
            ) : (
              <LandscapeMap
                stateRef={stateRef}
                pickRef={pickRef}
                act={props.act}
                day={props.day}
                burnsLit={props.burnsLit}
                burnAnim={props.burnAnim}
                highlight={props.inspect ?? hover}
                highlightStrength={props.inspect ? 1 : 0.45}
                quality={props.quality}
                reducedMotion={reducedMotion}
              />
            )}
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
 * Kamera yang memaskan isi panggung ke bingkai gambar: jaraknya dihitung dari
 * ukuran bingkai, lalu gambar digeser dengan `setViewOffset` supaya titik
 * tengah isi jatuh di tengah bingkai, bukan di tengah layar yang tertutup panel.
 */
function CameraRig({ anchorRef, stage }: { anchorRef: RefObject<HTMLDivElement | null>; stage: keyof typeof STAGES }) {
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
    const { pose, halfW, halfH, center } = STAGES[stage];
    const { width: W, height: H } = size;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const byHeight = (halfH * H) / (rect.height * tanHalf);
    const byWidth = (halfW * H) / (rect.width * tanHalf);
    const distance = Math.max(byHeight, byWidth) * 1.02;

    const dir = new THREE.Vector3(...pose.pos).sub(new THREE.Vector3(...pose.target)).normalize();
    camera.position.copy(center).addScaledVector(dir, distance);
    camera.lookAt(center);
    camera.fov = FOV;
    camera.far = distance + 400;

    const offsetX = -(rect.left + rect.width / 2 - W / 2);
    const offsetY = -(rect.top + rect.height / 2 - H / 2);
    camera.setViewOffset(W, H, offsetX, offsetY, W, H);
    camera.updateProjectionMatrix();
    invalidate();
  }, [rect, size, camera, invalidate, stage]);

  return null;
}
