"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { createNoiseTexture, NOISE_GLSL } from "@/components/modul/scene/noiseTexture";
import { BLOCK_WIDTH, type BaraState } from "./baraState";

// Nyala singkat di permukaan saat gambut disulut. Hanya satu bidang dengan
// peneduh ringan, dan sama sekali tidak digambar di luar saat penyulutan.

const FLAME_WIDTH = 1.0;
const FLAME_HEIGHT = 1.35;

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uLevel;
varying vec2 vUv;

${NOISE_GLSL}

void main() {
  float y = vUv.y;
  float wave = kFbm(vec2(vUv.x * 5.0, y * 5.0 - uTime * 3.2));
  float lick = kFbm(vec2(vUv.x * 13.0 + 9.0, y * 9.0 - uTime * 5.1));
  float x = (vUv.x - 0.5) * 2.0 + (wave - 0.5) * 0.7 * y;

  // Lebar di dasar, meruncing ke atas, dan tingginya naik turun mengikuti derau.
  float reach = 0.45 + wave * 0.55;
  float span = mix(0.62, 0.03, pow(clamp(y / reach, 0.0, 1.0), 0.75));
  float shape = 1.0 - smoothstep(span * 0.25, span, abs(x));
  shape *= smoothstep(0.0, 0.06, y) * (1.0 - smoothstep(reach * 0.7, reach, y));
  shape *= 0.65 + 0.7 * lick;

  // Nyala sungguhan kuning di inti, jingga di tubuh, dan merah di ujung.
  vec3 color = mix(vec3(0.75, 0.13, 0.02), vec3(1.0, 0.42, 0.05), smoothstep(0.1, 0.5, shape));
  color = mix(color, vec3(1.0, 0.8, 0.38), smoothstep(0.55, 1.0, shape));
  gl_FragColor = vec4(color * shape * uLevel * 1.5, clamp(shape * uLevel, 0.0, 1.0));
}
`;

export default function SurfaceFlame({ stateRef }: { stateRef: RefObject<BaraState> }) {
  const res = useMemo(() => {
    const noise = createNoiseTexture();
    const geometry = new THREE.PlaneGeometry(FLAME_WIDTH, FLAME_HEIGHT);
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 }, uLevel: { value: 0 }, uNoise: { value: noise } },
    });
    return { noise, geometry, material };
  }, []);

  useEffect(
    () => () => {
      res.noise.dispose();
      res.geometry.dispose();
      res.material.dispose();
    },
    [res],
  );

  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const s = stateRef.current;
    const mesh = meshRef.current;
    if (!s || !mesh) return;
    mesh.visible = s.flame > 0.01;
    if (!mesh.visible) return;
    res.material.uniforms.uLevel.value = Math.min(1, s.flame * 1.4);
    res.material.uniforms.uTime.value = s.reducedMotion ? 0 : state.clock.elapsedTime;
    mesh.position.x = (s.flameX - 0.5) * BLOCK_WIDTH;
    // Bidang selalu menghadap kamera, terlepas dari putaran bongkahan.
    mesh.rotation.y = Math.atan2(state.camera.position.x, state.camera.position.z) - (mesh.parent?.rotation.y ?? 0);
  });

  return (
    <mesh
      ref={meshRef}
      geometry={res.geometry}
      material={res.material}
      position={[0, FLAME_HEIGHT / 2 - 0.02, -0.25]}
      visible={false}
      frustumCulled={false}
    />
  );
}
