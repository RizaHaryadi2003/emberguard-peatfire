import * as THREE from "three";

// Penanda satwa di tajuk (babak 03): sosok tiga dimensi kecil di dahan,
// menggantikan stiker datar rancangan sebelumnya.
//
// Sosok ini sengaja bersahaja. Pada skala diorama, orangutan setinggi
// ±1,2 m di samping pohon 45 m hanya selebar satu dua piksel, jadi rupa
// aslinya ditunjukkan lewat foto di samping diorama, bukan di sini. Tugas
// sosok ini memberi tahu di tajuk mana satwa itu tinggal dan membedakan
// keduanya dari perawakannya:
//
//   - orangutan: badan besar berbentuk buah pir, bulu coklat karat yang
//     kusam, lengan jauh lebih panjang daripada kakinya;
//   - owa: badan ramping berbulu gelap, lingkar wajah pucat, lengan paling
//     panjang di antara kera, biasa bergelantung satu tangan.
//
// Ukurannya dalam satuan "tinggi badan" ≈ 1, lalu diperbesar oleh pemanggil.

export type ApeKind = "orangutan" | "owa";
/** Sikap tubuh: bergelantung dua tangan, satu tangan, atau duduk di dahan. */
export type ApePose = "hang2" | "hang1" | "sit";

const LOOK = {
  orangutan: {
    fur: "#6a2f15",
    furDark: "#47200e",
    skin: "#2c211c",
    bodyR: 0.27,
    bodyH: 0.62,
    head: 0.15,
    upperArm: 0.5,
    foreArm: 0.48,
    armR: 0.06,
    thigh: 0.28,
    shin: 0.26,
    legR: 0.065,
  },
  owa: {
    fur: "#2f2a26",
    furDark: "#1f1b18",
    skin: "#151210",
    bodyR: 0.15,
    bodyH: 0.48,
    head: 0.11,
    upperArm: 0.5,
    foreArm: 0.52,
    armR: 0.035,
    thigh: 0.24,
    shin: 0.22,
    legR: 0.038,
  },
} as const;

/** Batang meruncing dari titik a ke titik b. */
function limb(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, material: THREE.Material): THREE.Mesh {
  const len = a.distanceTo(b);
  const geo = new THREE.CylinderGeometry(r1, r0, len, 7, 1);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return mesh;
}

/** Sendi bulat supaya sambungan batang tidak terlihat patah. */
function joint(p: THREE.Vector3, r: number, material: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), material);
  m.position.copy(p);
  return m;
}

/** Lengan dua ruas dengan siku yang menekuk ke arah `bend`. */
function arm(shoulder: THREE.Vector3, hand: THREE.Vector3, upper: number, fore: number, r: number, bend: THREE.Vector3, fur: THREE.Material, skin: THREE.Material): THREE.Object3D[] {
  const reach = shoulder.distanceTo(hand);
  const total = upper + fore;
  // Bila jangkauan lebih pendek dari panjang lengan, siku keluar ke samping.
  const slack = Math.max(0, total - reach);
  const t = upper / total;
  const elbow = shoulder.clone().lerp(hand, t).addScaledVector(bend, Math.sqrt(slack * (upper + fore)) * 0.5);
  return [limb(shoulder, elbow, r * 1.15, r, fur), joint(elbow, r, fur), limb(elbow, hand, r, r * 0.8, fur), joint(hand, r * 1.1, skin)];
}

/** Badan berbentuk buah pir (diputar dari garis tepi). */
function body(radius: number, height: number, material: THREE.Material): THREE.Mesh {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    // Lebar di bawah (perut), menyempit ke bahu.
    const r = radius * Math.sin(Math.PI * t) * (0.72 + 0.38 * (1 - t));
    pts.push(new THREE.Vector2(Math.max(0.001, r), -height / 2 + height * t));
  }
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 12), material);
  m.scale.z = 0.8;
  return m;
}

/**
 * Bangun satu sosok. Titik asal ada di dahan tempat ia berpegangan atau
 * duduk; dahannya ikut dibuat, condong sedikit seperti dahan sungguhan.
 */
export function buildApe(kind: ApeKind, pose: ApePose): THREE.Group {
  const L = LOOK[kind];
  const fur = new THREE.MeshStandardMaterial({ color: L.fur, roughness: 1 });
  const furDark = new THREE.MeshStandardMaterial({ color: L.furDark, roughness: 1 });
  const skin = new THREE.MeshStandardMaterial({ color: L.skin, roughness: 0.75 });
  const g = new THREE.Group();

  const bark = new THREE.MeshStandardMaterial({ color: "#3f3226", roughness: 1 });
  const branch = limb(new THREE.Vector3(-0.75, -0.2, -0.05), new THREE.Vector3(0.7, 0.16, 0.05), 0.07, 0.025, bark);
  g.add(branch);

  const up = new THREE.Vector3(0, 1, 0);
  const out = (s: number) => new THREE.Vector3(s, 0, 0.3).normalize();
  let shoulderY: number;
  const bodyMesh = body(L.bodyR, L.bodyH, fur);

  if (pose === "sit") {
    // Duduk di atas dahan: badan tegak di atas dahan, lengan bertumpu.
    bodyMesh.position.set(0, L.bodyH / 2 + 0.04, 0);
    shoulderY = L.bodyH * 0.9;
    for (const s of [-1, 1]) {
      const sh = new THREE.Vector3(s * L.bodyR * 0.8, shoulderY, 0);
      g.add(...arm(sh, new THREE.Vector3(s * (L.bodyR + 0.22), 0.02, 0.06), L.upperArm, L.foreArm, L.armR, out(s), fur, skin));
      const hip = new THREE.Vector3(s * L.bodyR * 0.5, 0.1, 0.05);
      const knee = new THREE.Vector3(s * L.bodyR * 0.85, 0.08, L.thigh);
      const foot = new THREE.Vector3(s * L.bodyR * 0.7, -L.shin * 0.9, L.thigh * 0.8);
      g.add(limb(hip, knee, L.legR * 1.1, L.legR, fur), joint(knee, L.legR, fur), limb(knee, foot, L.legR, L.legR * 0.8, fur));
    }
  } else {
    // Bergelantung: badan di bawah dahan, satu atau dua lengan ke atas.
    shoulderY = -(L.upperArm + L.foreArm) * (pose === "hang2" ? 0.82 : 0.95);
    bodyMesh.position.set(0, shoulderY - L.bodyH * 0.42, 0);
    bodyMesh.rotation.z = pose === "hang1" ? 0.12 : 0;
    const shL = new THREE.Vector3(-L.bodyR * 0.75, shoulderY, 0);
    const shR = new THREE.Vector3(L.bodyR * 0.75, shoulderY, 0);
    g.add(...arm(shR, new THREE.Vector3(0.14, 0.01, 0), L.upperArm, L.foreArm, L.armR, out(1), fur, skin));
    if (pose === "hang2") {
      g.add(...arm(shL, new THREE.Vector3(-0.3, -0.03, 0), L.upperArm, L.foreArm, L.armR, out(-1), fur, skin));
    } else {
      // Tangan kedua terjulur ke samping-bawah, siap meraih dahan berikutnya.
      g.add(...arm(shL, shL.clone().add(new THREE.Vector3(-0.7, -0.35, 0.1)), L.upperArm, L.foreArm, L.armR, up, fur, skin));
    }
    const hipY = bodyMesh.position.y - L.bodyH * 0.45;
    for (const s of [-1, 1]) {
      const hip = new THREE.Vector3(s * L.bodyR * 0.45, hipY, 0);
      const knee = new THREE.Vector3(s * L.bodyR * 0.8, hipY - L.thigh * 0.6, L.thigh * 0.6);
      const foot = new THREE.Vector3(s * L.bodyR * 0.55, hipY - L.thigh * 0.6 - L.shin * 0.8, L.thigh * 0.25);
      g.add(limb(hip, knee, L.legR * 1.1, L.legR, fur), joint(knee, L.legR, fur), limb(knee, foot, L.legR, L.legR * 0.8, fur));
    }
  }
  g.add(bodyMesh);

  // Kepala di antara bahu, condong ke depan.
  const head = new THREE.Mesh(new THREE.SphereGeometry(L.head, 12, 10), furDark);
  head.position.set(0, shoulderY + L.head * 0.55, L.head * 0.35);
  g.add(head);
  const face = new THREE.Mesh(new THREE.SphereGeometry(L.head * 0.7, 10, 8), skin);
  face.scale.set(1, 1, 0.6);
  face.position.copy(head.position).add(new THREE.Vector3(0, -L.head * 0.1, L.head * 0.6));
  g.add(face);
  if (kind === "owa") {
    // Lingkar wajah pucat, ciri owa janggut-putih Kalimantan.
    const ring = new THREE.Mesh(new THREE.TorusGeometry(L.head * 0.72, L.head * 0.14, 6, 16), new THREE.MeshStandardMaterial({ color: "#b9ad9c", roughness: 1 }));
    ring.position.copy(face.position).add(new THREE.Vector3(0, 0, 0.01));
    g.add(ring);
  } else {
    // Bantalan pipi orangutan jantan dewasa.
    for (const s of [-1, 1]) {
      const pad = new THREE.Mesh(new THREE.SphereGeometry(L.head * 0.6, 8, 6), skin);
      pad.scale.set(0.45, 1.05, 0.5);
      pad.position.copy(head.position).add(new THREE.Vector3(s * L.head * 0.98, -L.head * 0.05, L.head * 0.3));
      g.add(pad);
    }
  }
  return g;
}

/** Lepaskan geometri dan bahan sosok. */
export function disposeApe(g: THREE.Group): void {
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry.dispose();
    (m.material as THREE.Material).dispose();
  });
}
