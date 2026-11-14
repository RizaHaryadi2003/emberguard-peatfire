import * as THREE from "three";
import { NOISE_GLSL } from "@/components/modul/shared/scene/noiseTexture";

// Bahan air Modul Hutan Rawa: sungai gambut dan air banjirnya.
//
// Rancangan sebelumnya memakai satu warna rata untuk keduanya, sehingga
// sungai terbaca sebagai balok kaca dan banjir sebagai lempeng kelabu yang
// naik turun. Di sini air diberi tiga hal yang membuatnya terbaca sebagai
// air:
//
//   1. Permukaan beriak yang bergerak searah aliran. Riaknya hanya mengubah
//      arah normal, jadi pantulan langit dan kilau matahari ikut bergetar,
//      tanpa menambah satu segitiga pun.
//   2. Makin dalam makin pekat. Muka potong air tampak terang di dekat
//      permukaan dan gelap di dasarnya, seperti air yang menyerap cahaya.
//   3. Untuk banjir: buih di garis pantai, tempat air menyentuh lereng
//      kubah, dan lumpur yang melayang. Itulah yang membedakannya dari air
//      sungai yang jernih kehitaman.
//
// Warna sungai mengikuti sungai gambut sungguhan: air hitam berwarna teh
// pekat karena asam humat yang larut dari gambut. Air banjir lebih keruh dan
// kecoklatan karena membawa lumpur dari hulu.

export type WaterKind = "river" | "flood";

const LOOK = {
  river: { surface: [0.24, 0.15, 0.08], deep: [0.07, 0.04, 0.02], murk: 0.15, flow: [0, -0.35], foam: 0, env: 0.45 },
  flood: { surface: [0.4, 0.33, 0.22], deep: [0.2, 0.16, 0.1], murk: 0.5, flow: [0.25, -0.12], foam: 1, env: 0.25 },
} as const;

/**
 * Warna di LOOK ditulis dalam sRGB (seperti yang dilihat mata), sedangkan
 * peneduh menghitung dalam ruang linear; tanpa konversi ini airnya tampil
 * jauh lebih pucat daripada yang dimaksud.
 */
const vec3 = (v: readonly number[]) => {
  const c = new THREE.Color().setRGB(v[0], v[1], v[2], THREE.SRGBColorSpace);
  return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`;
};

export type WaterUniforms = {
  time: { value: number };
  /** Muka air sekarang (y dunia). */
  level: { value: number };
};
export type WaterMaterial = THREE.MeshStandardMaterial & WaterUniforms;

/**
 * `ground` adalah tekstur satu baris berisi tinggi tanah (m, dibagi 16)
 * sepanjang [x0, x0 + span], dipakai banjir untuk menemukan garis pantai.
 */
export function createWaterMaterial(kind: WaterKind, noise: THREE.Texture, ground?: { texture: THREE.Texture; x0: number; span: number }): WaterMaterial {
  const L = LOOK[kind];
  const material = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.1,
    metalness: 0,
    envMapIntensity: L.env,
    transparent: true,
    depthWrite: kind === "river",
  }) as WaterMaterial;
  const time = { value: 0 };
  const level = { value: 0 };
  Object.assign(material, { time, level });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uNoise: { value: noise },
      uTime: time,
      uLevel: level,
      uGround: { value: ground?.texture ?? noise },
      uGroundX: { value: new THREE.Vector2(ground?.x0 ?? 0, ground?.span ?? 1) },
    });
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWaterWorld;\nvarying vec3 vWaterNormal;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
         vWaterWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
         vWaterNormal = normalize(mat3(modelMatrix) * objectNormal);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
         uniform float uTime;
         uniform float uLevel;
         uniform sampler2D uGround;
         uniform vec2 uGroundX;
         varying vec3 vWaterWorld;
         varying vec3 vWaterNormal;
         float kWaterRough = 0.1;
         ${NOISE_GLSL}

         /** Tinggi riak di titik p (satuan adegan), bergerak searah aliran. */
         float kWave(vec2 p) {
           vec2 flow = vec2(${L.flow[0].toFixed(3)}, ${L.flow[1].toFixed(3)}) * uTime;
           return kNoise(p * 0.9 + flow) * 0.6 + kNoise(p * 2.3 - flow * 1.7 + 7.0) * 0.4;
         }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
         float kTop = step(0.5, vWaterNormal.y);
         float kDepth = max(0.0, uLevel - vWaterWorld.y);
         // Makin dalam makin pekat.
         vec3 kCol = mix(${vec3(L.surface)}, ${vec3(L.deep)}, smoothstep(0.0, 2.2, kDepth));
         // Lumpur melayang: awan pucat yang hanyut pelan.
         float kSilt = kNoise(vWaterWorld.xy * vec2(0.35, 1.4) + vec2(uTime * 0.12, 0.0));
         kCol *= 1.0 + (kSilt - 0.5) * ${L.murk.toFixed(2)} * (1.0 - kTop * 0.6);
         float kAlpha = mix(0.8, 0.95, smoothstep(0.0, 1.2, kDepth));
         ${
           L.foam
             ? `// Buih di garis pantai: air yang tinggal sejengkal di atas lereng.
         float kGx = clamp((vWaterWorld.x - uGroundX.x) / uGroundX.y, 0.0, 1.0);
         float kGround = texture2D(uGround, vec2(kGx, 0.5)).r * 16.0;
         float kShallow = uLevel - kGround;
         float kFoamN = kNoise(vWaterWorld.xz * 2.2 + vec2(uTime * 0.4, 0.0));
         float kFoam = (1.0 - smoothstep(0.0, 0.25, kShallow + (kFoamN - 0.5) * 0.25)) * kTop * step(0.55, kFoamN + 0.2);
         kCol = mix(kCol, ${vec3([0.72, 0.68, 0.6])}, kFoam * 0.8);
         kAlpha = max(kAlpha * mix(0.55, 1.0, smoothstep(0.0, 0.6, kShallow)), kFoam * 0.9);`
             : ""
         }
         diffuseColor.rgb = kCol;
         diffuseColor.a *= kAlpha;
         kWaterRough = mix(0.45, 0.06, kTop);`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
         if (vWaterNormal.y > 0.5) {
           // Riak permukaan dari selisih tinggi riak di tiga titik.
           float e = 0.15;
           float h0 = kWave(vWaterWorld.xz);
           float hx = kWave(vWaterWorld.xz + vec2(e, 0.0));
           float hz = kWave(vWaterWorld.xz + vec2(0.0, e));
           vec3 kN = normalize(vec3(-(hx - h0) / e * 0.35, 1.0, -(hz - h0) / e * 0.35));
           normal = normalize((viewMatrix * vec4(kN, 0.0)).xyz);
         }`,
      )
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n roughnessFactor = kWaterRough;");
  };
  material.customProgramCacheKey = () => `hutan-water-${kind}`;
  return material;
}

/** Tekstur satu baris berisi tinggi tanah, untuk garis pantai banjir. */
export function createGroundTexture(heightAt: (x: number) => number, x0: number, span: number, size = 256): THREE.DataTexture {
  const data = new Uint8Array(size * 4);
  for (let i = 0; i < size; i++) {
    const h = Math.max(0, Math.min(255, Math.round((heightAt(x0 + (span * i) / (size - 1)) / 16) * 255)));
    data.set([h, h, h, 255], i * 4);
  }
  const tex = new THREE.DataTexture(data, size, 1, THREE.RGBAFormat);
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}
