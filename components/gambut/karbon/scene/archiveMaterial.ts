import * as THREE from "three";
import { PEAT_LAYERS, PROFILE_DEPTH, type PeatLayerId } from "@/lib/peat";
import { PEAT_LAYER_TINT } from "@/components/gambut/scene/dioramaConstants";
import { NOISE_GLSL } from "@/components/gambut/scene/noiseTexture";
import { GROWTH_M_PER_YEAR } from "@/lib/carbon";

// Bahan tanah Modul 04.
//
// Rangkanya sama dengan Modul 03: `MeshStandardMaterial` yang warna dasarnya
// diambil alih lewat `onBeforeCompile`, sehingga bayangan, peta lingkungan
// langit, dan kabut tetap dikerjakan three.js pada jalur yang sudah
// dioptimalkan. Alasannya ditulis panjang di
// `components/gambut/kanal/scene/transectMaterial.ts` dan tidak diulang di
// sini.
//
// Yang khas modul ini ada tiga, dan ketiganya hanya fungsi kedalaman:
//
//   1. Penggaris abad. Garis halus tiap 10 cm (seratus tahun) dan garis tebal
//      tiap 50 cm (lima ratus tahun), langsung pada tanahnya. Inilah yang
//      mengubah bidang potong menjadi kalender, dan ia harus berada pada
//      tanahnya — bukan pada tepi gambar sebagai sumbu — supaya pembaca
//      membacanya sebagai sifat gambutnya, bukan sebagai keterangan yang
//      ditempelkan orang lain.
//   2. Garis batas bakar. Satu garis tajam pada kedalaman yang habis
//      terbakar: di atasnya timbunan baru yang berumur beberapa abad, di
//      bawahnya timbunan lama yang berumur ribuan. Dalam geologi batas
//      semacam ini disebut hiatus — catatan yang hilang — dan tidak ada
//      istilah yang lebih tepat untuk apa yang terjadi di sini.
//   3. Penanda kedalaman yang digeser pembaca pada babak 01.
//
// Tidak ada tekstur keadaan sama sekali, tidak seperti Modul 02 dan 03:
// seluruh isi modul ini dapat dinyatakan dengan empat angka, jadi keempatnya
// cukup dikirim sebagai uniform. Peneduhnya karena itu jauh lebih murah
// daripada peneduh Modul 03.

/** Rona satu lapisan sebagai tetapan GLSL, dibaca dari daftar bersama. */
function tintGlsl(id: PeatLayerId): string {
  return PEAT_LAYER_TINT[id].map((v) => v.toFixed(3)).join(", ");
}

/** Jarak antargaris abad pada bidang potong (m). 10 cm = 100 tahun. */
const CENTURY_M = 100 * GROWTH_M_PER_YEAR;

/** Jarak antargaris tebal (m). 50 cm = 500 tahun. */
const HALF_MILLENNIUM_M = 500 * GROWTH_M_PER_YEAR;

export type ArchiveUniforms = {
  /** Kedalaman gambut yang sudah habis terbakar (m). */
  uBurnDepth: { value: number };
  /** Tebal timbunan baru di atas batas bakar (m). */
  uRegrown: { value: number };
  /** Kedalaman penanda pembaca (m); negatif berarti tidak ada. */
  uProbeDepth: { value: number };
  /** Kekuatan penggaris abad (0-1), dihaluskan oleh adegan. */
  uCalendar: { value: number };
};

export type ArchiveMaterial = THREE.MeshStandardMaterial & {
  archiveUniforms: ArchiveUniforms;
};

const FACE_PARS = /* glsl */ `
uniform sampler2D uColor0;
uniform sampler2D uColor1;
uniform sampler2D uColor2;
uniform sampler2D uColor3;
uniform sampler2D uNormal0;
uniform sampler2D uNormal1;
uniform sampler2D uNormal2;
uniform sampler2D uNormal3;
uniform vec3 uBounds;      // kedalaman batas fibrik/hemik, hemik/saprik, saprik/mineral (m)
uniform float uProfile;    // kedalaman seluruh profil (m)
uniform float uBurnDepth;  // kedalaman yang habis terbakar (m)
uniform float uRegrown;    // tebal timbunan baru (m)
uniform float uProbeDepth; // kedalaman penanda pembaca (m), negatif = tidak ada
uniform float uCalendar;   // kekuatan penggaris abad (0-1)

varying float vDepth;
varying vec3 vArchiveWorld;

${NOISE_GLSL}

/** Bobot tiap lapisan pada kedalaman d, dengan peralihan yang lembut. */
vec4 kLayerWeights(float d) {
  float w = 0.07;
  float b0 = smoothstep(uBounds.x - w, uBounds.x + w, d);
  float b1 = smoothstep(uBounds.y - w, uBounds.y + w, d);
  float b2 = smoothstep(uBounds.z - w, uBounds.z + w, d);
  return vec4(1.0 - b0, b0 - b1, b1 - b2, b2);
}

/**
 * Jarak terdekat dari d ke kelipatan span (m).
 *
 * Parameternya bernama span, bukan step: step adalah nama fungsi bawaan GLSL,
 * dan parameter yang memakai nama itu menutupinya di dalam seluruh badan
 * fungsi ini. Hari ini tidak ada panggilan step() di dalamnya, jadi tidak ada
 * yang rusak — tetapi baris pertama yang ditambahkan nanti akan rusak dengan
 * pesan galat yang tidak menyebut sebabnya.
 */
float kGridDistance(float d, float span) {
  return abs(fract(d / span + 0.5) - 0.5) * span;
}
`;

const FACE_DIFFUSE = /* glsl */ `
  vec2 kUv = vMapUv;

  // Timbunan baru: gambut yang tertimbun sesudah kebakaran, jadi seluruhnya
  // masih fibrik — serat tumbuhan yang belum sempat terurai. Dibedakan dari
  // timbunan lama bukan dengan warna yang dikarang, melainkan dengan memakai
  // lapisan teratas apa adanya: memang begitulah gambut muda terlihat.
  float kFresh = 1.0 - step(uBurnDepth, vDepth);

  vec4 kW = kLayerWeights(mix(vDepth, 0.12, kFresh));
  vec3 kAlbedo =
    texture2D(uColor0, kUv).rgb * kW.x +
    texture2D(uColor1, kUv).rgb * kW.y +
    texture2D(uColor2, kUv).rgb * kW.z +
    texture2D(uColor3, kUv).rgb * kW.w;
  kAlbedo *= kW.x * vec3(${tintGlsl("fibrik")}) + kW.y * vec3(${tintGlsl("hemik")}) +
             kW.z * vec3(${tintGlsl("saprik")}) + kW.w * vec3(${tintGlsl("mineral")});

  // Ragam skala besar supaya tekstur foto tidak tampak berulang, ditambah
  // guratan mendatar mengikuti arah pengendapan bahan organik.
  float kMottle = kNoise(kUv * 0.9);
  float kBedding = kNoise(vec2(vArchiveWorld.x * 1.4, vDepth * 34.0));
  float kFibrous = kW.x * 1.0 + kW.y * 0.6 + kW.z * 0.25 + kW.w * 0.15;
  kAlbedo *= 0.82 + kMottle * 0.4;
  kAlbedo *= 1.0 + (kBedding - 0.5) * 0.34 * kFibrous;

  // Garis batas antarlapisan, bergelombang sedikit supaya tidak terbaca
  // sebagai garis yang ditarik penggaris.
  float kWaver = (kNoise(vec2(vArchiveWorld.x * 1.1, 3.1)) - 0.5) * 0.05;
  float kSeam =
    (1.0 - smoothstep(0.0, 0.018, abs(vDepth - uBounds.x - kWaver))) * 0.8 +
    (1.0 - smoothstep(0.0, 0.02, abs(vDepth - uBounds.y - kWaver))) * 0.9 +
    (1.0 - smoothstep(0.0, 0.024, abs(vDepth - uBounds.z - kWaver)));
  kAlbedo *= 1.0 - kSeam * (1.0 - kFresh) * 0.34;

  // Alas tanah mineral diredupkan: ia bukan timbunan, tidak punya umur, dan
  // tidak melepaskan karbon apa pun bila terbakar.
  kAlbedo *= mix(1.0, 0.55, smoothstep(uBounds.z, uBounds.z + 0.3, vDepth));

  // Timbunan baru dibuat lebih terang dan lebih hangat daripada gambut tua di
  // bawahnya. Bedanya harus terbaca sekali lihat: justru selisih keduanya —
  // beberapa abad melawan beberapa ribu tahun — yang menjadi isi babak 04.
  kAlbedo = mix(kAlbedo, kAlbedo * vec3(1.32, 1.18, 0.86), kFresh * 0.9);

  // --- Penggaris abad -------------------------------------------------------
  //
  // Hanya pada timbunan lama dan hanya di dalam lapisan gambut: tanah mineral
  // di bawahnya tidak menumpuk satu milimeter setahun, jadi memberinya garis
  // tahun akan menjadi kebohongan yang rapi.
  float kInPeat = 1.0 - smoothstep(uBounds.z - 0.05, uBounds.z, vDepth);
  float kRuler = uCalendar * kInPeat * (1.0 - kFresh);

  // Sedikit bergelombang mengikuti lebar bongkahan, seperti bidang
  // pengendapan yang sebenarnya — garis yang benar-benar lurus sepanjang
  // 4,4 m terbaca sebagai cetakan, bukan sebagai tanah.
  float kLineWave = (kNoise(vec2(vArchiveWorld.x * 0.8, 7.3)) - 0.5) * 0.012;
  float kHair = 1.0 - smoothstep(0.002, 0.0055, kGridDistance(vDepth + kLineWave, ${CENTURY_M.toFixed(4)}));
  float kThick = 1.0 - smoothstep(0.004, 0.009, kGridDistance(vDepth + kLineWave, ${HALF_MILLENNIUM_M.toFixed(4)}));

  // Alur gelap, dan hanya alur gelap.
  //
  // Rancangan pertama menambahkan juga garis terang di atas tiap kelipatan
  // lima ratus tahun, dan hasilnya bidang potong yang terbaca sebagai kertas
  // bergaris — enam pita pucat melintang yang menutupi strata yang justru
  // harus dilihat. Gambut yang tersingkap di lapangan memang bergaris-garis
  // gelap mengikuti musim, tidak pernah terang, dan alur gelap tetap terbaca
  // di atas tanah terang maupun gelap.
  kAlbedo *= 1.0 - kHair * kRuler * 0.26;
  kAlbedo *= 1.0 - kThick * kRuler * 0.3;

  // --- Garis batas bakar ----------------------------------------------------
  //
  // Batas antara yang tertimbun sebelum kebakaran dan yang sesudahnya.
  // Muncul hanya setelah ada yang terbakar, dan menguat saat timbunan barunya
  // cukup tebal untuk membuat batas itu benar-benar menjadi batas — sebelum
  // itu ia hanya tepi atas bongkahan, dan tepi tidak perlu ditandai.
  float kHasBurn = smoothstep(0.004, 0.03, uBurnDepth);
  float kBuried = smoothstep(0.0, 0.05, uRegrown);
  float kHiatus = (1.0 - smoothstep(0.0, 0.009, abs(vDepth - uBurnDepth))) * kHasBurn * kBuried;
  kAlbedo = mix(kAlbedo, vec3(0.09, 0.07, 0.06), kHiatus * 0.85);

  // --- Penanda kedalaman pembaca -------------------------------------------
  float kProbe = step(0.0, uProbeDepth) *
    (1.0 - smoothstep(0.0, 0.007, abs(vDepth - uProbeDepth)));
  float kProbeGlow = step(0.0, uProbeDepth) *
    (1.0 - smoothstep(0.0, 0.035, abs(vDepth - uProbeDepth)));

  diffuseColor.rgb *= kAlbedo;
  diffuseColor.rgb += vec3(0.55, 0.78, 0.95) * (kProbe * 0.85 + kProbeGlow * 0.08);

  // Gambut muda berpori dan berdebu; gambut tua yang padat sedikit lebih
  // memantul. Tanda kedua bagi batas bakar, dan satu-satunya yang masih
  // terbaca saat gambarnya dilihat sambil lalu.
  kFaceRoughness = mix(0.9, 0.97, kFresh);
`;

/** Peta normal empat lapisan, dipadukan dengan bobot yang sama. */
const FACE_NORMAL = /* glsl */ `
  float kFreshN = 1.0 - step(uBurnDepth, vDepth);
  vec4 kNw = kLayerWeights(mix(vDepth, 0.12, kFreshN));
  vec3 kMapN =
    texture2D(uNormal0, vMapUv).xyz * kNw.x +
    texture2D(uNormal1, vMapUv).xyz * kNw.y +
    texture2D(uNormal2, vMapUv).xyz * kNw.z +
    texture2D(uNormal3, vMapUv).xyz * kNw.w;
  kMapN = kMapN * 2.0 - 1.0;
  kMapN.xy *= normalScale;
  normal = normalize(tbn * kMapN);
`;

/**
 * Buat bahan bidang potong.
 *
 * `colors` dan `normals` berurutan sesuai `PEAT_LAYERS`.
 */
export function createArchiveFaceMaterial(
  colors: THREE.Texture[],
  normals: THREE.Texture[],
  noise: THREE.Texture,
): ArchiveMaterial {
  const bounds = new THREE.Vector3(
    PEAT_LAYERS[0].bottom,
    PEAT_LAYERS[1].bottom,
    PEAT_LAYERS[2].bottom,
  );

  const material = new THREE.MeshStandardMaterial({
    // Peta pertama dipasang hanya supaya three.js menyalakan jalur `map` dan
    // `normalMap` — koordinat dan isinya diambil alih suntikan di bawah.
    map: colors[0],
    normalMap: normals[0],
    normalScale: new THREE.Vector2(1.15, 1.15),
    roughness: 1,
    metalness: 0,
  }) as ArchiveMaterial;

  const uniforms: ArchiveUniforms = {
    uBurnDepth: { value: 0 },
    uRegrown: { value: 0 },
    uProbeDepth: { value: -1 },
    uCalendar: { value: 0 },
  };
  material.archiveUniforms = uniforms;

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uNoise: { value: noise },
      uColor0: { value: colors[0] },
      uColor1: { value: colors[1] },
      uColor2: { value: colors[2] },
      uColor3: { value: colors[3] },
      uNormal0: { value: normals[0] },
      uNormal1: { value: normals[1] },
      uNormal2: { value: normals[2] },
      uNormal3: { value: normals[3] },
      uBounds: { value: bounds },
      uProfile: { value: PROFILE_DEPTH },
      ...uniforms,
    });

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
         attribute float aDepth;
         varying float vDepth;
         varying vec3 vArchiveWorld;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
         vDepth = aDepth;
         vArchiveWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FACE_PARS}\nfloat kFaceRoughness = 1.0;`)
      .replace("#include <map_fragment>", FACE_DIFFUSE)
      .replace("#include <normal_fragment_maps>", FACE_NORMAL)
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>\n  roughnessFactor = kFaceRoughness;`,
      );
  };

  // Dua bahan dengan `onBeforeCompile` berbeda harus punya kunci program yang
  // berbeda, kalau tidak three.js memakai ulang program yang salah.
  material.customProgramCacheKey = () => "karbon-face";
  return material;
}

// ---------------------------------------------------------------------------
//  HAMPARAN PERMUKAAN
// ---------------------------------------------------------------------------

const TOP_PARS = /* glsl */ `
uniform float uBurnDepth;
uniform float uRegrown;
uniform float uProbeDepth;
uniform float uCalendar;

varying vec3 vTopWorld;

${NOISE_GLSL}
`;

const TOP_DIFFUSE = /* glsl */ `
  // Tiga keadaan permukaan, dan ketiganya nyata:
  //   belum tersentuh  — hutan rawa, hijau gelap dan tidak pernah rata,
  //   baru terbakar    — abu dan arang, hampir tanpa warna,
  //   mulai pulih      — lumut dan pakis perintis di atas gambut muda.
  float kBurnt = smoothstep(0.004, 0.05, uBurnDepth);
  float kHealed = smoothstep(0.0, 0.25, uRegrown);

  float kGrain = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
  kGrain = clamp(kGrain / 0.30, 0.6, 1.45);

  float kClump = kFbm(vTopWorld.xz * 1.6);
  float kBlade = kFbm(vTopWorld.xz * 6.5);

  vec3 kLiving = mix(vec3(0.055, 0.115, 0.045), vec3(0.10, 0.165, 0.062), kClump);
  // Abu bukan hitam pekat: yang tersisa setelah gambut membara adalah abu
  // kelabu kecoklatan dengan bongkah arang di sela-selanya.
  vec3 kAsh = mix(vec3(0.085, 0.075, 0.068), vec3(0.17, 0.155, 0.14), kBlade);
  // Perintis yang tumbuh di atas timbunan baru: jarang, dan warnanya pucat.
  vec3 kPioneer = mix(kAsh, vec3(0.13, 0.17, 0.085), clamp(kClump * 1.5 - 0.25, 0.0, 1.0));

  vec3 kGround = mix(kLiving, mix(kAsh, kPioneer, kHealed), kBurnt);
  kGround *= (0.68 + kBlade * 0.5 + kClump * 0.22) * kGrain;

  diffuseColor.rgb = kGround;

  // Abu memantul jauh lebih sedikit daripada daun basah.
  kTopRoughness = mix(0.6, 0.95, kBurnt);
`;

/** Buat bahan hamparan permukaan. */
export function createArchiveTopMaterial(
  ground: THREE.Texture,
  groundNormal: THREE.Texture,
  noise: THREE.Texture,
): ArchiveMaterial {
  const material = new THREE.MeshStandardMaterial({
    map: ground,
    normalMap: groundNormal,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughness: 1,
    metalness: 0,
  }) as ArchiveMaterial;

  const uniforms: ArchiveUniforms = {
    uBurnDepth: { value: 0 },
    uRegrown: { value: 0 },
    uProbeDepth: { value: -1 },
    uCalendar: { value: 0 },
  };
  material.archiveUniforms = uniforms;

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, { uNoise: { value: noise }, ...uniforms });

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n varying vec3 vTopWorld;`)
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>\n vTopWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${TOP_PARS}\nfloat kTopRoughness = 1.0;`)
      .replace("#include <map_fragment>", `#include <map_fragment>\n${TOP_DIFFUSE}`)
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>\n  roughnessFactor = kTopRoughness;`,
      );
  };

  material.customProgramCacheKey = () => "karbon-top";
  return material;
}

// ---------------------------------------------------------------------------
//  YANG HILANG
// ---------------------------------------------------------------------------

/**
 * Bahan kotak "yang hilang".
 *
 * Tembus pandang, tanpa menulis kedalaman, dan tidak menerima bayangan: ia
 * bukan benda yang ada di sana, melainkan tanda bagi benda yang sudah tidak
 * ada. Warnanya diambil dari rona gambut keringnya sendiri supaya terbaca
 * sebagai "tanah yang dahulu di sini", bukan sebagai kotak kaca.
 */
export function createLostMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color("#d9a06a"),
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/**
 * Rusuk kotak "yang hilang".
 *
 * Isinya saja tidak cukup. Kotak tembus pandang setipis setengah meter di
 * atas bongkahan setinggi tiga meter terbaca sebagai tudung kelabu yang
 * menutupi tanahnya — pembaca melihat sesuatu yang ditambahkan, bukan sesuatu
 * yang hilang. Rusuk yang terang mengubahnya menjadi garis bentuk: ruang
 * kosong yang persis seukuran tanah yang dahulu mengisinya.
 *
 * Titik tumpunya ikut dipindah ke alas, sama seperti isinya, supaya keduanya
 * dapat diberi kedudukan dan skala yang persis sama.
 */
export function createLostEdges(): THREE.LineSegments {
  const box = new THREE.BoxGeometry(1, 1, 1);
  box.translate(0, 0.5, 0);
  const edges = new THREE.EdgesGeometry(box);
  box.dispose();
  const material = new THREE.LineBasicMaterial({
    color: new THREE.Color("#ffd9b0"),
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const lines = new THREE.LineSegments(edges, material);
  lines.visible = false;
  return lines;
}
