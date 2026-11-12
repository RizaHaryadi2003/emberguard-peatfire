import * as THREE from "three";
import type { PeatLayerId } from "@/lib/peat";
import { seeded } from "@/lib/random";
import { wallPoint } from "./terrain";

// Detail dinding bongkahan: akar dan ranting mencuat dari fibrik dan hemik,
// kerikil di tanah mineral. Dipakai Modul Anatomi dan Modul Bara dengan benih acak
// yang sama, jadi letaknya pun sama pada kedua modul.

/** Salin mesh dari model glTF agar siap ditempatkan berulang (geometri & material dipakai bersama). */
function modelParts(root: THREE.Object3D) {
  const parts: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const clone = m.clone();
    clone.position.set(0, 0, 0);
    clone.castShadow = true;
    clone.receiveShadow = true;
    parts.push(clone);
  });
  return parts;
}

function maxSize(obj: THREE.Object3D) {
  const s = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
  return Math.max(s.x, s.y, s.z);
}

/** Susun detail dinding seluruh keliling bongkahan, dikelompokkan per lapisan. */
export function createWallDetails(branchScene: THREE.Object3D, stoneScene: THREE.Object3D) {
  const rand = seeded(5);
  const branchParts = modelParts(branchScene);
  const stoneParts = modelParts(stoneScene);
  const byLayer: Record<PeatLayerId, THREE.Object3D[]> = { fibrik: [], hemik: [], saprik: [], mineral: [] };

  const placeOnWall = (template: THREE.Mesh, size: number, theta: number, y: number, inset: number) => {
    const inner = template.clone();
    // Sejajarkan sumbu terpanjang model dengan sumbu x lokal, lalu pusatkan.
    const box = new THREE.Box3().setFromObject(inner);
    const dims = box.getSize(new THREE.Vector3());
    if (dims.z > dims.x) inner.rotation.y = Math.PI / 2;
    if (dims.y > Math.max(dims.x, dims.z)) inner.rotation.z = Math.PI / 2;
    inner.updateMatrixWorld(true);
    const center = new THREE.Box3().setFromObject(inner).getCenter(new THREE.Vector3());
    inner.position.sub(center);

    const obj = new THREE.Group();
    obj.add(inner);
    obj.scale.setScalar(size / Math.max(maxSize(template), 0.01));
    obj.position.copy(wallPoint(theta, y, inset));
    // Sumbu x lokal diarahkan keluar dari dinding, dengan sedikit kemiringan acak.
    obj.rotation.set((rand() - 0.5) * 0.5, -theta + (rand() - 0.5) * 0.7, (rand() - 0.5) * 0.6);
    return obj;
  };

  for (let i = 0; i < 11; i++) {
    const theta = rand() * Math.PI * 2;
    const deep = rand() < 0.35;
    const y = deep ? -0.7 - rand() * 0.6 : -0.08 - rand() * 0.42;
    const part = branchParts[Math.floor(rand() * branchParts.length)];
    byLayer[deep ? "hemik" : "fibrik"].push(placeOnWall(part, 0.4 + rand() * 0.35, theta, y, 0.06));
  }
  for (let i = 0; i < 16; i++) {
    const theta = rand() * Math.PI * 2;
    const y = -2.9 - rand() * 0.4;
    byLayer.mineral.push(placeOnWall(stoneParts[0], 0.07 + rand() * 0.1, theta, y, 0.03));
  }
  return byLayer;
}
