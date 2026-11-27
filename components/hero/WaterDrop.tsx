"use client";

import { type Ref, type RefObject, useEffect, useImperativeHandle, useRef } from "react";
import { DROP_RADIUS, fallHeight, RING_RADIUS, sharedRipple } from "@/lib/waterRipple";

/** Ketajaman kanvas dibatasi agar layar beresolusi tinggi tidak terbebani. */
const MAX_DPR = 1.5;
/** Lama tetesan menyatu dengan air sebelum hilang (detik). */
const MERGE_S = 0.012;

/** Nilai yang digerakkan urutan gulir (useHeroScroll). */
export type WaterState = {
  /** 0 → 1: tetesan terbentuk dari salinan logo. */
  morph: number;
  /** 0 → 1: kemajuan jatuh bebas dari logo ke permukaan. */
  fall: number;
  /** Detik nyata sejak tetesan menyentuh air (gerak lambat diatur linimasa). */
  time: number;
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

// Semua koordinat dalam piksel CSS, sumbu y ke bawah, z menghadap kamera.
const FRAG = `#version 300 es
precision highp float;

uniform vec2 uRes;
uniform float uDpr;
uniform vec2 uCenter;      // titik jatuh, pusat lingkaran faktor
uniform float uRingPx;     // jari-jari lingkaran faktor di layar
uniform float uPxPerM;     // skala piksel per meter
uniform sampler2D uProfile;// profil riak: tinggi, kemiringan, kelengkungan
uniform float uSamples;
uniform float uExtent;     // jangkauan profil (m)
uniform float uRipple;     // 1 bila riak sudah ada
uniform float uFade;
uniform vec4 uDrop;        // x, y, jari-jari, kehadiran
uniform vec4 uShadow;      // x, y, sebaran, kekuatan
uniform float uLow;        // 1 - tinggi tetesan (0 di atas, 1 menyentuh air)
out vec4 outColor;

// Pembesar kemiringan: riak 4 mm nyata hanya miring ±1,5°, terlalu halus di
// layar. Bentuk, jarak, dan waktunya tetap hasil fisika.
const float SLOPE_GAIN = 5.0;
const float CAUSTIC_GAIN = 0.022;
// Arah cahaya utama dari kiri atas; pola cahaya di dasar ikut bergeser.
const vec2 FLOOR_SHIFT = vec2(5.0, 7.0);

vec4 profileAt(float rm) {
  float x = clamp(rm / uExtent, 0.0, 1.0) * (uSamples - 1.0);
  float i = floor(x);
  vec4 a = texelFetch(uProfile, ivec2(int(i), 0), 0);
  vec4 b = texelFetch(uProfile, ivec2(int(min(i + 1.0, uSamples - 1.0)), 0), 0);
  // Tepi profil dipudarkan supaya riak yang keluar tidak terpotong.
  return mix(a, b, x - i) * (1.0 - smoothstep(0.85, 1.0, rm / uExtent));
}

float softRect(vec2 p, vec2 c, vec2 h, float soft) {
  vec2 d = abs(p - c) - h;
  float o = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  return 1.0 - smoothstep(-soft, soft, o);
}

// Studio hitam-putih: softbox besar di kiri atas, lampu jalur tipis di kanan
// bawah, dan pantulan ruang yang redup. Nilai di atas 1 (HDR) supaya kilau
// pada lereng riak terang seperti foto sungguhan.
float studio(vec3 d) {
  if (d.z <= 0.0) return 0.0;
  vec2 t = d.xy / d.z;
  vec2 key = vec2(-0.30, -0.36);
  float box = softRect(t, key, vec2(0.20, 0.12), 0.06) * 34.0;
  float strip = softRect(t, vec2(0.44, 0.24), vec2(0.03, 0.32), 0.03) * 9.0;
  vec2 k = t - key;
  float room = 1.2 * exp(-dot(k, k) * 1.4) + 0.2;
  return box + strip + room;
}

float fresnel(float c) { return 0.02 + 0.98 * pow(1.0 - c, 5.0); }

// Tetesan sebagai bola bening: kilau softbox, tepi gelap karena cahaya
// dibiaskan menjauh, dan titik terang di sisi berlawanan cahaya (tetesan
// memusatkan cahaya seperti lensa).
void drop(vec2 p, vec2 c, float rad, float w, bool mirror, inout float light, inout float dark) {
  if (w <= 0.0 || rad <= 0.0) return;
  vec2 uv = (p - c) / rad;
  if (mirror) uv.y = -uv.y;
  float q = dot(uv, uv);
  if (q > 1.3) return;
  float len = sqrt(q);
  float cover = clamp((1.0 - len) * rad + 0.5, 0.0, 1.0);
  float s = sqrt(max(1.0 - q, 0.0));
  vec3 n = vec3(uv, s);
  vec3 r = reflect(vec3(0.0, 0.0, -1.0), n);
  float spec = fresnel(s) * studio(r);
  vec2 g = uv - vec2(0.36, 0.42);
  float focus = 0.9 * exp(-dot(g, g) / 0.045) * s;
  light += (spec + focus) * cover * w;
  dark += (0.04 + 0.55 * smoothstep(0.72, 1.0, len)) * cover * w;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
  float light = 0.0;
  float dark = 0.0;

  vec2 d = p - uCenter;
  float r = length(d);
  // Medan air hanya di sekitar lingkaran, memudar halus ke luar.
  float pool = (1.0 - smoothstep(1.2 * uRingPx, 1.95 * uRingPx, r)) * uFade;

  if (pool > 0.0) {
    // Suasana: pantulan softbox yang sangat redup di air tenang.
    vec2 a = (p - uCenter - vec2(-0.55, -0.62) * uRingPx) / (1.1 * uRingPx);
    light += 0.05 * exp(-dot(a, a)) * pool;

    if (uRipple > 0.0) {
      vec4 pr = profileAt(r / uPxPerM);
      vec2 dir = r > 0.001 ? d / r : vec2(0.0);
      vec3 n = normalize(vec3(-dir * pr.y * SLOPE_GAIN, 1.0));
      // Kamera tinggi di atas pusat: perspektif ringan pada pantulan.
      float camH = 2.6 * max(uRes.x, uRes.y);
      vec3 v = normalize(vec3(d, -camH));
      vec3 flatR = reflect(v, vec3(0.0, 0.0, 1.0));
      vec3 rr = reflect(v, n);
      // Hanya selisih dari air tenang yang tampak: kilau dan bayang riak.
      float delta = fresnel(clamp(dot(-v, n), 0.0, 1.0)) * studio(rr) - fresnel(-v.z) * studio(flatR);
      light += max(delta, 0.0) * pool;
      dark += min(max(-delta, 0.0) * 2.0, 0.25) * pool;

      // Kaustik di dasar: puncak riak memusatkan cahaya, lembah menyebarkannya.
      float rf = length(d - FLOOR_SHIFT) / uPxPerM;
      float c = -profileAt(rf).z * CAUSTIC_GAIN;
      // Dikompres lembut: kawah di titik jatuh sangat melengkung, tetapi
      // cahaya di dasar air dangkal tidak pernah hitam pekat.
      c = c / sqrt(1.0 + 4.0 * c * c);
      light += max(c, 0.0) * 0.7 * pool;
      dark += max(-c, 0.0) * 0.4 * pool;
    }
  }

  // Bayangan tetesan di dasar: makin dekat makin tajam dan pekat, dengan
  // inti terang karena tetesan memusatkan cahaya.
  if (uShadow.w > 0.0) {
    vec2 sd = p - uShadow.xy;
    float q = dot(sd, sd);
    float s2 = uShadow.z * uShadow.z;
    dark += uShadow.w * exp(-q / (2.0 * s2));
    light += uShadow.w * 0.9 * uLow * uLow * exp(-q / (0.18 * s2));
  }

  // Pantulan tetesan di air (cermin terhadap titik jatuh), lalu tetesannya.
  drop(p, 2.0 * uCenter - uDrop.xy, uDrop.z, uDrop.w * 0.25 * pow(uLow, 6.0), true, light, dark);
  drop(p, uDrop.xy, uDrop.z, uDrop.w, false, light, dark);

  // Pemetaan nada lembut agar kilau HDR tidak pecah menjadi putih datar.
  float L = 1.0 - exp(-light);
  float D = clamp(dark, 0.0, 0.85);
  float alpha = L + D * (1.0 - L);
  // Derau halus ±½ tingkat warna agar gradasi lembut tidak berpita.
  float n = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  alpha = clamp(alpha + (n - 0.5) / 255.0, 0.0, 1.0);
  L = clamp(L + (n - 0.5) / 255.0, 0.0, alpha);
  outColor = vec4(vec3(0.957, 0.953, 0.945) * L, alpha);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? "shader");
  return sh;
}

/**
 * Air dan tetesan pada beranda, digambar dengan WebGL2 di satu kanvas.
 *
 * - Tinggi riak dihitung fisika di lib/waterRipple.ts (CPU, ±0,2 ms) lalu
 *   dikirim sebagai tekstur satu baris; tiap piksel cukup membaca profil itu.
 *   Tidak ada kabur, masker, atau banyak lintasan gambar, jadi ringan di
 *   laptop menengah.
 * - Kanvas hanya digambar saat nilai gulir berubah, dan disembunyikan di luar
 *   bagian air.
 * - Keluaran berupa cahaya putih dan bayang hitam tembus pandang, jadi menyatu
 *   dengan latar abu-abu maupun video di belakangnya.
 */
export default function WaterDrop({ handleRef, wheelRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<WaterState>({ morph: 0, fall: 0, time: 0, fade: 1 });
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
    const u = (name: string) => gl.getUniformLocation(program, name);
    const U = {
      res: u("uRes"),
      dpr: u("uDpr"),
      center: u("uCenter"),
      ringPx: u("uRingPx"),
      pxPerM: u("uPxPerM"),
      profile: u("uProfile"),
      samples: u("uSamples"),
      extent: u("uExtent"),
      ripple: u("uRipple"),
      fade: u("uFade"),
      drop: u("uDrop"),
      shadow: u("uShadow"),
      low: u("uLow"),
    };

    const { field } = sharedRipple();
    const profile = new Float32Array(4 * field.samples);
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, field.samples, 1, 0, gl.RGBA, gl.FLOAT, profile);
    gl.uniform1i(U.profile, 0);
    gl.uniform1f(U.samples, field.samples);
    gl.uniform1f(U.extent, field.extent);

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
      if (canvas.width !== Math.round(canvas.clientWidth * dpr) || width !== canvas.clientWidth) resize();

      const wheel = wheelRef.current;
      const ringPx = (wheel?.offsetWidth ?? 512) / 2;
      const pxPerM = ringPx / RING_RADIUS;
      const cx = width / 2;
      const cy = height / 2;

      // Logo navigasi (tetap di layar) adalah titik awal tetesan.
      const rect = document.querySelector("[data-ring-logo]")?.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      const lx = rect ? rect.left + rect.width / 2 - canvasRect.left : cx;
      const ly = rect ? rect.top + rect.height / 2 - canvasRect.top : 30;

      // Tetesan jatuh bebas. Kamera memandang miring dari atas, jadi
      // ketinggian tampak sebagai jarak di layar dari titik jatuh, dan
      // tetesan sedikit mengecil saat menjauhi kamera.
      const z = fallHeight(s.fall);
      const merge = Math.min(1, Math.max(0, s.time / MERGE_S));
      const dropPx = DROP_RADIUS * pxPerM * (1 + 0.45 * z) * Math.sqrt(1 - merge) * (0.6 + 0.4 * s.morph);
      const dx = cx + (lx - cx) * z;
      const dy = cy + (ly - cy) * z;
      const presence = s.morph * (1 - merge) * s.fade;

      if (s.time !== lastTime) {
        field.evaluate(s.time, profile);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, field.samples, 1, gl.RGBA, gl.FLOAT, profile);
        lastTime = s.time;
      }

      gl.uniform2f(U.res, width, height);
      gl.uniform1f(U.dpr, dpr);
      gl.uniform2f(U.center, cx, cy);
      gl.uniform1f(U.ringPx, ringPx);
      gl.uniform1f(U.pxPerM, pxPerM);
      gl.uniform1f(U.ripple, s.time > 0 ? 1 : 0);
      gl.uniform1f(U.fade, s.fade);
      gl.uniform4f(U.drop, dx, dy, dropPx, presence);
      // Bayangan jatuh ke kanan bawah (cahaya dari kiri atas) dan menyempit
      // seiring tetesan mendekat.
      const base = DROP_RADIUS * pxPerM;
      gl.uniform4f(
        U.shadow,
        cx + 0.35 * base + 70 * z,
        cy + 0.45 * base + 90 * z,
        base * (0.85 + 3.2 * z),
        0.5 * (1 - 0.8 * z) * presence,
      );
      gl.uniform1f(U.low, 1 - z);

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
