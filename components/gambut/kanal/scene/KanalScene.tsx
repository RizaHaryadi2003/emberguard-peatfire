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
  canalBedHalf,
  createBridgeGeometry,
  createCanalFaceGeometry,
  createCanalGeometry,
  createCanalWaterGeometry,
  createFaceGrid,
  createSubsidence,
  createSurfaceGrid,
  floorY,
  surfaceY,
  surfaceYAt,
  updateBridgeGeometry,
  updateCanalFaceGeometry,
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
  createNoiseTexture,
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
 * jumlah panggilan gambar — dan jumlah segitiga itulah yang menjadi soal:
 * satu pohon pachira pindaian berdaun dua puluh ribu segitiga.
 *
 * Angkanya dipilih setelah diukur dan dilihat. Dua puluh dua pohon dengan
 * daun dijarangkan sampai 60% ternyata lebih buruk daripada enam belas pohon
 * berdaun penuh pada biaya yang hampir sama: penjarangan menyebarkan lubang
 * merata ke seluruh tajuk, sehingga hutan yang seharusnya utuh pada babak 01
 * justru terbaca sudah meranggas — persis kebalikan dari yang diceritakan
 * babak itu. Jadi yang dikurangi jumlah pohonnya, bukan kerapatan daunnya.
 *
 * `leafKeep` tetap ada dan dipakai di ponsel, tempat tiap pohon tinggal
 * beberapa puluh piksel sehingga penjarangannya memang tidak terlihat.
 */
const PLANTING = {
  high: { trees: 8, ferns: 8, leafKeep: 1 },
  low: { trees: 5, ferns: 0, leafKeep: 0.5 },
} as const;

/**
 * Batas resolusi render khusus modul ini, di atas batas bersama.
 *
 * Modul 01 dan 02 memotret bongkahan kecil yang menempati sebagian layar;
 * sisanya latar foto yang tidak berbiaya apa-apa. Modul 03 menutupi hampir
 * separuh layar dengan tanah yang tiap pikselnya menjalankan peneduh berisi
 * empat peta warna, empat peta normal, derau berlapis, dan seluruh jalur PBR
 * dengan peta lingkungan serta bayangan. Pada 1,5× resolusi perangkat, layar
 * 1440×900 berarti menghitung peneduh itu untuk 2,9 juta piksel tiap
 * bingkai — dan itulah, lebih daripada jumlah segitiga mana pun, yang
 * membuat modul ini tersendat.
 *
 * 1,25× menghemat sepertiga biaya itu seketika. `PerformanceGuard` tetap
 * dapat menurunkannya lagi sampai 1× bila ternyata masih kurang; yang
 * dikerjakan angka ini hanya memulai dari tempat yang masuk akal, bukan
 * memulai dari yang paling mahal lalu menunggu empat detik untuk mundur.
 */
const MODULE_MAX_DPR = { high: 1.25, low: 1 } as const;

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
 * Ruang kosong di layar yang boleh dipakai gambar, sebagai pecahan lebar dan
 * tinggi layar: [kiri, kanan, atas, bawah].
 *
 * Diukur dari tata letaknya yang sebenarnya, bukan dikira-kira. Pada layar
 * 1440x900 panel-panelnya menempati x 56-460 di kiri (teks cerita dan panel
 * kendali) dan x 1164-1400 di kanan (grafik dan angka), jadi yang tersisa
 * untuk gambar adalah x 470-1155.
 *
 * Rancangan sebelumnya memakai "bagian lebar layar" tanpa batas kanan, dan
 * akibatnya bongkahan menjulur sampai di bawah kedua kartu di kanan —
 * ujungnya tertutup, dan keterangan jaraknya tertindih tulisan kartu di
 * atasnya. Dengan batas kanan yang dinyatakan, gambarnya mengecil sedikit
 * tetapi tidak pernah lagi bertabrakan dengan apa pun.
 *
 * Angkanya kemudian dirapatkan sekali lagi. Pita 0,33-0,80 benar sebagai
 * batas tabrakan, tetapi gambar yang dipaskan ke dalamnya tetap kecil: pada
 * layar 1440×900 bongkahan hanya setinggi seperlima layar, dan dua pertiga
 * ruang di bawahnya kosong. Yang menyusut bukan pitanya melainkan isinya,
 * jadi batasnya digeser sampai benar-benar menyentuh tepi panel — 0,325 di
 * kiri dan 0,805 di kanan (kolom angka mulai di 0,808) — dan pita tegaknya
 * dilebarkan ke 0,12-0,95.
 *
 * Batas kiri 0,325 dihitung dari panel kendali, bukan dari teks cerita:
 * panel itu berakhir di x 460 pada layar 1440, yakni 0,319, dan pada babak
 * 04 ia tumbuh paling tinggi — kedalaman kanal, waktu berjalan, dua tombol,
 * dan kabar sekat sekaligus. Batas yang hanya cukup untuk panel babak 01
 * membuat ujung kiri bawah bongkahan hilang di balik panel tepat pada babak
 * yang meminta pembaca membandingkan permukaannya dengan garis putus-putus.
 *
 * Yang membuat gambarnya tetap membesar meski pitanya menyempit bukan
 * pitanya melainkan isinya: petaknya dipendekkan dari 36 m menjadi 28 m
 * tiap sisi, sehingga pita yang sama memuat lahan yang lebih sedikit dan
 * karena itu menggambarnya lebih besar.
 */
const FREE_WIDE = { left: 0.325, right: 0.805, top: 0.12, bottom: 0.95 };

/**
 * Di bawah lebar lg, kolom kanan disembunyikan dan panel kendali turun ke
 * bawah layar, jadi yang kosong adalah pita di tengah.
 */
const FREE_NARROW = { left: 0.04, right: 0.96, top: 0.24, bottom: 0.6 };

/**
 * Lebar layar tempat kolom kanan mulai tampil (piksel CSS).
 *
 * Harus sama dengan titik putus `lg` Tailwind yang dipakai kolom itu
 * (`lg:flex`). Sebelumnya pembingkaian dipilih menurut nisbah layar, bukan
 * lebarnya — sehingga jendela 900x600 yang nisbahnya lebar tetapi kolom
 * kanannya sudah disembunyikan tetap menyisakan ruang kosong untuk panel yang
 * tidak ada di sana.
 */
const PANEL_BREAKPOINT = 1024;

function CameraRig() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    const aspect = size.width / Math.max(1, size.height);
    const free = size.width >= PANEL_BREAKPOINT ? FREE_WIDE : FREE_NARROW;

    // Lebar yang diperlukan diambil dari dua syarat sekaligus: gambar harus
    // muat melebar di dalam pita kosongnya, dan muat menegak di dalamnya.
    // Yang menentukan adalah yang lebih menuntut.
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
    const centerY = ((free.top + free.bottom) / 2 - 0.5) * (width / aspect) - BLOCK_HEIGHT * 0.1;

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

    // Mukanya menjalar keluar dari kanal sekali, saat babak 02 dibuka, lalu
    // tinggal di ujung petak. Lajunya dipilih supaya menyeberangi petak dalam
    // waktu yang kira-kira sama dengan kurva pada grafik menggambar dirinya —
    // keduanya mengatakan hal yang sama, jadi keduanya harus terasa satu
    // gerakan meski skalanya berbeda seribu kali.
    const wantFront = s.act >= 1 ? NEAR_LENGTH_M + 6 : 0;
    const frontSpeed = s.reducedMotion ? 1000 : (NEAR_LENGTH_M + 6) / 1.2;
    s.riskFront =
      s.riskFront < wantFront
        ? Math.min(wantFront, s.riskFront + frontSpeed * dt)
        : wantFront;

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

/** Bongkahan: bidang potong, hamparan permukaan, kanal, air, dan pohonnya. */
function Block({
  sim,
  stateRef,
  field,
  noise,
  subsidence,
  quality,
}: {
  sim: DrainageSim;
  stateRef: RefObject<KanalState>;
  field: THREE.DataTexture;
  noise: THREE.DataTexture;
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
      faceMaterial: createTransectMaterial(colors, normals, field, noise),
      surfaceGeom: createSurfaceGrid(),
      surfaceMaterial: createSurfaceMaterial(groundColor, groundNormal, field, noise),
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
        PLANTING[quality].leafKeep,
      ),
      weir: createWeir(),
    };
  }, [colors, normals, groundColor, groundNormal, treeGltf, fernGltf, quality, field, noise]);

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

  // Bentuk tanah sekarang bergantung pada dua hal, bukan satu: penurunan
  // permukaan (yang berubah pelan, ditandai `subsidence.version`) dan
  // kedalaman galian (yang berubah cepat saat pengatur diseret, sebab
  // tanggulnya ikut tumbuh). Keduanya dicatat, dan bentuknya dihitung ulang
  // hanya kalau salah satunya benar-benar berubah.
  const built = useRef(-1);
  const builtDepth = useRef(-1);
  const rebuild = (canalDepthM = 0) => {
    builtDepth.current = canalDepthM;
    updateFaceGrid(res.faceGeom, subsidence.fn, canalDepthM);
    updateSurfaceGrid(res.surfaceGeom, subsidence.fn, canalDepthM);
    updateBridgeGeometry(res.bridgeGeom, subsidence.fn);
    updateCanalFaceGeometry(res.canalFaceGeom, subsidence.fn);
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

  useEffect(() => {
    rebuild(stateRef.current?.drawnCanalDepthM ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res, subsidence]);

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
    // Ambang 4 cm pada kedalaman galian: cukup rapat untuk membuat tanggul
    // tampak tumbuh mulus saat pengatur diseret, cukup longgar untuk tidak
    // membentuk ulang seribu titik pada tiap bingkai seretan.
    if (
      built.current !== subsidence.version ||
      Math.abs(s.drawnCanalDepthM - builtDepth.current) > 0.04
    ) {
      rebuild(s.drawnCanalDepthM);
    }
    res.faceMaterial.dataUniforms.uDryTint.value = s.riskTint;
    res.surfaceMaterial.dataUniforms.uDryTint.value = s.riskTint;
    res.faceMaterial.dataUniforms.uRiskFront.value = s.riskFront;
    res.surfaceMaterial.dataUniforms.uRiskFront.value = s.riskFront;
    // Dipakai hamparan permukaan untuk menelanjangi tanggul galian. Dibaca
    // dari kedalaman yang sedang digambar, bukan yang diminta, supaya pita
    // tanah telanjang itu melebar seiring dinding kanalnya turun — bukan
    // melompat jadi lebar sebelum galiannya sempat terbentuk.
    res.surfaceMaterial.dataUniforms.uCanalDepth.value = s.drawnCanalDepthM;

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
    // Bibir kanal di tengah bongkahan, lengkap dengan reliefnya: itulah yang
    // dilihat pembaca sebagai "setinggi apa airnya dibanding tanahnya".
    const canalTop = surfaceYAt(0, 0, dropAtCanal, s.drawnCanalDepthM);
    const want = s.blocked
      ? Math.max(canalBottom, canalTop - NATURAL_CANAL_WATER_M * 2)
      : Math.min(canalTop - 0.1, canalBottom + 0.5);
    waterLevel.current = THREE.MathUtils.damp(waterLevel.current, want, s.reducedMotion ? 30 : 1.6, dt);
    const mesh = waterRef.current;
    if (mesh) {
      mesh.visible = s.drawnCanalDepthM > 0.05;
      mesh.position.set(0, waterLevel.current, 0);
      // Lebar permukaan air mengikuti tinggi airnya, sebab dinding galian
      // melandai ke dalam: dasarnya lebih sempit daripada mulutnya. Dibuat
      // selebar mulut seperti sebelumnya, bidang air menembus kedua dinding
      // setiap kali airnya rendah — dan air yang menembus tanah adalah hal
      // pertama yang dilihat mata sebagai "ini gambar komputer".
      const bedHalf = canalBedHalf(s.drawnCanalDepthM);
      const fill = THREE.MathUtils.clamp(
        (waterLevel.current - canalBottom) / Math.max(0.1, canalTop - canalBottom),
        0,
        1,
      );
      mesh.scale.set(THREE.MathUtils.lerp(bedHalf, CANAL_HALF_M, fill) * 2 - 0.25, 1, BLOCK_DEPTH);
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
      // Dua kedalaman, dan keduanya memang berbeda. Yang pertama kedalaman
      // yang masih mengeringkan — nol begitu sekat terpasang, sebab airnya
      // sudah kembali. Yang kedua galian yang benar-benar ada di tanah, dan
      // itulah yang menentukan tinggi tanggul tempat pohon-pohon ini berdiri:
      // tanggulnya tidak hilang hanya karena kanalnya disekat.
      res.plants.update(sim.effectiveCanalDepth(), subsidence.fn, s.drawnCanalDepthM);
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
      // Mengikuti relief permukaan, bukan garis lurus: jejak ini menandai
      // tanah yang dahulu ada di situ, dan tanah itu pun bergundukan. Tanpa
      // tanggul galian — tanggulnya belum ada ketika tanah ini masih utuh.
      points.push(CANAL_HALF_M + distance, surfaceYAt(distance, BLOCK_DEPTH / 2), z);
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
  const noise = useMemo(() => createNoiseTexture(), []);
  const subsidence = useMemo(() => createSubsidence(sim), [sim]);

  useEffect(() => () => field.dispose(), [field]);
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
          Peramban Anda tidak mendukung WebGL, jadi bongkahan kanal tidak dapat ditampilkan.
        </p>
      }
    >
      <CameraRig />
      <PerformanceGuard maxDpr={maxDpr} />
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
          noise={noise}
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
