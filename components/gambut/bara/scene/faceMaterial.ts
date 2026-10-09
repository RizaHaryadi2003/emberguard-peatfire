import * as THREE from "three";
import { PEAT_LAYERS, PROFILE_DEPTH } from "@/lib/peat";
import { CAPILLARY_RISE, DOUSE_DEPTH, GRID_COLS, GRID_ROWS } from "@/lib/smolder";

// Peneduh (shader) bidang potong gambut. Seluruh tampilan Modul 02 ditentukan
// di sini: strata gambut dari tekstur foto, gelap-terangnya gambut basah,
// jaringan bara yang berpijar, rongga abu yang melesak ke dalam, sampai mode
// termal. Semua dibaca dari satu tekstur data hasil simulasi `SmolderSim`
// (R = abu, G = panas bara, B = kelembapan, A = hangus).
//
// Ditulis sebagai peneduh sendiri, bukan MeshStandardMaterial, karena yang
// dibutuhkan bukan sekadar pewarnaan: rongga abu harus benar-benar masuk ke
// dalam bongkahan (perpindahan titik), tepi baranya harus berpijar dan
// berkedip, dan seluruh bidang harus bisa berganti menjadi citra termal.

/** Kedalaman rongga abu ke dalam bongkahan (m) saat gambut habis terbakar. */
export const CAVITY_DEPTH = 0.16;

const VERTEX = /* glsl */ `
attribute float aDepth;
attribute float aEdge;

uniform sampler2D uField;
uniform vec2 uTexel;
uniform float uCavity;

varying vec2 vUv;
varying float vDepth;
varying float vEdge;
varying vec3 vWorld;
varying float vAsh;

#include <fog_pars_vertex>

void main() {
  vUv = uv;
  vDepth = aDepth;
  vEdge = aEdge;

  // Kedalaman rongga dirata-ratakan dengan sel tetangga. Dibaca per sel,
  // permukaan rongga melangkah seperti anak tangga selebar 4,6 cm.
  vAsh =
    texture2D(uField, uv).r * 0.4 +
    (texture2D(uField, uv + vec2(uTexel.x, 0.0)).r +
     texture2D(uField, uv - vec2(uTexel.x, 0.0)).r +
     texture2D(uField, uv + vec2(0.0, uTexel.y)).r +
     texture2D(uField, uv - vec2(0.0, uTexel.y)).r) * 0.15;

  // Gambut yang sudah menjadi abu ditarik masuk sehingga terbentuk rongga nyata.
  vec3 p = position;
  p.z -= vAsh * uCavity;

  vec4 world = modelMatrix * vec4(p, 1.0);
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
uniform sampler2D uNormal0;
uniform sampler2D uNormal1;
uniform sampler2D uNormal2;
uniform sampler2D uNormal3;
uniform sampler2D uField;

uniform vec2 uTexel;
uniform vec3 uBounds;      // kedalaman batas fibrik/hemik, hemik/saprik, saprik/mineral (m)
uniform float uProfile;    // kedalaman seluruh profil (m)
uniform float uUvScale;    // pengulangan tekstur per meter
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSunIntensity;
uniform vec3 uAmbient;
uniform float uWaterDepth;  // muka air tanah (m di bawah permukaan)
uniform float uDouse;       // sisa air siraman permukaan (0–1)
uniform float uThermal;     // 0 = tampilan nyata, 1 = citra termal
uniform float uCavity;
uniform float uFlicker;     // 0 bila pengguna meminta gerak dikurangi
uniform float uHotspot;     // kekuatan sulutan di permukaan (0–1)
uniform float uHotspotX;    // posisi sulutan pada bidang potong (0–1)

varying vec2 vUv;
varying float vDepth;
varying float vEdge;
varying vec3 vWorld;
varying float vAsh;

// Bagian pemetaan nada & ruang warna sudah disisipkan three.js pada awal
// peneduh, jadi di sini cukup bagian penerapannya di akhir fungsi utama.
#include <fog_pars_fragment>

/** Derau halus dua dimensi untuk bintik & kedipan. */
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

/**
 * Baca hasil simulasi tanpa memperlihatkan kisinya.
 *
 * Kisi simulasi hanya 96 x 56 sel untuk bidang selebar 4,4 m, jadi satu sel
 * berukuran sekitar 4,6 cm. Dibaca mentah, tiap sel muncul sebagai bujur
 * sangkar membulat: gambut hangus terlihat sebagai deretan kotak yang
 * berjajar rapi, bukan bercak yang tumbuh tak beraturan seperti kebakaran
 * sebenarnya. Dua hal dikerjakan di sini — rata-rata 3 x 3 untuk melembutkan
 * tepi, dan titik bacanya digeser oleh derau (lihat uWobble di main) supaya
 * garis kisinya pecah.
 */
vec4 sampleField(vec2 uv) {
  vec2 t = uTexel;
  vec4 s = texture2D(uField, uv) * 4.0;
  s += (texture2D(uField, uv + vec2(t.x, 0.0)) + texture2D(uField, uv - vec2(t.x, 0.0)) +
        texture2D(uField, uv + vec2(0.0, t.y)) + texture2D(uField, uv - vec2(0.0, t.y))) * 2.0;
  s += texture2D(uField, uv + t) + texture2D(uField, uv - t) +
       texture2D(uField, uv + vec2(t.x, -t.y)) + texture2D(uField, uv + vec2(-t.x, t.y));
  return s * 0.0625;
}

/** Bobot tiap lapisan pada kedalaman d, dengan peralihan yang lembut. */
vec4 layerWeights(float d) {
  float w = 0.09; // lebar peralihan antarlapisan (m)
  float b0 = smoothstep(uBounds.x - w, uBounds.x + w, d);
  float b1 = smoothstep(uBounds.y - w, uBounds.y + w, d);
  float b2 = smoothstep(uBounds.z - w, uBounds.z + w, d);
  return vec4(1.0 - b0, b0 - b1, b1 - b2, b2);
}

/** Skala warna tiap lapisan; nilainya sama dengan LAYER_TINT di CutBlock. */
vec3 tintFor(vec4 w) {
  return w.x * vec3(1.06, 0.84, 0.62) + w.y * vec3(0.72, 0.56, 0.42) + w.z * vec3(0.34, 0.26, 0.21) + w.w * vec3(0.86, 0.86, 0.87);
}

/** Palet citra termal: biru tua (dingin & basah) sampai putih (bara). */
vec3 thermalRamp(float v) {
  vec3 c = mix(vec3(0.015, 0.03, 0.11), vec3(0.09, 0.05, 0.36), smoothstep(0.0, 0.28, v));
  c = mix(c, vec3(0.52, 0.08, 0.36), smoothstep(0.28, 0.5, v));
  c = mix(c, vec3(1.0, 0.36, 0.03), smoothstep(0.5, 0.74, v));
  c = mix(c, vec3(1.0, 0.93, 0.72), smoothstep(0.74, 1.0, v));
  return c;
}

void main() {
  // Pergeseran acak sebesar ± 1 sel. Semua pembacaan simulasi memakai
  // pergeseran yang sama, sehingga bara, abu, dan gambut hangus tetap saling
  // bertepatan meski tepinya tidak lagi mengikuti kisi.
  vec2 wob = vec2(noise(vWorld.xy * 11.0) - 0.5, noise(vWorld.xy * 11.0 + 7.7) - 0.5) * uTexel * 2.2;
  vec2 fuv = vUv + wob;

  vec4 field = sampleField(fuv);
  float ash = field.r;
  float heat = field.g;
  float char = field.a;

  // --- Kelembapan dihitung mulus dari muka air tanah (bukan dari tekstur,
  // agar garis airnya tidak berbintik-bintik seperti kisi simulasi).
  float above = uWaterDepth - vDepth;
  float wet = above <= 0.0 ? 1.0 : clamp(1.0 - above / ${CAPILLARY_RISE.toFixed(3)}, 0.0, 1.0);
  float doused = vDepth < ${DOUSE_DEPTH.toFixed(3)} ? uDouse * (1.0 - vDepth / ${DOUSE_DEPTH.toFixed(3)}) : 0.0;
  float moisture = clamp(wet + doused, 0.0, 1.0);

  // --- Warna dasar gambut: campuran empat tekstur lapisan menurut kedalaman.
  vec2 uvT = vec2(vWorld.x, vWorld.y) * uUvScale;
  vec4 w = layerWeights(vDepth);
  vec3 albedo =
    texture2D(uColor0, uvT).rgb * w.x +
    texture2D(uColor1, uvT).rgb * w.y +
    texture2D(uColor2, uvT).rgb * w.z +
    texture2D(uColor3, uvT).rgb * w.w;
  albedo *= tintFor(w);

  // --- Normal permukaan: peta normal lapisan + lekuk tepi rongga abu.
  vec3 nMap =
    texture2D(uNormal0, uvT).rgb * w.x +
    texture2D(uNormal1, uvT).rgb * w.y +
    texture2D(uNormal2, uvT).rgb * w.z +
    texture2D(uNormal3, uvT).rgb * w.w;
  vec3 nPeat = normalize(vec3((nMap.xy * 2.0 - 1.0) * 1.3, nMap.z));

  // Ketidakrataan tanah berskala besar: normal dimiringkan mengikuti
  // kemiringan derau halus. Tanpa ini bidang potong terbaca sebagai bidang
  // rata yang diberi gambar, bukan tanah yang permukaannya memang tidak rata.
  vec2 q = vec2(vWorld.x, vWorld.y) * 0.85;
  vec2 ex = vec2(0.14, 0.0);
  vec2 ey = vec2(0.0, 0.14);
  float gx = noise(q + ex) - noise(q - ex);
  float gy = noise(q + ey) - noise(q - ey);
  nPeat = normalize(nPeat + vec3(-gx, -gy, 0.0) * 1.7);

  // Ragam skala besar agar tekstur foto tidak tampak berulang, ditambah
  // guratan mendatar mengikuti arah pengendapan bahan organik. Guratan paling
  // jelas di gambut fibrik yang seratnya masih utuh, dan hampir hilang di
  // saprik yang sudah halus.
  float mottle = noise(vec2(vWorld.x, vWorld.y) * 0.55) * 0.45 + noise(vec2(vWorld.x, vWorld.y) * 1.7) * 0.25;
  float bedding = noise(vec2(vWorld.x * 0.8, vWorld.y * 19.0));
  float fibrous = w.x * 1.0 + w.y * 0.6 + w.z * 0.25 + w.w * 0.15;
  albedo *= 0.78 + mottle * 0.5;
  albedo *= 1.0 + (bedding - 0.5) * 0.34 * fibrous;

  // --- Garis batas antarlapisan. Perpaduan warna antarlapisan saja terlalu
  // halus untuk dibaca, sehingga susunan strata tidak terlihat. Garis ini
  // tipis dan hanya menggelapkan sedikit; batasnya dibuat bergelombang
  // mengikuti derau agar tidak tampak ditarik dengan penggaris.
  float waver = (noise(vec2(vWorld.x * 0.65, 3.1)) - 0.5) * 0.08;
  float seam =
    (1.0 - smoothstep(0.0, 0.024, abs(vDepth - uBounds.x - waver))) * 0.8 +
    (1.0 - smoothstep(0.0, 0.026, abs(vDepth - uBounds.y - waver))) * 0.9 +
    (1.0 - smoothstep(0.0, 0.03, abs(vDepth - uBounds.z - waver)));
  albedo *= 1.0 - seam * 0.38;

  float aL = sampleField(fuv - vec2(uTexel.x, 0.0)).r;
  float aR = sampleField(fuv + vec2(uTexel.x, 0.0)).r;
  float aU = sampleField(fuv - vec2(0.0, uTexel.y)).r;
  float aD = sampleField(fuv + vec2(0.0, uTexel.y)).r;
  vec3 nAsh = normalize(vec3((aL - aR) * uCavity * 26.0, (aD - aU) * uCavity * 26.0, 1.0));
  vec3 N = normalize(mix(nPeat, nAsh, smoothstep(0.05, 0.6, ash)));

  // --- Gambut basah: lebih gelap, sedikit kebiruan, dan berkilap. Peralihan
  // kering→basah dibuat tidak rata agar garis airnya terlihat alami.
  float wetEdge = clamp(moisture + (mottle - 0.35) * 0.18, 0.0, 1.0);
  // Gambut jenuh air dibuat jelas lebih gelap dan kebiruan daripada gambut
  // kering di atasnya: batas inilah yang menentukan sampai sedalam apa bara
  // dapat turun, jadi ia harus terbaca sekali lihat.
  albedo = mix(albedo, albedo * vec3(0.34, 0.4, 0.5), wetEdge);

  // --- Bekas terbakar: gambut hangus, lalu abu di dalam rongga.
  albedo = mix(albedo, vec3(0.085, 0.062, 0.05), char * 0.85);
  // Rongga abu: gelap seperti rongga sungguhan, tetapi tidak hitam pekat.
  //
  // Sempat dibuat kelabu terang agar sesuai keterangan warna di panel kanan,
  // dan hasilnya justru lebih buruk: begitu hampir seluruh gambut habis,
  // penampang berubah menjadi satu bidang pucat tanpa bentuk sama sekali.
  // Bentuk cekung rongga sekarang dibaca dari bibirnya (lihat ashRim di
  // bagian pencahayaan), bukan dari warna isinya.
  vec3 ashColor = mix(vec3(0.075, 0.068, 0.062), vec3(0.21, 0.195, 0.18), noise(uvT * 7.0));
  albedo = mix(albedo, ashColor, smoothstep(0.1, 0.9, ash));

  // --- Pencahayaan: matahari + cahaya langit, ditambah bayangan lembut di
  // dalam rongga dan di bawah bibir permukaan.
  vec3 L = normalize(uSunDir);
  vec3 V = normalize(cameraPosition - vWorld);
  float diff = max(dot(N, L), 0.0);
  float cavityShade = 1.0 - smoothstep(0.15, 1.0, ash) * 0.62;
  float lipShade = mix(0.55, 1.0, smoothstep(0.0, 0.16, vDepth));
  float spec = pow(max(dot(N, normalize(L + V)), 0.0), 48.0) * moisture * 0.5;

  // Cahaya matahari sengaja diberi porsi besar dibanding cahaya langit supaya
  // relief peta normal terbaca dan penampang tidak tampak rata.
  vec3 color = albedo * (uAmbient * 0.85 + uSunColor * uSunIntensity * diff * 0.5) * cavityShade * lipShade;
  color += uSunColor * spec * uSunIntensity * 0.16;

  // Cahaya tipis di bibir rongga abu. Inilah yang memberi rongga bentuk:
  // tanpanya, daerah yang sudah habis hanya bidang gelap tanpa batas.
  float ashRim = clamp(length(vec2(aR - aL, aD - aU)) * 2.4, 0.0, 1.0) * smoothstep(0.08, 0.55, ash);
  color += vec3(0.52, 0.48, 0.43) * ashRim * 0.4;

  // --- Bara.
  //
  // Bara gambut tidak bernyala. Ia membara pelan seperti arang: berdenyut
  // dalam hitungan detik, bukan berkedip-kedip seperti lidah api. Tiga hal
  // di bawah ini yang dahulu membuatnya terbaca sebagai api, dan ketiganya
  // membantah kalimat modul ini sendiri — "api tanpa nyala".
  //
  // Pertama, kedipannya. Derau berfrekuensi tinggi (12 dan 31) yang bergerak
  // cepat (0,9 dan 1,7) menghasilkan kerlip seperti kobaran. Sekarang
  // frekuensinya rendah dan geraknya lambat, sehingga yang terlihat adalah
  // tarikan napas bara, bukan jilatan api.
  float breathe = 1.0 - uFlicker * 0.17 * (noise(vUv * 3.2 + uTime * 0.22) + noise(vUv * 6.5 - uTime * 0.41) - 1.0);
  float glow = heat * breathe;

  // Kedua, rembesan panasnya. Diperlebar dari dua sel ke tiga, dan bobotnya
  // dinaikkan: daerah membara harus terbaca sebagai zona panas yang meluas
  // ke gambut sekitarnya, bukan sebagai garis api bertepi tajam.
  float halo = max(max(sampleField(fuv + vec2(uTexel.x * 3.0, 0.0)).g,
                       sampleField(fuv - vec2(uTexel.x * 3.0, 0.0)).g),
                   max(sampleField(fuv + vec2(0.0, uTexel.y * 3.0)).g,
                       sampleField(fuv - vec2(0.0, uTexel.y * 3.0)).g));

  // Ketiga, warnanya. Puncaknya dahulu nyaris putih kekuningan — warna nyala,
  // bukan warna bara. Sekarang berhenti di jingga, dengan dasar merah tua
  // seperti arang yang menyala di dalam abu.
  vec3 emberColor = mix(vec3(0.42, 0.045, 0.006), vec3(0.95, 0.3, 0.03), smoothstep(0.15, 0.62, glow));
  emberColor = mix(emberColor, vec3(1.0, 0.54, 0.14), smoothstep(0.7, 1.0, glow));
  color += emberColor * (glow * 1.9 + halo * halo * 0.8);

  // --- Tepi depan bara. Inilah yang sebenarnya ingin dilihat pembaca: batas
  // antara gambut yang sudah membara dan yang belum. Nilai panasnya saja
  // terlalu merata untuk menunjukkannya, jadi tepinya ditebalkan memakai
  // besar perubahan panas antar sel yang bersebelahan.
  float hL = sampleField(fuv - vec2(uTexel.x, 0.0)).g;
  float hR = sampleField(fuv + vec2(uTexel.x, 0.0)).g;
  float hU = sampleField(fuv - vec2(0.0, uTexel.y)).g;
  float hD = sampleField(fuv + vec2(0.0, uTexel.y)).g;
  float front = clamp(length(vec2(hR - hL, hD - hU)) * 2.0, 0.0, 1.0);
  // Dilunakkan dari 1,3 ke 0,55 dan warnanya diturunkan ke jingga: tepi yang
  // terlalu terang dan bergerigi itulah yang dahulu terbaca sebagai lidah api.
  color += vec3(1.0, 0.45, 0.12) * front * max(glow, halo) * 0.55;

  // --- Titik sulutan di permukaan pada babak pertama.
  float hotDist = length(vec2((vUv.x - uHotspotX) * 2.2, vDepth * 3.2));
  color += vec3(1.0, 0.45, 0.12) * uHotspot * exp(-hotDist * 5.0) * 2.0;

  // --- Garis muka air tanah, dengan pias lembut di bawahnya supaya batas
  // kering–basah terbaca sebagai bidang, bukan sekadar satu garis.
  float line = 1.0 - smoothstep(0.0, 0.021, abs(vDepth - uWaterDepth));
  float band = (1.0 - smoothstep(0.0, 0.16, abs(vDepth - uWaterDepth))) * step(uWaterDepth, vDepth);
  color += vec3(0.33, 0.68, 0.93) * (line * 0.95 + band * 0.1);

  // --- Penggaris kedalaman di tepi kiri: tanda tiap 0,5 m, lebih panjang
  // tiap 1 m. Pembaca jadi dapat menyebut kedalaman baranya, bukan menebak
  // dari tinggi gambar. Hanya tampil pada tampilan nyata karena citra termal
  // sudah punya penggarisnya sendiri.
  float near05 = abs(vDepth / 0.5 - floor(vDepth / 0.5 + 0.5)) * 0.5;
  float near10 = abs(vDepth - floor(vDepth + 0.5));
  float tickLen = near10 < 0.006 ? 0.085 : 0.05;
  float tick = (1.0 - smoothstep(0.004, 0.009, near05)) * (1.0 - smoothstep(tickLen - 0.014, tickLen, vEdge));
  color += vec3(0.68, 0.7, 0.74) * tick * 0.6 * (1.0 - uThermal);

  // --- Citra termal.
  //
  // Nilainya dahulu hanya diambil dari kelembapan dan panas, sehingga seluruh
  // gambut kering menjadi satu bidang ungu yang rata dan seluruh gambut jenuh
  // air menjadi satu bidang biru tua yang rata. Hasilnya terbaca sebagai
  // gambar vektor, bukan citra kamera.
  //
  // Sekarang suhu semunya disusun dari tiga hal yang memang menentukannya di
  // lapangan: permukaan yang hangat oleh matahari, suhu yang meluruh terhadap
  // kedalaman, dan air yang mendinginkan. Ditambah butiran halus menyerupai
  // derau sensor inframerah supaya bidangnya tidak pernah benar-benar rata.
  float warmth = exp(-vDepth * 0.5);
  float grain =
    (noise(vUv * vec2(260.0, 180.0)) - 0.5) * 0.05 +
    (noise(vec2(vWorld.x, vWorld.y) * 3.1) - 0.5) * 0.06;
  float tv = clamp(0.1 + 0.34 * warmth * (1.0 - moisture * 0.72) + grain + heat * 0.92 + ash * 0.05, 0.0, 1.0);
  vec3 thermal = thermalRamp(tv);
  // Penggaris kedalaman memakai tanda tepi yang sama dengan tampilan nyata.
  // Sebelumnya berupa garis mendatar selebar penampang, yang justru menambah
  // kesan bidang datar yang dibagi-bagi.
  thermal += vec3(0.45, 0.52, 0.6) * tick * 0.45;
  thermal += vec3(0.2, 0.55, 0.8) * line * 0.8;
  color = mix(color, thermal, uThermal);

  gl_FragColor = vec4(color, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export type FaceUniforms = {
  uField: { value: THREE.Texture };
  uTime: { value: number };
  uSunDir: { value: THREE.Vector3 };
  uSunColor: { value: THREE.Color };
  uSunIntensity: { value: number };
  uAmbient: { value: THREE.Color };
  uWaterDepth: { value: number };
  uDouse: { value: number };
  uThermal: { value: number };
  uFlicker: { value: number };
  uHotspot: { value: number };
  uHotspotX: { value: number };
};

/**
 * Buat material bidang potong. `colors` & `normals` berurutan sesuai
 * `PEAT_LAYERS` (fibrik, hemik, saprik, mineral).
 */
export function createFaceMaterial(
  colors: THREE.Texture[],
  normals: THREE.Texture[],
  field: THREE.Texture,
  sunDir: THREE.Vector3,
): THREE.ShaderMaterial {
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
        uNormal0: { value: null },
        uNormal1: { value: null },
        uNormal2: { value: null },
        uNormal3: { value: null },
        uField: { value: null },
        uTexel: { value: new THREE.Vector2(1 / GRID_COLS, 1 / GRID_ROWS) },
        uBounds: { value: bounds },
        uProfile: { value: PROFILE_DEPTH },
        uUvScale: { value: 0.75 },
        uTime: { value: 0 },
        uSunDir: { value: sunDir.clone() },
        uSunColor: { value: new THREE.Color(1, 0.86, 0.68) },
        uSunIntensity: { value: 3.6 },
        uAmbient: { value: new THREE.Color(0.32, 0.34, 0.36) },
        uWaterDepth: { value: 0.85 },
        uDouse: { value: 0 },
        uThermal: { value: 0 },
        uCavity: { value: CAVITY_DEPTH },
        uFlicker: { value: 1 },
        uHotspot: { value: 0 },
        uHotspotX: { value: 0.5 },
      },
    ]),
  });
  // `UniformsUtils.merge` menyalin nilainya, jadi tekstur dipasang setelahnya.
  assignFaceTextures(material, colors, normals, field);
  return material;
}

/** Pasang tekstur ke material (tekstur tidak boleh ikut disalin saat merge). */
export function assignFaceTextures(
  material: THREE.ShaderMaterial,
  colors: THREE.Texture[],
  normals: THREE.Texture[],
  field: THREE.Texture,
): void {
  material.uniforms.uColor0.value = colors[0];
  material.uniforms.uColor1.value = colors[1];
  material.uniforms.uColor2.value = colors[2];
  material.uniforms.uColor3.value = colors[3];
  material.uniforms.uNormal0.value = normals[0];
  material.uniforms.uNormal1.value = normals[1];
  material.uniforms.uNormal2.value = normals[2];
  material.uniforms.uNormal3.value = normals[3];
  material.uniforms.uField.value = field;
}
