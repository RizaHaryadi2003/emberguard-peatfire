"use client";

import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createWallDetails } from "@/components/modul/scene/wallDetails";
import type { BaraState, Subsidence } from "./baraState";

/** Detail sedekat ini dengan bidang potong disingkirkan agar tidak menembusnya (m). */
const CUT_MARGIN = 0.15;

/** Tanah yang melesak sejauh ini sudah membawa pergi akar di dindingnya (m). */
const LOST_AT = 0.04;

type Props = {
  stateRef: RefObject<BaraState>;
  subsidence: Subsidence;
};

/**
 * Akar dan kerikil di dinding bongkahan: susunan yang sama dengan Modul 01,
 * dikurangi yang berada pada separuh depan yang sudah dipotong.
 */
export default function WallDetails({ stateRef, subsidence }: Props) {
  const [branchG, stoneG] = useLoader(GLTFLoader, ["/models/gambut/ranting.glb", "/models/gambut/batu.glb"]);
  const details = useMemo(
    () =>
      Object.values(createWallDetails(branchG.scene, stoneG.scene))
        .flat()
        .filter((obj) => obj.position.z < -CUT_MARGIN),
    [branchG, stoneG],
  );

  const groupRef = useRef<THREE.Group>(null);
  const built = useRef(-1);

  useFrame(() => {
    const s = stateRef.current;
    const group = groupRef.current;
    if (!s || !group) return;
    // Citra termal hanya membaca suhu, jadi rupa akar dan batu tidak ditampilkan.
    group.visible = s.thermal < 0.5;
    if (built.current === subsidence.version) return;
    built.current = subsidence.version;
    for (const obj of details) obj.visible = subsidence.fn(obj.position.x) < LOST_AT;
  });

  return (
    <group ref={groupRef}>
      {details.map((obj) => (
        <primitive key={obj.uuid} object={obj} />
      ))}
    </group>
  );
}
