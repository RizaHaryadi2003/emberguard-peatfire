import * as THREE from "three";
import { PEAT_LAYER_TINT } from "@/components/modul/shared/scene/dioramaConstants";
import { NOISE_GLSL } from "@/components/modul/shared/scene/noiseTexture";

// Bahan muka potong kubah gambut Modul Hutan Rawa.
//
// Rancangan sebelumnya memakai satu tekstur foto yang diulang di seluruh muka
// depan, sehingga gambut setebal tiga belas meter terbaca sebagai tembok bata
// coklat. Gambut di bidang potong yang sebenarnya tidak seragam: bagian atas
// masih berupa serat dan akar, makin ke bawah makin hancur dan gelap, dan di
// dalamnya tertimbun sisa batang pohon rawa.
//
// Urutan "makin dalam makin terurai" sama dengan yang diajarkan Modul
// Anatomi. Di modul ini urutan itu hanya rupa, bukan data: tidak ada garis
// batas lapisan maupun angka kedalaman yang ditampilkan, karena acuan modul
// ini (Page dkk., 1999; Husson dkk., 2018) tidak menyebut tebal tiap lapisan
// di Sebangau.
//
// Rangkanya tetap MeshStandardMaterial supaya cahaya matahari, langit,
// bayangan pohon, dan kabut dikerjakan three.js. Warna dan normalnya diganti
// lewat onBeforeCompile, sama seperti bahan bidang potong Modul Kanal.

const tint = (id: keyof typeof PEAT_LAYER_TINT) => PEAT_LAYER_TINT[id].map((v) => v.toFixed(3)).join(", ");

const FACE_PARS = /* glsl */ `
uniform sampler2D uColor0;
uniform sampler2D uColor1;
uniform sampler2D uColor2;
uniform sampler2D uNormal0;
uniform sampler2D uNormal1;
uniform sampler2D uNormal2;
uniform float uSoak;
uniform vec2 uProbe;      // x letak pengukur, 0/1 tampak
uniform vec3 uZone;       // x awal, x akhir, 0/1 jenis hutan yang disorot
uniform vec2 uZoneEdges;  // x batas hutan campuran–tiang dan tiang–tinggi
varying float vDepth;
varying float vHeight;
varying vec2 vFaceUv;
varying vec3 vFaceWorld;
${NOISE_GLSL}

/** Bobot tiga rupa gambut menurut kedalaman, batasnya digoyang derau. */
vec3 kWeights(float depth) {
  float wobble = (kNoise(vFaceWorld.xy * vec2(0.35, 1.1) + 4.0) - 0.5) * 0.9;
  float d = depth + wobble;
  float fib = 1.0 - smoothstep(0.3, 1.1, d);
  float sap = smoothstep(2.6, 6.5, d);
  float hem = max(0.0, 1.0 - fib - sap);
  return vec3(fib, hem, sap);
}
`;

const FACE_DIFFUSE = /* glsl */ `
  vec3 kW = kWeights(vDepth);
  vec2 kUv = vFaceUv;
  vec3 kAlbedo =
    texture2D(uColor0, kUv).rgb * kW.x * vec3(${tint("fibrik")}) +
    texture2D(uColor1, kUv * 0.9 + 0.31).rgb * kW.y * vec3(${tint("hemik")}) +
    texture2D(uColor2, kUv * 0.8 + 0.57).rgb * kW.z * vec3(${tint("saprik")});

  // Ragam skala besar supaya tekstur foto tidak tampak berulang di sepanjang
  // muka selebar seratus dua puluh satuan.
  float kMottle = kNoise(vFaceWorld.xy * vec2(0.08, 0.35));
  kAlbedo *= 0.7 + kMottle * 0.6;
  // Rona gambut: coklat kemerahan, bukan kelabu. Foto tanah di bawahnya
  // diambil dari tanah mineral yang lebih pucat.
  kAlbedo *= vec3(1.08, 0.84, 0.66);

  // Guratan mendatar: bahan tumbuhan mengendap lapis demi lapis.
  float kBedding = kNoise(vec2(vFaceWorld.x * 0.25, vFaceWorld.y * 7.0));
  kAlbedo *= 1.0 + (kBedding - 0.5) * 0.28;

  // Tikar akar di bawah lantai hutan: lebih gelap dan rapat.
  float kMat = 1.0 - smoothstep(0.05, 0.45, vDepth);
  kAlbedo *= mix(1.0, 0.5, kMat);

  // Akar: guratan tegak yang gelap, habis dalam dua meter pertama.
  float kRootRidge = 1.0 - abs(kNoise(vec2(vFaceWorld.x * 3.2, vFaceWorld.y * 0.45)) * 2.0 - 1.0);
  float kRoot = smoothstep(0.9, 0.985, kRootRidge) * (1.0 - smoothstep(0.4, 2.2, vDepth));
  kAlbedo = mix(kAlbedo, kAlbedo * vec3(0.48, 0.4, 0.34), kRoot * 0.8);

  // Serat pucat mendatar: sisa daun dan ranting yang masih utuh.
  float kFiberRidge = 1.0 - abs(kNoise(vec2(vFaceWorld.x * 1.6, vFaceWorld.y * 9.0) + 3.7) * 2.0 - 1.0);
  float kFiber = smoothstep(0.93, 0.99, kFiberRidge) * (kW.x + kW.y * 0.6);
  kAlbedo *= 1.0 + kFiber * 0.5;

  // Sisa kayu tertimbun: bongkah coklat kemerahan yang memanjang mendatar.
  // Gambut hutan rawa tropis tersusun dari kayu pohon rawa, jadi bongkah ini
  // muncul di seluruh kedalaman, bukan hanya di dekat permukaan.
  // Ukurannya beberapa satuan mendatar dan setengah meter tegak, supaya
  // tetap terbaca dari jarak pandang diorama.
  float kWoodN = kNoise(vec2(vFaceWorld.x * 0.22, vFaceWorld.y * 1.3) + 11.0);
  float kWoodGrain = kNoise(vec2(vFaceWorld.x * 0.9, vFaceWorld.y * 14.0) + 5.0);
  float kWood = smoothstep(0.71, 0.75, kWoodN) * smoothstep(0.4, 1.0, vDepth);
  // Kayu yang terendam gambut berwarna coklat kemerahan pekat, sedikit
  // lebih merah daripada gambut di sekitarnya, dengan serat memanjang.
  kAlbedo = mix(kAlbedo, kAlbedo * vec3(1.25, 0.82, 0.6) * (0.7 + kWoodGrain * 0.6), kWood * 0.9);
  // Tepi bongkah kayu lebih gelap supaya terbaca sebagai benda, bukan noda.
  float kWoodRim = smoothstep(0.68, 0.71, kWoodN) * (1.0 - smoothstep(0.71, 0.74, kWoodN)) * smoothstep(0.4, 1.0, vDepth);
  kAlbedo *= 1.0 - kWoodRim * 0.5;

  // Makin dalam makin gelap: gambut tua yang sudah lama hancur.
  kAlbedo *= mix(1.0, 0.74, smoothstep(1.5, 8.0, vDepth));

  // Pertemuan dengan tanah mineral: gambut paling tua dan paling hancur.
  kAlbedo *= mix(0.74, 1.0, smoothstep(0.0, 0.8, vHeight));

  // Hutan rawa yang utuh hampir selalu basah: di bawah tikar akar gambutnya
  // jenuh air, jadi lebih gelap dan sedikit kebiruan. Hujan membasahi
  // seluruhnya, sampai ke permukaan.
  float kWet = max(smoothstep(0.25, 0.9, vDepth) * 0.6, uSoak);
  kAlbedo = mix(kAlbedo, kAlbedo * vec3(0.74, 0.69, 0.63), kWet);

  // Jenis hutan yang disorot: bagian lain diredupkan, bukan diberi garis.
  float kInZone = smoothstep(uZone.x - 0.3, uZone.x + 0.3, vFaceWorld.x) * (1.0 - smoothstep(uZone.y - 0.3, uZone.y + 0.3, vFaceWorld.x));
  kAlbedo *= mix(1.0, mix(0.5, 1.12, kInZone), uZone.z);

  // Batas antarjenis hutan: garis putus-putus tipis, lebarnya tetap satu
  // piksel berapa pun jauhnya kamera.
  float kEdgeDist = min(abs(vFaceWorld.x - uZoneEdges.x), abs(vFaceWorld.x - uZoneEdges.y)) / fwidth(vFaceWorld.x);
  float kDash = step(0.5, fract(vFaceWorld.y * 1.2));
  kAlbedo = mix(kAlbedo, vec3(0.95, 0.85, 0.7), (1.0 - smoothstep(0.5, 1.3, kEdgeDist)) * kDash * 0.28);

  // Pengukur tebal gambut di babak 01: kolom muka potong di bawah kaki
  // pejalan diterangi, diberi garis skala tiap meter dari permukaan, dan
  // dasar gambutnya ditandai. Yang diukur adalah gambutnya sendiri.
  float kProbeHalf = 1.0;
  float kProbeDx = vFaceWorld.x - uProbe.x;
  float kInProbe = (1.0 - smoothstep(kProbeHalf - 0.25, kProbeHalf, abs(kProbeDx))) * uProbe.y;
  if (kInProbe > 0.0) {
    // Sorotan lembut, paling terang di tengah kolom.
    kAlbedo = mix(kAlbedo, kAlbedo * 2.1 + vec3(0.09, 0.055, 0.02), kInProbe * 0.85);
    // Garis skala di sisi kiri kolom seperti penggaris: pendek tiap meter,
    // panjang tiap lima meter.
    float kTickPx = abs(fract(vDepth + 0.5) - 0.5) / fwidth(vDepth);
    float kFive = 1.0 - step(0.5, abs(fract(vDepth / 5.0 + 0.5) - 0.5) * 5.0);
    float kTickLen = mix(0.35, 0.75, kFive);
    float kOnRuler = step(-kProbeHalf, kProbeDx) * (1.0 - step(-kProbeHalf + kTickLen * kProbeHalf * 2.0, kProbeDx));
    float kTick = (1.0 - smoothstep(0.4, 1.3, kTickPx)) * kOnRuler * step(0.5, vDepth);
    kAlbedo = mix(kAlbedo, vec3(1.0, 0.93, 0.82), kTick * 0.9);
    // Dasar gambut di bawah kaki: garis jingga setebal dua piksel.
    float kBasePx = abs(vHeight) / fwidth(vHeight);
    kAlbedo = mix(kAlbedo, vec3(0.98, 0.6, 0.3), (1.0 - smoothstep(1.0, 2.4, kBasePx)) * kInProbe);
  }

  diffuseColor.rgb *= kAlbedo;
  kFaceRoughness = mix(0.97, 0.55, kWet);
`;

const FACE_NORMAL = /* glsl */ `
  vec3 kNw = kWeights(vDepth);
  vec3 kMapN =
    texture2D(uNormal0, vFaceUv).xyz * kNw.x +
    texture2D(uNormal1, vFaceUv * 0.9 + 0.31).xyz * kNw.y +
    texture2D(uNormal2, vFaceUv * 0.8 + 0.57).xyz * kNw.z;
  kMapN = kMapN * 2.0 - 1.0;
  kMapN.xy *= normalScale;
  normal = normalize(tbn * kMapN);
`;

export type PeatFaceUniforms = {
  soak: { value: number };
  probe: { value: THREE.Vector2 };
  zone: { value: THREE.Vector3 };
};
export type PeatFaceMaterial = THREE.MeshStandardMaterial & PeatFaceUniforms;

/**
 * Bahan muka potong gambut. `colors` dan `normals` berurutan fibrik, hemik,
 * saprik. Geometrinya wajib membawa atribut `aDepth` dan `aHeight`.
 */
export function createPeatFaceMaterial(colors: THREE.Texture[], normals: THREE.Texture[], noise: THREE.Texture, zoneEdges: [number, number]): PeatFaceMaterial {
  const material = new THREE.MeshStandardMaterial({
    // Dipasang hanya supaya jalur map dan normalMap three.js menyala.
    map: colors[0],
    normalMap: normals[0],
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughness: 1,
    metalness: 0,
    // Dua sisi: muka samping kiri dan kanan dibentuk dengan arah yang
    // berlawanan, dan three.js membalik normal bagi sisi belakang.
    side: THREE.DoubleSide,
  }) as PeatFaceMaterial;
  const soak = { value: 0 };
  const probe = { value: new THREE.Vector2(0, 0) };
  const zone = { value: new THREE.Vector3(0, 0, 0) };
  Object.assign(material, { soak, probe, zone });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uColor0: { value: colors[0] },
      uColor1: { value: colors[1] },
      uColor2: { value: colors[2] },
      uNormal0: { value: normals[0] },
      uNormal1: { value: normals[1] },
      uNormal2: { value: normals[2] },
      uNoise: { value: noise },
      uSoak: soak,
      uProbe: probe,
      uZone: zone,
      uZoneEdges: { value: new THREE.Vector2(...zoneEdges) },
    });
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
         attribute float aDepth;
         attribute float aHeight;
         varying float vDepth;
         varying float vHeight;
         varying vec2 vFaceUv;
         varying vec3 vFaceWorld;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
         vDepth = aDepth;
         vHeight = aHeight;
         vFaceUv = uv;
         vFaceWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FACE_PARS}\nfloat kFaceRoughness = 1.0;`)
      .replace("#include <map_fragment>", FACE_DIFFUSE)
      .replace("#include <normal_fragment_maps>", FACE_NORMAL)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>\n  roughnessFactor = kFaceRoughness;`);
  };
  material.customProgramCacheKey = () => "hutan-peat-face";
  return material;
}

/** Salin tekstur supaya pengulangan di modul ini tidak mengubah modul lain. */
export function ownTexture(tex: THREE.Texture, color: boolean, anisotropy: number, repeat = 1): THREE.Texture {
  const t = tex.clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = anisotropy;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

// ---------------------------------------------------------------------------
//  LANTAI HUTAN
// ---------------------------------------------------------------------------
//
// Permukaan atas kubah. Selain serasah dan genangan di cekungan, bahan ini
// menyimpan bekas banjir: lumpur yang ditinggalkan air sungai. Lumpur hanya
// mengendap sejauh air banjir sampai, jadi setelah banjir surut pembaca
// masih melihat bahwa hara sungai berhenti di tepi hutan, sedangkan tengah
// kubah tidak pernah menerimanya.

export type FloorUniforms = {
  silt: { value: number };
  siltLevel: { value: number };
  zone: { value: THREE.Vector3 };
};
export type FloorMaterial = THREE.MeshStandardMaterial & FloorUniforms;

export function createFloorMaterial(map: THREE.Texture, normalMap: THREE.Texture, noise: THREE.Texture): FloorMaterial {
  const material = new THREE.MeshStandardMaterial({ map, normalMap, roughness: 0.9, color: "#7d7a5c", vertexColors: true }) as FloorMaterial;
  const silt = { value: 0 };
  const siltLevel = { value: 0 };
  const zone = { value: new THREE.Vector3(0, 0, 0) };
  Object.assign(material, { silt, siltLevel, zone });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, { uNoise: { value: noise }, uSilt: silt, uSiltLevel: siltLevel, uZone: zone });
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vFloorWorld;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvFloorWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
         uniform float uSilt;
         uniform float uSiltLevel;
         uniform vec3 uZone;
         varying vec3 vFloorWorld;
         ${NOISE_GLSL}`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
         // Endapan lumpur: kelabu kecoklatan, tepinya bergerigi mengikuti
         // genangan terakhir.
         float kEdge = uSiltLevel + (kNoise(vFloorWorld.xz * 1.3) - 0.5) * 0.35;
         float kMud = (1.0 - smoothstep(kEdge - 0.25, kEdge, vFloorWorld.y)) * uSilt;
         float kMudGrain = 0.85 + kNoise(vFloorWorld.xz * 5.0) * 0.3;
         // Lumpur kering kelabu kecoklatan, sedikit lebih terang daripada serasah
         // (nilai linear, setara sRGB ± 0,36 0,32 0,25).
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.106, 0.084, 0.051) * kMudGrain, kMud * 0.75);
         // Jenis hutan yang disorot.
         float kInZone = smoothstep(uZone.x - 0.3, uZone.x + 0.3, vFloorWorld.x) * (1.0 - smoothstep(uZone.y - 0.3, uZone.y + 0.3, vFloorWorld.x));
         diffuseColor.rgb *= mix(1.0, mix(0.55, 1.15, kInZone), uZone.z);`,
      );
  };
  material.customProgramCacheKey = () => "hutan-floor";
  return material;
}
