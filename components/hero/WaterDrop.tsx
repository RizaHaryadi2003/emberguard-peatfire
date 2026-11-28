"use client";

import { type Ref, type RefObject, useEffect, useImperativeHandle, useRef } from "react";
import { DROP_RADIUS, fallHeight, RING_RADIUS, sharedRipple } from "@/lib/waterRipple";
import { CRATER_MAX, CROWN_PEAK_AT, CROWN_PEAK_HEIGHT, crownStateAt, LEAN_HIGH, LEAN_LOW, MAX_DROPLETS, MAX_FINGERS, SHEET_BASE, SHEET_TOP } from "@/lib/waterCrown";
import { JET_START, SECOND_SCALE, splashAt } from "@/lib/waterSplash";

/**
 * Ketajaman kanvas mengikuti layar sampai 2× (Retina), agar tepi kolom, butir,
 * dan riak halus tetap tajam. Beban tetap ringan karena hanya ruang kecil di
 * titik jatuh yang di-raymarch, dan kanvas hanya digambar saat digulir.
 */
const MAX_DPR = 2;
/**
 * Warna latar beranda di atas dan di bawah layar (.section-backdrop di
 * app/globals.css: #6c6b67 → #b3b2ac). Dipakai untuk pembiasan di dalam air.
 */
const BACKDROP_TOP = [0x6c / 255, 0x6b / 255, 0x67 / 255] as const;
const BACKDROP_BOTTOM = [0xb3 / 255, 0xb2 / 255, 0xac / 255] as const;

/** Lama tetesan tenggelam menyatu dengan air (detik): ±2R/U pada 3 m/s. */
const MERGE_S = 0.0012;

/**
 * Kamera mengorbit titik jatuh. Dari depan: rendah dan dekat, menatap sedikit
 * di atas permukaan agar kolom air terbingkai. Dari atas: tepat tegak lurus,
 * sehingga lingkaran riak 12 cm sama persis dengan lingkaran faktor di layar.
 */
const CAMERA = {
  front: { elevation: (14 * Math.PI) / 180, distance: 0.068, targetZ: 0.0055 },
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
uniform vec2 uCrater;      // kedalaman dan jari-jari mulut kawah (m)
uniform vec4 uCrown;       // tinggi bibir, jari-jari pangkal, jari-jari bibir, tebal tabung bibir
uniform vec2 uSheet;       // tebal lembar mahkota di pangkal dan di bibir
uniform vec4 uFinger[${MAX_FINGERS}]; // sudut, panjang, condong, jari-jari ujung
uniform int uFingers;
uniform vec4 uDroplet[${MAX_DROPLETS}]; // butir lepas dari jari: x, y, z, jari-jari
uniform int uDroplets;
uniform float uHole;       // riak linear dimatikan di dalam jari-jari ini (kawah)
uniform float uMerge;      // lebar sambungan mahkota–kolam (m)
uniform vec3 uBg0;         // warna latar halaman di atas dan di bawah layar,
uniform vec3 uBg1;         // dilihat lewat pembiasan air
uniform float uFocusT;     // jarak fokus kamera (m)
out vec4 outColor;

// Pembesar riak. Riak setinggi aslinya hampir tak tampak di layar, jadi
// tinggi (dekat titik jatuh) dan kemiringan (jauh) dibesarkan; bentuk, jarak,
// dan waktunya tetap hasil fisika.
const float H_GAIN = 2.0;
const float SLOPE_GAIN = 9.0;
const float CAUSTIC_GAIN = 0.03;
// Kekuatan kabur fokus: lingkar kabur (m) per meter jarak dari bidang fokus.
const float DOF = 0.05;
// Kekuatan pantulan studio di permukaan air (1 = sepenuhnya).
const float WATER_REFL = 0.6;
// Ruang dekat titik jatuh yang digambar sebagai benda 3D penuh (m).
const float CORE = 0.017;
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

// Studio: softbox besar di atas-belakang, dua lampu jalur tegak di kiri dan
// kanan belakang (garis tepi terang pada air yang melengkung), softbox kecil
// di kiri-depan, pita cakrawala (sambungan meja dan latar studio), cahaya isi
// lembut dari depan, dan ruang redup. Lingkungan yang berdetail inilah yang
// membuat air tampak nyata: lembar dan butir memantulkan serta membiaskannya
// menjadi garis dan bercak, seperti ubin kolam pada demo air WebGL. Nilai HDR
// agar kilau tampak nyata.
float studio(vec3 d) {
  // Tepi softbox dilembutkan (difuser besar, di luar fokus lensa makro).
  float key = panel(d, normalize(KEY), vec2(0.3, 0.18), 0.2) * 30.0;
  float stripL = panel(d, normalize(vec3(-0.85, 0.3, 0.42)), vec2(0.05, 0.5), 0.04) * 9.0;
  float stripR = panel(d, normalize(vec3(0.85, 0.3, 0.42)), vec2(0.05, 0.5), 0.04) * 9.0;
  vec3 f = normalize(vec3(0.0, -0.75, 0.66));
  float fill = 1.4 * pow(max(dot(d, f), 0.0), 6.0);
  float side = panel(d, normalize(vec3(-0.55, -0.6, 0.58)), vec2(0.09, 0.07), 0.05) * 7.0;
  float horizon = 1.6 * exp(-pow((d.z - 0.04) / 0.035, 2.0)) * (0.6 + 0.4 * max(d.y, 0.0));
  float room = 0.12 + 0.35 * max(d.z, 0.0);
  return key + stripL + stripR + side + fill + horizon + room;
}

float fresnel(float c) { return 0.02 + 0.98 * pow(1.0 - clamp(c, 0.0, 1.0), 5.0); }

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// Kolom air sebagai benda putar: kaki melebar, badan ramping, ujung membulat.
// Pelebaran kaki dan kemiringannya dinolkan tepat di pangkal tutup bulat,
// jadi badan dan tutup bertemu mulus tanpa anak tangga maupun lipatan.
float sdJet(vec3 p, vec4 jet) {
  if (jet.x <= 0.0) return 1e3;
  float r = length(p.xy);
  float capZ = jet.x - jet.y;
  if (p.z > capZ) return length(vec2(r, p.z - capZ)) - jet.y;
  float atCap = exp(-max(capZ, 0.0) / jet.w);
  // Di bawah permukaan kaki terus melebar, menyatu dengan dinding kawah.
  float flare = max((min(exp(-p.z / jet.w), 4.0) - atCap) / max(1.0 - atCap, 1e-3), 0.0);
  // Dikuadratkan: nilai dan turunannya sama-sama nol di pangkal tutup.
  // Badan meruncing ke atas seperti jet Worthington sungguhan; kuadrat
  // menjaga sambungan ke tutup tetap mulus.
  float rise = clamp(1.0 - max(p.z, 0.0) / max(capZ, 1e-4), 0.0, 1.0);
  float rc = jet.y * (1.0 + 0.45 * rise * rise) + (jet.z - jet.y) * flare * flare;
  return (r - rc) * 0.6;
}


// Jarak bertanda ke elipsoid (pendekatan Inigo Quilez, cukup untuk raymarch).
float sdEllipsoid(vec3 p, vec3 r) {
  float k0 = length(p / r);
  float k1 = length(p / (r * r));
  return k0 * (k0 - 1.0) / max(k1, 1e-9);
}

float smax(float a, float b, float k) { return -smin(-a, -b, k); }

// Riak linear tidak berlaku di dalam kawah (gerak di sana tidak linear).
float rippleHeight(float r) {
  float h = H_GAIN * profileAt(r).x;
  if (uHole > 0.0) h *= smoothstep(0.7 * uHole, 1.5 * uHole, r);
  return h;
}

// Kolam dengan kawah: bidang air dikurangi rongga elipsoid; bibirnya
// dibulatkan tegangan permukaan (smax).
float sdPool(vec3 p, float r) {
  float surf = (p.z - rippleHeight(r)) * 0.7;
  if (uCrater.x <= 0.0) return surf;
  float cav = sdEllipsoid(p, vec3(uCrater.y, uCrater.y, uCrater.x));
  // Bibir melebar sebanding kawah: saat runtuh kawah menjadi cekungan landai.
  return smax(surf, -cav, max(1.1e-3, 0.3 * uCrater.y));
}

// Dinding mahkota pada bidang (jarak ke sumbu, tinggi): dua ruas, bawah
// hampir tegak dan atas melebar ke luar, menipis ke atas, ditutup tabung
// bibir. \`top\` = tinggi bibir di sudut ini (turun di antara dua jari).
const float TAN_LOW = ${Math.tan(LEAN_LOW).toFixed(5)};
const float TAN_HIGH = ${Math.tan(LEAN_HIGH).toFixed(5)};

float sdSegment(vec2 q, vec2 a, vec2 b, out float h) {
  vec2 ab = b - a;
  h = clamp(dot(q - a, ab) / dot(ab, ab), 0.0, 1.0);
  return length(q - a - ab * h);
}

float sdSheet(vec2 q, float top) {
  vec2 a = vec2(uCrown.y, -4e-4);
  vec2 m = vec2(uCrown.y + 0.5 * top * TAN_LOW, 0.5 * top);
  vec2 b = vec2(m.x + 0.5 * top * TAN_HIGH, top);
  float h1;
  float h2;
  float d1 = sdSegment(q, a, m, h1);
  float d2 = sdSegment(q, m, b, h2);
  float th = d1 < d2 ? mix(uSheet.x, 0.5 * (uSheet.x + uSheet.y), h1) : mix(0.5 * (uSheet.x + uSheet.y), uSheet.y, h2);
  float sheet = min(d1, d2) - 0.5 * th;
  float rim = length(q - b) - uCrown.w;
  return smin(sheet, rim, 2e-4);
}

// Satu jari: kerucut membulat dari bibir ke luar-atas, ujungnya menggembung
// menjadi butir yang akan lepas.
float sdFinger(vec3 p, vec4 f) {
  vec3 out3 = vec3(cos(f.x), sin(f.x), 0.0);
  vec3 dir = normalize(out3 * sin(f.z) + vec3(0.0, 0.0, cos(f.z)));
  vec3 a = out3 * uCrown.z + vec3(0.0, 0.0, uCrown.x);
  float len = f.y;
  vec3 pa = p - a;
  float h = clamp(dot(pa, dir) / max(len, 1e-6), 0.0, 1.0);
  float neck = mix(uCrown.w * 1.15, max(0.42 * f.w, 0.45 * uCrown.w), sqrt(h));
  float body = length(pa - dir * len * h) - neck;
  float tip = length(p - a - dir * len) - f.w;
  return smin(body, tip, 0.35 * f.w);
}

float sdCrown(vec3 p) {
  if (uCrown.x <= 0.0) return 1e3;
  float r = length(p.xy);
  float phi = atan(p.y, p.x);
  if (phi < 0.0) phi += 6.2831853;
  // Gelombang kapiler halus di lembar: membuat pantulan dan pembiasan
  // bergaris seperti air sungguhan, bukan kaca licin.
  float wob = 7e-5 * (sin(7.0 * phi + p.z * 900.0) + 0.6 * sin(13.0 * phi - p.z * 1500.0 + 1.7));
  vec2 q = vec2(r + wob, p.z);
  int n = uFingers;
  if (n == 0) return sdSheet(q, uCrown.x);
  // Jari diurutkan menurut sudut; cukup periksa yang terdekat dan tetangganya.
  int i0 = int(floor(phi / 6.2831853 * float(n) + 0.5));
  float halfGap = 3.14159265 / float(n);
  float soft = 0.3 * halfGap;
  float d = 1e3;
  float wSum = 0.0;
  float grown = 0.0;
  for (int k = -2; k <= 2; k++) {
    int i = (i0 + k + n) % n;
    vec4 f = uFinger[i];
    float da = abs(mod(phi - f.x + 3.14159265, 6.2831853) - 3.14159265);
    // Jarak sudut ke jari terdekat sebagai min halus, agar dinding tidak
    // berlipat di tengah dua jari yang jaraknya tidak sama.
    float w = exp(-da / soft);
    wSum += w;
    grown += w * clamp(f.y / 1.6e-3, 0.0, 1.0);
    if (abs(k) <= 1) d = smin(d, sdFinger(p, f), 4e-4);
  }
  float gap = -soft * log(max(wSum, 1e-6));
  grown /= max(wSum, 1e-6);
  // Bibir melengkung turun di antara dua jari (selaput di antara jari);
  // lengkungnya tumbuh bersama jari dan mendatar lagi saat jari surut.
  float dip = smoothstep(0.0, 1.0, clamp(gap / halfGap, 0.0, 1.0));
  float top = uCrown.x * (1.0 - 0.2 * grown * dip * dip);
  return smin(sdSheet(q, top), d, 4e-4);
}

float sdScene(vec3 p) {
  float r = length(p.xy);
  float d = sdPool(p, r);
  d = smin(d, sdCrown(p), uMerge);
  d = smin(d, sdJet(p, uJet0), 1.8e-3);
  d = smin(d, sdJet(p, uJet1), 1.2e-3);
  if (uBulb.y > 0.0) d = smin(d, length(p - vec3(0.0, 0.0, uBulb.x)) - uBulb.y, 8e-4);
  return d;
}

// Kolom dan mahkota tanpa permukaan air, untuk pantulannya. Bagian di bawah
// permukaan dipotong agar pantulan kaki kolom bertemu garis air dengan rapi.
float sdObjects(vec3 p) {
  float d = min(sdJet(p, uJet0), sdJet(p, uJet1));
  if (uBulb.y > 0.0) d = smin(d, length(p - vec3(0.0, 0.0, uBulb.x)) - uBulb.y, 8e-4);
  d = min(d, sdCrown(p));
  return max(d, -p.z);
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
bool reflectedBody(vec3 p, vec3 rr, out vec3 n, out float hitZ) {
  n = vec3(0.0);
  hitZ = 1.0;
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
  for (int i = 0; i < uDroplets; i++) {
    vec4 b = uDroplet[i];
    vec2 h = hitEllipsoid(p, rr, b.xyz, b.w, 1.0);
    if (h.x > 0.0 && h.x < best) { best = h.x; n = normalize(p + rr * h.x - b.xyz); }
  }
  // Kolom dan mahkota: telusur pendek, hanya bila sinar pantul melewati tabung inti.
  if (uJet0.x > 0.0 || uJet1.x > 0.0 || uCrown.x > 0.0) {
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
  if (best < 1e9) hitZ = p.z + rr.z * best;
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

// --- Pembiasan -------------------------------------------------------------
// Air bening memperlihatkan apa yang ada di belakangnya lewat pembiasan. Latar
// halaman diketahui (gradasi abu-abu tegak), jadi sinar yang keluar dari
// tetesan, butir, atau kolom bisa dilacak ke latar itu: hasilnya bayangan
// latar yang terbalik seperti pada foto tetesan. Sinar yang terbelok jauh
// melihat ruang studio yang gelap, sehingga tepi air tampak gelap alami.
const float IOR = 1.333;
const float BACKDROP = 0.09;          // jarak latar di belakang benda (m)
// Rona biru tipis seperti foto acuan (keputusan pengguna 28 Nov 2026). Ruang
// studio yang terlihat lewat tepi air berwarna biru-baja gelap; badan air
// menyerap merah sedikit lebih banyak daripada biru (Beer–Lambert). Air
// sungguhan setebal beberapa milimeter hampir tidak berwarna, jadi
// penyerapannya dibesarkan demi gaya; arah warnanya tetap sesuai air.
const vec3 ROOM = vec3(0.07, 0.115, 0.165);
const vec3 WHITE = vec3(0.957, 0.953, 0.945);
const vec3 DEEP = vec3(0.10, 0.165, 0.23);
const vec3 ABSORB = vec3(32.0, 13.0, 4.0); // per meter lintasan di dalam air
const vec3 TINT = vec3(0.93, 0.97, 1.0);

vec3 absorb(vec3 c, float path) { return c * TINT * exp(-ABSORB * path); }

vec3 backdropAt(vec3 q) {
  vec3 d = q - uCamPos;
  float depth = max(dot(d, uFwd), 1e-4);
  float y = 0.5 * uRes.y - dot(d, uUp) / depth * uFocal;
  return mix(uBg0, uBg1, clamp(y / uRes.y, 0.0, 1.0));
}

// Warna sinar yang keluar dari air di titik q dengan arah r2.
vec3 seen(vec3 q, vec3 r2, vec3 rd) {
  if (dot(r2, r2) < 0.5) return ROOM; // pantul sempurna di dalam
  float w = smoothstep(0.55, 0.93, dot(normalize(r2), rd));
  return mix(ROOM, backdropAt(q + normalize(r2) * BACKDROP), w);
}

// Badan air: bias masuk, bias keluar, ditambah pantulan studio (Fresnel).
vec3 waterBody(vec3 rd, vec3 n, vec3 trans) {
  float F = fresnel(dot(-rd, n));
  vec3 spec = WHITE * (1.0 - exp(-F * studio(reflect(rd, n))));
  return trans * (1.0 - F) * 0.95 + spec;
}

vec3 ellipsoidColor(vec3 rd, vec3 q, vec3 n, vec3 c, float r, float s) {
  vec3 r1 = refract(rd, n, 1.0 / IOR);
  vec3 sc = vec3(r, r, r * s);
  vec3 o = (q - c) / sc;
  vec3 d = r1 / sc;
  float a = dot(d, d);
  float b = dot(o, d);
  float h = max(b * b - a * (dot(o, o) - 1.0), 0.0);
  vec3 q2 = q + r1 * ((-b + sqrt(h)) / a);
  vec3 n2 = ellipsoidNormal(q2, c, r, s);
  return waterBody(rd, n, absorb(seen(q2, refract(r1, -n2, IOR), rd), length(q2 - q)));
}

// Kolom dan dinding kawah: telusuri sinar di dalam air sampai keluar.
vec3 sceneBodyColor(vec3 p, vec3 n, vec3 rd) {
  vec3 r1 = refract(rd, n, 1.0 / IOR);
  float t = 3e-4;
  for (int i = 0; i < 24; i++) {
    vec3 q = p + r1 * t;
    float d = sdScene(q);
    if (d > -1e-5 && t > 5e-4) return waterBody(rd, n, absorb(seen(q, refract(r1, -sceneNormal(q), IOR), rd), t));
    t += max(-d, 1.5e-4);
  }
  // Sinar masuk ke kolam: tampak latar di baliknya, sedikit redup.
  return waterBody(rd, n, absorb(backdropAt(p + r1 * 0.03) * 0.86, 0.008));
}

// Profil riak yang dikaburkan sesuai jarak dari bidang fokus, seperti foto
// makro: riak di dekat percikan tajam, riak jauh melembut.
vec3 profileFocus(float r, float t) {
  float coc = DOF * abs(t - uFocusT);
  if (coc < 2e-4) return profileAt(r);
  return (profileAt(r - coc) + profileAt(r - 0.5 * coc) + profileAt(r) + profileAt(r + 0.5 * coc) + profileAt(r + coc)) / 5.0;
}

// Satu sampel: (cahaya setelah pemetaan nada, alfa). \`fine\` = piksel ini
// memuat tepi benda atau pantulannya, jadi perlu sampel tambahan.
vec4 shadeSample(vec2 sc, out bool fine) {
  fine = false;
  vec3 ro = uCamPos;
  vec3 rd = normalize(uFwd * uFocal + uRight * sc.x - uUp * sc.y);

  float light = 0.0;
  float dark = 0.0;
  float bodyCover = 0.0;
  vec3 body = vec3(0.0);
  float tHit = 1e9;
  vec3 n = vec3(0.0, 0.0, 1.0);
  bool core = false;

  // 1. Permukaan di dekat titik jatuh: kawah, kolom, dan gembung (raymarch).
  vec2 span = coreSpan(ro, rd, -0.012);
  // Sinar yang sudah menembus air di luar tabung tidak boleh melihat isinya.
  float tPlane = rd.z < 0.0 ? -ro.z / rd.z : 1e9;
  if (span.y > span.x && tPlane > span.x) {
    float t = span.x;
    // Lembar mahkota hanya setebal ±0,2 mm, jadi langkahnya diperhalus.
    for (int i = 0; i < 160; i++) {
      if (t > span.y) break;
      float d = sdScene(ro + rd * t);
      if (d < 1.2e-5) { tHit = t; core = true; break; }
      t += max(d * 0.9, 8e-6);
    }
    // Perhalus titik temu agar tepi tidak bertangga.
    if (core) for (int i = 0; i < 3; i++) tHit += sdScene(ro + rd * tHit);
    fine = true;
  }
  // 2. Di luar itu: bidang air dengan riak sebagai kemiringan.
  if (!core && rd.z < 0.0) tHit = -ro.z / rd.z;

  if (tHit < 1e9) {
    vec3 p = ro + rd * tHit;
    float r = length(p.xy);
    vec3 pr = core ? profileAt(r) : profileFocus(r, tHit);
    if (core) n = sceneNormal(p);
    else {
      vec2 dir = r > 1e-6 ? p.xy / r : vec2(0.0);
      float gain = mix(H_GAIN, SLOPE_GAIN, smoothstep(CORE, 2.5 * CORE, r));
      n = normalize(vec3(-dir * pr.y * gain, 1.0));
    }
    // Air hanya di sekitar lingkaran, memudar halus ke luar.
    float pool = (1.0 - smoothstep(1.2 * uRingM, 1.95 * uRingM, r)) * uFade;
    // Peralihan lebar dari warna permukaan ke warna badan air (kaki kolom,
    // dinding kawah), supaya tidak muncul garis sudut.
    float steep = smoothstep(0.12, 0.85, 1.0 - n.z);
    // Dasar air makin sulit terlihat saat dipandang miring (pantulan menguat).
    float seeFloor = pow(clamp(-rd.z, 0.0, 1.0), 2.0);

    // Pantulan studio di permukaan, utuh seperti pada foto: air tenang
    // memantulkan softbox sebagai bidang terang, riak memecahnya menjadi pita.
    // Bagian yang hanya memantulkan ruang redup dibuat sedikit gelap agar
    // lembah riak tetap terbaca dari atas.
    vec3 rr = reflect(rd, n);
    float F = fresnel(dot(-rd, n));
    vec3 bn;
    float hitZ;
    bool mirrored = reflectedBody(p, rr, bn, hitZ);
    // Di air sungguhan kaki kolom melengkung menyatu dengan permukaan, jadi
    // pantulannya memudar mulus ke garis air, bukan terpotong bersudut.
    float mirrorW = mirrored ? smoothstep(1.0e-3, 5.5e-3, hitZ) : 0.0;
    // Pantulan benda di air (dan sekitarnya) bertepi tajam: perlu sampel tambahan.
    bool things = uJet0.x > 0.0 || uJet1.x > 0.0 || uBead.w > 0.0 || uDrop.w > 0.0 || uCrown.x > 0.0 || uDroplets > 0;
    if (mirrored || (things && r < 0.06)) fine = true;
    float env = studio(rr) * (1.0 - mirrorW);
    float refl = F * env * WATER_REFL;
    float calm = fresnel(-rd.z) * studio(reflect(rd, vec3(0.0, 0.0, 1.0))) * WATER_REFL;
    float sL = refl;
    float sD = clamp((calm - refl) * 1.5, 0.0, 0.2);
    if (mirrored) {
      float bl = 0.0;
      float bd = 0.0;
      shadeBody(rr, bn, bl, bd);
      sL += F * 2.2 * bl * mirrorW;
      sD += F * 1.5 * bd * mirrorW;
    }

    // Kaustik di dasar: puncak riak memusatkan cahaya, lembah menyebarkannya.
    float c = -profileFocus(length(p.xy - vec2(0.0015, -0.004)), tHit).z * CAUSTIC_GAIN;
    c = c / sqrt(1.0 + 4.0 * c * c);
    sL += max(c, 0.0) * 0.7 * seeFloor;
    sD += max(-c, 0.0) * 0.4 * seeFloor;

    // Bayangan butir, tetesan, dan kolom di dasar.
    float sh = 0.0;
    if (uBead.w > 0.0) sh += shadowAt(p.xy, vec2(0.0), uBead.x, uBead.y, 0.55 * uBead.w);
    if (uDrop.w > 0.0) sh += shadowAt(p.xy, vec2(uDrop.x, 0.0), uDrop.y, uDrop.z, 0.55 * uDrop.w);
    if (r < 0.08) for (int i = 0; i < uDroplets; i++) {
      vec4 b = uDroplet[i];
      if (b.z > 0.0) sh += shadowAt(p.xy, b.xy, b.z, b.w, 0.05);
    }
    // Mahkota membayangi dasar air di dekat dindingnya.
    if (uCrown.x > 0.0) {
      vec3 k = normalize(KEY);
      vec2 c = -k.xy * 0.5 * uCrown.x / k.z;
      float ring = abs(length(p.xy - c) - 0.5 * (uCrown.y + uCrown.z));
      float w = 0.4 * uCrown.w + 0.25 * uCrown.x;
      sh += 0.3 * exp(-ring * ring / (2.0 * w * w)) * min(uCrown.x / 0.003, 1.0);
    }
    float jetH = max(uJet0.x, uJet1.x);
    if (jetH > 0.0) {
      vec3 k = normalize(KEY);
      vec2 tip = -k.xy * jetH / k.z;
      vec2 seg = p.xy - tip * clamp(dot(p.xy, tip) / max(dot(tip, tip), 1e-9), 0.0, 1.0);
      float w = max(uJet0.z, uJet1.z);
      sh += 0.4 * exp(-dot(seg, seg) / (2.0 * w * w)) * min(jetH / 0.005, 1.0);
    }
    sD += sh * mix(0.5, 1.0, seeFloor);

    light += sL * pool;
    dark += sD * pool;

    // Bagian curam (dinding kawah, kolom) digambar sebagai badan air bening.
    if (steep > 0.0) bodyCover = steep * uFade;
    if (bodyCover > 0.0) body = sceneBodyColor(p, n, rd);
  }

  float L = 1.0 - exp(-light);
  float D = clamp(dark, 0.0, 0.85);
  // Kilau putih di atas bayang biru-gelap (premultiplied alpha).
  vec4 col = vec4(WHITE * L + DEEP * D * (1.0 - L), L + D * (1.0 - L));
  if (bodyCover > 0.0) col = mix(col, vec4(body, 1.0), bodyCover);

  // 3. Tetesan jatuh dan butir yang melambung: elipsoid analitik dengan tepi
  //    halus selebar satu piksel.
  for (int k = 0; k < 2 + uDroplets; k++) {
    vec4 b;
    vec3 c;
    float s = 1.0;
    if (k >= 2) {
      // Butir dari jari mahkota (bola, posisi 3D penuh).
      vec4 q = uDroplet[k - 2];
      c = q.xyz;
      b = vec4(0.0, 0.0, q.w, uFade);
    } else {
      b = k == 0 ? uDrop : vec4(0.0, uBead.x, uBead.y, uBead.w);
      s = k == 0 ? 1.0 : uBead.z;
      c = vec3(b.x, 0.0, b.y);
    }
    if (b.w <= 0.0 || b.z <= 0.0) continue;
    vec2 h = hitEllipsoid(ro, rd, c, b.z, s);
    float depth = dot(c - ro, uFwd);
    float edgePx = (1.0 - h.y) * b.z * uFocal / max(depth, 1e-4);
    float cover = clamp(edgePx + 0.5, 0.0, 1.0) * b.w;
    if (edgePx > -2.0 && edgePx < 2.0) fine = true;
    if (cover <= 0.0 || (h.x > 0.0 && h.x > tHit)) continue;
    // Tepi halus di luar bola juga tidak boleh tampak menembus benda di depannya.
    if (h.x <= 0.0 && dot(c - ro, rd) - b.z > tHit) continue;
    // Di luar tepi (sinar nyaris lewat), warnai titik tepi terdekat.
    vec3 toC = c - ro;
    vec3 side = toC - rd * dot(toC, rd);
    vec3 q = h.x > 0.0 ? ro + rd * h.x : c - normalize(side + 1e-9) * b.z * 0.999;
    vec3 bn = ellipsoidNormal(q, c, b.z, s);
    col = mix(col, vec4(ellipsoidColor(rd, q, bn, c, b.z, s), 1.0), cover);
  }
  return col;
}

// Pola 4 sampel berputar (rotated grid) di dalam satu piksel layar.
const vec2 SUB[4] = vec2[4](vec2(0.125, 0.375), vec2(-0.375, 0.125), vec2(-0.125, -0.375), vec2(0.375, -0.125));

void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
  vec2 sc = px - 0.5 * uRes;
  bool fine;
  vec4 acc = shadeSample(sc, fine);
  // Hanya piksel di tepi kolom, butir, tetesan, kawah, dan pantulannya yang
  // diambil 5 sampel; bidang air lainnya cukup satu. Tepi jadi halus tanpa
  // membebani seluruh layar.
  if (fine) {
    bool unused;
    for (int i = 0; i < 4; i++) acc += shadeSample(sc + SUB[i] / uDpr, unused);
    acc /= 5.0;
  }
  // Derau halus ±½ tingkat warna agar gradasi lembut tidak berpita.
  float nz = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
  float alpha = clamp(acc.a + nz, 0.0, 1.0);
  outColor = vec4(clamp(acc.rgb + nz, 0.0, alpha), alpha);
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
      "uExtent", "uRipple", "uFade", "uDrop", "uBead", "uJet0", "uJet1", "uBulb", "uZTop", "uCrater",
      "uBg0", "uBg1", "uFocusT", "uCrown", "uSheet", "uFinger", "uFingers", "uDroplet", "uDroplets", "uHole", "uMerge",
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
    gl.uniform3fv(U.uBg0, BACKDROP_TOP);
    gl.uniform3fv(U.uBg1, BACKDROP_BOTTOM);
    const fingerBuf = new Float32Array(4 * MAX_FINGERS);
    const dropletBuf = new Float32Array(4 * MAX_DROPLETS);

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
      // Kawah, mahkota, jari, dan butir lepas (lib/waterCrown.ts).
      const crown = crownStateAt(s.time);
      gl.uniform2f(U.uCrater, crown.crater.depth, crown.crater.mouth);
      const c = crown.crown;
      gl.uniform4f(U.uCrown, c.height, c.base, c.rim, c.rimRadius);
      const nF = Math.min(crown.fingers.length, MAX_FINGERS);
      crown.fingers.slice(0, nF).forEach((f, i) => fingerBuf.set([f.angle < 0 ? f.angle + 2 * Math.PI : f.angle, f.length, f.bend, f.tip], 4 * i));
      gl.uniform4fv(U.uFinger, fingerBuf);
      gl.uniform1i(U.uFingers, nF);
      const nD = Math.min(crown.droplets.length, MAX_DROPLETS);
      crown.droplets.slice(0, nD).forEach((d, i) => dropletBuf.set([d.x, d.y, d.z, d.r], 4 * i));
      gl.uniform4fv(U.uDroplet, dropletBuf);
      gl.uniform1i(U.uDroplets, nD);
      // Riak linear baru tampak di tengah sesudah kolom mulai surut.
      const hole = s.time > 0 ? 1 - Math.min(Math.max((s.time - JET_START) / 0.06, 0), 1) : 0;
      gl.uniform1f(U.uHole, CRATER_MAX * 1.3 * hole);
      // Mahkota yang tenggelam menebal dan menyatu dengan kolam sebagai
      // gundukan landai, bukan dinding tipis yang tertinggal.
      const sinking = s.time > CROWN_PEAK_AT ? 1 - c.height / CROWN_PEAK_HEIGHT : 0;
      gl.uniform1f(U.uMerge, 5e-4 + 2.2e-3 * sinking * sinking);
      // Air lembar mengalir turun ke pangkal: lembar menebal saat tenggelam.
      gl.uniform2f(U.uSheet, SHEET_BASE * (1 + 5 * sinking), SHEET_TOP * (1 + 2.5 * sinking));
      const fingerTop = crown.fingers.reduce((m, f) => Math.max(m, f.length + f.tip), 0);
      gl.uniform1f(U.uZTop, Math.max(j0.height, j1.height, bulb[0] + bulb[1], c.height + c.rimRadius + fingerTop, 0.002) + 0.002);
      // Fokus pada percikan, ±6 mm di atas titik jatuh.
      gl.uniform1f(U.uFocusT, Math.hypot(cam.pos[0], cam.pos[1], cam.pos[2] - 0.006));

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
