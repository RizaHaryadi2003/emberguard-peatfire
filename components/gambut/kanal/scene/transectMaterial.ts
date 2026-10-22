import * as THREE from "three";
import { PEAT_LAYERS, PROFILE_DEPTH, type PeatLayerId } from "@/lib/peat";
import { PEAT_LAYER_TINT, WET_DARKEN } from "@/components/gambut/scene/dioramaConstants";
import { COLUMNS, WATER_LIMIT_M } from "@/lib/drainage";

// Peneduh bidang potong Modul 03.
//
// Tugasnya berbeda dari peneduh Modul 02. Di sana yang digambar adalah
// kejadian: bara yang berpijar, rongga abu yang melesak, asap. Di sini yang
// digambar adalah keadaan — sampai sedalam apa gambut masih jenuh air, dan di
// mana batas 40 cm itu dilewati. Jadi tidak ada yang berdenyut atau berkedip,
// dan hampir seluruh isinya dapat dibaca sebagai bagan.
//
// Dibaca dari satu tekstur data selebar jumlah kolom simulasi dan setinggi
// satu piksel: R = penurunan permukaan, G = kedalaman muka air, B = melewati
// batas 40 cm. Semuanya sebagai bagian dari kedalaman profil, sehingga
// peneduh tidak perlu tahu meternya.

/** Rona satu lapisan sebagai tetapan GLSL, dibaca dari daftar bersama. */
function tintGlsl(id: PeatLayerId): string {
  return PEAT_LAYER_TINT[id].map((v) => v.toFixed(3)).join(", ");
}

const VERTEX = /* glsl */ `
attribute float aDepth;

varying vec2 vUv;
varying float vDepth;
varying vec3 vWorld;

#include <fog_pars_vertex>

void main() {
  vUv = uv;
  vDepth = aDepth;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAGMENT = /* glsl */ `
uniform sampler2D uColor0;
uniform sampler2D uColor1;
uniform sampler2D uColor2;
uniform sampler2D uColor3;
uniform sampler2D uField;

uniform vec3 uBounds;      // kedalaman batas fibrik/hemik, hemik/saprik, saprik/mineral (m)
uniform float uProfile;    // kedalaman seluruh profil (m)
uniform float uDryTint;    // kekuatan penandaan daerah rawan (0-1)
uniform vec3 uAmbient;
uniform float uSunIntensity;

varying vec2 vUv;
varying float vDepth;
varying vec3 vWorld;

#include <fog_pars_fragment>

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

/** Bobot tiap lapisan pada kedalaman d, dengan peralihan yang lembut. */
vec4 layerWeights(float d) {
  float w = 0.07;
  float b0 = smoothstep(uBounds.x - w, uBounds.x + w, d);
  float b1 = smoothstep(uBounds.y - w, uBounds.y + w, d);
  float b2 = smoothstep(uBounds.z - w, uBounds.z + w, d);
  return vec4(1.0 - b0, b0 - b1, b1 - b2, b2);
}

vec3 tintFor(vec4 w) {
  return w.x * vec3(${tintGlsl("fibrik")}) + w.y * vec3(${tintGlsl("hemik")}) +
         w.z * vec3(${tintGlsl("saprik")}) + w.w * vec3(${tintGlsl("mineral")});
}

void main() {
  // Keadaan kolom ini. Tekstur datanya setinggi satu piksel, jadi koordinat
  // tegaknya tetap 0,5 — yang dibaca hanya kedudukan mendatarnya.
  vec4 field = texture2D(uField, vec2(vUv.x, 0.5));
  float waterDepth = field.g * uProfile;
  float risk = field.b;

  // --- Warna dasar gambut: campuran empat tekstur lapisan menurut kedalaman.
  //
  // Tekstur diulang menurut satuan adegan, bukan menurut meter lanskap. Pada
  // pembesaran 100x, pengulangan menurut meter akan terhimpit menjadi garis
  // tegak yang rapat — tanahnya berubah menjadi kain bergaris.
  vec2 uvT = vec2(vWorld.x * 1.2, vWorld.y * 1.2);
  vec4 w = layerWeights(vDepth);
  vec3 albedo =
    texture2D(uColor0, uvT).rgb * w.x +
    texture2D(uColor1, uvT).rgb * w.y +
    texture2D(uColor2, uvT).rgb * w.z +
    texture2D(uColor3, uvT).rgb * w.w;
  albedo *= tintFor(w);

  // Ragam skala besar supaya tekstur foto tidak tampak berulang, ditambah
  // guratan mendatar mengikuti arah pengendapan bahan organik — paling jelas
  // di fibrik yang seratnya masih utuh.
  float mottle = noise(uvT * 0.5) * 0.45 + noise(uvT * 1.6) * 0.25;
  float bedding = noise(vec2(vWorld.x * 0.7, vWorld.y * 16.0));
  float fibrous = w.x * 1.0 + w.y * 0.6 + w.z * 0.25 + w.w * 0.15;
  albedo *= 0.8 + mottle * 0.46;
  albedo *= 1.0 + (bedding - 0.5) * 0.3 * fibrous;

  // --- Garis batas antarlapisan. Perpaduan warna saja terlalu halus untuk
  // dibaca, sehingga susunan strata tidak terlihat.
  float waver = (noise(vec2(vWorld.x * 0.6, 3.1)) - 0.5) * 0.06;
  float seam =
    (1.0 - smoothstep(0.0, 0.02, abs(vDepth - uBounds.x - waver))) * 0.8 +
    (1.0 - smoothstep(0.0, 0.022, abs(vDepth - uBounds.y - waver))) * 0.9 +
    (1.0 - smoothstep(0.0, 0.026, abs(vDepth - uBounds.z - waver)));
  albedo *= 1.0 - seam * 0.36;

  // --- Gambut jenuh air lebih gelap dan sedikit kebiruan daripada gambut
  // kering di atasnya. Batas inilah seluruh isi modul ini, jadi ia harus
  // terbaca sekali lihat. Besar peredupannya sama dengan Modul 01 dan 02.
  float wetEdge = smoothstep(-0.02, 0.06, vDepth - waterDepth);
  albedo = mix(
    albedo,
    albedo * vec3(${(WET_DARKEN * 1.04).toFixed(3)}, ${(WET_DARKEN * 1.12).toFixed(3)}, ${(WET_DARKEN * 1.26).toFixed(3)}),
    wetEdge
  );

  // --- Lapisan kering di atas muka air. Diberi warna jerami yang makin pucat
  // mendekati permukaan: itulah bahan bakar yang dibahas Modul 02.
  float dry = 1.0 - wetEdge;
  float nearSurface = 1.0 - smoothstep(0.0, 0.9, vDepth);
  albedo = mix(albedo, albedo * vec3(1.18, 1.1, 0.92), dry * nearSurface * 0.85);

  // --- Penandaan daerah rawan: kolom yang muka airnya melewati batas 40 cm.
  // Hanya bagian yang keringnya yang ditandai, bukan seluruh kolom — yang
  // rawan terbakar memang lapisan di atas muka airnya.
  albedo = mix(albedo, albedo * vec3(1.28, 0.78, 0.58), risk * dry * uDryTint);

  // --- Pencahayaan. Bidang ini bagan, bukan benda: pencahayaannya dibuat
  // rata supaya kedalaman di mana pun terbaca sama jelas. Yang memberi
  // bentuknya adalah guratan dan garis batas di atas, bukan arah cahaya.
  vec3 color = albedo * (uAmbient + vec3(uSunIntensity));

  // --- Garis muka air tanah, dengan pias lembut di bawahnya supaya batas
  // kering-basah terbaca sebagai bidang, bukan sekadar satu garis.
  float line = 1.0 - smoothstep(0.0, 0.012, abs(vDepth - waterDepth));
  float band = (1.0 - smoothstep(0.0, 0.12, abs(vDepth - waterDepth))) * step(waterDepth, vDepth);
  color += vec3(0.33, 0.68, 0.93) * (line * 0.9 + band * 0.08);

  // --- Garis batas 40 cm. Satu garis mendatar tipis di seluruh lebar gambar:
  // inilah ambang PP 57/2016, dan pembaca harus dapat melihat di titik mana
  // kurva muka airnya menyeberanginya.
  float limit = 1.0 - smoothstep(0.0, 0.008, abs(vDepth - ${WATER_LIMIT_M.toFixed(3)}));
  color += vec3(0.95, 0.62, 0.3) * limit * 0.35;

  gl_FragColor = vec4(color, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export type TransectUniforms = {
  uField: { value: THREE.Texture };
  uDryTint: { value: number };
  uAmbient: { value: THREE.Color };
  uSunIntensity: { value: number };
};

/**
 * Buat tekstur data keadaan kolom: selebar jumlah kolom, setinggi satu piksel.
 *
 * Satu piksel tingginya, bukan satu kisi penuh seperti Modul 02: keadaan di
 * sini hanya berubah terhadap jarak dari kanal, tidak terhadap kedalaman.
 * Kedalaman diurus oleh atribut `aDepth` pada geometrinya.
 */
export function createFieldTexture(): { texture: THREE.DataTexture; data: Uint8Array } {
  const data = new Uint8Array(COLUMNS * 4);
  const texture = new THREE.DataTexture(data, COLUMNS, 1, THREE.RGBAFormat);
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return { texture, data };
}

/** Buat material bidang potong. `colors` berurutan sesuai `PEAT_LAYERS`. */
export function createTransectMaterial(colors: THREE.Texture[], field: THREE.Texture): THREE.ShaderMaterial {
  const bounds = new THREE.Vector3(PEAT_LAYERS[0].bottom, PEAT_LAYERS[1].bottom, PEAT_LAYERS[2].bottom);
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uColor0: { value: null },
        uColor1: { value: null },
        uColor2: { value: null },
        uColor3: { value: null },
        uField: { value: null },
        uBounds: { value: bounds },
        uProfile: { value: PROFILE_DEPTH },
        uDryTint: { value: 1 },
        uAmbient: { value: new THREE.Color(0.3, 0.31, 0.33) },
        uSunIntensity: { value: 0.72 },
      },
    ]),
  });
  // `UniformsUtils.merge` menyalin nilainya, jadi tekstur dipasang setelahnya.
  material.uniforms.uColor0.value = colors[0];
  material.uniforms.uColor1.value = colors[1];
  material.uniforms.uColor2.value = colors[2];
  material.uniforms.uColor3.value = colors[3];
  material.uniforms.uField.value = field;
  return material;
}
