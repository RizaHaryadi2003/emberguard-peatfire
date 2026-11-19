"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import PerformanceGuard from "@/components/modul/shared/scene/PerformanceGuard";
import FpsMeter, { wantsFpsMeter } from "@/components/modul/shared/scene/FpsMeter";
import { createHutanGrass } from "./grass";
import SkyLighting from "@/components/modul/shared/scene/SkyLighting";
import Backdrop from "@/components/modul/shared/scene/Backdrop";
import { QUALITY_PROFILE, type AtmosphereState, type Quality } from "@/components/modul/shared/scene/dioramaConstants";
import { collectVariants } from "@/components/modul/shared/scene/plantVariants";
import { createNoiseTexture } from "@/components/modul/shared/scene/noiseTexture";
import { FOREST_ZONES, HUTAN_TEXT, type ForestZone } from "@/config/modul/hutan-rawa";
import {
  DEPTH,
  FLOOD_KM,
  FLOOD_LEVEL_M,
  kmOfX,
  LENGTH,
  MINERAL_M,
  peatThicknessM,
  PERSON_M,
  plantFerns,
  plantTrees,
  xOfKm,
  zoneAt,
  type TreeSpot,
} from "./dome";
import {
  hummock,
  mineralFrontGrid,
  mineralSideGrid,
  peatFrontGrid,
  peatSideGrid,
  peatTopGrid,
  riverBedGrid,
  riverBedY,
  RIVER_BED_M,
  RIVER_LEVEL,
  RIVER_WIDTH,
  surfaceY,
  X_LEFT,
  X_RIGHT,
  X_RIVER,
  Z_BACK,
  Z_FRONT,
  type Grid,
} from "./domeShape";
import { createFloorMaterial, createPeatFaceMaterial, ownTexture } from "./domeMaterial";
import { createGroundTexture, createWaterMaterial } from "./waterMaterial";

// Diorama 3D kubah gambut Modul Hutan Rawa Gambut.
//
// Memakai fondasi yang sama dengan Modul Anatomi, Kanal, dan Bara: langit
// fisik dan matahari dari SkyLighting, latar foto hutan rawa, penjaga beban
// PerformanceGuard (60 fps saat berinteraksi, 30 saat diam, resolusi turun
// sendiri bila perangkat kewalahan), tekstur gambut pindaian, dan pohon
// pachira pindaian yang di-instance.
//
// --- Anggaran beban ----------------------------------------------------------
//
// Satu pohon pachira 20–28 ribu segitiga. Seluruh hutan digambar sebagai
// InstancedMesh (satu panggilan gambar per bagian model), dan hanya batangnya
// yang ikut langkah bayangan — tajuk adalah bagian termahal, dan bayangannya
// dari sejauh ini hanya bercak kelabu. Hutan tiang memakai tajuk yang
// dijarangkan, karena pohonnya memang kurus. Hujan adalah satu LineSegments
// yang digerakkan di peneduh titik, bukan ribuan objek.

/**
 * Sudut kamera: dari kiri depan dan dari atas, seperti Modul Kanal (±27°),
 * supaya lantai hutan dan tajuknya terlihat; dulu 13° sehingga yang tampak
 * hanya batang-batang tinggi.
 */
const CAMERA_AZIMUTH = (-24 * Math.PI) / 180;
const CAMERA_ELEVATION = (27 * Math.PI) / 180;
const CAMERA_DISTANCE = 260;

/**
 * Skala dunia untuk SkyLighting (kabut, jarak matahari, jangkauan bayangan).
 * Bayangan menjangkau ±6 × skala; diorama ini selebar 120 dan setinggi ±60,
 * jadi 14 cukup menutup seluruhnya tanpa membuang resolusi peta bayangan.
 */
const WORLD_SCALE = 14;

/** Batas resolusi render modul ini; PerformanceGuard dapat menurunkannya lagi. */
const MODULE_MAX_DPR = { high: 1.25, low: 1 } as const;

/** Kotak isi yang harus muat di bingkai gambar. */
const CONTENT_BOX = new THREE.Box3(
  // Ke bawah diberi ruang untuk nama jenis hutan di bawah bongkahan.
  new THREE.Vector3(-LENGTH / 2 - RIVER_WIDTH, -MINERAL_M - 4, -DEPTH / 2),
  new THREE.Vector3(LENGTH / 2, 13 + 45, DEPTH / 2),
);

/** Lama animasi naik/turun air dan basahnya gambut (detik, konstanta lerp). */
const EASE = 2.2;

export type HutanSceneProps = {
  /** Letak pejalan (km) di babak 01, atau null. */
  walkerKm: number | null;
  flood: boolean;
  rain: boolean;
  /** Babak 02 sedang dibuka: air bergerak, dan lumpur banjir tetap tinggal. */
  waterAct: boolean;
  /** Jenis hutan yang sudah dibuka di babak 03; null di babak lain. */
  openedZones: ReadonlySet<string> | null;
  activeZone: string | null;
  onZone?: (id: ForestZone["id"]) => void;
  quality: Quality;
  onOverload: () => void;
};

/**
 * Kanvas memenuhi layar di belakang panel, dan isinya dipaskan ke bingkai
 * gambar milik kerangka modul. Dengan begitu langit dan latar hutan
 * menyambung ke seluruh layar seperti modul 3D lainnya, sementara diorama
 * tetap berada di ruang yang disediakan untuknya.
 */
export default function HutanScene(props: HutanSceneProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [showFps] = useState(wantsFpsMeter);
  const maxDpr = MODULE_MAX_DPR[props.quality];
  const profile = QUALITY_PROFILE[props.quality];
  const stateRef = useRef<AtmosphereState>({ danger: 0 });

  return (
    <>
      {/* Bingkai tempat diorama dipaskan. Di ponsel panel kendali menindih
          tepi bawah bingkai, jadi bingkainya dipendekkan di sana; di babak 03
          sedikit lebih pendek lagi supaya tombol jenis hutan tetap terlihat. */}
      <div ref={anchorRef} data-guide="figure" className={`pointer-events-none absolute inset-0 ${props.openedZones ? "bottom-16 sm:bottom-0" : "bottom-12 sm:bottom-0"}`} />
      <div className="fixed inset-0">
        <Canvas
          orthographic
          dpr={[1, maxDpr]}
          frameloop="demand"
          gl={{ antialias: profile.antialias, powerPreference: "default" }}
          shadows={profile.softShadow ? "percentage" : "basic"}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 0.95;
          }}
          fallback={<p className="p-6 text-sm text-white/70">Peramban Anda tidak mendukung WebGL, jadi diorama hutan tidak dapat ditampilkan.</p>}
        >
          <CameraRig anchorRef={anchorRef} />
          <PerformanceGuard maxDpr={maxDpr} onOverload={props.onOverload} />
          {showFps && <FpsMeter />}
          <SkyLighting stateRef={stateRef} quality={props.quality} worldScale={WORLD_SCALE} backgroundDim={0.3} />
          {/* Cahaya pantul lembut, seperti bongkahan Modul Anatomi, supaya sisi
              teduh kubah yang lebar tidak tenggelam. */}
          <hemisphereLight args={["#e6eef5", "#3a2f1f", 0.22]} />
          <Suspense fallback={null}>
            <Backdrop />
          </Suspense>
          <Suspense fallback={null}>
            <Dome {...props} />
          </Suspense>
        </Canvas>
      </div>
    </>
  );
}

/**
 * Kamera ortografik yang memaskan kotak isi ke bingkai gambar.
 *
 * Ortografik, sama seperti Modul Kanal: penampang ini perbandingan tinggi dan
 * tebal, dan kamera perspektif membuat yang dekat tampak lebih besar daripada
 * yang jauh.
 */
function CameraRig({ anchorRef }: { anchorRef: RefObject<HTMLDivElement | null> }) {
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera;
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
    const dir = new THREE.Vector3(
      Math.sin(CAMERA_AZIMUTH) * Math.cos(CAMERA_ELEVATION),
      Math.sin(CAMERA_ELEVATION),
      Math.cos(CAMERA_AZIMUTH) * Math.cos(CAMERA_ELEVATION),
    );
    const center = CONTENT_BOX.getCenter(new THREE.Vector3());
    camera.position.copy(center).addScaledVector(dir, CAMERA_DISTANCE);
    camera.up.set(0, 1, 0);
    camera.lookAt(center);
    camera.near = 1;
    camera.far = CAMERA_DISTANCE + 400 * WORLD_SCALE;
    camera.updateMatrixWorld();

    // Ukuran kotak isi dalam ruang kamera.
    const inv = camera.matrixWorldInverse;
    const min = new THREE.Vector2(Infinity, Infinity);
    const max = new THREE.Vector2(-Infinity, -Infinity);
    const c = new THREE.Vector3();
    for (let i = 0; i < 8; i++) {
      c.set(i & 1 ? CONTENT_BOX.max.x : CONTENT_BOX.min.x, i & 2 ? CONTENT_BOX.max.y : CONTENT_BOX.min.y, i & 4 ? CONTENT_BOX.max.z : CONTENT_BOX.min.z).applyMatrix4(inv);
      min.min(new THREE.Vector2(c.x, c.y));
      max.max(new THREE.Vector2(c.x, c.y));
    }
    const w = max.x - min.x;
    const h = max.y - min.y;
    const zoom = Math.min(rect.width / w, rect.height / h) * 1.0;

    // Geser kamera supaya titik tengah isi jatuh di tengah bingkai gambar,
    // bukan di tengah layar.
    const boxCx = rect.left + rect.width / 2 - size.width / 2;
    const boxCy = rect.top + rect.height / 2 - size.height / 2;
    const midX = (min.x + max.x) / 2;
    const midY = (min.y + max.y) / 2;
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    camera.position.addScaledVector(right, midX - boxCx / zoom).addScaledVector(up, midY + boxCy / zoom);
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    invalidate();
  }, [rect, size, camera, invalidate]);

  return null;
}

/** Kisi bidang menjadi geometri three.js, dengan atribut kedalaman untuk peneduh. */
function toGeometry(grid: Grid): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(grid.positions, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(grid.uvs, 2));
  geo.setAttribute("aDepth", new THREE.BufferAttribute(grid.depths, 1));
  geo.setAttribute("aHeight", new THREE.BufferAttribute(grid.heights, 1));
  geo.setIndex(new THREE.BufferAttribute(grid.indices, 1));
  geo.computeVertexNormals();
  return geo;
}

/** Beberapa kisi digabung menjadi satu geometri: satu panggilan gambar. */
function mergeGrids(grids: Grid[]): THREE.BufferGeometry {
  const parts = grids.map(toGeometry);
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged;
}

/**
 * Warna titik lantai hutan: cekungan di antara gundukan lebih gelap dan
 * kebiruan karena tergenang, gundukan sedikit lebih terang.
 */
function shadeFloor(geo: THREE.BufferGeometry) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const h = hummock(pos.getX(i), pos.getZ(i)) / 0.32;
    const lift = 0.86 + 0.22 * h;
    const pool = Math.max(0, -h - 0.35) * 1.4;
    colors[i * 3] = lift * (1 - pool * 0.45);
    colors[i * 3 + 1] = lift * (1 - pool * 0.35);
    colors[i * 3 + 2] = lift * (1 - pool * 0.18);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

/** Warna titik tanah mineral: makin dalam makin gelap. */
function shadeMineral(geo: THREE.BufferGeometry) {
  const h = geo.attributes.aHeight as THREE.BufferAttribute;
  const colors = new Float32Array(h.count * 3);
  for (let i = 0; i < h.count; i++) {
    const f = 1 - Math.min(1, Math.max(0, -h.getX(i) / MINERAL_M)) * 0.55;
    colors.set([f, f, f], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}


/** Air banjir: ruang antara muka banjir dan tanah, dari sungai sampai lereng. */
function floodShape(): THREE.Shape {
  const s = new THREE.Shape();
  // Ujung kiri mundur dari tepi diorama supaya tidak berimpit dengan muka
  // samping tanah mineral.
  s.moveTo(X_RIVER + 0.12, RIVER_LEVEL - 3);
  s.lineTo(X_RIVER + 0.12, FLOOD_LEVEL_M);
  s.lineTo(xOfKm(FLOOD_KM), FLOOD_LEVEL_M);
  for (let k = FLOOD_KM; k >= 0; k -= 0.05) s.lineTo(xOfKm(k), peatThicknessM(k) - 0.02);
  s.lineTo(X_LEFT, RIVER_LEVEL - 3);
  s.closePath();
  return s;
}

function Dome({ walkerKm, flood, rain, waterAct, openedZones, activeZone, onZone, quality }: HutanSceneProps) {
  const profile = QUALITY_PROFILE[quality];
  const invalidate = useThree((s) => s.invalidate);
  const [fibC, fibN, hemC, hemN, sapC, sapN, topC, topN, minC, minN] = useLoader(THREE.TextureLoader, [
    "/textures/gambut/fibrik_color.webp",
    "/textures/gambut/fibrik_normal.webp",
    "/textures/gambut/hemik_color.webp",
    "/textures/gambut/hemik_normal.webp",
    "/textures/gambut/saprik_color.webp",
    "/textures/gambut/saprik_normal.webp",
    "/textures/gambut/permukaan_color.webp",
    "/textures/gambut/permukaan_normal.webp",
    "/textures/gambut/mineral_color.webp",
    "/textures/gambut/mineral_normal.webp",
  ]);
  const [treeGltf, fernGltf] = useLoader(GLTFLoader, ["/models/gambut/pohon_pachira.glb", "/models/gambut/pakis.glb"]);

  const res = useMemo(() => {
    const an = profile.anisotropy;
    // Tekstur disalin: modul lain memakai berkas yang sama dengan pengulangan
    // yang berbeda.
    const own = [ownTexture(fibC, true, an), ownTexture(hemC, true, an), ownTexture(sapC, true, an)];
    const ownN = [ownTexture(fibN, false, an), ownTexture(hemN, false, an), ownTexture(sapN, false, an)];
    const noise = createNoiseTexture();
    const peatFace = createPeatFaceMaterial(own, ownN, noise, [xOfKm(FOREST_ZONES[1].fromKm), xOfKm(FOREST_ZONES[2].fromKm)]);
    const peatGeo = mergeGrids([peatFrontGrid(quality), peatSideGrid("left", quality), peatSideGrid("right", quality)]);

    const topGeo = toGeometry(peatTopGrid(quality));
    shadeFloor(topGeo);
    const topMapC = ownTexture(topC, true, an);
    const topMapN = ownTexture(topN, false, an);
    // Serasah di bawah tajuk: digelapkan, karena lantai hutan rawa teduh.
    const peatTop = createFloorMaterial(topMapC, topMapN, noise);

    const bottom = -MINERAL_M;
    const mineralGeo = mergeGrids([mineralFrontGrid(quality, bottom), mineralSideGrid("left", quality, bottom), mineralSideGrid("right", quality, bottom), riverBedGrid(quality)]);
    shadeMineral(mineralGeo);
    const minMapC = ownTexture(minC, true, an);
    const minMapN = ownTexture(minN, false, an);
    const mineral = new THREE.MeshStandardMaterial({ map: minMapC, normalMap: minMapN, roughness: 1, color: "#6c6f72", vertexColors: true, side: THREE.DoubleSide });

    // Sungai air hitam: air gambut berwarna teh pekat karena asam humat.
    // Muka depannya mundur sedikit dari muka tanah, supaya relief tanah
    // mineral selalu berada di depannya dan dasar alur tetap terbaca.
    const riverFront = Z_FRONT - 0.8;
    // Ujung kirinya juga mundur sedikit dari tepi diorama supaya tidak
    // berimpit dengan muka samping tanah mineral.
    const riverLeft = X_RIVER + 0.12;
    const riverGeo = new THREE.BoxGeometry(X_LEFT - 0.05 - riverLeft, RIVER_LEVEL - RIVER_BED_M + 0.1, riverFront - Z_BACK);
    riverGeo.translate((riverLeft + X_LEFT - 0.05) / 2, (RIVER_LEVEL + RIVER_BED_M - 0.1) / 2, (riverFront + Z_BACK) / 2);
    const water = createWaterMaterial("river", noise);
    water.level.value = RIVER_LEVEL;

    // Muka depannya sejajar muka depan sungai, di belakang relief tanah.
    const floodGeo = new THREE.ExtrudeGeometry(floodShape(), { depth: riverFront - Z_BACK - 0.1, bevelEnabled: false });
    floodGeo.translate(0, 0, Z_BACK + 0.05);
    // Banjir membawa lumpur sungai, jadi warnanya keruh kecoklatan. Tinggi
    // tanah di sepanjang penampang dipakai untuk menemukan garis pantainya.
    const groundTex = createGroundTexture((x) => (x <= X_LEFT ? riverBedY(x) : peatThicknessM(kmOfX(x))), X_RIVER, X_RIGHT - X_RIVER);
    const floodMat = createWaterMaterial("flood", noise, { texture: groundTex, x0: X_RIVER, span: X_RIGHT - X_RIVER });

    const textures = [...own, ...ownN, noise, topMapC, topMapN, minMapC, minMapN, groundTex];
    return { peatGeo, peatFace, topGeo, peatTop, mineralGeo, mineral, riverGeo, water, floodGeo, floodMat, textures };
  }, [fibC, fibN, hemC, hemN, sapC, sapN, topC, topN, minC, minN, profile.anisotropy, quality]);

  useEffect(
    () => () => {
      for (const v of Object.values(res)) (v as { dispose?: () => void }).dispose?.();
      res.textures.forEach((t) => t.dispose());
    },
    [res],
  );

  // Pohon pachira, di-instance. Hutan tiang memakai tajuk yang dijarangkan.
  const trees = useMemo(() => plantTrees(quality), [quality]);
  const forest = useMemo(() => {
    // Daun dijarangkan: dari jarak pandang ini tiap pohon hanya selebar
    // seratusan piksel, sehingga 60% helai sudah terbaca sebagai tajuk penuh,
    // dan beban segitiga hutan turun dari ±920 ribu menjadi ±690 ribu.
    // Daun PENUH, mengikuti pelajaran Modul Kanal: menjarangkan daun
    // menyebar lubang ke seluruh tajuk sehingga pohon terbaca seperti
    // rumput/meranggas. Yang dikurangi jumlah pohonnya (TREE_COUNT), bukan
    // kerapatan daunnya. Mutu rendah tetap sedikit dijarangkan untuk ponsel.
    const leaf = quality === "high" ? 1 : 0.85;
    const full = collectVariants(treeGltf.scene, leaf);
    const thin = collectVariants(treeGltf.scene, leaf);
    const group = new THREE.Group();
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const plant = (variants: ReturnType<typeof collectVariants>, spots: TreeSpot[], widthOf: (t: TreeSpot) => number) => {
      variants.forEach((parts, v) => {
        const mine = spots.filter((t) => t.variant % variants.length === v);
        if (mine.length === 0) return;
        for (const part of parts) {
          const inst = new THREE.InstancedMesh(part.geometry, part.material, mine.length);
          mine.forEach((t, i) => {
            q.setFromAxisAngle(up, t.yaw);
            const w = widthOf(t);
            // Pohon berdiri di atas gundukan, seperti di hutan rawa sungguhan.
            m.compose(new THREE.Vector3(t.x, surfaceY(t.x, t.z) - 0.15, t.z), q, new THREE.Vector3(w, t.heightM, w));
            inst.setMatrixAt(i, m);
          });
          inst.instanceMatrix.needsUpdate = true;
          // Hanya batang yang ikut langkah bayangan (lihat catatan anggaran).
          inst.castShadow = !part.leaf;
          inst.receiveShadow = true;
          inst.frustumCulled = false;
          group.add(inst);
        }
      });
    };
    // Tajuk dibuat lebih ramping daripada tingginya, karena jarak mendatar
    // dimampatkan; tanpa itu tajuk hutan tinggi selebar seperlima kubah.
    // Tajuk dilebarkan dari bentuk asli pachira yang ramping, supaya dari
    // atas terbaca sebagai pohon hutan yang rimbun, bukan batang menjulang.
    plant(full, trees.filter((t) => t.zone !== "tiang"), (t) => t.heightM * (t.zone === "tinggi" ? 0.95 : 1.05));
    plant(thin, trees.filter((t) => t.zone === "tiang"), (t) => t.heightM * 0.75);

    // Pakis lantai hutan (mutu tinggi saja): tanpa bayangan, murah, tetapi
    // membuat lantai hutan tidak lagi tampak seperti lapangan kosong.
    const ferns = plantFerns(quality);
    if (ferns.length) {
      const fernVariants = collectVariants(fernGltf.scene, 1);
      fernVariants.forEach((parts, v) => {
        const mine = ferns.filter((f) => f.variant % fernVariants.length === v);
        for (const part of parts) {
          const inst = new THREE.InstancedMesh(part.geometry, part.material, mine.length);
          mine.forEach((f, i) => {
            q.setFromAxisAngle(up, f.yaw);
            m.compose(new THREE.Vector3(f.x, surfaceY(f.x, f.z) - 0.05, f.z), q, new THREE.Vector3(f.scale * 0.6, f.scale, f.scale * 0.6));
            inst.setMatrixAt(i, m);
          });
          inst.instanceMatrix.needsUpdate = true;
          inst.receiveShadow = true;
          inst.frustumCulled = false;
          group.add(inst);
        }
      });
    }
    // Ranting akar di bibir potongan dibuang: dari jarak pandang ini ia
    // terbaca sebagai bintik hitam kotor. Gantinya rumput lantai hutan
    // seperti Modul Kanal.
    group.add(createHutanGrass(quality === "high" ? 2600 : 1100));
    return group;
  }, [treeGltf, fernGltf, trees, quality]);

  // Keadaan yang dianimasikan: air banjir, lumpur yang ditinggalkannya, dan
  // basahnya gambut.
  const anim = useRef({ flood: 0, soak: 0, silt: 0, siltLevel: RIVER_LEVEL });
  const floodRef = useRef<THREE.Mesh>(null);
  // Lantai hutan hijau-coklat alami seperti permukaan Modul Kanal.
  const topDry = useMemo(() => new THREE.Color("#6f8a52"), []);
  const topWet = useMemo(() => new THREE.Color("#5a7449"), []);
  const walkerZone = walkerKm === null ? null : zoneAt(walkerKm);
  const lit = FOREST_ZONES.find((z) => z.id === (activeZone ?? walkerZone?.id));

  // Sorotan pengukur dan jenis hutan berubah hanya saat pembaca bertindak.
  useEffect(() => {
    res.peatFace.probe.value.set(walkerKm === null ? 0 : xOfKm(walkerKm), walkerKm === null ? 0 : 1);
    const zone = lit ? [xOfKm(lit.fromKm), xOfKm(lit.toKm), 1] : [0, 0, 0];
    res.peatFace.zone.value.set(zone[0], zone[1], zone[2]);
    res.peatTop.zone.value.set(zone[0], zone[1], zone[2]);
    invalidate();
  }, [walkerKm, lit, res, invalidate]);

  useFrame((state, delta) => {
    const a = anim.current;
    const dt = Math.min(delta, 0.1);
    const k = 1 - Math.exp(-EASE * dt);
    const before = a.flood + a.soak + a.silt;
    // Banjir naik pelan dan surut lebih pelan lagi, seperti air sungai.
    a.flood += ((flood ? 1 : 0) - a.flood) * (1 - Math.exp(-(flood ? 0.9 : 0.6) * dt));
    a.soak += ((rain ? 1 : 0) - a.soak) * k * 0.6;
    const level = RIVER_LEVEL + (FLOOD_LEVEL_M - RIVER_LEVEL) * a.flood;
    // Lumpur mengendap sejauh air pernah sampai, dan tinggal setelah air
    // surut selama babak 02 masih dibuka.
    if (flood) {
      a.siltLevel = Math.max(a.siltLevel, level);
      a.silt = Math.min(1, a.silt + dt * 0.35 * a.flood);
    } else if (!waterAct) {
      a.silt = Math.max(0, a.silt - dt * 2);
      if (a.silt === 0) a.siltLevel = RIVER_LEVEL;
    }
    if (floodRef.current) {
      floodRef.current.position.y = level - FLOOD_LEVEL_M;
      floodRef.current.visible = a.flood > 0.01;
    }
    res.floodMat.level.value = level;
    res.peatTop.silt.value = a.silt;
    res.peatTop.siltLevel.value = a.siltLevel;
    res.peatFace.soak.value = a.soak;
    res.peatTop.color.copy(topDry).lerp(topWet, a.soak);
    res.peatTop.roughness = 0.9 - 0.55 * a.soak;
    // Riak air hanya bergerak di babak 02; di babak lain airnya diam dan
    // adegan tidak perlu digambar ulang terus-menerus.
    if (waterAct) {
      res.water.time.value = state.clock.elapsedTime;
      res.floodMat.time.value = state.clock.elapsedTime;
      invalidate();
    } else if (Math.abs(a.flood + a.soak + a.silt - before) > 1e-4) invalidate();
  });

  return (
    <group>
      {/* Gambut: muka potong berlapis, lantai hutan bergundukan. */}
      <mesh geometry={res.peatGeo} material={res.peatFace} receiveShadow castShadow />
      <mesh geometry={res.topGeo} material={res.peatTop} receiveShadow />
      <mesh geometry={res.mineralGeo} material={res.mineral} receiveShadow />
      <mesh geometry={res.riverGeo} material={res.water} />
      <mesh ref={floodRef} geometry={res.floodGeo} material={res.floodMat} visible={false} />
      <primitive object={forest} />

      {rain && <Rain quality={quality} />}

      {/* Pejalan dan pengukur tebal gambut (babak 01). */}
      {walkerKm !== null && <Walker km={walkerKm} />}

      <SceneLabels walkerKm={walkerKm} flood={flood} rain={rain} openedZones={openedZones} activeZone={activeZone} onZone={onZone} />
    </group>
  );
}

/** Pakaian dan kulit pejalan; jingga supaya mudah ditemukan di antara pohon. */
const SHIRT = new THREE.MeshStandardMaterial({ color: "#f0a35e", emissive: "#f0a35e", emissiveIntensity: 0.3, roughness: 0.8 });
const PANTS = new THREE.MeshStandardMaterial({ color: "#3b4a5a", roughness: 0.9 });
const SKIN = new THREE.MeshStandardMaterial({ color: "#c98d63", roughness: 0.8 });

/**
 * Pejalan setinggi 1,7 m di tepi depan. Tebal gambut di bawah kakinya
 * ditunjukkan oleh kolom terang pada muka potong (lihat domeMaterial.ts).
 */
function Walker({ km }: { km: number }) {
  const x = xOfKm(km);
  const z = Z_FRONT - 0.6;
  return (
    <group position={[x, surfaceY(x, z), z]} rotation={[0, Math.PI / 2 - 0.4, 0]}>
      {/* Kaki sedikit melangkah. */}
      <mesh position={[0, 0.42, 0.09]} rotation={[0.18, 0, 0]} material={PANTS} castShadow>
        <capsuleGeometry args={[0.075, 0.68, 3, 8]} />
      </mesh>
      <mesh position={[0, 0.42, -0.09]} rotation={[-0.18, 0, 0]} material={PANTS} castShadow>
        <capsuleGeometry args={[0.075, 0.68, 3, 8]} />
      </mesh>
      <mesh position={[0, 1.13, 0]} material={SHIRT} castShadow>
        <capsuleGeometry args={[0.17, 0.42, 4, 10]} />
      </mesh>
      {/* Lengan berayun berlawanan dengan kaki. */}
      <mesh position={[0, 1.08, 0.22]} rotation={[-0.25, 0, 0]} material={SHIRT}>
        <capsuleGeometry args={[0.055, 0.5, 3, 6]} />
      </mesh>
      <mesh position={[0, 1.08, -0.22]} rotation={[0.25, 0, 0]} material={SHIRT}>
        <capsuleGeometry args={[0.055, 0.5, 3, 6]} />
      </mesh>
      <mesh position={[0, PERSON_M - 0.13, 0]} material={SKIN} castShadow>
        <sphereGeometry args={[0.12, 12, 10]} />
      </mesh>
    </group>
  );
}

/** Hujan: satu LineSegments yang jatuh di peneduh titik. */
function Rain({ quality }: { quality: Quality }) {
  const count = quality === "high" ? 1800 : 700;
  const top = 70;
  const res = useMemo(() => {
    const pos = new Float32Array(count * 6);
    const base = new Float32Array(count * 2);
    const tip = new Float32Array(count * 2);
    let s = 7;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < count; i++) {
      const x = -LENGTH / 2 - RIVER_WIDTH + r() * (LENGTH + RIVER_WIDTH);
      const z = -DEPTH / 2 + r() * DEPTH;
      const y = r() * top;
      pos.set([x, 0, z, x - 0.25, 0, z], i * 6);
      base.set([y, y], i * 2);
      tip.set([0, 1], i * 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aBase", new THREE.BufferAttribute(base, 1));
    geo.setAttribute("aTip", new THREE.BufferAttribute(tip, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uTop: { value: top } },
      vertexShader: /* glsl */ `
        attribute float aBase;
        attribute float aTip;
        uniform float uTime;
        uniform float uTop;
        varying float vFade;
        void main() {
          float y = mod(aBase - uTime * 38.0, uTop) - 2.0 + aTip * 1.8;
          vFade = smoothstep(0.0, 6.0, y);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x, y, position.z, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vFade;
        void main() { gl_FragColor = vec4(0.72, 0.86, 0.95, 0.55 * vFade); }
      `,
    });
    return { geo, mat };
  }, [count]);

  useEffect(
    () => () => {
      res.geo.dispose();
      res.mat.dispose();
    },
    [res],
  );

  // Hujan perlu bingkai terus-menerus; PerformanceGuard membatasinya 30 fps
  // saat pembaca diam, jadi cukup minta digambar ulang.
  useFrame(({ clock, invalidate }) => {
    res.mat.uniforms.uTime.value = clock.elapsedTime;
    invalidate();
  });

  return <lineSegments geometry={res.geo} material={res.mat} frustumCulled={false} />;
}


/**
 * Keterangan di dalam adegan, sebagai HTML yang ditempel pada titik 3D.
 * Jumlahnya dijaga sedikit: tiap keterangan diletakkan ulang tiap bingkai.
 */
function SceneLabels({
  walkerKm,
  flood,
  rain,
  openedZones,
  activeZone,
  onZone,
}: Pick<HutanSceneProps, "walkerKm" | "flood" | "rain" | "openedZones" | "activeZone" | "onZone">) {
  const tag = "pointer-events-none whitespace-nowrap rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] text-white";
  const peat = walkerKm === null ? 0 : peatThicknessM(walkerKm);
  return (
    <>
      {walkerKm !== null && (
        <>
          <Html position={[xOfKm(walkerKm), peat + PERSON_M + 1.2, DEPTH / 2]} center zIndexRange={[10, 0]}>
            <span className="pointer-events-none rounded-full bg-[#f0a35e] px-2 py-0.5 text-[11px] font-bold text-[#1a120b]">{HUTAN_TEXT.you}</span>
          </Html>
          <Html position={[xOfKm(walkerKm) + 2.5, peat / 2 - 1.5, DEPTH / 2]} zIndexRange={[10, 0]} style={{ transform: "translateY(-50%)" }}>
            <span className="pointer-events-none whitespace-nowrap rounded-md bg-black/65 px-1.5 py-0.5 text-[12px] font-semibold text-[#ffd7b0]">
              {HUTAN_TEXT.gauge(Math.max(1, Math.round(peat)))}
            </span>
          </Html>
        </>
      )}

      {flood && (
        <Html position={[xOfKm(FLOOD_KM), FLOOD_LEVEL_M + 3, DEPTH / 2]} zIndexRange={[10, 0]}>
          <span className={`${tag} sekitarmu-rise block`} style={{ animationDelay: "2.4s" }}>
            <span className="block text-[#cfe9f7]">{HUTAN_TEXT.floodLimit}</span>
            <span className="block text-[10px] text-[#d8b07a]">{HUTAN_TEXT.floodCarry}</span>
          </span>
        </Html>
      )}

      {rain && (
        <Html position={[xOfKm(9), peatThicknessM(9) / 2, DEPTH / 2]} center zIndexRange={[10, 0]}>
          <span className={`${tag} sekitarmu-rise block text-[#cfe9f7]`} style={{ animationDelay: "1s" }}>
            {HUTAN_TEXT.rainSoak}
          </span>
        </Html>
      )}

      {/* Disembunyikan saat pejalan lewat, supaya tidak menindih pengukurnya. */}
      {(walkerKm === null || Math.abs(walkerKm - 12.2) > 2.2) && (
        <Html position={[xOfKm(12.2), 6, DEPTH / 2]} center zIndexRange={[10, 0]}>
          <span className="pointer-events-none hidden text-[11px] font-medium text-[#e0bb90] [text-shadow:0_1px_3px_rgba(0,0,0,0.9)] sm:inline">gambut</span>
        </Html>
      )}
      <Html position={[xOfKm(6.5), -MINERAL_M / 2, DEPTH / 2]} center zIndexRange={[10, 0]}>
        <span className="pointer-events-none hidden whitespace-nowrap text-[11px] text-white/70 sm:inline [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">tanah mineral</span>
      </Html>

      {/* Nama jenis hutan di bawah diorama; di babak 03 menjadi tombol. */}
      {FOREST_ZONES.map((z) => {
        const opened = openedZones?.has(z.id);
        const active = activeZone === z.id;
        // Nama ringkas dengan titik warna; rincian tebal gambut dan kanopi
        // ada di kolom kanan, supaya ketiga nama tidak saling menindih.
        const body = (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium leading-none text-white">
            {opened ? <span className="text-[10px] text-[#9fd3a0]">✓</span> : <span className="h-2 w-2 rounded-full" style={{ background: ZONE_DOT[z.id] }} />}
            {z.short}
          </span>
        );
        return (
          <Html key={z.id} position={[xOfKm((z.fromKm + z.toKm) / 2), -MINERAL_M - 1.6, DEPTH / 2]} zIndexRange={[20, 10]} style={{ transform: "translateX(-50%)" }}>
            {openedZones ? (
              <button
                type="button"
                data-guide={`zone-${z.id}`}
                onClick={() => onZone?.(z.id)}
                className={`cursor-pointer rounded-full border px-2.5 py-1.5 transition-colors ${
                  active ? "border-[#f0a35e] bg-[#f0a35e]/30" : opened ? "border-white/25 bg-black/55 hover:bg-black/70" : "animate-pulse border-[#6fb6d8] bg-[#6fb6d8]/25"
                }`}
              >
                {body}
              </button>
            ) : (
              <div className="hidden px-1 sm:block [text-shadow:0_1px_3px_rgba(0,0,0,0.95)]">{body}</div>
            )}
          </Html>
        );
      })}
    </>
  );
}

/** Warna titik tiap jenis hutan pada namanya di bawah bongkahan. */
const ZONE_DOT: Record<ForestZone["id"], string> = {
  campuran: "#7cc4a0",
  tiang: "#c9c77c",
  tinggi: "#5fa864",
};
