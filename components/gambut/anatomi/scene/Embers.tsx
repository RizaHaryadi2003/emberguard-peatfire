"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { createSmokeTexture, createSparkTexture } from "@/components/gambut/scene/proceduralTextures";
import { BLOCK_DEPTH, BLOCK_WIDTH, type SceneState } from "./sceneState";
import { isInsideFootprint } from "@/components/gambut/scene/terrain";

// Percikan api dan asap yang naik dari permukaan gambut kering.
// Kekuatannya mengikuti tingkat bahaya: nol selama muka air ≤ 40 cm.

const SPARK_COUNT = 160;
const SMOKE_COUNT = 28;

type Particle = { x: number; y: number; z: number; vy: number; life: number; maxLife: number; seed: number };

function spawn(p: Particle, rand: () => number, speed: number, lifeRange: [number, number]) {
  // Titik muncul acak di dalam tapak bongkahan.
  do {
    p.x = (rand() - 0.5) * BLOCK_WIDTH;
    p.z = (rand() - 0.5) * BLOCK_DEPTH;
  } while (!isInsideFootprint(p.x, p.z, 0.15));
  p.y = 0.02;
  p.vy = speed * (0.5 + rand());
  p.maxLife = lifeRange[0] + rand() * (lifeRange[1] - lifeRange[0]);
  p.life = 0;
  p.seed = rand() * 100;
}

type Props = { stateRef: RefObject<SceneState> };

/** Acak biasa sudah cukup: pola partikel tidak perlu dapat diulang. */
const rand = () => Math.random();

export default function Embers({ stateRef }: Props) {
  const res = useMemo(() => {
    const sparkTex = createSparkTexture();
    const smokeTex = createSmokeTexture();
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SPARK_COUNT * 3), 3));
    sparkGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(SPARK_COUNT * 3), 3));
    const sparkMat = new THREE.PointsMaterial({
      map: sparkTex,
      size: 0.05,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const smokeMats = Array.from(
      { length: SMOKE_COUNT },
      () =>
        new THREE.SpriteMaterial({
          map: smokeTex,
          color: "#8d837a",
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
    );
    return { sparkTex, smokeTex, sparkGeo, sparkMat, smokeMats };
  }, []);

  useEffect(
    () => () => {
      res.sparkTex.dispose();
      res.smokeTex.dispose();
      res.sparkGeo.dispose();
      res.sparkMat.dispose();
      res.smokeMats.forEach((m) => m.dispose());
    },
    [res],
  );

  // Partikel dimulai dengan umur acak agar tidak muncul serentak.
  const sparks = useMemo(
    () =>
      Array.from({ length: SPARK_COUNT }, () => {
        const p: Particle = { x: 0, y: 0, z: 0, vy: 0, life: 0, maxLife: 1, seed: 0 };
        spawn(p, rand, 0.45, [1.2, 2.8]);
        p.life = rand() * p.maxLife;
        return p;
      }),
    [],
  );
  const smokes = useMemo(
    () =>
      Array.from({ length: SMOKE_COUNT }, () => {
        const p: Particle = { x: 0, y: 0, z: 0, vy: 0, life: 0, maxLife: 1, seed: 0 };
        spawn(p, rand, 0.12, [5, 9]);
        p.life = rand() * p.maxLife;
        return p;
      }),
    [],
  );

  const pointsRef = useRef<THREE.Points>(null);
  const smokeRefs = useRef<(THREE.Sprite | null)[]>([]);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state, delta) => {
    const s = stateRef.current;
    if (!s) return;
    const dt = Math.min(delta, 0.05);
    const d = s.danger;
    const t = state.clock.elapsedTime;
    const active = d > 0.01;

    if (pointsRef.current) pointsRef.current.visible = active;
    if (lightRef.current) {
      const flicker = s.reducedMotion ? 1 : 0.75 + 0.25 * Math.sin(t * 9.1) * Math.sin(t * 3.7);
      lightRef.current.intensity = d * 5 * flicker;
    }
    if (!active) {
      smokeRefs.current.forEach((sp) => sp && (sp.visible = false));
      return;
    }

    // Percikan: naik cepat, berkelok, memudar dari kuning ke merah.
    const pos = res.sparkGeo.attributes.position as THREE.BufferAttribute;
    const col = res.sparkGeo.attributes.color as THREE.BufferAttribute;
    sparks.forEach((p, i) => {
      p.life += dt;
      if (p.life > p.maxLife) spawn(p, rand, 0.45, [1.2, 2.8]);
      p.y += p.vy * dt;
      const k = p.life / p.maxLife;
      const x = p.x + Math.sin(t * 2 + p.seed) * 0.06 * k;
      const z = p.z + Math.cos(t * 1.7 + p.seed) * 0.06 * k;
      pos.setXYZ(i, x, p.y, z);
      // Hanya sebagian percikan yang tampil pada tingkat bahaya rendah.
      const visible = i / SPARK_COUNT < d ? 1 : 0;
      const fade = Math.sin(Math.PI * k) * visible;
      col.setXYZ(i, fade * 1.0, fade * (0.75 - k * 0.5), fade * 0.25 * (1 - k));
    });
    pos.needsUpdate = true;
    col.needsUpdate = true;

    // Asap: naik perlahan, membesar, lalu menghilang.
    smokes.forEach((p, i) => {
      const sp = smokeRefs.current[i];
      if (!sp) return;
      p.life += dt;
      if (p.life > p.maxLife) spawn(p, rand, 0.12, [5, 9]);
      p.y += p.vy * dt;
      const k = p.life / p.maxLife;
      sp.visible = true;
      sp.position.set(p.x + Math.sin(t * 0.3 + p.seed) * 0.2 * k, p.y, p.z);
      sp.scale.setScalar(0.5 + k * 1.8);
      res.smokeMats[i].opacity = Math.sin(Math.PI * k) * 0.38 * d;
      res.smokeMats[i].rotation = p.seed + t * 0.05;
    });
  });

  return (
    <group>
      <points ref={pointsRef} geometry={res.sparkGeo} material={res.sparkMat} frustumCulled={false} />
      {res.smokeMats.map((m, i) => (
        <sprite key={i} ref={(el) => void (smokeRefs.current[i] = el)} material={m} visible={false} />
      ))}
      {/* Cahaya jingga dari bara yang menerangi pepohonan */}
      <pointLight ref={lightRef} position={[0, 0.35, 0.6]} color="#ff6a2a" intensity={0} distance={6} decay={1.6} />
    </group>
  );
}
