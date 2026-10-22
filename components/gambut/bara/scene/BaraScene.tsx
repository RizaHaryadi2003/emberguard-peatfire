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
import {
  createSubsidence,
  BARA_MAX_TILT_DOWN,
  BARA_MAX_TILT_UP,
  DIORAMA_Y,
  QUALITY_PROFILE,
  type BaraState,
  type Quality,
} from "./baraState";

// Kanvas 3D Modul 02. Kamera menghadap bidang potong hampir tegak lurus supaya
// seluruh kejadian di bawah tanah terbaca, dengan sedikit sudut agar bongkahan
// tetap terasa berdimensi tiga.

/**
 * Pose kamera tiap babak: arah pandang (derajat) dan jarak (m) ke titik bidik.
 *
 * Ditulis sebagai sudut, bukan koordinat, karena yang harus sama dengan Modul
 * 01 memang sudut dan jaraknya — di sana kamera berdiri pada azimut 33–39°,
 * ketinggian 8–16°, dan jarak 12,3–14,3 m dengan bidang pandang 34°.
 * Bongkahannya pun sama (BLOCK_WIDTH, BLOCK_DEPTH, dan bentuk tapak yang
 * sama), jadi dengan pose yang setara ia tampak persis sebesar dan sekokoh
 * bongkahan Modul 01.
 *
 * Dahulu modul ini memandang bidang potong hampir tegak lurus (azimut 10–15°).
 * Kedalaman memang terbaca paling jujur dari sana, tetapi bongkahannya
 * terbaca sebagai lembaran datar, bukan bongkahan tanah yang sama dengan
 * modul sebelumnya. Dengan azimut Modul 01, dinding sampingnya ikut terlihat
 * sehingga tebalnya terasa — sementara bidang potong hanya memendek 19%,
 * jauh dari cukup untuk menyembunyikan bara di dalamnya.
 */
type CameraPose = {
  /** Sudut datang kamera terhadap sumbu z, searah sumbu x positif (derajat). */
  azimuth: number;
  /** Ketinggian kamera di atas bidang datar (derajat). */
  elevation: number;
  distance: number;
  target: [number, number, number];
};

const CAMERA_POSES: CameraPose[] = [
  { azimuth: 38, elevation: 26, distance: 13.0, target: [0, -0.35, 0] }, // 01: permukaan tempat menyulut
  { azimuth: 34, elevation: 9, distance: 13.4, target: [0, -1.5, 0] }, // 02: seluruh penampang
  { azimuth: 38, elevation: 20, distance: 13.0, target: [0, -1.0, 0] }, // 03: permukaan & penampang bersama
  { azimuth: 35, elevation: 12, distance: 13.2, target: [0, -1.55, 0] }, // 04: pembasahan
];

/** Letak kamera suatu pose, relatif terhadap titik bidiknya. */
function poseOffset(out: THREE.Vector3, pose: CameraPose): THREE.Vector3 {
  const az = THREE.MathUtils.degToRad(pose.azimuth);
  const el = THREE.MathUtils.degToRad(pose.elevation);
  const flat = Math.cos(el) * pose.distance;
  return out.set(Math.sin(az) * flat, Math.sin(el) * pose.distance, Math.cos(az) * flat);
}

/** Letak kamera saat kanvas pertama dibuat. */
const INITIAL_POS = poseOffset(new THREE.Vector3(), CAMERA_POSES[0])
  .add(new THREE.Vector3(...CAMERA_POSES[0].target))
  .toArray() as [number, number, number];

/**
 * Putar diorama mengikuti seretan pembaca, dengan perlambatan halus.
 *
 * Dua kelompok bersarang, bukan satu: kelompok luar menjungkitkan diorama
 * (sumbu x), kelompok dalam memutarnya (sumbu y). Urutan ini yang membuat
 * seretan terasa wajar — menyeret mendatar selalu memutar pada poros tegak
 * diorama, berapa pun jungkitannya, bukan mengayun miring.
 */
function Turntable({ stateRef, children }: { stateRef: RefObject<BaraState>; children: React.ReactNode }) {
  const pitch = useRef<THREE.Group>(null);
  const yaw = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    const s = stateRef.current;
    if (!s || !pitch.current || !yaw.current) return;
    const dt = Math.min(delta, 0.05);
    // Perlambatan sama dengan Modul 01 (4, bukan 6) supaya seretan di kedua
    // modul terasa seberat yang sama.
    const k = s.reducedMotion ? 30 : 4;
    // Ayunan diam yang sama pula: saat tidak disentuh, diorama bergoyang
    // sangat pelan sejauh ± 0,06 radian, jauh di dalam ambang "menghadap
    // penampang" sehingga tombol kembali tidak ikut terpicu.
    const idle = s.reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.18) * 0.06;
    // Putaran kiri/kanan dibiarkan bebas; jungkitan tetap dibatasi supaya
    // diorama tidak pernah terbalik dan langit tetap berada di atas.
    const wantYaw = s.rotation + idle;
    const wantPitch = Math.max(-BARA_MAX_TILT_UP, Math.min(BARA_MAX_TILT_DOWN, s.tilt));
    yaw.current.rotation.y = THREE.MathUtils.damp(yaw.current.rotation.y, wantYaw, k, dt);
    pitch.current.rotation.x = THREE.MathUtils.damp(pitch.current.rotation.x, wantPitch, k, dt);
  });
  return (
    <group ref={pitch}>
      <group ref={yaw}>{children}</group>
    </group>
  );
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
    // Angkanya sama dengan Modul 01, begitu pula paralaks kursornya.
    const aspect = state.size.width / Math.max(1, state.size.height);
    const zoom = aspect < 0.8 ? 1.7 : aspect < 1.3 ? 1.25 : 1;
    const parallax = s.reducedMotion ? 0 : 1;

    wantTarget.set(...pose.target);
    poseOffset(wantPos, pose).multiplyScalar(zoom).add(wantTarget);
    wantPos.x += state.pointer.x * 0.35 * parallax;
    wantPos.y += state.pointer.y * 0.2 * parallax;

    const k = s.reducedMotion ? 30 : 2.2;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, wantPos.x, k, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, wantPos.y, k, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, wantPos.z, k, dt);
    look.current.lerp(wantTarget, 1 - Math.exp(-k * dt));
    camera.lookAt(look.current);

    // Di layar lebar, gambar digeser ke kanan agar tidak tertutup panel teks.
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
      shadows={profile.softShadow ? "percentage" : "basic"}
      dpr={[1, maxDpr]}
      frameloop={active ? "always" : "never"}
      camera={{ fov: 34, near: 0.1, far: 400, position: INITIAL_POS }}
      gl={{ antialias: profile.antialias, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        // Dinaikkan dari 0,9: seluruh adegan terbaca terlalu gelap, dan yang
        // paling dirugikan justru penampang — bagian yang harus dibaca.
        gl.toneMappingExposure = 1.12;
      }}
      fallback={
        <p className="p-6 text-sm text-white/70">
          Peramban Anda tidak mendukung WebGL, jadi penampang gambut tidak dapat ditampilkan.
        </p>
      }
    >
      <SkyLighting stateRef={stateRef} quality={quality} />
      {/* Cahaya langit-tanah yang lembut, menaikkan dasar kegelapan supaya
          sisi yang tidak kena matahari tidak jatuh ke hitam pekat. */}
      <hemisphereLight args={["#cfdcec", "#3a2e20", 0.3]} />
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
