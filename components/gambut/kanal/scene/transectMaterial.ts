import * as THREE from "three";
import { PEAT_LAYERS, PROFILE_DEPTH, type PeatLayerId } from "@/lib/peat";
import { PEAT_LAYER_TINT, WET_DARKEN } from "@/components/gambut/scene/dioramaConstants";
import { CANAL_WIDTH_M, COLUMNS, TRANSECT_LENGTH_M, WATER_LIMIT_M } from "@/lib/drainage";
import { createNoiseTexture, NOISE_GLSL } from "@/components/gambut/scene/noiseTexture";

// `createNoiseTexture` diekspor ulang supaya KanalScene tidak perlu tahu
// bahwa deraunya kini milik bersama, bukan milik modul ini.
export { createNoiseTexture };

// Bahan tanah Modul 03.
//
// --- Mengapa MeshStandardMaterial, bukan peneduh sendiri ---------------------
//
// Rancangan sebelumnya memakai `ShaderMaterial` tersendiri dengan pencahayaan
// yang ditulis tangan: satu suku ambien ditambah satu angka tetap untuk
// matahari. Hasilnya bidang yang warnanya benar tetapi permukaannya mati —
// tidak pernah menerima bayangan, tidak pernah memantulkan langit, tidak
// pernah tersentuh kabut. Bongkahan tanah yang tidak menerima bayangan apa pun
// terbaca sebagai gambar yang ditempel di depan latar, bukan sebagai benda
// yang berada di dalam pemandangan.
//
// Di sini keduanya digabung. Rangkanya `MeshStandardMaterial` — jadi cahaya,
// peta lingkungan langit, bayangan, dan kabut dikerjakan three.js dengan
// jalur yang sudah dioptimalkan — sementara warna dasarnya tetap datang dari
// hasil simulasi, disuntikkan lewat `onBeforeCompile`. Yang didapat: tanah
// yang menerima matahari pagi dan bayangan pohon, tetapi masih mengatakan
// dengan tepat sampai kedalaman berapa gambut ini masih jenuh air.
//
// Peta normal tiap lapisan ikut dipakai — berkasnya sudah ada di repositori
// untuk Modul 01 dan 02, dan tidak dipakai Modul 03 sama sekali sebelum ini.
// Peta normal inilah yang membuat serat fibrik dan bongkah saprik punya
// relief; tanpanya, tekstur foto hanyalah gambar rata.
//
// --- Tekstur keadaan --------------------------------------------------------
//
// Dibaca dari satu tekstur data selebar jumlah kolom simulasi dan setinggi
// satu piksel: R = penurunan permukaan, G = kedalaman muka air, B = melewati
// batas 40 cm. Semuanya sebagai bagian dari kedalaman profil, sehingga
// peneduh tidak perlu tahu meternya.

/** Rona satu lapisan sebagai tetapan GLSL, dibaca dari daftar bersama. */
function tintGlsl(id: PeatLayerId): string {
  return PEAT_LAYER_TINT[id].map((v) => v.toFixed(3)).join(", ");
}

// ---------------------------------------------------------------------------
//  BIDANG POTONG
// ---------------------------------------------------------------------------

const FACE_PARS = /* glsl */ `
uniform sampler2D uColor0;
uniform sampler2D uColor1;
uniform sampler2D uColor2;
uniform sampler2D uColor3;
uniform sampler2D uNormal0;
uniform sampler2D uNormal1;
uniform sampler2D uNormal2;
uniform sampler2D uNormal3;
uniform sampler2D uField;
uniform vec3 uBounds;    // kedalaman batas fibrik/hemik, hemik/saprik, saprik/mineral (m)
uniform float uProfile;  // kedalaman seluruh profil (m)
uniform float uDryTint;  // kekuatan penandaan daerah rawan (0-1)
uniform float uRiskFront; // sejauh mana penandaan sudah menjalar dari kanal (m)
uniform float uTransect;  // panjang transek simulasi (m)

varying float vDepth;
varying float vField;
varying vec3 vPeatWorld;

${NOISE_GLSL}

/** Bobot tiap lapisan pada kedalaman d, dengan peralihan yang lembut. */
vec4 kLayerWeights(float d) {
  float w = 0.07;
  float b0 = smoothstep(uBounds.x - w, uBounds.x + w, d);
  float b1 = smoothstep(uBounds.y - w, uBounds.y + w, d);
  float b2 = smoothstep(uBounds.z - w, uBounds.z + w, d);
  return vec4(1.0 - b0, b0 - b1, b1 - b2, b2);
}
`;

/**
 * Warna dasar bidang potong.
 *
 * Menggantikan `map_fragment`, sehingga seluruh sisa jalur PBR — bayangan,
 * peta lingkungan, kabut — tetap berjalan apa adanya di atasnya.
 */
const FACE_DIFFUSE = /* glsl */ `
  vec4 kField = texture2D(uField, vec2(vField, 0.5));
  float kWaterDepth = kField.g * uProfile;
  float kRisk = kField.b;

  vec2 kUv = vMapUv;
  vec4 kW = kLayerWeights(vDepth);
  vec3 kAlbedo =
    texture2D(uColor0, kUv).rgb * kW.x +
    texture2D(uColor1, kUv).rgb * kW.y +
    texture2D(uColor2, kUv).rgb * kW.z +
    texture2D(uColor3, kUv).rgb * kW.w;
  kAlbedo *= kW.x * vec3(${tintGlsl("fibrik")}) + kW.y * vec3(${tintGlsl("hemik")}) +
             kW.z * vec3(${tintGlsl("saprik")}) + kW.w * vec3(${tintGlsl("mineral")});

  // Ragam skala besar supaya tekstur foto tidak tampak berulang, ditambah
  // guratan mendatar mengikuti arah pengendapan bahan organik — paling jelas
  // di fibrik yang seratnya masih utuh.
  float kMottle = kNoise(kUv * 0.5) * 0.58;
  float kBedding = kNoise(vec2(vPeatWorld.x * 0.7, vPeatWorld.y * 16.0));
  float kFibrous = kW.x * 1.0 + kW.y * 0.6 + kW.z * 0.25 + kW.w * 0.15;
  kAlbedo *= 0.8 + kMottle * 0.46;
  kAlbedo *= 1.0 + (kBedding - 0.5) * 0.3 * kFibrous;

  // Garis batas antarlapisan. Perpaduan warna saja terlalu halus untuk
  // dibaca, sehingga susunan strata tidak terlihat.
  float kWaver = (kNoise(vec2(vPeatWorld.x * 0.6, 3.1)) - 0.5) * 0.06;
  float kSeam =
    (1.0 - smoothstep(0.0, 0.02, abs(vDepth - uBounds.x - kWaver))) * 0.8 +
    (1.0 - smoothstep(0.0, 0.022, abs(vDepth - uBounds.y - kWaver))) * 0.9 +
    (1.0 - smoothstep(0.0, 0.026, abs(vDepth - uBounds.z - kWaver)));
  kAlbedo *= 1.0 - kSeam * 0.36;

  // Alas tanah mineral di bawah profil gambut diredupkan. Ia hanya penopang
  // bongkahan supaya kanal tidak tampak menembus dasarnya.
  kAlbedo *= mix(1.0, 0.5, smoothstep(uBounds.z, uBounds.z + 0.45, vDepth));

  // Gambut jenuh air lebih gelap dan sedikit kebiruan daripada gambut kering
  // di atasnya. Batas inilah seluruh isi modul ini, jadi ia harus terbaca
  // sekali lihat. Besar peredupannya sama dengan Modul 01 dan 02.
  float kWet = smoothstep(-0.02, 0.06, vDepth - kWaterDepth);
  kAlbedo = mix(
    kAlbedo,
    kAlbedo * vec3(${(WET_DARKEN * 1.04).toFixed(3)}, ${(WET_DARKEN * 1.12).toFixed(3)}, ${(WET_DARKEN * 1.26).toFixed(3)}),
    kWet
  );

  // Lapisan kering di atas muka air: bahan bakar yang dibahas Modul 02.
  float kDry = 1.0 - kWet;
  kAlbedo = mix(kAlbedo, kAlbedo * vec3(1.18, 1.1, 0.92), kDry * (1.0 - smoothstep(0.0, 0.9, vDepth)) * 0.85);

  // Penandaan daerah rawan: hanya bagian keringnya, bukan seluruh kolom, dan
  // hanya sejauh mukanya sudah menjalar dari kanal.
  float kReached = 1.0 - smoothstep(uRiskFront - 3.0, uRiskFront, vField * uTransect);
  kAlbedo = mix(kAlbedo, kAlbedo * vec3(1.28, 0.78, 0.58), kRisk * kDry * uDryTint * kReached);

  // Garis muka air tanah, dengan pias lembut di bawahnya supaya batas
  // kering-basah terbaca sebagai bidang, bukan sekadar satu garis. Dimasukkan
  // sebagai warna dasar, bukan sebagai pancaran, agar ia tetap tunduk pada
  // cahaya dan kabut seperti sisa bidangnya.
  float kLine = 1.0 - smoothstep(0.0, 0.012, abs(vDepth - kWaterDepth));
  float kBand = (1.0 - smoothstep(0.0, 0.12, abs(vDepth - kWaterDepth))) * step(kWaterDepth, vDepth);
  kAlbedo += vec3(0.33, 0.68, 0.93) * (kLine * 1.1 + kBand * 0.1);

  // Garis batas 40 cm PP 57/2016, di seluruh lebar gambar.
  kAlbedo += vec3(0.95, 0.62, 0.3) *
    (1.0 - smoothstep(0.0, 0.008, abs(vDepth - ${WATER_LIMIT_M.toFixed(3)}))) * 0.45;

  diffuseColor.rgb *= kAlbedo;

  // Gambut jenuh air memantul lebih tajam daripada gambut kering yang
  // berdebu. Inilah tanda kedua batas muka air, dan satu-satunya yang masih
  // terbaca ketika gambarnya dilihat sambil lalu.
  kFaceRoughness = mix(0.96, 0.62, kWet);
`;

/** Peta normal empat lapisan, dipadukan dengan bobot yang sama. */
const FACE_NORMAL = /* glsl */ `
  vec4 kNw = kLayerWeights(vDepth);
  vec3 kMapN =
    texture2D(uNormal0, vMapUv).xyz * kNw.x +
    texture2D(uNormal1, vMapUv).xyz * kNw.y +
    texture2D(uNormal2, vMapUv).xyz * kNw.z +
    texture2D(uNormal3, vMapUv).xyz * kNw.w;
  kMapN = kMapN * 2.0 - 1.0;
  kMapN.xy *= normalScale;
  normal = normalize(tbn * kMapN);
`;

export type FaceUniforms = {
  uField: { value: THREE.Texture };
  uDryTint: { value: number };
  uRiskFront: { value: number };
  /**
   * Kedalaman galian yang sedang digambar (m).
   *
   * Hanya dibaca bahan hamparan permukaan — bidang potong tidak punya
   * tanggul — tetapi tetap dipasang pada keduanya supaya `dataUniforms`
   * berbentuk sama dan pemanggilnya tidak perlu tahu bahan mana yang
   * memerlukan apa.
   */
  uCanalDepth: { value: number };
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

/** Bahan yang warnanya ditentukan simulasi, dengan uniform tambahannya. */
export type DataMaterial = THREE.MeshStandardMaterial & { dataUniforms: FaceUniforms };

/**
 * Buat bahan bidang potong.
 *
 * `colors` dan `normals` berurutan sesuai `PEAT_LAYERS`.
 */
export function createTransectMaterial(
  colors: THREE.Texture[],
  normals: THREE.Texture[],
  field: THREE.Texture,
  noise: THREE.Texture,
): DataMaterial {
  const bounds = new THREE.Vector3(PEAT_LAYERS[0].bottom, PEAT_LAYERS[1].bottom, PEAT_LAYERS[2].bottom);

  const material = new THREE.MeshStandardMaterial({
    // Peta pertama dipasang hanya supaya three.js menyalakan jalur `map` dan
    // `normalMap` — koordinat dan isinya diambil alih suntikan di bawah.
    map: colors[0],
    normalMap: normals[0],
    normalScale: new THREE.Vector2(1.1, 1.1),
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
  }) as DataMaterial;

  const uniforms: FaceUniforms = {
    uField: { value: field },
    uDryTint: { value: 1 },
    uRiskFront: { value: 0 },
    uCanalDepth: { value: 0 },
  };
  material.dataUniforms = uniforms;

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uTransect: { value: TRANSECT_LENGTH_M },
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
         attribute float aField;
         varying float vDepth;
         varying float vField;
         varying vec3 vPeatWorld;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
         vDepth = aDepth;
         vField = aField;
         vPeatWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FACE_PARS}\nfloat kFaceRoughness = 1.0;`)
      .replace("#include <map_fragment>", FACE_DIFFUSE)
      .replace("#include <normal_fragment_maps>", FACE_NORMAL)
      // Kekasaran ditetapkan setelah `roughnessmap_fragment` menghitungnya,
      // supaya nilai dari batas basah-kering di atas tidak ditimpa kembali.
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>\n  roughnessFactor = kFaceRoughness;`,
      );
  };

  // Dua bahan dengan `onBeforeCompile` yang berbeda harus punya kunci program
  // yang berbeda, kalau tidak three.js memakai ulang program yang salah.
  material.customProgramCacheKey = () => "kanal-face";
  return material;
}

// ---------------------------------------------------------------------------
//  HAMPARAN PERMUKAAN
// ---------------------------------------------------------------------------
//
// Bidang atas bongkahan. Tugasnya satu, dan tugas itu tidak dikerjakan oleh
// rancangan pertama modul ini sama sekali: memperlihatkan bahwa yang hilang
// bukan cuma air di bawah tanah, melainkan juga yang hidup di atasnya.
//
// Pembaca tidak dapat melihat muka air tanah — itulah seluruh persoalan
// gambut. Yang dapat dilihatnya adalah tumbuhan. Jadi di sini kedalaman muka
// air diterjemahkan menjadi warna permukaan: hijau selama airnya dekat,
// menguning begitu melewati batas 40 cm, lalu kelabu dan retak ketika
// tanahnya sudah melesak. Itulah urutan yang sama yang dilihat orang di
// lapangan, dan urutan itulah yang harus dikenali pembaca.

const SURFACE_PARS = /* glsl */ `
uniform sampler2D uField;
uniform float uProfile;
uniform float uDryTint;
uniform float uRiskFront;   // sejauh mana penandaan sudah menjalar dari kanal (m)
uniform float uCanalHalf;   // setengah lebar kanal (m)
uniform float uTransect;    // panjang transek simulasi (m)
uniform float uCanalDepth;  // kedalaman galian yang sedang digambar (m)

varying vec3 vGroundWorld;

${NOISE_GLSL}
`;

const SURFACE_DIFFUSE = /* glsl */ `
  // Keadaan petak ini dibaca menurut jaraknya dari tepi kanal, bukan menurut
  // uv: hamparan ini digambar dua kali, dicerminkan, jadi yang berlaku adalah
  // jarak mutlaknya.
  float kDistance = max(0.0, abs(vGroundWorld.x) - uCanalHalf);

  // Butiran tekstur foto permukaan, disimpan sebelum warnanya ditimpa.
  //
  // Inilah cacat yang membuat hamparan ini terbaca sebagai kain hijau polos.
  // Potongan ini disisipkan sesudah map_fragment, jadi diffuseColor di
  // sini memuat foto permukaan gambut — lalu baris terakhir potongan ini
  // menimpanya seluruhnya dengan warna hasil hitungan, dan warna tumbuhan
  // yang dihitungnya tidak pernah membaca foto itu sama sekali. Yang
  // sampai ke layar karena itu hanya derau berskala meter: tidak ada satu
  // pun butir, serat, atau bintik seukuran daun di seluruh permukaan,
  // sehingga mata tidak punya apa pun untuk dibaca sebagai bahan.
  //
  // Yang dipakai hanya kecerahannya, bukan ronanya: rona foto tanah kering
  // akan menguningkan hutan yang masih hijau. Dinormalkan terhadap
  // kecerahan rata-rata fotonya sendiri, sehingga ia hanya menambah
  // ragam — tidak menggelapkan atau menerangkan apa pun secara keseluruhan.
  float kGrain = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
  kGrain = clamp(kGrain / 0.30, 0.55, 1.5);

  vec4 kField = texture2D(uField, vec2(min(1.0, kDistance / uTransect), 0.5));
  float kWaterDepth = kField.g * uProfile;
  float kDrop = kField.r * uProfile;

  // Dua tahap, bukan satu, karena yang terjadi di lapangan memang dua tahap
  // yang berbeda. Pertama airnya menjauh dari akar: tumbuhan menguning tetapi
  // tanahnya masih utuh. Kemudian tanahnya sendiri habis: permukaan melesak,
  // retak, dan yang tersisa tinggal gambut telanjang.
  //
  // Penggerak utamanya penurunan permukaan, bukan kedalaman muka air, dengan
  // alasan yang sama seperti pada pohon (lihat scene/vegetation.ts): muka air
  // turun seketika begitu pengatur digeser, sedangkan yang hidup di atas
  // tanah membutuhkan tahun untuk mati.
  float kRuin = smoothstep(0.04, 0.6, kDrop);
  float kThirst = max(kRuin, smoothstep(0.5, 2.0, kWaterDepth) * 0.45);

  // Rumpun tumbuhan. Bercak-bercak, bukan hamparan rata: gambut yang sudah
  // terganggu ditumbuhi pakis dan semak dalam rumpun yang terpisah.
  //
  // Tiga skala, bukan dua, dan yang ditambahkan justru yang paling kasar:
  // petak selebar belasan meter yang membuat satu sudut lahan lebih rapat
  // dan lebih tua daripada sudut yang lain. Tanpa petak itu, seluruh
  // hamparan punya kerapatan rata-rata yang sama di mana-mana, dan hamparan
  // yang rata-ratanya sama di mana-mana terbaca sebagai karpet — persis
  // kesan "hijau kaku" yang harus hilang dari gambar ini. Biayanya satu
  // pencarian tekstur, sebab deraunya sekarang tekstur.
  float kPatch = kNoise(vGroundWorld.xz * 0.07);
  float kClump = kFbm(vGroundWorld.xz * 0.22);
  float kBlade = kFbm(vGroundWorld.xz * 1.7);

  // Tanggul galian. Bentuknya persis sama dengan spoilM pada scene/transect.ts
  // — di sana ia menaikkan tanahnya, di sini ia menelanjanginya — dan kedua
  // tempat itu harus memakai angka yang sama, jika tidak gundukan tanahnya
  // berdiri di satu tempat dan tanah telanjangnya di tempat lain.
  //
  // Inilah yang membuat kanal terbaca sebagai galian dan bukan sebagai parit
  // yang selalu ada di situ: tanah yang baru dikeruk tidak sempat ditumbuhi
  // apa pun, jadi di sepanjang kedua tepi kanal ada pita coklat telanjang
  // yang lebarnya tumbuh bersama dalamnya galian.
  // Tepinya digoyang oleh derau rumpun supaya pita telanjang ini tidak
  // berupa garis sejajar kanal sepanjang tiga puluh meter: tanah yang
  // dilempar dari galian jatuh berantakan, tidak diukur.
  float kSpoilT = (kDistance - 2.4 + (kClump - 0.5) * 3.4) / 3.2;
  float kSpoil = exp(-kSpoilT * kSpoilT) * smoothstep(0.05, 0.5, uCanalDepth);

  float kCover = clamp(
    (kClump + 0.30 + kPatch * 0.34) * 1.5 - kThirst * 1.5 - kRuin * 0.6,
    0.0,
    1.0
  ) * (1.0 - kSpoil * 0.88);

  // Hijau hutan rawa, bukan hijau rumput taman: gelap, agak kebiruan, dan
  // tidak pernah rata. Rona dasarnya sendiri bergeser antarpetak — lumut
  // gambut, pakis, dan semak berdaun keras tidak sehijau satu sama lain.
  vec3 kLush = mix(vec3(0.062, 0.128, 0.052), vec3(0.105, 0.168, 0.068), kPatch);
  vec3 kPlant = mix(kLush, vec3(0.22, 0.23, 0.10), kThirst);
  kPlant = mix(kPlant, vec3(0.34, 0.27, 0.14), kRuin * 0.7);
  kPlant *= (0.5 + kBlade * 0.68 + kClump * 0.3) * kGrain;

  // Tanah telanjang di bawah tumbuhan: gambut yang makin pucat lalu
  // kelabu-kehitaman begitu bahan organiknya teroksidasi habis.
  // Ragam tanah telanjang memakai ulang derau rumpun, hanya digeser —
  // menghitungnya sekali lagi pada skala lain tidak menghasilkan apa pun yang
  // dapat dibedakan mata pada jarak ini.
  vec3 kBare = diffuseColor.rgb * mix(vec3(0.42, 0.33, 0.24), vec3(0.30, 0.26, 0.24), kRuin);
  kBare *= 0.85 + (kClump * 0.6 + kBlade * 0.4) * 0.4;
  // Gambut yang baru dikeruk masih lembap, jadi lebih gelap dan lebih merah
  // daripada permukaan di sekitarnya yang sudah lama kering.
  kBare = mix(kBare, kBare * vec3(0.78, 0.66, 0.58), kSpoil * 0.8);

  vec3 kGround = mix(kBare, kPlant, kCover);

  // Retak kemarau: hanya pada tanah yang sudah benar-benar kering, dan hanya
  // di tempat tumbuhannya sudah hilang.
  // Dihitung hanya di tempat yang tanahnya memang sudah melesak dan
  // tumbuhannya sudah habis. Di seluruh babak 01 dan 02 syarat itu tidak
  // pernah terpenuhi di mana pun, jadi deraunya tidak pernah dihitung.
  // Frekuensinya dinaikkan dari 0,55 ke 2,4. Pada 0,55 satu sel derau
  // selebar hampir dua meter, sehingga "retak" yang digambarnya selebar satu
  // meter dan sepanjang belasan — bukan retak kemarau melainkan parit cacing
  // raksasa, dan itulah yang membuat permukaan babak 04 terbaca sebagai
  // corak yang digambar, bukan sebagai tanah yang pecah. Retak kemarau
  // sebenarnya membentuk petak selebar sejengkal sampai setengah meter;
  // 2,4 memberi sel 42 cm.
  float kCrackable = kRuin * (1.0 - kCover);
  if (kCrackable > 0.01) {
    float kCrack = 1.0 - smoothstep(0.0, 0.03, abs(kFbm(vGroundWorld.xz * 2.4 + 11.3) - 0.5));
    kGround *= 1.0 - kCrack * kCrackable * 0.6;
  }

  // Penandaan daerah rawan, sama ronanya dengan bidang potong supaya pembaca
  // membaca keduanya sebagai satu keterangan.
  float kReached = 1.0 - smoothstep(uRiskFront - 3.0, uRiskFront, kDistance);
  kGround = mix(kGround, kGround * vec3(1.26, 0.8, 0.6), kField.b * uDryTint * kReached * 0.5);

  // Warna per titik tidak dikalikan di sini: color_fragment yang berjalan
  // tepat sesudah potongan ini sudah mengerjakannya, dan mengerjakannya dua
  // kali membuat peneduhan tepi potong menjadi dua kali lebih gelap.
  diffuseColor.rgb = kGround;

  // Daun memantul cahaya jauh lebih tajam daripada gambut kering, dan tanah
  // gambut yang masih lembap lebih tajam daripada yang sudah berdebu.
  kSurfaceRoughness = mix(mix(0.95, 0.82, 1.0 - kRuin), 0.58, kCover);
`;

/** Buat bahan hamparan permukaan. */
export function createSurfaceMaterial(
  ground: THREE.Texture,
  groundNormal: THREE.Texture,
  field: THREE.Texture,
  noise: THREE.Texture,
): DataMaterial {
  const material = new THREE.MeshStandardMaterial({
    map: ground,
    normalMap: groundNormal,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughness: 1,
    metalness: 0,
    vertexColors: true,
    side: THREE.DoubleSide,
  }) as DataMaterial;

  const uniforms: FaceUniforms = {
    uField: { value: field },
    uDryTint: { value: 1 },
    uRiskFront: { value: 0 },
    uCanalDepth: { value: 0 },
  };
  material.dataUniforms = uniforms;

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uProfile: { value: PROFILE_DEPTH },
      uCanalHalf: { value: CANAL_WIDTH_M / 2 },
      uTransect: { value: TRANSECT_LENGTH_M },
      uNoise: { value: noise },
      ...uniforms,
    });

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n varying vec3 vGroundWorld;`)
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>\n vGroundWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${SURFACE_PARS}\nfloat kSurfaceRoughness = 1.0;`)
      .replace("#include <map_fragment>", `#include <map_fragment>\n${SURFACE_DIFFUSE}`)
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>\n  roughnessFactor = kSurfaceRoughness;`,
      );
  };

  material.customProgramCacheKey = () => "kanal-surface";
  return material;
}

// ---------------------------------------------------------------------------
//  AIR KANAL
// ---------------------------------------------------------------------------
//
// Air kanal memantulkan langit. Itu bukan hiasan: pantulan langit adalah
// satu-satunya hal yang membedakan air dari lubang gelap di dalam tanah, dan
// tanpanya kanal terbaca sebagai parit kosong. Pantulannya diambil dari peta
// lingkungan yang sudah dibuat `SkyLighting` untuk seluruh adegan, jadi tidak
// ada biaya tambahan sama sekali.
//
// Riaknya berjalan menyusuri kanal selama kanal terbuka, dan berhenti begitu
// sekat dipasang — perbedaan yang terbaca seketika, tanpa perlu dibaca
// angkanya.

export type WaterMaterial = THREE.MeshStandardMaterial & {
  waterUniforms: { uTime: { value: number }; uFlow: { value: number } };
};

export function createCanalWaterMaterial(): WaterMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#22363d"),
    roughness: 0.12,
    metalness: 0.35,
    transparent: true,
    opacity: 0.94,
  }) as WaterMaterial;

  const uniforms = { uTime: { value: 0 }, uFlow: { value: 1 } };
  material.waterUniforms = uniforms;

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n varying vec2 vRipUv;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\n vRipUv = uv;`);

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
         uniform float uTime;
         uniform float uFlow;
         varying vec2 vRipUv;`,
      )
      // Riak dikerjakan sebagai goyangan normal, bukan sebagai garis terang:
      // yang membuat air tampak bergerak adalah pantulan langit yang bergeser,
      // bukan warnanya yang berubah.
      .replace(
        "#include <normal_fragment_begin>",
        `#include <normal_fragment_begin>
         // Frekuensinya rendah dengan sengaja. Riak yang rapat pada bidang
         // selebar delapan meter yang dilihat miring berubah menjadi pola
         // kotak-kotak yang berkedip — bukan air, melainkan cacat gambar.
         float kRip = sin(vRipUv.y * 13.0 - uTime * 1.6) * 0.5 +
                      sin(vRipUv.x * 5.0 + uTime * 0.9) * 0.3;
         // Dinaikkan dari 0,05. Pada petak yang kini digambar sepertiga lebih
         // besar, goyangan selemah itu tidak lagi cukup memecah pantulan
         // langit, sehingga permukaan kanal terbaca sebagai satu bidang
         // berwarna rata — pelat biru tua, bukan air.
         normal = normalize(normal + vec3(kRip * 0.09 * uFlow, 0.0, kRip * 0.045 * uFlow));`,
      )
      // Air yang tertahan sekat menjadi tenang dan karena itu lebih memantul.
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>\n  roughnessFactor = mix(0.06, 0.16, uFlow);`,
      );
  };

  material.customProgramCacheKey = () => "kanal-water";
  return material;
}
