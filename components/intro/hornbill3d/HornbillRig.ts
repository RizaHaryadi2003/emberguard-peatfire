import * as THREE from "three";
import { featherGeometry, panelGeometry } from "./feathers";
import { headGeometry } from "./head";

// Rangkong badak 3D berwarna hitam pekat (tanpa cahaya), jadi dari sudut mana
// pun tampil sebagai siluet. Koordinat badan: x ke depan, y ke atas, z ke
// sayap kanan; satuan sama dengan gambar profil (badan ±190 satuan).
//
// Sayap tersusun seperti tulang burung: bahu → siku → pergelangan, dengan
// bulu tersier, sekunder, dan primer satu per satu. Tiap bingkai, `pose()`
// mengatur kepakan, lipatan siku/pergelangan, renggangan bulu primer, lentur
// ujung bulu, kipas ekor, dan ayunan badan, semuanya dari fase kepakan dan
// sikap terbang, sehingga setiap bagian ikut bergerak halus.

const BLACK = new THREE.MeshBasicMaterial({ color: 0x0a0a0a, side: THREE.DoubleSide });

/** Panjang tulang sayap (satuan model). */
const HUMERUS = 36;
const FOREARM = 50;
const HAND = 30;

/** Bulu primer: [panjang, lebar, sudut dari arah bentang (derajat, ke belakang positif)]. */
const PRIMARIES: [number, number, number][] = [
  [64, 15, 62],
  [72, 15, 50],
  [80, 14, 38],
  [86, 13, 27],
  [88, 12, 17],
  [84, 11, 8],
  [72, 10, 0],
];
/** Bulu sekunder sepanjang lengan bawah dan tersier di lengan atas. */
const SECONDARY_COUNT = 10;
const TERTIAL_COUNT = 4;
/** Bulu ekor (setengah kipas di tiap sisi, ditambah satu tengah). */
const TAIL_HALF = 5;

const mesh = (g: THREE.BufferGeometry) => new THREE.Mesh(g, BLACK);

type Wing = {
  side: number;
  root: THREE.Group;
  elbow: THREE.Group;
  wrist: THREE.Group;
  primaries: { pivot: THREE.Group; bend: THREE.Group; base: number }[];
  secondaries: THREE.Group[];
};

export type HornbillMotion = {
  /** Fase kepakan (radian); cos = 1 di puncak angkatan sayap. */
  phase: number;
  /** Sudut bahu (radian, 0 = sayap datar, positif = terangkat). */
  wing: number;
  /** 0 = mengepak penuh, 1 = meluncur (sayap terbentang, kepakan kecil). */
  glide: number;
  /** Miring badan dan laju belok (untuk ekor sebagai kemudi). */
  roll: number;
  yawRate: number;
  pitch: number;
};

export class HornbillRig {
  readonly group = new THREE.Group();
  private body = new THREE.Group();
  private neck = new THREE.Group();
  private tail = new THREE.Group();
  private tailFeathers: { pivot: THREE.Group; feather: THREE.Mesh; side: number }[] = [];
  private wings: Wing[] = [];

  constructor() {
    this.group.add(this.body);
    this.buildTorso();
    this.buildTail();
    for (const side of [1, -1]) this.wings.push(this.buildWing(side));
  }

  /** Badan berbentuk gelendong (lathe), leher, dan kepala dengan paruh-balung. */
  private buildTorso() {
    // Profil jari-jari sepanjang sumbu badan (pangkal ekor → dada).
    const profile = [
      [0, -72],
      [8, -66],
      [16, -52],
      [23, -34],
      [26, -14],
      [27, 6],
      [25, 26],
      [20, 42],
      [12, 54],
      [0, 60],
    ].map(([r, a]) => new THREE.Vector2(r, a));
    const torso = new THREE.LatheGeometry(profile, 24);
    torso.rotateZ(-Math.PI / 2); // sumbu bubut (y) → sumbu badan (x)
    torso.scale(1, 0.92, 0.82); // sedikit lebih pipih ke samping
    torso.translate(0, 4, 0);
    this.body.add(mesh(torso));

    // Leher: tabung melengkung dari dada ke tengkuk.
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(40, 12, 0),
      new THREE.Vector3(62, 24, 0),
      new THREE.Vector3(80, 36, 0),
      new THREE.Vector3(90, 42, 0),
    ]);
    const neckTube = new THREE.TubeGeometry(curve, 16, 15, 12, false);
    // Pangkal leher menyatu ke dada.
    const chest = new THREE.SphereGeometry(19, 16, 12);
    chest.translate(44, 14, 0);
    this.neck.add(mesh(chest));
    this.neck.add(mesh(neckTube));
    const skull = new THREE.SphereGeometry(15, 18, 14);
    skull.translate(93, 45, 0);
    this.neck.add(mesh(skull));
    this.neck.add(mesh(headGeometry()));
    // Leher berporos di pangkalnya, agar kepala bisa diredam terhadap ayunan badan.
    this.neck.position.set(0, 0, 0);
    this.body.add(this.neck);
  }

  /** Ekor: kipas bulu panjang yang bisa melebar, menekuk, dan menjadi kemudi. */
  private buildTail() {
    this.tail.position.set(-60, 4, 0);
    const g = featherGeometry(104, 19, 0.9);
    for (let i = -TAIL_HALF; i <= TAIL_HALF; i++) {
      const pivot = new THREE.Group();
      const m = mesh(g);
      m.rotation.y = Math.PI; // menunjuk ke belakang (−x)
      // Bulu luar sedikit lebih rendah; kemiringannya diatur di pose(): saat
      // terbang lurus ekor terlipat bertumpuk (tebal dilihat dari samping),
      // saat berbelok mengembang datar seperti kipas.
      m.position.y = -Math.abs(i) * 1.4;
      pivot.add(m);
      this.tail.add(pivot);
      this.tailFeathers.push({ pivot, feather: m, side: i / TAIL_HALF });
    }
    this.body.add(this.tail);
  }

  /** Satu sayap (side = 1 kanan/+z, −1 kiri/−z). */
  private buildWing(side: number): Wing {
    const root = new THREE.Group();
    root.position.set(12, 24, 8 * side);
    root.scale.z = side; // sayap kiri = cermin sayap kanan
    this.body.add(root);

    // Lengan atas: lempeng penutup + bulu tersier.
    root.add(mesh(panelGeometry(HUMERUS, 9, 30)));
    for (let i = 0; i < TERTIAL_COUNT; i++) {
      const f = mesh(featherGeometry(46 - i * 2, 13, 0.8));
      f.position.set(-10, 0.2 * i, 6 + i * 8);
      f.rotation.y = -(Math.PI / 2 + ((100 - i * 3) * Math.PI) / 180);
      root.add(f);
    }

    const elbow = new THREE.Group();
    elbow.position.z = HUMERUS;
    root.add(elbow);
    elbow.add(mesh(panelGeometry(FOREARM, 8, 26, 0.75)));
    const secondaries: THREE.Group[] = [];
    for (let i = 0; i < SECONDARY_COUNT; i++) {
      const pivot = new THREE.Group();
      pivot.position.set(-6, 0.3, 2 + (i * FOREARM) / SECONDARY_COUNT);
      const f = mesh(featherGeometry(52 - i * 0.6, 14, 0.85));
      // Bulu sekunder menunjuk ke belakang, sedikit condong ke luar di ujung lengan.
      pivot.rotation.y = -(Math.PI / 2 + ((96 - i * 2.2) * Math.PI) / 180);
      pivot.add(f);
      elbow.add(pivot);
      secondaries.push(pivot);
    }

    const wrist = new THREE.Group();
    wrist.position.z = FOREARM;
    elbow.add(wrist);
    wrist.add(mesh(panelGeometry(HAND, 6, 18, 0.7)));
    const primaries = PRIMARIES.map(([len, width, angle], i) => {
      const pivot = new THREE.Group();
      pivot.position.set(-2 - i * 0.3, 0.4 * i, 2 + (i * HAND) / PRIMARIES.length);
      const bend = new THREE.Group();
      const f = mesh(featherGeometry(len, width, 0.25, i >= 3 ? 0.8 : 0.3));
      bend.add(f);
      pivot.add(bend);
      wrist.add(pivot);
      return { pivot, bend, base: (angle * Math.PI) / 180 };
    });

    return { side, root, elbow, wrist, primaries, secondaries };
  }

  /** Mengatur semua bagian untuk satu bingkai. */
  pose(m: HornbillMotion) {
    const s = Math.sin(m.phase);
    const c = Math.cos(m.phase);
    const flap = 1 - m.glide;

    // Badan sedikit mendongak seperti burung terbang, naik-turun berlawanan
    // dengan sayap; kepala diredam (tetap tenang).
    this.body.rotation.z = 0.12;
    this.body.position.y = 2.2 * flap * s;
    this.neck.rotation.z = -0.04 * flap * s - m.pitch * 0.25;

    for (const w of this.wings) {
      // Bahu: angkat/turun sayap; sedikit menyapu ke depan saat turun. Sayap kiri
      // adalah cermin (skala z −1), jadi putaran bahunya dibalik tandanya.
      w.root.rotation.x = -m.wing * w.side;
      w.root.rotation.y = (-0.12 + 0.1 * flap * s) * w.side;
      // Puntiran sayap (sudut serang): tepi depan sedikit naik, lebih besar saat
      // mengayun turun. Membuat permukaan sayap tetap terlihat dari depan/belakang.
      w.root.rotation.z = 0.22 + 0.12 * flap * s;
      // Siku dan pergelangan melipat saat sayap naik (sin < 0), terbuka saat turun.
      const up = flap * Math.max(0, -s);
      w.elbow.rotation.y = -(0.18 + 0.55 * up);
      w.elbow.rotation.x = 0.1 * flap * c;
      w.wrist.rotation.y = -(0.1 + 0.7 * up);
      w.wrist.rotation.x = -0.12 * flap * c + 0.06;
      // Bulu primer: merenggang saat turun, merapat saat naik; ujung melentur dengan jeda.
      const spread = 0.6 + 0.4 * (flap * Math.max(0, s) + m.glide);
      w.primaries.forEach((p, i) => {
        const angle = p.base * spread;
        // Sudut diukur dari arah bentang (+z) memutar ke belakang (−x).
        p.pivot.rotation.y = -(Math.PI / 2 + angle);
        p.bend.rotation.z = (0.22 * flap * Math.sin(m.phase + 0.7 + i * 0.12) + 0.05) * (0.6 + i * 0.07);
        p.bend.rotation.x = 0.08 * flap * Math.sin(m.phase + 0.4 + i * 0.1);
      });
      // Bulu sekunder ikut melentur sedikit di belakang kepakan.
      w.secondaries.forEach((p, i) => {
        p.rotation.z = 0.1 * flap * Math.sin(m.phase + 0.9 + i * 0.05);
      });
    }

    // Ekor: melebar saat berbelok atau meluncur, menekuk melawan angguk, menjadi kemudi.
    const turn = Math.min(1, Math.abs(m.yawRate) / 1.6);
    const open = Math.min(1, turn + 0.6 * m.glide);
    const fan = 0.05 + 0.3 * open;
    const fold = 1.15 * (1 - open) + 0.25;
    this.tail.rotation.z = -m.pitch * 0.5 + 0.04 * flap * Math.sin(m.phase + 1.4);
    this.tail.rotation.x = Math.max(-0.35, Math.min(0.35, m.roll * 0.25));
    this.tail.rotation.y = Math.max(-0.25, Math.min(0.25, -m.yawRate * 0.08));
    for (const f of this.tailFeathers) {
      f.pivot.rotation.y = f.side * fan;
      f.feather.rotation.x = f.side * fold;
    }
  }
}
