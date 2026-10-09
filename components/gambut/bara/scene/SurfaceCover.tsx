"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { isInsideFootprint } from "@/components/gambut/scene/terrain";
import { seeded } from "@/lib/random";
import { type SmolderSim } from "@/lib/smolder";
import {
  createSurfaceGrid,
  SURFACE_COLS,
  SURFACE_ROWS,
  surfaceYAt,
  updateSurfaceGrid,
} from "./crossSection";
import { BLOCK_WIDTH, DRAG_THRESHOLD, QUALITY_PROFILE, type BaraState, type Quality, type Subsidence } from "./baraState";

// Permukaan hutan rawa di atas bongkahan yang dipotong. Tumbuhan memakai model
// pindaian yang sama dengan Modul 01 (Poly Haven, CC0 — lihat
// public/models/gambut/SUMBER.md). Di modul ini permukaan ikut melesak ke dalam
// rongga abu, tumbuhannya menghangus, dan pohon di atas rongga terlebar tumbang.

/** Letak pohon: [x, z, tinggi target (m), rotasi]. Semua di belakang bidang potong. */
const TREE_SPOTS: [number, number, number, number][] = [
  [-1.35, -0.62, 2.5, 0.3],
  [0.62, -0.78, 2.1, 2.1],
  [1.62, -0.42, 1.7, 4.2],
];

/** Letak tumbuhan bawah: [x, z, jenis, tinggi target (m)]. */
const UNDERSTORY_SPOTS: [number, number, "fern" | "calathea" | "anthurium", number][] = [
  [-1.85, -0.35, "fern", 0.7],
  [-1.05, -0.28, "calathea", 0.5],
  [-0.62, -0.72, "fern", 0.6],
  [-0.18, -0.3, "anthurium", 0.45],
  [0.22, -0.66, "fern", 0.55],
  [0.95, -0.25, "calathea", 0.45],
  [1.28, -0.85, "fern", 0.6],
  [1.9, -0.6, "anthurium", 0.5],
  [-1.5, -0.95, "calathea", 0.45],
  [0.05, -1.0, "fern", 0.5],
];

/** Penurunan permukaan yang membuat tumbuhan menghangus habis (m). */
const SCORCH_FULL = 0.16;
/** Penurunan permukaan yang membuat penopang hilang dan pohon tumbang (m). */
const COLLAPSE_AT = 0.3;

function heightOf(obj: THREE.Object3D) {
  return new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3()).y;
}

/** Kumpulkan mesh model menjadi varian-varian siap disalin. */
function collectVariants(root: THREE.Object3D, groupBy: (name: string) => string, castShadow = true) {
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
    // Hanya model yang bayangannya benar-benar terbaca (pohon) ikut dirender
    // pada langkah bayangan. Daun pakis & talas berpoligon rapat, dan
    // bayangannya nyaris tidak terlihat sementara biayanya melipatgandakan
    // jumlah segitiga tiap bingkai.
    clone.castShadow = castShadow;
    clone.receiveShadow = true;
    group.add(clone);
  });
  return [...variants.values()];
}

/** Satu tumbuhan yang ditempatkan, dengan material sendiri agar bisa menghangus. */
type Plant = {
  object: THREE.Object3D;
  x: number;
  z: number;
  /** Rotasi awal agar kemiringan tumbangnya menambah, bukan menggantikan. */
  baseRotation: THREE.Euler;
  materials: { mat: THREE.MeshStandardMaterial; base: THREE.Color }[];
  isTree: boolean;
  /** Nilai teranimasi: tingkat hangus & tingkat tumbang (0–1). */
  scorch: number;
  fall: number;
  /** Arah tumbang, agar tiap pohon jatuh ke sisi yang berbeda. */
  side: number;
};

type Props = {
  sim: SmolderSim;
  stateRef: RefObject<BaraState>;
  subsidence: Subsidence;
  /** Dipanggil sekali saat pohon pertama tumbang karena permukaannya ambruk. */
  onCollapse: () => void;
  /** Dipanggil saat pembaca mengklik permukaan (untuk menyulut pada babak 01). */
  onSurfaceClick: (xFraction: number) => void;
  quality: Quality;
};

export default function SurfaceCover({ sim, stateRef, subsidence, quality, onCollapse, onSurfaceClick }: Props) {
  const profile = QUALITY_PROFILE[quality];
  const [treeG, fernG, calatheaG, anthuriumG] = useLoader(GLTFLoader, [
    "/models/gambut/pohon_pachira.glb",
    "/models/gambut/pakis.glb",
    "/models/gambut/calathea.glb",
    "/models/gambut/anthurium.glb",
  ]);
  const [groundColor, groundNormal, dryColor, dryNormal] = useLoader(THREE.TextureLoader, [
    "/textures/gambut/permukaan_color.webp",
    "/textures/gambut/permukaan_normal.webp",
    "/textures/gambut/permukaan_kering_color.webp",
    "/textures/gambut/permukaan_kering_normal.webp",
  ]);

  const res = useMemo(() => {
    for (const t of [groundColor, dryColor]) t.colorSpace = THREE.SRGBColorSpace;
    for (const t of [groundColor, groundNormal, dryColor, dryNormal]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 8;
    }

    const geom = createSurfaceGrid();
    // Warna per titik dipakai untuk menghanguskan permukaan di atas rongga.
    // Empat kanal, bukan tiga: kanal keempat melenyapkan hamparan permukaan di
    // tempat gambut di bawahnya sudah habis. Tanpa itu, hamparan tetap utuh
    // dan teregang menuruni dinding rongga sebagai lembaran pucat menggulung,
    // padahal di alam lapisan itu ikut terbakar bersama gambutnya.
    const count = (SURFACE_COLS + 1) * (SURFACE_ROWS + 1);
    geom.setAttribute("color", new THREE.BufferAttribute(new Float32Array(count * 4).fill(1), 4));

    return {
      geom,
      wet: new THREE.MeshStandardMaterial({
        map: groundColor,
        normalMap: groundNormal,
        color: "#b9c2a4",
        // Benar-benar pudar, bukan mengilap: permukaan yang hangus tidak
        // memantulkan cahaya, dan tanpa ini hamparan yang ambruk terlihat
        // seperti cokelat leleh.
        roughness: 1,
        metalness: 0,
        envMapIntensity: 0.15,
        vertexColors: true,
        transparent: true,
      }),
      dry: new THREE.MeshStandardMaterial({
        map: dryColor,
        normalMap: dryNormal,
        roughness: 1,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        vertexColors: true,
        envMapIntensity: 0.15,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    };
  }, [groundColor, groundNormal, dryColor, dryNormal]);

  // Tempatkan tumbuhan; tiap tumbuhan mendapat salinan materialnya sendiri
  // supaya bisa menghangus tanpa mempengaruhi tumbuhan lain.
  const plants = useMemo(() => {
    const rand = seeded(17);
    const trees = [...collectVariants(treeG.scene, (n) => n.slice(-1))].sort((a, b) => heightOf(b) - heightOf(a));
    const understory = {
      fern: collectVariants(fernG.scene, (n) => n, false),
      calathea: collectVariants(calatheaG.scene, (n) => n, false),
      anthurium: collectVariants(anthuriumG.scene, (n) => n, false),
    };

    const make = (template: THREE.Object3D, x: number, z: number, height: number, ry: number, isTree: boolean): Plant => {
      const object = template.clone();
      object.scale.setScalar(height / Math.max(heightOf(template), 0.01));
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
      return {
        object,
        x,
        z,
        baseRotation: object.rotation.clone(),
        materials,
        isTree,
        scorch: 0,
        fall: 0,
        side: rand() < 0.5 ? -1 : 1,
      };
    };

    const list: Plant[] = [];
    TREE_SPOTS.filter(([x, z]) => isInsideFootprint(x, z, 0.25)).forEach(([x, z, h, ry], i) => {
      list.push(make(trees[i % trees.length], x, z, h, ry, true));
    });
    UNDERSTORY_SPOTS.slice(0, profile.understory)
      .filter(([x, z]) => isInsideFootprint(x, z, 0.15))
      .forEach(([x, z, kind, h]) => {
        const variants = understory[kind];
        list.push(make(variants[Math.floor(rand() * variants.length)], x, z, h * (0.85 + rand() * 0.3), rand() * Math.PI * 2, false));
      });
    return list;
  }, [treeG, fernG, calatheaG, anthuriumG, profile.understory]);

  useEffect(
    () => () => {
      res.geom.dispose();
      res.wet.dispose();
      res.dry.dispose();
      plants.forEach((p) => p.materials.forEach(({ mat }) => mat.dispose()));
    },
    [res, plants],
  );

  const charcoal = useMemo(() => new THREE.Color("#171310"), []);
  /** Warna dingin untuk tampilan termal. */
  const cold = useMemo(() => new THREE.Color("#0a1030"), []);
  const straw = useMemo(() => new THREE.Color("#a07a3e"), []);
  const built = useRef(-1);
  const collapsed = useRef(false);

  /** Bentuk ulang permukaan & warna hangusnya mengikuti rongga di bawahnya. */
  const rebuild = () => {
    updateSurfaceGrid(res.geom, subsidence.fn);
    const pos = res.geom.attributes.position as THREE.BufferAttribute;
    const color = res.geom.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const drop = subsidence.fn(pos.getX(i));
      const burn = Math.min(1, drop / SCORCH_FULL);
      // Hampir hitam, bukan sekadar gelap. Pada 0,88 hamparan yang ambruk
      // masih memantulkan cahaya dan terbaca sebagai pita mengilap yang
      // berlipat-lipat, bukan tanah yang hangus.
      const k = 1 - burn * 0.96;
      // Hamparan mulai koyak setelah permukaan turun 45 cm dan hilang sama
      // sekali pada 95 cm; di bawahnya yang terlihat adalah dinding rongga.
      const alpha = 1 - Math.min(1, Math.max(0, (drop - 0.45) / 0.5));
      color.setXYZW(i, k, k * 0.94, k * 0.9, alpha);
    }
    color.needsUpdate = true;
    built.current = subsidence.version;
  };

  useEffect(rebuild, [res, subsidence]);

  useFrame((state, delta) => {
    const s = stateRef.current;
    if (!s) return;
    const dt = Math.min(delta, 0.05);
    if (built.current !== subsidence.version) rebuild();

    // Permukaan mengering saat muka air tanah turun.
    const dryness = Math.min(1, Math.max(0, (sim.getWaterTable() - 0.2) / 0.7));
    res.dry.opacity = THREE.MathUtils.damp(res.dry.opacity, dryness * (1 - s.thermal), s.reducedMotion ? 30 : 2, dt);
    // Lantai hutan juga mendingin pada citra termal.
    res.wet.color.setRGB(0.725, 0.761, 0.643).lerp(cold, s.thermal * 0.92);

    const t = state.clock.elapsedTime;
    plants.forEach((p, i) => {
      const drop = subsidence.fn(p.x);
      // Gambut di bawah tumbuhan yang masih basah tidak menghanguskan apa pun.
      const scorchTarget = Math.min(1, drop / SCORCH_FULL);
      const fallTarget = drop > COLLAPSE_AT ? 1 : 0;
      p.scorch = THREE.MathUtils.damp(p.scorch, scorchTarget, s.reducedMotion ? 30 : 1.4, dt);
      p.fall = THREE.MathUtils.damp(p.fall, fallTarget, s.reducedMotion ? 30 : 0.9, dt);

      // Warna: menguning saat kering, lalu menghitam saat tersentuh bara.
      const wilt = Math.min(0.75, dryness * 0.6);
      p.materials.forEach(({ mat, base }) => {
        // Pada citra termal, tumbuhan yang dingin tampak gelap kebiruan.
        mat.color.copy(base).lerp(straw, wilt).lerp(charcoal, p.scorch * 0.95).lerp(cold, s.thermal * 0.92);
      });

      // Permukaan turun, jadi tumbuhan ikut turun; yang penopangnya hilang tumbang.
      const y = surfaceYAt(p.x, p.z, subsidence.fn) + 0.012;
      p.object.position.y = y - p.fall * 0.12;
      p.object.rotation.set(
        p.baseRotation.x + (s.reducedMotion ? 0 : Math.cos(t * 0.6 + i) * 0.01),
        p.baseRotation.y,
        p.baseRotation.z + p.fall * 1.25 * p.side + (s.reducedMotion ? 0 : Math.sin(t * 0.8 + i * 1.7) * 0.012),
      );

      if (p.isTree && p.fall > 0.5 && !collapsed.current) {
        collapsed.current = true;
        onCollapse();
      }
    });
  });

  return (
    <group>
      {/* Lantai hutan: lembap (dasar) dan kering (memudar masuk saat air turun) */}
      {/* Diangkat 1,2 cm agar tidak berebut bidang dengan tutup atas badan lapisan */}
      <mesh
        geometry={res.geom}
        material={res.wet}
        position-y={0.012}
        receiveShadow
        onClick={(e) => {
          if (!e.point) return;
          // Seretan untuk memutar bongkahan tidak boleh ikut menyulut.
          if ((stateRef.current?.dragMoved ?? 0) > DRAG_THRESHOLD) return;
          e.stopPropagation();
          // Titik tumbukan berada di koordinat dunia; harus dikembalikan ke
          // koordinat bongkahan dulu, sebab diorama dapat diputar.
          const local = e.object.worldToLocal(e.point.clone());
          onSurfaceClick((local.x + BLOCK_WIDTH / 2) / BLOCK_WIDTH);
        }}
        onPointerOver={() => void (document.body.style.cursor = "pointer")}
        onPointerOut={() => void (document.body.style.cursor = "")}
      />
      <mesh geometry={res.geom} material={res.dry} position-y={0.018} receiveShadow />

      {plants.map((p) => (
        <primitive key={p.object.uuid} object={p.object} />
      ))}
    </group>
  );
}
