"use client";

import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PEAT_LAYERS } from "@/lib/peat";
import { DrainageSim, type DrainageStats } from "@/lib/drainage";
import PerformanceGuard from "@/components/gambut/scene/PerformanceGuard";
import SkyLighting from "@/components/gambut/scene/SkyLighting";
import Backdrop from "@/components/gambut/scene/Backdrop";
import { QUALITY_PROFILE, type KanalState, type Quality } from "./kanalState";
import {
  createCanalFaceGeometry,
  createCanalGeometry,
  createCanalWaterGeometry,
  createFaceGrid,
  createSubsidence,
  createSurfaceGrid,
  floorY,
  surfaceY,
  updateCanalGeometry,
  updateFaceGrid,
  updateSurfaceGrid,
  BLOCK_DEPTH,
  BLOCK_HEIGHT,
  CANAL_HALF_M,
  HALF_WIDTH,
  NATURAL_CANAL_WATER_M,
  NEAR_LENGTH_M,
  SURFACE_ROWS,
  WING_COLS,
} from "./transect";
import {
  createCanalWaterMaterial,
  createFieldTexture,
  createSurfaceMaterial,
  createTransectMaterial,
} from "./transectMaterial";
import { createPlantField } from "./vegetation";
import { createWeir } from "./weir";
import SceneLabels from "./SceneLabels";

// Kanvas 3D Modul 03: sepetak gambut yang dibelah kanal, dilihat isometrik.
//
// Susunannya cermin terhadap sumbu kanal. Satu sayap dibangun, lalu digambar
// dua kali — sekali apa adanya, sekali dengan skala x negatif. Kedua sisi
// kanal memang mengalami hal yang persis sama, dan membangun keduanya
// terpisah berarti menyalin kerja yang sama dua kali sekaligus membuka
// kemungkinan keduanya tidak pernah sepakat.

/**
 * Kamera ortografik isometrik.
 *
 * Tetap ortografik, dan alasannya tidak berubah dari rancangan sebelumnya:
 * seluruh modul ini perbandingan jarak dan kedalaman, dan kamera perspektif
 * membuat satu meter di depan tergambar lebih panjang daripada satu meter di
 * belakang — penggarisnya menjadi dusta.
 *
 * Yang berubah kemiringannya. Sebelumnya 6°, dan pada sudut serendah itu
 * bidang atas bongkahan tinggal setebal beberapa piksel: tidak ada permukaan
 * tanah yang terlihat, tidak ada tumbuhan, tidak ada patokan ukuran, dan
 * seluruh gambar jatuh menjadi satu dinding coklat. Pada 27° bidang atas
 * mendapat seperempat tinggi gambar, dan di situlah sebagian besar isi modul
 * ini sebenarnya berada.
 */
const CAMERA_ELEVATION = (27 * Math.PI) / 180;
const CAMERA_AZIMUTH = (21 * Math.PI) / 180;

/**
 * Jarak kamera.
 *
 * Pada kamera ortografik, jarak tidak mengubah besar gambar sama sekali —
 * tetapi ia tetap menentukan dua hal. Pertama keratan dekat-jauh. Kedua, dan
 * ini yang sempat terlewat, kabut: kabut eksponensial dihitung dari kedalaman
 * terhadap kamera, jadi kamera yang ditaruh empat ratus meter di belakang
 * menyelimuti seluruh adegan dengan kabut rata yang memucatkan segalanya
 * tanpa menambah kedalaman apa pun. Jaraknya karena itu dibuat sedekat yang
 * masih memuat bongkahannya.
 */
const CAMERA_DISTANCE = 150;

/**
 * Berapa kali petak ini lebih besar daripada diorama 4,4 m Modul 01 dan 02.
 *
 * Dipakai `SkyLighting` untuk menyetel kerapatan kabut, jarak matahari, dan
 * jangkauan peta bayangan. Petaknya selebar 80 m, jadi angkanya 16 — dan
 * angka itu diturunkan dari lebar bongkahannya sendiri supaya mengubah
 * `NEAR_LENGTH_M` tidak diam-diam membuat bayangannya berhenti di tengah
 * gambar.
 */
const WORLD_SCALE = Math.round((HALF_WIDTH * 2) / 5);

/**
 * Batas jauh keratan kamera.
 *
 * Kubah asap `SkyLighting` berjari-jari 300 kali skala dunia, dan apa pun di
 * luar batas ini tidak pernah digambar. Pada kamera ortografik batas yang
 * longgar tidak berbiaya ketelitian kedalaman seperti pada kamera
 * perspektif: nilai kedalamannya berbanding lurus dengan jaraknya.
 */
const CAMERA_FAR = CAMERA_DISTANCE + 400 * WORLD_SCALE;

/**
 * Jumlah tumbuhan yang ditanam di tiap sayap, menurut tingkat mutu.
 *
 * Pohonnya di-instance, jadi yang bertambah hanya jumlah segitiga, bukan
 * jumlah panggilan gambar. Pakis dipangkas jauh lebih dalam di ponsel:
 * daunnya berpoligon paling rapat di seluruh adegan, sementara pada layar
 * ponsel ia tinggal beberapa piksel.
 */
const PLANTING = {
  high: { trees: 22, ferns: 20 },
  low: { trees: 12, ferns: 0 },
} as const;

/**
 * Tinggi ruang yang harus muat di layar (satuan adegan), termasuk pohon.
 *
 * Dihitung sekali dari ukuran bongkahannya sendiri, bukan ditetapkan dengan
 * tangan, supaya mengubah tebal atau kedalaman bongkahan tidak diam-diam
 * membuat ujungnya terpotong tepi layar.
 */
const CONTENT_WIDTH = 2 * HALF_WIDTH * Math.cos(CAMERA_AZIMUTH) + BLOCK_DEPTH * Math.sin(CAMERA_AZIMUTH);
const CONTENT_HEIGHT =
  (BLOCK_HEIGHT + 10) * Math.cos(CAMERA_ELEVATION) + BLOCK_DEPTH * Math.sin(CAMERA_ELEVATION);

/**
 * Bagian layar yang boleh dipakai gambar, dan di mana titik tengahnya.
 *
 * Di layar lebar, sepertiga kiri ditempati teks cerita dan panel kendali.
 * Dibiarkan terpusat, kanal — yang justru pokok seluruh modul — tersembunyi
 * di baliknya. Jadi gambarnya digeser ke kanan sampai kanalnya jatuh di ruang
 * yang kosong.
 */
const WIDE_SHARE = 0.72;
const WIDE_CENTER = 0.6;

function CameraRig() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    const aspect = size.width / Math.max(1, size.height);
    const wide = aspect >= 1.1;
    const share = wide ? WIDE_SHARE : 0.86;
    const centerShare = wide ? WIDE_CENTER : 0.5;

    // Lebar yang diperlukan diambil dari dua syarat sekaligus: gambar harus
    // muat melebar, dan harus muat menegak. Yang menentukan adalah yang lebih
    // menuntut — tanpa ini, bongkahan terpotong di layar yang pendek.
    const byWidth = CONTENT_WIDTH / share;
    const byHeight = (CONTENT_HEIGHT / (wide ? 0.82 : 0.6)) * aspect;
    const width = Math.max(byWidth, byHeight);

    const halfW = width / 2;
    const halfH = halfW / aspect;
    cam.left = -halfW;
    cam.right = halfW;
    cam.top = halfH;
    cam.bottom = -halfH;
    cam.near = 1;
    cam.far = CAMERA_FAR;

    // Kanal (x = 0) harus jatuh pada `centerShare` lebar layar.
    const centerX = -(centerShare - 0.5) * width;
    // Dibidik sedikit di bawah permukaan: separuh atas gambar diisi tajuk
    // pohon dan langit, jadi pusat yang tepat di permukaan membuang ruang.
    const centerY = -BLOCK_HEIGHT * 0.3;

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

    // Langit menyusul keadaan lahan, perlahan: bahaya yang melompat membuat
    // peta lingkungan dibuat ulang berkali-kali dalam sedetik, dan itu
    // operasi termahal di seluruh adegan.
    s.danger = THREE.MathUtils.damp(s.danger, sim.stats.riskShare, 1.5, dt);
  });

  return null;
}

/**
 * Bidang penutup jalur kanal, dipakai selama kanal belum digali.
 *
 * Datar menghadap ke atas, dengan uv dan warna per titik yang sama bentuknya
 * dengan hamparan permukaan, supaya keduanya dapat memakai bahan yang sama
 * dan tidak pernah berbeda warna di sambungannya.
 */
function createBridgeGeometry(): THREE.BufferGeometry {
  const geom = new THREE.PlaneGeometry(CANAL_HALF_M * 2, BLOCK_DEPTH, 4, 12);
  geom.rotateX(-Math.PI / 2);
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const uv = geom.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, pos.getX(i) / 6, pos.getZ(i) / 6);
  }
  geom.setAttribute(
    "color",
    new THREE.BufferAttribute(new Float32Array(pos.count * 3).fill(1), 3),
  );
  return geom;
}

/** Bongkahan: bidang potong, hamparan permukaan, kanal, air, dan pohonnya. */
function Block({
  sim,
  stateRef,
  field,
  subsidence,
  quality,
}: {
  sim: DrainageSim;
  stateRef: RefObject<KanalState>;
  field: THREE.DataTexture;
  subsidence: ReturnType<typeof createSubsidence>;
  quality: Quality;
}) {
  const colors = useLoader(
    THREE.TextureLoader,
    PEAT_LAYERS.map((l) => `/textures/gambut/${l.id}_color.webp`),
  );
  // Peta normal tiap lapisan. Berkasnya sudah ada di repositori untuk Modul 01
  // dan 02; Modul 03 tidak memakainya sama sekali sebelum ini, dan itulah
  // sebabnya tanahnya rata seperti kain bercorak.
  const normals = useLoader(
    THREE.TextureLoader,
    PEAT_LAYERS.map((l) => `/textures/gambut/${l.id}_normal.webp`),
  );
  const [groundColor, groundNormal] = useLoader(THREE.TextureLoader, [
    "/textures/gambut/permukaan_kering_color.webp",
    "/textures/gambut/permukaan_kering_normal.webp",
  ]);
  // Model pindaian yang sama dengan Modul 01 dan 02, sehingga pembaca
  // mengenali tumbuhan yang sama — hanya dilihat dari jauh.
  const [treeGltf, fernGltf] = useLoader(GLTFLoader, [
    "/models/gambut/pohon_pachira.glb",
    "/models/gambut/pakis.glb",
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
      // Bidang potong digambar dua kali dan salah satunya dicerminkan, jadi
      // urutan titiknya terbalik pada salinan itu. Peneduh ini tidak membaca
      // normal, sehingga menggambar kedua sisi lebih murah dan lebih benar
      // daripada menyiapkan dua geometri.
      faceMaterial: createTransectMaterial(colors, normals, field),
      surfaceGeom: createSurfaceGrid(),
      surfaceMaterial: createSurfaceMaterial(groundColor, groundNormal, field),
      canalGeom: createCanalGeometry(),
      // Dinding dan dasar kanal: tanah gambut yang baru digali, lembap dan
      // karena itu lebih gelap daripada permukaannya. Memakai peta warna dan
      // peta normal yang sama dengan lapisan hemik, sehingga galiannya terbaca
      // sebagai tanah yang sama — hanya terbuka.
      canalMaterial: new THREE.MeshStandardMaterial({
        map: colors[1],
        normalMap: normals[1],
        color: "#6d5a44",
        roughness: 0.88,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
      // Bidang penutup jalur kanal. Dibuat di sini, bukan sebagai anak elemen,
      // karena ia perlu atribut `color` sendiri: bahan hamparan membaca warna
      // per titik, dan bidang yang tidak punya atribut itu akan dibaca three.js
      // sebagai hitam pekat.
      bridgeGeom: createBridgeGeometry(),
      canalFaceGeom: createCanalFaceGeometry(),
      canalWaterGeom: createCanalWaterGeometry(),
      canalWaterMaterial: createCanalWaterMaterial(),
      // Dinding samping dan belakang: tanah yang teduh, bukan hitam — ia
      // bagian dari bongkahan yang sama, hanya tidak kena cahaya.
      sideMaterial: new THREE.MeshStandardMaterial({ color: "#241b14", roughness: 1, metalness: 0 }),
      plants: createPlantField(
        treeGltf.scene,
        PLANTING[quality].ferns > 0 ? fernGltf.scene : null,
        PLANTING[quality].trees,
        PLANTING[quality].ferns,
      ),
      weir: createWeir(),
    };
  }, [colors, normals, groundColor, groundNormal, treeGltf, fernGltf, quality, field]);

  useEffect(
    () => () => {
      res.faceGeom.dispose();
      res.faceMaterial.dispose();
      res.surfaceGeom.dispose();
      res.surfaceMaterial.dispose();
      res.canalGeom.dispose();
      res.canalMaterial.dispose();
      res.bridgeGeom.dispose();
      res.canalFaceGeom.dispose();
      res.canalWaterGeom.dispose();
      res.canalWaterMaterial.dispose();
      res.sideMaterial.dispose();
      res.plants.dispose();
      res.weir.dispose();
    },
    [res],
  );

  const built = useRef(-1);
  const rebuild = () => {
    updateFaceGrid(res.faceGeom, subsidence.fn);
    updateSurfaceGrid(res.surfaceGeom, subsidence.fn);
    // Sedikit peneduhan di dekat tepi potong, supaya garis tepi bongkahan
    // terbaca sebagai sudut dan bukan sebagai jahitan antara dua gambar.
    const color = res.surfaceGeom.attributes.color as THREE.BufferAttribute;
    const cols = WING_COLS + 1;
    for (let i = 0; i < color.count; i++) {
      const row = Math.floor(i / cols) / SURFACE_ROWS;
      const edge = 1 - Math.min(1, row / 0.08);
      const k = 1 - edge * 0.22;
      color.setXYZ(i, k, k, k);
    }
    color.needsUpdate = true;
    built.current = subsidence.version;
  };

  useEffect(rebuild, [res, subsidence]);

  const drawnDepth = useRef(-1);
  const bridgeRef = useRef<THREE.Mesh>(null);
  const canalRef = useRef<THREE.Mesh>(null);
  const canalFaceRef = useRef<THREE.Mesh>(null);
  const drawnDrop = useRef(-1);
  const waterRef = useRef<THREE.Mesh>(null);
  const waterLevel = useRef(0);
  const treeClock = useRef(0);
  const weirShown = useRef(0);

  useFrame((_, delta) => {
    const s = stateRef.current;
    if (!s) return;
    const dt = Math.min(delta, 0.05);
    if (built.current !== subsidence.version) rebuild();
    res.faceMaterial.dataUniforms.uDryTint.value = s.riskTint;
    res.surfaceMaterial.dataUniforms.uDryTint.value = s.riskTint;

    // Kanal dibentuk ulang bila kedalaman gambarnya berubah, atau bila tanah
    // di tepinya sudah melesak cukup jauh untuk terlihat.
    const dropAtCanal = subsidence.fn(0);
    if (
      Math.abs(s.drawnCanalDepthM - drawnDepth.current) > 0.002 ||
      Math.abs(dropAtCanal - drawnDrop.current) > 0.004
    ) {
      drawnDepth.current = s.drawnCanalDepthM;
      drawnDrop.current = dropAtCanal;
      updateCanalGeometry(res.canalGeom, s.drawnCanalDepthM, dropAtCanal);
    }

    // Jalur kanal ditutup tanah selama belum ada yang menggalinya. Tanpa ini,
    // babak 01 dibuka dengan parit menganga di tengah bongkahan sebelum
    // pembaca menyentuh apa pun — dan ajakan "seret pengatur untuk menggali
    // kanal" kehilangan artinya, sebab kanalnya sudah ada di sana.
    //
    // Kanalnya sendiri disembunyikan selama penutup itu terpasang. Pada
    // kedalaman nol, dinding dan dasar kanal mengerut menjadi satu bidang
    // datar yang sebidang persis dengan penutupnya — dan dua bidang sebidang
    // berebut piksel yang sama, sehingga sambungannya tampak bergerigi.
    const undug = s.drawnCanalDepthM < 0.06;
    const bridge = bridgeRef.current;
    if (bridge) bridge.visible = undug;
    const canalFace = canalFaceRef.current;
    if (canalFace) canalFace.visible = undug;
    const canal = canalRef.current;
    if (canal) canal.visible = !undug;

    // Permukaan air kanal: di dekat dasar selama kanal mengalirkan air keluar,
    // naik mendekati permukaan tanah begitu sekat menahannya.
    const water = res.canalWaterMaterial.waterUniforms;
    water.uTime.value += s.reducedMotion ? 0 : dt;
    water.uFlow.value = THREE.MathUtils.damp(water.uFlow.value, s.blocked ? 0 : 1, 2, dt);

    // Tinggi muka air kanal dihitung dari dasar dan tepinya, bukan dari
    // permukaan asal: setelah tanahnya melesak, "sedikit di bawah permukaan"
    // berarti permukaan yang sekarang.
    const canalBottom = surfaceY(0) - s.drawnCanalDepthM * 2;
    const canalTop = surfaceY(0, dropAtCanal);
    const want = s.blocked
      ? Math.max(canalBottom, canalTop - NATURAL_CANAL_WATER_M * 2)
      : Math.min(canalTop - 0.1, canalBottom + 0.5);
    waterLevel.current = THREE.MathUtils.damp(waterLevel.current, want, s.reducedMotion ? 30 : 1.6, dt);
    const mesh = waterRef.current;
    if (mesh) {
      mesh.visible = s.drawnCanalDepthM > 0.05;
      mesh.position.set(0, waterLevel.current, 0);
      mesh.scale.set(CANAL_HALF_M * 2 - 0.3, 1, BLOCK_DEPTH);
    }

    // Sekat tumbuh dari dasar kanal saat dipasang, dan tidak pernah turun
    // lagi: yang sudah dikerjakan orang tidak dibatalkan oleh berjalannya
    // waktu.
    weirShown.current = THREE.MathUtils.damp(
      weirShown.current,
      s.blocked ? 1 : 0,
      s.reducedMotion ? 30 : 2.2,
      dt,
    );
    res.weir.update(s.drawnCanalDepthM, dropAtCanal, weirShown.current);

    // Pohon tidak perlu dihitung ulang tiap bingkai: yang menggerakkannya
    // adalah muka air tanah, yang berubah dalam hitungan tahun simulasi.
    treeClock.current -= dt;
    if (treeClock.current <= 0) {
      treeClock.current = 0.12;
      res.plants.update(sim.effectiveCanalDepth(), subsidence.fn);
    }
  });

  // Garis permukaan asal: jejak setinggi mana tanah ini dahulu berada.
  //
  // Inilah satu-satunya cara memperlihatkan yang hilang, sebab yang hilang
  // tidak punya geometri. Tanpa garis ini, pembaca melihat permukaan turun
  // tetapi tidak punya pembanding.
  const ghost = useMemo(() => {
    const points: number[] = [];
    const z = BLOCK_DEPTH / 2 + 0.02;
    for (let i = 0; i <= WING_COLS; i++) {
      const distance = (i / WING_COLS) * NEAR_LENGTH_M;
      points.push((CANAL_HALF_M + distance), surfaceY(distance), z);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    const material = new THREE.LineDashedMaterial({
      color: "#ffd9b0",
      dashSize: 1.2,
      gapSize: 0.8,
      transparent: true,
      opacity: 0,
    });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    const mirror = new THREE.Line(geometry, material);
    mirror.computeLineDistances();
    mirror.scale.x = -1;
    return { line, mirror, material, geometry };
  }, []);

  useEffect(
    () => () => {
      ghost.geometry.dispose();
      ghost.material.dispose();
    },
    [ghost],
  );

  useFrame((_, delta) => {
    // Jejak permukaan asal baru muncul setelah ada yang hilang untuk ditandai.
    const want = Math.min(0.9, sim.stats.maxSubsidenceM * 4);
    ghost.material.opacity = THREE.MathUtils.damp(ghost.material.opacity, want, 3, Math.min(delta, 0.05));
  });

  const base = floorY();

  return (
    <group>
      {/* Sayap kanan, lalu sayap kiri sebagai cerminannya. */}
      {[1, -1].map((side) => (
        <group key={side} scale={[side, 1, 1]}>
          <mesh geometry={res.faceGeom} material={res.faceMaterial} receiveShadow />
          <mesh geometry={res.surfaceGeom} material={res.surfaceMaterial} receiveShadow castShadow />
          {/* Dinding ujung dan dinding belakang petak ini. Gelap rata: yang
              harus dibaca bidang potong di depan, bukan sisi-sisinya. */}
          <mesh
            position={[HALF_WIDTH, base / 2 + 0.5, 0]}
            rotation={[0, Math.PI / 2, 0]}
            material={res.sideMaterial}
          >
            <planeGeometry args={[BLOCK_DEPTH, Math.abs(base) + 1]} />
          </mesh>
          <mesh
            position={[(CANAL_HALF_M + HALF_WIDTH) / 2, base / 2 + 0.5, -BLOCK_DEPTH / 2]}
            rotation={[0, Math.PI, 0]}
            material={res.sideMaterial}
          >
            <planeGeometry args={[HALF_WIDTH - CANAL_HALF_M, Math.abs(base) + 1]} />
          </mesh>
          <primitive object={side === 1 ? ghost.line : ghost.mirror} />
        </group>
      ))}

      {/* Kanal dan airnya — satu-satunya bagian yang tidak dicerminkan. */}
      <mesh ref={canalRef} geometry={res.canalGeom} material={res.canalMaterial} receiveShadow />
      <mesh
        ref={bridgeRef}
        position={[0, surfaceY(0), 0]}
        geometry={res.bridgeGeom}
        material={res.surfaceMaterial}
        receiveShadow
      />
      <mesh
        ref={canalFaceRef}
        geometry={res.canalFaceGeom}
        material={res.faceMaterial}
        receiveShadow
      />
      <mesh
        ref={waterRef}
        geometry={res.canalWaterGeom}
        material={res.canalWaterMaterial}
        visible={false}
      />

      <primitive object={res.weir.group} />
      <primitive object={res.plants.group} />
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
      shadows={profile.softShadow ? "percentage" : "basic"}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.95;
      }}
      fallback={
        <p className="p-6 text-sm text-white/70">
          Peramban Anda tidak mendukung WebGL, jadi bongkahan kanal tidak dapat ditampilkan.
        </p>
      }
    >
      <CameraRig />
      <PerformanceGuard maxDpr={profile.maxDpr} />
      {/* Langit fisik, kabut, dan matahari yang sama dengan Modul 01 dan 02.
          Petak ini enam belas kali lebih besar daripada diorama di sana, dan
          skalanya dinyatakan supaya kabut serta peta bayangannya ikut
          menyesuaikan — bukan disalin lalu diubah angkanya satu per satu. */}
      <SkyLighting
        stateRef={stateRef}
        quality={quality}
        worldScale={WORLD_SCALE}
        backgroundDim={0.3}
      />
      <Suspense fallback={null}>
        <Backdrop />
      </Suspense>
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
        <Block
          sim={sim}
          stateRef={stateRef}
          field={field}
          subsidence={subsidence}
          quality={quality}
        />
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
