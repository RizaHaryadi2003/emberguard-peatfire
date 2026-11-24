import * as THREE from "three";

// Bahan khusus Babak 03. Semua warna di sini adalah warna layar (tanpa
// konversi ruang warna), dan cahayanya dihitung di ruang pandang, jadi
// tampilannya tetap sama dari sudut mana pun paru-paru diputar.

/** Derau sel (Voronoi) 3D: jarak ke titik sel terdekat dan kedua terdekat. */
const CELL_GLSL = /* glsl */ `
vec3 hash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453);
}
vec2 cell(vec3 x) {
  vec3 p = floor(x);
  vec3 f = fract(x);
  float d1 = 8.0;
  float d2 = 8.0;
  for (int k = -1; k <= 1; k++)
    for (int j = -1; j <= 1; j++)
      for (int i = -1; i <= 1; i++) {
        vec3 b = vec3(float(i), float(j), float(k));
        vec3 r = b + hash3(p + b) - f;
        float d = dot(r, r);
        if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
      }
  return vec2(sqrt(d1), sqrt(d2));
}
`;

const VIEW_VERTEX = /* glsl */ `
varying vec3 vPos;
varying vec3 vN;
varying vec3 vView;
void main() {
  vPos = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

/**
 * Selaput paru-paru (pleura): merah muda lembap, tembus pandang di tengah dan
 * makin pekat di tepi (efek Fresnel), sehingga percabangan bronkus di dalamnya
 * terlihat seperti di model anatomi kaca. Permukaannya bermotif lobulus
 * sekunder (petak bersegi ±1–2,5 cm) dengan bintik pigmen gelap di batasnya,
 * seperti paru-paru orang dewasa yang tinggal di kota.
 */
export function createPleuraMaterial(
  opacity = 0.5,
  base = "#de8f8c",
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: opacity },
      uBase: { value: new THREE.Color(base) },
    },
    vertexShader: VIEW_VERTEX,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform vec3 uBase;
      varying vec3 vPos;
      varying vec3 vN;
      varying vec3 vView;
      ${CELL_GLSL}
      void main() {
        vec3 n = normalize(vN);
        vec3 v = normalize(vView);
        vec2 c = cell(vPos * 6.5);
        float border = 1.0 - smoothstep(0.0, 0.09, c.y - c.x);
        float speck = step(0.9, hash3(floor(vPos * 70.0)).x) * border;
        vec3 col = uBase;
        col = mix(col, col * 0.7, border * 0.55);
        col = mix(col, vec3(0.2, 0.17, 0.18), speck * 0.75);
        // Celah antarlobus (sama dengan lungShape.ts): celah miring di kedua
        // paru-paru, celah mendatar hanya di paru kanan (x < 0).
        float dO = ((vPos.z + 0.8) * 1.75 + (vPos.y - 0.3) * 1.6) / 2.3713;
        float fissure = 1.0 - smoothstep(0.006, 0.022, abs(dO));
        if (vPos.x < 0.0 && dO > 0.0) fissure = max(fissure, 1.0 - smoothstep(0.006, 0.022, abs(vPos.y + 0.22)));
        col = mix(col, col * 0.3, fissure);
        vec3 l1 = normalize(vec3(0.45, 0.75, 0.55));
        vec3 l2 = normalize(vec3(-0.7, 0.1, 0.35));
        float diff = max(0.0, (dot(n, l1) + 0.4) / 1.4) * 0.8 + max(0.0, dot(n, l2)) * 0.25;
        float spec = pow(max(dot(n, normalize(l1 + v)), 0.0), 70.0) * 0.7;
        float fres = pow(1.0 - max(dot(n, v), 0.0), 2.4);
        vec3 rim = vec3(1.0, 0.8, 0.8) * fres * 0.85;
        vec3 outc = col * (0.25 + diff) + spec + rim;
        float a = clamp(uOpacity * (0.3 + 0.7 * fres) + spec * 0.6 + fissure * 0.35, 0.0, 1.0);
        gl_FragColor = vec4(outc, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
}

/** Jenis kain masker untuk peneduh: 0 kain katun, 1 kain sintetis, 2 medis, 3 N95. */
export const MASK_KIND = { kain: 0, sintetis: 1, medis: 2, n95: 3 } as const;

/**
 * Kain masker dengan pola seratnya masing-masing: anyaman katun, rajutan
 * sintetis, bahan tak-tenun biru masker medis, dan serat tak-tenun rapat N95.
 */
export function createMaskMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uKind: { value: 0 },
      uColor: { value: new THREE.Color("#6f8fa8") },
      uFade: { value: 1 },
    },
    vertexShader: VIEW_VERTEX,
    fragmentShader: /* glsl */ `
      uniform float uKind;
      uniform vec3 uColor;
      uniform float uFade;
      varying vec3 vPos;
      varying vec3 vN;
      varying vec3 vView;
      ${CELL_GLSL}
      float fibers(vec3 p) {
        // Serat tak-tenun: garis-garis pendek acak dari sel-sel memanjang.
        vec2 a = cell(vec3(p.x * 90.0, p.y * 20.0, p.z * 30.0));
        vec2 b = cell(vec3(p.x * 25.0, p.y * 20.0, p.z * 95.0));
        return smoothstep(0.0, 0.06, a.y - a.x) * smoothstep(0.0, 0.06, b.y - b.x);
      }
      void main() {
        vec3 n = normalize(vN);
        vec3 v = normalize(vView);
        if (!gl_FrontFacing) n = -n;
        vec3 col = uColor;
        float tex = 1.0;
        if (uKind < 0.5) {
          // Anyaman polos: benang lusi dan pakan bergantian di atas-bawah.
          float a = sin(vPos.x * 150.0);
          float b = sin(vPos.z * 150.0);
          float over = step(0.0, sin(vPos.x * 75.0) * sin(vPos.z * 75.0));
          tex = 0.78 + 0.22 * mix(abs(a), abs(b), over);
        } else if (uKind < 1.5) {
          // Rajutan: deretan simpul berbentuk V.
          float row = fract(vPos.z * 55.0);
          float col2 = abs(fract(vPos.x * 70.0 + abs(row - 0.5)) - 0.5) * 2.0;
          tex = 0.72 + 0.28 * smoothstep(0.2, 0.8, col2);
        } else if (uKind < 2.5) {
          tex = 0.88 + 0.12 * fibers(vPos);
        } else {
          tex = 0.8 + 0.2 * fibers(vPos * 1.4);
        }
        col *= tex;
        vec3 l1 = normalize(vec3(0.45, 0.8, 0.5));
        float diff = max(0.0, (dot(n, l1) + 0.5) / 1.5);
        float sheen = pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.35;
        vec3 outc = col * (0.5 + 0.8 * diff) + sheen;
        gl_FragColor = vec4(outc, 0.97 * uFade);
      }
    `,
    side: THREE.DoubleSide,
    transparent: true,
    toneMapped: false,
  });
}

/**
 * Butir debu halus yang melayang: titik bercahaya lembut yang hanyut dan
 * bergoyang pelan, dihitung seluruhnya di GPU.
 */
export function createDustMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uViewportH: { value: 800 } },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uViewportH;
      attribute float aSize;
      attribute float aPhase;
      attribute float aAlpha;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        float t = uTime;
        // Hanyut ke kanan pelan lalu kembali dari kiri, sambil berputar kecil.
        p.x = mod(p.x + t * (0.04 + aPhase * 0.03) + 9.0, 18.0) - 9.0;
        p.y += sin(t * 0.35 + aPhase * 6.28) * 0.12;
        p.z += cos(t * 0.27 + aPhase * 4.0) * 0.1;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aSize * projectionMatrix[1][1] * uViewportH * 0.5 / -mv.z;
        vAlpha = aAlpha * (0.65 + 0.35 * sin(t * 1.3 + aPhase * 20.0));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vec3(1.0, 0.86, 0.68) * a * a * vAlpha, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

/** Pendar di sekitar butir asap utama: bulatan lembut, warna per butir. */
export function createGlowMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uViewportH: { value: 800 } },
    vertexShader: /* glsl */ `
      uniform float uViewportH;
      attribute float aSize;
      attribute vec3 aColor;
      varying vec3 vColor;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * projectionMatrix[1][1] * uViewportH * 0.5 / -mv.z;
        vColor = aColor;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vColor * (a * a * 0.9 + smoothstep(0.12, 0.0, d)), 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    // Pendar terlihat menembus jaringan, seperti penanda pada citra sinar-X.
    depthTest: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

/** Berkas cahaya yang menembus udara berasap: bidang bergradien lembut. */
export function createBeamMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uStrength: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uStrength;
      varying vec2 vUv;
      void main() {
        float across = 1.0 - abs(vUv.x - 0.5) * 2.0;
        float along = smoothstep(0.0, 0.25, vUv.y) * (0.35 + 0.65 * vUv.y);
        float flicker = 0.85 + 0.15 * sin(uTime * 0.7 + vUv.y * 5.0);
        float a = pow(across, 2.2) * along * flicker * 0.07 * uStrength;
        gl_FragColor = vec4(vec3(1.0, 0.85, 0.62) * a, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}
