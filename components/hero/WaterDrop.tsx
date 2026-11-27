"use client";

import { type Ref, type RefObject, useEffect, useImperativeHandle, useRef } from "react";
import { DROP_RADIUS, fallHeight, RING_RADIUS, sharedRipple } from "@/lib/waterRipple";
import { SECOND_SCALE, splashAt } from "@/lib/waterSplash";

/** Ketajaman kanvas dibatasi agar layar beresolusi tinggi tidak terbebani. */
const MAX_DPR = 1.5;
/** Lama tetesan tenggelam menyatu dengan air (detik). */
const MERGE_S = 0.006;

/**
 * Kamera mengorbit titik jatuh. Dari depan: rendah dan dekat, menatap sedikit
 * di atas permukaan agar kolom air terbingkai. Dari atas: tepat tegak lurus,
 * sehingga lingkaran riak 12 cm sama persis dengan lingkaran faktor di layar.
 */
const CAMERA = {
  front: { elevation: (14 * Math.PI) / 180, distance: 0.14, targetZ: 0.007 },
  top: { elevation: Math.PI / 2, distance: 0.6, targetZ: 0 },
};

/** Nilai yang digerakkan urutan gulir (useHeroScroll). */
export type WaterState = {
  /** 0 → 1: tetesan terbentuk dari salinan logo. */
  morph: number;
  /** 0 → 1: kemajuan jatuh bebas dari logo ke permukaan. */
  fall: number;
  /** Detik nyata sejak tetesan menyentuh air (gerak lambat diatur linimasa). */
  time: number;
  /** 0 → 1: kamera naik dari depan ke atas. */
  camera: number;
  /** 1 → 0: seluruh air memudar sebelum roda diperbesar. */
  fade: number;
};

export type WaterHandle = {
  /** false bila peramban tidak punya WebGL2; urutan gulir lalu memakai cara lama. */
  supported: boolean;
  state: WaterState;
  /** Minta digambar ulang pada bingkai berikutnya. */
  invalidate(): void;
};

type Props = {
  handleRef: Ref<WaterHandle | null>;
  /** Roda faktor, untuk ukuran lingkaran di layar. */
  wheelRef: RefObject<HTMLElement | null>;
};

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

// Dunia dalam meter: x ke kanan, y menjauhi kamera depan, z ke atas.
// Titik jatuh di (0, 0, 0), permukaan air tenang di z = 0.
const FRAG = `#version 300 es
precision highp float;

uniform vec2 uRes;
uniform float uDpr;
uniform float uFocal;      // panjang fokus (piksel CSS)
uniform vec3 uCamPos;
uniform vec3 uFwd;
uniform vec3 uRight;
uniform vec3 uUp;
uniform float uRingM;      // jari-jari lingkaran faktor (m)
uniform sampler2D uProfile;// profil riak: tinggi, kemiringan, kelengkungan
uniform float uSamples;
uniform float uExtent;
uniform float uRipple;
uniform float uFade;
uniform vec4 uDrop;        // x, z, jari-jari, kehadiran tetesan jatuh
uniform vec4 uBead;        // z, jari-jari, regangan, kehadiran butir
uniform vec4 uJet0;        // tinggi, jari-jari ujung, jari-jari kaki, tinggi kaki
uniform vec4 uJet1;
uniform vec2 uBulb;        // z dan jari-jari gembung di ujung kolom
uniform float uZTop;       // batas atas ruang kolom
out vec4 outColor;

// Pembesar riak. Riak setinggi aslinya hampir tak tampak di layar, jadi
// tinggi (dekat titik jatuh) dan kemiringan (jauh) dibesarkan; bentuk, jarak,
// dan waktunya tetap hasil fisika.
const float H_GAIN = 3.0;
const float SLOPE_GAIN = 9.0;
const float CAUSTIC_GAIN = 0.03;
// Kekuatan pantulan studio di permukaan air (1 = sepenuhnya).
const float WATER_REFL = 0.6;
// Ruang dekat titik jatuh yang digambar sebagai benda 3D penuh (m).
const float CORE = 0.014;
const vec3 KEY = vec3(-0.15, 0.55, 0.82); // arah softbox utama (dinormalkan di bawah)

vec3 profileAt(float r) {
  float x = clamp(r / uExtent, 0.0, 1.0) * (uSamples - 1.0);
  float i = floor(x);
  vec4 a = texelFetch(uProfile, ivec2(int(i), 0), 0);
  vec4 b = texelFetch(uProfile, ivec2(int(min(i + 1.0, uSamples - 1.0)), 0), 0);
  return mix(a, b, x - i).xyz * (1.0 - smoothstep(0.85, 1.0, r / uExtent)) * uRipple;
}

float softRect(vec2 p, vec2 h, float soft) {
  vec2 d = abs(p) - h;
  float o = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  return 1.0 - smoothstep(-soft, soft, o);
}

// Panel cahaya persegi ke arah c (dinormalkan), ukuran sudut h.
float panel(vec3 d, vec3 c, vec2 h, float soft) {
  float k = dot(d, c);
  if (k <= 0.0) return 0.0;
  vec3 u = normalize(cross(c, vec3(0.0, 0.0, 1.0)));
  vec3 v = cross(u, c);
  return softRect(vec2(dot(d, u), dot(d, v)) / k, h, soft);
}

// Studio hitam-putih: softbox besar di atas-belakang, dua lampu jalur tegak di
// kiri dan kanan belakang (garis tepi terang pada air yang melengkung), cahaya
// isi lembut dari depan, dan ruang redup. Nilai HDR agar kilau tampak nyata.
float studio(vec3 d) {
  float key = panel(d, normalize(KEY), vec2(0.34, 0.22), 0.08) * 30.0;
  float stripL = panel(d, normalize(vec3(-0.85, 0.3, 0.42)), vec2(0.05, 0.5), 0.04) * 9.0;
  float stripR = panel(d, normalize(vec3(0.85, 0.3, 0.42)), vec2(0.05, 0.5), 0.04) * 9.0;
  vec3 f = normalize(vec3(0.0, -0.75, 0.66));
  float fill = 1.4 * pow(max(dot(d, f), 0.0), 6.0);
  float room = 0.12 + 0.35 * max(d.z, 0.0);
  return key + stripL + stripR + fill + room;
}

float fresnel(float c) { return 0.02 + 0.98 * pow(1.0 - clamp(c, 0.0, 1.0), 5.0); }

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// Kolom air sebagai benda putar: kaki melebar, badan ramping, ujung membulat.
float sdJet(vec3 p, vec4 jet) {
  if (jet.x <= 0.0) return 1e3;
  float r = length(p.xy);
  float capZ = jet.x - jet.y;
  if (p.z > capZ) return length(vec2(r, p.z - capZ)) - jet.y;
  // Di bawah permukaan kaki terus melebar, menyatu dengan dinding kawah.
  float rc = jet.y + (jet.z - jet.y) * min(exp(-p.z / jet.w), 4.0);
  return (r - rc) * 0.7;
}

// Kolom tanpa permukaan air, untuk pantulannya. Bagian di bawah permukaan
// dipotong agar pantulan kaki kolom bertemu garis air dengan rapi.
float sdObjects(vec3 p) {
  float d = min(sdJet(p, uJet0), sdJet(p, uJet1));
  if (uBulb.y > 0.0) d = smin(d, length(p - vec3(0.0, 0.0, uBulb.x)) - uBulb.y, 4e-4);
  return max(d, -p.z);
}

float sdScene(vec3 p) {
  float surf = (p.z - H_GAIN * profileAt(length(p.xy)).x) * 0.8;
  float d = smin(surf, sdJet(p, uJet0), 1.2e-3);
  d = smin(d, sdJet(p, uJet1), 8e-4);
  if (uBulb.y > 0.0) d = smin(d, length(p - vec3(0.0, 0.0, uBulb.x)) - uBulb.y, 4e-4);
  return d;
}

vec3 sceneNormal(vec3 p) {
  const vec2 e = vec2(1.0, -1.0) * 6e-5;
  return normalize(e.xyy * sdScene(p + e.xyy) + e.yyx * sdScene(p + e.yyx) +
                   e.yxy * sdScene(p + e.yxy) + e.xxx * sdScene(p + e.xxx));
}

// Rentang t sinar di dalam tabung inti (|xy| < CORE, zMin < z < uZTop).
vec2 coreSpan(vec3 ro, vec3 rd, float zMin) {
  float a = dot(rd.xy, rd.xy);
  float b = dot(ro.xy, rd.xy);
  float c = dot(ro.xy, ro.xy) - CORE * CORE;
  float h = b * b - a * c;
  if (h < 0.0 || a < 1e-12) return vec2(1.0, 0.0);
  h = sqrt(h);
  vec2 t = vec2(-b - h, -b + h) / a;
  vec2 tz = vec2((zMin - ro.z) / rd.z, (uZTop - ro.z) / rd.z);
  if (rd.z < 0.0) tz = tz.yx;
  return vec2(max(max(t.x, tz.x), 0.0), min(t.y, tz.y));
}

// Elipsoid (bola diregang tegak): jarak t, dan jarak tegak lurus sinar ke
// pusatnya dalam satuan jari-jari (untuk tepi halus).
vec2 hitEllipsoid(vec3 ro, vec3 rd, vec3 c, float r, float s) {
  vec3 sc = vec3(r, r, r * s);
  vec3 o = (ro - c) / sc;
  vec3 d = rd / sc;
  float a = dot(d, d);
  float b = dot(o, d);
  float cc = dot(o, o) - 1.0;
  float h = b * b - a * cc;
  float perp = sqrt(max(cc + 1.0 - b * b / a, 0.0));
  if (h < 0.0) return vec2(-1.0, perp);
  return vec2((-b - sqrt(h)) / a, perp);
}

vec3 ellipsoidNormal(vec3 p, vec3 c, float r, float s) {
  return normalize((p - c) / vec3(r * r, r * r, r * r * s * s));
}

// Badan air bening (tetesan, butir, kolom): kilau studio, tepi gelap karena
// cahaya dibiaskan menjauh, dan cahaya terpusat di sisi bawah-depan.
void shadeBody(vec3 rd, vec3 n, inout float light, inout float dark) {
  float cv = clamp(dot(-rd, n), 0.0, 1.0);
  light += fresnel(cv) * studio(reflect(rd, n));
  dark += 0.05 + 0.62 * smoothstep(0.3, 0.92, 1.0 - cv);
  light += 0.5 * pow(max(dot(n, normalize(vec3(0.12, -0.55, -0.35))), 0.0), 3.0);
}

// Butir, tetesan, atau kolom yang terpantul di permukaan air.
bool reflectedBody(vec3 p, vec3 rr, out vec3 n) {
  n = vec3(0.0);
  float best = 1e9;
  if (uBead.w > 0.0) {
    vec3 c = vec3(0.0, 0.0, uBead.x);
    vec2 h = hitEllipsoid(p, rr, c, uBead.y, uBead.z);
    if (h.x > 0.0 && h.x < best) { best = h.x; n = ellipsoidNormal(p + rr * h.x, c, uBead.y, uBead.z); }
  }
  if (uDrop.w > 0.0) {
    vec3 c = vec3(uDrop.x, 0.0, uDrop.y);
    vec2 h = hitEllipsoid(p, rr, c, uDrop.z, 1.0);
    if (h.x > 0.0 && h.x < best) { best = h.x; n = ellipsoidNormal(p + rr * h.x, c, uDrop.z, 1.0); }
  }
  // Kolom: telusur pendek, hanya bila sinar pantul melewati tabung inti.
  if (uJet0.x > 0.0 || uJet1.x > 0.0) {
    vec2 span = coreSpan(p, rr, 0.0);
    float t = max(span.x, 1e-4);
    for (int i = 0; i < 64; i++) {
      if (t > span.y || t > best) break;
      vec3 q = p + rr * t;
      float d = sdObjects(q);
      if (d < 4e-5) {
        best = t;
        const vec2 e = vec2(1.0, -1.0) * 6e-5;
        n = normalize(e.xyy * sdObjects(q + e.xyy) + e.yyx * sdObjects(q + e.yyx) +
                      e.yxy * sdObjects(q + e.yxy) + e.xxx * sdObjects(q + e.xxx));
        break;
      }
      t += max(d, 2e-5);
    }
  }
  return best < 1e9;
}

// Bayangan lembut di dasar air dari benda setinggi z di atas titik xy;
// cahaya utama dari atas-belakang, jadi bayangan jatuh ke arah kamera.
float shadowAt(vec2 xy, vec2 at, float z, float r, float strength) {
  vec3 k = normalize(KEY);
  vec2 s = at - k.xy * z / k.z;
  float sig = r * (1.0 + 18.0 * z / max(uRingM, 1e-3));
  vec2 d = xy - s;
  return strength * exp(-dot(d, d) / (2.0 * sig * sig)) / (1.0 + 30.0 * z);
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
  vec2 sc = px - 0.5 * uRes;
  vec3 ro = uCamPos;
  vec3 rd = normalize(uFwd * uFocal + uRight * sc.x - uUp * sc.y);

  float light = 0.0;
  float dark = 0.0;
  float tHit = 1e9;
  vec3 n = vec3(0.0, 0.0, 1.0);
  bool core = false;

  // 1. Permukaan di dekat titik jatuh: kawah, kolom, dan gembung (raymarch).
  vec2 span = coreSpan(ro, rd, -0.012);
  // Sinar yang sudah menembus air di luar tabung tidak boleh melihat isinya.
  float tPlane = rd.z < 0.0 ? -ro.z / rd.z : 1e9;
  if (span.y > span.x && tPlane > span.x) {
    float t = span.x;
    for (int i = 0; i < 90; i++) {
      if (t > span.y) break;
      float d = sdScene(ro + rd * t);
      if (d < 2e-5) { tHit = t; core = true; break; }
      t += max(d, 1e-5);
    }
  }
  // 2. Di luar itu: bidang air dengan riak sebagai kemiringan.
  if (!core && rd.z < 0.0) tHit = -ro.z / rd.z;

  if (tHit < 1e9) {
    vec3 p = ro + rd * tHit;
    float r = length(p.xy);
    vec3 pr = profileAt(r);
    if (core) n = sceneNormal(p);
    else {
      vec2 dir = r > 1e-6 ? p.xy / r : vec2(0.0);
      float gain = mix(H_GAIN, SLOPE_GAIN, smoothstep(CORE, 2.5 * CORE, r));
      n = normalize(vec3(-dir * pr.y * gain, 1.0));
    }
    // Air hanya di sekitar lingkaran, memudar halus ke luar.
    float pool = (1.0 - smoothstep(1.2 * uRingM, 1.95 * uRingM, r)) * uFade;
    float steep = smoothstep(0.25, 0.7, 1.0 - n.z);
    // Dasar air makin sulit terlihat saat dipandang miring (pantulan menguat).
    float seeFloor = pow(clamp(-rd.z, 0.0, 1.0), 2.0);

    // Pantulan studio di permukaan, utuh seperti pada foto: air tenang
    // memantulkan softbox sebagai bidang terang, riak memecahnya menjadi pita.
    // Bagian yang hanya memantulkan ruang redup dibuat sedikit gelap agar
    // lembah riak tetap terbaca dari atas.
    vec3 rr = reflect(rd, n);
    float F = fresnel(dot(-rd, n));
    vec3 bn;
    bool mirrored = reflectedBody(p, rr, bn);
    float env = mirrored ? 0.0 : studio(rr);
    float refl = F * env * WATER_REFL;
    float calm = fresnel(-rd.z) * studio(reflect(rd, vec3(0.0, 0.0, 1.0))) * WATER_REFL;
    float sL = refl;
    float sD = clamp((calm - refl) * 1.5, 0.0, 0.2);
    if (mirrored) {
      float bl = 0.0;
      float bd = 0.0;
      shadeBody(rr, bn, bl, bd);
      sL += F * 2.2 * bl;
      sD += F * 1.5 * bd;
    }

    // Kaustik di dasar: puncak riak memusatkan cahaya, lembah menyebarkannya.
    float c = -profileAt(length(p.xy - vec2(0.0015, -0.004))).z * CAUSTIC_GAIN;
    c = c / sqrt(1.0 + 4.0 * c * c);
    sL += max(c, 0.0) * 0.7 * seeFloor;
    sD += max(-c, 0.0) * 0.4 * seeFloor;

    // Bayangan butir, tetesan, dan kolom di dasar.
    float sh = 0.0;
    if (uBead.w > 0.0) sh += shadowAt(p.xy, vec2(0.0), uBead.x, uBead.y, 0.55 * uBead.w);
    if (uDrop.w > 0.0) sh += shadowAt(p.xy, vec2(uDrop.x, 0.0), uDrop.y, uDrop.z, 0.55 * uDrop.w);
    float jetH = max(uJet0.x, uJet1.x);
    if (jetH > 0.0) {
      vec3 k = normalize(KEY);
      vec2 tip = -k.xy * jetH / k.z;
      vec2 seg = p.xy - tip * clamp(dot(p.xy, tip) / max(dot(tip, tip), 1e-9), 0.0, 1.0);
      float w = max(uJet0.z, uJet1.z);
      sh += 0.4 * exp(-dot(seg, seg) / (2.0 * w * w)) * min(jetH / 0.005, 1.0);
    }
    sD += sh * mix(0.5, 1.0, seeFloor);

    light += sL * mix(1.0, 0.6, steep) * pool;
    dark += sD * pool;

    // Bagian curam (dinding kawah, kolom) diwarnai sebagai badan air.
    if (steep > 0.0) {
      float bl = 0.0;
      float bd = 0.0;
      shadeBody(rd, n, bl, bd);
      light += bl * steep * uFade;
      dark += bd * steep * uFade;
    }
  }

  // 3. Tetesan jatuh dan butir yang melambung: elipsoid analitik dengan tepi
  //    halus selebar satu piksel.
  for (int k = 0; k < 2; k++) {
    vec4 b = k == 0 ? uDrop : vec4(0.0, uBead.x, uBead.y, uBead.w);
    float s = k == 0 ? 1.0 : uBead.z;
    if (b.w <= 0.0 || b.z <= 0.0) continue;
    vec3 c = vec3(b.x, 0.0, b.y);
    vec2 h = hitEllipsoid(ro, rd, c, b.z, s);
    float depth = dot(c - ro, uFwd);
    float edgePx = (1.0 - h.y) * b.z * uFocal / max(depth, 1e-4);
    float cover = clamp(edgePx + 0.5, 0.0, 1.0) * b.w;
    if (cover <= 0.0 || (h.x > 0.0 && h.x > tHit)) continue;
    // Di luar tepi (sinar nyaris lewat), warnai titik tepi terdekat.
    vec3 toC = c - ro;
    vec3 side = toC - rd * dot(toC, rd);
    vec3 q = h.x > 0.0 ? ro + rd * h.x : c - normalize(side + 1e-9) * b.z;
    vec3 bn = ellipsoidNormal(q, c, b.z, s);
    float bl = 0.0;
    float bd = 0.0;
    shadeBody(rd, bn, bl, bd);
    light = mix(light, bl, cover);
    dark = mix(dark, bd, cover);
  }

  float L = 1.0 - exp(-light);
  float D = clamp(dark, 0.0, 0.85);
  float alpha = L + D * (1.0 - L);
  // Derau halus ±½ tingkat warna agar gradasi lembut tidak berpita.
  float nz = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  alpha = clamp(alpha + (nz - 0.5) / 255.0, 0.0, 1.0);
  L = clamp(L + (nz - 0.5) / 255.0, 0.0, alpha);
  outColor = vec4(vec3(0.957, 0.953, 0.945) * L, alpha);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? "shader");
  return sh;
}

type Vec3 = [number, number, number];

/** Jari-jari lingkaran faktor di laptop (px), patokan jarak kamera depan. */
const DESKTOP_RING_PX = 256;

/**
 * Kamera orbit pada kemajuan `k` (0 depan → 1 atas). Di layar kecil kamera
 * depan didekatkan agar percikan tidak terlalu kecil.
 */
function cameraAt(k: number, ringPx: number) {
  const { front, top } = CAMERA;
  const mix = (a: number, b: number) => a + (b - a) * k;
  const el = mix(front.elevation, top.elevation);
  const near = front.distance * Math.pow(Math.min(1, ringPx / DESKTOP_RING_PX), 0.7);
  const dist = near + (top.distance - near) * k;
  const tz = mix(front.targetZ, top.targetZ);
  const c = Math.cos(el);
  const s = Math.sin(el);
  return {
    pos: [0, -dist * c, tz + dist * s] as Vec3,
    fwd: [0, c, -s] as Vec3,
    up: [0, s, c] as Vec3,
    right: [1, 0, 0] as Vec3,
  };
}

/**
 * Air dan tetesan pada beranda sebagai adegan 3D, digambar WebGL2 di satu
 * kanvas.
 *
 * - Riak (lib/waterRipple.ts) dan percikan (lib/waterSplash.ts) dihitung
 *   fisika di CPU, ±1 ms per bingkai. Profil riak dikirim sebagai tekstur
 *   satu baris.
 * - Hanya ruang kecil di sekitar titik jatuh yang di-raymarch; selebihnya
 *   bidang air dihitung langsung. Tidak ada kabur, masker, atau lintasan
 *   gambar tambahan, jadi ringan di laptop menengah.
 * - Kanvas hanya digambar saat nilai gulir berubah dan disembunyikan di luar
 *   bagian air. Keluarannya cahaya putih dan bayang hitam tembus pandang,
 *   jadi menyatu dengan latar abu-abu maupun video.
 */
export default function WaterDrop({ handleRef, wheelRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<WaterState>({ morph: 0, fall: 0, time: 0, camera: 0, fade: 1 });
  const drawRef = useRef<() => void>(() => {});
  const supportedRef = useRef(false);

  useImperativeHandle(
    handleRef,
    () => ({
      get supported() {
        return supportedRef.current;
      },
      state: stateRef.current,
      invalidate: () => drawRef.current(),
    }),
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl2", { premultipliedAlpha: true, antialias: false, alpha: true });
    if (!canvas || !gl) return;

    let program: WebGLProgram;
    try {
      program = gl.createProgram()!;
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "link");
    } catch (err) {
      console.warn("WaterDrop: WebGL2 gagal, memakai animasi biasa.", err);
      return;
    }
    supportedRef.current = true;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(program);
    const names = [
      "uRes", "uDpr", "uFocal", "uCamPos", "uFwd", "uRight", "uUp", "uRingM", "uProfile", "uSamples",
      "uExtent", "uRipple", "uFade", "uDrop", "uBead", "uJet0", "uJet1", "uBulb", "uZTop",
    ] as const;
    const U = Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(program, n)])) as Record<
      (typeof names)[number],
      WebGLUniformLocation | null
    >;

    const { field } = sharedRipple();
    const profile = new Float32Array(4 * field.samples);
    const second = new Float32Array(4 * field.samples);
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, field.samples, 1, 0, gl.RGBA, gl.FLOAT, profile);
    gl.uniform1i(U.uProfile, 0);
    gl.uniform1f(U.uSamples, field.samples);
    gl.uniform1f(U.uExtent, field.extent);
    gl.uniform1f(U.uRingM, RING_RADIUS);

    let lastTime = -1;
    let frame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const render = () => {
      frame = 0;
      const s = stateRef.current;
      const visible = s.morph > 0 && s.fade > 0;
      canvas.style.visibility = visible ? "visible" : "hidden";
      if (!visible) return;
      if (width !== canvas.clientWidth || height !== canvas.clientHeight) resize();

      // Panjang fokus dipilih agar dari atas lingkaran riak 12 cm tepat
      // seukuran lingkaran faktor di layar.
      const ringPx = (wheelRef.current?.offsetWidth ?? 512) / 2;
      const focal = (ringPx * CAMERA.top.distance) / RING_RADIUS;
      const cam = cameraAt(s.camera, ringPx);
      const project = (x: number, z: number) => {
        const dy = -cam.pos[1];
        const dz = z - cam.pos[2];
        const depth = dy * cam.fwd[1] + dz * cam.fwd[2];
        const up = dy * cam.up[1] + dz * cam.up[2];
        return { x: width / 2 + (focal * (x - cam.pos[0])) / depth, y: height / 2 - (focal * up) / depth, depth };
      };

      // Tetesan mulai tepat di depan logo navigasi: tinggi awalnya dicari
      // agar proyeksinya jatuh di logo, lalu jatuh bebas tegak ke titik jatuh.
      const rect = document.querySelector("[data-ring-logo]")?.getBoundingClientRect();
      const box = canvas.getBoundingClientRect();
      const logoX = rect ? rect.left + rect.width / 2 - box.left : width / 2;
      const logoY = rect ? rect.top + rect.height / 2 - box.top : 30;
      let lo = 0;
      let hi = 0.5;
      for (let i = 0; i < 30; i++) {
        const mid = (lo + hi) / 2;
        if (project(0, mid).y > logoY) lo = mid;
        else hi = mid;
      }
      const startZ = lo;
      const startX = ((logoX - width / 2) * project(0, startZ).depth) / focal;

      const z = fallHeight(s.fall);
      const merge = Math.min(1, Math.max(0, s.time / MERGE_S));
      const dropR = DROP_RADIUS * (0.55 + 0.45 * s.morph);
      const dropZ = DROP_RADIUS + startZ * z - 2 * DROP_RADIUS * merge;
      const dropPresence = merge < 1 ? s.morph * s.fade : 0;

      // Riak tetesan pertama ditambah riak butir yang jatuh kembali.
      const splash = splashAt(s.time);
      if (s.time !== lastTime) {
        field.evaluate(s.time, profile);
        if (s.time > splash.landing) {
          field.evaluate(s.time - splash.landing, second);
          for (let i = 0; i < profile.length; i++) profile[i] += SECOND_SCALE * second[i];
        }
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, field.samples, 1, gl.RGBA, gl.FLOAT, profile);
        lastTime = s.time;
      }
      const [j0, j1] = splash.jets;
      const bulb = j0.bulbRadius > 0 ? [j0.bulbZ, j0.bulbRadius] : [0, 0];
      const bead = splash.bead;

      gl.uniform2f(U.uRes, width, height);
      gl.uniform1f(U.uDpr, dpr);
      gl.uniform1f(U.uFocal, focal);
      gl.uniform3fv(U.uCamPos, cam.pos);
      gl.uniform3fv(U.uFwd, cam.fwd);
      gl.uniform3fv(U.uRight, cam.right);
      gl.uniform3fv(U.uUp, cam.up);
      gl.uniform1f(U.uRipple, s.time > 0 ? 1 : 0);
      gl.uniform1f(U.uFade, s.fade);
      gl.uniform4f(U.uDrop, startX * z, dropZ, dropR, dropPresence);
      gl.uniform4f(U.uBead, bead?.z ?? 0, bead?.radius ?? 0, bead?.stretch ?? 1, bead ? s.fade : 0);
      gl.uniform4f(U.uJet0, j0.height, j0.tipRadius, j0.baseRadius, j0.baseHeight);
      gl.uniform4f(U.uJet1, j1.height, j1.tipRadius, j1.baseRadius, j1.baseHeight);
      gl.uniform2f(U.uBulb, bulb[0], bulb[1]);
      gl.uniform1f(U.uZTop, Math.max(j0.height, j1.height, bulb[0] + bulb[1], 0.002) + 0.002);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    drawRef.current = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };
    resize();
    const ro = new ResizeObserver(() => {
      resize();
      drawRef.current();
    });
    ro.observe(canvas);

    return () => {
      supportedRef.current = false;
      drawRef.current = () => {};
      cancelAnimationFrame(frame);
      ro.disconnect();
      gl.deleteTexture(tex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(program);
    };
  }, [wheelRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30 h-full w-full"
      style={{ visibility: "hidden" }}
    />
  );
}
