import * as THREE from "three";
import { PEAT_LAYERS, PROFILE_DEPTH, type PeatLayerId } from "@/lib/peat";
import { PEAT_LAYER_TINT, WET_DARKEN } from "@/components/gambut/scene/dioramaConstants";
import { NOISE_GLSL } from "@/components/gambut/scene/noiseTexture";
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

/** Rona satu lapisan sebagai tetapan GLSL, dibaca dari daftar bersama. */
function tintGlsl(id: PeatLayerId): string {
  return PEAT_LAYER_TINT[id].map((v) => v.toFixed(3)).join(", ");
}

const VERTEX = /* glsl */ `
attribute float aDepth;
attribute float aEdge;

uniform sampler2D uField;
uniform float uCavity;

varying vec2 vUv;
varying float vDepth;
varying float vEdge;
varying vec3 vWorld;
varying vec2 vLocal;
varying vec3 vFaceX;
varying vec3 vFaceZ;
varying float vAsh;

#include <fog_pars_vertex>

void main() {
  vUv = uv;
  vDepth = aDepth;
  vEdge = aEdge;
  // Corak tanah dibaca dari koordinat bongkahan, bukan koordinat dunia, supaya
  // ia menempel pada tanah dan ikut berputar bersama bongkahan.
  vLocal = position.xy;
  vFaceX = normalize(mat3(modelMatrix) * vec3(1.0, 0.0, 0.0));
  vFaceZ = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));

  // Kedalaman rongga: dibaca per sel, permukaan rongga melangkah seperti anak
  // tangga selebar 4,6 cm, jadi nilainya harus dirata-ratakan dengan sel
  // tetangga. Perataannya sekarang sudah dikerjakan di smoothField() pada CPU,
  // jadi di sini cukup satu pembacaan.
  //
  // Dahulu lima pembacaan dengan kernel silang (0,4 pusat + 0,15 di keempat
  // sisi), berbeda dari kernel 3 × 3 yang dipakai peneduh fragmen. Keduanya
  // kini memakai perataan yang sama, sehingga bentuk rongga dan peneduhannya
  // benar-benar sepakat — dahulu keduanya berselisih sedikit.
  vAsh = texture2D(uField, uv).r;

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
uniform sampler2D uContents; // gambar isi tiap lapisan (lihat layerContents.ts)

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
uniform float uDousedDepth; // tebal lapisan atas yang dipadamkan siraman (m)
uniform float uThermal;     // 0 = tampilan nyata, 1 = citra termal
uniform float uCavity;
uniform float uFlicker;     // 0 bila pengguna meminta gerak dikurangi
uniform float uHotspot;     // kekuatan sulutan di permukaan (0–1)
uniform float uHotspotX;    // posisi sulutan pada bidang potong (0–1)

varying vec2 vUv;
varying float vDepth;
varying float vEdge;
varying vec3 vWorld;
varying vec2 vLocal;
varying vec3 vFaceX;
varying vec3 vFaceZ;

// Bagian pemetaan nada & ruang warna sudah disisipkan three.js pada awal
// peneduh, jadi di sini cukup bagian penerapannya di akhir fungsi utama.
#include <fog_pars_fragment>

${NOISE_GLSL}

/**
 * Derau tanah. Kisi deraunya diputar supaya polanya tidak berbaris searah
 * sumbu mendatar dan tegak; barisan itulah yang terbaca sebagai motif kotak.
 */
const mat2 NOISE_TURN = mat2(0.8, -0.6, 0.6, 0.8);

float noise(vec2 p) {
  return kNoise(NOISE_TURN * p + 17.3);
}

float fbm(vec2 p) {
  return kFbm(NOISE_TURN * p + 41.9);
}

/**
 * Baca hasil simulasi tanpa memperlihatkan kisinya.
 *
 * Kisi simulasi hanya 96 x 56 sel untuk bidang selebar 4,4 m, jadi satu sel
 * berukuran sekitar 4,6 cm. Dibaca mentah, tiap sel muncul sebagai bujur
 * sangkar membulat: gambut hangus terlihat sebagai deretan kotak yang
 * berjajar rapi, bukan bercak yang tumbuh tak beraturan seperti kebakaran
 * sebenarnya. Dua hal yang memecah kisinya — rata-rata 3 x 3, dan titik
 * bacanya digeser oleh derau (lihat wob di main).
 *
 * Rata-rata 3 x 3 itu dahulu dikerjakan di sini, sembilan pembacaan tekstur
 * tiap pemanggilan. Fungsi ini dipanggil tiga belas kali, jadi 117 pembacaan
 * tiap fragmen di seluruh layar tiap bingkai. Sekarang kisinya sudah datang
 * dalam keadaan rata dari smoothField() di CPU, dan nilainya sama persis
 * (lihat alasannya di sana), sehingga di sini cukup satu pembacaan.
 *
 * Fungsinya tetap ada, bukan dihapus: ketiga belas tempat pemanggil itu
 * memang bermaksud "baca kisi yang sudah diratakan", dan bila suatu saat
 * perataannya perlu diubah kembali, satu tempat ini yang disunting.
 */
vec4 sampleField(vec2 uv) {
  return texture2D(uField, uv);
}

/** Bobot tiap lapisan pada kedalaman d, dengan peralihan yang lembut. */
vec4 layerWeights(float d) {
  float w = 0.13; // lebar peralihan antarlapisan (m)
  float b0 = smoothstep(uBounds.x - w, uBounds.x + w, d);
  float b1 = smoothstep(uBounds.y - w, uBounds.y + w, d);
  float b2 = smoothstep(uBounds.z - w, uBounds.z + w, d);
  return vec4(1.0 - b0, b0 - b1, b1 - b2, b2);
}

/** Skala warna tiap lapisan; angkanya dari PEAT_LAYER_TINT, sama dengan Modul 01. */
vec3 tintFor(vec4 w) {
  return w.x * vec3(${tintGlsl("fibrik")}) + w.y * vec3(${tintGlsl("hemik")}) +
         w.z * vec3(${tintGlsl("saprik")}) + w.w * vec3(${tintGlsl("mineral")});
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
  vec2 wob = vec2(noise(vLocal * 11.0) - 0.5, noise(vLocal * 11.0 + 7.7) - 0.5) * uTexel * 3.0;
  vec2 fuv = vUv + wob;

  vec4 field = sampleField(fuv);
  float ash = field.r;
  float heat = field.g;
  float char = field.a;

  // --- Kelembapan dihitung mulus dari muka air tanah (bukan dari tekstur,
  // agar garis airnya tidak berbintik-bintik seperti kisi simulasi).
  // Air merembes tidak rata mengikuti pori tanah, jadi batas basahnya berkelok.
  float ragged = fbm(vLocal * 3.1 + 5.0) - 0.5;
  float above = uWaterDepth - vDepth + ragged * 0.14;
  float wet = above <= 0.0 ? 1.0 : clamp(1.0 - above / ${CAPILLARY_RISE.toFixed(3)}, 0.0, 1.0);
  float soak = max(0.0, vDepth + ragged * 0.16);
  float doused = soak < ${DOUSE_DEPTH.toFixed(3)} ? uDouse * (1.0 - soak / ${DOUSE_DEPTH.toFixed(3)}) : 0.0;
  float moisture = clamp(wet + doused, 0.0, 1.0);
  // Lapisan yang dipadamkan siraman: basah sampai jenuh, dan tidak ada pijar
  // yang boleh tampak di dalamnya. Tanpa batas tegas ini, cahaya bara tepat di
  // bawahnya merembes naik dan permukaan yang sudah padam terbaca masih
  // menyala. Lapisannya menipis dari bawah seiring air menguap.
  float soaked = uDousedDepth > 0.0 ? 1.0 - smoothstep(uDousedDepth - 0.03, uDousedDepth + 0.005, soak) : 0.0;
  moisture = max(moisture, soaked);

  // --- Warna dasar gambut: campuran empat tekstur lapisan menurut kedalaman.
  // Koordinatnya dibelokkan oleh derau lebar, dan tiap lapisan diputar sendiri,
  // agar pengulangan foto tanah tidak membentuk kisi. Batas lapisannya juga
  // dibuat saling menjari seperti endapan sungguhan.
  vec2 warp = (vec2(fbm(vLocal * 0.9), fbm(vLocal * 0.9 + 31.7)) - 0.5) * 0.85;
  vec2 uvT = (vLocal + warp) * uUvScale;
  float layerDepth = vDepth + (fbm(vLocal * vec2(1.2, 3.0) + 11.0) - 0.5) * 0.26;
  vec4 w = layerWeights(layerDepth);

  // Lapisan yang tidak ikut menyumbang tidak dibaca teksturnya: kebanyakan
  // titik hanya berada pada satu lapisan, jadi delapan bacaan menjadi dua.
  vec3 albedo = vec3(0.0);
  vec3 nMap = vec3(0.0);
  if (w.x > 0.002) {
    albedo += texture2D(uColor0, uvT).rgb * w.x;
    nMap += texture2D(uNormal0, uvT).rgb * w.x;
  }
  if (w.y > 0.002) {
    vec2 uv1 = mat2(0.87, -0.5, 0.5, 0.87) * uvT + 0.37;
    albedo += texture2D(uColor1, uv1).rgb * w.y;
    nMap += texture2D(uNormal1, uv1).rgb * w.y;
  }
  if (w.z > 0.002) {
    vec2 uv2 = mat2(0.5, -0.87, 0.87, 0.5) * uvT + 0.71;
    albedo += texture2D(uColor2, uv2).rgb * w.z;
    nMap += texture2D(uNormal2, uv2).rgb * w.z;
  }
  if (w.w > 0.002) {
    vec2 uv3 = mat2(-0.7, -0.7, 0.7, -0.7) * uvT + 0.13;
    albedo += texture2D(uColor3, uv3).rgb * w.w;
    nMap += texture2D(uNormal3, uv3).rgb * w.w;
  }
  albedo *= tintFor(w);

  // --- Normal permukaan: peta normal lapisan + lekuk tepi rongga abu.
  vec3 nPeat = normalize(vec3((nMap.xy * 2.0 - 1.0) * 1.3, nMap.z));

  // Ketidakrataan tanah berskala besar: normal dimiringkan mengikuti
  // kemiringan derau halus. Tanpa ini bidang potong terbaca sebagai bidang
  // rata yang diberi gambar, bukan tanah yang permukaannya memang tidak rata.
  vec2 q = vLocal * 0.85;
  vec2 ex = vec2(0.14, 0.0);
  vec2 ey = vec2(0.0, 0.14);
  float gx = noise(q + ex) - noise(q - ex);
  float gy = noise(q + ey) - noise(q - ey);
  nPeat = normalize(nPeat + vec3(-gx, -gy, 0.0) * 1.7);

  // Ragam skala besar agar tekstur foto tidak tampak berulang, ditambah
  // guratan mendatar mengikuti arah pengendapan bahan organik. Guratan paling
  // jelas di gambut fibrik yang seratnya masih utuh, dan hampir hilang di
  // saprik yang sudah halus.
  float mottle = noise(vLocal * 0.55) * 0.45 + noise(vLocal * 1.7) * 0.25;
  float bedding = noise(vec2(vLocal.x * 0.8, (vLocal.y + warp.y * 0.3) * 19.0));
  float fibrous = w.x * 1.0 + w.y * 0.6 + w.z * 0.25 + w.w * 0.15;
  albedo *= 0.78 + mottle * 0.5;
  albedo *= 1.0 + (bedding - 0.5) * 0.22 * fibrous;

  // Retakan halus seperti pada tanah yang baru digali.
  float clod = fbm(vLocal * 2.4 + 3.0);
  albedo *= mix(0.72, 1.0, smoothstep(0.015, 0.09, abs(clod - 0.5)));

  // Isi tiap lapisan: serat, akar, ranting, butiran, dan kerikil. Warnanya
  // dikalikan dengan terang foto tanah di bawahnya dan tepinya digerogoti derau,
  // sehingga ia terbaca tertanam di tanah, bukan digambar di atasnya. Ditaruh
  // sebelum perhitungan basah dan hangus, supaya isinya ikut menggelap saat
  // jenuh air dan ikut habis saat gambutnya menjadi abu.
  vec4 contents = texture2D(uContents, vUv);
  float nibble = smoothstep(0.25, 0.7, noise(vLocal * 90.0));
  float embedded = contents.a * mix(0.55, 1.0, nibble);
  float soilLight = dot(albedo, vec3(0.3, 0.59, 0.11));
  albedo = mix(albedo, contents.rgb * (0.5 + soilLight * 1.5), embedded * 0.82);
#ifdef FACE_DETAIL
  // Benda yang menonjol ikut menangkap cahaya. Turunan layar tidak memerlukan
  // pembacaan tekstur tambahan, jadi biayanya hampir nol.
  nPeat = normalize(nPeat + vec3(-dFdx(embedded), dFdy(embedded), 0.0) * 2.6);
#endif

  // --- Batas antarlapisan, sangat tipis. Pembeda utamanya sudah warna dan isi
  // tiap lapisan; garis yang tegas hanya membuatnya tampak seperti bagan.
  float seam =
    (1.0 - smoothstep(0.0, 0.03, abs(layerDepth - uBounds.x))) * 0.8 +
    (1.0 - smoothstep(0.0, 0.03, abs(layerDepth - uBounds.y))) * 0.9 +
    (1.0 - smoothstep(0.0, 0.035, abs(layerDepth - uBounds.z)));
  albedo *= 1.0 - seam * 0.12;

  float aL = sampleField(fuv - vec2(uTexel.x, 0.0)).r;
  float aR = sampleField(fuv + vec2(uTexel.x, 0.0)).r;
  float aU = sampleField(fuv - vec2(0.0, uTexel.y)).r;
  float aD = sampleField(fuv + vec2(0.0, uTexel.y)).r;
  vec3 nAsh = normalize(vec3((aL - aR) * uCavity * 26.0, (aD - aU) * uCavity * 26.0, 1.0));
  vec3 N = normalize(mix(nPeat, nAsh, smoothstep(0.05, 0.6, ash)));

  // --- Gambut basah: lebih gelap, sedikit kebiruan, dan berkilap. Peralihan
  // kering→basah dibuat tidak rata agar garis airnya terlihat alami.
  float wetEdge = clamp(moisture + (mottle - 0.35) * 0.18, 0.0, 1.0);
  float charGrain = 0.7 + 0.6 * noise(vLocal * 21.0);
  // Gambut jenuh air lebih gelap dan sedikit kebiruan daripada gambut kering
  // di atasnya: batas inilah yang menentukan sampai sedalam apa bara dapat
  // turun, jadi ia harus terbaca sekali lihat. Besarnya peredupan sama dengan
  // Modul 01 (WET_DARKEN); yang ditambahkan di sini hanya condong ke biru,
  // karena sebelumnya separuh bawah penampang — yang memang selalu basah —
  // jatuh ke hampir hitam dan tidak bisa dibaca lagi.
  albedo = mix(albedo, albedo * vec3(${(WET_DARKEN * 1.04).toFixed(3)}, ${(WET_DARKEN * 1.12).toFixed(3)}, ${(WET_DARKEN * 1.26).toFixed(3)}), wetEdge);

  // --- Bekas terbakar: gambut hangus, lalu abu di dalam rongga.
  albedo = mix(albedo, vec3(0.085, 0.062, 0.05) * charGrain, char * 0.85);
  // Gambut yang sedang membara berkerak gelap; pijarnya keluar dari retakan.
  albedo *= 1.0 - smoothstep(0.05, 0.5, heat) * 0.6;
  // Rongga abu: gelap seperti rongga sungguhan, tetapi tidak hitam pekat.
  //
  // Sempat dibuat kelabu terang agar sesuai keterangan warna di panel kanan,
  // dan hasilnya justru lebih buruk: begitu hampir seluruh gambut habis,
  // penampang berubah menjadi satu bidang pucat tanpa bentuk sama sekali.
  // Bentuk cekung rongga sekarang dibaca dari bibirnya (lihat ashRim di
  // bagian pencahayaan), bukan dari warna isinya.
  vec3 ashColor = mix(vec3(0.075, 0.068, 0.062), vec3(0.21, 0.195, 0.18), noise(vLocal * 9.0));
  // Serpih abu putih yang tersebar jarang.
  ashColor += vec3(0.3, 0.29, 0.27) * pow(noise(vLocal * 38.0), 6.0);
  albedo = mix(albedo, ashColor, smoothstep(0.1, 0.9, ash));

  // --- Pencahayaan: matahari + cahaya langit, ditambah bayangan lembut di
  // dalam rongga dan di bawah bibir permukaan.
  vec3 L = normalize(uSunDir);
  vec3 V = normalize(cameraPosition - vWorld);
  // Normal diputar ke ruang dunia, supaya terang bidang potong berubah wajar
  // saat bongkahan diputar. Cahaya dibuat membungkus karena tanah memencarkan
  // cahaya ke segala arah, bukan memantulkannya seperti cermin.
  vec3 worldN = normalize(vFaceX * N.x + vec3(0.0, 1.0, 0.0) * N.y + vFaceZ * N.z);
  float diff = max((dot(worldN, L) + 0.35) / 1.35, 0.0);
  float cavityShade = 1.0 - smoothstep(0.15, 1.0, ash) * 0.62;
  float lipShade = mix(0.55, 1.0, smoothstep(0.0, 0.16, vDepth));
  float spec = pow(max(dot(worldN, normalize(L + V)), 0.0), 48.0) * moisture * 0.7;

  // Cahaya matahari sengaja diberi porsi besar dibanding cahaya langit supaya
  // relief peta normal terbaca dan penampang tidak tampak rata.
  //
  // Kedua porsinya dinaikkan dari 0,85 dan 0,50. Bidang potong ini memakai
  // peneduhnya sendiri, jadi ia tidak menerima pantulan lingkungan seperti
  // bongkahan Modul 01 — tanpa tambahan itu, separuh bawah penampang yang
  // selalu jenuh air terbaca sebagai bidang hitam, padahal di situlah bara
  // nanti berhenti dan justru harus terlihat.
  vec3 color = albedo * (uAmbient * 1.15 + uSunColor * uSunIntensity * diff * 0.56) * cavityShade * lipShade;
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
  // Pijar mengikuti jaringan retakan, bukan satu pita rata.
  float vein = 1.0 - abs(fbm(vLocal * 6.5 + 2.0) * 2.0 - 1.0);
  float glow = heat * breathe * (0.35 + 1.1 * smoothstep(0.62, 0.96, vein)) * (1.0 - soaked);

  // Kedua, rembesan panasnya. Diperlebar dari dua sel ke tiga, dan bobotnya
  // dinaikkan: daerah membara harus terbaca sebagai zona panas yang meluas
  // ke gambut sekitarnya, bukan sebagai garis api bertepi tajam.
  float halo = max(max(sampleField(fuv + vec2(uTexel.x * 3.0, 0.0)).g,
                       sampleField(fuv - vec2(uTexel.x * 3.0, 0.0)).g),
                   max(sampleField(fuv + vec2(0.0, uTexel.y * 3.0)).g,
                       sampleField(fuv - vec2(0.0, uTexel.y * 3.0)).g)) * (1.0 - soaked);

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
  color += vec3(0.33, 0.68, 0.93) * (line * 0.5 + band * 0.05);

  // --- Batas bawah lapisan yang dipadamkan siraman: garis putus-putus biru,
  // dibedakan dari garis muka air tanah yang utuh.
  float douseLine = (1.0 - smoothstep(0.0, 0.014, abs(soak - uDousedDepth))) * step(0.45, fract(vUv.x * 36.0)) * step(0.001, uDousedDepth);
  color += vec3(0.33, 0.68, 0.93) * douseLine * 0.55;

  // --- Penggaris kedalaman di tepi kiri: tanda tiap 0,5 m, lebih panjang
  // tiap 1 m. Pembaca jadi dapat menyebut kedalaman baranya, bukan menebak
  // dari tinggi gambar. Hanya tampil pada tampilan nyata karena citra termal
  // sudah punya penggarisnya sendiri.
  float near05 = abs(vDepth / 0.5 - floor(vDepth / 0.5 + 0.5)) * 0.5;
  float near10 = abs(vDepth - floor(vDepth + 0.5));
  float tickLen = near10 < 0.006 ? 0.085 : 0.05;
  float tick = (1.0 - smoothstep(0.004, 0.009, near05)) * (1.0 - smoothstep(tickLen - 0.014, tickLen, vEdge));
  color += vec3(0.68, 0.7, 0.74) * tick * 0.35 * (1.0 - uThermal);

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
    (noise(vLocal * 3.1) - 0.5) * 0.06;
  float tv = clamp(0.1 + 0.34 * warmth * (1.0 - moisture * 0.72) + grain + heat * 0.92 + ash * 0.05, 0.0, 1.0);
  // Lapisan yang baru disiram dingin oleh air: tampil biru, kontras dengan
  // bara yang masih panas tepat di bawahnya.
  tv = mix(tv, min(tv, 0.08), soaked);
  vec3 thermal = thermalRamp(tv);
  // Penggaris kedalaman memakai tanda tepi yang sama dengan tampilan nyata.
  // Sebelumnya berupa garis mendatar selebar penampang, yang justru menambah
  // kesan bidang datar yang dibagi-bagi.
  thermal += vec3(0.45, 0.52, 0.6) * tick * 0.45;
  thermal += vec3(0.2, 0.55, 0.8) * line * 0.8;
  thermal += vec3(0.2, 0.55, 0.8) * douseLine * 0.6;
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
  uDousedDepth: { value: number };
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
  contents: THREE.Texture,
  noiseTexture: THREE.Texture,
  sunDir: THREE.Vector3,
  /** Mutu tinggi menambahkan relief pada isi lapisan. */
  detailed: boolean,
): THREE.ShaderMaterial {
  const bounds = new THREE.Vector3(PEAT_LAYERS[0].bottom, PEAT_LAYERS[1].bottom, PEAT_LAYERS[2].bottom);
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    defines: detailed ? { FACE_DETAIL: 1 } : {},
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
        uContents: { value: null },
        uNoise: { value: null },
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
        uDousedDepth: { value: 0 },
        uThermal: { value: 0 },
        uCavity: { value: CAVITY_DEPTH },
        uFlicker: { value: 1 },
        uHotspot: { value: 0 },
        uHotspotX: { value: 0.5 },
      },
    ]),
  });
  // `UniformsUtils.merge` menyalin nilainya, jadi tekstur dipasang setelahnya.
  assignFaceTextures(material, colors, normals, field, contents, noiseTexture);
  return material;
}

/** Pasang tekstur ke material (tekstur tidak boleh ikut disalin saat merge). */
export function assignFaceTextures(
  material: THREE.ShaderMaterial,
  colors: THREE.Texture[],
  normals: THREE.Texture[],
  field: THREE.Texture,
  contents: THREE.Texture,
  noiseTexture: THREE.Texture,
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
  material.uniforms.uContents.value = contents;
  material.uniforms.uNoise.value = noiseTexture;
}
