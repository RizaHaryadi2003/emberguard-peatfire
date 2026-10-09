"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { createFigureTexture } from "@/components/gambut/scene/proceduralTextures";
import { surfaceYAt } from "./crossSection";
import type { Subsidence } from "./baraState";

// Patokan ukuran: seorang berdiri di atas bongkahan.
//
// Bongkahan ini selebar 4,4 m dan sedalam 3,4 m, tetapi tidak ada apa pun di
// layar yang mengatakannya. Tanpa patokan, pembaca tidak tahu apakah yang
// dilihatnya seember tanah atau sepetak lahan — dan karenanya tidak dapat
// menilai apakah bara sedalam 94 cm itu dangkal atau dalam.
//
// Sosok setinggi 1,7 m menjawab itu seketika, tanpa satu kata pun.

/**
 * Tinggi sosok (m) dan letaknya.
 *
 * Berdiri di samping bongkahan, bukan di atasnya. Sempat ditaruh di atas
 * permukaan dan hasilnya tertelan rimbun pohon serta tumbuhan bawah —
 * patokan ukuran yang tidak terlihat sama sekali tidak ada gunanya. Di
 * samping, siluetnya jatuh di latar kabut yang kosong dan langsung terbaca,
 * dan hubungannya dengan bongkahan tetap jelas karena kakinya berpijak pada
 * ketinggian permukaan yang sama.
 */
const FIGURE_HEIGHT = 1.7;
export const FIGURE_X = 2.95;
export const FIGURE_Z = -0.15;

export default function ScaleFigure({ subsidence }: { subsidence: Subsidence }) {
  const res = useMemo(() => {
    const map = createFigureTexture();
    return {
      map,
      geometry: new THREE.PlaneGeometry(FIGURE_HEIGHT / 2, FIGURE_HEIGHT),
      material: new THREE.MeshBasicMaterial({
        map,
        transparent: true,
        // Abu kehitaman yang hangat, bukan hitam pekat: sosok ini bayangan
        // penunjuk ukuran, bukan lubang pada gambar.
        color: new THREE.Color("#2b231b"),
        opacity: 0.9,
        depthWrite: false,
        toneMapped: false,
      }),
    };
  }, []);

  useEffect(
    () => () => {
      res.map.dispose();
      res.geometry.dispose();
      res.material.dispose();
    },
    [res],
  );

  const ref = useRef<THREE.Mesh>(null);
  const built = useRef(-1);
  const toCamera = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;

    // Ikut melesak bersama tanah yang dipijaknya.
    if (built.current !== subsidence.version) {
      built.current = subsidence.version;
      mesh.position.y = surfaceYAt(FIGURE_X, FIGURE_Z, subsidence.fn) + FIGURE_HEIGHT / 2;
    }

    // Selalu menghadap kamera pada sumbu tegak saja, supaya tetap berdiri
    // tegak saat diorama diputar dan tidak pernah terlihat setipis kertas.
    mesh.getWorldPosition(toCamera);
    toCamera.subVectors(state.camera.position, toCamera);
    mesh.rotation.y = Math.atan2(toCamera.x, toCamera.z) - (mesh.parent?.rotation.y ?? 0);
  });

  return (
    <mesh
      ref={ref}
      geometry={res.geometry}
      material={res.material}
      position={[FIGURE_X, FIGURE_HEIGHT / 2, FIGURE_Z]}
      frustumCulled={false}
    />
  );
}
