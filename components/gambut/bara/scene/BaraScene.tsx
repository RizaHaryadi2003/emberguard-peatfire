"use client";

import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import SkyLighting from "@/components/gambut/scene/SkyLighting";
import Backdrop from "@/components/gambut/scene/Backdrop";
import PerformanceGuard from "@/components/gambut/scene/PerformanceGuard";
import { GRID_COLS, GRID_ROWS, type SmolderSim, type SmolderStats } from "@/lib/smolder";
import CutBlock from "./CutBlock";
import SurfaceCover from "./SurfaceCover";
import SmokePlumes from "./SmokePlumes";
import WaterSpray from "./WaterSpray";
import SceneLabels from "./SceneLabels";
import { createSubsidence, BARA_MAX_ROTATION, DIORAMA_Y, QUALITY_PROFILE, type BaraState, type Quality } from "./baraState";

// Kanvas 3D Modul 02. Kamera menghadap bidang potong hampir tegak lurus supaya
// seluruh kejadian di bawah tanah terbaca, dengan sedikit sudut agar bongkahan
// tetap terasa berdimensi tiga.

/**
 * Posisi kamera, titik bidik, dan jarak pandang tiap babak.
 *
 * `frame` mengalikan jarak kamera ke titik bidik. Nilainya di atas satu karena
 * bongkahan sebelumnya memenuhi layar sampai pucuk pohon menembus bilah
 * navigasi di tepi atas. Diorama ini tinggi — dari dasar tanah mineral sampai
 * pucuk pohon tertinggi ± 6 m — jadi ia perlu ruang kosong di sekelilingnya
 * supaya terbaca sebagai satu benda utuh.
 */
const CAMERA_POSES: { pos: [number, number, number]; target: [number, number, number]; frame: number }[] = [
  { pos: [1.2, 4.1, 6.6], target: [0, -0.35, 0], frame: 1.34 }, // 01: permukaan tempat menyulut
  { pos: [0.8, -0.5, 9.0], target: [0, -1.6, 0], frame: 1.16 }, // 02: seluruh penampang, hampir tegak lurus
  { pos: [2.3, 1.6, 8.4], target: [0, -1.1, 0], frame: 1.24 }, // 03: permukaan & penampang bersama
  { pos: [0.6, -0.8, 8.8], target: [0, -1.65, 0], frame: 1.16 }, // 04: pembasahan
];

/** Putar diorama mengikuti seretan pembaca, dengan perlambatan halus. */
function Turntable({ stateRef, children }: { stateRef: RefObject<BaraState>; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    const s = stateRef.current;
    const g = ref.current;
    if (!s || !g) return;
    const want = Math.max(-BARA_MAX_ROTATION, Math.min(BARA_MAX_ROTATION, s.rotation));
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, want, s.reducedMotion ? 30 : 6, Math.min(delta, 0.05));
  });
  return <group ref={ref}>{children}</group>;
}

function CameraRig({ stateRef }: { stateRef: RefObject<BaraState> }) {
  const camera = useThree((s) => s.camera);
  const look = useRef(new THREE.Vector3(...CAMERA_POSES[0].target));
  const wantPos = useMemo(() => new THREE.Vector3(), []);
  const wantTarget = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const s = stateRef.current;
    if (!s) return;
    const dt = Math.min(delta, 0.05);
    const pose = CAMERA_POSES[s.act] ?? CAMERA_POSES[0];

    // Layar sempit butuh kamera lebih jauh agar penampang utuh terlihat.
    const aspect = state.size.width / Math.max(1, state.size.height);
    const zoom = aspect < 0.8 ? 1.65 : aspect < 1.3 ? 1.22 : 1;
    const parallax = s.reducedMotion ? 0 : 1;

    wantTarget.set(...pose.target);
    wantPos
      .set(...pose.pos)
      .sub(wantTarget)
      .multiplyScalar(zoom * pose.frame)
      .add(wantTarget);
    wantPos.x += state.pointer.x * 0.3 * parallax;
    wantPos.y += state.pointer.y * 0.18 * parallax;

    const k = s.reducedMotion ? 30 : 2.1;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, wantPos.x, k, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, wantPos.y, k, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, wantPos.z, k, dt);
    look.current.lerp(wantTarget, 1 - Math.exp(-k * dt));
    camera.lookAt(look.current);

    // Di layar lebar, gambar digeser ke kanan agar tidak tertutup panel teks.
    const cam = camera as THREE.PerspectiveCamera;
    const { width, height } = state.size;
    const shift = aspect > 1.3 ? -width * 0.045 : 0;
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
 * Penggerak simulasi: memajukan waktu, menyalin hasilnya ke tekstur data, dan
 * menghaluskan nilai-nilai tampilan (termal, nyala, semburan air, kabut asap).
 */
function Simulation({
  sim,
  stateRef,
  field,
  data,
  quality,
  onStats,
  onSubsidence,
}: {
  sim: SmolderSim;
  stateRef: RefObject<BaraState>;
  field: THREE.DataTexture;
  data: Uint8Array;
  quality: Quality;
  onStats: (stats: SmolderStats) => void;
  onSubsidence: () => void;
}) {
  const profile = QUALITY_PROFILE[quality];
  const clock = useRef({ report: 0, subside: 0, consumed: -1, field: 0 });

  useFrame((_, delta) => {
    const s = stateRef.current;
    if (!s) return;
    const dt = Math.min(delta, 0.05);
    const c = clock.current;

    // Simulasi dimajukan tiap bingkai, tetapi hasilnya hanya disalin ke tekstur
    // penampang beberapa puluh kali per detik: menyalin 96 × 56 sel lalu
    // mengunggahnya ke GPU tidak perlu dilakukan lebih sering daripada mata
    // dapat membedakannya.
    const stepped = sim.advance(dt * s.hoursPerSecond, profile.simSteps);
    c.field -= dt;
    if (stepped && c.field <= 0) {
      c.field = 1 / profile.fieldHz;
      sim.writeField(data);
      field.needsUpdate = true;
    }

    // Nyala permukaan surut sendiri setelah penyulutan; begitu pula semburan air.
    s.flame = Math.max(0, s.flame - dt * s.flameDecay);
    s.spray = Math.max(0, s.spray - dt * 0.5);

    // Tampilan termal & kabut asap bergerak halus.
    const wantThermal = s.view === "termal" ? 1 : 0;
    s.thermal = THREE.MathUtils.damp(s.thermal, wantThermal, s.reducedMotion ? 30 : 5, dt);
    const stats = sim.stats;
    const wantDanger = Math.min(1, stats.consumed * 1.4 + Math.min(0.35, stats.active / 260) + s.flame * 0.25);
    s.danger = THREE.MathUtils.damp(s.danger, wantDanger, s.reducedMotion ? 30 : 0.7, dt);

    // Ringkasan dikirim ke antarmuka lima kali per detik.
    c.report -= dt;
    if (c.report <= 0) {
      c.report = 0.2;
      sim.collect();
      onStats({ ...sim.stats });
    }

    // Bentuk rongga & permukaan diperbarui saat jumlah abu bertambah. Ini
    // membentuk ulang geometri bongkahan dan menghitung ulang normalnya, jadi
    // jedanya diperlonggar di perangkat lemah.
    c.subside -= dt;
    if (c.subside <= 0 && Math.abs(stats.consumed - c.consumed) > 0.002) {
      c.subside = profile.subsideSec;
      c.consumed = stats.consumed;
      onSubsidence();
    }
  });

  return null;
}

type Props = {
  sim: SmolderSim;
  stateRef: RefObject<BaraState>;
  active: boolean;
  quality: Quality;
  onStats: (stats: SmolderStats) => void;
  onProbe: (col: number, row: number) => void;
  onSurfaceClick: (xFraction: number) => void;
  onCollapse: () => void;
  onReady: () => void;
};

export default function BaraScene({
  sim,
  stateRef,
  active,
  quality,
  onStats,
  onProbe,
  onSurfaceClick,
  onCollapse,
  onReady,
}: Props) {
  // Tekstur data hasil simulasi: satu piksel per sel penampang.
  const { field, data } = useMemo(() => {
    const bytes = new Uint8Array(GRID_COLS * GRID_ROWS * 4);
    const texture = new THREE.DataTexture(bytes, GRID_COLS, GRID_ROWS, THREE.RGBAFormat);
    texture.minFilter = texture.magFilter = THREE.LinearFilter;
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return { field: texture, data: bytes };
  }, []);

  const subsidence = useMemo(() => createSubsidence(sim), [sim]);

  useEffect(() => () => field.dispose(), [field]);

  const profile = QUALITY_PROFILE[quality];
  const maxDpr = profile.maxDpr;

  return (
    <Canvas
      shadows={profile.softShadow ? "percentage" : true}
      dpr={[1, maxDpr]}
      frameloop={active ? "always" : "never"}
      camera={{ fov: 34, near: 0.1, far: 400, position: CAMERA_POSES[0].pos }}
      gl={{ antialias: profile.antialias, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.9;
      }}
      fallback={
        <p className="p-6 text-sm text-white/70">
          Peramban Anda tidak mendukung WebGL, jadi penampang gambut tidak dapat ditampilkan.
        </p>
      }
    >
      <SkyLighting stateRef={stateRef} quality={quality} />
      <hemisphereLight args={["#cfdcec", "#2a2116", 0.12]} />
      <CameraRig stateRef={stateRef} />
      <PerformanceGuard maxDpr={maxDpr} />
      <Simulation
        sim={sim}
        stateRef={stateRef}
        field={field}
        data={data}
        quality={quality}
        onStats={onStats}
        onSubsidence={subsidence.refresh}
      />

      <Suspense fallback={null}>
        <Backdrop />
        <group position={[0, DIORAMA_Y, 0]}>
          <Turntable stateRef={stateRef}>
          <CutBlock
            sim={sim}
            stateRef={stateRef}
            field={field}
            subsidence={subsidence}
            onProbe={onProbe}
            onIgnite={onSurfaceClick}
          />
          <SurfaceCover
            sim={sim}
            stateRef={stateRef}
            subsidence={subsidence}
            quality={quality}
            onCollapse={onCollapse}
            onSurfaceClick={onSurfaceClick}
          />
          <SmokePlumes sim={sim} stateRef={stateRef} />
          <WaterSpray stateRef={stateRef} subsidence={subsidence} />
          <SceneLabels sim={sim} stateRef={stateRef} subsidence={subsidence} />
          </Turntable>
        </group>
        <ReadySignal onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}

/** Memberi tahu antarmuka bahwa seluruh tekstur & model sudah selesai dimuat. */
function ReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => onReady(), [onReady]);
  return null;
}
