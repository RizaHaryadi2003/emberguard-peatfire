"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { createSmokeTexture, createSparkTexture } from "@/components/gambut/scene/proceduralTextures";
import { CELL_SMOLDER, GRID_COLS, GRID_ROWS, type SmolderSim } from "@/lib/smolder";
import { QUALITY_PROFILE, type BaraState, type Quality } from "./baraState";

// Asap, percikan, dan cahaya bara. Semuanya mengikuti keadaan simulasi: asap
// hanya keluar dari kolom yang baranya masih dekat permukaan, dan berubah
// menjadi uap putih saat gambutnya dibasahi.

/** Jumlah kepulan asap diambil dari anggaran mutu (lihat QUALITY_PROFILE). */
const SPARK_COUNT = 90;

/** Bara yang lebih dalam dari ini asapnya tidak lagi sampai ke permukaan (m). */
const SMOKE_REACH = 1.2;

type Hot = { x: number; depth: number };

type Particle = { x: number; z: number; y: number; vy: number; life: number; maxLife: number; seed: number };

export default function SmokePlumes({
  sim,
  stateRef,
  quality,
}: {
  sim: SmolderSim;
  stateRef: RefObject<BaraState>;
  quality: Quality;
}) {
  const smokeCount = QUALITY_PROFILE[quality].smoke;
  const res = useMemo(() => {
    const smokeTex = createSmokeTexture();
    const sparkTex = createSparkTexture();
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SPARK_COUNT * 3), 3));
    sparkGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(SPARK_COUNT * 3), 3));
    return {
      smokeTex,
      sparkTex,
      sparkGeo,
      sparkMat: new THREE.PointsMaterial({
        map: sparkTex,
        size: 0.045,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
      smokeMats: Array.from(
        { length: smokeCount },
        () => new THREE.SpriteMaterial({ map: smokeTex, color: "#8d837a", transparent: true, opacity: 0, depthWrite: false }),
      ),
    };
  }, [smokeCount]);

  useEffect(
    () => () => {
      res.smokeTex.dispose();
      res.sparkTex.dispose();
      res.sparkGeo.dispose();
      res.sparkMat.dispose();
      res.smokeMats.forEach((m) => m.dispose());
    },
    [res],
  );

  // Partikel dimulai "mati" (maxLife habis) supaya masing-masing lahir di
  // tempat yang benar pada bingkai pertama, bukan diacak saat render.
  const smokes = useMemo<Particle[]>(
    () => Array.from({ length: smokeCount }, (_, i) => ({ x: 0, z: -0.3, y: 0, vy: 0, life: 1, maxLife: 0, seed: i * 7.13 })),
    [smokeCount],
  );
  const sparks = useMemo<Particle[]>(
    () => Array.from({ length: SPARK_COUNT }, (_, i) => ({ x: 0, z: -0.2, y: 0, vy: 0, life: 1, maxLife: 0, seed: i * 3.71 })),
    [],
  );

  const smokeRefs = useRef<(THREE.Sprite | null)[]>([]);
  const pointsRef = useRef<THREE.Points>(null);
  const lightRefs = useRef<(THREE.PointLight | null)[]>([]);

  // Daftar titik bara yang masih dangkal, disegarkan berkala (bukan tiap bingkai).
  const hot = useRef<Hot[]>([]);
  const scan = useRef(0);

  const refreshHot = () => {
    const list: Hot[] = [];
    // Ambil sebagian sel saja: cukup untuk menentukan tempat asap keluar.
    for (let row = 0; row < GRID_ROWS; row += 1) {
      const depth = sim.depthOfRow(row);
      if (depth > SMOKE_REACH) break;
      for (let col = 0; col < GRID_COLS; col += 2) {
        if (sim.state[sim.index(col, row)] === CELL_SMOLDER) list.push({ x: sim.xOfCol(col), depth });
      }
    }
    hot.current = list;
  };

  const spawn = (p: Particle, speed: number, life: [number, number]) => {
    const list = hot.current;
    if (list.length === 0) {
      p.maxLife = 0;
      return;
    }
    const pick = list[Math.floor(Math.random() * list.length)];
    p.x = pick.x + (Math.random() - 0.5) * 0.12;
    p.z = -0.05 - Math.random() * 0.7;
    p.y = 0.02;
    // Bara yang lebih dalam menghasilkan asap yang lebih lemah dan lambat.
    const reach = 1 - pick.depth / SMOKE_REACH;
    p.vy = speed * (0.4 + Math.random()) * (0.35 + reach);
    p.maxLife = (life[0] + Math.random() * (life[1] - life[0])) * (0.5 + reach * 0.5);
    p.life = 0;
    p.seed = Math.random() * 100;
  };

  useFrame((state, delta) => {
    const s = stateRef.current;
    if (!s) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    scan.current -= dt;
    if (scan.current <= 0) {
      scan.current = 0.25;
      refreshHot();
    }

    const stats = sim.stats;
    // Uap: saat permukaan disiram atau muka air dinaikkan, asap menjadi putih.
    const steam = Math.max(s.spray, sim.getDouse()) * (stats.alive ? 1 : 0.6);
    const smokeLevel = Math.max(stats.surfaceSmoke, s.flame * 0.8);
    const active = hot.current.length > 0 || s.flame > 0.01 || steam > 0.01;

    // --- Asap
    smokes.forEach((p, i) => {
      const sprite = smokeRefs.current[i];
      const mat = res.smokeMats[i];
      if (!sprite) return;
      if (!active) {
        sprite.visible = false;
        return;
      }
      p.life += dt;
      if (p.life > p.maxLife) spawn(p, steam > 0.3 ? 0.4 : 0.16, steam > 0.3 ? [2.5, 4] : [5, 9]);
      if (p.maxLife <= 0) {
        sprite.visible = false;
        return;
      }
      p.y += p.vy * dt;
      const k = p.life / p.maxLife;
      sprite.visible = true;
      sprite.position.set(p.x + Math.sin(t * 0.3 + p.seed) * 0.25 * k, p.y, p.z);
      sprite.scale.setScalar(0.35 + k * 1.9);
      mat.color.setRGB(0.55 + steam * 0.4, 0.51 + steam * 0.42, 0.48 + steam * 0.45);
      mat.opacity = Math.sin(Math.PI * k) * 0.4 * Math.max(smokeLevel, steam * 0.8);
      mat.rotation = p.seed + t * 0.05;
    });

    // --- Percikan kecil di mulut rongga yang terbuka ke permukaan
    const pos = res.sparkGeo.attributes.position as THREE.BufferAttribute;
    const col = res.sparkGeo.attributes.color as THREE.BufferAttribute;
    const sparkLevel = Math.max(s.flame, smokeLevel * 0.5) * (1 - steam);
    if (pointsRef.current) pointsRef.current.visible = sparkLevel > 0.02;
    if (sparkLevel > 0.02) {
      sparks.forEach((p, i) => {
        p.life += dt;
        if (p.life > p.maxLife) {
          // Saat menyulut, percikan muncul di titik sulutan; setelahnya di atas bara.
          if (s.flame > 0.05) {
            p.x = (s.flameX - 0.5) * 4.4 + (Math.random() - 0.5) * 0.25;
            p.z = -0.05 - Math.random() * 0.3;
            p.y = 0.02;
            p.vy = 0.5 + Math.random() * 0.7;
            p.maxLife = 0.6 + Math.random() * 0.9;
            p.life = 0;
            p.seed = Math.random() * 100;
          } else {
            spawn(p, 0.45, [0.8, 1.8]);
          }
        }
        if (p.maxLife <= 0) return;
        p.y += p.vy * dt;
        const k = p.life / p.maxLife;
        pos.setXYZ(i, p.x + Math.sin(t * 2 + p.seed) * 0.05 * k, p.y, p.z);
        const visible = i / SPARK_COUNT < sparkLevel ? 1 : 0;
        const fade = Math.sin(Math.PI * k) * visible;
        col.setXYZ(i, fade, fade * (0.72 - k * 0.45), fade * 0.2 * (1 - k));
      });
      pos.needsUpdate = true;
      col.needsUpdate = true;
    }

    // --- Cahaya bara: dua lampu mengikuti pusat daerah yang sedang membara.
    const list = hot.current;
    lightRefs.current.forEach((light, i) => {
      if (!light) return;
      if (list.length === 0 && s.flame < 0.05) {
        light.intensity = 0;
        return;
      }
      // Rerata separuh kiri (i = 0) atau kanan (i = 1) dijumlahkan dalam satu
      // lintasan. Dahulu dikerjakan dengan `filter` lalu dua `reduce`, yang
      // membuat tiga senarai baru per lampu per bingkai — enam senarai tiap
      // bingkai sepanjang kebakaran berlangsung, hanya untuk dua bilangan.
      let n = 0;
      let sumX = 0;
      let sumDepth = 0;
      for (const h of list) {
        if (i === 0 ? h.x > 0 : h.x <= 0) continue;
        n++;
        sumX += h.x;
        sumDepth += h.depth;
      }
      // Bila separuh itu kosong, pakai seluruh daftar supaya lampunya tetap
      // mengikuti bara yang ada, seperti sebelumnya.
      if (n === 0 && list.length > 0) {
        n = list.length;
        sumX = 0;
        sumDepth = 0;
        for (const h of list) {
          sumX += h.x;
          sumDepth += h.depth;
        }
      }
      const x = n > 0 ? sumX / n : (s.flameX - 0.5) * 4.4;
      const depth = n > 0 ? sumDepth / n : 0.05;
      const flicker = s.reducedMotion ? 1 : 0.7 + 0.3 * Math.sin(t * 8.3 + i) * Math.sin(t * 3.1);
      light.position.set(x, -depth + 0.1, 0.35);
      light.intensity = (Math.min(1, n / 30) * 4 + s.flame * 6) * flicker * (1 - steam * 0.7);
    });
  });

  return (
    <group>
      {res.smokeMats.map((m, i) => (
        <sprite key={i} ref={(el) => void (smokeRefs.current[i] = el)} material={m} visible={false} />
      ))}
      <points ref={pointsRef} geometry={res.sparkGeo} material={res.sparkMat} frustumCulled={false} />
      {[0, 1].map((i) => (
        <pointLight
          key={i}
          ref={(el) => void (lightRefs.current[i] = el)}
          color="#ff6a26"
          intensity={0}
          distance={5}
          decay={1.7}
        />
      ))}
    </group>
  );
}
