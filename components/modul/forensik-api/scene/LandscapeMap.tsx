"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, useTexture } from "@react-three/drei";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CASE_IGNITION, GRID_H, GRID_W, isCanal, landAt, type Land } from "@/lib/model/ignition";
import { CASE_FIRE, FORENSIK_TEXT, LAND_LABEL, type InspectPart } from "@/config/modul/forensik-api";
import type { SceneState } from "@/components/modul/anatomi/scene/sceneState";
import { createEmberTexture, createSmokeTexture, createSparkTexture } from "@/components/modul/shared/scene/proceduralTextures";
import { PEAT_LAYER_TINT, type Quality } from "@/components/modul/shared/scene/dioramaConstants";
import { burnsAt, cellIndex, fireAt, type CellFire } from "../fireView";
import type { BurnAnim, MapPicker } from "./ForensikScene";

// Babak 02 dan 03: lanskap gambut dari atas, satu kotak = 1 km², sebesar
// satu titik api satelit. Tata letaknya dari lib/model/ignition.ts (ilustratif:
// sungai dan kampung di kiri, kebun sawit kiri bawah, lahan terbuka berkanal
// di tengah, hutan di kanan). Lanskapnya berdiri di atas bongkahan gambut
// berlapis, sama seperti petak babak 01. Api digambar per kotak, seperti
// satelit melihatnya: kotak panas menyala, kotak yang sudah padam menjadi arang.

/** Sisi satu kotak di adegan (m). Peta 24 × 16 kotak menjadi 6 × 4 m. */
const S = 0.25;

/** Tebal tanah di atas bongkahan, dan dasar sungai yang lebih rendah (m). */
const TILE_H = 0.1;
const RIVER_BED = 0.03;

/** Permukaan air sungai dan kanal (m). */
const WATER_TOP = 0.075;

/** Sudut hadap awal: miring tiga perempat, supaya dua dinding bongkahan terlihat. */
const BASE_YAW = -0.32;

/**
 * Rona pengali tekstur permukaan tiap jenis lahan. Teksturnya gambut kering
 * yang sama dengan permukaan bongkahan babak 01; ronanya membedakan lahan.
 */
const LAND_TINT: Record<Land, string> = {
  terbuka: "#e6cf98",
  kebun: "#9dbb5c",
  hutan: "#4d7a3e",
  kampung: "#c9bfae",
  sungai: "#4a3a2a",
};

/** Warna bekas terbakar (dikalikan tekstur permukaan). */
const SCAR_COLOR = "#3a302a";

/** Warna sorotan bagian yang diklik. */
const HIGHLIGHT_COLOR = "#ffffff";

/** Jumlah gumpal asap dan lidah api di atas kotak yang panas, menurut mutu grafis. */
const SMOKE = { high: 40, low: 16 } as const;
const FLAMES = { high: 48, low: 20 } as const;

/** Ragam hijau tajuk pohon hutan dan pelepah sawit, dan warna atap rumah. */
const TREE_GREENS = ["#2f6b34", "#3b7c3a", "#285c2e", "#4a8640", "#336f3c"];
const PALM_GREENS = ["#86a845", "#7a9c3e", "#93b450"];
const ROOF_COLORS = ["#8c4a30", "#8f969c", "#6d7f8a", "#9a5a36"];

/** Warna hiasan yang sudah terbakar. */
const BURNT = new THREE.Color("#1f1a17");

/**
 * Lapisan dinding bongkahan di bawah peta, dari atas ke bawah: tebalnya di
 * adegan (m). Hanya rupa, supaya peta terbaca sebagai sepotong lahan gambut
 * yang sama dengan petak babak 01 — bukan skala kedalaman sungguhan (peta ini
 * 24 km lebarnya).
 */
const WALL_LAYERS: { id: "fibrik" | "hemik" | "saprik" | "mineral"; h: number }[] = [
  { id: "fibrik", h: 0.3 },
  { id: "hemik", h: 0.4 },
  { id: "saprik", h: 0.45 },
  { id: "mineral", h: 0.3 },
];

/** Lebar dan dalam bongkahan (m), tepat selebar peta. */
const BLOCK_W = GRID_W * S;
const BLOCK_D = GRID_H * S;

/** Letak label tiap bagian peta (petak, boleh pecahan). */
const LABELS: { part: InspectPart; x: number; y: number }[] = [
  { part: "sungai", x: 1, y: 1.5 },
  { part: "kampung", x: 2.5, y: 7.5 },
  { part: "kebun", x: 5, y: 13 },
  { part: "terbuka", x: 7, y: 9 },
  { part: "kanal", x: 7, y: 5 },
  { part: "hutan", x: 19.5, y: 11 },
];

/** Titik tengah petak (x, y) di adegan. Baris 0 di belakang, baris terakhir di depan. */
export function cellCenter(x: number, y: number): [number, number] {
  return [(x - (GRID_W - 1) / 2) * S, (y - (GRID_H - 1) / 2) * S];
}

/** Petak dari nomor larik datarnya. */
export function cellOf(i: number): { x: number; y: number } {
  return { x: i % GRID_W, y: Math.floor(i / GRID_W) };
}

/** Bilangan semu 0–1 yang tetap untuk masukan yang sama. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Tinggi permukaan tiap petak. Lahan terbuka sedikit naik-turun (gambut
 * gundul tidak rata), sehingga cahaya membentuk bayang halus antarkotak.
 */
const TOPS: readonly number[] = Array.from({ length: GRID_W * GRID_H }, (_, i) => {
  const { x, y } = cellOf(i);
  const land = landAt(x, y);
  if (land === "sungai") return RIVER_BED;
  const jitter = land === "terbuka" ? (hash(i * 5.1) - 0.5) * 0.014 : (hash(i * 5.1) - 0.5) * 0.006;
  return TILE_H + jitter;
});

/** Satu hiasan di atas petak: letak, skala, putaran, warna, dan petak induknya. */
type Deco = { x: number; y: number; z: number; sx: number; sy: number; sz: number; rot: number; cell: number; color: THREE.Color };

/** Hiasan tiap jenis lahan: pohon (batang + dua tajuk), sawit, rumah, dan semak. */
function buildDecor() {
  const trunks: Deco[] = [];
  const crowns: Deco[] = [];
  const palms: Deco[] = [];
  const palmTrunks: Deco[] = [];
  const houses: Deco[] = [];
  const shrubs: Deco[] = [];
  for (let y = 0; y < GRID_H; y++)
    for (let x = 0; x < GRID_W; x++) {
      const land = landAt(x, y);
      const [cx, cz] = cellCenter(x, y);
      const cell = cellIndex(x, y);
      const top = TOPS[cell];
      const h = (k: number) => hash(cell * 13.1 + k);
      if (land === "hutan") {
        // Tiga sampai lima pohon berdesakan, sesekali satu pohon menjulang.
        const n = 3 + Math.floor(h(1) * 3);
        for (let i = 0; i < n; i++) {
          const tall = h(i + 5) > 0.85 ? 1.35 : 1;
          const r = (0.045 + h(i + 2) * 0.025) * tall;
          const trunkH = (0.05 + h(i + 3) * 0.03) * tall;
          const px = cx + (h(i + 10) - 0.5) * S * 0.7;
          const pz = cz + (h(i + 20) - 0.5) * S * 0.7;
          const color = new THREE.Color(TREE_GREENS[Math.floor(h(i + 30) * TREE_GREENS.length)]).multiplyScalar(0.9 + h(i + 31) * 0.2);
          trunks.push({ x: px, y: top, z: pz, sx: 1, sy: trunkH, sz: 1, rot: 0, cell, color: new THREE.Color("#4a3426") });
          crowns.push({ x: px, y: top + trunkH + r * 0.5, z: pz, sx: r, sy: r * 0.8, sz: r, rot: h(i + 40) * 6.28, cell, color });
          crowns.push({
            x: px + (h(i + 41) - 0.5) * r * 0.5,
            y: top + trunkH + r * 1.15,
            z: pz + (h(i + 42) - 0.5) * r * 0.5,
            sx: r * 0.68,
            sy: r * 0.6,
            sz: r * 0.68,
            rot: h(i + 43) * 6.28,
            cell,
            color: color.clone().multiplyScalar(1.15),
          });
        }
      } else if (land === "kebun") {
        // Sawit ditanam berbaris: empat pohon rapi per kotak.
        for (const [ox, oz] of [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ]) {
          const px = cx + ox * S * 0.23;
          const pz = cz + oz * S * 0.23;
          const trunkH = 0.035 + h(ox * 3 + oz) * 0.01;
          palmTrunks.push({ x: px, y: top, z: pz, sx: 0.8, sy: trunkH, sz: 0.8, rot: 0, cell, color: new THREE.Color("#5a4632") });
          palms.push({
            x: px,
            y: top + trunkH,
            z: pz,
            sx: 1,
            sy: 1,
            sz: 1,
            rot: h(ox + oz * 3 + 7) * 6.28,
            cell,
            color: new THREE.Color(PALM_GREENS[Math.floor(h(ox + oz + 9) * PALM_GREENS.length)]),
          });
        }
      } else if (land === "kampung") {
        for (let i = 0; i < 3; i++)
          houses.push({
            x: cx + (h(i + 50) - 0.5) * S * 0.45,
            y: top,
            z: cz + (i - 1) * S * 0.3,
            sx: 1,
            sy: 1,
            sz: 1,
            rot: (h(i + 60) - 0.5) * 0.5,
            cell,
            color: new THREE.Color(ROOF_COLORS[Math.floor(h(i + 70) * ROOF_COLORS.length)]),
          });
      } else if (land === "terbuka" && !isCanal(x, y)) {
        // Lahan terbuka: pakis dan semak jarang di atas gambut gundul.
        const n = Math.floor(h(70) * 4);
        for (let i = 0; i < n; i++) {
          const r = 0.016 + h(i + 80) * 0.016;
          shrubs.push({
            x: cx + (h(i + 90) - 0.5) * S * 0.8,
            y: top + r * 0.35,
            z: cz + (h(i + 100) - 0.5) * S * 0.8,
            sx: r,
            sy: r * 0.6,
            sz: r,
            rot: h(i + 110) * 6.28,
            cell,
            color: new THREE.Color(h(i + 120) > 0.5 ? "#7f7d3e" : "#6a7038"),
          });
        }
      }
    }
  return { trunks, crowns, palms, palmTrunks, houses, shrubs };
}

/** Pelepah sawit: tujuh daun pipih yang memancar dan merunduk. */
function createPalmGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const g = new THREE.BoxGeometry(0.055, 0.003, 0.012);
    g.translate(0.0275, 0, 0);
    g.rotateZ(-0.38);
    g.rotateY((i / 7) * Math.PI * 2);
    parts.push(g);
  }
  const merged = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  return merged;
}

type Tmp = { m4: THREE.Matrix4; q: THREE.Quaternion; v: THREE.Vector3; sc: THREE.Vector3; up: THREE.Vector3 };

/**
 * Tulis letak dan warna hiasan ke `InstancedMesh`. Hiasan di petak yang
 * terbakar mengecil (`shrinkBurnt`) dan menghitam; batang pohon tetap
 * berdiri sebagai tonggak hangus.
 */
function writeDecor(mesh: THREE.InstancedMesh, list: readonly Deco[], fire: ReadonlyMap<number, CellFire> | null, shrinkBurnt: number, t: Tmp, color?: THREE.Color) {
  list.forEach((d, i) => {
    const burnt = fire?.has(d.cell) ?? false;
    const k = burnt ? shrinkBurnt : 1;
    t.q.setFromAxisAngle(t.up, d.rot);
    t.v.set(d.x, d.y, d.z);
    t.sc.set(d.sx * k, d.sy * k, d.sz * k);
    t.m4.compose(t.v, t.q, t.sc);
    mesh.setMatrixAt(i, t.m4);
    mesh.setColorAt(i, burnt ? BURNT : (color ?? d.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

export default function LandscapeMap({
  stateRef,
  pickRef,
  act,
  day,
  burnsLit,
  burnAnim,
  highlight,
  highlightStrength,
  quality,
  reducedMotion,
}: {
  stateRef: RefObject<SceneState>;
  pickRef: RefObject<MapPicker | null>;
  act: number;
  day: number;
  burnsLit: number;
  burnAnim: BurnAnim | null;
  highlight: InspectPart | null;
  highlightStrength: number;
  quality: Quality;
  reducedMotion: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const tilesRef = useRef<THREE.InstancedMesh>(null);
  const camera = useThree((s) => s.camera);
  const surface = useTexture("/textures/gambut/permukaan_kering_color.webp");

  const res = useMemo(() => {
    const n = GRID_W * GRID_H;
    const decor = buildDecor();
    // Tanah: satu kotak per petak tanpa celah, bertekstur gambut kering.
    const groundTex = surface.clone();
    groundTex.colorSpace = THREE.SRGBColorSpace;
    groundTex.needsUpdate = true;
    const tileGeo = new THREE.BoxGeometry(S, 1, S);
    tileGeo.translate(0, 0.5, 0);
    const tileMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95, metalness: 0 });
    const flatGeo = new THREE.PlaneGeometry(S, S);
    flatGeo.rotateX(-Math.PI / 2);
    // Kotak panas: dasar jingga-merah (campuran biasa supaya tidak memucat di
    // atas tanah terang) dan di atasnya pola bara yang berpijar.
    const emberTex = createEmberTexture(256);
    const hotMat = new THREE.MeshBasicMaterial({ color: "#d9480f", transparent: true, opacity: 0.92, toneMapped: false, depthWrite: false });
    const glowMat = new THREE.MeshBasicMaterial({
      map: emberTex,
      color: "#ffb347",
      transparent: true,
      opacity: 1,
      toneMapped: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const scarMat = new THREE.MeshStandardMaterial({ map: groundTex, color: SCAR_COLOR, roughness: 1, transparent: true, opacity: 0.95, depthWrite: false });
    const lightMat = new THREE.MeshBasicMaterial({ color: HIGHLIGHT_COLOR, transparent: true, opacity: 0, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending });
    // Garis kisi 1 km² yang tipis: pengingat bahwa satelit melihat kotak, bukan api.
    const gridPts: number[] = [];
    const y0 = TILE_H + 0.009;
    for (let x = 0; x <= GRID_W; x++) {
      const px = (x - GRID_W / 2) * S;
      gridPts.push(px, y0, -BLOCK_D / 2, px, y0, BLOCK_D / 2);
    }
    for (let y = 0; y <= GRID_H; y++) {
      const pz = (y - GRID_H / 2) * S;
      gridPts.push(-BLOCK_W / 2, y0, pz, BLOCK_W / 2, y0, pz);
    }
    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute("position", new THREE.Float32BufferAttribute(gridPts, 3));
    const gridMat = new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.13, depthWrite: false });
    const crownGeo = new THREE.IcosahedronGeometry(1, 1);
    const trunkGeo = new THREE.CylinderGeometry(0.006, 0.009, 1, 5);
    trunkGeo.translate(0, 0.5, 0);
    const palmGeo = createPalmGeometry();
    const leafMat = new THREE.MeshStandardMaterial({ roughness: 0.82, flatShading: true });
    const palmMat = new THREE.MeshStandardMaterial({ roughness: 0.75, flatShading: true, side: THREE.DoubleSide });
    const barkMat = new THREE.MeshStandardMaterial({ roughness: 0.9 });
    const shrubMat = new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true });
    const wallGeo = new THREE.BoxGeometry(0.06, 0.035, 0.045);
    wallGeo.translate(0, 0.0175, 0);
    const roofGeo = new THREE.ConeGeometry(0.048, 0.03, 4);
    roofGeo.rotateY(Math.PI / 4);
    roofGeo.translate(0, 0.05, 0);
    const wallMat = new THREE.MeshStandardMaterial({ roughness: 0.8 });
    const roofMat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.2 });
    // Air: sungai sepanjang kolomnya dan kanal yang membelah lahan terbuka.
    // Halus dan sedikit logam, supaya memantulkan langit.
    const waterMat = new THREE.MeshStandardMaterial({ color: "#2c6683", roughness: 0.08, metalness: 0.35 });
    const [rx] = cellCenter(1, 0);
    const riverGeo = new THREE.BoxGeometry(S, WATER_TOP - RIVER_BED, BLOCK_D);
    riverGeo.translate(rx, (WATER_TOP + RIVER_BED) / 2, 0);
    const canalCells = Array.from({ length: n }, (_, i) => cellOf(i)).filter((c) => isCanal(c.x, c.y));
    const [x0, z0] = cellCenter(canalCells[0].x, canalCells[0].y);
    const [x1] = cellCenter(canalCells[canalCells.length - 1].x, canalCells[0].y);
    // Kanal menyambung dari sungai sampai ujungnya di lahan terbuka.
    const canalGeo = new THREE.BoxGeometry(x1 - x0 + S * 1.5, 0.02, S * 0.22);
    canalGeo.translate((x0 + x1) / 2 - S * 0.25, TILE_H, z0);
    const ringGeo = new THREE.RingGeometry(0.75, 1, 48);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: "#ffd9a8", transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
    const smokeTex = createSmokeTexture();
    const sparkTex = createSparkTexture();
    return {
      n,
      decor,
      groundTex,
      tileGeo,
      tileMat,
      flatGeo,
      emberTex,
      hotMat,
      glowMat,
      scarMat,
      lightMat,
      gridGeo,
      gridMat,
      crownGeo,
      trunkGeo,
      palmGeo,
      leafMat,
      palmMat,
      barkMat,
      shrubMat,
      wallGeo,
      roofGeo,
      wallMat,
      roofMat,
      waterMat,
      riverGeo,
      canalGeo,
      ringGeo,
      ringMat,
      smokeTex,
      sparkTex,
    };
  }, [surface]);
  useEffect(
    () => () => {
      for (const v of Object.values(res)) if (v && typeof (v as { dispose?: () => void }).dispose === "function") (v as { dispose: () => void }).dispose();
    },
    [res],
  );

  const hotRef = useRef<THREE.InstancedMesh>(null);
  const glowRef = useRef<THREE.InstancedMesh>(null);
  const scarRef = useRef<THREE.InstancedMesh>(null);
  const lightRef = useRef<THREE.InstancedMesh>(null);
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const crownRef = useRef<THREE.InstancedMesh>(null);
  const palmRef = useRef<THREE.InstancedMesh>(null);
  const palmTrunkRef = useRef<THREE.InstancedMesh>(null);
  const shrubRef = useRef<THREE.InstancedMesh>(null);
  const wallRef = useRef<THREE.InstancedMesh>(null);
  const roofRef = useRef<THREE.InstancedMesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const tmp = useMemo<Tmp>(
    () => ({ m4: new THREE.Matrix4(), q: new THREE.Quaternion(), v: new THREE.Vector3(), sc: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) }),
    [],
  );

  // Asap dan lidah api: sprite yang dibagi bergiliran ke kotak-kotak panas.
  const smoke = useMemo(
    () =>
      Array.from({ length: SMOKE[quality] }, (_, i) => {
        const mat = new THREE.SpriteMaterial({ map: res.smokeTex, color: "#6f6760", transparent: true, opacity: 0, depthWrite: false });
        return { sprite: new THREE.Sprite(mat), mat, seed: hash(i * 4.3) };
      }),
    [res, quality],
  );
  const flames = useMemo(
    () =>
      Array.from({ length: FLAMES[quality] }, (_, i) => {
        const mat = new THREE.SpriteMaterial({
          map: res.sparkTex,
          color: "#ffa040",
          transparent: true,
          opacity: 0,
          depthWrite: false,
          toneMapped: false,
          blending: THREE.AdditiveBlending,
        });
        return { sprite: new THREE.Sprite(mat), mat, seed: hash(i * 7.9), ox: hash(i * 2.1) - 0.5, oz: hash(i * 3.3) - 0.5 };
      }),
    [res, quality],
  );
  useEffect(
    () => () => {
      smoke.forEach((p) => p.mat.dispose());
      flames.forEach((p) => p.mat.dispose());
    },
    [smoke, flames],
  );

  // Tanah, rumah, dan batang pohon ditulis sekali.
  useEffect(() => {
    const tiles = tilesRef.current;
    if (!tiles) return;
    const m4 = new THREE.Matrix4();
    const c = new THREE.Color();
    for (let i = 0; i < res.n; i++) {
      const { x, y } = cellOf(i);
      const land = landAt(x, y);
      const [cx, cz] = cellCenter(x, y);
      m4.makeScale(1, TOPS[i], 1).setPosition(cx, 0, cz);
      tiles.setMatrixAt(i, m4);
      // Sedikit beda rona tiap kotak supaya lahan tidak tampak seperti cat rata.
      c.set(LAND_TINT[land]).multiplyScalar(0.88 + hash(i * 2.7) * 0.24);
      tiles.setColorAt(i, c);
    }
    tiles.instanceMatrix.needsUpdate = true;
    if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;
    tiles.computeBoundingSphere();
    pickRef.current = { camera, tiles };
    if (wallRef.current) writeDecor(wallRef.current, res.decor.houses, null, 1, tmp, new THREE.Color("#e2d8c6"));
    if (roofRef.current) writeDecor(roofRef.current, res.decor.houses, null, 1, tmp);
    if (palmTrunkRef.current) writeDecor(palmTrunkRef.current, res.decor.palmTrunks, null, 1, tmp);
    return () => {
      pickRef.current = null;
    };
  }, [res, camera, pickRef, tmp]);

  // Petak yang disorot: semua kotak bagian yang diklik (atau di bawah kursor).
  useEffect(() => {
    const light = lightRef.current;
    if (!light) return;
    const m4 = new THREE.Matrix4();
    let k = 0;
    if (highlight)
      for (let i = 0; i < res.n; i++) {
        const { x, y } = cellOf(i);
        const match = highlight === "kanal" ? isCanal(x, y) : landAt(x, y) === highlight && !(highlight === "terbuka" && isCanal(x, y));
        if (!match) continue;
        const [cx, cz] = cellCenter(x, y);
        m4.makeTranslation(cx, Math.max(TOPS[i], WATER_TOP) + 0.014, cz);
        light.setMatrixAt(k++, m4);
      }
    light.count = k;
    light.instanceMatrix.needsUpdate = true;
  }, [highlight, res]);

  // Keadaan api per petak: ditulis ulang hanya bila berubah. Pada babak 02
  // berubah saat waktu diputar; pada babak 03 berubah selama api dianimasikan.
  const lastKey = useRef("");
  const hotCells = useRef<number[]>([]);

  useFrame((state, delta) => {
    const s = stateRef.current;
    const g = groupRef.current;
    if (!s || !g) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, BASE_YAW + s.rotation, reducedMotion ? 30 : 10, dt);

    // 1 · Keadaan api saat ini.
    let fire: Map<number, CellFire>;
    if (act === 1) fire = fireAt(CASE_FIRE, day);
    else {
      const elapsed = burnAnim ? (reducedMotion ? Infinity : performance.now() - burnAnim.start) : Infinity;
      fire = burnsAt(burnsLit, burnAnim?.index ?? null, elapsed);
    }
    let key = `${act}|`;
    for (const [i, v] of fire) key += `${i}${v === "hot" ? "h" : "s"},`;
    if (key !== lastKey.current) {
      lastKey.current = key;
      const hot = hotRef.current;
      const glow = glowRef.current;
      const scar = scarRef.current;
      if (hot && glow && scar) {
        let nh = 0;
        let ns = 0;
        const hc: number[] = [];
        for (const [i, v] of fire) {
          const { x, y } = cellOf(i);
          const [cx, cz] = cellCenter(x, y);
          tmp.m4.makeTranslation(cx, TOPS[i] + 0.006, cz);
          if (v === "hot") {
            hot.setMatrixAt(nh, tmp.m4);
            tmp.m4.makeTranslation(cx, TOPS[i] + 0.008, cz);
            glow.setMatrixAt(nh++, tmp.m4);
            hc.push(i);
          } else scar.setMatrixAt(ns++, tmp.m4);
        }
        hot.count = glow.count = nh;
        scar.count = ns;
        hot.instanceMatrix.needsUpdate = true;
        glow.instanceMatrix.needsUpdate = true;
        scar.instanceMatrix.needsUpdate = true;
        hotCells.current = hc;
      }
      if (crownRef.current) writeDecor(crownRef.current, res.decor.crowns, fire, 0.45, tmp);
      if (trunkRef.current) writeDecor(trunkRef.current, res.decor.trunks, fire, 1, tmp);
      if (palmRef.current) writeDecor(palmRef.current, res.decor.palms, fire, 0.4, tmp);
      if (shrubRef.current) writeDecor(shrubRef.current, res.decor.shrubs, fire, 0.01, tmp);
    }

    // 2 · Pijar kotak panas berdenyut seperti bara yang hidup.
    res.glowMat.opacity = reducedMotion ? 0.9 : 0.7 + 0.3 * Math.sin(t * 7.1) * Math.sin(t * 2.9 + 1);
    res.hotMat.opacity = reducedMotion ? 0.92 : 0.86 + 0.08 * Math.sin(t * 5.3);

    // 3 · Lidah api pendek dan asap pekat dari kotak-kotak yang masih panas.
    const hc = hotCells.current;
    flames.forEach((p, i) => {
      if (hc.length === 0) {
        p.mat.opacity = 0;
        return;
      }
      const cycle = 0.6 + p.seed * 0.6;
      const a = reducedMotion ? 0.4 : ((t + p.seed * 5) % cycle) / cycle;
      const cell = hc[i % hc.length];
      const { x, y } = cellOf(cell);
      const [cx, cz] = cellCenter(x, y);
      p.sprite.position.set(cx + p.ox * S * 0.75, TOPS[cell] + 0.02 + a * 0.09, cz + p.oz * S * 0.75);
      p.sprite.scale.setScalar(0.07 * (1 - a * 0.6));
      p.mat.opacity = Math.sin(Math.PI * a) * 0.95;
      p.mat.color.setRGB(1, 0.45 + 0.3 * (1 - a), 0.15);
    });
    smoke.forEach((p, i) => {
      if (hc.length === 0 || reducedMotion) {
        p.mat.opacity = 0;
        return;
      }
      const cycle = 3 + p.seed * 2;
      const a = ((t + p.seed * 10) % cycle) / cycle;
      const cell = hc[(i + Math.floor((t + p.seed * 10) / cycle) * 7) % hc.length];
      const { x, y } = cellOf(cell);
      const [cx, cz] = cellCenter(x, y);
      p.sprite.position.set(cx + (p.seed - 0.5) * S * 0.5 + a * 0.3, TOPS[cell] + 0.06 + a * 1.0, cz + (hash(i) - 0.5) * S * 0.5);
      p.sprite.scale.setScalar(0.14 + a * 0.5);
      p.mat.opacity = Math.sin(Math.PI * a) * 0.5;
    });

    // 4 · Sorotan bagian yang diklik berdenyut.
    const pulse = reducedMotion ? 1 : 0.65 + 0.35 * Math.sin(t * 4);
    res.lightMat.opacity = THREE.MathUtils.damp(res.lightMat.opacity, highlight ? 0.26 * pulse * highlightStrength : 0, 8, dt);

    // 5 · Cincin titik sulut, hanya saat waktu sudah diputar sampai hari ke-0.
    const ring = ringRef.current;
    if (ring) {
      const on = act === 1 && day === 0;
      ring.visible = on;
      if (on) {
        const k = reducedMotion ? 0.5 : (t % 1.6) / 1.6;
        ring.scale.setScalar(S * (0.5 + 1.3 * k));
        res.ringMat.opacity = 0.9 * (1 - k);
      }
    }
  });

  const [ix, iz] = cellCenter(CASE_IGNITION.x, CASE_IGNITION.y);
  const pill =
    "pointer-events-none whitespace-nowrap rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-medium text-white/85 sm:text-[10px] [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]";
  const d = res.decor;

  return (
    <group ref={groupRef} rotation={[0, BASE_YAW, 0]}>
      <PeatWalls />
      <instancedMesh ref={tilesRef} args={[res.tileGeo, res.tileMat, res.n]} castShadow receiveShadow />
      <mesh geometry={res.riverGeo} material={res.waterMat} receiveShadow />
      <mesh geometry={res.canalGeo} material={res.waterMat} receiveShadow />
      <lineSegments geometry={res.gridGeo} material={res.gridMat} />
      <instancedMesh ref={scarRef} args={[res.flatGeo, res.scarMat, res.n]} frustumCulled={false} receiveShadow />
      <instancedMesh ref={hotRef} args={[res.flatGeo, res.hotMat, res.n]} frustumCulled={false} renderOrder={2} />
      <instancedMesh ref={glowRef} args={[res.flatGeo, res.glowMat, res.n]} frustumCulled={false} renderOrder={3} />
      <instancedMesh ref={lightRef} args={[res.flatGeo, res.lightMat, res.n]} frustumCulled={false} renderOrder={4} />
      <instancedMesh ref={trunkRef} args={[res.trunkGeo, res.barkMat, d.trunks.length]} castShadow frustumCulled={false} />
      <instancedMesh ref={crownRef} args={[res.crownGeo, res.leafMat, d.crowns.length]} castShadow receiveShadow frustumCulled={false} />
      <instancedMesh ref={palmTrunkRef} args={[res.trunkGeo, res.barkMat, d.palmTrunks.length]} castShadow frustumCulled={false} />
      <instancedMesh ref={palmRef} args={[res.palmGeo, res.palmMat, d.palms.length]} castShadow frustumCulled={false} />
      <instancedMesh ref={shrubRef} args={[res.crownGeo, res.shrubMat, Math.max(1, d.shrubs.length)]} castShadow frustumCulled={false} />
      <instancedMesh ref={wallRef} args={[res.wallGeo, res.wallMat, d.houses.length]} castShadow frustumCulled={false} />
      <instancedMesh ref={roofRef} args={[res.roofGeo, res.roofMat, d.houses.length]} castShadow frustumCulled={false} />
      {flames.map((p, i) => (
        <primitive key={`f${i}`} object={p.sprite} />
      ))}
      {smoke.map((p, i) => (
        <primitive key={`s${i}`} object={p.sprite} />
      ))}
      <mesh ref={ringRef} geometry={res.ringGeo} material={res.ringMat} position={[ix, TILE_H + 0.02, iz]} visible={false} renderOrder={5} />
      {act === 1 && day === 0 && (
        <group position={[ix, TILE_H + 0.12, iz]}>
          <Html center zIndexRange={[10, 0]}>
            <span className={`${pill} inline-block -translate-y-4 bg-[#ff6f1c]/85 text-white`}>{FORENSIK_TEXT.ignitionMark}</span>
          </Html>
        </group>
      )}
      {LABELS.map((l) => {
        const [lx, lz] = cellCenter(l.x, l.y);
        return (
          <group key={l.part} position={[lx, TILE_H + 0.16, lz]}>
            <Html center zIndexRange={[10, 0]}>
              <span className={pill}>{l.part === "kanal" ? "Kanal" : LAND_LABEL[l.part]}</span>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

/**
 * Dinding bongkahan di bawah peta: empat lapisan gambut dengan tekstur yang
 * sama seperti bongkahan Modul Anatomi, sehingga peta tampak sebagai
 * sepotong lahan yang diangkat dari tanah, bukan papan datar.
 */
function PeatWalls() {
  const maps = useTexture(WALL_LAYERS.map((l) => `/textures/gambut/${l.id}_color.webp`));
  const layers = useMemo(() => {
    let top = 0;
    return WALL_LAYERS.map((l, i) => {
      const tex = maps[i].clone();
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.repeat.set(BLOCK_W / 1.1, l.h / 1.1);
      tex.needsUpdate = true;
      const [r, g, b] = PEAT_LAYER_TINT[l.id];
      const mat = new THREE.MeshStandardMaterial({ map: tex, color: new THREE.Color(r, g, b), roughness: 0.95 });
      const geo = new THREE.BoxGeometry(BLOCK_W, l.h, BLOCK_D);
      const y = top - l.h / 2;
      top -= l.h;
      return { id: l.id, tex, mat, geo, y };
    });
  }, [maps]);
  useEffect(
    () => () =>
      layers.forEach((l) => {
        l.tex.dispose();
        l.mat.dispose();
        l.geo.dispose();
      }),
    [layers],
  );
  return (
    <>
      {layers.map((l) => (
        <mesh key={l.id} geometry={l.geo} material={l.mat} position={[0, l.y - 0.001, 0]} castShadow receiveShadow />
      ))}
    </>
  );
}
