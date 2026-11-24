"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, useTexture } from "@react-three/drei";
import { CASE_IGNITION, GRID_H, GRID_W, isCanal, landAt, type Land } from "@/lib/model/ignition";
import { CASE_FIRE, FORENSIK_TEXT, LAND_LABEL, type InspectPart } from "@/config/modul/forensik-api";
import type { SceneState } from "@/components/modul/anatomi/scene/sceneState";
import { createSmokeTexture } from "@/components/modul/shared/scene/proceduralTextures";
import { PEAT_LAYER_TINT, type Quality } from "@/components/modul/shared/scene/dioramaConstants";
import { burnsAt, cellIndex, fireAt, type CellFire } from "../fireView";
import type { BurnAnim, MapPicker } from "./ForensikScene";

// Babak 02 dan 03: lanskap gambut dari atas, satu kotak = 1 km², sebesar
// satu titik api satelit. Tata letaknya dari lib/model/ignition.ts (ilustratif:
// sungai dan kampung di kiri, kebun sawit kiri bawah, lahan terbuka berkanal
// di tengah, hutan di kanan). Api digambar per kotak, seperti satelit
// melihatnya: kotak panas berpijar, kotak yang sudah padam menghitam.

/** Sisi satu kotak di adegan (m). Peta 24 × 16 kotak menjadi 6 × 4 m. */
const S = 0.25;

/** Tebal kotak daratan dan tinggi permukaan sungai (m). */
const TILE_H = 0.1;
const RIVER_TOP = 0.035;

/** Celah antarkotak, supaya peta terbaca sebagai kisi titik api satelit. */
const GAP = 0.014;

const LAND_COLOR: Record<Land, string> = {
  terbuka: "#a08d5c",
  kebun: "#71893f",
  hutan: "#2f5733",
  kampung: "#8f877b",
  sungai: "#2b5670",
};

/** Warna kotak yang masih panas dan kotak bekas terbakar. */
const HOT_COLOR = "#ff6f1c";
const SCAR_COLOR = "#17130f";

/** Warna sorotan bagian yang diklik. */
const HIGHLIGHT_COLOR = "#ffffff";

/** Jumlah gumpal asap di atas kotak yang panas, menurut mutu grafis. */
const SMOKE = { high: 36, low: 16 } as const;

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

/** Lebar dan dalam bongkahan (m): sedikit lebih besar dari peta, menjadi bingkai tanah. */
const BLOCK_W = GRID_W * S + 0.06;
const BLOCK_D = GRID_H * S + 0.06;

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

const topOf = (land: Land) => (land === "sungai" ? RIVER_TOP : TILE_H);

/** Bilangan semu 0–1 yang tetap untuk masukan yang sama. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Satu hiasan di atas petak: letak, skala, dan petak induknya (untuk menghitamkannya bila terbakar). */
type Deco = { x: number; y: number; z: number; sx: number; sy: number; sz: number; rot: number; cell: number };

/** Hiasan tiap jenis lahan: tajuk pohon, tajuk sawit, rumah, dan semak. */
function buildDecor() {
  const trees: Deco[] = [];
  const palms: Deco[] = [];
  const houses: Deco[] = [];
  const shrubs: Deco[] = [];
  for (let y = 0; y < GRID_H; y++)
    for (let x = 0; x < GRID_W; x++) {
      const land = landAt(x, y);
      const [cx, cz] = cellCenter(x, y);
      const cell = cellIndex(x, y);
      const h = (k: number) => hash(cell * 13.1 + k);
      if (land === "hutan") {
        // Tiga sampai empat tajuk berdesakan: hutan terlihat rapat dari atas.
        const n = 3 + (h(1) > 0.5 ? 1 : 0);
        for (let i = 0; i < n; i++) {
          const r = 0.055 + h(i + 2) * 0.03;
          trees.push({
            x: cx + (h(i + 10) - 0.5) * S * 0.62,
            y: TILE_H + r * 0.75,
            z: cz + (h(i + 20) - 0.5) * S * 0.62,
            sx: r,
            sy: r * (0.85 + h(i + 30) * 0.3),
            sz: r,
            rot: h(i + 40) * 6.28,
            cell,
          });
        }
      } else if (land === "kebun") {
        // Sawit ditanam berbaris: empat tajuk rapi per kotak.
        for (const [ox, oz] of [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ])
          palms.push({ x: cx + ox * S * 0.22, y: TILE_H + 0.035, z: cz + oz * S * 0.22, sx: 0.045, sy: 0.022, sz: 0.045, rot: h(ox + oz * 3) * 6.28, cell });
      } else if (land === "kampung") {
        for (let i = 0; i < 3; i++)
          houses.push({
            x: cx + (h(i + 50) - 0.5) * S * 0.5,
            y: TILE_H,
            z: cz + (i - 1) * S * 0.28,
            sx: 1,
            sy: 1,
            sz: 1,
            rot: (h(i + 60) - 0.5) * 0.5,
            cell,
          });
      } else if (land === "terbuka" && !isCanal(x, y)) {
        // Lahan terbuka: pakis dan semak jarang di atas gambut gundul.
        const n = Math.floor(h(70) * 3);
        for (let i = 0; i < n; i++) {
          const r = 0.018 + h(i + 80) * 0.018;
          shrubs.push({ x: cx + (h(i + 90) - 0.5) * S * 0.7, y: TILE_H + r * 0.4, z: cz + (h(i + 100) - 0.5) * S * 0.7, sx: r, sy: r * 0.6, sz: r, rot: 0, cell });
        }
      }
    }
  return { trees, palms, houses, shrubs };
}

/** Tulis letak hiasan ke `InstancedMesh`; hiasan di petak terbakar dikecilkan. */
function writeDecor(mesh: THREE.InstancedMesh, list: readonly Deco[], fire: ReadonlyMap<number, CellFire>, shrinkBurnt: number, colors: [THREE.Color, THREE.Color], m4: THREE.Matrix4, q: THREE.Quaternion, v: THREE.Vector3, sc: THREE.Vector3, up: THREE.Vector3) {
  list.forEach((d, i) => {
    const burnt = fire.has(d.cell);
    const k = burnt ? shrinkBurnt : 1;
    q.setFromAxisAngle(up, d.rot);
    v.set(d.x, burnt ? TILE_H + (d.y - TILE_H) * k : d.y, d.z);
    sc.set(d.sx * k, d.sy * k, d.sz * k);
    m4.compose(v, q, sc);
    mesh.setMatrixAt(i, m4);
    mesh.setColorAt(i, burnt ? colors[1] : colors[0]);
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

  const res = useMemo(() => {
    const n = GRID_W * GRID_H;
    const decor = buildDecor();
    const tileGeo = new THREE.BoxGeometry(S - GAP, 1, S - GAP);
    tileGeo.translate(0, 0.5, 0);
    const tileMat = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0 });
    const flatGeo = new THREE.PlaneGeometry(S - GAP, S - GAP);
    flatGeo.rotateX(-Math.PI / 2);
    // Campuran biasa, bukan tambahan: di atas tanah terang, campuran tambahan
    // membuat jingga memucat menjadi kuning.
    const hotMat = new THREE.MeshBasicMaterial({ color: HOT_COLOR, transparent: true, opacity: 0.95, toneMapped: false, depthWrite: false });
    const scarMat = new THREE.MeshStandardMaterial({ color: SCAR_COLOR, roughness: 1, transparent: true, opacity: 0.88, depthWrite: false });
    const lightMat = new THREE.MeshBasicMaterial({ color: HIGHLIGHT_COLOR, transparent: true, opacity: 0, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending });
    const crownGeo = new THREE.IcosahedronGeometry(1, 1);
    const treeMat = new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true });
    const palmMat = new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true });
    const shrubMat = new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true });
    const wallGeo = new THREE.BoxGeometry(0.06, 0.035, 0.045);
    wallGeo.translate(0, 0.0175, 0);
    const roofGeo = new THREE.ConeGeometry(0.048, 0.03, 4);
    roofGeo.rotateY(Math.PI / 4);
    roofGeo.translate(0, 0.05, 0);
    const wallMat = new THREE.MeshStandardMaterial({ color: "#d8cdbb", roughness: 0.8 });
    const roofMat = new THREE.MeshStandardMaterial({ color: "#8c4a30", roughness: 0.7 });
    // Kanal: garis air gelap lurus yang membelah lahan terbuka.
    const canalCells = Array.from({ length: n }, (_, i) => cellOf(i)).filter((c) => isCanal(c.x, c.y));
    const [x0, z0] = cellCenter(canalCells[0].x, canalCells[0].y);
    const [x1] = cellCenter(canalCells[canalCells.length - 1].x, canalCells[0].y);
    const canalGeo = new THREE.PlaneGeometry(x1 - x0 + S, S * 0.2);
    canalGeo.rotateX(-Math.PI / 2);
    canalGeo.translate((x0 + x1) / 2, TILE_H + 0.003, z0);
    const canalMat = new THREE.MeshStandardMaterial({ color: "#1d3a46", roughness: 0.2, metalness: 0.1 });
    const ringGeo = new THREE.RingGeometry(0.75, 1, 48);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: "#ffd9a8", transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
    const smokeTex = createSmokeTexture();
    return {
      n,
      decor,
      tileGeo,
      tileMat,
      flatGeo,
      hotMat,
      scarMat,
      lightMat,
      crownGeo,
      treeMat,
      palmMat,
      shrubMat,
      wallGeo,
      roofGeo,
      wallMat,
      roofMat,
      canalGeo,
      canalMat,
      ringGeo,
      ringMat,
      smokeTex,
    };
  }, []);
  useEffect(
    () => () => {
      for (const v of Object.values(res)) if (v && typeof (v as { dispose?: () => void }).dispose === "function") (v as { dispose: () => void }).dispose();
    },
    [res],
  );

  const hotRef = useRef<THREE.InstancedMesh>(null);
  const scarRef = useRef<THREE.InstancedMesh>(null);
  const lightRef = useRef<THREE.InstancedMesh>(null);
  const treeRef = useRef<THREE.InstancedMesh>(null);
  const palmRef = useRef<THREE.InstancedMesh>(null);
  const shrubRef = useRef<THREE.InstancedMesh>(null);
  const wallRef = useRef<THREE.InstancedMesh>(null);
  const roofRef = useRef<THREE.InstancedMesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const smokeCount = SMOKE[quality];
  const smoke = useMemo(
    () =>
      Array.from({ length: smokeCount }, (_, i) => {
        const mat = new THREE.SpriteMaterial({ map: res.smokeTex, color: "#8f857c", transparent: true, opacity: 0, depthWrite: false });
        return { sprite: new THREE.Sprite(mat), mat, seed: hash(i * 4.3), cell: -1 };
      }),
    [res, smokeCount],
  );
  useEffect(() => () => smoke.forEach((p) => p.mat.dispose()), [smoke]);

  // Kotak daratan dan rumah tidak pernah berubah: ditulis sekali.
  useEffect(() => {
    const tiles = tilesRef.current;
    if (!tiles) return;
    const m4 = new THREE.Matrix4();
    const c = new THREE.Color();
    for (let i = 0; i < res.n; i++) {
      const { x, y } = cellOf(i);
      const land = landAt(x, y);
      const [cx, cz] = cellCenter(x, y);
      m4.makeScale(1, topOf(land), 1).setPosition(cx, 0, cz);
      tiles.setMatrixAt(i, m4);
      // Sedikit beda rona tiap kotak supaya lahan tidak tampak seperti cat rata.
      c.set(LAND_COLOR[land]).multiplyScalar(0.9 + hash(i * 2.7) * 0.2);
      tiles.setColorAt(i, c);
    }
    tiles.instanceMatrix.needsUpdate = true;
    if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;
    tiles.computeBoundingSphere();
    pickRef.current = { camera, tiles };
    const walls = wallRef.current;
    const roofs = roofRef.current;
    if (walls && roofs) {
      const q = new THREE.Quaternion();
      const up = new THREE.Vector3(0, 1, 0);
      res.decor.houses.forEach((d, i) => {
        q.setFromAxisAngle(up, d.rot);
        m4.compose(new THREE.Vector3(d.x, d.y, d.z), q, new THREE.Vector3(1, 1, 1));
        walls.setMatrixAt(i, m4);
        roofs.setMatrixAt(i, m4);
      });
      walls.instanceMatrix.needsUpdate = true;
      roofs.instanceMatrix.needsUpdate = true;
    }
    return () => {
      pickRef.current = null;
    };
  }, [res, camera, pickRef]);

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
        m4.makeTranslation(cx, topOf(landAt(x, y)) + 0.012, cz);
        light.setMatrixAt(k++, m4);
      }
    light.count = k;
    light.instanceMatrix.needsUpdate = true;
  }, [highlight, res]);

  // Keadaan api per petak: ditulis ulang hanya bila berubah. Pada babak 02
  // berubah saat waktu diputar; pada babak 03 berubah selama api dianimasikan.
  const lastKey = useRef("");
  const tmp = useMemo(
    () => ({ m4: new THREE.Matrix4(), q: new THREE.Quaternion(), v: new THREE.Vector3(), sc: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) }),
    [],
  );
  const decorColors = useMemo(
    () => ({
      tree: [new THREE.Color("#2e6b34"), new THREE.Color("#2a2420")] as [THREE.Color, THREE.Color],
      palm: [new THREE.Color("#8fb04a"), new THREE.Color("#2a2420")] as [THREE.Color, THREE.Color],
      shrub: [new THREE.Color("#7c7a3c"), new THREE.Color("#2a2420")] as [THREE.Color, THREE.Color],
    }),
    [],
  );
  const hotCells = useRef<number[]>([]);

  useFrame((state, delta) => {
    const s = stateRef.current;
    const g = groupRef.current;
    if (!s || !g) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, s.rotation, reducedMotion ? 30 : 10, dt);

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
      const scar = scarRef.current;
      if (hot && scar) {
        let nh = 0;
        let ns = 0;
        const hc: number[] = [];
        for (const [i, v] of fire) {
          const { x, y } = cellOf(i);
          const [cx, cz] = cellCenter(x, y);
          tmp.m4.makeTranslation(cx, topOf(landAt(x, y)) + 0.006, cz);
          if (v === "hot") {
            hot.setMatrixAt(nh++, tmp.m4);
            hc.push(i);
          } else scar.setMatrixAt(ns++, tmp.m4);
        }
        hot.count = nh;
        scar.count = ns;
        hot.instanceMatrix.needsUpdate = true;
        scar.instanceMatrix.needsUpdate = true;
        hotCells.current = hc;
      }
      if (treeRef.current) writeDecor(treeRef.current, res.decor.trees, fire, 0.55, decorColors.tree, tmp.m4, tmp.q, tmp.v, tmp.sc, tmp.up);
      if (palmRef.current) writeDecor(palmRef.current, res.decor.palms, fire, 0.6, decorColors.palm, tmp.m4, tmp.q, tmp.v, tmp.sc, tmp.up);
      if (shrubRef.current) writeDecor(shrubRef.current, res.decor.shrubs, fire, 0.01, decorColors.shrub, tmp.m4, tmp.q, tmp.v, tmp.sc, tmp.up);
    }

    // 2 · Pijar kotak panas berdenyut seperti api yang hidup.
    res.hotMat.opacity = reducedMotion ? 0.95 : 0.85 + 0.12 * Math.sin(t * 6.5) * Math.sin(t * 2.3 + 1);

    // 3 · Asap naik dari kotak-kotak yang masih panas, dibagi bergiliran.
    const hc = hotCells.current;
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
      p.sprite.position.set(cx + (p.seed - 0.5) * S * 0.5 + a * 0.25, TILE_H + 0.05 + a * 0.9, cz + (hash(i) - 0.5) * S * 0.5);
      p.sprite.scale.setScalar(0.12 + a * 0.4);
      p.mat.opacity = Math.sin(Math.PI * a) * 0.38;
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

  return (
    <group ref={groupRef}>
      <PeatWalls />
      <instancedMesh ref={tilesRef} args={[res.tileGeo, res.tileMat, res.n]} castShadow receiveShadow />
      <mesh geometry={res.canalGeo} material={res.canalMat} receiveShadow />
      <instancedMesh ref={scarRef} args={[res.flatGeo, res.scarMat, res.n]} frustumCulled={false} />
      <instancedMesh ref={hotRef} args={[res.flatGeo, res.hotMat, res.n]} frustumCulled={false} renderOrder={2} />
      <instancedMesh ref={lightRef} args={[res.flatGeo, res.lightMat, res.n]} frustumCulled={false} renderOrder={3} />
      <instancedMesh ref={treeRef} args={[res.crownGeo, res.treeMat, res.decor.trees.length]} castShadow frustumCulled={false} />
      <instancedMesh ref={palmRef} args={[res.crownGeo, res.palmMat, res.decor.palms.length]} castShadow frustumCulled={false} />
      <instancedMesh ref={shrubRef} args={[res.crownGeo, res.shrubMat, Math.max(1, res.decor.shrubs.length)]} frustumCulled={false} />
      <instancedMesh ref={wallRef} args={[res.wallGeo, res.wallMat, res.decor.houses.length]} castShadow frustumCulled={false} />
      <instancedMesh ref={roofRef} args={[res.roofGeo, res.roofMat, res.decor.houses.length]} castShadow frustumCulled={false} />
      {smoke.map((p, i) => (
        <primitive key={i} object={p.sprite} />
      ))}
      <mesh ref={ringRef} geometry={res.ringGeo} material={res.ringMat} position={[ix, TILE_H + 0.02, iz]} visible={false} renderOrder={4} />
      {act === 1 && day === 0 && (
        <group position={[ix, TILE_H + 0.12, iz]}>
          <Html center zIndexRange={[10, 0]}>
            <span className={`${pill} -translate-y-4 inline-block bg-[#ff6f1c]/85 text-white`}>{FORENSIK_TEXT.ignitionMark}</span>
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
