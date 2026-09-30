"use client";

import { useEffect } from "react";
import * as THREE from "three";
import { useLoader, useThree } from "@react-three/fiber";

/**
 * Latar foto hutan rawa berkabut di belakang diorama. Diskalakan seperti CSS
 * `background-size: cover` agar tidak gepeng di layar lebar maupun di ponsel.
 * Dipakai bersama oleh semua modul section Gambut.
 */
export default function Backdrop({ src = "/textures/gambut/latar_hutan.webp" }: { src?: string }) {
  const texture = useLoader(THREE.TextureLoader, src);
  const scene = useThree((s) => s.scene);
  const size = useThree((s) => s.size);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    const image = texture.image as { width: number; height: number };
    const imageAspect = image.width / image.height;
    const screenAspect = size.width / Math.max(1, size.height);
    if (screenAspect > imageAspect) {
      texture.repeat.set(1, imageAspect / screenAspect);
      texture.offset.set(0, (1 - texture.repeat.y) / 2);
    } else {
      texture.repeat.set(screenAspect / imageAspect, 1);
      texture.offset.set((1 - texture.repeat.x) / 2, 0);
    }
    scene.background = texture;
    return () => {
      scene.background = null;
    };
  }, [texture, scene, size]);

  return null;
}
