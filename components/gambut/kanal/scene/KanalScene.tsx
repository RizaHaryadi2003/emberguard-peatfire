"use client";

import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { PEAT_LAYERS } from "@/lib/peat";
import { DrainageSim, TRANSECT_LENGTH_M, type DrainageStats } from "@/lib/drainage";
import PerformanceGuard from "@/components/gambut/scene/PerformanceGuard";
import { QUALITY_PROFILE, type KanalState, type Quality } from "./kanalState";
import {
  createCanalGeometry,
  createCanalWaterGeometry,
  createFaceGrid,
  createSubsidence,
  createSurfaceGrid,
  surfaceY,
  updateCanalGeometry,
  updateFaceGrid,
  updateSurfaceGrid,
  CANAL_LEFT_X,
  CANAL_SCENE_WIDTH,
  NATURAL_CANAL_WATER_M,
  SCENE_DEPTH,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  SURFACE_COLS,
} from "./transect";
import { createFieldTexture, createTransectMaterial } from "./transectMaterial";
import SceneLabels from "./SceneLabels";

// Kanvas 3D Modul 03: satu kilometer gambut yang dipotong kanal, dilihat dari
// samping.

/**
 * Kamera ortografik, bukan perspektif seperti Modul 01 dan 02.
 *
 * Seluruh isi modul ini adalah perbandingan jarak: sejauh apa dari kanal muka
 * airnya masih melewati batas 40 cm. Dengan kamera perspektif, ujung penampang
 * yang jauh akan termampat, sehingga 200 m di dekat kanal tergambar lebih
 * panjang daripada 200 m di ujung — dan penanda jaraknya menjadi dusta.
 * Ortografik menjaga satu meter tetap satu meter di mana pun ia berada.
 *
 * Kemiringan kecil tetap dipakai agar hamparan permukaan ikut terlihat dan
 * bongkahannya terasa punya ketebalan. Pada kamera ortografik kemiringan itu
 * tidak merusak perbandingan jaraknya: seluruh gambar termampat oleh faktor
 * yang sama.
 */
const CAMERA_ELEVATION = 0.1;
const CAMERA_AZIMUTH = 0.055;

/** Lebar penampang berikut kanalnya (satuan adegan). */
const CONTENT_WIDTH = SCENE_WIDTH - CANAL_LEFT_X;

/**
 * Bagian lebar layar yang boleh dipakai gambar, dan di mana titik tengahnya.
 *
 * Di layar lebar, sepertiga kiri layar ditempati teks cerita di atas dan
 * panel kendali di bawah. Dibiarkan terpusat, kanal beserta 240 m pertama
 * dari tepinya — bagian yang paling banyak terjadi — justru tersembunyi di
 * balik teks. Jadi gambarnya digeser ke kanan sampai seluruh penampang
 * berada di ruang yang kosong.
 *
 * Ongkosnya gambar menjadi lebih kecil. Itu dipilih dengan sadar: penampang
 * yang besar tetapi tertutup separuhnya lebih buruk daripada penampang yang
 * lebih kecil tetapi utuh.
 */
const WIDE_SHARE = 0.66;
const WIDE_CENTER = 0.61;

/**
 * Ujung terjauh penampang memang berakhir di bawah panel angka di kanan, dan
 * itu dibiarkan: 800-1.000 m adalah gambut yang nyaris tidak tersentuh, dan
 * panelnya tembus pandang. Yang tidak boleh adalah terpotong tepi layar,
 * karena tepi yang terpotong terbaca sebagai gambar yang rusak, bukan sebagai
 * penampang yang memang berakhir di situ.
 */

function CameraRig() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    const aspect = size.width / Math.max(1, size.height);
    // Di layar sempit teksnya melebar ke seluruh lebar, jadi tidak ada ruang
    // kosong di samping: gambarnya dipusatkan dan diberi tepi secukupnya.
    const wide = aspect >= 1.1;
    const share = wide ? WIDE_SHARE : 0.92;
    const centerShare = wide ? WIDE_CENTER : 0.5;

    const width = CONTENT_WIDTH / share;
    const halfW = width / 2;
    const halfH = halfW / aspect;
    cam.left = -halfW;
    cam.right = halfW;
    cam.top = halfH;
    cam.bottom = -halfH;
    cam.near = -100;
    cam.far = 100;

    // Titik tengah penampang harus jatuh pada `centerShare` lebar layar.
    const contentCenter = (CANAL_LEFT_X + SCENE_WIDTH) / 2;
    const centerX = contentCenter - (centerShare - 0.5) * width;
    // Dibidik sedikit di bawah permukaan: yang paling banyak dibaca adalah
    // separuh atas profil, tempat muka airnya bergerak. Di layar sempit
    // gambarnya diturunkan lagi agar tidak bertemu teks di atasnya.
    const centerY = -SCENE_HEIGHT * (wide ? 0.42 : 0.3);

    const target = new THREE.Vector3(centerX, centerY, 0);
    cam.position.set(
      target.x + Math.sin(CAMERA_AZIMUTH) * 20,
      target.y + Math.sin(CAMERA_ELEVATION) * 20,
      20,
    );
    cam.lookAt(target);
    cam.updateProjectionMatrix();
  }, [camera, size]);

  return null;
}

/**
 * Penggerak simulasi: memajukan tahun, menyalin keadaan ke tekstur data, dan
 * menghaluskan nilai-nilai tampilan.
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
  sim: DrainageSim;
  stateRef: RefObject<KanalState>;
  field: THREE.DataTexture;
  data: Uint8Array;
  quality: Quality;
  onStats: (stats: DrainageStats) => void;
  onSubsidence: () => void;
}) {
  const profile = QUALITY_PROFILE[quality];
  const clock = useRef({ report: 0, field: 0, shape: 0, drop: -1 });

  useFrame((_, delta) => {
    const s = stateRef.current;
    if (!s) return;
    const dt = Math.min(delta, 0.05);
    const c = clock.current;

    // Kedalaman kanal yang digambar menyusul nilai yang diminta pembaca.
    const k = s.reducedMotion ? 30 : 3.4;
    s.drawnCanalDepthM = THREE.MathUtils.damp(s.drawnCanalDepthM, s.canalDepthM, k, dt);
    sim.setCanalDepth(s.canalDepthM);
    if (s.blocked) sim.blockCanal();

    sim.advance(dt * s.yearsPerSecond);

    // Penandaan daerah rawan memudar masuk dan keluar, tidak berkedip.
    const wantTint = s.act >= 1 ? 1 : 0.25;
    s.riskTint = THREE.MathUtils.damp(s.riskTint, wantTint, s.reducedMotion ? 30 : 4, dt);

    // Tekstur keadaan disalin beberapa puluh kali per detik; menyalin 200 sel
    // lalu mengunggahnya tidak perlu lebih sering daripada mata dapat
    // membedakannya.
    c.field -= dt;
    if (c.field <= 0) {
      c.field = 1 / profile.fieldHz;
      sim.writeField(data);
      field.needsUpdate = true;
    }

    // Bentuk permukaan dibentuk ulang saat penurunannya berubah. Ini
    // membentuk ulang geometri dan menghitung ulang normalnya, jadi jedanya
    // diperlonggar di perangkat lemah.
    c.shape -= dt;
    if (c.shape <= 0) {
      sim.collect();
      if (Math.abs(sim.stats.maxSubsidenceM - c.drop) > 0.002) {
        c.shape = profile.subsideSec;
        c.drop = sim.stats.maxSubsidenceM;
        onSubsidence();
      }
    }

    // Ringkasan dikirim ke antarmuka lima kali per detik.
    c.report -= dt;
    if (c.report <= 0) {
      c.report = 0.2;
      sim.collect();
      onStats({ ...sim.stats });
    }
  });

  return null;
}

/** Bidang potong, hamparan permukaan, dan kanalnya. */
function Transect({
  sim,
  stateRef,
  field,
  subsidence,
}: {
  sim: DrainageSim;
  stateRef: RefObject<KanalState>;
  field: THREE.DataTexture;
  subsidence: ReturnType<typeof createSubsidence>;
}) {
  const colors = useLoader(
    THREE.TextureLoader,
    PEAT_LAYERS.map((l) => `/textures/gambut/${l.id}_color.webp`),
  );
  const [groundColor, groundNormal] = useLoader(THREE.TextureLoader, [
    "/textures/gambut/permukaan_kering_color.webp",
    "/textures/gambut/permukaan_kering_normal.webp",
  ]);

  const res = useMemo(() => {
    for (const t of colors) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4;
    }
    groundColor.colorSpace = THREE.SRGBColorSpace;
    for (const t of [groundColor, groundNormal]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4;
    }

    const faceGeom = createFaceGrid();
    const faceMaterial = createTransectMaterial(colors, field);
    const surfaceGeom = createSurfaceGrid();
    const canalGeom = createCanalGeometry();
    const canalWaterGeom = createCanalWaterGeometry();

    return {
      faceGeom,
      faceMaterial,
      surfaceGeom,
      canalGeom,
      canalWaterGeom,
      // Air di dalam kanal. Inilah yang membuat galian itu terbaca sebagai
      // kanal, dan sekaligus yang memperlihatkan kerja sekatnya: begitu sekat
      // dipasang, permukaannya naik kembali mendekati permukaan tanah.
      canalWaterMaterial: new THREE.MeshStandardMaterial({
        color: "#2f5f78",
        roughness: 0.18,
        metalness: 0.1,
        transparent: true,
        opacity: 0.92,
      }),
      surfaceMaterial: new THREE.MeshStandardMaterial({
        map: groundColor,
        normalMap: groundNormal,
        color: "#8f9273",
        roughness: 1,
        metalness: 0,
        vertexColors: true,
      }),
      // Dinding kanal: tanah yang teduh, bukan hitam — ia bagian dari
      // bongkahan yang sama, hanya tidak kena cahaya.
      canalMaterial: new THREE.MeshStandardMaterial({ color: "#2a211a", roughness: 1, side: THREE.DoubleSide }),
      // Penutup gelap di belakang bidang potong, supaya tidak ada yang bolong
      // ke latar saat permukaannya melesak.
      backingMaterial: new THREE.MeshBasicMaterial({ color: "#140f0b" }),
    };
  }, [colors, groundColor, groundNormal, field]);

  useEffect(
    () => () => {
      res.faceGeom.dispose();
      res.faceMaterial.dispose();
      res.surfaceGeom.dispose();
      res.canalGeom.dispose();
      res.canalWaterGeom.dispose();
      res.canalWaterMaterial.dispose();
      res.surfaceMaterial.dispose();
      res.canalMaterial.dispose();
      res.backingMaterial.dispose();
    },
    [res],
  );

  const built = useRef(-1);
  const rebuild = () => {
    updateFaceGrid(res.faceGeom, subsidence.fn);
    updateSurfaceGrid(res.surfaceGeom, subsidence.fn);
    // Warna hangus hamparan permukaan: makin kering, makin pucat lalu kelabu.
    const color = res.surfaceGeom.attributes.color as THREE.BufferAttribute;
    const pos = res.surfaceGeom.attributes.position as THREE.BufferAttribute;
    const cols = SURFACE_COLS + 1;
    for (let i = 0; i < pos.count; i++) {
      const distance = ((i % cols) / SURFACE_COLS) * TRANSECT_LENGTH_M;
      const drop = subsidence.fn(distance);
      const dry = Math.min(1, drop / 0.5);
      const k = 1 - dry * 0.45;
      color.setXYZ(i, k, k * 0.98, k * 0.9);
    }
    color.needsUpdate = true;
    built.current = subsidence.version;
  };

  useEffect(rebuild, [res, subsidence]);

  const drawnDepth = useRef(-1);
  const waterRef = useRef<THREE.Mesh>(null);
  const waterLevel = useRef(0);

  useFrame((_, delta) => {
    const s = stateRef.current;
    if (!s) return;
    const dt = Math.min(delta, 0.05);
    if (built.current !== subsidence.version) rebuild();
    res.faceMaterial.uniforms.uDryTint.value = s.riskTint;

    // Kanal dibentuk ulang hanya bila kedalaman gambarnya benar-benar berubah.
    if (Math.abs(s.drawnCanalDepthM - drawnDepth.current) > 0.002) {
      drawnDepth.current = s.drawnCanalDepthM;
      updateCanalGeometry(res.canalGeom, s.drawnCanalDepthM);
    }

    // Permukaan air kanal: di dasar selama kanal mengalirkan air keluar, naik
    // mendekati permukaan tanah begitu sekat menahannya.
    const want = s.blocked ? -NATURAL_CANAL_WATER_M : -s.drawnCanalDepthM;
    waterLevel.current = THREE.MathUtils.damp(waterLevel.current, want, s.reducedMotion ? 30 : 1.6, dt);
    const mesh = waterRef.current;
    if (mesh) {
      mesh.visible = s.drawnCanalDepthM > 0.02;
      mesh.position.set(CANAL_LEFT_X / 2, waterLevel.current, -SCENE_DEPTH / 2);
      mesh.scale.set(CANAL_SCENE_WIDTH, 1, SCENE_DEPTH);
    }
  });

  // Garis permukaan asal: jejak setinggi mana tanah ini dahulu berada.
  //
  // Inilah satu-satunya cara memperlihatkan yang hilang, sebab yang hilang
  // tidak punya geometri. Tanpa garis ini, pembaca melihat permukaan turun
  // tetapi tidak punya pembanding, dan penurunan satu meter pada gambar yang
  // tingginya 3,4 satuan tidak terasa apa-apa.
  const ghost = useMemo(() => {
    const points: number[] = [];
    for (let i = 0; i <= SURFACE_COLS; i++) {
      const distance = (i / SURFACE_COLS) * TRANSECT_LENGTH_M;
      points.push(distance * (SCENE_WIDTH / TRANSECT_LENGTH_M), surfaceY(distance), 0.004);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    const material = new THREE.LineDashedMaterial({
      color: "#ffd9b0",
      dashSize: 0.1,
      gapSize: 0.07,
      transparent: true,
      opacity: 0,
    });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    return { line, material, geometry };
  }, []);

  useEffect(() => () => {
    ghost.geometry.dispose();
    ghost.material.dispose();
  }, [ghost]);

  useFrame((_, delta) => {
    // Jejak permukaan asal baru muncul setelah ada yang hilang untuk ditandai.
    const want = Math.min(0.85, sim.stats.maxSubsidenceM * 4);
    ghost.material.opacity = THREE.MathUtils.damp(ghost.material.opacity, want, 3, Math.min(delta, 0.05));
  });

  return (
    <group>
      <mesh geometry={res.faceGeom} material={res.faceMaterial} />
      <mesh geometry={res.surfaceGeom} material={res.surfaceMaterial} receiveShadow />
      <mesh geometry={res.canalGeom} material={res.canalMaterial} />
      <mesh ref={waterRef} geometry={res.canalWaterGeom} material={res.canalWaterMaterial} visible={false} />
      {/* Penutup gelap, sedikit lebih besar daripada penampangnya */}
      <mesh
        position={[SCENE_WIDTH / 2, -SCENE_HEIGHT / 2 + 0.3, -SCENE_DEPTH - 0.02]}
        material={res.backingMaterial}
      >
        <planeGeometry args={[SCENE_WIDTH + CANAL_LEFT_X * -2 + 0.4, SCENE_HEIGHT + 1.2]} />
      </mesh>
      <primitive object={ghost.line} />
    </group>
  );
}

type Props = {
  sim: DrainageSim;
  stateRef: RefObject<KanalState>;
  active: boolean;
  quality: Quality;
  onStats: (stats: DrainageStats) => void;
  onReady: () => void;
};

export default function KanalScene({ sim, stateRef, active, quality, onStats, onReady }: Props) {
  const { texture: field, data } = useMemo(() => createFieldTexture(), []);
  const subsidence = useMemo(() => createSubsidence(sim), [sim]);

  useEffect(() => () => field.dispose(), [field]);

  const profile = QUALITY_PROFILE[quality];

  return (
    <Canvas
      orthographic
      dpr={[1, profile.maxDpr]}
      frameloop={active ? "always" : "never"}
      gl={{ antialias: profile.antialias, powerPreference: "high-performance" }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        // Latar rata, bukan langit: yang digambar penampang, bukan pemandangan.
        scene.background = new THREE.Color("#0a0a0c");
      }}
      fallback={
        <p className="p-6 text-sm text-white/70">
          Peramban Anda tidak mendukung WebGL, jadi penampang kanal tidak dapat ditampilkan.
        </p>
      }
    >
      <CameraRig />
      <PerformanceGuard maxDpr={profile.maxDpr} />
      <hemisphereLight args={["#cfdcec", "#3a2e20", 0.8]} />
      <directionalLight position={[4, 8, 6]} intensity={1.4} />
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
        <Transect sim={sim} stateRef={stateRef} field={field} subsidence={subsidence} />
        <SceneLabels />
        <ReadySignal onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}

/** Memberi tahu antarmuka bahwa seluruh tekstur sudah selesai dimuat. */
function ReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => onReady(), [onReady]);
  return null;
}
