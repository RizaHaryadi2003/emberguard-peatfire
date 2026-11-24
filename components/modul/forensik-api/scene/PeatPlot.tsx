"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { Wetness, Wind } from "@/lib/model/ignition";
import PeatBlock from "@/components/modul/anatomi/scene/PeatBlock";
import type { SceneState } from "@/components/modul/anatomi/scene/sceneState";
import { createEmberTexture, createSmokeTexture, createSparkTexture } from "@/components/modul/shared/scene/proceduralTextures";
import { DIORAMA_BASE_YAW, DIORAMA_Y } from "@/components/modul/shared/scene/dioramaConstants";
import type { Drop } from "./ForensikScene";

// Babak 01 · Percikan: satu bara seukuran puntung dijatuhkan ke petak gambut.
// Yang terlihat mengikuti hasil model (lib/model/ignition.ts, Lin dkk. 2024):
// bara padam, atau masuk ke gambut dan membara tanpa nyala.

/**
 * Letak muka air yang dipakai untuk RUPA petak tiap keadaan (cm). Hanya
 * supaya gambut basah tampak basah dan gambut kering tampak kering; tidak
 * diberi angka di layar, karena kadar air pada uji Lin dkk. (2024) tidak
 * bisa diterjemahkan ke kedalaman muka air (lihat acuan §3).
 */
const WATER_LOOK_CM: Record<Wetness, number> = { basah: 3, lembap: 28, kering: 80 };

/** Titik jatuh bara di permukaan petak (m, koordinat diorama). */
const LAND = new THREE.Vector3(0.35, 0.01, 0.3);

/** Tinggi mulai jatuh (m) dan lama jatuh (detik). */
const DROP_FROM = 1.9;
const FALL_SEC = 0.75;

/** Lama bara meredup sampai padam (detik): basah cepat, lembap pelan. */
const FADE_SEC: Record<Wetness, number> = { basah: 0.7, lembap: 2.6, kering: 2.6 };

/** Lama bercak bara tumbuh sampai ukuran penuhnya (detik) dan jari-jarinya (m). */
const GROW_SEC = 5;
const SPOT_RADIUS = 0.42;

/** Jumlah gumpal asap/uap yang dipakai bergiliran. */
const PUFFS = 18;

/** Jumlah garis angin. */
const STREAKS = 46;

/** Kotak tempat garis angin melintas (m). */
const WIND_BOX = { x: 2.8, yMin: 0.08, yMax: 1.3, z: 1.4 };

/** Bilangan semu 0–1 yang tetap untuk masukan yang sama. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export default function PeatPlot({
  stateRef,
  wetness,
  wind,
  drop,
}: {
  stateRef: RefObject<SceneState>;
  wetness: Wetness;
  wind: Wind;
  drop: Drop | null;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    stateRef.current.waterCm = WATER_LOOK_CM[wetness];
  }, [wetness, stateRef]);

  // Saat bara terakhir dijatuhkan (detik jam adegan); diisi saat bingkai
  // pertama sesudah `drop.id` berganti.
  const dropAt = useRef<number | null>(null);
  const seenId = useRef<number | null>(null);
  const windRef = useRef(0);

  const res = useMemo(() => {
    const sparkTex = createSparkTexture();
    const smokeTex = createSmokeTexture();
    const emberTex = createEmberTexture(256);
    const ember = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: sparkTex, color: "#ffb15e", transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }),
    );
    ember.scale.setScalar(0.16);
    const spotMat = new THREE.MeshBasicMaterial({
      map: emberTex,
      color: "#ff6a1e",
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
    });
    const disc = new THREE.CircleGeometry(1, 40);
    const spot = new THREE.Mesh(disc, spotMat);
    spot.rotation.x = -Math.PI / 2;
    spot.position.copy(LAND);
    spot.position.y = 0.008;
    // Bekas hangus di bawah pijar: gambut yang sudah termakan bara menghitam,
    // supaya bercaknya terbaca di permukaan gambut kering yang terang.
    const charMat = new THREE.MeshBasicMaterial({ color: "#1b130d", transparent: true, opacity: 0, depthWrite: false });
    const char = new THREE.Mesh(disc, charMat);
    char.rotation.x = -Math.PI / 2;
    char.position.copy(LAND);
    char.position.y = 0.005;
    const puffs = Array.from({ length: PUFFS }, (_, i) => {
      const mat = new THREE.SpriteMaterial({ map: smokeTex, color: "#9a928a", transparent: true, opacity: 0, depthWrite: false });
      const sprite = new THREE.Sprite(mat);
      return { sprite, mat, born: -1, seed: hash(i * 3.7) };
    });
    const streakGeo = new THREE.BufferGeometry();
    const streakPos = new Float32Array(STREAKS * 6);
    streakGeo.setAttribute("position", new THREE.BufferAttribute(streakPos, 3));
    streakGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.6, 0), 4);
    const streakMat = new THREE.LineBasicMaterial({ color: "#e8eef2", transparent: true, opacity: 0, depthWrite: false });
    const streaks = Array.from({ length: STREAKS }, (_, i) => ({
      x: (hash(i * 1.3) * 2 - 1) * WIND_BOX.x,
      y: WIND_BOX.yMin + hash(i * 2.9) * (WIND_BOX.yMax - WIND_BOX.yMin),
      z: (hash(i * 5.1) * 2 - 1) * WIND_BOX.z,
      v: 1.6 + hash(i * 7.3) * 1.2,
      len: 0.18 + hash(i * 9.7) * 0.3,
    }));
    return { sparkTex, smokeTex, emberTex, ember, spot, spotMat, char, charMat, puffs, streakGeo, streakPos, streakMat, streaks };
  }, []);
  useEffect(
    () => () => {
      res.sparkTex.dispose();
      res.smokeTex.dispose();
      res.emberTex.dispose();
      (res.ember.material as THREE.SpriteMaterial).dispose();
      res.spot.geometry.dispose();
      res.spotMat.dispose();
      res.charMat.dispose();
      res.puffs.forEach((p) => p.mat.dispose());
      res.streakGeo.dispose();
      res.streakMat.dispose();
    },
    [res],
  );

  useFrame((state, delta) => {
    const s = stateRef.current;
    const g = groupRef.current;
    if (!s || !g) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const fast = s.reducedMotion;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, DIORAMA_BASE_YAW + s.rotation, fast ? 30 : 10, dt);

    // Bara baru: catat saat jatuhnya, dan kosongkan asap bara sebelumnya.
    if ((drop?.id ?? null) !== seenId.current) {
      seenId.current = drop?.id ?? null;
      dropAt.current = drop ? t : null;
      for (const p of res.puffs) {
        p.born = -1;
        p.mat.opacity = 0;
      }
    }

    // Angin: garis-garis tipis yang melintas di atas petak.
    windRef.current = THREE.MathUtils.damp(windRef.current, wind === "berangin" ? 1 : 0, 3, dt);
    const w = windRef.current;
    res.streakMat.opacity = 0.32 * w;
    const pos = res.streakPos;
    res.streaks.forEach((k, i) => {
      if (!fast) k.x += k.v * dt;
      if (k.x > WIND_BOX.x) k.x -= WIND_BOX.x * 2;
      pos.set([k.x, k.y, k.z, k.x - k.len, k.y, k.z], i * 6);
    });
    (res.streakGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    // Bara: jatuh, lalu padam atau masuk ke gambut.
    const start = dropAt.current;
    const ember = res.ember;
    const emberMat = ember.material as THREE.SpriteMaterial;
    if (start === null || !drop) {
      ember.visible = false;
      res.spotMat.opacity = THREE.MathUtils.damp(res.spotMat.opacity, 0, 6, dt);
      res.spot.scale.setScalar(0.001);
      res.charMat.opacity = 0;
      return;
    }
    const age = fast ? Math.max(t - start, FALL_SEC + GROW_SEC) : t - start;
    const lit = drop.result === "menyala";
    ember.visible = true;
    if (age < FALL_SEC) {
      const k = age / FALL_SEC;
      ember.position.set(LAND.x - 0.12 * (1 - k) * w, DROP_FROM + (LAND.y + 0.03 - DROP_FROM) * k * k, LAND.z);
      emberMat.opacity = 1;
      ember.scale.setScalar(0.16);
      return;
    }
    const since = age - FALL_SEC;
    ember.position.set(LAND.x, LAND.y + 0.03, LAND.z);
    const flicker = 0.75 + 0.25 * Math.sin(t * 13) * Math.sin(t * 7.3);
    if (lit) {
      // Bara masuk ke gambut: bercaknya melebar pelan dan berpijar, lebih
      // terang bila diembus angin.
      const grow = Math.min(1, since / GROW_SEC);
      const r = 0.06 + (SPOT_RADIUS - 0.06) * (1 - (1 - grow) * (1 - grow));
      res.spot.scale.setScalar(r);
      res.char.scale.setScalar(r * 1.25);
      res.charMat.opacity = 0.78 * Math.min(1, since / 1.2);
      res.spotMat.opacity = (0.8 + 0.2 * w) * flicker;
      emberMat.opacity = 0.8 * flicker;
      ember.scale.setScalar(0.13 + 0.04 * w);
    } else {
      // Bara padam: meredup lalu hilang.
      const k = Math.min(1, since / FADE_SEC[wetness]);
      emberMat.opacity = (1 - k) * flicker;
      ember.scale.setScalar(0.16 * (1 - 0.6 * k));
      res.spot.scale.setScalar(0.001);
      res.spotMat.opacity = 0;
      res.charMat.opacity = 0;
    }

    // Asap tipis dari bara yang membara; uap putih singkat dari gambut basah
    // yang memadamkan bara; asap samar sebentar dari bara yang padam pelan.
    const steam = !lit && wetness === "basah";
    const emitting = lit || since < (steam ? 1.2 : FADE_SEC[wetness]);
    const interval = lit ? 0.32 : steam ? 0.09 : 0.45;
    const life = lit ? 3.6 : steam ? 1.2 : 2.2;
    res.puffs.forEach((p, i) => {
      if (p.born < 0 && emitting && !fast) {
        // Gumpal dilahirkan bergiliran, satu tiap `interval` detik.
        const slot = Math.floor(since / interval);
        if (slot % PUFFS === i) p.born = t;
      }
      if (p.born < 0) return;
      const a = (t - p.born) / life;
      if (a >= 1) {
        p.born = -1;
        p.mat.opacity = 0;
        return;
      }
      const rise = a * (lit ? 1.5 : steam ? 0.7 : 0.9);
      p.sprite.position.set(LAND.x + (p.seed - 0.5) * 0.1 + rise * rise * 0.9 * w, LAND.y + 0.05 + rise, LAND.z + (p.seed - 0.5) * 0.08);
      p.sprite.scale.setScalar(0.16 + a * (steam ? 0.4 : 0.75));
      p.mat.color.set(steam ? "#eef2f4" : lit ? "#b3aaa1" : "#9a928a");
      p.mat.opacity = Math.sin(Math.PI * a) * (lit ? 0.6 : steam ? 0.7 : 0.3);
    });
  });

  return (
    <group position={[0, DIORAMA_Y, 0]}>
      <group ref={groupRef}>
        <PeatBlock stateRef={stateRef} onHoverLayer={noop} onSelectLayer={noop} />
        <primitive object={res.char} />
        <primitive object={res.spot} />
        <primitive object={res.ember} />
        {res.puffs.map((p, i) => (
          <primitive key={i} object={p.sprite} />
        ))}
      </group>
      {/* Angin tidak ikut berputar bersama petak: arahnya tetap di layar. */}
      <lineSegments geometry={res.streakGeo} material={res.streakMat} frustumCulled={false} />
    </group>
  );
}

function noop() {}
