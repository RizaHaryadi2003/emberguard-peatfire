"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Billboard, Html, Line, OrbitControls } from "@react-three/drei";
import PerformanceGuard from "@/components/modul/shared/scene/PerformanceGuard";
import { MASKS, type Fate, type Mask } from "@/lib/model/haze";
import { KABUT_TEXT } from "@/config/modul/kabut-asap";
import { lobeOf, lungsSdf, type Vec3 } from "./lungShape";
import {
  buildAirway,
  pathFromTrachea,
  CARINA,
  TRACHEA_R,
  TRACHEA_TOP,
  type Airway,
} from "./airwayTree";
import { surfaceNets, type Mesh } from "./surfaceNets";
import { BREATH_SEC } from "./timing";

// Babak 03 · Satu Tarikan Napas sebagai adegan 3D: hanya saluran napas dan
// paru-paru, tanpa kepala. Gayanya mengikuti ilustrasi sistem pernapasan di
// Wikipedia (LadyofHats, domain publik): paru-paru merah muda yang tembus
// pandang di tengah, percabangan bronkus berwarna per lobus (hijau atas,
// kuning tengah, biru bawah), trakea putih bercincin tulang rawan, diafragma
// jingga, dan sisipan gugus alveolus yang diperbesar.
//
// Masker melayang di atas pangkal saluran napas, mewakili masker di wajah.
// Seratus butir asap melayang di seluruh layar di sekeliling paru-paru. Saat
// pembaca menarik napas, tiap butir menjalani nasibnya dari model
// (lib/model/haze.ts, Kodros dkk. 2021): tertahan di masker, menembus kainnya,
// atau lewat celah tepi; yang lolos menyusuri satu jalur percabangan bronkus
// yang nyata sampai ujungnya, jadi butir-butir itu menyebar ke seluruh
// paru-paru. Ukuran butir tidak berskala (PM2.5 = 2,5 µm).
//
// Satuan dunia 10 cm, titik asal di karina, y ke atas, z ke arah pembaca.

export type FrameRect = { x: number; y: number; w: number; h: number };

const FOV = 30;
/** Pangkal saluran napas (di bawah masker), di atas puncak trakea. */
const THROAT_TOP = new THREE.Vector3(0, 1.42, 0);
/** Pusat masker dan kemiringannya ke arah pembaca. */
const MASK_POS = new THREE.Vector3(0, 1.74, 0.04);
const MASK_TILT = 1.0;
/** Jari-jari bola tempat masker dipotong dan sudut potongnya. */
const MASK_R = 0.62;
const MASK_CAP = 0.72;
/** Lebar masker dibanding tingginya. */
const MASK_WIDE = 1.3;
/** Sisipan alveolus diperbesar, di kanan atas paru-paru kiri. */
const ALV_POS = new THREE.Vector3(2.55, 0.55, 0.1);
/** Titik di paru kiri yang diperbesar. */
const ZOOM_SPOT = new THREE.Vector3(1.0, -0.35, 0.62);
/** Isi yang harus muat di kotak gambar. */
const CONTENT_MIN = new THREE.Vector3(-1.6, -2.55, -1);
const CONTENT_MAX = new THREE.Vector3(3.3, 2.25, 1);
const TARGET = CONTENT_MIN.clone().add(CONTENT_MAX).multiplyScalar(0.5);
/** Arah pandang awal: sedikit dari kanan dan atas. */
const VIEW_DIR = new THREE.Vector3(0.22, 0.12, 1).normalize();
/** Jari-jari cabang terkecil yang digambar (cabang lebih halus tetap dilalui butir). */
const DRAW_MIN_R = 0.0085;

/** Warna gaya ilustrasi Wikipedia. */
const COLOR = {
  lung: "#f1a3ad",
  lungEdge: "#c3566c",
  airway: "#f5f7f8",
  ring: "#1f7f95",
  lobe: { atas: "#4fae78", tengah: "#f2c440", bawah: "#4c86c8" },
  diaphragm: "#ea8a5c",
  sac: "#f2a0ab",
  artery: "#c8202c",
  vein: "#2b4fa3",
};

const MASK_LOOK: Record<
  Exclude<Mask, "tanpa">,
  { color: string; thick: number; pleats: number }
> = {
  kain: { color: "#6f8fa8", thick: 1, pleats: 0 },
  sintetis: { color: "#4c5060", thick: 1, pleats: 0 },
  medis: { color: "#8fcde6", thick: 0.7, pleats: 3 },
  n95: { color: "#ece6d8", thick: 1.6, pleats: 0 },
};

/** Bilangan semu 0–1 yang tetap untuk masukan yang sama. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const v3 = (p: Vec3) => new THREE.Vector3(p[0], p[1], p[2]);

/** Matriks masker: dari koordinat lokal (puncak di asal, cekung ke −y) ke dunia. */
const MASK_MATRIX = new THREE.Matrix4().compose(
  MASK_POS,
  new THREE.Quaternion().setFromEuler(new THREE.Euler(MASK_TILT, 0, 0)),
  new THREE.Vector3(MASK_WIDE, 1, 1),
);
/** Titik pada permukaan masker; u = 0 puncak, 1 tepi; a = sudut keliling. */
function maskPoint(u: number, a: number, lift = 0): THREE.Vector3 {
  const th = u * MASK_CAP;
  const r = MASK_R + lift;
  return new THREE.Vector3(
    Math.sin(th) * Math.cos(a) * r,
    Math.cos(th) * r - MASK_R,
    Math.sin(th) * Math.sin(a) * r,
  ).applyMatrix4(MASK_MATRIX);
}
/** Bagian tepi masker yang tidak rapat (porsi keliling). */
const gapOf = (mask: Mask) =>
  mask === "tanpa" ? 0 : Math.min(0.3, MASKS[mask].leak * 0.55);

// ---------------------------------------------------------------------------
// Anatomi: dibangun sekali (±0,3 detik), disimpan untuk kunjungan berikutnya.

type Anatomy = {
  lungs: THREE.BufferGeometry;
  diaphragm: THREE.BufferGeometry;
  airway: Airway;
  /** Indeks segmen yang digambar sebagai tabung. */
  drawn: number[];
};
let anatomyCache: Anatomy | null = null;

function toGeometry(m: Mesh): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(m.positions, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(m.normals, 3));
  g.setIndex(new THREE.BufferAttribute(m.indices, 1));
  return g;
}

function buildAnatomy(): Anatomy {
  const lungs = toGeometry(
    surfaceNets((x, y, z) => lungsSdf(x, y, z, false), [-1.5, -1.98, -1], [1.5, 0.95, 1], 0.026),
  );
  const diaphragm = diaphragmGeometry();
  const airway = buildAirway();
  const drawn: number[] = [];
  airway.segments.forEach((s, i) => {
    if (i > 0 && s.r >= DRAW_MIN_R) drawn.push(i);
  });
  return { lungs, diaphragm, airway, drawn };
}

/**
 * Diafragma: lembar tipis dua kubah tepat di bawah dasar paru-paru (kubah
 * kanan lebih tinggi karena hati), dibuat dari kisi kutub di atas elips agar
 * tepinya mulus.
 */
function diaphragmGeometry(): THREE.BufferGeometry {
  const domes = [
    { x: -0.66, y: -2.5 },
    { x: 0.66, y: -2.65 },
  ];
  const height = (x: number, z: number) => {
    let y = -2.32;
    for (const d of domes) {
      const h = 1.25 ** 2 - (x - d.x) ** 2 - z * z;
      if (h > 0) y = Math.max(y, d.y + Math.sqrt(h) - 0.05);
    }
    return y;
  };
  const RINGS = 40;
  const SEG = 96;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= RINGS; i++) {
    const r = i / RINGS;
    for (let j = 0; j < SEG; j++) {
      const a = (j / SEG) * Math.PI * 2;
      const x = Math.cos(a) * r * 1.42;
      const z = Math.sin(a) * r * 0.82;
      pos.push(x, height(x, z), z);
    }
  }
  for (let i = 0; i < RINGS; i++)
    for (let j = 0; j < SEG; j++) {
      const a = i * SEG + j;
      const b = i * SEG + ((j + 1) % SEG);
      idx.push(a, a + SEG, b, b, a + SEG, b + SEG);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------------
// Kamera: isi dipaskan ke kotak gambar, kanvas tetap memenuhi layar.

const FIT = (() => {
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), VIEW_DIR).normalize();
  const up = new THREE.Vector3().crossVectors(VIEW_DIR, right).normalize();
  let hw = 0;
  let hh = 0;
  let depth = 0;
  for (let i = 0; i < 8; i++) {
    const c = new THREE.Vector3(
      i & 1 ? CONTENT_MAX.x : CONTENT_MIN.x,
      i & 2 ? CONTENT_MAX.y : CONTENT_MIN.y,
      i & 4 ? CONTENT_MAX.z : CONTENT_MIN.z,
    ).sub(TARGET);
    hw = Math.max(hw, Math.abs(c.dot(right)));
    hh = Math.max(hh, Math.abs(c.dot(up)));
    depth = Math.max(depth, Math.abs(c.dot(VIEW_DIR)));
  }
  return { halfW: hw * 1.04, halfH: hh * 1.04, depth };
})();

function CameraRig({ rect }: { rect: FrameRect }) {
  const get = useThree((s) => s.get);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const placed = useRef(false);
  useLayoutEffect(() => {
    const camera = get().camera as THREE.PerspectiveCamera;
    const aspect = Math.max(0.2, rect.w / Math.max(1, rect.h));
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const dist = Math.max(FIT.halfH / tan, FIT.halfW / (tan * aspect)) + FIT.depth * 0.5;
    camera.fov = FOV;
    camera.aspect = aspect;
    camera.setViewOffset(rect.w, rect.h, -rect.x, -rect.y, size.width, size.height);
    const dir = placed.current ? camera.position.clone().sub(TARGET).normalize() : VIEW_DIR;
    camera.position.copy(TARGET).addScaledVector(dir, dist);
    placed.current = true;
    camera.lookAt(TARGET);
    camera.updateProjectionMatrix();
    invalidate();
  }, [get, rect, size, invalidate]);
  return null;
}

// ---------------------------------------------------------------------------
// Paru-paru: merah muda tembus pandang di tengah, pekat di tepi, seperti
// ilustrasi; bronkus di dalamnya tetap terlihat.

function createLungMaterial(): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({
    color: COLOR.lung,
    emissive: new THREE.Color(COLOR.lung),
    emissiveIntensity: 0.22,
    roughness: 0.55,
    sheen: 0.6,
    sheenColor: new THREE.Color("#ffd9de"),
    sheenRoughness: 0.5,
    clearcoat: 0.12,
    clearcoatRoughness: 0.5,
    transparent: true,
    depthWrite: false,
  });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uEdge = { value: new THREE.Color(COLOR.lungEdge) };
    shader.vertexShader = shader.vertexShader
      .replace("void main() {", "varying vec3 vLocal;\nvoid main() {")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLocal = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace("void main() {", "uniform vec3 uEdge;\nvarying vec3 vLocal;\nvoid main() {")
      .replace(
        "#include <dithering_fragment>",
        /* glsl */ `
        float fres = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 1.5);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uEdge * (0.55 + 0.45 * gl_FragColor.rgb), fres * 0.45);
        gl_FragColor.a = mix(0.66, 0.97, fres);
        // Celah antarlobus sebagai garis (rumus sama dengan lungShape.ts):
        // celah miring di kedua paru, celah mendatar hanya di paru kanan (x < 0).
        float dO = ((vLocal.z + 0.8) * 1.75 + (vLocal.y - 0.3) * 1.6) / 2.3713;
        float fis = 1.0 - smoothstep(0.008, 0.02, abs(dO));
        if (vLocal.x < 0.0 && dO > 0.0) fis = max(fis, 1.0 - smoothstep(0.008, 0.02, abs(vLocal.y + 0.22)));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uEdge * 0.75, fis * 0.8);
        gl_FragColor.a = max(gl_FragColor.a, fis * 0.9);
        #include <dithering_fragment>`,
      );
  };
  return m;
}

/** Tabung bronkus (silinder + sendi bola), warna per lobus. */
function AirwayTubes({ anatomy }: { anatomy: Anatomy }) {
  const { tubes, joints } = useMemo(() => {
    const segs = anatomy.airway.segments;
    const list = [0, ...anatomy.drawn];
    const tubeGeo = new THREE.CylinderGeometry(1, 1, 1, 12, 1, true);
    const ballGeo = new THREE.SphereGeometry(1, 12, 8);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0 });
    const tubes = new THREE.InstancedMesh(tubeGeo, mat, list.length);
    const joints = new THREE.InstancedMesh(ballGeo, mat, list.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const yAxis = new THREE.Vector3(0, 1, 0);
    const col = new THREE.Color();
    list.forEach((i, k) => {
      const s = segs[i];
      const a = i === 0 ? THROAT_TOP.clone() : v3(s.a);
      const b = v3(s.b);
      const d = b.clone().sub(a);
      const len = d.length();
      // Cabang halus ditebalkan sedikit agar terbaca di layar.
      const r = s.r * 1.15 + 0.004;
      q.setFromUnitVectors(yAxis, d.normalize());
      m.compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(r, len, r));
      tubes.setMatrixAt(k, m);
      m.compose(b, q, new THREE.Vector3(r, r, r));
      joints.setMatrixAt(k, m);
      if (s.gen <= 1) col.set(COLOR.airway);
      else {
        const lobe = lobeOf(s.b[1], s.b[2], s.side === 0 ? -1 : s.side);
        col.set(COLOR.lobe[lobe]);
        // Bronkus besar sedikit lebih pucat, cabang halus lebih pekat.
        col.lerp(new THREE.Color(COLOR.airway), Math.max(0, 0.45 - s.gen * 0.06));
      }
      tubes.setColorAt(k, col);
      joints.setColorAt(k, col);
    });
    return { tubes, joints };
  }, [anatomy]);
  useEffect(
    () => () => {
      tubes.geometry.dispose();
      joints.geometry.dispose();
      (tubes.material as THREE.Material).dispose();
    },
    [tubes, joints],
  );
  return (
    <>
      <primitive object={tubes} />
      <primitive object={joints} />
    </>
  );
}

/** Cincin tulang rawan berbentuk C di trakea dan bronkus utama (toska). */
function CartilageRings({ anatomy }: { anatomy: Anatomy }) {
  const mesh = useMemo(() => {
    const segs = anatomy.airway.segments;
    const rings: { at: THREE.Vector3; dir: THREE.Vector3; r: number }[] = [];
    const top = THROAT_TOP;
    const carina = v3(CARINA);
    // Trakea: 17 cincin (16–20 pada orang dewasa).
    for (let k = 0; k < 17; k++)
      rings.push({
        at: top.clone().lerp(carina, (k + 0.6) / 17.6),
        dir: carina.clone().sub(top).normalize(),
        r: TRACHEA_R,
      });
    for (const s of segs.filter((s) => s.gen === 1)) {
      const a = v3(s.a);
      const b = v3(s.b);
      const n = Math.max(2, Math.round(a.distanceTo(b) / 0.085));
      for (let k = 1; k <= n; k++)
        rings.push({ at: a.clone().lerp(b, k / (n + 1)), dir: b.clone().sub(a).normalize(), r: s.r });
    }
    const geo = new THREE.TorusGeometry(1, 0.17, 6, 24, Math.PI * 1.6);
    const mat = new THREE.MeshStandardMaterial({ color: COLOR.ring, roughness: 0.45 });
    const mesh = new THREE.InstancedMesh(geo, mat, rings.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const zAxis = new THREE.Vector3(0, 0, 1);
    rings.forEach((ring, k) => {
      // Celah huruf C menghadap ke belakang (otot trakea).
      q.setFromUnitVectors(zAxis, ring.dir).multiply(
        new THREE.Quaternion().setFromAxisAngle(zAxis, Math.PI * 0.7),
      );
      const r = ring.r * 1.18 + 0.004;
      m.compose(ring.at, q, new THREE.Vector3(r, r, r));
      mesh.setMatrixAt(k, m);
    });
    return mesh;
  }, [anatomy]);
  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    },
    [mesh],
  );
  return <primitive object={mesh} />;
}

function Lungs({
  anatomy,
  scaleRef,
}: {
  anatomy: Anatomy;
  scaleRef: React.RefObject<number>;
}) {
  const group = useRef<THREE.Group>(null);
  const mats = useMemo(
    () => ({
      lung: createLungMaterial(),
      diaphragm: new THREE.MeshStandardMaterial({
        color: COLOR.diaphragm,
        roughness: 0.6,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      }),
    }),
    [],
  );
  useEffect(
    () => () => {
      mats.lung.dispose();
      mats.diaphragm.dispose();
    },
    [mats],
  );
  useFrame(() => {
    const s = scaleRef.current ?? 1;
    // Paru-paru mengembang ke samping dan ke bawah dari karina.
    group.current?.scale.set(1 + (s - 1) * 0.7, s, 1 + (s - 1) * 0.7);
  });
  return (
    <>
      <mesh geometry={anatomy.diaphragm} material={mats.diaphragm} />
      <group ref={group}>
        <AirwayTubes anatomy={anatomy} />
        <CartilageRings anatomy={anatomy} />
        <mesh geometry={anatomy.lungs} material={mats.lung} renderOrder={2} />
      </group>
    </>
  );
}

// ---------------------------------------------------------------------------
// Masker: cangkang melengkung di atas pangkal saluran napas.

function MaskModel({ mask }: { mask: Mask }) {
  const geo = useMemo(
    () => new THREE.SphereGeometry(MASK_R, 48, 18, 0, Math.PI * 2, 0, MASK_CAP),
    [],
  );
  useEffect(() => () => geo.dispose(), [geo]);
  if (mask === "tanpa") return null;
  const look = MASK_LOOK[mask];
  const gap = gapOf(mask);
  // Tepi masker; bagian yang renggang ditandai jingga.
  const rim = (from: number, to: number) =>
    Array.from({ length: 33 }, (_, k) => {
      const a = (from + ((to - from) * k) / 32) * Math.PI * 2;
      return maskPoint(1, a, 0.004);
    });
  return (
    <>
      <group position={MASK_POS} rotation={[MASK_TILT, 0, 0]} scale={[MASK_WIDE, look.thick, 1]}>
        <mesh geometry={geo} position={[0, -MASK_R, 0]}>
          <meshStandardMaterial
            color={look.color}
            roughness={0.92}
            side={THREE.DoubleSide}
            transparent
            opacity={0.94}
          />
        </mesh>
        {/* Tali telinga di kedua sisi, melengkung ke belakang. */}
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            position={[side * Math.sin(MASK_CAP) * MASK_R * 0.98, Math.cos(MASK_CAP) * MASK_R - MASK_R - 0.1, 0]}
            rotation={[0, Math.PI / 2, 0]}
          >
            <torusGeometry args={[0.2, 0.012, 6, 32, Math.PI * 1.25]} />
            <meshStandardMaterial color="#e8e4dc" roughness={0.7} />
          </mesh>
        ))}
        {/* Lipatan masker medis. */}
        {Array.from({ length: look.pleats }, (_, k) => {
          const th = MASK_CAP * (0.35 + k * 0.2);
          return (
            <mesh
              key={k}
              position={[0, Math.cos(th) * MASK_R - MASK_R + 0.004, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <torusGeometry args={[Math.sin(th) * MASK_R + 0.003, 0.006, 4, 48]} />
              <meshStandardMaterial color="#6aa9c4" roughness={0.9} />
            </mesh>
          );
        })}
      </group>
      {gap > 0.05 && (
        <>
          <Line points={rim(0.5 - gap, 0.5 + gap)} color="#ff8a3d" lineWidth={2.5} dashed dashSize={0.05} gapSize={0.04} />
          <Line points={rim(-gap, gap)} color="#ff8a3d" lineWidth={2.5} dashed dashSize={0.05} gapSize={0.04} />
        </>
      )}
    </>
  );
}

/** Pangkal saluran napas: tabung pendek dari bawah masker ke trakea. */
function UpperAirway() {
  const geo = useMemo(
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([MASK_POS.clone().add(new THREE.Vector3(0, -0.12, 0)), THROAT_TOP, v3(TRACHEA_TOP)]),
        16,
        TRACHEA_R * 1.05,
        12,
      ),
    [],
  );
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color={COLOR.airway} roughness={0.45} transparent opacity={0.85} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Sisipan alveolus: gugus kantong seperti anggur di ujung bronkiolus.

type Sac = { p: THREE.Vector3; r: number };
const ALV = (() => {
  const stem = [new THREE.Vector3(-0.55, -0.55, 0), new THREE.Vector3(-0.25, -0.2, 0.02), new THREE.Vector3(0, 0, 0)];
  const clusters = [
    new THREE.Vector3(-0.28, 0.42, 0.02),
    new THREE.Vector3(0.36, 0.36, -0.02),
    new THREE.Vector3(0.42, -0.24, 0.04),
  ];
  const sacs: Sac[] = [];
  clusters.forEach((c, ci) => {
    sacs.push({ p: c.clone(), r: 0.13 });
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2 + ci;
      const b = (hash(ci * 9 + k) - 0.5) * 1.6;
      sacs.push({
        p: c.clone().add(new THREE.Vector3(Math.cos(a) * Math.cos(b), Math.sin(a) * Math.cos(b), Math.sin(b)).multiplyScalar(0.17)),
        r: 0.1 + hash(ci * 31 + k) * 0.035,
      });
    }
  });
  return { stem, clusters, sacs };
})();

function AlveolusInset({ deposits }: { deposits: number }) {
  const res = useMemo(() => {
    const stemGeos = ALV.clusters.map(
      (c) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([...ALV.stem, c]), 24, 0.065, 10),
    );
    const vessel = (side: number, color: string) =>
      ALV.clusters.map(
        (c, i) =>
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(
              [...ALV.stem, c].map((p, k) =>
                p.clone().add(new THREE.Vector3(side * 0.08, 0.02 * k, 0.07 + 0.02 * i)),
              ),
            ),
            24,
            0.018,
            6,
          ),
      ).map((g) => ({ g, color }));
    const sacGeo = new THREE.SphereGeometry(1, 24, 16);
    return { stemGeos, vessels: [...vessel(1, COLOR.artery), ...vessel(-1, COLOR.vein)], sacGeo };
  }, []);
  useEffect(
    () => () => {
      res.stemGeos.forEach((g) => g.dispose());
      res.vessels.forEach((v) => v.g.dispose());
      res.sacGeo.dispose();
    },
    [res],
  );
  // Titik jelaga di permukaan kantong yang menghadap pembaca.
  const specks = useMemo(
    () =>
      Array.from({ length: 100 }, (_, i) => {
        const s = ALV.sacs[Math.floor(hash(i * 3.3) * ALV.sacs.length)];
        const a = hash(i * 5.1) * Math.PI * 2;
        const b = Math.acos(0.3 + hash(i * 7.7) * 0.7);
        return s.p
          .clone()
          .add(new THREE.Vector3(Math.sin(b) * Math.cos(a), Math.sin(b) * Math.sin(a), Math.cos(b)).multiplyScalar(s.r * 1.01));
      }),
    [],
  );
  return (
    <group position={ALV_POS}>
      <Billboard>
        <mesh position={[0, 0, -0.6]}>
          <circleGeometry args={[1.02, 64]} />
          <meshBasicMaterial color="#1c1517" transparent opacity={0.85} />
        </mesh>
        <mesh position={[0, 0, -0.59]}>
          <ringGeometry args={[1.02, 1.035, 96]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.35} />
        </mesh>
      </Billboard>
      {res.stemGeos.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshPhysicalMaterial color="#f0b3b6" roughness={0.5} sheen={0.5} sheenColor="#ffe0e3" />
        </mesh>
      ))}
      {res.vessels.map((v, i) => (
        <mesh key={`v${i}`} geometry={v.g}>
          <meshStandardMaterial color={v.color} roughness={0.4} />
        </mesh>
      ))}
      {ALV.sacs.map((s, i) => (
        <mesh key={`s${i}`} geometry={res.sacGeo} position={s.p} scale={s.r}>
          <meshPhysicalMaterial color={COLOR.sac} roughness={0.5} sheen={0.7} sheenColor="#ffe3e6" clearcoat={0.15} />
        </mesh>
      ))}
      {specks.slice(0, deposits).map((p, i) => (
        <mesh key={`d${i}`} position={p} geometry={res.sacGeo} scale={0.022}>
          <meshBasicMaterial color="#2a1d16" />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Udara berasap: debu halus di seluruh layar dan seratus butir jelaga.

const POINT_VERTEX = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
attribute float aAlpha;
varying vec3 vColor;
varying float vAlpha;
uniform float uScale;
void main() {
  vColor = aColor;
  vAlpha = aAlpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

/** Butir jelaga: inti gelap dikelilingi pendar hangat. */
function createSootMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 300 } },
    vertexShader: POINT_VERTEX,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float glow = pow(1.0 - smoothstep(0.0, 0.5, d), 2.0);
        float core = 1.0 - smoothstep(0.1, 0.16, d);
        vec3 col = mix(vColor * 1.2, vec3(0.16, 0.12, 0.1), core);
        float a = max(glow * 0.75, core) * vAlpha;
        if (a < 0.01) discard;
        gl_FragColor = vec4(col, a);
      }
    `,
    transparent: true,
    depthWrite: false,
  });
}

/** Debu halus: berkilau pelan, hanyut mengitari paru-paru (dihitung di GPU). */
function createDustMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: 300 } },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime;
      uniform float uScale;
      varying float vAlpha;
      void main() {
        float a = uTime * (0.02 + 0.03 * fract(aPhase * 7.0));
        vec3 p = position;
        p.xz = mat2(cos(a), -sin(a), sin(a), cos(a)) * p.xz;
        p.y += sin(uTime * 0.3 + aPhase * 6.28) * 0.08;
        vAlpha = 0.25 + 0.75 * (0.5 + 0.5 * sin(uTime * 1.3 + aPhase * 20.0));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aSize * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = (1.0 - smoothstep(0.0, 0.5, d)) * vAlpha * 0.55;
        gl_FragColor = vec4(1.0, 0.86, 0.7, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/** Sebar titik di cangkang bola sekitar paru-paru, tidak di dalam paru-paru. */
function airPoint(i: number, r0: number, r1: number, salt: number): THREE.Vector3 {
  for (let t = 0; t < 12; t++) {
    const u = hash(i * 1.7 + salt + t * 9.1) * 2 - 1;
    const a = hash(i * 2.9 + salt + t * 3.7) * Math.PI * 2;
    const r = r0 + (r1 - r0) * Math.sqrt(hash(i * 4.3 + salt + t));
    const s = Math.sqrt(1 - u * u);
    const p = new THREE.Vector3(s * Math.cos(a) * r * 1.25, u * r * 0.95, s * Math.sin(a) * r * 0.8).add(
      new THREE.Vector3(0.4, -0.1, 0),
    );
    if (lungsSdf(p.x, p.y, p.z, false) > 0.25 && p.distanceTo(ALV_POS) > 1.15) return p;
  }
  return new THREE.Vector3(-2.6, 1.6, 0.5);
}

function Dust({ low }: { low: boolean }) {
  const mat = useMemo(() => createDustMaterial(), []);
  const geo = useMemo(() => {
    const n = low ? 900 : 2200;
    const pos = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const phase = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const p = airPoint(i, 1.2, 7, 0.5);
      pos.set([p.x, p.y, p.z], i * 3);
      size[i] = 0.02 + hash(i * 6.1) ** 3 * 0.07;
      phase[i] = hash(i * 8.3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    g.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    return g;
  }, [low]);
  useEffect(() => () => geo.dispose(), [geo]);
  useEffect(() => () => mat.dispose(), [mat]);
  const reduced = useReducedMotion();
  // Peneduh diubah lewat objek 3D-nya (ref), bukan lewat nilai memo.
  const ref = useRef<THREE.Points>(null);
  useFrame(({ clock, size }) => {
    const m = ref.current?.material as THREE.ShaderMaterial | undefined;
    if (!m) return;
    m.uniforms.uTime.value = reduced ? 0 : clock.elapsedTime;
    m.uniforms.uScale.value = size.height * 1.1;
  });
  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
}

function useReducedMotion(): boolean {
  // Adegan hanya dimuat di peramban (ssr: false), jadi window selalu ada.
  const [reduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  return reduced;
}

type Plan = {
  home: THREE.Vector3;
  /** Titik tepat di luar masker yang dituju saat terisap. */
  outside: THREE.Vector3;
  /** Jalur sesudah masker sampai ujung bronkiolus; null bila tertahan. */
  route: THREE.CatmullRomCurve3 | null;
  delay: number;
  size: number;
  swirl: number;
};

const SOOT_COLOR = {
  idle: new THREE.Color("#e8b98a"),
  kain: new THREE.Color("#ffc27a"),
  celah: new THREE.Color("#ff7a2e"),
  stuck: new THREE.Color("#8d7a66"),
};

function Particles({
  fates,
  mask,
  airway,
  startRef,
  onArrived,
}: {
  fates: Fate[];
  mask: Mask;
  airway: Airway | null;
  startRef: React.RefObject<number | null>;
  onArrived: (n: number) => void;
}) {
  const mat = useMemo(() => createSootMaterial(), []);
  useEffect(() => () => mat.dispose(), [mat]);
  const plan = useMemo<Plan[]>(() => {
    const gap = gapOf(mask);
    return fates.map((fate, i) => {
      const home = airPoint(i, 1.9, 4.6, 17.3);
      // Celah: di bagian tepi yang renggang; lainnya: badan masker.
      const side = hash(i * 4.1) < 0.5 ? 0 : 0.5;
      const a =
        fate === "celah"
          ? (side + (hash(i * 5.3) - 0.5) * 2 * gap) * Math.PI * 2
          : hash(i * 5.3) * Math.PI * 2;
      const u = fate === "celah" ? 1.05 : 0.15 + hash(i * 6.2) * 0.75;
      const outside = maskPoint(u, a, 0.05);
      let route: THREE.CatmullRomCurve3 | null = null;
      if (airway && !(fate === "tertahan" && mask !== "tanpa")) {
        const term = airway.terminals[Math.floor(hash(i * 7.7) * airway.terminals.length)];
        const path = pathFromTrachea(airway, term);
        const pts = [
          outside,
          maskPoint(u * 0.6, a, -0.08),
          MASK_POS.clone().add(new THREE.Vector3(0, -0.16, 0)),
          THROAT_TOP.clone(),
          ...path.map((k) => v3(airway.segments[k].b)),
        ];
        route = new THREE.CatmullRomCurve3(pts, false, "centripetal");
      }
      return {
        home,
        outside,
        route,
        delay: hash(i * 9.1) * 0.12,
        size: 0.2 + hash(i * 4.6) * 0.09,
        swirl: (hash(i * 3.9) - 0.5) * 1.6,
      };
    });
  }, [fates, mask, airway]);

  const geo = useMemo(() => {
    const n = plan.length;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(n), 1));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(n).fill(1), 1));
    return g;
  }, [plan]);
  useEffect(() => () => geo.dispose(), [geo]);
  const reduced = useReducedMotion();
  const lastArrived = useRef(-1);
  useEffect(() => {
    lastArrived.current = -1;
  }, [plan]);

  const ref = useRef<THREE.Points>(null);
  const tmp = useRef(new THREE.Vector3());
  useFrame(({ clock, size }) => {
    const pts = ref.current;
    if (!pts) return;
    (pts.material as THREE.ShaderMaterial).uniforms.uScale.value =
      size.height * 1.1;
    const geo = pts.geometry;
    const time = reduced ? 0 : clock.elapsedTime;
    const start = startRef.current;
    const t = start === null ? -1 : reduced ? 1.4 : (performance.now() - start) / 1000 / BREATH_SEC;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colA = geo.attributes.aColor as THREE.BufferAttribute;
    const sizeA = geo.attributes.aSize as THREE.BufferAttribute;
    let arrived = 0;
    plan.forEach((pl, i) => {
      // Melayang pelan di tempat.
      const p = tmp.current.set(
        pl.home.x + Math.sin(time * 0.4 + i) * 0.06,
        pl.home.y + Math.cos(time * 0.33 + i * 1.7) * 0.06,
        pl.home.z + Math.sin(time * 0.27 + i * 0.7) * 0.06,
      );
      let color = SOOT_COLOR.idle;
      let sz = pl.size;
      if (t >= 0) {
        const k = clamp01((t - pl.delay) / 0.86);
        // Terisap: melengkung dari sekeliling menuju masker.
        const ap = ease(clamp01(k / 0.3));
        const from = p.clone();
        p.lerpVectors(from, pl.outside, ap);
        const bend = Math.sin(ap * Math.PI) * pl.swirl;
        p.x += bend * 0.6;
        p.z += bend * 0.4;
        color = fates[i] === "celah" ? SOOT_COLOR.celah : fates[i] === "kain" ? SOOT_COLOR.kain : SOOT_COLOR.idle;
        if (!pl.route) {
          if (ap >= 1) color = SOOT_COLOR.stuck;
        } else if (k >= 0.3) {
          const f = ease((k - 0.3) / 0.7);
          pl.route.getPointAt(f, p);
          sz = pl.size * (1 - f * 0.4);
          if (k >= 1) arrived++;
        }
      }
      pos.setXYZ(i, p.x, p.y, p.z);
      colA.setXYZ(i, color.r, color.g, color.b);
      sizeA.setX(i, sz);
    });
    pos.needsUpdate = true;
    colA.needsUpdate = true;
    sizeA.needsUpdate = true;
    // Sisipan alveolus diberi tahu jumlah butir yang sudah sampai.
    const shown = t >= 1 ? arrived : 0;
    if (shown !== lastArrived.current) {
      lastArrived.current = shown;
      onArrived(shown);
    }
  });
  return (
    <points
      ref={ref}
      geometry={geo}
      material={mat}
      frustumCulled={false}
      renderOrder={5}
    />
  );
}

/** Paru-paru mengembang pelan selama tarikan napas, lalu kembali. */
function Breathing({
  startRef,
  scaleRef,
}: {
  startRef: React.RefObject<number | null>;
  scaleRef: React.RefObject<number>;
}) {
  useFrame(() => {
    const start = startRef.current;
    const t = start === null ? 2 : (performance.now() - start) / 1000 / BREATH_SEC;
    scaleRef.current = t >= 0 && t <= 1 ? 1 + 0.045 * Math.sin(t * Math.PI) : 1;
  });
  return null;
}

/** Garis dari titik kecil di paru kiri ke sisipan alveolus. */
function ZoomLink() {
  const end = ALV_POS.clone().add(ZOOM_SPOT.clone().sub(ALV_POS).normalize().multiplyScalar(1.02));
  return (
    <>
      <mesh position={ZOOM_SPOT}>
        <sphereGeometry args={[0.07, 16, 12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.25} />
      </mesh>
      <Line points={[ZOOM_SPOT, end]} color="#ffffff" transparent opacity={0.35} lineWidth={1} />
    </>
  );
}

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
  const [deposits, setDeposits] = useState(0);
  useEffect(() => {
    if (anatomyCache) return;
    const id = window.setTimeout(() => {
      anatomyCache = buildAnatomy();
      setAnatomy(anatomyCache);
    }, 30);
    return () => window.clearTimeout(id);
  }, []);

  const startRef = useRef<number | null>(null);
  const scaleRef = useRef(1);
  const seenBreath = useRef(breathId);
  useEffect(() => {
    // Jumlah endapan ikut kembali ke 0 lewat laporan Particles berikutnya.
    startRef.current = null;
  }, [mask]);
  useEffect(() => {
    if (breathId !== seenBreath.current) {
      seenBreath.current = breathId;
      startRef.current = performance.now();
    }
  }, [breathId]);

  const maxDpr = low ? 1 : 2;
  const wide = rect.w >= 480;
  const label = "whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.18em]";
  return (
    <Canvas
      dpr={[1, maxDpr]}
      frameloop="demand"
      camera={{ fov: FOV, near: 0.1, far: 80, manual: true } as never}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.1;
      }}
      fallback={
        <p className="p-6 text-sm text-white/70">
          Peramban Anda tidak mendukung WebGL, jadi paru-paru tidak dapat ditampilkan.
        </p>
      }
    >
      <CameraRig rect={rect} />
      <PerformanceGuard maxDpr={maxDpr} onOverload={() => setLow(true)} />
      <OrbitControls
        makeDefault
        target={TARGET}
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.5}
        minAzimuthAngle={-0.9}
        maxAzimuthAngle={1.1}
        minPolarAngle={1.05}
        maxPolarAngle={1.95}
      />
      {/* Cahaya studio: utama hangat dari kiri atas, isi lembut, tepi sejuk dari belakang. */}
      <hemisphereLight args={["#fff3ea", "#2a1c22", 0.9]} />
      <directionalLight position={[-3, 5, 6]} intensity={2.4} color="#fff4ea" />
      <directionalLight position={[5, 1, 3]} intensity={0.7} color="#ffe2d6" />
      <directionalLight position={[2, 3, -6]} intensity={1.6} color="#a9c8ff" />
      <pointLight position={[0, -0.8, 2.2]} intensity={1.2} distance={5} color="#ffb4a8" />

      <Dust low={low} />
      {anatomy && <Lungs anatomy={anatomy} scaleRef={scaleRef} />}
      <UpperAirway />
      <MaskModel mask={mask} />
      <ZoomLink />
      <AlveolusInset deposits={deposits} />
      <Breathing startRef={startRef} scaleRef={scaleRef} />
      <Particles
        fates={fates}
        mask={mask}
        airway={anatomy?.airway ?? null}
        startRef={startRef}
        onArrived={setDeposits}
      />

      {wide && (
        <>
          <Html position={[-2.4, 2.3, 0]} zIndexRange={[10, 0]} pointerEvents="none">
            <p className={`${label} text-white/55`}>{KABUT_TEXT.outside}</p>
          </Html>
          <Html position={[1.55, -1.5, 0.3]} zIndexRange={[10, 0]} pointerEvents="none">
            <p className={`${label} text-[#ffb0b0]/80`}>{KABUT_TEXT.lungs}</p>
          </Html>
          <Html position={[ALV_POS.x - 0.75, ALV_POS.y - 1.15, ALV_POS.z]} zIndexRange={[10, 0]} pointerEvents="none">
            <p className={`${label} text-white/55`}>{KABUT_TEXT.alveoliZoom}</p>
          </Html>
        </>
      )}
    </Canvas>
  );
}
