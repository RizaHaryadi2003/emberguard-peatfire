"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { getSurfaceDryness } from "@/lib/peat";
import { createPuddleTexture } from "@/components/gambut/scene/proceduralTextures";
import { seeded } from "@/lib/random";
import { createSurfaceGeometry, isInsideFootprint } from "@/components/gambut/scene/terrain";
import type { SceneState } from "./sceneState";

// Permukaan hutan rawa gambut di atas balok. Semua tumbuhan adalah model 3D
// hasil pindaian (fotogrametri) dari Poly Haven, CC0 — lihat
// public/models/gambut/SUMBER.md. Warnanya meranggas saat muka air turun.

const MODELS = {
  tree: "/models/gambut/pohon_pachira.glb",
  fern: "/models/gambut/pakis.glb",
  calathea: "/models/gambut/calathea.glb",
  anthurium: "/models/gambut/anthurium.glb",
};

/** Ambil semua mesh di model, dikelompokkan per varian, dengan posisi dinolkan. */
function collectVariants(root: THREE.Object3D, groupBy: (name: string) => string) {
  const variants = new Map<string, THREE.Group>();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!(o as THREE.Mesh).isMesh) return;
    const mesh = o as THREE.Mesh;
    const key = groupBy(mesh.name);
    let group = variants.get(key);
    if (!group) {
      group = new THREE.Group();
      variants.set(key, group);
    }
    // Setiap varian di berkas asli diletakkan berjajar; kembalikan ke titik asal.
    const clone = mesh.clone();
    clone.position.set(0, 0, 0);
    clone.castShadow = true;
    clone.receiveShadow = true;
    group.add(clone);
  });
  return [...variants.values()];
}

/** Letak tetap pohon: [x, z, tinggi target (m), rotasi]. */
const TREE_SPOTS: [number, number, number, number][] = [
  [-1.45, -0.55, 2.6, 0.3],
  [0.55, -0.7, 2.2, 2.1],
  [1.55, 0.35, 1.8, 4.2],
  [-0.4, 0.55, 1.5, 1.2],
];

/** Letak tetap tumbuhan bawah: [x, z, jenis, tinggi target (m)]. */
const UNDERSTORY_SPOTS: [number, number, "fern" | "calathea" | "anthurium", number][] = [
  [-1.8, 0.7, "fern", 0.75],
  [-0.9, -0.1, "fern", 0.6],
  [0.2, 0.2, "calathea", 0.55],
  [1.05, -0.2, "fern", 0.7],
  [1.9, -0.8, "anthurium", 0.55],
  [-1.95, -0.85, "calathea", 0.5],
  [0.95, 0.9, "fern", 0.55],
  [-0.2, -0.95, "anthurium", 0.5],
  [1.85, 0.95, "calathea", 0.45],
  [-1.1, 0.95, "anthurium", 0.45],
  [-0.55, 0.15, "fern", 0.5],
  [0.35, 0.95, "fern", 0.6],
  [1.45, -0.95, "fern", 0.55],
  [-1.5, 0.1, "calathea", 0.4],
  [0.9, 0.35, "calathea", 0.4],
  [-0.95, -0.9, "fern", 0.55],
  [1.95, 0.25, "fern", 0.5],
  [-2.0, 0.05, "fern", 0.5],
  [0.05, -0.45, "calathea", 0.35],
  [-0.35, 1.05, "calathea", 0.35],
];

function heightOf(obj: THREE.Object3D) {
  return new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3()).y;
}

type Props = { stateRef: RefObject<SceneState> };

export default function Vegetation({ stateRef }: Props) {
  const [treeG, fernG, calatheaG, anthuriumG] = useLoader(GLTFLoader, [
    MODELS.tree,
    MODELS.fern,
    MODELS.calathea,
    MODELS.anthurium,
  ]);
  const [groundWet, groundWetN, groundDry, groundDryN] = useLoader(THREE.TextureLoader, [
    "/textures/gambut/permukaan_color.webp",
    "/textures/gambut/permukaan_normal.webp",
    "/textures/gambut/permukaan_kering_color.webp",
    "/textures/gambut/permukaan_kering_normal.webp",
  ]);

  const res = useMemo(() => {
    for (const t of [groundWet, groundDry]) t.colorSpace = THREE.SRGBColorSpace;
    for (const t of [groundWet, groundWetN, groundDry, groundDryN]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      // UV bidang permukaan dalam meter, jadi pengulangan dihitung per meter.
      t.repeat.set(0.55, 0.55);
      t.anisotropy = 8;
    }
    const puddleAlpha = createPuddleTexture();

    // Pohon: kulit batang & daun satu varian dikelompokkan (akhiran huruf _c, _d).
    const trees = collectVariants(treeG.scene, (n) => n.slice(-1));
    const byName = (n: string) => n;
    const understory = {
      fern: collectVariants(fernG.scene, byName),
      calathea: collectVariants(calatheaG.scene, byName),
      anthurium: collectVariants(anthuriumG.scene, byName),
    };

    // Catat warna asli setiap material agar bisa diberi rona kering lalu dikembalikan.
    const plantMaterials = new Map<THREE.MeshStandardMaterial, THREE.Color>();
    for (const scene of [treeG.scene, fernG.scene, calatheaG.scene, anthuriumG.scene]) {
      scene.traverse((o) => {
        const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (mat?.color && !plantMaterials.has(mat)) plantMaterials.set(mat, mat.color.clone());
      });
    }

    return {
      puddleAlpha,
      surfaceGeo: createSurfaceGeometry(),
      trees,
      understory,
      plantMaterials,
      groundWetMat: new THREE.MeshStandardMaterial({ map: groundWet, normalMap: groundWetN, roughness: 0.9, color: "#b9c2a4" }),
      groundDryMat: new THREE.MeshStandardMaterial({
        map: groundDry,
        normalMap: groundDryN,
        roughness: 1,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
      puddleMat: new THREE.MeshPhysicalMaterial({
        color: "#101614",
        roughness: 0.04,
        metalness: 0,
        transparent: true,
        opacity: 0,
        alphaMap: puddleAlpha,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    };
  }, [treeG, fernG, calatheaG, anthuriumG, groundWet, groundWetN, groundDry, groundDryN]);

  useEffect(
    () => () => {
      res.puddleAlpha.dispose();
      res.surfaceGeo.dispose();
      res.groundWetMat.dispose();
      res.groundDryMat.dispose();
      res.puddleMat.dispose();
      // Model di-cache oleh pemuat; kembalikan warna aslinya untuk kunjungan berikutnya.
      res.plantMaterials.forEach((base, mat) => mat.color.copy(base));
    },
    [res],
  );

  // Susun pohon & tumbuhan bawah sebagai salinan model (geometri & material dipakai bersama).
  const placed = useMemo(() => {
    const rand = seeded(11);
    const sorted = [...res.trees].sort((a, b) => heightOf(b) - heightOf(a));
    // Hanya titik yang berada di dalam tapak bongkahan yang dipakai.
    const trees = TREE_SPOTS.filter(([x, z]) => isInsideFootprint(x, z, 0.25)).map(([x, z, h, ry], i) => {
      const template = sorted[i % sorted.length];
      const obj = template.clone();
      obj.scale.setScalar(h / Math.max(heightOf(template), 0.01));
      obj.position.set(x, 0, z);
      obj.rotation.y = ry;
      return obj;
    });
    const understory = UNDERSTORY_SPOTS.filter(([x, z]) => isInsideFootprint(x, z, 0.15)).map(([x, z, kind, h]) => {
      const list = res.understory[kind];
      const template = list[Math.floor(rand() * list.length)];
      const obj = template.clone();
      obj.scale.setScalar((h * (0.8 + rand() * 0.4)) / Math.max(heightOf(template), 0.01));
      obj.position.set(x, 0, z);
      obj.rotation.y = rand() * Math.PI * 2;
      return obj;
    });
    return { trees, understory };
  }, [res]);

  // Rona kering: tumbuhan menguning-kecoklatan mengikuti kekeringan permukaan.
  const straw = useMemo(() => new THREE.Color("#a07a3e"), []);
  const anim = useRef({ dryness: 0, last: -1 });
  const treesRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const s = stateRef.current;
    if (!s) return;
    const a = anim.current;
    a.dryness = THREE.MathUtils.damp(a.dryness, getSurfaceDryness(s.waterCm), s.reducedMotion ? 30 : 2, Math.min(delta, 0.05));

    res.groundDryMat.opacity = a.dryness;
    // Genangan muncul bila muka air sangat dekat permukaan (< 10 cm).
    res.puddleMat.opacity = THREE.MathUtils.clamp(1 - s.waterCm / 10, 0, 1) * 0.85;

    // Warna material hanya diperbarui bila kekeringan berubah.
    if (Math.abs(a.dryness - a.last) > 0.003) {
      a.last = a.dryness;
      const k = Math.min(0.9, a.dryness * 0.8 + s.danger * 0.2);
      res.plantMaterials.forEach((base, mat) => mat.color.copy(base).lerp(straw, k));
    }

    // Pohon bergoyang sangat halus tertiup angin (satu rotasi per pohon, murah).
    const trees = treesRef.current;
    if (trees && !s.reducedMotion) {
      const t = state.clock.elapsedTime;
      trees.children.forEach((tree, i) => {
        tree.rotation.z = Math.sin(t * 0.8 + i * 1.7) * 0.012;
        tree.rotation.x = Math.cos(t * 0.6 + i) * 0.01;
      });
    }
  });

  return (
    <group>
      {/* Lantai hutan: lembap (dasar) dan kering (lapisan atas yang memudar masuk) */}
      <mesh geometry={res.surfaceGeo} position-y={0.004} material={res.groundWetMat} receiveShadow />
      <mesh geometry={res.surfaceGeo} position-y={0.005} material={res.groundDryMat} receiveShadow />
      <mesh geometry={res.surfaceGeo} position-y={0.007} material={res.puddleMat} />

      <group ref={treesRef}>
        {placed.trees.map((obj) => (
          <primitive key={obj.uuid} object={obj} />
        ))}
      </group>
      {placed.understory.map((obj) => (
        <primitive key={obj.uuid} object={obj} />
      ))}
    </group>
  );
}
