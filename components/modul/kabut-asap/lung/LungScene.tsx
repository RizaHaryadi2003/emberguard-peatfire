"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import PerformanceGuard from "@/components/modul/shared/scene/PerformanceGuard";
import { MASKS, type Fate, type Mask } from "@/lib/model/haze";
import { KABUT_TEXT } from "@/config/modul/kabut-asap";
import { lungBounds, lungSdf, type Side, type Vec3 } from "./lungShape";
import { BODY_BOUNDS, EARS, MASK_CENTER, bodySdf } from "./bodyShape";
import {
  buildAirway,
  pathFromTrachea,
  TRACHEA_TOP,
  CARINA,
  TRACHEA_R,
  type Airway,
} from "./airwayTree";
import { surfaceNets, type Mesh } from "./surfaceNets";
import { BREATH_SEC } from "./timing";
import {
  createBeamMaterial,
  createDustMaterial,
  createGhostMaterial,
  createGlowMaterial,
  createMaskMaterial,
  createPleuraMaterial,
  MASK_KIND,
} from "./materials";

// Babak 03 · Satu Tarikan Napas, sebagai satu adegan 3D penuh layar:
//
//   udara berasap  →  masker  →  saluran napas atas  →  trakea  →  bronkus
//   →  bronkiolus  →  gugus alveolus
//
// Seratus butir asap utama berbentuk gumpalan jelaga (rantai bola-bola kecil
// yang menempel, seperti jelaga di bawah mikroskop elektron) melayang di
// antara ribuan butir debu halus dan berkas cahaya. Saat pembaca menarik
// napas, tiap butir menjalani nasibnya dari model (lib/model/haze.ts,
// Kodros dkk. 2021): tertahan di permukaan masker, menembus kainnya, atau
// mengambil jalan pintas lewat celah tepi; yang lolos menyusuri satu jalur
// percabangan bronkus yang nyata sampai ke ujungnya.
//
// Ukuran butir TIDAK berskala: PM2.5 sesungguhnya 2,5 µm, ribuan kali lebih
// kecil daripada yang tampak. Skala ukurannya sudah ditunjukkan di Babak 01.

// ---------------------------------------------------------------------------
// Tata letak dunia (satuan 10 cm). Tubuh kaca menghadap pembaca (+z):
// udara berasap di depan wajah → masker di wajah → mulut → leher → trakea →
// paru-paru di dalam dada.

/** Besar paru-paru di adegan (1 = ukuran model lungShape). */
const LUNG_SCALE = 1.3;
/** Titik asal paru-paru (karina) di dunia. */
const LUNG_POS = new THREE.Vector3(0, -1.55, 0);
/** Masker dibangun menghadap +y di sekitar y = 0, lalu diputar ke wajah. */
const MASK_Y = 0;
/** Matriks penempatan masker: putar menghadap depan (+z), geser ke wajah. */
const MASK_MATRIX = new THREE.Matrix4()
  .makeTranslation(MASK_CENTER[0], MASK_CENTER[1], MASK_CENTER[2])
  .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
/** Lebar dan tinggi masker (jari-jari elips). */
const MASK_RX = 0.6;
const MASK_RZ = 0.47;
/** Udara luar di depan wajah, tempat butir asap melayang. */
const AIR = { x: 1.9, y0: 0.15, y1: 2.45, z0: 1.75, z1: 3.3 };
/** Isi yang harus muat di bingkai gambar (kotak dunia). */
const CONTENT_MIN = new THREE.Vector3(-1.95, -3.95, -1.2);
const CONTENT_MAX = new THREE.Vector3(1.95, 2.55, 3.3);
/** Arah pandang awal: serong dari kanan dan sedikit dari atas. */
const VIEW_DIR = new THREE.Vector3(0.62, 0.2, 1).normalize();
const FOV = 28;
/** Puncak trakea di dunia. */
const TRACHEA_TOP_WORLD = new THREE.Vector3(
  TRACHEA_TOP[0],
  TRACHEA_TOP[1],
  TRACHEA_TOP[2],
)
  .multiplyScalar(LUNG_SCALE)
  .add(LUNG_POS);

/** Saluran napas atas: dari balik masker lewat rongga mulut, tekak, dan leher ke trakea. */
const UPPER_AIRWAY = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, MASK_CENTER[1], MASK_CENTER[2] - 0.12),
  new THREE.Vector3(0, 1.0, 0.5),
  new THREE.Vector3(0, 0.88, 0.08),
  new THREE.Vector3(0, 0.45, -0.12),
  new THREE.Vector3(0, 0.0, -0.08),
  TRACHEA_TOP_WORLD.clone(),
]);

/**
 * Pusat dan ukuran isi dilihat dari arah pandang awal: kedelapan sudut kotak
 * isi diproyeksikan ke sumbu kanan dan atas kamera, supaya kamera bisa
 * dimundurkan secukupnya agar semuanya muat di bingkai gambar.
 */
const FIT = (() => {
  const right = new THREE.Vector3()
    .crossVectors(new THREE.Vector3(0, 1, 0), VIEW_DIR)
    .normalize();
  const up = new THREE.Vector3().crossVectors(VIEW_DIR, right).normalize();
  const center = CONTENT_MIN.clone().add(CONTENT_MAX).multiplyScalar(0.5);
  let u0 = Infinity;
  let u1 = -Infinity;
  let v0 = Infinity;
  let v1 = -Infinity;
  let w = 0;
  for (let i = 0; i < 8; i++) {
    const c = new THREE.Vector3(
      i & 1 ? CONTENT_MAX.x : CONTENT_MIN.x,
      i & 2 ? CONTENT_MAX.y : CONTENT_MIN.y,
      i & 4 ? CONTENT_MAX.z : CONTENT_MIN.z,
    ).sub(center);
    u0 = Math.min(u0, c.dot(right));
    u1 = Math.max(u1, c.dot(right));
    v0 = Math.min(v0, c.dot(up));
    v1 = Math.max(v1, c.dot(up));
    w = Math.max(w, c.dot(VIEW_DIR));
  }
  const target = center
    .addScaledVector(right, (u0 + u1) / 2)
    .addScaledVector(up, (v0 + v1) / 2);
  return { target, halfW: (u1 - u0) / 2, halfH: (v1 - v0) / 2, depth: w };
})();
const TARGET = FIT.target;

/** Bilangan semu 0–1 yang tetap untuk masukan yang sama. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
const ease = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const v3 = (p: Vec3) => new THREE.Vector3(p[0], p[1], p[2]);

/**
 * Kemajuan napas 0–1 (−1 bila belum menarik napas). Hanya di mode
 * pengembangan, `window.__kabutBreathT` dapat membekukan napas di titik
 * tertentu untuk pemeriksaan tangkapan layar.
 */
function breathProgress(start: number | null, reduced: boolean): number {
  if (process.env.NODE_ENV !== "production") {
    const forced = (window as unknown as { __kabutBreathT?: number })
      .__kabutBreathT;
    if (typeof forced === "number") return forced;
  }
  if (start === null) return -1;
  return reduced ? 1 : (performance.now() - start) / 1000 / BREATH_SEC;
}

// ---------------------------------------------------------------------------
// Anatomi: dibangun sekali per kunjungan halaman (±0,3 detik).

type Anatomy = { airway: Airway; lungs: Mesh[]; body: Mesh };
let anatomyCache: Anatomy | null = null;
function buildAnatomy(): Anatomy {
  if (anatomyCache) return anatomyCache;
  const airway = buildAirway();
  const lungs = ([-1, 1] as Side[]).map((side) => {
    const { min, max } = lungBounds(side);
    // Jaring dibuat utuh; celah antarlobus digambar sebagai alur di permukaan
    // oleh peneduh. Memotongnya ke jaring membuat dua bidang dalam yang hampir
    // berimpit dan berkedip bergantian di balik selaput yang tembus pandang.
    return surfaceNets(
      (x, y, z) => lungSdf(x, y, z, side, false),
      min,
      max,
      0.024,
    );
  });
  const body = surfaceNets(bodySdf, BODY_BOUNDS.min, BODY_BOUNDS.max, 0.045);
  anatomyCache = { airway, lungs, body };
  return anatomyCache;
}

/** Warna dinding saluran: tulang rawan krem di saluran besar, merah muda di bronkiolus. */
function airwayColor(gen: number, out: THREE.Color): THREE.Color {
  const cart = new THREE.Color("#f0e4d4");
  const mid = new THREE.Color("#eab4a8");
  const deep = new THREE.Color("#d8706f");
  if (gen <= 3) return out.copy(cart);
  if (gen <= 7) return out.copy(cart).lerp(mid, (gen - 3) / 4);
  return out.copy(mid).lerp(deep, Math.min(1, (gen - 7) / 6));
}

// ---------------------------------------------------------------------------
// Kamera: isi dipaskan ke bingkai gambar, kanvasnya tetap penuh layar.

export type FrameRect = { x: number; y: number; w: number; h: number };

/** Mode pengembangan: adegan bisa diperiksa dari konsol (`window.__kabutScene`). */
function DevExpose() {
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    Object.assign(window, {
      __kabutScene: scene,
      __kabutInvalidate: invalidate,
    });
  }, [scene, invalidate]);
  return null;
}

function CameraRig({ rect }: { rect: FrameRect }) {
  const get = useThree((s) => s.get);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const placed = useRef(false);
  useLayoutEffect(() => {
    const camera = get().camera as THREE.PerspectiveCamera;
    const aspect = Math.max(0.2, rect.w / Math.max(1, rect.h));
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const dist =
      Math.max(FIT.halfH / tan, FIT.halfW / (tan * aspect)) + FIT.depth * 0.6;
    camera.fov = FOV;
    camera.aspect = aspect;
    // Bingkai "maya" seukuran kotak gambar, lalu diperluas ke seluruh layar:
    // isi tepat di kotak gambar, tetapi debu dan cahaya mengisi layar penuh.
    camera.setViewOffset(
      rect.w,
      rect.h,
      -rect.x,
      -rect.y,
      size.width,
      size.height,
    );
    if (!placed.current) {
      camera.position.copy(TARGET).addScaledVector(VIEW_DIR, dist);
      placed.current = true;
    } else {
      const dir = camera.position.clone().sub(TARGET).normalize();
      camera.position.copy(TARGET).addScaledVector(dir, dist);
    }
    camera.lookAt(TARGET);
    camera.updateProjectionMatrix();
    invalidate();
  }, [get, rect, size, invalidate]);
  return null;
}

// ---------------------------------------------------------------------------
// Udara: debu halus, asap tipis, dan berkas cahaya.

function Atmosphere({ low }: { low: boolean }) {
  const res = useMemo(
    () => ({
      dust: createDustMaterial(),
      smoke: createDustMaterial(),
      beam: createBeamMaterial(),
    }),
    [],
  );
  // Peneduh diubah tiap bingkai lewat objek 3D-nya (ref), bukan lewat nilai memo.
  const dustRef = useRef<THREE.Points>(null);
  const smokeRef = useRef<THREE.Points>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const gl = useThree((s) => s.gl);
  const dustGeo = useMemo(() => {
    const n = low ? 2200 : 6000;
    const pos = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const phase = new Float32Array(n);
    const alpha = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const near = i % 3 === 0;
      pos[i * 3] = near
        ? (hash(i * 1.1) - 0.5) * 5
        : (hash(i * 1.1) - 0.5) * 18;
      pos[i * 3 + 1] = near
        ? -0.2 + hash(i * 2.3) * 3
        : -5 + hash(i * 2.3) * 11;
      pos[i * 3 + 2] = near
        ? 1.4 + hash(i * 3.7) * 2.4
        : -7 + hash(i * 3.7) * 11;
      size[i] = 0.012 + hash(i * 4.9) ** 3 * 0.06;
      phase[i] = hash(i * 6.1);
      alpha[i] = 0.25 + hash(i * 7.3) * 0.6;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    g.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
    return g;
  }, [low]);
  // Gumpalan asap: bulatan besar yang sangat redup, menyatu jadi kabut bercahaya.
  const smokeGeo = useMemo(() => {
    const n = 46;
    const pos = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const phase = new Float32Array(n);
    const alpha = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (hash(i * 9.1) - 0.5) * 7;
      pos[i * 3 + 1] = -0.3 + hash(i * 8.3) * 3.2;
      pos[i * 3 + 2] = 0.8 + hash(i * 7.7) * 3.2;
      size[i] = 1.6 + hash(i * 6.6) * 2.4;
      phase[i] = hash(i * 5.5);
      alpha[i] = 0.035 + hash(i * 4.4) * 0.04;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    g.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
    return g;
  }, []);
  useEffect(
    () => () => {
      res.dust.dispose();
      res.smoke.dispose();
      res.beam.dispose();
      dustGeo.dispose();
      smokeGeo.dispose();
    },
    [res.dust, res.smoke, res.beam, dustGeo, smokeGeo],
  );
  const reduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  useFrame(({ clock }) => {
    const t = reduced ? 0 : clock.elapsedTime;
    const h = gl.getDrawingBufferSize(new THREE.Vector2()).y;
    for (const o of [dustRef.current, smokeRef.current, beamRef.current]) {
      const m = o?.material as THREE.ShaderMaterial | undefined;
      if (!m) continue;
      m.uniforms.uTime.value = t;
      if (m.uniforms.uViewportH) m.uniforms.uViewportH.value = h;
    }
  });
  return (
    <>
      <points
        ref={dustRef}
        geometry={dustGeo}
        material={res.dust}
        frustumCulled={false}
      />
      <points
        ref={smokeRef}
        geometry={smokeGeo}
        material={res.smoke}
        frustumCulled={false}
      />
      {/* Berkas cahaya miring dari kiri atas, menembus udara berasap. */}
      {[
        [-2.2, 3.2, -2.5, -0.42, 2.6],
        [-0.6, 3.6, -3.2, -0.36, 1.8],
        [1.4, 3.4, -2.8, -0.3, 1.2],
      ].map(([x, y, z, rot, w], i) => (
        <mesh
          key={i}
          ref={i === 0 ? beamRef : undefined}
          position={[x, y, z]}
          rotation={[0, 0, rot]}
          material={res.beam}
        >
          <planeGeometry args={[w, 15]} />
        </mesh>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Paru-paru: selaput, pohon bronkus, pembuluh, alveolus.

const UP = new THREE.Vector3(0, 1, 0);

function segmentMatrix(
  a: THREE.Vector3,
  b: THREE.Vector3,
  r: number,
  out: THREE.Matrix4,
) {
  const dir = b.clone().sub(a);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(
    UP,
    dir.divideScalar(len || 1),
  );
  return out.compose(a, q, new THREE.Vector3(r, len, r));
}

/** Gugus alveolus: tujuh gelembung kecil bergerombol seperti buah anggur. */
function alveolusGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const spots: Vec3[] = [
    [0, 0, 0],
    [0.62, 0.2, 0],
    [-0.55, 0.3, 0.2],
    [0.1, 0.35, 0.6],
    [0.05, 0.4, -0.6],
    [0.35, 0.85, 0.15],
    [-0.3, 0.8, -0.2],
  ];
  for (const s of spots) {
    const g = new THREE.IcosahedronGeometry(0.42, 1);
    g.translate(s[0], s[1], s[2]);
    parts.push(g);
  }
  const merged = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  merged.computeVertexNormals();
  return merged;
}

function Lungs({
  anatomy,
  scaleRef,
}: {
  anatomy: Anatomy;
  scaleRef: React.RefObject<number>;
}) {
  const group = useRef<THREE.Group>(null);
  const { airway, lungs } = anatomy;

  const parts = useMemo(() => {
    const segs = airway.segments;
    const m = new THREE.Matrix4();
    const c = new THREE.Color();

    // Dinding saluran napas: tabung meruncing + bola di setiap sambungan.
    const tube = new THREE.CylinderGeometry(0.86, 1, 1, 12, 1, true).translate(
      0,
      0.5,
      0,
    );
    const joint = new THREE.SphereGeometry(1, 12, 8);
    const wall = new THREE.MeshStandardMaterial({
      roughness: 0.55,
      metalness: 0,
      vertexColors: false,
    });
    const tubes = new THREE.InstancedMesh(tube, wall, segs.length);
    const joints = new THREE.InstancedMesh(joint, wall, segs.length);
    segs.forEach((s, i) => {
      const a = v3(s.a);
      const b = v3(s.b);
      tubes.setMatrixAt(i, segmentMatrix(a, b, s.r, m));
      tubes.setColorAt(i, airwayColor(s.gen, c));
      joints.setMatrixAt(
        i,
        m.compose(b, new THREE.Quaternion(), new THREE.Vector3(s.r, s.r, s.r)),
      );
      joints.setColorAt(i, airwayColor(s.gen, c));
    });

    // Cincin tulang rawan berbentuk C di trakea dan bronkus utama, terbuka ke belakang.
    const ringGeo = new THREE.TorusGeometry(1, 0.13, 8, 28, Math.PI * 2 * 0.82);
    const ringBase = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(Math.PI / 2, 0, THREE.MathUtils.degToRad(-58), "XYZ"),
    );
    const ringMat = new THREE.MeshStandardMaterial({
      color: "#f7efe4",
      roughness: 0.35,
    });
    const ringSpots: { p: THREE.Vector3; dir: THREE.Vector3; r: number }[] = [];
    const trachea = v3(TRACHEA_TOP);
    const carina = v3(CARINA);
    for (let k = 0; k < 18; k++)
      ringSpots.push({
        p: trachea.clone().lerp(carina, (k + 0.5) / 18.5),
        dir: new THREE.Vector3(0, -1, 0),
        r: TRACHEA_R * 1.08,
      });
    for (const s of segs.filter((s) => s.gen === 1)) {
      for (let k = 1; k < 5; k++)
        ringSpots.push({
          p: v3(s.a).lerp(v3(s.b), k / 5),
          dir: v3(s.b).sub(v3(s.a)).normalize(),
          r: s.r * 1.1,
        });
    }
    const rings = new THREE.InstancedMesh(ringGeo, ringMat, ringSpots.length);
    ringSpots.forEach((s, i) => {
      const q = new THREE.Quaternion()
        .setFromUnitVectors(UP, s.dir.clone().negate())
        .multiply(ringBase);
      rings.setMatrixAt(
        i,
        m.compose(s.p, q, new THREE.Vector3(s.r, s.r, s.r * 1.2)),
      );
    });

    // Arteri (biru, darah miskin oksigen) dan vena (merah) pulmonalis menyertai bronkus.
    const vesselSegs = segs.filter((s) => s.gen >= 1 && s.gen <= 9);
    const artery = new THREE.InstancedMesh(
      tube,
      new THREE.MeshStandardMaterial({
        color: "#4660cf",
        roughness: 0.4,
        emissive: "#101a50",
      }),
      vesselSegs.length,
    );
    const vein = new THREE.InstancedMesh(
      tube,
      new THREE.MeshStandardMaterial({
        color: "#c63a4b",
        roughness: 0.4,
        emissive: "#3a0a10",
      }),
      vesselSegs.length,
    );
    vesselSegs.forEach((s, i) => {
      const back = new THREE.Vector3(
        0.25 * Math.sign(s.b[0] || 1),
        0,
        -1,
      ).normalize();
      const front = new THREE.Vector3(
        -0.25 * Math.sign(s.b[0] || 1),
        0,
        1,
      ).normalize();
      const pa = v3(s.a).addScaledVector(back, s.r * 1.9);
      const pb = v3(s.b).addScaledVector(back, s.r * 1.9 * 0.79);
      artery.setMatrixAt(i, segmentMatrix(pa, pb, s.r * 0.72, m));
      const qa = v3(s.a).addScaledVector(front, s.r * 1.9);
      const qb = v3(s.b).addScaledVector(front, s.r * 1.9 * 0.79);
      vein.setMatrixAt(i, segmentMatrix(qa, qb, s.r * 0.6, m));
    });

    // Gugus alveolus di setiap ujung bronkiolus.
    const alvGeo = alveolusGeometry();
    const alvMat = new THREE.MeshStandardMaterial({
      roughness: 0.6,
      color: "#ffffff",
    });
    const alveoli = new THREE.InstancedMesh(
      alvGeo,
      alvMat,
      airway.terminals.length,
    );
    airway.terminals.forEach((ti, i) => {
      const s = segs[ti];
      const b = v3(s.b);
      const dir = v3(s.b).sub(v3(s.a)).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
      const k = 0.015 + hash(i * 3.1) * 0.008;
      alveoli.setMatrixAt(i, m.compose(b, q, new THREE.Vector3(k, k, k)));
      alveoli.setColorAt(
        i,
        c.set("#f09090").offsetHSL(0, 0, (hash(i * 7.7) - 0.5) * 0.12),
      );
    });

    // Selaput paru-paru (pleura) yang tembus pandang.
    const pleuraMat = createPleuraMaterial(0.58, "#eba29c");
    const pleura = lungs.map((mesh) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(mesh.positions, 3));
      g.setAttribute("normal", new THREE.BufferAttribute(mesh.normals, 3));
      g.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
      return g;
    });

    for (const im of [tubes, joints, rings, artery, vein, alveoli]) {
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.computeBoundingSphere();
    }
    return {
      tubes,
      joints,
      rings,
      artery,
      vein,
      alveoli,
      pleura,
      pleuraMat,
      geos: [tube, joint, ringGeo, alvGeo, ...pleura],
      mats: [wall, ringMat, alvMat, pleuraMat, artery.material, vein.material],
    };
  }, [airway, lungs]);

  useEffect(
    () => () => {
      parts.geos.forEach((g) => g.dispose());
      (parts.mats as THREE.Material[]).forEach((mm) => mm.dispose());
    },
    [parts],
  );

  useFrame(() => {
    const s = scaleRef.current ?? LUNG_SCALE;
    group.current?.scale.setScalar(s);
  });

  return (
    <group ref={group} position={LUNG_POS} scale={LUNG_SCALE}>
      <primitive object={parts.tubes} name="tubes" />
      <primitive object={parts.joints} name="joints" />
      <primitive object={parts.rings} name="rings" />
      <primitive object={parts.artery} name="artery" />
      <primitive object={parts.vein} name="vein" />
      <primitive object={parts.alveoli} name="alveoli" />
      {parts.pleura.map((g, i) => (
        <mesh
          key={i}
          name="pleura"
          geometry={g}
          material={parts.pleuraMat}
          renderOrder={5}
        />
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Saluran napas atas dan masker.

function UpperAirway() {
  const { geo, mat } = useMemo(
    () => ({
      geo: new THREE.TubeGeometry(UPPER_AIRWAY, 80, 0.095, 20, false),
      mat: createPleuraMaterial(1.7, "#f2b4ad"),
    }),
    [],
  );
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  return <mesh geometry={geo} material={mat} renderOrder={4} />;
}

const MASK_COLOR: Record<Exclude<Mask, "tanpa">, string> = {
  kain: "#6f8fa8",
  sintetis: "#535767",
  medis: "#86c8e2",
  n95: "#ece6d8",
};

/** Seberapa besar masker dibanding tepi wajah: celah tepi = sisanya. */
export function maskCoverage(mask: Mask): number {
  return mask === "tanpa" ? 0 : 1 - MASKS[mask].leak * 0.32;
}
const bulgeOf = (mask: Mask) => (mask === "n95" ? 0.36 : 0.24);
/** Tinggi permukaan masker pada jari-jari relatif rho (0 tengah, 1 tepi wajah). */
const maskSurfaceY = (mask: Mask, rho: number) =>
  MASK_Y + bulgeOf(mask) * (1 - rho * rho);

function MaskModel({ mask }: { mask: Mask }) {
  const res = useMemo(() => ({ mat: createMaskMaterial() }), []);
  const geo = useMemo(() => {
    if (mask === "tanpa") return null;
    const cover = maskCoverage(mask);
    const rings = 28;
    const segs = 96;
    const pos: number[] = [];
    const idx: number[] = [];
    for (let r = 0; r <= rings; r++) {
      const rho = (r / rings) * cover;
      for (let s = 0; s <= segs; s++) {
        const th = (s / segs) * Math.PI * 2;
        const x = MASK_RX * rho * Math.cos(th);
        const z = MASK_RZ * rho * Math.sin(th);
        let y = maskSurfaceY(mask, rho);
        // Lipatan masker medis: tiga lipatan mendatar.
        if (mask === "medis")
          y += 0.028 * Math.sin(z * 26) * Math.min(1, (cover - rho) * 8);
        pos.push(x, y, z);
      }
    }
    for (let r = 0; r < rings; r++)
      for (let s = 0; s < segs; s++) {
        const a = r * (segs + 1) + s;
        const b = a + segs + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, [mask]);
  const edge = useMemo(() => {
    if (mask === "tanpa") return null;
    const cover = maskCoverage(mask);
    const pts = Array.from({ length: 97 }, (_, s) => {
      const th = (s / 96) * Math.PI * 2;
      return new THREE.Vector3(
        MASK_RX * cover * Math.cos(th),
        maskSurfaceY(mask, cover),
        MASK_RZ * cover * Math.sin(th),
      );
    });
    return new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(pts, true),
      96,
      0.016,
      6,
      true,
    );
  }, [mask]);
  // Tepi wajah: garis tempat masker seharusnya menempel rapat.
  const seal = useMemo(() => {
    const pts = Array.from({ length: 97 }, (_, s) => {
      const th = (s / 96) * Math.PI * 2;
      return new THREE.Vector3(
        MASK_RX * Math.cos(th),
        MASK_Y,
        MASK_RZ * Math.sin(th),
      );
    });
    return new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(pts, true),
      96,
      0.008,
      6,
      true,
    );
  }, []);
  // Masker baru muncul dengan sedikit mengembang. Peneduhnya diubah lewat
  // objek 3D-nya (ref), bukan lewat nilai memo.
  const group = useRef<THREE.Group>(null);
  const fabric = useRef<THREE.Mesh>(null);
  const born = useRef(0);
  useEffect(() => {
    born.current = performance.now();
  }, [mask]);
  useFrame(() => {
    const k = clamp01((performance.now() - born.current) / 450);
    const s = 0.9 + 0.1 * ease(k);
    group.current?.scale.set(s, 1, s);
    const m = fabric.current?.material as THREE.ShaderMaterial | undefined;
    if (!m || mask === "tanpa") return;
    m.uniforms.uFade.value = k;
    m.uniforms.uKind.value = MASK_KIND[mask];
    m.uniforms.uColor.value.set(MASK_COLOR[mask]);
  });
  useEffect(() => () => res.mat.dispose(), [res.mat]);
  useEffect(
    () => () => {
      geo?.dispose();
      edge?.dispose();
    },
    [geo, edge],
  );
  const gap = mask !== "tanpa" && MASKS[mask].leak >= 0.2;
  const loops = useMemo(() => earLoopGeometry(mask), [mask]);
  const loopMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#e9e4da", roughness: 0.7 }),
    [],
  );
  useEffect(() => () => loops?.dispose(), [loops]);
  useEffect(() => () => loopMat.dispose(), [loopMat]);
  return (
    <group matrixAutoUpdate={false} matrix={MASK_MATRIX}>
      <mesh geometry={seal}>
        <meshBasicMaterial
          color={gap ? "#ff8a3d" : "#ffffff"}
          transparent
          opacity={gap ? 0.75 : 0.22}
          toneMapped={false}
        />
      </mesh>
      {geo && edge && (
        <group ref={group} position={[0, 0, 0]}>
          <mesh
            ref={fabric}
            geometry={geo}
            material={res.mat}
            renderOrder={3}
          />
          <mesh geometry={edge}>
            <meshStandardMaterial
              color={mask === "n95" ? "#cfc6b4" : "#2d3440"}
              roughness={0.6}
            />
          </mesh>
        </group>
      )}
      {loops && <mesh geometry={loops} material={loopMat} />}
    </group>
  );
}

/**
 * Tali masker dari kedua sisi masker melingkari pipi ke telinga. Dihitung di
 * ruang dunia lalu dibawa ke ruang masker (kebalikan MASK_MATRIX), supaya
 * ikut digambar di dalam kelompok masker.
 */
function earLoopGeometry(mask: Mask): THREE.BufferGeometry | null {
  if (mask === "tanpa") return null;
  const cover = maskCoverage(mask);
  const inv = MASK_MATRIX.clone().invert();
  const parts = EARS.map((ear) => {
    const side = Math.sign(ear[0]);
    const pts = [
      new THREE.Vector3(side * MASK_RX * cover, 0.02, 0).applyMatrix4(
        MASK_MATRIX,
      ),
      new THREE.Vector3(side * 0.74, MASK_CENTER[1] + 0.12, 0.62),
      new THREE.Vector3(side * 0.86, MASK_CENTER[1] + 0.3, 0.2),
      new THREE.Vector3(ear[0] + side * 0.06, ear[1], ear[2] + 0.02),
      new THREE.Vector3(ear[0] + side * 0.02, ear[1] - 0.12, ear[2] - 0.16),
    ].map((p) => p.applyMatrix4(inv));
    return new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(pts),
      40,
      0.011,
      6,
      false,
    );
  });
  const merged = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  return merged;
}

/** Tubuh kaca: kepala, leher, bahu, dan dada yang tembus pandang. */
function GlassBody({ body }: { body: Mesh }) {
  const res = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(body.positions, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(body.normals, 3));
    g.setIndex(new THREE.BufferAttribute(body.indices, 1));
    return { g, mat: createGhostMaterial() };
  }, [body]);
  useEffect(
    () => () => {
      res.g.dispose();
      res.mat.dispose();
    },
    [res],
  );
  return <mesh geometry={res.g} material={res.mat} renderOrder={1} />;
}

// ---------------------------------------------------------------------------
// Butir asap utama: gumpalan jelaga, pendarnya, dan jejak cahayanya.

/** Gumpalan jelaga: bola-bola kecil yang saling menempel menjadi rantai bercabang. */
function sootGeometry(): THREE.BufferGeometry {
  const spheres: THREE.Vector3[] = [new THREE.Vector3()];
  let seed = 3;
  const rnd = () => hash(seed++ * 1.37);
  while (spheres.length < 26) {
    const from = spheres[Math.floor(rnd() * spheres.length)];
    const dir = new THREE.Vector3(
      rnd() - 0.5,
      rnd() - 0.5,
      rnd() - 0.5,
    ).normalize();
    const cand = from.clone().addScaledVector(dir, 1.7);
    if (spheres.every((s) => s.distanceTo(cand) > 1.45)) spheres.push(cand);
  }
  const center = spheres
    .reduce((a, s) => a.add(s), new THREE.Vector3())
    .divideScalar(spheres.length);
  const radius = Math.max(...spheres.map((s) => s.distanceTo(center))) + 1;
  const parts = spheres.map((s) =>
    new THREE.IcosahedronGeometry(1 / radius, 1).translate(
      (s.x - center.x) / radius,
      (s.y - center.y) / radius,
      (s.z - center.z) / radius,
    ),
  );
  const merged = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  merged.computeVertexNormals();
  return merged;
}

const TRAIL = 12;
const COLOR = {
  idle: new THREE.Color("#e8b98a").multiplyScalar(0.8),
  kain: new THREE.Color("#ffc27a"),
  celah: new THREE.Color("#ff7a2e"),
  tertahan: new THREE.Color("#8d7a66").multiplyScalar(0.5),
};

type Route = {
  pts: THREE.Vector3[];
  local: boolean[];
  cum: number[];
  total: number;
};

function makeRoute(world: THREE.Vector3[], local: THREE.Vector3[]): Route {
  const pts = [...world, ...local];
  const isLocal = [...world.map(() => false), ...local.map(() => true)];
  const cum = [0];
  const at = (i: number) =>
    isLocal[i]
      ? pts[i].clone().multiplyScalar(LUNG_SCALE).add(LUNG_POS)
      : pts[i];
  for (let i = 1; i < pts.length; i++)
    cum.push(cum[i - 1] + at(i).distanceTo(at(i - 1)));
  return { pts, local: isLocal, cum, total: cum[cum.length - 1] };
}

function routeAt(
  r: Route,
  s: number,
  lungScale: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  const d = clamp01(s) * r.total;
  let i = 1;
  while (i < r.cum.length - 1 && r.cum[i] < d) i++;
  const f = (d - r.cum[i - 1]) / (r.cum[i] - r.cum[i - 1] || 1);
  const toWorld = (k: number, v: THREE.Vector3) =>
    r.local[k]
      ? v.copy(r.pts[k]).multiplyScalar(lungScale).add(LUNG_POS)
      : v.copy(r.pts[k]);
  const a = toWorld(i - 1, new THREE.Vector3());
  const b = toWorld(i, new THREE.Vector3());
  return out.copy(a).lerp(b, f);
}

function Particles({
  fates,
  mask,
  airway,
  startRef,
  scaleRef,
  low,
}: {
  fates: Fate[];
  mask: Mask;
  airway: Airway | null;
  startRef: React.RefObject<number | null>;
  scaleRef: React.RefObject<number>;
  low: boolean;
}) {
  const gl = useThree((s) => s.gl);
  const res = useMemo(() => {
    const g = sootGeometry();
    const m = new THREE.MeshStandardMaterial({
      color: "#5a4a3e",
      roughness: 0.92,
      metalness: 0,
    });
    return {
      soot: new THREE.InstancedMesh(g, m, fates.length),
      glowMat: createGlowMaterial(),
    };
  }, [fates.length]);
  const sootRef = useRef<THREE.InstancedMesh>(null);
  const glowRef = useRef<THREE.Points>(null);
  const glow = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(fates.length * 3), 3),
    );
    g.setAttribute(
      "aSize",
      new THREE.BufferAttribute(new Float32Array(fates.length), 1),
    );
    g.setAttribute(
      "aColor",
      new THREE.BufferAttribute(new Float32Array(fates.length * 3), 3),
    );
    return g;
  }, [fates.length]);
  const trail = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array(fates.length * TRAIL * 2 * 3),
        3,
      ),
    );
    g.setAttribute(
      "color",
      new THREE.BufferAttribute(
        new Float32Array(fates.length * TRAIL * 2 * 3),
        3,
      ),
    );
    const m = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    return new THREE.LineSegments(g, m);
  }, [fates.length]);
  useEffect(
    () => () => {
      res.soot.geometry.dispose();
      (res.soot.material as THREE.Material).dispose();
      res.glowMat.dispose();
      glow.dispose();
      trail.geometry.dispose();
      (trail.material as THREE.Material).dispose();
    },
    [res.soot, res.glowMat, glow, trail],
  );

  // Rumah tiap butir di udara luar, dan jalur napasnya untuk masker ini.
  const plan = useMemo(() => {
    const cover = maskCoverage(mask);
    const tube = UPPER_AIRWAY.getPoints(30);
    return fates.map((fate, i) => {
      const home = new THREE.Vector3(
        (hash(i * 1.3) - 0.5) * 2 * AIR.x,
        AIR.y0 + hash(i * 2.7) * (AIR.y1 - AIR.y0),
        AIR.z0 + hash(i * 3.9) * (AIR.z1 - AIR.z0),
      );
      const th = hash(i * 5.3) * Math.PI * 2;
      const rho =
        fate === "celah"
          ? (cover + 1) / 2
          : Math.sqrt(hash(i * 6.1)) * Math.max(0.2, cover) * 0.92;
      const surfY =
        fate === "celah"
          ? MASK_Y + 0.02
          : mask === "tanpa"
            ? MASK_Y
            : maskSurfaceY(mask, rho) + 0.035;
      const flat = new THREE.Vector3(
        MASK_RX * rho * Math.cos(th),
        surfY,
        MASK_RZ * rho * Math.sin(th),
      );
      const under = new THREE.Vector3(
        flat.x * 0.35,
        MASK_Y - 0.15,
        flat.z * 0.35,
      ).applyMatrix4(MASK_MATRIX);
      const entry = flat.applyMatrix4(MASK_MATRIX);
      let route: Route | null = null;
      if (airway && (fate !== "tertahan" || mask === "tanpa")) {
        const term =
          airway.terminals[Math.floor(hash(i * 8.8) * airway.terminals.length)];
        const path = pathFromTrachea(airway, term);
        const local = [
          v3(TRACHEA_TOP),
          ...path.map((k) => v3(airway.segments[k].b)),
        ];
        // Berhenti sedikit sebelum gugus alveolus supaya tidak tertutup olehnya.
        const last = airway.segments[term];
        local[local.length - 1] = v3(last.a).lerp(v3(last.b), 0.78);
        route = makeRoute([entry, under, ...tube], local);
      }
      return {
        home,
        entry,
        route,
        delay: hash(i * 9.1) * 0.12,
        spin: new THREE.Vector3(
          hash(i * 2.2),
          hash(i * 3.3),
          hash(i * 4.4),
        ).normalize(),
        size: 0.75 + hash(i * 4.6) * 0.5,
      };
    });
  }, [fates, mask, airway]);

  const history = useMemo(
    () =>
      fates.map(() =>
        Array.from({ length: TRAIL + 1 }, () => new THREE.Vector3()),
      ),
    [fates],
  );
  const seeded = useRef(false);
  const reduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  useFrame(({ clock }) => {
    // Objek 3D diambil lewat ref: memo tidak boleh diubah sesudah render.
    const soot = sootRef.current;
    if (!soot) return;
    const now = clock.elapsedTime;
    const start = startRef.current;
    const t = breathProgress(start, reduced);
    const lungScale = scaleRef.current ?? LUNG_SCALE;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const gpos = glow.getAttribute("position") as THREE.BufferAttribute;
    const gsize = glow.getAttribute("aSize") as THREE.BufferAttribute;
    const gcol = glow.getAttribute("aColor") as THREE.BufferAttribute;
    const tpos = trail.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const tcol = trail.geometry.getAttribute("color") as THREE.BufferAttribute;
    for (let i = 0; i < plan.length; i++) {
      const pl = plan[i];
      const fate = fates[i];
      const drift = reduced ? 0 : 1;
      p.copy(pl.home);
      p.x += Math.sin(now * 0.35 + i) * 0.06 * drift;
      p.y += Math.cos(now * 0.29 + i * 1.7) * 0.05 * drift;
      p.z += Math.sin(now * 0.23 + i * 2.3) * 0.05 * drift;
      let color = COLOR.idle;
      let size = 0.14;
      let inside = false;
      if (t >= 0) {
        const k = clamp01((t - pl.delay) / 0.88);
        const approach = ease(clamp01(k / 0.24));
        if (!pl.route) {
          p.lerp(pl.entry, approach);
          color = approach >= 1 ? COLOR.tertahan : COLOR.idle;
        } else if (k < 0.24) {
          p.lerp(pl.entry, approach);
          color = fate === "celah" ? COLOR.celah : COLOR.kain;
          size = 0.13;
        } else {
          routeAt(pl.route, ease((k - 0.24) / 0.76), lungScale, p);
          color = fate === "celah" ? COLOR.celah : COLOR.kain;
          inside = true;
          size = k >= 1 ? 0.12 + 0.03 * Math.sin(now * 3 + i) : 0.13;
        }
      }
      // Jelaga berputar pelan; di dalam saluran napas ukurannya mengecil
      // supaya tidak menutupi bronkus.
      q.setFromAxisAngle(pl.spin, now * 0.4 + i);
      const s = (inside ? 0.02 : 0.03) * pl.size;
      soot.setMatrixAt(i, m.compose(p, q, new THREE.Vector3(s, s, s)));
      gpos.setXYZ(i, p.x, p.y, p.z);
      gsize.setX(i, size * pl.size);
      gcol.setXYZ(i, color.r, color.g, color.b);

      // Jejak cahaya: posisi-posisi terakhir, memudar ke belakang.
      const hist = history[i];
      if (!seeded.current) hist.forEach((h) => h.copy(p));
      for (let h = TRAIL; h > 0; h--) hist[h].copy(hist[h - 1]);
      hist[0].copy(p);
      const moving = t >= 0 && t < 1.15 && (pl.route !== null || t < 0.3);
      for (let h = 0; h < TRAIL; h++) {
        const base = (i * TRAIL + h) * 2;
        tpos.setXYZ(base, hist[h].x, hist[h].y, hist[h].z);
        tpos.setXYZ(base + 1, hist[h + 1].x, hist[h + 1].y, hist[h + 1].z);
        const fade = moving ? (1 - h / TRAIL) * 0.9 : 0;
        tcol.setXYZ(base, color.r * fade, color.g * fade, color.b * fade);
        const fade2 = moving ? (1 - (h + 1) / TRAIL) * 0.9 : 0;
        tcol.setXYZ(
          base + 1,
          color.r * fade2,
          color.g * fade2,
          color.b * fade2,
        );
      }
    }
    seeded.current = true;
    soot.instanceMatrix.needsUpdate = true;
    gpos.needsUpdate = true;
    gsize.needsUpdate = true;
    gcol.needsUpdate = true;
    tpos.needsUpdate = true;
    tcol.needsUpdate = true;
    const gm = glowRef.current?.material as THREE.ShaderMaterial | undefined;
    if (gm)
      gm.uniforms.uViewportH.value = gl.getDrawingBufferSize(
        new THREE.Vector2(),
      ).y;
  });

  return (
    <>
      <primitive ref={sootRef} object={res.soot} frustumCulled={false} />
      <points
        ref={glowRef}
        geometry={glow}
        material={res.glowMat}
        frustumCulled={false}
        renderOrder={10}
      />
      {!low && (
        <primitive object={trail} frustumCulled={false} renderOrder={9} />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Napas: paru-paru mengembang saat menarik napas, dan bernapas pelan saat diam.

function Breathing({
  startRef,
  scaleRef,
}: {
  startRef: React.RefObject<number | null>;
  scaleRef: React.RefObject<number>;
}) {
  useFrame(() => {
    const start = startRef.current;
    const raw = breathProgress(start, false);
    const t = raw < 0 ? 2 : raw;
    // Saat diam paru-paru tidak bergerak; hanya mengembang ketika menarik napas.
    const inhale =
      t >= 0 && t <= 1.4 ? 0.05 * Math.sin(Math.PI * clamp01(t / 1.4)) : 0;
    scaleRef.current = LUNG_SCALE * (1 + inhale);
  });
  return null;
}

// ---------------------------------------------------------------------------

export default function LungScene({
  mask,
  fates,
  breathId,
  rect,
}: {
  mask: Mask;
  fates: Fate[];
  breathId: number;
  rect: FrameRect;
}) {
  const [anatomy, setAnatomy] = useState<Anatomy | null>(anatomyCache);
  const [low, setLow] = useState(false);
  useEffect(() => {
    if (anatomyCache) return;
    const id = window.setTimeout(() => setAnatomy(buildAnatomy()), 30);
    return () => window.clearTimeout(id);
  }, []);

  const startRef = useRef<number | null>(null);
  const scaleRef = useRef(LUNG_SCALE);
  const seenBreath = useRef(breathId);
  useEffect(() => {
    startRef.current = null;
  }, [mask]);
  useEffect(() => {
    if (breathId !== seenBreath.current) {
      seenBreath.current = breathId;
      startRef.current = performance.now();
    }
  }, [breathId]);

  // HD: sampai 2× kepadatan piksel; PerformanceGuard menurunkannya bila berat.
  const maxDpr = low ? 1 : 2;
  return (
    <Canvas
      dpr={[1, maxDpr]}
      frameloop="demand"
      camera={{ fov: FOV, near: 0.1, far: 60, manual: true } as never}
      gl={{ antialias: !low, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
      fallback={
        <p className="p-6 text-sm text-white/70">
          Peramban Anda tidak mendukung WebGL, jadi paru-paru tidak dapat
          ditampilkan.
        </p>
      }
    >
      <color attach="background" args={["#08080b"]} />
      <CameraRig rect={rect} />
      <DevExpose />
      <PerformanceGuard maxDpr={maxDpr} onOverload={() => setLow(true)} />
      <OrbitControls
        makeDefault
        target={TARGET}
        enablePan={false}
        enableZoom
        minDistance={6}
        maxDistance={22}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.55}
        minAzimuthAngle={-1.2}
        maxAzimuthAngle={1.2}
        minPolarAngle={0.9}
        maxPolarAngle={2.1}
      />
      <ambientLight intensity={0.35} />
      <hemisphereLight args={["#ffe9d8", "#1a1016", 0.7]} />
      <directionalLight position={[3, 5, 4]} intensity={2.3} color="#fff1e2" />
      <directionalLight
        position={[-4, 1, -3]}
        intensity={1.3}
        color="#9fb8ff"
      />
      <pointLight
        position={[0, -1.2, 1.6]}
        intensity={2.2}
        distance={4}
        color="#ff9a8a"
      />

      <Atmosphere low={low} />
      <MaskModel mask={mask} />
      {anatomy && <GlassBody body={anatomy.body} />}
      <UpperAirway />
      {anatomy && <Lungs anatomy={anatomy} scaleRef={scaleRef} />}
      <Breathing startRef={startRef} scaleRef={scaleRef} />
      <Particles
        fates={fates}
        mask={mask}
        airway={anatomy?.airway ?? null}
        startRef={startRef}
        scaleRef={scaleRef}
        low={low}
      />

      {/* Label hanya di bingkai lebar; di ponsel bingkainya terlalu sempit. */}
      {rect.w >= 480 && (
        <>
          <Html
            position={[-AIR.x, AIR.y1 + 0.2, AIR.z1]}
            center={false}
            zIndexRange={[10, 0]}
            pointerEvents="none"
          >
            <p className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.18em] text-white/55">
              {KABUT_TEXT.outside}
            </p>
          </Html>
          <Html
            position={[2.0, LUNG_POS.y + 0.2, 0.4]}
            center={false}
            zIndexRange={[10, 0]}
            pointerEvents="none"
          >
            <p className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.18em] text-[#ffb0b0]/80">
              {KABUT_TEXT.lungs}
            </p>
          </Html>
        </>
      )}

      {!low && (
        <EffectComposer multisampling={4}>
          <Bloom
            mipmapBlur
            intensity={0.9}
            luminanceThreshold={0.45}
            luminanceSmoothing={0.3}
          />
          <Vignette offset={0.22} darkness={0.75} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
