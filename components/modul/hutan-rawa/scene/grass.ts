import * as THREE from "three";
import { DEPTH } from "./dome";
import { surfaceY, X_LEFT, X_RIGHT } from "./domeShape";

// Rumput di lantai kubah gambut, dibuat dengan cara yang sama seperti rumput
// Modul Kanal: rumpun-rumpun helai tipis yang di-instance, pangkal gelap dan
// ujung terang. Tanpa rumpun ini lantai hutan terbaca sebagai kain hijau
// yang rata; dengan rumpun ini ia terbaca sebagai tanah yang hidup, sama
// seperti permukaan bongkahan modul lain.

const BLADES = 7;

/** Tinggi rumpun (m). Lebih tinggi daripada Kanal karena diorama ini dilihat dari lebih jauh. */
const TUFT_HEIGHT = 1.1;

const GREENS = ["#4f6b2a", "#5b7a30", "#3f5a22", "#66833a"].map((c) => new THREE.Color(c));

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Satu rumpun: helai segitiga yang mekar dari satu titik (sama dengan Modul Kanal). */
function createTuftGeometry(): THREE.BufferGeometry {
  const rand = seeded(424242);
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  for (let b = 0; b < BLADES; b++) {
    const angle = (b / BLADES) * Math.PI * 2 + rand() * 0.8;
    const lean = 0.18 + rand() * 0.42;
    const height = 0.65 + rand() * 0.45;
    const width = 0.06 + rand() * 0.04;
    const dx = Math.cos(angle);
    const dz = Math.sin(angle);
    const sx = -dz * width;
    const sz = dx * width;
    const base = positions.length / 3;
    const midLean = lean * 0.35;
    positions.push(
      -sx, 0, -sz,
      sx, 0, sz,
      dx * midLean * 0.5 + sx * 0.55, height * 0.55, dz * midLean * 0.5 + sz * 0.55,
      dx * midLean * 0.5 - sx * 0.55, height * 0.55, dz * midLean * 0.5 - sz * 0.55,
      dx * lean, height, dz * lean,
    );
    colors.push(0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.62, 0.62, 0.62, 0.62, 0.62, 0.62, 0.85, 0.85, 0.82);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3, base + 3, base + 2, base + 4);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/** Tebar `count` rumpun di seluruh lantai kubah. Benih tetap: tiap kunjungan sama. */
export function createHutanGrass(count: number): THREE.InstancedMesh {
  const rand = seeded(20261119);
  const geometry = createTuftGeometry();
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, envMapIntensity: 0.35, metalness: 0, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const pos = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    // Sedikit menjauh dari tepi sungai dan tepi bongkahan, supaya rumpun
    // tidak menggantung di udara.
    const x = X_LEFT + 0.8 + rand() * (X_RIGHT - X_LEFT - 1.4);
    const z = -DEPTH / 2 + 0.6 + rand() * (DEPTH - 1.0);
    const s = (0.7 + rand() * 0.7) * TUFT_HEIGHT;
    pos.set(x, surfaceY(x, z) - 0.04, z);
    q.setFromAxisAngle(up, rand() * Math.PI * 2);
    scale.set(s * 1.2, s, s * 1.2);
    m.compose(pos, q, scale);
    mesh.setMatrixAt(i, m);
    color.copy(GREENS[Math.floor(rand() * GREENS.length)]).multiplyScalar(0.85 + rand() * 0.3);
    mesh.setColorAt(i, color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.frustumCulled = false;
  return mesh;
}
