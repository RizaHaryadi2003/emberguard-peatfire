"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { seeded } from "@/lib/random";
import { BLOCK_WIDTH, type BaraState, type Subsidence } from "./baraState";
import { surfaceYAt } from "./crossSection";

// Air siraman yang benar-benar terlihat, berupa curahan seperti hujan.
//
// Babak ini harus membuat pembaca merasa sudah berhasil memadamkan — perasaan
// yang kemudian dibantah oleh citra termal. Tanpa air yang kelihatan, kejutan
// itu hilang. Goresan hujan digambar sekaligus dalam satu panggilan gambar,
// dan cipratannya dalam satu panggilan lagi.

/** Jumlah goresan air. Cukup rapat untuk terbaca sebagai curahan. */
const DROP_COUNT = 220;

/** Jumlah cipratan yang dapat tampil bersamaan. */
const SPLASH_COUNT = 64;

/** Ketinggian tempat air mulai jatuh (m di atas permukaan). */
const SPAWN_HIGH = 5.2;
const SPAWN_LOW = 3.4;

/** Laju jatuh (m/detik). */
const FALL_MIN = 5.5;
const FALL_MAX = 8;

/** Kemiringan hujan oleh angin (m ke samping per m jatuh). */
const WIND = 0.08;

/** Lama cipratan terlihat (detik). */
const SPLASH_LIFE = 0.22;

type Drop = { x: number; z: number; y: number; speed: number };
type Splash = { life: number; x: number; y: number; z: number };

type Props = {
  stateRef: RefObject<BaraState>;
  subsidence: Subsidence;
};

/** Gradasi memanjang: goresan air memudar ke kedua ujungnya. */
function createStreakAlpha(): THREE.DataTexture {
  const size = 32;
  const data = new Uint8Array(size * 4);
  for (let i = 0; i < size; i++) {
    const v = Math.round(Math.pow(Math.sin((Math.PI * (i + 0.5)) / size), 1.5) * 255);
    data.set([v, v, v, 255], i * 4);
  }
  const texture = new THREE.DataTexture(data, 1, size, THREE.RGBAFormat);
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export default function WaterSpray({ stateRef, subsidence }: Props) {
  const res = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const alphaMap = createStreakAlpha();
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#d8e8f5"),
      alphaMap,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    const splashGeometry = new THREE.BufferGeometry();
    splashGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SPLASH_COUNT * 3), 3));
    splashGeometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(SPLASH_COUNT * 3), 3));
    const splashMaterial = new THREE.PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    return { geometry, alphaMap, material, splashGeometry, splashMaterial };
  }, []);

  useEffect(
    () => () => {
      res.geometry.dispose();
      res.alphaMap.dispose();
      res.material.dispose();
      res.splashGeometry.dispose();
      res.splashMaterial.dispose();
    },
    [res],
  );

  // Acak yang dapat diulang, sama seperti tata letak tumbuhan dan batu, supaya
  // tangkapan layar untuk naskah skripsi dapat direproduksi.
  const rand = useMemo(() => seeded(21), []);

  /** Tempatkan satu goresan di ketinggian acak di atas bongkahan. */
  const respawn = (d: Drop) => {
    d.x = (rand() - 0.5) * BLOCK_WIDTH;
    d.z = -rand() * 1.25;
    d.y = SPAWN_LOW + rand() * (SPAWN_HIGH - SPAWN_LOW);
    d.speed = FALL_MIN + rand() * (FALL_MAX - FALL_MIN);
  };

  /** Keadaan tiap goresan. Disebar sejak awal agar curahan tidak datang serempak. */
  const drops = useMemo<Drop[]>(() => {
    const list = Array.from({ length: DROP_COUNT }, () => ({ x: 0, z: 0, y: 0, speed: FALL_MIN }));
    list.forEach(respawn);
    return list;
    // `respawn` hanya bergantung pada `rand` yang tetap selama komponen hidup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rand]);

  const splashes = useMemo<Splash[]>(
    () => Array.from({ length: SPLASH_COUNT }, () => ({ life: 0, x: 0, y: 0, z: 0 })),
    [],
  );
  const nextSplash = useRef(0);

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state, delta) => {
    const s = stateRef.current;
    const mesh = meshRef.current;
    const points = pointsRef.current;
    if (!s || !mesh || !points) return;
    const dt = Math.min(delta, 0.05);

    // Kuat saat tombol baru ditekan, lalu menipis mengikuti sisa air di permukaan.
    const amount = Math.min(1, s.spray);
    if (amount <= 0.01) {
      if (mesh.visible) {
        mesh.visible = false;
        points.visible = false;
      }
      return;
    }
    mesh.visible = true;
    points.visible = true;
    res.material.opacity = 0.16 + 0.3 * amount;

    // Goresan selalu menghadap kamera, terlepas dari putaran bongkahan.
    const facing = Math.atan2(state.camera.position.x, state.camera.position.z) - (mesh.parent?.rotation.y ?? 0);

    for (let i = 0; i < DROP_COUNT; i++) {
      const d = drops[i];
      d.y -= d.speed * dt;
      d.x += d.speed * WIND * dt;
      // Begitu menyentuh permukaan tanah, goresan menjadi cipratan lalu lahir kembali.
      const ground = surfaceYAt(d.x, d.z, subsidence.fn);
      if (d.y < ground) {
        const splash = splashes[nextSplash.current];
        nextSplash.current = (nextSplash.current + 1) % SPLASH_COUNT;
        splash.life = SPLASH_LIFE;
        splash.x = d.x;
        splash.y = ground + 0.03;
        splash.z = d.z;
        respawn(d);
      }
      dummy.position.set(d.x, d.y, d.z);
      dummy.scale.set(0.008, 0.05 * d.speed, 1);
      dummy.rotation.set(0, facing, -WIND);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    const position = res.splashGeometry.attributes.position as THREE.BufferAttribute;
    const color = res.splashGeometry.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < SPLASH_COUNT; i++) {
      const splash = splashes[i];
      splash.life = Math.max(0, splash.life - dt);
      const fade = (splash.life / SPLASH_LIFE) * amount;
      // Cipratan melompat sedikit lalu padam.
      position.setXYZ(i, splash.x, splash.y + (SPLASH_LIFE - splash.life) * 0.5, splash.z);
      color.setXYZ(i, fade * 0.7, fade * 0.8, fade * 0.9);
    }
    position.needsUpdate = true;
    color.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[res.geometry, res.material, DROP_COUNT]}
        visible={false}
        frustumCulled={false}
      />
      <points ref={pointsRef} geometry={res.splashGeometry} material={res.splashMaterial} visible={false} frustumCulled={false} />
    </group>
  );
}
