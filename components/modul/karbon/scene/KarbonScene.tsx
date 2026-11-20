"use client";

import { Suspense, useEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { PEAT_LAYERS } from "@/lib/model/peat";
import { CarbonSim, type CarbonStats } from "@/lib/model/carbon";
import PerformanceGuard from "@/components/modul/shared/scene/PerformanceGuard";
import SkyLighting from "@/components/modul/shared/scene/SkyLighting";
import Backdrop from "@/components/modul/shared/scene/Backdrop";
import { createNoiseTexture } from "@/components/modul/shared/scene/noiseTexture";
import { QUALITY_PROFILE, type KarbonState, type Quality } from "./karbonState";
import { DIORAMA_BASE_YAW, PEAT_LAYER_TINT } from "@/components/modul/shared/scene/dioramaConstants";
import { interfaceY } from "@/components/modul/shared/scene/terrain";
import {
  createHalfBody,
  createSurfaceGrid,
  updateHalfBody,
  updateSurfaceGrid,
} from "@/components/modul/bara/scene/crossSection";
import {
  createFaceGrid,
  createLostOutline,
  surfaceRelief,
  updateFaceGrid,
  updateLostOutline,
  BLOCK_D,
  BLOCK_W,
  FLOOR_DEPTH_M,
} from "./archive";
import {
  createArchiveFaceMaterial,
  createArchiveTopMaterial,
  createLostEdges,
  createLostMaterial,
} from "./archiveMaterial";
import SceneLabels from "./SceneLabels";
import KarbonCover from "./KarbonCover";

// Kanvas 3D Modul Karbon: bongkahan gambut yang sama dengan Modul Anatomi dan Bara,
// dibaca sebagai arsip dan sebagai gudang karbon.

/**
 * Kamera ortografik isometrik ringan.
 *
 * Ortografik, dengan alasan yang sama seperti Modul Kanal: seluruh modul ini
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
 * Jebakan yang sama sudah tercatat pada Modul Kanal dan tetap terulang di sini,
 * sebab di sana angkanya terasa kecil (150 untuk petak 80 m) dan di sini
 * terasa besar (40 untuk bongkahan 4,4 m) — padahal yang menentukan nisbahnya
 * terhadap kerapatan kabut, bukan terhadap ukuran bongkahannya. Aturannya:
 * sedekat yang masih memuat bongkahan di depan bidang keratan dekat.
 */
const CAMERA_DISTANCE = 14;

/** Batas jauh keratan kamera: harus memuat kubah asap `SkyLighting`. */
const CAMERA_FAR = CAMERA_DISTANCE + 400;

/** Ruang di atas bongkahan yang harus ikut muat (m): tajuk pohon dan keterangan lebar. */
const HEADROOM = 1.7;

const CONTENT_WIDTH = BLOCK_W * Math.cos(CAMERA_AZIMUTH) + BLOCK_D * Math.sin(CAMERA_AZIMUTH);
const CONTENT_HEIGHT =
  (FLOOR_DEPTH_M + HEADROOM) * Math.cos(CAMERA_ELEVATION) + BLOCK_D * Math.sin(CAMERA_ELEVATION);

/**
 * Ruang kosong di layar yang boleh dipakai gambar: [kiri, kanan, atas, bawah].
 *
 * Angkanya sama dengan Modul Kanal dan diukur dari tata letak yang sama: panel
 * cerita dan panel kendali di kiri berakhir di x 460 pada layar 1440, kolom
 * angka di kanan mulai di x 1164. Disamakan dengan sengaja — kedua modul
 * memakai kerangka antarmuka yang sama, jadi gambarnya harus berdiri di
 * tempat yang sama supaya berpindah modul tidak terasa seperti berpindah
 * situs.
 */
//
// Batas atas dan bawahnya dirapatkan (semula 0,12 dan 0,95). Bongkahan yang
// memenuhi seluruh tinggi layar menabrak kotak tuntunan dan terasa menekan;
// bongkahan Modul Bara dan Kanal juga menyisakan langit di atas dan di bawahnya.
const FREE_WIDE = { left: 0.34, right: 0.79, top: 0.17, bottom: 0.88 };

/** Di bawah lebar lg, kolom kanan disembunyikan: yang kosong pita di tengah. */
const FREE_NARROW = { left: 0.04, right: 0.96, top: 0.22, bottom: 0.62 };

/** Lebar layar tempat kolom kanan mulai tampil (piksel CSS, titik putus `lg`). */
const PANEL_BREAKPOINT = 1024;

/**
 * Batas resolusi render khusus modul ini.
 *
 * Lebih longgar daripada Modul Kanal (1,25) karena peneduhnya jauh lebih murah:
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

    // Badan bongkahan berada di belakang bidang potong (z ≤ 0), jadi bidikan
    // diarahkan ke tengah tebalnya.
    const target = new THREE.Vector3(centerX, centerY, -BLOCK_D / 2);
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
 * Jauh lebih ringan daripada penggerak Modul Kanal dan Bara — tidak ada kisi yang
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

    // Penggaris abad tampil redup sepanjang modul: ia pengingat bahwa tiap
    // sentimeter yang hilang adalah sepuluh tahun penimbunan, bukan tugas.
    // Babak yang dahulu memakainya penuh (mencari umur Borobudur) sudah dicabut.
    const wantCalendar = 0.55;
    s.calendar = THREE.MathUtils.damp(s.calendar, wantCalendar, s.reducedMotion ? 30 : 3, dt);

    // Langit menyusul dalamnya kebakaran, perlahan: bahaya yang melompat
    // membuat peta lingkungan dibuat ulang berkali-kali dalam sedetik, dan
    // itu operasi termahal di seluruh adegan.
    //
    // Dibatasi 0,7, dan lerengnya dilandaikan. Semula setengah meter bakar
    // sudah menghasilkan bahaya 0,83 — hampir asap pekat — sehingga seluruh
    // layar berubah sepia begitu pembaca mengerjakan tugas babak 01, dan teks
    // cerita di kiri kehilangan kontrasnya tepat ketika ia paling perlu
    // dibaca. Langit yang menguning di sini sambungan ke Modul Bara, bukan
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

/**
 * Putar bongkahan mengikuti seretan pembaca, sama dengan Modul Anatomi dan Bara:
 * hanya pada sumbu tegak, bergoyang pelan saat diam, dan melambat halus menuju
 * sasarannya. Porosnya di tengah tebal bongkahan, supaya ia berputar di
 * tempat dan tidak berayun keluar dari bingkai.
 */
function Turntable({ stateRef, children }: { stateRef: RefObject<KarbonState>; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    const s = stateRef.current;
    const g = ref.current;
    if (!s || !g) return;
    const dt = Math.min(delta, 0.05);
    const idle = s.reducedMotion || s.dragging ? 0 : Math.sin(state.clock.elapsedTime * 0.18) * 0.05;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, DIORAMA_BASE_YAW * 0.5 + s.rotation + idle, 4, dt);
  });
  return (
    <group position={[0, 0, -BLOCK_D / 2]}>
      <group ref={ref}>
        <group position={[0, 0, BLOCK_D / 2]}>{children}</group>
      </group>
    </group>
  );
}

/**
 * Rona timbunan baru pada badan bongkahan: rona fibrik yang dihangatkan, sama
 * dengan pengali yang dipakai peneduh bidang potong untuk timbunan baru,
 * supaya dinding dan bidang potong menyambung.
 */
const FRESH_WARM: [number, number, number] = [1.32, 1.18, 0.86];

/** Tebal terkecil sebuah badan lapisan yang masih digambar (m). */
const MIN_THICKNESS = 0.002;

/**
 * Balik urutan titik tiap segitiga supaya mukanya menghadap sisi sebaliknya.
 *
 * Kisi permukaan Modul Bara tersusun menghadap ke bawah, sehingga dari kamera
 * yang memandang dari atas ia terbuang sebagai muka belakang dan yang tampak
 * hanya tutup badan lapisan fibrik. Dibalik di sini, bukan di Modul Bara, supaya
 * tampilan Modul Bara yang sudah jadi tidak ikut bergeser.
 */
function flipWinding(geom: THREE.BufferGeometry): THREE.BufferGeometry {
  const index = geom.index;
  if (!index) return geom;
  const arr = index.array;
  for (let k = 0; k < arr.length; k += 3) {
    const b = arr[k + 1];
    arr[k + 1] = arr[k + 2];
    arr[k + 2] = b;
  }
  index.needsUpdate = true;
  return geom;
}

/** Permukaan diangkat sedikit di atas tutup badan lapisan agar tidak berkedip. */
const SURFACE_LIFT = 0.006;

/**
 * Bongkahan: separuh bongkahan Modul Bara yang dibaca sebagai arsip.
 *
 * Badan tiap lapisan memakai resep Modul Bara (foto lapisan × rona bersama),
 * dipangkas setinggi kedalaman yang terbakar. Di atas pangkasan itu tumbuh
 * badan kelima, timbunan baru, yang tebalnya sama dengan yang sudah tertimbun
 * ulang. Bidang potong di depan tetap memakai peneduh arsip modul ini.
 */
function Block({ stateRef, noise }: { stateRef: RefObject<KarbonState>; noise: THREE.DataTexture }) {
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

    const bodyMaterial = (i: number, warm?: [number, number, number]) => {
      const tint = PEAT_LAYER_TINT[PEAT_LAYERS[i].id];
      const color = new THREE.Color(tint[0], tint[1], tint[2]);
      if (warm) color.multiply(new THREE.Color(warm[0], warm[1], warm[2]));
      return new THREE.MeshStandardMaterial({
        map: colors[i],
        normalMap: normals[i],
        color,
        roughness: 0.96,
        normalScale: new THREE.Vector2(1.4, 1.4),
      });
    };

    const outline = createLostOutline();
    return {
      faceGeom: createFaceGrid(),
      faceMaterial: createArchiveFaceMaterial(colors, normals, noise),
      topGeom: flipWinding(createSurfaceGrid()),
      topMaterial: createArchiveTopMaterial(groundColor, groundNormal, noise),
      bodies: PEAT_LAYERS.map((layer, i) => ({ layer, geom: createHalfBody(), material: bodyMaterial(i) })),
      fresh: { geom: createHalfBody(), material: bodyMaterial(0, FRESH_WARM) },
      lostGeom: createHalfBody(),
      lostMaterial: createLostMaterial(),
      outline,
      lostEdges: createLostEdges(outline),
    };
  }, [colors, normals, groundColor, groundNormal, noise]);

  useEffect(
    () => () => {
      res.faceGeom.dispose();
      res.faceMaterial.dispose();
      res.topGeom.dispose();
      res.topMaterial.dispose();
      for (const b of [...res.bodies, res.fresh]) {
        b.geom.dispose();
        b.material.dispose();
      }
      res.lostGeom.dispose();
      res.lostMaterial.dispose();
      res.outline.dispose();
      (res.lostEdges.material as THREE.Material).dispose();
    },
    [res],
  );

  const built = useRef({ burn: -1, regrown: -1 });
  const bodyRefs = useRef<(THREE.Mesh | null)[]>([]);
  const freshRef = useRef<THREE.Mesh>(null);
  const lostRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const s = stateRef.current;
    if (!s) return;

    // Api masih turun selama kedalaman yang digambar tertinggal dari yang
    // diminta; selisih 8 cm sudah menyalakan bara penuh.
    const burning = s.reducedMotion ? 0 : Math.min(1, Math.max(0, (s.burnDepthM - s.drawnBurnM) / 0.08));
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
      u.uBurning.value = burning;
      u.uTime.value = state.clock.elapsedTime;
    }

    // Bentuk hanya dihitung ulang saat salah satu angkanya benar-benar
    // berubah. Ambang 2 mm: lebih rapat daripada itu tidak pernah terlihat
    // pada bongkahan setinggi beberapa ratus piksel.
    const b = built.current;
    if (Math.abs(s.drawnBurnM - b.burn) <= 0.002 && Math.abs(s.drawnRegrownM - b.regrown) <= 0.002) return;
    b.burn = s.drawnBurnM;
    b.regrown = s.drawnRegrownM;
    const burn = s.drawnBurnM;
    const gap = Math.max(0, burn - s.drawnRegrownM);

    updateFaceGrid(res.faceGeom, burn, s.drawnRegrownM);
    updateSurfaceGrid(res.topGeom, () => gap);

    // Timbunan lama dipangkas setinggi kedalaman yang terbakar. Yang sudah
    // tertimbun ulang tidak memulihkan lapisan lama: di atas pangkasan itu
    // yang tumbuh timbunan baru.
    const cut = (x: number, z: number) => surfaceRelief(x, z) - burn;
    res.bodies.forEach(({ layer, geom }, i) => {
      const layerTop = (x: number, z: number) =>
        Math.min(i === 0 ? surfaceRelief(x, z) : interfaceY(layer.top, x, z), cut(x, z));
      const layerBottom = (x: number, z: number) => Math.min(interfaceY(layer.bottom, x, z), cut(x, z));
      const thick = updateHalfBody(geom, layerBottom, layerTop);
      const mesh = bodyRefs.current[i];
      if (mesh) mesh.visible = thick > MIN_THICKNESS;
    });

    const nowTop = (x: number, z: number) => surfaceRelief(x, z) - gap;
    const freshThick = updateHalfBody(res.fresh.geom, cut, nowTop);
    if (freshRef.current) freshRef.current.visible = freshThick > MIN_THICKNESS;

    // Ruang "yang hilang" menempati antara permukaan sekarang dan permukaan
    // asal. Yang sudah tertimbun ulang bukan lagi sesuatu yang hilang.
    const showLost = gap > 0.01;
    if (showLost) {
      updateHalfBody(res.lostGeom, nowTop, surfaceRelief);
      updateLostOutline(res.outline, burn, s.drawnRegrownM);
    }
    if (lostRef.current) lostRef.current.visible = showLost;
    res.lostEdges.visible = showLost;
  });

  return (
    <group>
      {res.bodies.map(({ layer, geom, material }, i) => (
        <mesh
          key={layer.id}
          ref={(el) => void (bodyRefs.current[i] = el)}
          geometry={geom}
          material={material}
          castShadow
          receiveShadow
        />
      ))}
      <mesh ref={freshRef} geometry={res.fresh.geom} material={res.fresh.material} castShadow receiveShadow visible={false} />
      <mesh geometry={res.faceGeom} material={res.faceMaterial} receiveShadow />
      <mesh geometry={res.topGeom} material={res.topMaterial} position-y={SURFACE_LIFT} receiveShadow />
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
  onReady: () => void;
  /**
   * Label 3D baru dipasang setelah layar pembuka ditutup. Elemen HTML-nya
   * tidak ikut tertutup oleh latar layar pembuka yang tembus pandang.
   */
  showLabels: boolean;
  /** Perangkat tetap kewalahan pada resolusi terendah. */
  onOverload: () => void;
};

export default function KarbonScene({
  sim,
  stateRef,
  active,
  quality,
  onStats,
  onReady,
  showLabels,
  onOverload,
}: Props) {
  const noise = useMemo(() => createNoiseTexture(), []);
  useEffect(() => () => noise.dispose(), [noise]);

  const profile = QUALITY_PROFILE[quality];
  const maxDpr = Math.min(profile.maxDpr, MODULE_MAX_DPR[quality]);

  return (
    <Canvas
      orthographic
      dpr={[1, maxDpr]}
      frameloop={active ? "demand" : "never"}
      gl={{ antialias: profile.antialias, powerPreference: "default" }}
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
      <PerformanceGuard maxDpr={maxDpr} onOverload={onOverload} />
      {/* Langit, kabut, dan matahari yang sama dengan modul lain. Bongkahan
          ini sebesar bongkahan Modul Anatomi dan Bara, jadi skala dunianya 1 —
          tidak ada yang perlu disetel ulang. */}
      <SkyLighting stateRef={stateRef} quality={quality} backgroundDim={0.6} />
      <Suspense fallback={null}>
        <Backdrop />
      </Suspense>
      <Simulation sim={sim} stateRef={stateRef} onStats={onStats} />
      <Suspense fallback={null}>
        <Turntable stateRef={stateRef}>
          <Block stateRef={stateRef} noise={noise} />
          {/* Tumbuhan dan akar menunggu di batas Suspense-nya sendiri, seperti
              Modul Bara: bidang potongnya tampil dulu, hutannya menyusul. */}
          <Suspense fallback={null}>
            <KarbonCover sim={sim} stateRef={stateRef} quality={quality} />
          </Suspense>
          {showLabels && <SceneLabels />}
        </Turntable>
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
