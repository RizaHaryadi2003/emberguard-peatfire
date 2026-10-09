"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { seeded } from "@/lib/random";
import { BLOCK_WIDTH, type BaraState, type Subsidence } from "./baraState";
import { surfaceYAt } from "./crossSection";

// Air siraman yang benar-benar terlihat.
//
// Sebelumnya menyiram hanya memutihkan asap menjadi uap, sehingga pembaca
// menekan tombol "Siram" dan tidak melihat apa pun turun. Padahal justru
// babak inilah yang harus membuatnya merasa sudah berhasil memadamkan —
// perasaan yang kemudian dibantah oleh citra termal. Tanpa air yang kelihatan,
// kejutan itu hilang.
//
// Dibuat sebagai bilah tipis memanjang, bukan titik bulat, karena air yang
// jatuh cepat terbaca sebagai goresan. Semua bilah menghadap +z; kamera modul
// ini selalu berada di depan bidang potong, jadi tidak perlu diputar
// mengikuti kamera.

/** Jumlah bilah air. Cukup rapat untuk terbaca sebagai curahan, bukan tetesan. */
const DROP_COUNT = 220;

/** Ketinggian tempat air mulai jatuh (m di atas permukaan). */
const SPAWN_HIGH = 2.6;
const SPAWN_LOW = 1.5;

/** Laju jatuh (m/detik). */
const FALL_MIN = 3.2;
const FALL_MAX = 5.4;

type Drop = { x: number; z: number; y: number; speed: number };

type Props = {
  stateRef: RefObject<BaraState>;
  subsidence: Subsidence;
};

export default function WaterSpray({ stateRef, subsidence }: Props) {
  const res = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#bcdcff"),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    return { geometry, material };
  }, []);

  useEffect(
    () => () => {
      res.geometry.dispose();
      res.material.dispose();
    },
    [res],
  );

  // Acak yang dapat diulang, sama seperti tata letak tumbuhan dan batu, supaya
  // tangkapan layar untuk naskah skripsi dapat direproduksi.
  const rand = useMemo(() => seeded(21), []);

  /** Tempatkan satu bilah di ketinggian acak di atas bongkahan. */
  const respawn = (d: Drop) => {
    d.x = (rand() - 0.5) * BLOCK_WIDTH * 0.94;
    d.z = -rand() * 1.1;
    d.y = SPAWN_LOW + rand() * (SPAWN_HIGH - SPAWN_LOW);
    d.speed = FALL_MIN + rand() * (FALL_MAX - FALL_MIN);
  };

  /** Keadaan tiap bilah. Disebar sejak awal agar curahan tidak datang serempak. */
  const drops = useMemo<Drop[]>(() => {
    const list = Array.from({ length: DROP_COUNT }, () => ({ x: 0, z: 0, y: 0, speed: FALL_MIN }));
    list.forEach(respawn);
    return list;
    // `respawn` hanya bergantung pada `rand` yang tetap selama komponen hidup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rand]);

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, delta) => {
    const s = stateRef.current;
    const mesh = meshRef.current;
    if (!s || !mesh) return;
    const dt = Math.min(delta, 0.05);

    // Kuat saat tombol baru ditekan, lalu menipis mengikuti sisa air di permukaan.
    const amount = Math.min(1, s.spray);
    if (amount <= 0.01) {
      if (mesh.visible) mesh.visible = false;
      return;
    }
    mesh.visible = true;
    res.material.opacity = 0.34 + 0.46 * amount;

    for (let i = 0; i < DROP_COUNT; i++) {
      const d = drops[i];
      d.y -= d.speed * dt;
      // Begitu menyentuh permukaan tanah, bilah lahir kembali di atas.
      const ground = surfaceYAt(d.x, d.z, subsidence.fn);
      if (d.y < ground) respawn(d);
      // Bilah memanjang mengikuti lajunya, sehingga yang jatuh cepat tampak
      // sebagai goresan yang lebih panjang.
      dummy.position.set(d.x, d.y, d.z);
      dummy.scale.set(0.015, 0.07 * d.speed, 1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[res.geometry, res.material, DROP_COUNT]}
      visible={false}
      frustumCulled={false}
    />
  );
}
