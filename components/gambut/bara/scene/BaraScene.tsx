"use client";

import { memo, Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import SkyLighting from "@/components/gambut/scene/SkyLighting";
import Backdrop from "@/components/gambut/scene/Backdrop";
import PerformanceGuard from "@/components/gambut/scene/PerformanceGuard";
import {
  DIORAMA_CAMERA_POSES as CAMERA_POSES,
  DIORAMA_EXPOSURE,
  DIORAMA_HEMISPHERE,
} from "@/components/gambut/scene/dioramaConstants";
import { GRID_COLS, GRID_ROWS, smoothField, type SmolderSim, type SmolderStats } from "@/lib/smolder";
import CutBlock from "./CutBlock";
import SurfaceCover from "./SurfaceCover";
import WallDetails from "./WallDetails";
import SurfaceFlame from "./SurfaceFlame";
import { CAMERA_FOV, fitView, type ViewFit } from "./viewFit";
import SmokePlumes from "./SmokePlumes";
import WaterSpray from "./WaterSpray";
import SceneLabels from "./SceneLabels";
import type { LayerHintHandle } from "./layerHint";
import {
  createSubsidence,
  DIORAMA_BASE_YAW,
  DIORAMA_Y,
  QUALITY_PROFILE,
  type BaraState,
  type Quality,
} from "./baraState";

// Kanvas 3D Modul 02. Kamera, cahaya, dan gerak bongkahannya sama dengan Modul
// 01; bedanya hanya bongkahan ini dipotong sehingga isinya terlihat.

/**
 * Putar diorama mengikuti seretan pembaca. Gerakannya sama dengan Modul 01:
 * hanya berputar pada sumbu tegak, bergoyang pelan saat diam, dan melambat
 * halus menuju sasarannya.
 */
function Turntable({ stateRef, children }: { stateRef: RefObject<BaraState>; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    const s = stateRef.current;
    const g = ref.current;
    if (!s || !g) return;
    const dt = Math.min(delta, 0.05);
    const idle = s.reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.18) * 0.06;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, DIORAMA_BASE_YAW + s.rotation + idle, 4, dt);
  });
  return <group ref={ref}>{children}</group>;
}

function CameraRig({ stateRef }: { stateRef: RefObject<BaraState> }) {
  const camera = useThree((s) => s.camera);
  const look = useRef(new THREE.Vector3(...CAMERA_POSES[0].target));
  const wantPos = useMemo(() => new THREE.Vector3(), []);
  const wantTarget = useMemo(() => new THREE.Vector3(), []);
  const offset = useRef({ x: 0, y: 0 });
  // Ukuran dihitung sekali per ukuran layar, bukan tiap bingkai.
  const fits = useRef<{ key: string; list: (ViewFit | null)[] }>({ key: "", list: [] });

  useFrame((state, delta) => {
    const s = stateRef.current;
    if (!s) return;
    const dt = Math.min(delta, 0.05);
    const pose = CAMERA_POSES[s.act] ?? CAMERA_POSES[0];

    const { width, height } = state.size;
    const key = `${width}x${height}`;
    if (fits.current.key !== key) {
      fits.current = { key, list: CAMERA_POSES.map((_, i) => fitView(i, width, height)) };
    }
    const fit = fits.current.list[s.act] ?? fits.current.list[0];

    // Layar lebar memakai ukuran terbesar yang tidak menyentuh teks; layar
    // sempit butuh kamera lebih jauh agar penampang utuh terlihat.
    const aspect = width / Math.max(1, height);
    const zoom = fit ? fit.zoom : aspect < 0.8 ? 1.7 : aspect < 1.3 ? 1.25 : 1;

    wantTarget.set(...pose.target);
    wantPos.set(...pose.pos).sub(wantTarget).multiplyScalar(zoom).add(wantTarget);

    const k = s.reducedMotion ? 30 : 2.2;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, wantPos.x, k, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, wantPos.y, k, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, wantPos.z, k, dt);
    look.current.lerp(wantTarget, 1 - Math.exp(-k * dt));
    camera.lookAt(look.current);

    // Gambar digeser ke tengah ruang yang bebas dari panel teks.
    const cam = camera as THREE.PerspectiveCamera;
    const wantX = fit ? fit.offsetX : aspect > 1.3 ? -width * 0.035 : 0;
    const wantY = fit ? fit.offsetY : 0;
    const o = offset.current;
    o.x = THREE.MathUtils.damp(o.x, wantX, k, dt);
    o.y = THREE.MathUtils.damp(o.y, wantY, k, dt);
    if (Math.abs(o.x - wantX) < 0.25) o.x = wantX;
    if (Math.abs(o.y - wantY) < 0.25) o.y = wantY;

    const current = cam.view?.enabled ? cam.view : null;
    if (o.x || o.y) {
      const same =
        current?.offsetX === o.x &&
        current?.offsetY === o.y &&
        current?.fullWidth === width &&
        current?.fullHeight === height;
      if (!same) cam.setViewOffset(width, height, o.x, o.y, width, height);
    } else if (current) {
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
  raw,
  quality,
  onStats,
  onSubsidence,
}: {
  sim: SmolderSim;
  stateRef: RefObject<BaraState>;
  field: THREE.DataTexture;
  data: Uint8Array;
  raw: Uint8Array;
  quality: Quality;
  onStats: (stats: SmolderStats) => void;
  onSubsidence: () => void;
}) {
  const profile = QUALITY_PROFILE[quality];
  const clock = useRef({ report: 0, subside: 0, consumed: -1, field: 0, fieldRevision: -1, shapeRevision: -1 });

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
    // Kisi yang diulang atau disulut harus langsung tergambar walau waktu sedang
    // berhenti; kalau menunggu langkah waktu, penampang lama tetap terlihat.
    const fieldStale = sim.revision !== c.fieldRevision;
    if (fieldStale || (stepped && c.field <= 0)) {
      c.field = 1 / profile.fieldHz;
      c.fieldRevision = sim.revision;
      sim.writeField(raw);
      // Perataan 3 × 3 dikerjakan di sini, bukan di dalam peneduh: biayanya
      // 5.376 sel beberapa puluh kali per detik, bukan 117 pembacaan tekstur
      // tiap fragmen tiap bingkai.
      smoothField(raw, data);
      field.needsUpdate = true;
    }

    // Nyala permukaan surut sendiri setelah penyulutan; begitu pula semburan air.
    s.flame = Math.max(0, s.flame - dt * s.flameDecay);
    s.spray = Math.max(0, s.spray - dt * 0.22);

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
    // jedanya diperlonggar di perangkat lemah. Selama bongkahan diseret
    // pekerjaan ini ditunda, supaya putarannya tidak tersendat.
    c.subside -= dt;
    const shapeStale = sim.revision !== c.shapeRevision;
    if (!s.dragging && (shapeStale || (c.subside <= 0 && Math.abs(stats.consumed - c.consumed) > 0.002))) {
      c.subside = profile.subsideSec;
      c.shapeRevision = sim.revision;
      c.consumed = stats.consumed;
      onSubsidence();
    }
  });

  return null;
}

type Props = {
  sim: SmolderSim;
  stateRef: RefObject<BaraState>;
  /** Keterangan lapisan yang tampil saat tanah ditunjuk. */
  hint: RefObject<LayerHintHandle | null>;
  active: boolean;
  quality: Quality;
  onStats: (stats: SmolderStats) => void;
  onProbe: (col: number, row: number) => void;
  onSurfaceClick: (xFraction: number) => void;
  onReady: () => void;
  /** Perangkat tetap kewalahan pada resolusi terendah. */
  onOverload: () => void;
};

export default memo(BaraScene);

function BaraScene({
  sim,
  stateRef,
  hint,
  active,
  quality,
  onStats,
  onProbe,
  onSurfaceClick,
  onReady,
  onOverload,
}: Props) {
  // Tekstur data hasil simulasi: satu piksel per sel penampang. Dua penyangga,
  // karena perataan 3 × 3 tidak dapat dikerjakan di tempat — `raw` menampung
  // keadaan sel apa adanya, `data` yang sudah diratakan dan diunggah ke GPU.
  const { field, data, raw } = useMemo(() => {
    const bytes = new Uint8Array(GRID_COLS * GRID_ROWS * 4);
    const texture = new THREE.DataTexture(bytes, GRID_COLS, GRID_ROWS, THREE.RGBAFormat);
    texture.minFilter = texture.magFilter = THREE.LinearFilter;
    // Dijepit, bukan diulang: perataan di `smoothField` menjepit tepinya
    // dengan cara yang sama, dan kesamaan hasilnya bergantung pada itu.
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return { field: texture, data: bytes, raw: new Uint8Array(bytes.length) };
  }, []);

  const subsidence = useMemo(() => createSubsidence(sim), [sim]);

  useEffect(() => () => field.dispose(), [field]);

  const profile = QUALITY_PROFILE[quality];
  const maxDpr = profile.maxDpr;

  return (
    <Canvas
      shadows={profile.softShadow ? "percentage" : "basic"}
      dpr={[1, maxDpr]}
      frameloop={active ? "demand" : "never"}
      camera={{ fov: CAMERA_FOV, near: 0.1, far: 400, position: CAMERA_POSES[0].pos }}
      gl={{ antialias: profile.antialias, powerPreference: "default" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = DIORAMA_EXPOSURE;
      }}
      fallback={
        <p className="p-6 text-sm text-white/70">
          Peramban Anda tidak mendukung WebGL, jadi penampang gambut tidak dapat ditampilkan.
        </p>
      }
    >
      <SkyLighting stateRef={stateRef} quality={quality} />
      <hemisphereLight args={DIORAMA_HEMISPHERE} />
      <CameraRig stateRef={stateRef} />
      <PerformanceGuard maxDpr={maxDpr} onOverload={onOverload} />
      <Simulation
        sim={sim}
        stateRef={stateRef}
        field={field}
        data={data}
        raw={raw}
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
              hint={hint}
              field={field}
              subsidence={subsidence}
              quality={quality}
              onProbe={onProbe}
              onIgnite={onSurfaceClick}
            />
            {/* Tumbuhan menunggu di batas Suspense-nya sendiri.
                Keempat modelnya berjumlah 3,2 MB — dua pertiga seluruh aset
                modul ini — sedangkan yang harus dilihat pembaca lebih dahulu
                adalah bidang potongnya, yang cukup dengan 1,3 MB tekstur
                tanah. Dengan satu batas bersama seperti dahulu, tirai
                pemuatan baru terangkat setelah pohon selesai diunduh, jadi
                penampang yang sudah siap tetap tersembunyi di belakang layar
                hitam. Sekarang penampangnya tampil dulu dan tumbuhannya
                menyusul; menyulut pun sudah bisa lewat bidang potong. */}
            <Suspense fallback={null}>
              <SurfaceCover
                sim={sim}
                stateRef={stateRef}
                subsidence={subsidence}
                quality={quality}
                onSurfaceClick={onSurfaceClick}
              />
              <WallDetails stateRef={stateRef} subsidence={subsidence} />
            </Suspense>
            <SurfaceFlame stateRef={stateRef} />
            <SmokePlumes sim={sim} stateRef={stateRef} quality={quality} />
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
