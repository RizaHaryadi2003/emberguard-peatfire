"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import PerformanceGuard from "@/components/modul/shared/scene/PerformanceGuard";
import FpsMeter, { wantsFpsMeter } from "@/components/modul/shared/scene/FpsMeter";
import SkyLighting from "@/components/modul/shared/scene/SkyLighting";
import Backdrop from "@/components/modul/shared/scene/Backdrop";
import { QUALITY_PROFILE, type AtmosphereState, type Quality } from "@/components/modul/shared/scene/dioramaConstants";
import { collectVariants } from "@/components/modul/shared/scene/plantVariants";
import { FOREST_ZONES, HUTAN_TEXT, type ForestZone } from "@/config/modul/hutan-rawa";
import {
  apeSpots,
  DEPTH,
  FLOOD_KM,
  FLOOD_LEVEL_M,
  FLOOD_RISE_M,
  LENGTH,
  MINERAL_M,
  peatThicknessM,
  PERSON_M,
  plantFerns,
  plantTrees,
  SPAN_KM,
  xOfKm,
  zoneAt,
  type ApeSpot,
  type TreeSpot,
} from "./dome";

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

/** Sudut kamera: sedikit dari kiri depan dan sedikit dari atas. */
const CAMERA_AZIMUTH = (-24 * Math.PI) / 180;
const CAMERA_ELEVATION = (13 * Math.PI) / 180;
const CAMERA_DISTANCE = 260;

/**
 * Skala dunia untuk SkyLighting (kabut, jarak matahari, jangkauan bayangan).
 * Bayangan menjangkau ±6 × skala; diorama ini selebar 120 dan setinggi ±60,
 * jadi 14 cukup menutup seluruhnya tanpa membuang resolusi peta bayangan.
 */
const WORLD_SCALE = 14;

/** Batas resolusi render modul ini; PerformanceGuard dapat menurunkannya lagi. */
const MODULE_MAX_DPR = { high: 1.25, low: 1 } as const;

/** Sungai di tepi kiri (satuan adegan). */
const RIVER_WIDTH = 9;
const RIVER_LEVEL = peatThicknessM(0) - 0.5;

/** Kotak isi yang harus muat di bingkai gambar. */
const CONTENT_BOX = new THREE.Box3(
  new THREE.Vector3(-LENGTH / 2 - RIVER_WIDTH, -MINERAL_M, -DEPTH / 2),
  new THREE.Vector3(LENGTH / 2, 13 + 45, DEPTH / 2),
);

/** Lama animasi naik/turun air dan basahnya gambut (detik, konstanta lerp). */
const EASE = 2.2;

export type HutanSceneProps = {
  /** Letak pejalan (km) di babak 01, atau null. */
  walkerKm: number | null;
  flood: boolean;
  rain: boolean;
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
      {/* Bingkai tempat diorama dipaskan. Di ponsel panel kendali babak 01–02
          menindih tepi bawah bingkai, jadi bingkainya dipendekkan di sana. */}
      <div ref={anchorRef} className={`pointer-events-none absolute inset-0 ${props.openedZones ? "" : "bottom-12 sm:bottom-0"}`} />
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
    const zoom = Math.min(rect.width / w, rect.height / h) * 0.97;

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

/** Tekstur pindaian dengan pengulangan dalam satuan adegan. */
function prepare(tex: THREE.Texture, repeat: number, color: boolean, anisotropy: number) {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = anisotropy;
  if (color) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
}

/** Bentuk penampang kubah (x mendatar, y tegak), dasar gambut di y = 0. */
function domeShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(xOfKm(0), 0);
  for (let k = 0; k <= SPAN_KM + 1e-6; k += 0.1) s.lineTo(xOfKm(k), peatThicknessM(k));
  s.lineTo(xOfKm(SPAN_KM), 0);
  s.closePath();
  return s;
}

/** Air banjir: ruang antara muka banjir dan tanah, dari sungai sampai lereng. */
function floodShape(): THREE.Shape {
  const s = new THREE.Shape();
  const left = xOfKm(0) - RIVER_WIDTH;
  s.moveTo(left, RIVER_LEVEL - 3);
  s.lineTo(left, FLOOD_LEVEL_M);
  s.lineTo(xOfKm(FLOOD_KM), FLOOD_LEVEL_M);
  for (let k = FLOOD_KM; k >= 0; k -= 0.05) s.lineTo(xOfKm(k), peatThicknessM(k) - 0.02);
  s.lineTo(xOfKm(0), RIVER_LEVEL - 3);
  s.closePath();
  return s;
}

function Dome({ walkerKm, flood, rain, openedZones, activeZone, onZone, quality }: HutanSceneProps) {
  const profile = QUALITY_PROFILE[quality];
  const invalidate = useThree((s) => s.invalidate);
  const [peatC, peatN, topC, topN, minC, minN] = useLoader(THREE.TextureLoader, [
    "/textures/gambut/hemik_color.webp",
    "/textures/gambut/hemik_normal.webp",
    "/textures/gambut/permukaan_color.webp",
    "/textures/gambut/permukaan_normal.webp",
    "/textures/gambut/mineral_color.webp",
    "/textures/gambut/mineral_normal.webp",
  ]);
  const [treeGltf, fernGltf] = useLoader(GLTFLoader, ["/models/gambut/pohon_pachira.glb", "/models/gambut/pakis.glb"]);

  const res = useMemo(() => {
    prepare(peatC, 0.22, true, profile.anisotropy);
    prepare(peatN, 0.22, false, profile.anisotropy);
    prepare(topC, 0.07, true, profile.anisotropy);
    prepare(topN, 0.07, false, profile.anisotropy);
    prepare(minC, 0.25, true, profile.anisotropy);
    prepare(minN, 0.25, false, profile.anisotropy);

    const peatGeo = new THREE.ExtrudeGeometry(domeShape(), { depth: DEPTH, bevelEnabled: false, steps: 1 });
    peatGeo.translate(0, 0, -DEPTH / 2);
    const peatFace = new THREE.MeshStandardMaterial({ map: peatC, normalMap: peatN, roughness: 0.95, color: "#d9c6b0" });
    // Serasah di bawah tajuk: digelapkan, karena lantai hutan rawa teduh.
    const peatTop = new THREE.MeshStandardMaterial({ map: topC, normalMap: topN, roughness: 0.9, color: "#7d7a5c" });

    const mineralGeo = new THREE.BoxGeometry(LENGTH + RIVER_WIDTH, MINERAL_M, DEPTH);
    mineralGeo.translate(-RIVER_WIDTH / 2, -MINERAL_M / 2, 0);
    const mineral = new THREE.MeshStandardMaterial({ map: minC, normalMap: minN, roughness: 1, color: "#b9b4a4" });

    const riverGeo = new THREE.BoxGeometry(RIVER_WIDTH, RIVER_LEVEL + 3, DEPTH);
    riverGeo.translate(xOfKm(0) - RIVER_WIDTH / 2, (RIVER_LEVEL - 3) / 2, 0);
    const water = new THREE.MeshStandardMaterial({ color: "#2b5e78", roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.88 });

    const floodGeo = new THREE.ExtrudeGeometry(floodShape(), { depth: DEPTH - 0.3, bevelEnabled: false });
    floodGeo.translate(0, 0, -(DEPTH - 0.3) / 2);
    const floodMat = new THREE.MeshStandardMaterial({ color: "#5a7f73", roughness: 0.12, metalness: 0.05, transparent: true, opacity: 0 });

    return { peatGeo, peatFace, peatTop, mineralGeo, mineral, riverGeo, water, floodGeo, floodMat };
  }, [peatC, peatN, topC, topN, minC, minN, profile.anisotropy]);

  useEffect(
    () => () => {
      for (const v of Object.values(res)) (v as { dispose?: () => void }).dispose?.();
    },
    [res],
  );

  // Pohon pachira, di-instance. Hutan tiang memakai tajuk yang dijarangkan.
  const trees = useMemo(() => plantTrees(quality), [quality]);
  const forest = useMemo(() => {
    // Daun dijarangkan: dari jarak pandang ini tiap pohon hanya selebar
    // seratusan piksel, sehingga 60% helai sudah terbaca sebagai tajuk penuh,
    // dan beban segitiga hutan turun dari ±920 ribu menjadi ±690 ribu.
    const full = collectVariants(treeGltf.scene, 0.6);
    const thin = collectVariants(treeGltf.scene, 0.3);
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
            m.compose(new THREE.Vector3(t.x, peatThicknessM(t.km) - 0.15, t.z), q, new THREE.Vector3(w, t.heightM, w));
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
    plant(full, trees.filter((t) => t.zone !== "tiang"), (t) => t.heightM * (t.zone === "tinggi" ? 0.6 : 0.75));
    plant(thin, trees.filter((t) => t.zone === "tiang"), (t) => t.heightM * 0.45);

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
            m.compose(new THREE.Vector3(f.x, peatThicknessM(f.km) - 0.05, f.z), q, new THREE.Vector3(f.scale * 0.6, f.scale, f.scale * 0.6));
            inst.setMatrixAt(i, m);
          });
          inst.instanceMatrix.needsUpdate = true;
          inst.receiveShadow = true;
          inst.frustumCulled = false;
          group.add(inst);
        }
      });
    }
    return group;
  }, [treeGltf, fernGltf, trees, quality]);

  // Keadaan yang dianimasikan: air banjir, basahnya gambut, satwa.
  const anim = useRef({ flood: 0, soak: 0 });
  const floodRef = useRef<THREE.Mesh>(null);
  const dryColor = useMemo(() => new THREE.Color("#d9c6b0"), []);
  const wetColor = useMemo(() => new THREE.Color("#7f8fa0"), []);
  const topDry = useMemo(() => new THREE.Color("#7d7a5c"), []);
  const topWet = useMemo(() => new THREE.Color("#4f6670"), []);

  useFrame((_, delta) => {
    const a = anim.current;
    const k = 1 - Math.exp(-EASE * Math.min(delta, 0.1));
    const before = a.flood + a.soak;
    a.flood += ((flood ? 1 : 0) - a.flood) * k;
    a.soak += ((rain ? 1 : 0) - a.soak) * k * 0.6;
    if (floodRef.current) {
      floodRef.current.position.y = -(FLOOD_RISE_M + 0.6) * (1 - a.flood);
      floodRef.current.visible = a.flood > 0.01;
    }
    res.floodMat.opacity = 0.82 * Math.min(1, a.flood * 1.6);
    res.peatFace.color.copy(dryColor).lerp(wetColor, a.soak);
    res.peatFace.roughness = 0.95 - 0.5 * a.soak;
    res.peatTop.color.copy(topDry).lerp(topWet, a.soak);
    res.peatTop.roughness = 0.9 - 0.55 * a.soak;
    // Selama air atau basahnya masih bergerak, minta bingkai berikutnya.
    if (Math.abs(a.flood + a.soak - before) > 1e-4) invalidate();
  });

  const apes = useMemo(() => apeSpots(trees), [trees]);
  const walkerZone = walkerKm === null ? null : zoneAt(walkerKm);

  return (
    <group>
      {/* Gambut: muka depan bertekstur gambut, permukaan atas serasah. */}
      <mesh geometry={res.peatGeo} material={[res.peatFace, res.peatTop]} receiveShadow castShadow />
      <mesh geometry={res.mineralGeo} material={res.mineral} receiveShadow />
      <mesh geometry={res.riverGeo} material={res.water} />
      <mesh ref={floodRef} geometry={res.floodGeo} material={res.floodMat} visible={false} />
      <primitive object={forest} />

      {rain && <Rain quality={quality} />}

      {/* Satwa di tajuk jenis hutan yang sudah dibuka (babak 03). */}
      {openedZones && apes.filter((a) => openedZones.has(a.zone)).map((a, i) => <ApeSprite key={`${a.zone}-${i}`} spot={a} />)}

      {/* Pejalan dan pengukur tebal gambut (babak 01). */}
      {walkerKm !== null && <Walker km={walkerKm} />}

      {/* Sorotan jenis hutan aktif: garis jingga di tepi bawah muka depan. */}
      {FOREST_ZONES.map((z) => {
        const lit = activeZone === z.id || walkerZone?.id === z.id;
        if (!lit) return null;
        const x0 = xOfKm(z.fromKm);
        const x1 = xOfKm(z.toKm);
        return (
          <mesh key={z.id} position={[(x0 + x1) / 2, -MINERAL_M - 0.6, DEPTH / 2]}>
            <boxGeometry args={[x1 - x0 - 0.6, 0.5, 0.5]} />
            <meshBasicMaterial color="#f0a35e" toneMapped={false} />
          </mesh>
        );
      })}

      <SceneLabels walkerKm={walkerKm} flood={flood} rain={rain} openedZones={openedZones} activeZone={activeZone} onZone={onZone} />
    </group>
  );
}

/** Pejalan setinggi 1,7 m di tepi depan, dengan pengukur tebal gambut. */
function Walker({ km }: { km: number }) {
  const x = xOfKm(km);
  const peat = peatThicknessM(km);
  const z = DEPTH / 2;
  return (
    <group>
      {/* Pengukur: batang jingga di muka depan, dari permukaan sampai mineral. */}
      <mesh position={[x, peat / 2, z + 0.06]}>
        <boxGeometry args={[0.7, peat, 0.1]} />
        <meshBasicMaterial color="#f0a35e" toneMapped={false} />
      </mesh>
      {Array.from({ length: Math.floor(peat) }, (_, i) => (
        <mesh key={i} position={[x, peat - (i + 1), z + 0.13]}>
          <boxGeometry args={[1.1, 0.12, 0.05]} />
          <meshBasicMaterial color="#2a1d14" />
        </mesh>
      ))}
      {/* Orang dewasa 1,7 m, pada skala tegak yang sama dengan pohon. */}
      <group position={[x, peat, z - 0.6]}>
        <mesh position={[0, 0.65, 0]} castShadow>
          <capsuleGeometry args={[0.22, 0.85, 4, 8]} />
          <meshStandardMaterial color="#f0a35e" emissive="#f0a35e" emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[0, PERSON_M - 0.14, 0]} castShadow>
          <sphereGeometry args={[0.16, 12, 8]} />
          <meshStandardMaterial color="#ffd7b0" />
        </mesh>
      </group>
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

/** Gambar siluet satwa pada kanvas, dipakai sebagai tekstur sprite. */
function apeTexture(kind: ApeSpot["kind"]): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.lineCap = "round";
  if (kind === "orangutan") {
    // Orangutan bergelantung: lengan panjang ke dahan, tubuh besar kemerahan.
    g.strokeStyle = "#b4562a";
    g.lineWidth = 11;
    g.beginPath();
    g.moveTo(34, 6);
    g.quadraticCurveTo(30, 40, 50, 58);
    g.moveTo(94, 6);
    g.quadraticCurveTo(98, 40, 78, 58);
    g.stroke();
    g.fillStyle = "#c0602e";
    g.beginPath();
    g.ellipse(64, 76, 25, 30, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#a24c25";
    g.beginPath();
    g.arc(64, 42, 15, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#b4562a";
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(52, 100);
    g.lineTo(48, 122);
    g.moveTo(76, 100);
    g.lineTo(80, 122);
    g.stroke();
  } else {
    // Owa berayun: tubuh ramping, lengan sangat panjang terentang.
    g.strokeStyle = "#cbbda8";
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(8, 10);
    g.quadraticCurveTo(36, 30, 64, 44);
    g.quadraticCurveTo(92, 30, 120, 8);
    g.stroke();
    g.fillStyle = "#d6c8b2";
    g.beginPath();
    g.arc(64, 46, 11, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#3a332d";
    g.beginPath();
    g.arc(64, 47, 6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#cbbda8";
    g.beginPath();
    g.ellipse(64, 76, 12, 20, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#cbbda8";
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(58, 92);
    g.lineTo(52, 116);
    g.moveTo(70, 92);
    g.lineTo(76, 116);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const APE_TEXTURES: Partial<Record<ApeSpot["kind"], THREE.CanvasTexture>> = {};

/**
 * Siluet satwa yang muncul membesar. Dibesarkan dari ukuran aslinya (±1,2 m)
 * supaya terbaca di samping pohon 45 m; keterangan di bawah gambar menyatakan
 * bahwa siluet adalah lambang tingkat relatif, bukan hitungan.
 */
function ApeSprite({ spot }: { spot: ApeSpot }) {
  const ref = useRef<THREE.Sprite>(null);
  const grow = useRef(0);
  const material = useMemo(() => {
    APE_TEXTURES[spot.kind] ??= apeTexture(spot.kind);
    // Tidak diuji kedalamannya: siluet adalah lambang, dan tanpa ini ia
    // tenggelam di antara ribuan helai daun pachira.
    return new THREE.SpriteMaterial({ map: APE_TEXTURES[spot.kind], transparent: true, depthWrite: false, depthTest: false });
  }, [spot.kind]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ invalidate }, delta) => {
    if (grow.current >= 1 || !ref.current) return;
    grow.current = Math.min(1, grow.current + delta * 2.2);
    const s = 6.5 * (1 - Math.pow(1 - grow.current, 3));
    ref.current.scale.set(s, s, 1);
    invalidate();
  });
  return <sprite ref={ref} position={[spot.x, spot.y, DEPTH / 2 + 1]} material={material} scale={[0.01, 0.01, 1]} renderOrder={10} />;
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
          <Html position={[xOfKm(walkerKm) + 1.2, peat / 2, DEPTH / 2]} zIndexRange={[10, 0]} style={{ transform: "translateY(-50%)" }}>
            <span className="pointer-events-none whitespace-nowrap rounded-md bg-black/65 px-1.5 py-0.5 text-[12px] font-semibold text-[#ffd7b0]">
              {HUTAN_TEXT.gauge(Math.max(1, Math.round(peat)))}
            </span>
          </Html>
        </>
      )}

      {flood && (
        <Html position={[xOfKm(FLOOD_KM), FLOOD_LEVEL_M + 3, DEPTH / 2]} zIndexRange={[10, 0]}>
          <span className={`${tag} sekitarmu-rise block`} style={{ animationDelay: "0.8s" }}>
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
      <Html position={[xOfKm(2.5), -MINERAL_M / 2, DEPTH / 2]} center zIndexRange={[10, 0]}>
        <span className="pointer-events-none hidden whitespace-nowrap text-[11px] text-white/70 sm:inline [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">tanah mineral</span>
      </Html>

      {/* Nama jenis hutan di bawah diorama; di babak 03 menjadi tombol. */}
      {FOREST_ZONES.map((z) => {
        const opened = openedZones?.has(z.id);
        const active = activeZone === z.id;
        const body = (
          <>
            <span className="block whitespace-nowrap text-[11px] font-medium leading-tight text-white sm:text-xs">
              <span className="sm:hidden">{z.short}</span>
              <span className="hidden sm:inline">{z.name}</span>
            </span>
            <span className="hidden whitespace-nowrap text-[10px] text-white/60 sm:block">
              gambut {z.peat} · kanopi {z.canopy}
            </span>
          </>
        );
        return (
          <Html key={z.id} position={[xOfKm((z.fromKm + z.toKm) / 2), -MINERAL_M - 1.5, DEPTH / 2]} zIndexRange={[20, 10]} style={{ transform: "translateX(-50%)" }}>
            {openedZones ? (
              <button
                type="button"
                onClick={() => onZone?.(z.id)}
                className={`cursor-pointer rounded-xl border px-2 py-1 text-center transition-colors sm:px-2.5 sm:py-1.5 ${
                  active ? "border-[#f0a35e] bg-[#f0a35e]/25" : opened ? "border-white/30 bg-black/60" : "animate-pulse border-[#6fb6d8] bg-[#6fb6d8]/25"
                }`}
              >
                {body}
              </button>
            ) : (
              <div className="hidden rounded-lg bg-black/45 px-2 py-1 text-center sm:block">{body}</div>
            )}
          </Html>
        );
      })}
    </>
  );
}
