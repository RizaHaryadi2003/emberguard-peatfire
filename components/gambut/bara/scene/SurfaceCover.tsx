"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { isInsideFootprint } from "@/components/gambut/scene/terrain";
import { DIORAMA_TREE_SPOTS, DIORAMA_UNDERSTORY_SPOTS } from "@/components/gambut/scene/dioramaConstants";
import { seeded } from "@/lib/random";
import { type SmolderSim } from "@/lib/smolder";
import {
  createSurfaceGrid,
  SURFACE_COLS,
  SURFACE_ROWS,
  surfaceYAt,
  updateSurfaceGrid,
} from "./crossSection";
import { applyBurn, createBurnUniforms, type BurnUniforms } from "./burnMaterial";
import { BLOCK_WIDTH, DRAG_THRESHOLD, QUALITY_PROFILE, type BaraState, type Quality, type Subsidence } from "./baraState";

// Permukaan hutan rawa di atas bongkahan yang dipotong. Tumbuhan memakai model
// pindaian yang sama dengan Modul 01 (Poly Haven, CC0 — lihat
// public/models/gambut/SUMBER.md). Di modul ini permukaan ikut melesak ke dalam
// rongga abu, dan tumbuhannya terbakar bertahap (lihat `burnMaterial.ts`).

// Tumbuhan yang sama letaknya dengan Modul 01; yang berdiri di separuh depan
// ikut hilang bersama tanah yang dipotong.
const TREE_SPOTS = DIORAMA_TREE_SPOTS.filter(([, z]) => z < 0);
const UNDERSTORY_SPOTS = DIORAMA_UNDERSTORY_SPOTS.filter(([, z]) => z < 0);

/** Penurunan permukaan yang membuat tumbuhan menghangus habis (m). */
const SCORCH_FULL = 0.16;
/** Kecepatan api memakan tumbuhan, supaya prosesnya terlihat berlangsung. */
const BURN_RATE = 0.4;
/** Tingkat terbakar saat tajuk tidak lagi menjatuhkan bayangan. */
const LEAF_SHADOW_UNTIL = 0.8;
/** Tingkat terbakar saat tumbuhan bawah sudah habis dan berhenti digambar. */
const UNDERSTORY_GONE_AT = 0.97;
/** Tumbuhan bawah mengerut sebanyak ini sebelum habis. */
const UNDERSTORY_SHRINK = 0.3;

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
  /** Rotasi awal, supaya goyangannya menambah dan bukan menggantikan. */
  baseRotation: THREE.Euler;
  materials: { mat: THREE.MeshStandardMaterial; base: THREE.Color }[];
  /** Nilai teranimasi: tingkat terbakar (0–1). */
  scorch: number;
  burn: BurnUniforms;
  /** Punya batang, jadi tetap berdiri setelah daunnya habis. */
  hasBark: boolean;
  baseScale: number;
  /** Mesh daun yang menjatuhkan bayangan. */
  shadowLeaves: THREE.Mesh[];
};

type Props = {
  sim: SmolderSim;
  stateRef: RefObject<BaraState>;
  subsidence: Subsidence;
  /** Dipanggil saat pembaca mengklik permukaan (untuk menyulut pada babak 01). */
  onSurfaceClick: (xFraction: number) => void;
  quality: Quality;
};

export default function SurfaceCover({ sim, stateRef, subsidence, quality, onSurfaceClick }: Props) {
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
      t.anisotropy = profile.anisotropy;
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
  }, [groundColor, groundNormal, dryColor, dryNormal, profile.anisotropy]);

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

    const make = (template: THREE.Object3D, x: number, z: number, height: number, ry: number): Plant => {
      const object = template.clone();
      const localHeight = heightOf(template);
      const baseScale = height / Math.max(localHeight, 0.01);
      object.scale.setScalar(baseScale);
      const burn = createBurnUniforms(localHeight, baseScale);
      const shadowLeaves: THREE.Mesh[] = [];
      let hasBark = false;
      object.position.set(x, 0, z);
      object.rotation.y = ry;
      const materials: Plant["materials"] = [];
      object.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
        const bark = mat.name.includes("bark");
        hasBark ||= bark;
        if (!bark && mesh.castShadow) shadowLeaves.push(mesh);
        applyBurn(mat, burn, bark ? "bark" : "foliage");
        mesh.material = mat;
        materials.push({ mat, base: mat.color.clone() });
      });
      return {
        object,
        x,
        z,
        baseRotation: object.rotation.clone(),
        materials,
        scorch: 0,
        burn,
        hasBark,
        baseScale,
        shadowLeaves,
      };
    };

    const list: Plant[] = [];
    TREE_SPOTS.filter(([x, z]) => isInsideFootprint(x, z, 0.25)).forEach(([x, z, h, ry], i) => {
      list.push(make(trees[i % trees.length], x, z, h, ry));
    });
    UNDERSTORY_SPOTS.slice(0, profile.understory)
      .filter(([x, z]) => isInsideFootprint(x, z, 0.15))
      .forEach(([x, z, kind, h]) => {
        const variants = understory[kind];
        list.push(make(variants[Math.floor(rand() * variants.length)], x, z, h * (0.85 + rand() * 0.3), rand() * Math.PI * 2));
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

  /** Warna dingin untuk tampilan termal. */
  const cold = useMemo(() => new THREE.Color("#0a1030"), []);
  const straw = useMemo(() => new THREE.Color("#a07a3e"), []);
  const built = useRef(-1);

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
      // berlipat-lipat, bukan tanah yang hangus. Di sela-selanya ada bercak
      // abu pucat, supaya tanah yang terbakar tidak hitam rata.
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const patch = 0.5 + 0.5 * Math.sin(x * 7.3 + Math.sin(z * 5.1) * 1.7) * Math.sin(z * 9.7 + x * 2.3);
      const ash = THREE.MathUtils.smoothstep(patch, 0.62, 0.85) * Math.max(0, burn - 0.6) * 2.5;
      const k = THREE.MathUtils.lerp(1 - burn * 0.96, 0.3, ash);
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
    // Tanah yang baru tersiram menggelap dan sedikit berkilap, lalu kembali pudar.
    const soaked = sim.getDouse();
    res.wet.roughness = 1 - soaked * 0.5;
    res.wet.color.setRGB(0.725, 0.761, 0.643).multiplyScalar(1 - soaked * 0.35).lerp(cold, s.thermal * 0.92);

    const t = state.clock.elapsedTime;
    plants.forEach((p, i) => {
      const drop = subsidence.fn(p.x);
      // Gambut di bawah tumbuhan yang masih basah tidak menghanguskan apa pun.
      const scorchTarget = Math.min(1, drop / SCORCH_FULL);
      p.scorch = THREE.MathUtils.damp(p.scorch, scorchTarget, s.reducedMotion ? 30 : BURN_RATE, dt);
      p.burn.uBurn.value = p.scorch;
      // Berpijar hanya selama api masih memakan tumbuhannya.
      p.burn.uBurnGlow.value = s.reducedMotion ? 0 : Math.min(1, Math.max(0, (scorchTarget - p.scorch) * 5));
      p.burn.uBurnThermal.value = s.thermal;

      // Yang sudah habis tidak perlu digambar sama sekali.
      p.object.visible = p.hasBark || p.scorch < UNDERSTORY_GONE_AT;
      if (!p.object.visible) return;
      if (!p.hasBark) p.object.scale.setScalar(p.baseScale * (1 - p.scorch * UNDERSTORY_SHRINK));
      const castsShadow = p.scorch < LEAF_SHADOW_UNTIL;
      p.shadowLeaves.forEach((leaf) => {
        leaf.castShadow = castsShadow;
      });

      // Warna: menguning saat kering; tahapan terbakarnya diurus peneduh.
      const wilt = Math.min(0.75, dryness * 0.6);
      p.materials.forEach(({ mat, base }) => {
        // Pada citra termal, tumbuhan yang dingin tampak gelap kebiruan.
        mat.color.copy(base).lerp(straw, wilt).lerp(cold, s.thermal * 0.92);
      });

      // Permukaan turun, jadi tumbuhan ikut turun.
      p.object.position.y = surfaceYAt(p.x, p.z, subsidence.fn) + 0.012;
      p.object.rotation.set(
        p.baseRotation.x + (s.reducedMotion ? 0 : Math.cos(t * 0.6 + i) * 0.01),
        p.baseRotation.y,
        p.baseRotation.z + (s.reducedMotion ? 0 : Math.sin(t * 0.8 + i * 1.7) * 0.012),
      );
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
      />
      <mesh geometry={res.geom} material={res.dry} position-y={0.018} receiveShadow />

      {plants.map((p) => (
        <primitive key={p.object.uuid} object={p.object} />
      ))}
    </group>
  );
}
