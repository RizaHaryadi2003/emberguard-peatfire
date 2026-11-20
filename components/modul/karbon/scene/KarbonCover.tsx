"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { isInsideFootprint } from "@/components/modul/shared/scene/terrain";
import { createWallDetails } from "@/components/modul/shared/scene/wallDetails";
import { DIORAMA_TREE_SPOTS, DIORAMA_UNDERSTORY_SPOTS } from "@/components/modul/shared/scene/dioramaConstants";
import { seeded } from "@/lib/random";
import type { CarbonSim } from "@/lib/model/carbon";
import { surfaceRelief } from "./archive";
import { QUALITY_PROFILE, type KarbonState, type Quality } from "./karbonState";

// Hutan di atas bongkahan dan akar di dindingnya.
//
// Tumbuhan dan akar memakai model pindaian dan letak yang sama dengan Modul
// Anatomi dan Bara (Poly Haven, CC0 — lihat public/models/gambut/SUMBER.md),
// dikurangi yang berada pada separuh depan yang sudah dipotong.
//
// Gunanya bukan hiasan. Babak 03 membandingkan dua kecepatan pulih: hutan di
// atasnya tumbuh kembali dalam beberapa dasawarsa, gambut di bawahnya butuh
// berabad-abad. Tanpa tumbuhan, pembaca hanya melihat yang lambat; dengan
// tumbuhan, ia melihat hutannya sudah berdiri lagi di atas takik yang masih
// menganga — persis kalimat kartu penutup modul ini.

/** Tumbuhan pada separuh belakang tapak, tidak terlalu dekat bidang potong (m). */
const CUT_MARGIN = 0.2;

/**
 * Pohon dipendekkan: kamera modul ini ortografik dan harus memuat seluruh
 * tinggi bongkahan 3,4 m, jadi pohon setinggi aslinya akan memaksa gambarnya
 * mengecil hanya demi tajuk.
 */
const TREE_HEIGHT_SCALE = 0.62;

/**
 * Lama tumbuh kembali sesudah kebakaran (tahun): [mulai, penuh].
 *
 * Ilustratif, mengikuti pernyataan bahwa hutan di atas gambut pulih dalam
 * beberapa dasawarsa (kartu penutup modul ini). Tumbuhan bawah lebih dahulu,
 * pohon menyusul. Keduanya jauh lebih cepat daripada gambutnya: 1 mm setahun.
 */
const REGROW_YEARS = { understory: [2, 15], tree: [8, 60] } as const;

/** Kedalaman bakar yang sudah menghabiskan tumbuhan di atasnya (m). */
const BURNT_AT = 0.01;

/** Warna arang tumbuhan yang terbakar. */
const CHAR = new THREE.Color(0.035, 0.03, 0.027);

function heightOf(obj: THREE.Object3D) {
  return new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3()).y;
}

/** Kumpulkan mesh model menjadi ragam siap disalin, sama dengan Modul Bara. */
function collectVariants(root: THREE.Object3D, groupBy: (name: string) => string, castShadow: boolean) {
  const variants = new Map<string, THREE.Group>();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const key = groupBy(mesh.name);
    let group = variants.get(key);
    if (!group) {
      group = new THREE.Group();
      variants.set(key, group);
    }
    const clone = mesh.clone();
    clone.position.set(0, 0, 0);
    clone.castShadow = castShadow;
    clone.receiveShadow = true;
    group.add(clone);
  });
  return [...variants.values()];
}

type Plant = {
  object: THREE.Object3D;
  x: number;
  z: number;
  baseScale: number;
  kind: "tree" | "understory";
  materials: { mat: THREE.MeshStandardMaterial; base: THREE.Color }[];
  /** Nilai teranimasi: 1 = hidup penuh, 0 = habis. */
  life: number;
};

/** Kurva halus 0–1 antara a dan b. */
function ramp(v: number, a: number, b: number) {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

type Props = {
  sim: CarbonSim;
  stateRef: RefObject<KarbonState>;
  quality: Quality;
};

export default function KarbonCover({ sim, stateRef, quality }: Props) {
  const profile = QUALITY_PROFILE[quality];
  const [treeG, fernG, calatheaG, anthuriumG, branchG, stoneG] = useLoader(GLTFLoader, [
    "/models/gambut/pohon_pachira.glb",
    "/models/gambut/pakis.glb",
    "/models/gambut/calathea.glb",
    "/models/gambut/anthurium.glb",
    "/models/gambut/ranting.glb",
    "/models/gambut/batu.glb",
  ]);

  const plants = useMemo(() => {
    const rand = seeded(17);
    const trees = collectVariants(treeG.scene, (n) => n.slice(-1), true).sort((a, b) => heightOf(b) - heightOf(a));
    const understory = {
      fern: collectVariants(fernG.scene, (n) => n, false),
      calathea: collectVariants(calatheaG.scene, (n) => n, false),
      anthurium: collectVariants(anthuriumG.scene, (n) => n, false),
    };

    const make = (template: THREE.Object3D, x: number, z: number, height: number, ry: number, kind: Plant["kind"]): Plant => {
      const object = template.clone();
      const baseScale = height / Math.max(heightOf(template), 0.01);
      object.scale.setScalar(baseScale);
      object.position.set(x, 0, z);
      object.rotation.y = ry;
      const materials: Plant["materials"] = [];
      object.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
        mesh.material = mat;
        materials.push({ mat, base: mat.color.clone() });
      });
      return { object, x, z, baseScale, kind, materials, life: 1 };
    };

    const list: Plant[] = [];
    DIORAMA_TREE_SPOTS.filter(([x, z]) => z < -CUT_MARGIN && isInsideFootprint(x, z, 0.25)).forEach(([x, z, h, ry], i) => {
      list.push(make(trees[i % trees.length], x, z, h * TREE_HEIGHT_SCALE, ry, "tree"));
    });
    DIORAMA_UNDERSTORY_SPOTS.filter(([x, z]) => z < -CUT_MARGIN && isInsideFootprint(x, z, 0.15))
      .slice(0, profile.understory)
      .forEach(([x, z, kind, h]) => {
        const variants = understory[kind];
        const template = variants[Math.floor(rand() * variants.length)];
        list.push(make(template, x, z, h * (0.85 + rand() * 0.3), rand() * Math.PI * 2, "understory"));
      });
    return list;
  }, [treeG, fernG, calatheaG, anthuriumG, profile.understory]);

  // Akar dan kerikil di dinding: susunan yang sama dengan Modul Anatomi dan Bara.
  const roots = useMemo(
    () =>
      Object.values(createWallDetails(branchG.scene, stoneG.scene))
        .flat()
        .filter((obj) => obj.position.z < -0.15),
    [branchG, stoneG],
  );

  useEffect(() => () => plants.forEach((p) => p.materials.forEach(({ mat }) => mat.dispose())), [plants]);

  const tint = useMemo(() => new THREE.Color(), []);
  const lastGap = useRef(-1);

  useFrame((_, delta) => {
    const s = stateRef.current;
    if (!s) return;
    const dt = Math.min(delta, 0.05);
    const burn = s.drawnBurnM;
    const gap = Math.max(0, burn - s.drawnRegrownM);
    const burnt = s.burnDepthM > BURNT_AT;
    const years = sim.stats.years;

    for (const p of plants) {
      const [a, b] = REGROW_YEARS[p.kind];
      const want = burnt ? ramp(years, a, b) : 1;
      // Api memakan tumbuhan cepat; tumbuh kembali mengikuti tahunnya sendiri.
      const k = s.reducedMotion ? 30 : want < p.life ? 2.2 : 6;
      p.life = THREE.MathUtils.damp(p.life, want, k, dt);

      const visible = p.life > 0.02;
      p.object.visible = visible;
      if (!visible) continue;
      p.object.scale.setScalar(p.baseScale * (0.2 + 0.8 * p.life));
      p.object.position.y = surfaceRelief(p.x, p.z) - gap;

      // Menghitam hanya saat sedang terbakar; tunas yang tumbuh kembali hijau.
      const char = want < p.life ? 1 - p.life : 0;
      for (const { mat, base } of p.materials) {
        tint.copy(base).lerp(CHAR, Math.min(1, char * 1.6));
        if (!mat.color.equals(tint)) mat.color.copy(tint);
      }
    }

    // Akar di dinding ikut habis bersama gambut yang terbakar di sekitarnya.
    if (Math.abs(burn - lastGap.current) > 0.002) {
      lastGap.current = burn;
      for (const obj of roots) obj.visible = obj.position.y < -burn - 0.04;
    }
  });

  return (
    <group>
      {plants.map((p) => (
        <primitive key={p.object.uuid} object={p.object} />
      ))}
      {roots.map((obj) => (
        <primitive key={obj.uuid} object={obj} />
      ))}
    </group>
  );
}
