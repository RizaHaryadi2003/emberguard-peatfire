import * as THREE from "three";
import { PEAT_LAYERS, PROFILE_DEPTH, type PeatLayerId } from "@/lib/peat";
import { PEAT_LAYER_TINT, WET_DARKEN } from "@/components/gambut/scene/dioramaConstants";
import { CANAL_WIDTH_M, COLUMNS, TRANSECT_LENGTH_M, WATER_LIMIT_M } from "@/lib/drainage";

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

  // --- Alas tanah mineral di bawah profil gambut diredupkan. Ia hanya
  // penopang bongkahan supaya kanal tidak tampak menembus dasarnya; dibiarkan
  // seterang gambutnya, ia justru yang paling merebut perhatian, padahal
  // tidak ada satu pun pelajaran modul ini yang terjadi di sana.
  float plinth = smoothstep(uBounds.z, uBounds.z + 0.45, vDepth);
  albedo *= mix(1.0, 0.5, plinth);

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

// ---------------------------------------------------------------------------
//  HAMPARAN PERMUKAAN
// ---------------------------------------------------------------------------
//
// Peneduh bidang atas bongkahan. Tugasnya satu, dan tugas itu tidak dikerjakan
// oleh rancangan sebelumnya sama sekali: memperlihatkan bahwa yang hilang
// bukan cuma air di bawah tanah, melainkan juga yang hidup di atasnya.
//
// Pembaca tidak dapat melihat muka air tanah — itulah seluruh persoalan
// gambut. Yang dapat dilihatnya adalah tumbuhan. Jadi di sini kedalaman muka
// air diterjemahkan menjadi warna permukaan: hijau selama airnya dekat,
// menguning begitu melewati batas 40 cm, lalu kelabu dan retak ketika tanahnya
// sudah melesak. Itulah urutan yang sama yang dilihat orang di lapangan, dan
// urutan itulah yang harus dikenali pembaca.

const SURFACE_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorld;
varying vec3 vTint;

void main() {
  vUv = uv;
  vTint = color;
  vNormal = normalize(normalMatrix * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const SURFACE_FRAGMENT = /* glsl */ `
uniform sampler2D uGround;
uniform sampler2D uField;
uniform float uProfile;
uniform float uLimit;        // batas 40 cm, sebagai bagian kedalaman profil
uniform vec3 uSunDir;
uniform vec3 uAmbient;
uniform float uDryTint;
uniform float uCanalHalf;    // setengah lebar kanal (m)
uniform float uTransect;     // panjang transek simulasi (m)

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorld;
varying vec3 vTint;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  return noise(p) * 0.6 + noise(p * 2.3) * 0.26 + noise(p * 5.1) * 0.14;
}

void main() {
  // Keadaan kolom ini dibaca menurut jaraknya dari tepi kanal, bukan menurut
  // uv: hamparan ini digambar dua kali, dicerminkan, jadi yang berlaku adalah
  // jarak mutlaknya.
  float distanceM = max(0.0, abs(vWorld.x) - uCanalHalf);
  float u = min(1.0, distanceM / uTransect);
  vec4 field = texture2D(uField, vec2(u, 0.5));
  float waterDepth = field.g * uProfile;
  float dropM = field.r * uProfile;

  // --- Seberapa kering permukaan ini.
  //
  // Dua tahap, bukan satu, karena yang terjadi di lapangan memang dua tahap
  // yang berbeda. Pertama airnya menjauh dari akar: tumbuhan menguning tetapi
  // tanahnya masih utuh. Kemudian tanahnya sendiri habis: permukaan melesak,
  // retak, dan yang tersisa tinggal gambut telanjang.
  //
  // Penggerak utamanya penurunan permukaan, bukan kedalaman muka air, dengan
  // alasan yang sama seperti pada pohon (lihat scene/vegetation.ts): muka
  // air turun seketika begitu pengatur digeser, sedangkan yang hidup di atas
  // tanah membutuhkan tahun untuk mati. Kedalaman muka air tetap dipakai,
  // tetapi hanya sebagai pelengkap yang membuat petak di dekat kanal
  // menguning lebih dulu daripada yang jauh.
  float ruin = smoothstep(0.04, 0.6, dropM);
  float thirst = max(ruin, smoothstep(0.5, 2.0, waterDepth) * 0.45);

  // --- Rumpun tumbuhan. Bercak-bercak, bukan hamparan rata: gambut yang
  // sudah terganggu ditumbuhi pakis dan semak dalam rumpun yang terpisah.
  float clump = fbm(vWorld.xz * 0.22);
  float blade = fbm(vWorld.xz * 1.7);
  // Rumpun yang paling tipis mati lebih dulu, jadi tutupannya menipis dari
  // tepi tiap rumpun ke tengahnya — bukan memudar rata.
  float cover = clamp((clump + 0.42) * 1.5 - thirst * 1.5 - ruin * 0.6, 0.0, 1.0);

  // Hijau hutan rawa, bukan hijau rumput taman: gelap, agak kebiruan, dan
  // tidak pernah rata — tutupan gambut yang utuh justru bergerombol.
  vec3 lush = vec3(0.11, 0.21, 0.09);
  vec3 sparse = vec3(0.26, 0.27, 0.12);
  vec3 straw = vec3(0.38, 0.31, 0.16);
  vec3 plant = mix(lush, sparse, thirst);
  plant = mix(plant, straw, ruin * 0.7);
  plant *= 0.6 + blade * 0.85 + clump * 0.3;

  // --- Tanah telanjang di bawah tumbuhan: gambut yang makin pucat lalu
  // kelabu-kehitaman begitu bahan organiknya teroksidasi habis.
  vec3 ground = texture2D(uGround, vUv).rgb;
  vec3 bare = ground * mix(vec3(0.42, 0.33, 0.24), vec3(0.30, 0.26, 0.24), ruin);
  bare *= 0.85 + fbm(vWorld.xz * 0.8) * 0.4;

  vec3 albedo = mix(bare, plant, cover);

  // --- Retak kemarau: hanya muncul pada tanah yang sudah benar-benar kering,
  // dan hanya di tempat tumbuhannya sudah hilang.
  float crackField = fbm(vWorld.xz * 0.55 + 11.3);
  float crack = 1.0 - smoothstep(0.0, 0.035, abs(crackField - 0.5));
  albedo *= 1.0 - crack * ruin * (1.0 - cover) * 0.55;

  // --- Penandaan daerah rawan, sama ronanya dengan bidang potong supaya
  // pembaca membaca keduanya sebagai satu keterangan.
  float risk = field.b;
  albedo = mix(albedo, albedo * vec3(1.26, 0.8, 0.6), risk * uDryTint * 0.5);

  albedo *= vTint;

  // --- Pencahayaan. Berbeda dari bidang potong, bidang ini benda: ia punya
  // arah hadap, dan kemiringannya yang berubah saat tanah melesak hanya
  // terbaca kalau cahayanya punya arah.
  vec3 n = normalize(vNormal);
  float lambert = max(0.0, dot(n, normalize(uSunDir)));
  vec3 color = albedo * (uAmbient + vec3(lambert * 0.8));

  gl_FragColor = vec4(color, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/** Buat bahan hamparan permukaan. */
export function createSurfaceMaterial(ground: THREE.Texture, field: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: SURFACE_VERTEX,
    fragmentShader: SURFACE_FRAGMENT,
    vertexColors: true,
    uniforms: {
      uGround: { value: ground },
      uField: { value: field },
      uProfile: { value: PROFILE_DEPTH },
      uLimit: { value: WATER_LIMIT_M },
      uSunDir: { value: new THREE.Vector3(0.45, 0.82, 0.36).normalize() },
      uAmbient: { value: new THREE.Color(0.22, 0.24, 0.28) },
      uDryTint: { value: 1 },
      uCanalHalf: { value: CANAL_WIDTH_M / 2 },
      uTransect: { value: TRANSECT_LENGTH_M },
    },
  });
}

// ---------------------------------------------------------------------------
//  AIR KANAL
// ---------------------------------------------------------------------------
//
// Air di dalam kanal digambar dengan peneduhnya sendiri, bukan dengan bahan
// baku, karena ia harus mengatakan satu hal yang tidak dapat dikatakan warna:
// air ini sedang mengalir keluar. Riaknya berjalan menyusuri kanal selama
// kanal terbuka, dan berhenti begitu sekat dipasang — perbedaan yang terbaca
// seketika, tanpa perlu dibaca angkanya.

const WATER_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uFlow;

varying vec2 vUv;
varying float vRipple;

void main() {
  vUv = uv;
  // Riak menyusuri kanal (sumbu z pada geometri yang belum diskalakan).
  float ripple = sin((uv.y * 26.0) - uTime * 2.4) * 0.5 + 0.5;
  ripple *= sin((uv.x * 7.0) + uTime * 1.1) * 0.5 + 0.5;
  vRipple = ripple * uFlow;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}
`;

const WATER_FRAGMENT = /* glsl */ `
uniform vec3 uShallow;
uniform vec3 uDeep;
uniform float uFlow;

varying vec2 vUv;
varying float vRipple;

void main() {
  // Lebih gelap di tengah, lebih terang di tepi: begitulah air keruh terlihat
  // di dalam parit sempit, dan itu yang memberi kanal ini kedalaman.
  float edge = 1.0 - smoothstep(0.0, 0.42, abs(vUv.x - 0.5));
  vec3 color = mix(uShallow, uDeep, edge);
  color += vec3(0.12, 0.16, 0.17) * vRipple * 0.5;
  // Air yang tertahan sekat menjadi tenang dan sedikit lebih pantul.
  color += vec3(0.05, 0.07, 0.08) * (1.0 - uFlow);
  gl_FragColor = vec4(color, 0.93);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/** Buat bahan permukaan air kanal. */
export function createCanalWaterMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: WATER_VERTEX,
    fragmentShader: WATER_FRAGMENT,
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uFlow: { value: 1 },
      uShallow: { value: new THREE.Color("#33484c") },
      uDeep: { value: new THREE.Color("#16272e") },
    },
  });
}
