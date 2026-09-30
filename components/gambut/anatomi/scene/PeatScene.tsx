"use client";

import { Suspense, useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { getFireDanger, PEAT_LAYERS, type PeatLayerId } from "@/lib/peat";
import PeatBlock from "./PeatBlock";
import Vegetation from "./Vegetation";
import Embers from "./Embers";
import SkyLighting from "@/components/gambut/scene/SkyLighting";
import Backdrop from "@/components/gambut/scene/Backdrop";
import PerformanceGuard from "@/components/gambut/scene/PerformanceGuard";
import {
  DIORAMA_Y,
  EXPLODE_GAP,
  EXPLODE_STEP,
  QUALITY_PROFILE,
  type Quality,
  type SceneState,
} from "./sceneState";

/** Posisi kamera & titik bidik untuk tiap tahap cerita. */
const CAMERA_POSES: { pos: [number, number, number]; target: [number, number, number] }[] = [
  { pos: [8.6, 3.2, 10.6], target: [0, -0.8, 0] }, // 0: hutan di atas spons
  { pos: [7.8, 1.4, 11.8], target: [0, -0.5, 0] }, // 1: lapisan terurai (naik ke atas)
  { pos: [7.2, 1.2, 9.8], target: [0, -1.0, 0] }, // 2: menyimpan air
  { pos: [7.6, 2.6, 9.4], target: [0, -0.6, 0] }, // 3: saat air surut
];

/** Kamera bergerak halus ke pose tahap aktif, ditambah paralaks kursor. */
function CameraRig({ stateRef }: { stateRef: RefObject<SceneState> }) {
  const camera = useThree((s) => s.camera);
  const target = useRef(new THREE.Vector3(...CAMERA_POSES[0].target));
  const desiredPos = useRef(new THREE.Vector3());
  const desiredTarget = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const s = stateRef.current;
    if (!s) return;
    const dt = Math.min(delta, 0.05);
    const pose = CAMERA_POSES[s.step] ?? CAMERA_POSES[0];
    const focusIdx = s.step === EXPLODE_STEP && s.focused ? PEAT_LAYERS.findIndex((l) => l.id === s.focused) : -1;

    // Layar sempit (ponsel/potret) butuh kamera lebih jauh agar balok utuh terlihat.
    const aspect = state.size.width / Math.max(1, state.size.height);
    const distance = aspect < 0.8 ? 1.7 : aspect < 1.3 ? 1.25 : 1;

    const parallax = s.reducedMotion ? 0 : 1;
    let zoom = distance;
    if (focusIdx >= 0) {
      // Lapisan terpilih: bidik pusat lapisan (yang sudah maju ke depan) dan mendekat.
      const layer = PEAT_LAYERS[focusIdx];
      const y = DIORAMA_Y - (layer.top + layer.bottom) / 2 + (PEAT_LAYERS.length - 1 - focusIdx) * EXPLODE_GAP * s.explode;
      desiredTarget.current.set(pose.pos[0], 0, pose.pos[2]).normalize().multiplyScalar(0.6).setY(y);
      zoom *= 0.8;
    } else {
      desiredTarget.current.set(...pose.target);
    }
    desiredPos.current
      .set(...pose.pos)
      .sub(new THREE.Vector3(...pose.target))
      .multiplyScalar(zoom)
      .add(desiredTarget.current);
    desiredPos.current.x += state.pointer.x * 0.35 * parallax;
    desiredPos.current.y += state.pointer.y * 0.2 * parallax;

    const k = s.reducedMotion ? 30 : 2.2;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, desiredPos.current.x, k, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, desiredPos.current.y, k, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, desiredPos.current.z, k, dt);
    target.current.lerp(desiredTarget.current, 1 - Math.exp(-k * dt));
    camera.lookAt(target.current);

    // Di layar lebar, pusat gambar digeser ke kanan agar diorama tidak
    // tertutup panel teks di kiri.
    const cam = camera as THREE.PerspectiveCamera;
    const { width, height } = state.size;
    const shift = aspect > 1.3 ? -width * 0.035 : 0;
    const current = cam.view?.enabled ? cam.view : null;
    if (shift && (current?.offsetX !== shift || current.fullHeight !== height)) {
      cam.setViewOffset(width, height, shift, 0, width, height);
    } else if (!shift && current) {
      cam.clearViewOffset();
    }
  });

  return null;
}

/**
 * Diorama gambut: diputar oleh seretan pengguna dan bergoyang pelan saat diam.
 * Juga menghitung nilai bersama tiap bingkai (tingkat urai & bahaya) agar
 * semua komponen 3D bergerak serempak.
 */
function Diorama({
  stateRef,
  onHoverLayer,
  onSelectLayer,
  onReady,
}: {
  stateRef: RefObject<SceneState>;
  onHoverLayer: (id: PeatLayerId | null) => void;
  onSelectLayer: (id: PeatLayerId | null) => void;
  onReady: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const surfaceRef = useRef<THREE.Group>(null);

  // Dipanggil setelah semua tekstur di dalam Suspense selesai dimuat.
  useEffect(() => onReady(), [onReady]);

  useFrame((state, delta) => {
    const s = stateRef.current;
    const g = ref.current;
    if (!s || !g) return;
    const dt = Math.min(delta, 0.05);
    const fast = s.reducedMotion;
    s.explode = THREE.MathUtils.damp(s.explode, s.step === EXPLODE_STEP ? 1 : 0, fast ? 30 : 2.4, dt);
    s.danger = THREE.MathUtils.damp(s.danger, getFireDanger(s.waterCm), fast ? 30 : 1.6, dt);

    const idle = fast ? 0 : Math.sin(state.clock.elapsedTime * 0.18) * 0.06;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, -0.18 + s.rotation + idle, 4, dt);

    // Permukaan (rumput, pohon, bara) ikut naik bersama lapisan teratas.
    if (surfaceRef.current) surfaceRef.current.position.y = (PEAT_LAYERS.length - 1) * EXPLODE_GAP * s.explode;
  });

  return (
    <group ref={ref} position={[0, DIORAMA_Y, 0]}>
      <PeatBlock stateRef={stateRef} onHoverLayer={onHoverLayer} onSelectLayer={onSelectLayer} />
      <group ref={surfaceRef}>
        <Vegetation stateRef={stateRef} />
        <Embers stateRef={stateRef} />
      </group>
    </group>
  );
}

type Props = {
  stateRef: RefObject<SceneState>;
  active: boolean;
  quality: Quality;
  onHoverLayer: (id: PeatLayerId | null) => void;
  onSelectLayer: (id: PeatLayerId | null) => void;
  onReady: () => void;
};

/** Kanvas 3D Modul 01. Berhenti merender saat tidak terlihat di layar. */
export default function PeatScene({ stateRef, active, quality, onHoverLayer, onSelectLayer, onReady }: Props) {
  const profile = QUALITY_PROFILE[quality];
  const maxDpr = profile.maxDpr;
  return (
    <Canvas
      shadows={profile.softShadow ? "percentage" : true}
      dpr={[1, maxDpr]}
      // Klik di ruang kosong melepaskan lapisan yang sedang dipilih.
      onPointerMissed={() => onSelectLayer(null)}
      frameloop={active ? "always" : "never"}
      camera={{ fov: 34, near: 0.1, far: 400, position: CAMERA_POSES[0].pos }}
      gl={{ antialias: profile.antialias, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.9;
      }}
      fallback={<p className="p-6 text-sm text-white/70">Peramban Anda tidak mendukung WebGL, jadi model 3D gambut tidak dapat ditampilkan.</p>}
    >
      <SkyLighting stateRef={stateRef} quality={quality} />
      {/* Cahaya pantul lembut dari langit & air agar sisi teduh tidak hitam pekat */}
      <hemisphereLight args={["#cfdcec", "#2a2116", 0.12]} />
      <CameraRig stateRef={stateRef} />
      <PerformanceGuard maxDpr={maxDpr} />

      <Suspense fallback={null}>
        <Backdrop />
        <Diorama stateRef={stateRef} onHoverLayer={onHoverLayer} onSelectLayer={onSelectLayer} onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
