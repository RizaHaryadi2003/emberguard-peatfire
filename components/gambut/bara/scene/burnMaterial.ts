import type * as THREE from "three";

// Tumbuhan yang terbakar bertahap, bukan sekadar berubah hitam.
//
// Daun mencokelat, menghitam, lalu habis berkelompok dari bawah ke atas. Batang
// menghitam mulai dari pangkal. Tepi yang sedang termakan api berpijar sebentar.
//
// Efek ini hanya rupa dan tidak menyampaikan klaim ilmiah. Biayanya dijaga
// rendah: pola acaknya dihitung per titik model, bukan per piksel, sehingga
// tiap piksel hanya mengerjakan beberapa perbandingan.

export type BurnKind = "bark" | "foliage";

export type BurnUniforms = {
  /** Tingkat terbakar tumbuhan (0–1). */
  uBurn: THREE.IUniform<number>;
  /** Kekuatan pijar di tepi yang sedang terbakar (0–1). */
  uBurnGlow: THREE.IUniform<number>;
  /** Tinggi model dalam satuan lokalnya. */
  uBurnHeight: THREE.IUniform<number>;
  /** Skala model, agar kelompok daun yang habis berukuran sama pada semua tumbuhan. */
  uBurnScale: THREE.IUniform<number>;
  /** Tampilan termal (0–1): warna hangus dan pijar tidak ikut tampil di sana. */
  uBurnThermal: THREE.IUniform<number>;
};

export function createBurnUniforms(localHeight: number, scale: number): BurnUniforms {
  return {
    uBurn: { value: 0 },
    uBurnGlow: { value: 0 },
    uBurnHeight: { value: Math.max(localHeight, 0.01) },
    uBurnScale: { value: scale },
    uBurnThermal: { value: 0 },
  };
}

const VERTEX_HEAD = /* glsl */ `
uniform float uBurnHeight;
uniform float uBurnScale;
varying float vBurnH;
varying float vBurnN;
float burnHash(vec3 p) {
  return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
}
`;

const VERTEX_BODY = /* glsl */ `
vBurnH = clamp(position.y / uBurnHeight, 0.0, 1.0);
vec3 burnCell = position * uBurnScale;
vBurnN = 0.6 * burnHash(floor(burnCell * 5.0)) + 0.4 * burnHash(floor(burnCell * 13.0));
`;

const FRAGMENT_HEAD = /* glsl */ `
uniform float uBurn;
uniform float uBurnGlow;
uniform float uBurnThermal;
varying float vBurnH;
varying float vBurnN;
`;

const FRAGMENT_FOLIAGE = /* glsl */ `
float burnS = clamp(uBurn * 1.3 - vBurnH * 0.3 + (vBurnN - 0.5) * 0.5, 0.0, 1.0);
if (burnS > 0.62) discard;
float burnLuma = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
vec3 burnBrown = vec3(0.62, 0.38, 0.14) * (burnLuma * 1.4 + 0.08);
vec3 burnColor = mix(burnBrown, vec3(0.03, 0.026, 0.024), smoothstep(0.4, 0.62, burnS));
float burnMix = smoothstep(0.05, 0.4, burnS) * (1.0 - uBurnThermal);
float burnEdge = smoothstep(0.4, 0.6, burnS);
diffuseColor.rgb = mix(diffuseColor.rgb, burnColor, burnMix);
`;

const FRAGMENT_BARK = /* glsl */ `
float burnS = clamp(uBurn * 1.7 - vBurnH * 0.9 + (vBurnN - 0.5) * 0.3, 0.0, 1.0);
vec3 burnColor = vec3(0.03, 0.026, 0.024) + smoothstep(0.75, 1.0, vBurnN) * 0.06;
float burnMix = smoothstep(0.1, 0.8, burnS) * (1.0 - uBurnThermal);
float burnEdge = smoothstep(0.2, 0.45, burnS) * (1.0 - smoothstep(0.45, 0.8, burnS)) * smoothstep(0.6, 0.95, vBurnN);
diffuseColor.rgb = mix(diffuseColor.rgb, burnColor, burnMix);
`;

const EMISSIVE = /* glsl */ `
totalEmissiveRadiance += vec3(3.0, 0.8, 0.1) * burnEdge * uBurnGlow * (1.0 - uBurnThermal);
`;

/** Sisipkan tahapan terbakar ke sumber peneduh `MeshStandardMaterial`. */
export function injectBurn(vertexShader: string, fragmentShader: string, kind: BurnKind) {
  return {
    vertexShader: vertexShader
      .replace("#include <common>", `#include <common>\n${VERTEX_HEAD}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\n${VERTEX_BODY}`),
    fragmentShader: fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAGMENT_HEAD}`)
      .replace("#include <map_fragment>", `#include <map_fragment>\n${kind === "foliage" ? FRAGMENT_FOLIAGE : FRAGMENT_BARK}`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\n${EMISSIVE}`),
  };
}

/** Pasang tahapan terbakar pada satu material; `uniforms` dipakai bersama satu tumbuhan. */
export function applyBurn(material: THREE.MeshStandardMaterial, uniforms: BurnUniforms, kind: BurnKind): void {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    const injected = injectBurn(shader.vertexShader, shader.fragmentShader, kind);
    shader.vertexShader = injected.vertexShader;
    shader.fragmentShader = injected.fragmentShader;
  };
  // Semua tumbuhan sejenis memakai satu program; nilainya berbeda lewat uniform.
  material.customProgramCacheKey = () => `bara-burn-${kind}`;
}
