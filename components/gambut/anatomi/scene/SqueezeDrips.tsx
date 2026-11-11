"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { PEAT_LAYERS, PROFILE_DEPTH, SQUEEZE_SAMPLES, SQUEEZE_SCALE_KG } from "@/lib/peat";
import { radiusAt } from "@/components/gambut/scene/terrain";
import { SQUEEZE_STEP, type SceneState } from "./sceneState";

/** Jumlah butir air yang disiapkan sekaligus. */
const POOL = 90;

/** Butir per detik untuk contoh yang menahan air paling banyak (skala penuh). */
const FULL_RATE = 70;

/** Percepatan jatuh (m/s²), diperlambat agar alirannya sempat terbaca. */
const GRAVITY = 2.6;

/** Lebar sudut sisi depan tempat air keluar (radian). */
const SPREAD = 0.32;

const UP = new THREE.Vector3(0, 1, 0);

type Drop = { alive: boolean; x: number; y: number; z: number; vx: number; vy: number; vz: number; size: number };

/**
 * Air yang keluar dari bongkahan saat contoh gambut diperas (tahap
 * "Menyimpan air").
 *
 * Panel uji peras hanya memperlihatkan gelas ukur, sehingga hubungannya
 * dengan lapisan di bongkahan tidak terlihat. Komponen ini membuat air itu
 * keluar dari sisi depan lapisan yang dipilih, lalu jatuh menyusuri dinding
 * sampai ke dasar. Derasnya sebanding dengan daya tampung air contohnya, dan
 * warnanya sama dengan air di gelas: fibrik deras dan jernih, saprik sedikit
 * dan pekat, dengan butir bahan gambut yang ikut terbawa.
 */
export default function SqueezeDrips({ stateRef }: { stateRef: RefObject<SceneState> }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { camera } = useThree();

  const res = useMemo(
    () => ({
      geom: new THREE.SphereGeometry(0.022, 8, 6),
      mat: new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }),
    }),
    [],
  );
  useEffect(
    () => () => {
      res.geom.dispose();
      res.mat.dispose();
    },
    [res],
  );

  const drops = useMemo<Drop[]>(
    () => Array.from({ length: POOL }, () => ({ alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, size: 1 })),
    [],
  );
  const spawn = useRef(0);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useFrame((_, delta) => {
    const s = stateRef.current;
    const mesh = meshRef.current;
    if (!s || !mesh) return;
    const dt = Math.min(delta, 0.05);
    const sample = SQUEEZE_SAMPLES.find((x) => x.id === s.squeezeLayer);
    const layer = PEAT_LAYERS.find((l) => l.id === s.squeezeLayer);
    const flowing = s.step === SQUEEZE_STEP && s.squeezing && !s.reducedMotion && sample && layer;

    if (sample) {
      // Warna air dari panel, tanpa saluran alfa: kepekatannya dibawa opasitas.
      const m = sample.waterColor.match(/[\d.]+/g)!.map(Number);
      color.setRGB(m[0] / 255, m[1] / 255, m[2] / 255, THREE.SRGBColorSpace);
      res.mat.color.copy(color);
      res.mat.opacity = Math.min(0.95, 0.35 + m[3] * 0.6);
    }

    // Sisi bongkahan yang menghadap kamera, dalam koordinat diorama yang ikut berputar.
    const parentRot = mesh.parent?.rotation.y ?? 0;
    dir.set(camera.position.x, 0, camera.position.z).normalize().applyAxisAngle(UP, -parentRot);
    const facing = Math.atan2(dir.z, dir.x);

    if (flowing) {
      spawn.current += dt * FULL_RATE * (sample.shownKg / SQUEEZE_SCALE_KG) * 1.6 + dt * 6;
      const mid = -(layer.top + layer.bottom) / 2;
      const half = (layer.bottom - layer.top) / 2;
      while (spawn.current >= 1) {
        spawn.current -= 1;
        const d = drops.find((p) => !p.alive);
        if (!d) break;
        const theta = facing + (Math.random() - 0.5) * SPREAD;
        const y = mid + (Math.random() - 0.5) * half;
        const r = radiusAt(theta, y) + 0.03;
        d.alive = true;
        d.x = Math.cos(theta) * r;
        d.z = Math.sin(theta) * r;
        d.y = y;
        // Keluar sedikit menjauhi dinding, lalu jatuh.
        d.vx = Math.cos(theta) * 0.22;
        d.vz = Math.sin(theta) * 0.22;
        d.vy = 0.05;
        // Bahan gambut yang ikut lolos pada contoh yang matang: butir lebih besar.
        d.size = sample.pulpPasses && Math.random() < 0.35 ? 1.8 : 0.7 + Math.random() * 0.6;
      }
    } else {
      spawn.current = 0;
    }

    let shown = 0;
    for (const d of drops) {
      if (!d.alive) continue;
      d.vy -= GRAVITY * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.z += d.vz * dt;
      // Hambatan udara kecil agar butir tidak melayang jauh dari dinding.
      d.vx *= 1 - 1.5 * dt;
      d.vz *= 1 - 1.5 * dt;
      if (d.y < -PROFILE_DEPTH - 0.05) {
        d.alive = false;
        continue;
      }
      dummy.position.set(d.x, d.y, d.z);
      // Memanjang searah jatuh, seperti tetesan.
      dummy.scale.set(d.size, d.size * (1 + Math.min(2, -d.vy * 0.8)), d.size);
      dummy.updateMatrix();
      mesh.setMatrixAt(shown++, dummy.matrix);
    }
    mesh.count = shown;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.visible = shown > 0;
  });

  return <instancedMesh ref={meshRef} args={[res.geom, res.mat, POOL]} frustumCulled={false} />;
}
