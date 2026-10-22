"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useLoader, useThree, type ThreeEvent } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PEAT_LAYERS, PEAT_THICKNESS, type PeatLayerId } from "@/lib/peat";
import { createEmberTexture } from "@/components/gambut/scene/proceduralTextures";
import { seeded } from "@/lib/random";
import { createRibbon, createSlab, interfaceY, updateRibbon, updateSlab, wallPoint } from "@/components/gambut/scene/terrain";
import { PEAT_LAYER_TINT, WET_DARKEN } from "@/components/gambut/scene/dioramaConstants";
import { EXPLODE_GAP, EXPLODE_STEP, type SceneState } from "./sceneState";

/** Seberapa jauh lapisan terpilih maju ke arah kamera, dan lapisan lain mundur (m). */
const FOCUS_FORWARD = 1.0;
const RECEDE_BACK = 0.45;

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Koordinat kolom gambut saat timbunannya belum penuh.
 *
 * Seluruh kolom gambut turun sebanyak kekurangan tebalnya, sehingga
 * permukaannya duduk tepat di atas timbunan yang sudah ada. Turunnya seragam
 * untuk semua titik, jadi geometri lapisan dibentuk pada kedalaman nominalnya
 * lalu digeser lewat posisi grup lapisan — bukan dihitung ulang titik demi
 * titik setiap bingkai.
 *
 * Yang benar-benar berubah bentuk hanyalah satu lapisan terbawah yang sedang
 * tumbuh: dasarnya tetap menempel pada tanah mineral sementara punggungnya
 * naik, jadi ia menebal, bukan turun. Tiga keadaan itu dibedakan di sini.
 */
const LAYER_ABSENT = -1;
const LAYER_GROWING = 1;
const LAYER_FULL = 0;

/** Selisih ketinggian terbesar yang mungkin ditimbulkan gelombang batas lapisan (m). */
const INTERFACE_WOBBLE = 0.15;

type Props = {
  stateRef: RefObject<SceneState>;
  onHoverLayer: (id: PeatLayerId | null) => void;
  onSelectLayer: (id: PeatLayerId | null) => void;
};

/** Salin mesh dari model glTF agar siap ditempatkan berulang (geometri & material dipakai bersama). */
function modelParts(root: THREE.Object3D) {
  const parts: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const clone = m.clone();
    clone.position.set(0, 0, 0);
    clone.castShadow = true;
    clone.receiveShadow = true;
    parts.push(clone);
  });
  return parts;
}

function maxSize(obj: THREE.Object3D) {
  const s = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
  return Math.max(s.x, s.y, s.z);
}

/**
 * Bongkahan penampang gambut yang berbentuk alami. Tiap lapisan dipotong
 * oleh muka air tanah menjadi dua irisan: bagian kering (terang, kasar, bisa
 * berpijar bara) dan bagian basah (gelap, berkilap). Pada tahap "Lapis demi
 * lapis", lapisan yang diklik maju ke depan sementara lapisan lain mundur.
 */
export default function PeatBlock({ stateRef, onHoverLayer, onSelectLayer }: Props) {
  const urls = PEAT_LAYERS.flatMap((l) => [
    `/textures/gambut/${l.id}_color.webp`,
    `/textures/gambut/${l.id}_normal.webp`,
  ]);
  const textures = useLoader(THREE.TextureLoader, urls);
  const [branchG, stoneG] = useLoader(GLTFLoader, ["/models/gambut/ranting.glb", "/models/gambut/batu.glb"]);
  const emberTexture = useMemo(() => createEmberTexture(), []);
  const camera = useThree((s) => s.camera);

  const layers = useMemo(
    () =>
      PEAT_LAYERS.map((layer, i) => {
        const map = textures[i * 2];
        const normalMap = textures[i * 2 + 1];
        map.colorSpace = THREE.SRGBColorSpace;
        for (const t of [map, normalMap]) {
          t.wrapS = t.wrapT = THREE.RepeatWrapping;
          t.anisotropy = 8;
        }

        const tint = new THREE.Color(...PEAT_LAYER_TINT[layer.id]);
        const dry = new THREE.MeshStandardMaterial({
          map,
          normalMap,
          color: tint.clone(),
          roughness: 0.96,
          normalScale: new THREE.Vector2(1.4, 1.4),
        });
        // Hanya lapisan organik yang bisa berpijar; tanah mineral tidak terbakar.
        if (layer.combustible) {
          dry.emissive = new THREE.Color("#ff5a1f");
          dry.emissiveMap = emberTexture;
          dry.emissiveIntensity = 0;
        }
        const wet = new THREE.MeshStandardMaterial({
          map,
          normalMap,
          color: tint.clone().multiplyScalar(WET_DARKEN),
          roughness: 0.62,
          envMapIntensity: 0.45,
          normalScale: new THREE.Vector2(0.9, 0.9),
        });

        // Batas atas & bawah lapisan mengikuti gelombang batas antarlapisan.
        const topFn = (x: number, z: number) => interfaceY(layer.top, x, z);
        const bottomFn = (x: number, z: number) => interfaceY(layer.bottom, x, z);

        return { layer, tint, dry, wet, topFn, bottomFn, dryGeom: createSlab(), wetGeom: createSlab() };
      }),
    [textures, emberTexture],
  );

  // Detail tanah: akar/ranting mencuat dari dinding fibrik & hemik, kerikil di tanah mineral.
  const details = useMemo(() => {
    const rand = seeded(5);
    const branchParts = modelParts(branchG.scene);
    const stoneParts = modelParts(stoneG.scene);
    const byLayer: Record<PeatLayerId, THREE.Object3D[]> = { fibrik: [], hemik: [], saprik: [], mineral: [] };

    const placeOnWall = (template: THREE.Mesh, size: number, theta: number, y: number, inset: number) => {
      const inner = template.clone();
      // Sejajarkan sumbu terpanjang model dengan sumbu x lokal, lalu pusatkan.
      const box = new THREE.Box3().setFromObject(inner);
      const dims = box.getSize(new THREE.Vector3());
      if (dims.z > dims.x) inner.rotation.y = Math.PI / 2;
      if (dims.y > Math.max(dims.x, dims.z)) inner.rotation.z = Math.PI / 2;
      inner.updateMatrixWorld(true);
      const center = new THREE.Box3().setFromObject(inner).getCenter(new THREE.Vector3());
      inner.position.sub(center);

      const obj = new THREE.Group();
      obj.add(inner);
      obj.scale.setScalar(size / Math.max(maxSize(template), 0.01));
      obj.position.copy(wallPoint(theta, y, inset));
      // Sumbu x lokal diarahkan keluar dari dinding, dengan sedikit kemiringan acak.
      obj.rotation.set((rand() - 0.5) * 0.5, -theta + (rand() - 0.5) * 0.7, (rand() - 0.5) * 0.6);
      return obj;
    };

    for (let i = 0; i < 11; i++) {
      const theta = rand() * Math.PI * 2;
      const deep = rand() < 0.35;
      const y = deep ? -0.7 - rand() * 0.6 : -0.08 - rand() * 0.42;
      const part = branchParts[Math.floor(rand() * branchParts.length)];
      byLayer[deep ? "hemik" : "fibrik"].push(placeOnWall(part, 0.4 + rand() * 0.35, theta, y, 0.06));
    }
    for (let i = 0; i < 16; i++) {
      const theta = rand() * Math.PI * 2;
      const y = -2.9 - rand() * 0.4;
      byLayer.mineral.push(placeOnWall(stoneParts[0], 0.07 + rand() * 0.1, theta, y, 0.03));
    }
    return byLayer;
  }, [branchG, stoneG]);

  // Bebaskan memori GPU saat komponen dilepas.
  useEffect(
    () => () => {
      for (const l of layers) {
        l.dry.dispose();
        l.wet.dispose();
        l.dryGeom.dispose();
        l.wetGeom.dispose();
      }
      emberTexture.dispose();
    },
    [layers, emberTexture],
  );

  const groupRefs = useRef<(THREE.Group | null)[]>([]);
  // Akar, ranting, dan kerikil ditempelkan pada kedalaman tetap di dinding;
  // keduanya ikut turun sendiri bersama grup lapisannya, dan hanya perlu
  // disembunyikan selama lapisan itu belum terbentuk.
  const detailRefs = useRef<(THREE.Group | null)[]>([]);
  const dryMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const wetMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const rootRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const ring = useMemo(
    () => ({
      geom: createRibbon(),
      mat: new THREE.MeshBasicMaterial({
        color: "#8fd8ff",
        transparent: true,
        opacity: 0.9,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    }),
    [],
  );
  useEffect(
    () => () => {
      ring.geom.dispose();
      ring.mat.dispose();
    },
    [ring],
  );

  // Nilai yang dianimasikan menuju target secara halus.
  const anim = useRef({
    water: -1,
    lastRibbon: -999, // nilai mustahil agar pita pasti dibentuk pada bingkai pertama
    highlight: PEAT_LAYERS.map(() => 0),
    focus: PEAT_LAYERS.map(() => 0),
    recede: PEAT_LAYERS.map(() => 0),
  });

  /**
   * Catatan bentuk irisan yang terakhir kali dibuat, satu per lapisan.
   *
   * Membentuk ulang satu irisan berarti menghitung ribuan titik beserta
   * normalnya, dan sebelumnya kedelapan irisan dibentuk ulang bersamaan setiap
   * kali ada yang bergerak. Dengan catatan ini, irisan yang bentuknya tidak
   * berubah tidak disentuh: saat muka air digeser hanya lapisan yang dipotong
   * muka air yang dibentuk ulang, dan saat waktu digeser hanya lapisan yang
   * sedang tumbuh.
   */
  const built = useRef(
    PEAT_LAYERS.map(() => ({ mode: -2, water: Number.NaN, sunk: Number.NaN, dry: false, wet: false })),
  );
  const dir = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const s = stateRef.current;
    if (!s) return;
    const a = anim.current;
    const dt = Math.min(delta, 0.05);
    const fast = s.reducedMotion;
    const t = state.clock.elapsedTime;

    const targetWater = s.waterCm / 100;
    a.water = a.water < 0 ? targetWater : THREE.MathUtils.damp(a.water, targetWater, fast ? 30 : 3.2, dt);

    // Tebal timbunan sekarang (dihaluskan oleh adegan) dan selisihnya terhadap
    // profil penuh. Selisih ini nol pada tahap selain pertumbuhan.
    const peat = s.peat;
    const sunk = peat - PEAT_THICKNESS;

    // Muka air diukur dari permukaan timbunan, jadi di dalam koordinat kolom
    // gambut letaknya tidak bergantung pada umur. Yang ikut turun bersama
    // timbunan hanyalah letaknya di dalam diorama, yang dipakai oleh pita
    // garis muka air di dinding bongkahan.
    const waterLocal = -a.water;
    const w = sunk - a.water;

    // Arah menuju kamera dalam koordinat lokal diorama (yang ikut berputar).
    const parentRot = rootRef.current?.parent?.rotation.y ?? 0;
    dir.set(camera.position.x, 0, camera.position.z).normalize().applyAxisAngle(UP, -parentRot);

    const focusIdx = s.step === EXPLODE_STEP && s.focused ? PEAT_LAYERS.findIndex((l) => l.id === s.focused) : -1;

    layers.forEach((l, i) => {
      // Lapisan gambut mengikuti timbunan yang sudah terbentuk; tanah mineral
      // adalah dasar yang sudah ada sejak semula, jadi ia selalu utuh.
      const organic = l.layer.combustible;
      const mode = !organic
        ? LAYER_FULL
        : peat <= l.layer.top + 0.002
          ? LAYER_ABSENT
          : peat <= l.layer.bottom
            ? LAYER_GROWING
            : LAYER_FULL;
      const exists = mode !== LAYER_ABSENT;
      const b = built.current[i];

      // Muka air hanya mengubah bentuk irisan bila ia memotong lapisan ini.
      // Di luar rentang itu nilainya dijepit menjadi tetap, sehingga
      // menggesernya tidak membentuk ulang lapisan yang tidak terdampak.
      const clipped = Math.min(
        Math.max(waterLocal, -l.layer.bottom - INTERFACE_WOBBLE),
        -l.layer.top + INTERFACE_WOBBLE,
      );
      const rebuild =
        exists &&
        (mode !== b.mode ||
          Math.abs(clipped - b.water) > 1e-4 ||
          (mode === LAYER_GROWING && Math.abs(sunk - b.sunk) > 1e-4));

      if (rebuild) {
        b.mode = mode;
        b.water = clipped;
        b.sunk = sunk;
        const topFn = l.topFn;
        // Lapisan yang sedang tumbuh: dasarnya dijepit pada permukaan tanah
        // mineral — dengan gelombang milik tanah mineral, bukan gelombang
        // kedalaman lain — supaya keduanya selalu bertemu rapat tanpa celah.
        const bottomFn =
          mode === LAYER_GROWING
            ? (x: number, z: number) => interfaceY(PEAT_THICKNESS, x, z) - sunk
            : l.bottomFn;
        b.dry =
          updateSlab(l.dryGeom, (x, z) => Math.min(topFn(x, z), Math.max(bottomFn(x, z), waterLocal)), topFn) > 0.002;
        b.wet =
          updateSlab(l.wetGeom, bottomFn, (x, z) => Math.max(bottomFn(x, z), Math.min(topFn(x, z), waterLocal))) >
          0.002;
      }

      const dryMesh = dryMeshRefs.current[i];
      const wetMesh = wetMeshRefs.current[i];
      if (dryMesh) dryMesh.visible = exists && b.dry;
      if (wetMesh) wetMesh.visible = exists && b.wet;
      const detail = detailRefs.current[i];
      if (detail) detail.visible = exists;

      // Fokus lapisan: yang dipilih maju & sedikit membesar, sisanya mundur & meredup.
      a.focus[i] = THREE.MathUtils.damp(a.focus[i], i === focusIdx ? 1 : 0, fast ? 30 : 4, dt);
      a.recede[i] = THREE.MathUtils.damp(a.recede[i], focusIdx >= 0 && i !== focusIdx ? 1 : 0, fast ? 30 : 4, dt);
      const push = FOCUS_FORWARD * a.focus[i] - RECEDE_BACK * a.recede[i];

      // Tampilan terurai: lapisan dasar tetap, lapisan di atasnya terangkat
      // bertahap. Pada sumbu tegak inilah kolom gambut diturunkan sebanyak
      // kekurangan tebal timbunannya.
      const group = groupRefs.current[i];
      if (group) {
        group.position.set(
          dir.x * push,
          (layers.length - 1 - i) * EXPLODE_GAP * s.explode + (organic ? sunk : 0),
          dir.z * push,
        );
        group.scale.setScalar(1 + 0.04 * a.focus[i]);
      }

      // Sorotan lapisan: warna dicerahkan saat disorot, diredupkan saat mundur.
      a.highlight[i] = THREE.MathUtils.damp(a.highlight[i], s.hovered === l.layer.id ? 1 : 0, 8, dt);
      const boost = (1 + a.highlight[i] * 0.45) * (1 - a.recede[i] * 0.6);
      l.dry.color.copy(l.tint).multiplyScalar(boost);
      l.wet.color.copy(l.tint).multiplyScalar(WET_DARKEN * boost);

      // Pijar bara berdenyut pada gambut kering saat kondisi rawan.
      if (l.layer.combustible) {
        const flicker = fast ? 1 : 0.72 + 0.28 * Math.sin(t * 6.1 + i * 1.7) * Math.sin(t * 2.3 + i);
        l.dry.emissiveIntensity = s.danger * 2.4 * flicker;
      }
    });

    // Garis muka air tanah mengelilingi bongkahan; disembunyikan saat terurai,
    // dan juga selama belum ada gambut yang menahan airnya.
    if (ringRef.current) {
      if (Math.abs(w - a.lastRibbon) > 1e-4) {
        a.lastRibbon = w;
        updateRibbon(ring.geom, w);
      }
      ring.mat.opacity = 0.9 * (1 - s.explode) * Math.min(1, Math.max(0, peat / 0.25));
      ringRef.current.visible = ring.mat.opacity > 0.02;
    }
  });

  const handlers = (id: PeatLayerId) => ({
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      onHoverLayer(id);
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      onHoverLayer(null);
      document.body.style.cursor = "";
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      // Klik lapisan hanya bermakna saat lapisan sedang terurai.
      if (stateRef.current?.step !== EXPLODE_STEP) return;
      e.stopPropagation();
      onSelectLayer(stateRef.current.focused === id ? null : id);
    },
  });

  return (
    <group ref={rootRef}>
      {layers.map((l, i) => (
        <group key={l.layer.id} ref={(el) => void (groupRefs.current[i] = el)}>
          <mesh
            ref={(el) => void (dryMeshRefs.current[i] = el)}
            geometry={l.dryGeom}
            material={l.dry}
            castShadow
            receiveShadow
            {...handlers(l.layer.id)}
          />
          <mesh
            ref={(el) => void (wetMeshRefs.current[i] = el)}
            geometry={l.wetGeom}
            material={l.wet}
            castShadow
            receiveShadow
            {...handlers(l.layer.id)}
          />
          <group ref={(el) => void (detailRefs.current[i] = el)}>
            {details[l.layer.id].map((obj) => (
              <primitive key={obj.uuid} object={obj} />
            ))}
          </group>
        </group>
      ))}

      {/* Pita garis muka air tanah */}
      <mesh ref={ringRef} geometry={ring.geom} material={ring.mat} />
    </group>
  );
}
