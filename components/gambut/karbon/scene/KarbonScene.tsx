"use client";

import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useLoader, useThree, type ThreeEvent } from "@react-three/fiber";
import { PEAT_LAYERS } from "@/lib/peat";
import { CarbonSim, type CarbonStats } from "@/lib/carbon";
import PerformanceGuard from "@/components/gambut/scene/PerformanceGuard";
import SkyLighting from "@/components/gambut/scene/SkyLighting";
import Backdrop from "@/components/gambut/scene/Backdrop";
import { createNoiseTexture } from "@/components/gambut/scene/noiseTexture";
import { QUALITY_PROFILE, type KarbonState, type Quality } from "./karbonState";
import {
  createFaceGrid,
  createLostGeometry,
  createTopGrid,
  currentTopY,
  depthAt,
  updateFaceGrid,
  updateTopGrid,
  BLOCK_D,
  BLOCK_W,
  FACE_Z,
  FLOOR_DEPTH_M,
  FLOOR_Y,
} from "./archive";
import {
  createArchiveFaceMaterial,
  createArchiveTopMaterial,
  createLostEdges,
  createLostMaterial,
} from "./archiveMaterial";
import SceneLabels from "./SceneLabels";

// Kanvas 3D Modul 04: bongkahan gambut yang sama dengan Modul 01 dan 02,
// dibaca sebagai arsip dan sebagai gudang karbon.

/**
 * Kamera ortografik isometrik ringan.
 *
 * Ortografik, dengan alasan yang sama seperti Modul 03: seluruh modul ini
 * perbandingan kedalaman, dan kamera perspektif membuat sepuluh sentimeter di
 * bagian atas bidang potong tergambar lebih tebal daripada sepuluh sentimeter
 * di bagian bawah. Pada bidang potong yang dibaca sebagai penggaris tahun,
 * itu bukan sekadar kurang rapi — itu salah.
 *
 * Kemiringannya kecil. Bidang potong di muka yang harus terbaca, bukan bidang
 * atas; sudut yang terlalu tinggi mengecilkan bidang potong demi hamparan
 * abu yang hanya perlu diketahui ada.
 */
const CAMERA_ELEVATION = (22 * Math.PI) / 180;
const CAMERA_AZIMUTH = (20 * Math.PI) / 180;

/**
 * Jarak kamera.
 *
 * Pada kamera ortografik, jarak tidak mengubah besar gambar sama sekali —
 * tetapi ia menentukan kabut, dan kabut itulah yang sempat merusak adegan
 * ini. Kabut eksponensial dihitung dari kedalaman terhadap kamera, jadi
 * kamera yang ditaruh empat puluh meter di belakang bongkahan selebar empat
 * meter menyelimuti seluruhnya dengan kabut setebal sepertiga: bidang potong
 * yang bertekstur masih selamat, tetapi dinding samping yang gelap polos
 * memutih menjadi bidang kelabu, dan bongkahan tanah yang satu sisinya
 * kelabu polos berhenti terbaca sebagai tanah.
 *
 * Jebakan yang sama sudah tercatat pada Modul 03 dan tetap terulang di sini,
 * sebab di sana angkanya terasa kecil (150 untuk petak 80 m) dan di sini
 * terasa besar (40 untuk bongkahan 4,4 m) — padahal yang menentukan nisbahnya
 * terhadap kerapatan kabut, bukan terhadap ukuran bongkahannya. Aturannya:
 * sedekat yang masih memuat bongkahan di depan bidang keratan dekat.
 */
const CAMERA_DISTANCE = 14;

/** Batas jauh keratan kamera: harus memuat kubah asap `SkyLighting`. */
const CAMERA_FAR = CAMERA_DISTANCE + 400;

/** Ruang di atas bongkahan yang harus ikut muat (m): keterangan lebar. */
const HEADROOM = 1.2;

const CONTENT_WIDTH = BLOCK_W * Math.cos(CAMERA_AZIMUTH) + BLOCK_D * Math.sin(CAMERA_AZIMUTH);
const CONTENT_HEIGHT =
  (FLOOR_DEPTH_M + HEADROOM) * Math.cos(CAMERA_ELEVATION) + BLOCK_D * Math.sin(CAMERA_ELEVATION);

/**
 * Ruang kosong di layar yang boleh dipakai gambar: [kiri, kanan, atas, bawah].
 *
 * Angkanya sama dengan Modul 03 dan diukur dari tata letak yang sama: panel
 * cerita dan panel kendali di kiri berakhir di x 460 pada layar 1440, kolom
 * angka di kanan mulai di x 1164. Disamakan dengan sengaja — kedua modul
 * memakai kerangka antarmuka yang sama, jadi gambarnya harus berdiri di
 * tempat yang sama supaya berpindah modul tidak terasa seperti berpindah
 * situs.
 */
const FREE_WIDE = { left: 0.325, right: 0.805, top: 0.12, bottom: 0.95 };

/** Di bawah lebar lg, kolom kanan disembunyikan: yang kosong pita di tengah. */
const FREE_NARROW = { left: 0.04, right: 0.96, top: 0.22, bottom: 0.62 };

/** Lebar layar tempat kolom kanan mulai tampil (piksel CSS, titik putus `lg`). */
const PANEL_BREAKPOINT = 1024;

/**
 * Batas resolusi render khusus modul ini.
 *
 * Lebih longgar daripada Modul 03 (1,25) karena peneduhnya jauh lebih murah:
 * tidak ada tekstur keadaan yang dibaca tiap piksel, tidak ada simulasi yang
 * berjalan tiap bingkai, dan bongkahannya hanya menempati sepertiga layar.
 * Yang mahal di sini justru ketajaman garis abad, dan garis setipis itu
 * memang membutuhkan piksel.
 */
const MODULE_MAX_DPR = { high: 1.5, low: 1 } as const;

function CameraRig() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    const aspect = size.width / Math.max(1, size.height);
    const free = size.width >= PANEL_BREAKPOINT ? FREE_WIDE : FREE_NARROW;

    const shareX = free.right - free.left;
    const shareY = free.bottom - free.top;
    const width = Math.max(CONTENT_WIDTH / shareX, (CONTENT_HEIGHT / shareY) * aspect);

    const halfW = width / 2;
    const halfH = halfW / aspect;
    cam.left = -halfW;
    cam.right = halfW;
    cam.top = halfH;
    cam.bottom = -halfH;
    cam.near = 1;
    cam.far = CAMERA_FAR;

    // Titik tengah pita kosong, dinyatakan sebagai pecahan layar. Kamera
    // digeser berlawanan arah: menggeser bidikan ke kiri memindahkan
    // gambarnya ke kanan.
    const centerX = -((free.left + free.right) / 2 - 0.5) * width;
    // Bongkahan membentang dari y = 0 ke bawah, jadi titik tengahnya separuh
    // kedalaman di bawah permukaan — bukan di permukaan.
    const centerY =
      ((free.top + free.bottom) / 2 - 0.5) * (width / aspect) - FLOOR_DEPTH_M / 2 + HEADROOM / 4;

    const target = new THREE.Vector3(centerX, centerY, 0);
    const dir = new THREE.Vector3(
      Math.sin(CAMERA_AZIMUTH) * Math.cos(CAMERA_ELEVATION),
      Math.sin(CAMERA_ELEVATION),
      Math.cos(CAMERA_AZIMUTH) * Math.cos(CAMERA_ELEVATION),
    );
    cam.position.copy(target).addScaledVector(dir, CAMERA_DISTANCE);
    cam.up.set(0, 1, 0);
    cam.lookAt(target);
    cam.updateProjectionMatrix();
  }, [camera, size]);

  return null;
}

/**
 * Penggerak simulasi: memajukan tahun pemulihan dan menghaluskan nilai-nilai
 * tampilan.
 *
 * Jauh lebih ringan daripada penggerak Modul 02 dan 03 — tidak ada kisi yang
 * dilangkahi, tidak ada tekstur keadaan yang disalin. Seluruh keadaan modul
 * ini tiga angka, jadi yang dikerjakan di sini hanya memajukan waktu dan
 * mengirim ringkasannya lima kali sedetik.
 */
function Simulation({
  sim,
  stateRef,
  onStats,
}: {
  sim: CarbonSim;
  stateRef: RefObject<KarbonState>;
  onStats: (stats: CarbonStats) => void;
}) {
  const clock = useRef(0);

  useFrame((_, delta) => {
    const s = stateRef.current;
    if (!s) return;
    const dt = Math.min(delta, 0.05);

    sim.setBurnDepth(s.burnDepthM);
    sim.advance(dt * s.yearsPerSecond);

    // Nilai yang digambar menyusul nilai yang diminta, supaya permukaan tidak
    // melompat saat pengatur diseret.
    const k = s.reducedMotion ? 30 : 4.2;
    s.drawnBurnM = THREE.MathUtils.damp(s.drawnBurnM, s.burnDepthM, k, dt);
    s.drawnRegrownM = THREE.MathUtils.damp(s.drawnRegrownM, sim.regrownM(), k, dt);

    // Penggaris abad menyala penuh di babak yang memang tentang umur, lalu
    // diredupkan — tidak dimatikan — sesudahnya.
    const wantCalendar = s.act === 0 ? 1 : 0.55;
    s.calendar = THREE.MathUtils.damp(s.calendar, wantCalendar, s.reducedMotion ? 30 : 3, dt);

    // Langit menyusul dalamnya kebakaran, perlahan: bahaya yang melompat
    // membuat peta lingkungan dibuat ulang berkali-kali dalam sedetik, dan
    // itu operasi termahal di seluruh adegan.
    //
    // Dibatasi 0,7, dan lerengnya dilandaikan. Semula setengah meter bakar
    // sudah menghasilkan bahaya 0,83 — hampir asap pekat — sehingga seluruh
    // layar berubah sepia begitu pembaca mengerjakan tugas babak 02, dan teks
    // cerita di kiri kehilangan kontrasnya tepat ketika ia paling perlu
    // dibaca. Langit yang menguning di sini sambungan ke Modul 02, bukan
    // pokok ceritanya sendiri; ia harus terlihat, bukan mengambil alih.
    const wantDanger = Math.min(0.7, s.drawnBurnM / 1.3);
    s.danger = THREE.MathUtils.damp(s.danger, wantDanger, 1.5, dt);

    clock.current -= dt;
    if (clock.current <= 0) {
      clock.current = 0.2;
      sim.collect();
      onStats({ ...sim.stats });
    }
  });

  return null;
}

/** Bongkahan: bidang potong, hamparan permukaan, dinding, dan yang hilang. */
function Block({
  stateRef,
  noise,
  onProbe,
}: {
  stateRef: RefObject<KarbonState>;
  noise: THREE.DataTexture;
  onProbe: (depthM: number) => void;
}) {
  const colors = useLoader(
    THREE.TextureLoader,
    PEAT_LAYERS.map((l) => `/textures/gambut/${l.id}_color.webp`),
  );
  const normals = useLoader(
    THREE.TextureLoader,
    PEAT_LAYERS.map((l) => `/textures/gambut/${l.id}_normal.webp`),
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
    for (const t of normals) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4;
    }
    groundColor.colorSpace = THREE.SRGBColorSpace;
    for (const t of [groundColor, groundNormal]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4;
    }

    return {
      faceGeom: createFaceGrid(),
      faceMaterial: createArchiveFaceMaterial(colors, normals, noise),
      topGeom: createTopGrid(),
      topMaterial: createArchiveTopMaterial(groundColor, groundNormal, noise),
      lostGeom: createLostGeometry(),
      lostMaterial: createLostMaterial(),
      lostEdges: createLostEdges(),
      // Dinding samping dan belakang: tanah yang teduh, bukan hitam — ia
      // bagian dari bongkahan yang sama, hanya tidak kena cahaya.
      //
      // `envMapIntensity` ditekan jauh ke bawah, dan itu bukan selera.
      // Dinding kanan bongkahan ini menghadap persis ke arah datangnya
      // matahari, sehingga dengan pantulan langit penuh ia memutih menjadi
      // bidang kelabu — dan bongkahan tanah yang salah satu sisinya kelabu
      // polos berhenti terbaca sebagai tanah, lalu menjadi kotak. Yang harus
      // dibaca pembaca bidang potong di muka; sisi-sisinya hanya perlu
      // menyatakan bahwa bongkahan ini padat.
      sideMaterial: new THREE.MeshStandardMaterial({
        color: "#1d150f",
        roughness: 1,
        metalness: 0,
        envMapIntensity: 0.18,
      }),
    };
  }, [colors, normals, groundColor, groundNormal, noise]);

  useEffect(
    () => () => {
      res.faceGeom.dispose();
      res.faceMaterial.dispose();
      res.topGeom.dispose();
      res.topMaterial.dispose();
      res.lostGeom.dispose();
      res.lostMaterial.dispose();
      res.lostEdges.geometry.dispose();
      (res.lostEdges.material as THREE.Material).dispose();
      res.sideMaterial.dispose();
    },
    [res],
  );

  const built = useRef({ burn: -1, regrown: -1 });
  const lostRef = useRef<THREE.Mesh>(null);
  const wallsRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const s = stateRef.current;
    if (!s) return;

    const face = res.faceMaterial.archiveUniforms;
    const top = res.topMaterial.archiveUniforms;
    for (const u of [face, top]) {
      u.uBurnDepth.value = s.drawnBurnM;
      u.uRegrown.value = s.drawnRegrownM;
      // GLSL tidak punya null: ketiadaan penanda dinyatakan sebagai kedalaman
      // negatif, dan penerjemahannya hanya ada di sini supaya tidak ada
      // pemanggil lain yang perlu mengingatnya.
      u.uProbeDepth.value = s.probeDepthM ?? -1;
      u.uCalendar.value = s.calendar;
    }

    // Bentuk hanya dihitung ulang saat salah satu angkanya benar-benar
    // berubah. Ambang 2 mm: lebih rapat daripada itu tidak pernah terlihat
    // pada bongkahan setinggi beberapa ratus piksel.
    const b = built.current;
    if (Math.abs(s.drawnBurnM - b.burn) > 0.002 || Math.abs(s.drawnRegrownM - b.regrown) > 0.002) {
      b.burn = s.drawnBurnM;
      b.regrown = s.drawnRegrownM;
      updateFaceGrid(res.faceGeom, s.drawnBurnM, s.drawnRegrownM);
      updateTopGrid(res.topGeom, s.drawnBurnM, s.drawnRegrownM);

      // Kotak "yang hilang" menempati ruang antara permukaan sekarang dan
      // permukaan asal. Tingginya karena itu bukan kedalaman bakar melainkan
      // sisa takik yang belum tertimbun — yang sudah tertimbun ulang bukan
      // lagi sesuatu yang hilang.
      const gap = Math.max(0, s.drawnBurnM - s.drawnRegrownM);
      const lostY = currentTopY(0, 0, s.drawnBurnM, s.drawnRegrownM);
      const lost = lostRef.current;
      if (lost) {
        lost.visible = gap > 0.01;
        lost.position.set(0, lostY, 0);
        lost.scale.set(BLOCK_W, gap, BLOCK_D);
      }
      // Rusuknya digambar terpisah dan jauh lebih terang daripada isinya.
      // Tanpa rusuk, kotak setipis itu terbaca sebagai tudung kelabu yang
      // menutupi bongkahan — bukan sebagai ruang kosong berbentuk tanah yang
      // dahulu mengisinya. Rusuklah yang mengubahnya menjadi bayangan benda.
      res.lostEdges.visible = gap > 0.01;
      res.lostEdges.position.set(0, lostY, 0);
      res.lostEdges.scale.set(BLOCK_W, gap, BLOCK_D);

      // Dinding samping dan belakang tumbuh dari dasar sampai permukaan yang
      // sedang berlaku, jadi tingginya ikut berubah saat gambutnya terbakar.
      const walls = wallsRef.current;
      if (walls) {
        const height = currentTopY(0, 0, s.drawnBurnM, s.drawnRegrownM) - FLOOR_Y;
        walls.scale.set(1, Math.max(0.01, height), 1);
      }
    }
  });

  /**
   * Pembaca menandai satu kedalaman pada bidang potong — tugas babak 01.
   *
   * Titik tumbukannya dalam ruang dunia, dan ruang dunia modul ini tidak
   * digeser maupun diputar sama sekali, jadi kedalamannya dapat dibaca
   * langsung dari y. Kalau suatu saat bongkahan ini dipindah atau diputar,
   * di sinilah tempat yang harus diubah.
   */
  const handlePointer = (e: ThreeEvent<PointerEvent>) => {
    const s = stateRef.current;
    if (!s || s.act !== 0) return;
    // Hanya menandai saat tombolnya ditekan, supaya melewatkan tetikus di
    // atas bidang potong tidak diam-diam mengubah jawaban pembaca.
    if (e.type === "pointermove" && e.buttons === 0) return;
    e.stopPropagation();
    onProbe(depthAt(e.point.x, FACE_Z, e.point.y));
  };

  // Tinggi dinding dinyatakan sebagai skala pada grup, jadi geometrinya
  // setinggi satu satuan dengan titik tumpu di alas.
  const wallY = FLOOR_Y;

  return (
    <group>
      <mesh
        geometry={res.faceGeom}
        material={res.faceMaterial}
        receiveShadow
        onPointerDown={handlePointer}
        onPointerMove={handlePointer}
      />
      <mesh geometry={res.topGeom} material={res.topMaterial} receiveShadow castShadow />

      <group ref={wallsRef} position={[0, wallY, 0]}>
        {/* Dinding kiri dan kanan. Geometrinya setinggi satu satuan dengan
            titik tumpu di alas, sehingga skala tegak grup di atas menjadi
            tingginya dalam meter. */}
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            position={[(side * BLOCK_W) / 2, 0.5, 0]}
            rotation={[0, Math.PI / 2, 0]}
            material={res.sideMaterial}
          >
            <planeGeometry args={[BLOCK_D, 1]} />
          </mesh>
        ))}
        <mesh position={[0, 0.5, -BLOCK_D / 2]} rotation={[0, Math.PI, 0]} material={res.sideMaterial}>
          <planeGeometry args={[BLOCK_W, 1]} />
        </mesh>
      </group>

      {/* Dasar bongkahan. Rata dan gelap: ia hanya alas, bukan bagian dari
          cerita, tetapi tanpanya bongkahan ini berlubang dari bawah. */}
      <mesh position={[0, FLOOR_Y, 0]} rotation={[Math.PI / 2, 0, 0]} material={res.sideMaterial}>
        <planeGeometry args={[BLOCK_W, BLOCK_D]} />
      </mesh>

      <mesh ref={lostRef} geometry={res.lostGeom} material={res.lostMaterial} visible={false} />
      <primitive object={res.lostEdges} />
    </group>
  );
}

type Props = {
  sim: CarbonSim;
  stateRef: RefObject<KarbonState>;
  active: boolean;
  quality: Quality;
  onStats: (stats: CarbonStats) => void;
  onProbe: (depthM: number) => void;
  onReady: () => void;
};

export default function KarbonScene({
  sim,
  stateRef,
  active,
  quality,
  onStats,
  onProbe,
  onReady,
}: Props) {
  const noise = useMemo(() => createNoiseTexture(), []);
  useEffect(() => () => noise.dispose(), [noise]);

  const profile = QUALITY_PROFILE[quality];
  const maxDpr = Math.min(profile.maxDpr, MODULE_MAX_DPR[quality]);

  return (
    <Canvas
      orthographic
      dpr={[1, maxDpr]}
      frameloop={active ? "always" : "never"}
      gl={{ antialias: profile.antialias, powerPreference: "high-performance" }}
      shadows={profile.softShadow ? "percentage" : "basic"}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.95;
      }}
      fallback={
        <p className="p-6 text-sm text-white/70">
          Peramban Anda tidak mendukung WebGL, jadi bongkahan gambut tidak dapat ditampilkan.
        </p>
      }
    >
      <CameraRig />
      <PerformanceGuard maxDpr={maxDpr} />
      {/* Langit, kabut, dan matahari yang sama dengan modul lain. Bongkahan
          ini sebesar bongkahan Modul 01 dan 02, jadi skala dunianya 1 —
          tidak ada yang perlu disetel ulang. */}
      <SkyLighting stateRef={stateRef} quality={quality} backgroundDim={0.6} />
      <Suspense fallback={null}>
        <Backdrop />
      </Suspense>
      <Simulation sim={sim} stateRef={stateRef} onStats={onStats} />
      <Suspense fallback={null}>
        <Block stateRef={stateRef} noise={noise} onProbe={onProbe} />
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
