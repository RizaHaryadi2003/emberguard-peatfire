"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, useTexture } from "@react-three/drei";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CANAL_Y, CASE_IGNITION, GRID_H, GRID_W, isCanal, landAt, type Land } from "@/lib/model/ignition";
import { CASE_FIRE, FORENSIK_TEXT, LAND_LABEL, type InspectPart } from "@/config/modul/forensik-api";
import type { SceneState } from "@/components/modul/anatomi/scene/sceneState";
import { createEmberTexture, createSmokeTexture, createSparkTexture } from "@/components/modul/shared/scene/proceduralTextures";
import { PEAT_LAYER_TINT, type Quality } from "@/components/modul/shared/scene/dioramaConstants";
import { burnsAt, cellIndex, fireAt, type CellFire } from "../fireView";
import type { BurnAnim, MapPicker } from "./ForensikScene";

// Babak 02 dan 03: lanskap gambut dari atas, satu kotak = 1 km², sebesar
// satu titik api satelit. Tata letaknya dari lib/model/ignition.ts
// (ilustratif). Yang digambar dibuat alami: tepi bongkahan melengkung tak
// beraturan, batas lahan berkelok, sungai berliku, pohon tersebar acak.
// Hanya api yang tetap mengikuti kotak model, karena satelit memang melihat
// api per kotak; tepinya dilembutkan sehingga kotak yang bersebelahan
// menyatu menjadi satu bercak terbakar.

/** Sisi satu kotak di adegan (m). Peta 24 × 16 kotak menjadi 6 × 4 m. */
const S = 0.25;

/** Tinggi permukaan tanah, dasar sungai, dasar kanal, dan permukaan air (m). */
const GROUND = 0.1;
const RIVER_BED = 0.03;
const CANAL_BED = 0.055;
const WATER_TOP = 0.075;

/** Sudut hadap awal: miring tiga perempat, supaya dua dinding bongkahan terlihat. */
const BASE_YAW = -0.32;

/** Setengah lebar dan setengah dalam bongkahan (m). */
const HALF_W = (GRID_W * S) / 2;
const HALF_D = (GRID_H * S) / 2;

/** Pangkat superelips tepi bongkahan: makin besar makin persegi; 5 = sudut membulat lebar. */
const OUTLINE_POWER = 5;

/** Warna dasar tiap jenis lahan (dikalikan tekstur gambut kering). */
const LAND_COLOR: Record<Land, THREE.Color> = {
  terbuka: new THREE.Color("#e3c98f"),
  kebun: new THREE.Color("#a5c063"),
  hutan: new THREE.Color("#4b7a3c"),
  kampung: new THREE.Color("#cdbfa6"),
  sungai: new THREE.Color("#6b5640"),
};

/** Jumlah gumpal asap dan lidah api di atas kotak yang panas, menurut mutu grafis. */
const SMOKE = { high: 40, low: 16 } as const;
const FLAMES = { high: 48, low: 20 } as const;

/** Jarak antartitik sebar pohon (m): makin kecil makin rapat. */
const TREE_STEP = { high: 0.07, low: 0.095 } as const;

const TREE_GREENS = ["#2f6b34", "#3b7c3a", "#285c2e", "#4a8640", "#336f3c", "#56904a"];
const PALM_GREENS = ["#86a845", "#7a9c3e", "#93b450"];
const ROOF_COLORS = ["#8c4a30", "#8f969c", "#6d7f8a", "#9a5a36"];

/** Warna hiasan yang sudah terbakar. */
const BURNT = new THREE.Color("#1f1a17");

/**
 * Lapisan dinding bongkahan, dari atas ke bawah: tebalnya di adegan (m).
 * Hanya rupa, supaya peta terbaca sebagai sepotong lahan gambut yang sama
 * dengan petak babak 01 — bukan skala kedalaman sungguhan (peta ini 24 km).
 */
const WALL_LAYERS: { id: "fibrik" | "hemik" | "saprik" | "mineral"; h: number }[] = [
  { id: "fibrik", h: 0.3 },
  { id: "hemik", h: 0.4 },
  { id: "saprik", h: 0.45 },
  { id: "mineral", h: 0.3 },
];

/** Letak label tiap bagian peta (petak, boleh pecahan). */
const LABELS: { part: InspectPart; x: number; y: number }[] = [
  { part: "sungai", x: 1, y: 2.5 },
  { part: "kampung", x: 2.6, y: 7.5 },
  { part: "kebun", x: 5, y: 13 },
  { part: "terbuka", x: 7, y: 9 },
  { part: "kanal", x: 7, y: 5 },
  { part: "hutan", x: 19.5, y: 11 },
];

/* ============================================================================
 *  BENTUK LANSKAP (fungsi murni koordinat lokal x, z dalam meter)
 * ========================================================================== */

/** Titik tengah petak (x, y) di adegan. Baris 0 di belakang, baris terakhir di depan. */
export function cellCenter(x: number, y: number): [number, number] {
  return [(x - (GRID_W - 1) / 2) * S, (y - (GRID_H - 1) / 2) * S];
}

/** Petak tempat titik lokal (x, z) berada, dijepit ke dalam peta. */
function cellAtLocal(x: number, z: number): { x: number; y: number } {
  return {
    x: Math.min(GRID_W - 1, Math.max(0, Math.floor(x / S + GRID_W / 2))),
    y: Math.min(GRID_H - 1, Math.max(0, Math.floor(z / S + GRID_H / 2))),
  };
}

/** Bilangan semu 0–1 yang tetap untuk masukan yang sama. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Derau nilai 2D yang halus (−1…1). */
function noise(x: number, z: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const fx = x - xi;
  const fz = z - zi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  const h = (a: number, b: number) => hash(a * 57.3 + b * 311.9) * 2 - 1;
  const a = h(xi, zi) + (h(xi + 1, zi) - h(xi, zi)) * u;
  const b = h(xi, zi + 1) + (h(xi + 1, zi + 1) - h(xi, zi + 1)) * u;
  return a + (b - a) * v;
}

/** Jari-jari tepi bongkahan pada sudut θ: superelips yang sedikit bergelombang. */
function outlineRadius(theta: number): number {
  const c = Math.abs(Math.cos(theta)) / HALF_W;
  const s = Math.abs(Math.sin(theta)) / HALF_D;
  const base = Math.pow(Math.pow(c, OUTLINE_POWER) + Math.pow(s, OUTLINE_POWER), -1 / OUTLINE_POWER);
  return base * (1 + 0.012 * Math.sin(theta * 7 + 0.6) + 0.008 * Math.sin(theta * 17 + 2.1));
}

/** Titik (x, z) yang dijepit ke dalam tepi bongkahan. */
function clampToOutline(x: number, z: number): [number, number] {
  const r = Math.hypot(x, z);
  const R = outlineRadius(Math.atan2(z, x));
  return r > R ? [(x / r) * R, (z / r) * R] : [x, z];
}

/** Garis tengah sungai yang berliku (x sebagai fungsi z). */
function riverX(z: number): number {
  const [x0] = cellCenter(1, 0);
  return x0 + 0.09 * Math.sin(z * 2.2 + 0.5) + 0.04 * Math.sin(z * 5.7);
}

/** Setengah lebar sungai (m), sedikit melebar dan menyempit. */
function riverHalf(z: number): number {
  return 0.085 + 0.02 * Math.sin(z * 3.1 + 1);
}

/** Kanal: lurus di baris kanal, dari sungai sampai ujungnya di lahan terbuka. */
const [CANAL_END_X, CANAL_Z] = cellCenter(17, CANAL_Y);
const CANAL_HALF = 0.03;

function canalDepth(x: number, z: number): number {
  if (x > CANAL_END_X + S * 0.4 || x < riverX(z)) return 0;
  const d = Math.abs(z - CANAL_Z);
  return d < CANAL_HALF ? 1 - (d / CANAL_HALF) ** 4 : 0;
}

/**
 * Jenis lahan yang TERLIHAT di titik (x, z). Batas kotak model digeser
 * dengan derau, sehingga tepi hutan, kebun, dan kampung berkelok alami.
 * Kolom sungai pada model diganti sungai berliku; di luar alurnya tanah biasa.
 */
function landNatural(x: number, z: number): Land {
  const wx = x + 0.13 * noise(x * 3.1, z * 3.1) + 0.05 * noise(x * 9, z * 9);
  const wz = z + 0.13 * noise(x * 3.1 + 40, z * 3.1 + 40) + 0.05 * noise(x * 9 + 40, z * 9 + 40);
  const c = cellAtLocal(wx, wz);
  const land = landAt(c.x, c.y);
  return land === "sungai" ? "terbuka" : land;
}

/** Bagian peta di titik lokal (x, z), untuk klik pembaca. */
export function partAtLocal(x: number, z: number): InspectPart {
  if (Math.abs(x - riverX(z)) < riverHalf(z) + 0.04) return "sungai";
  if (canalDepth(x, z) > 0 || (Math.abs(z - CANAL_Z) < 0.06 && x < CANAL_END_X && x > riverX(z))) return "kanal";
  return landNatural(x, z);
}

/** Tinggi permukaan tanah di (x, z): sedikit bergelombang, dengan alur sungai dan kanal. */
function groundHeight(x: number, z: number): number {
  let h = GROUND + 0.006 * noise(x * 4, z * 4) + 0.003 * noise(x * 13, z * 13);
  const dr = Math.abs(x - riverX(z)) / riverHalf(z);
  if (dr < 1.6) {
    const k = dr < 1 ? 1 : 1 - (dr - 1) / 0.6;
    const smooth = k * k * (3 - 2 * k);
    h = h + (RIVER_BED - h) * smooth;
  }
  const c = canalDepth(x, z);
  if (c > 0) h = h + (CANAL_BED - h) * c;
  return h;
}

/* ============================================================================
 *  GEOMETRI
 * ========================================================================== */

/** Permukaan tanah: satu kisi menyambung, dijepit ke tepi bongkahan, berwarna per lahan. */
function createGround(segW: number, segD: number): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(HALF_W * 2, HALF_D * 2, segW, segD);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const [x, z] = clampToOutline(pos.getX(i), pos.getZ(i));
    const y = groundHeight(x, z);
    pos.setXYZ(i, x, y, z);
    uv.setXY(i, x / 1.2, z / 1.2);
    // Warna lahan dirata-rata dari beberapa titik di sekitarnya: peralihan
    // antarlahan menjadi lembut, bukan garis tajam.
    c.setRGB(0, 0, 0);
    for (const [ox, oz] of [
      [0, 0],
      [0.035, 0],
      [-0.035, 0],
      [0, 0.035],
      [0, -0.035],
    ])
      c.add(tmp.copy(LAND_COLOR[landNatural(x + ox, z + oz)]));
    c.multiplyScalar(1 / 5);
    // Tepi sungai dan kanal: lumpur basah yang lebih gelap.
    const bank = Math.max(0, 1 - Math.abs(x - riverX(z)) / (riverHalf(z) * 1.9));
    if (bank > 0) c.lerp(LAND_COLOR.sungai, bank);
    c.multiplyScalar(0.92 + 0.16 * (noise(x * 6, z * 6) * 0.5 + 0.5));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

/** Permukaan air: satu bidang datar setinggi air; hanya terlihat di alur yang lebih rendah. */
function createWater(): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(HALF_W * 2, HALF_D * 2, 48, 32);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const [x, z] = clampToOutline(pos.getX(i), pos.getZ(i));
    pos.setXYZ(i, x * 0.998, WATER_TOP, z * 0.998);
  }
  return geo;
}

/** Jumlah titik keliling tepi bongkahan. */
const RIM = 280;

/**
 * Batas atas dan bawah lapisan ke-`i` di sudut θ (m). Batas antarlapisan
 * bergelombang seperti bongkahan Modul Anatomi; batas teratas mengikuti
 * permukaan tanah, sehingga alur sungai juga terpotong di dinding.
 */
function layerBounds(i: number, theta: number, groundY: number): [number, number] {
  const wave = (k: number) => (k === 0 ? 0 : 0.035 * Math.sin(theta * (3 + k) + k * 1.7) + 0.02 * Math.sin(theta * (9 + 2 * k) + k));
  let top = 0;
  for (let k = 0; k < i; k++) top -= WALL_LAYERS[k].h;
  const bottom = top - WALL_LAYERS[i].h;
  const last = i === WALL_LAYERS.length - 1;
  return [i === 0 ? groundY : top + wave(i), last ? bottom - 0.04 * Math.sin(theta * 5) : bottom + wave(i + 1)];
}

/** Dinding satu lapisan: pita mengelilingi tepi, sedikit menyempit ke bawah. */
function createWallLayer(i: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  let arc = 0;
  let prev: [number, number] | null = null;
  for (let j = 0; j <= RIM; j++) {
    const theta = (j / RIM) * Math.PI * 2;
    const R = outlineRadius(theta);
    const x = Math.cos(theta) * R;
    const z = Math.sin(theta) * R;
    if (prev) arc += Math.hypot(x - prev[0], z - prev[1]);
    prev = [x, z];
    const [top, bottom] = layerBounds(i, theta, groundHeight(x * 0.999, z * 0.999));
    // Dinding sedikit menyempit ke bawah, supaya bongkahan tidak tampak seperti kotak cetakan.
    const taper = (y: number) => 1 + 0.025 * y;
    pos.push(x * taper(top), top, z * taper(top), x * taper(bottom), bottom, z * taper(bottom));
    uv.push(arc / 1.1, top / 1.1, arc / 1.1, bottom / 1.1);
    if (j < RIM) {
      const a = j * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Tekstur bercak bertepi lembut dan tak rata: dipakai untuk api, bekas
 * terbakar, dan sorotan. Sedikit lebih besar dari satu kotak, sehingga kotak
 * yang bersebelahan menyatu tanpa garis.
 */
function createBlobTexture(size = 128): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  for (let py = 0; py < size; py++)
    for (let px = 0; px < size; px++) {
      const u = (px / (size - 1)) * 2 - 1;
      const v = (py / (size - 1)) * 2 - 1;
      const d = Math.pow(Math.pow(Math.abs(u), 3) + Math.pow(Math.abs(v), 3), 1 / 3);
      const n = noise(px * 0.09, py * 0.09) * 0.12 + noise(px * 0.3, py * 0.3) * 0.05;
      const k = Math.min(1, Math.max(0, (1 - (d + n)) / 0.3));
      const a = k * k * (3 - 2 * k);
      const o = (py * size + px) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
      img.data[o + 3] = Math.round(a * 255);
    }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Pelepah sawit: tujuh daun pipih yang memancar dan merunduk. */
function createPalmGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const g = new THREE.BoxGeometry(0.05, 0.003, 0.011);
    g.translate(0.025, 0, 0);
    g.rotateZ(-0.38);
    g.rotateY((i / 7) * Math.PI * 2);
    parts.push(g);
  }
  const merged = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  return merged;
}

/* ============================================================================
 *  HIASAN: pohon, sawit, rumah, semak — disebar alami di atas lahannya
 * ========================================================================== */

type Deco = { x: number; y: number; z: number; sx: number; sy: number; sz: number; rot: number; cell: number; color: THREE.Color };

function buildDecor(step: number) {
  const trunks: Deco[] = [];
  const crowns: Deco[] = [];
  const palms: Deco[] = [];
  const palmTrunks: Deco[] = [];
  const houses: Deco[] = [];
  const shrubs: Deco[] = [];
  const cellOfPoint = (x: number, z: number) => {
    const c = cellAtLocal(x, z);
    return cellIndex(c.x, c.y);
  };
  const inside = (x: number, z: number, margin: number) => Math.hypot(x, z) < outlineRadius(Math.atan2(z, x)) - margin;
  const nearWater = (x: number, z: number) => Math.abs(x - riverX(z)) < riverHalf(z) * 1.6 || canalDepth(x, z) > 0 || Math.abs(z - CANAL_Z) < 0.05;

  const addTree = (x: number, z: number, scale: number, k: number) => {
    const y = groundHeight(x, z);
    const cell = cellOfPoint(x, z);
    const r = (0.04 + hash(k + 2) * 0.025) * scale;
    const trunkH = (0.045 + hash(k + 3) * 0.03) * scale;
    const color = new THREE.Color(TREE_GREENS[Math.floor(hash(k + 4) * TREE_GREENS.length)]).multiplyScalar(0.88 + hash(k + 5) * 0.24);
    trunks.push({ x, y, z, sx: scale, sy: trunkH, sz: scale, rot: 0, cell, color: new THREE.Color("#4a3426") });
    crowns.push({ x, y: y + trunkH + r * 0.5, z, sx: r, sy: r * 0.8, sz: r * (0.9 + hash(k + 6) * 0.2), rot: hash(k + 7) * 6.28, cell, color });
    crowns.push({
      x: x + (hash(k + 8) - 0.5) * r * 0.6,
      y: y + trunkH + r * 1.1,
      z: z + (hash(k + 9) - 0.5) * r * 0.6,
      sx: r * 0.66,
      sy: r * 0.58,
      sz: r * 0.66,
      rot: hash(k + 10) * 6.28,
      cell,
      color: color.clone().multiplyScalar(1.15),
    });
  };

  // Sebaran acak berkisi: tiap titik kisi digeser acak, jadi tidak berbaris.
  let k = 0;
  for (let z = -HALF_D; z <= HALF_D; z += step)
    for (let x = -HALF_W; x <= HALF_W; x += step) {
      k += 1;
      const px = x + (hash(k * 1.7) - 0.5) * step * 0.9;
      const pz = z + (hash(k * 2.3) - 0.5) * step * 0.9;
      if (!inside(px, pz, 0.05) || nearWater(px, pz)) continue;
      const land = landNatural(px, pz);
      const roll = hash(k * 3.1);
      if (land === "hutan") {
        if (roll < 0.92) addTree(px, pz, hash(k * 4.9) > 0.9 ? 1.35 : 0.9 + hash(k * 5.3) * 0.25, k * 11);
      } else if (land === "terbuka") {
        // Lahan terbuka: semak jarang, sesekali pohon sisa yang berdiri sendiri.
        if (roll < 0.022) addTree(px, pz, 0.75, k * 11);
        else if (roll < 0.3) {
          const r = 0.015 + hash(k * 6.1) * 0.017;
          shrubs.push({
            x: px,
            y: groundHeight(px, pz) + r * 0.3,
            z: pz,
            sx: r,
            sy: r * 0.6,
            sz: r * 1.2,
            rot: hash(k * 6.7) * 6.28,
            cell: cellOfPoint(px, pz),
            color: new THREE.Color(roll < 0.15 ? "#7f7d3e" : "#6a7038"),
          });
        }
      } else if (land === "kampung") {
        if (roll < 0.35) addTree(px, pz, 0.7, k * 11);
      }
    }

  // Sawit: ditanam berbaris (memang begitu di kebun), tetapi barisnya ikut tepi kebun yang berkelok.
  const palmStep = 0.062;
  let j = 0;
  for (let z = -HALF_D; z <= HALF_D; z += palmStep)
    for (let x = -HALF_W; x <= HALF_W; x += palmStep) {
      j += 1;
      const px = x + ((Math.round(z / palmStep) % 2) * palmStep) / 2;
      if (!inside(px, z, 0.05) || nearWater(px, z) || landNatural(px, z) !== "kebun") continue;
      const y = groundHeight(px, z);
      const cell = cellOfPoint(px, z);
      const trunkH = 0.03 + hash(j * 1.3) * 0.012;
      palmTrunks.push({ x: px, y, z, sx: 0.8, sy: trunkH, sz: 0.8, rot: 0, cell, color: new THREE.Color("#5a4632") });
      palms.push({
        x: px,
        y: y + trunkH,
        z,
        sx: 1,
        sy: 1,
        sz: 1,
        rot: hash(j * 2.9) * 6.28,
        cell,
        color: new THREE.Color(PALM_GREENS[Math.floor(hash(j * 3.7) * PALM_GREENS.length)]),
      });
    }

  // Rumah kampung: berjajar di tepi sungai, menghadap air.
  for (let i = 0; i < 16; i++) {
    const [, zTop] = cellCenter(0, 5.6);
    const z = zTop + i * 0.075 + (hash(i * 4.1) - 0.5) * 0.03;
    const x = riverX(z) + riverHalf(z) + 0.06 + hash(i * 5.7) * 0.12;
    if (landNatural(x, z) === "kebun") continue;
    houses.push({
      x,
      y: groundHeight(x, z),
      z,
      sx: 1,
      sy: 1,
      sz: 1,
      rot: 0.2 + (hash(i * 6.3) - 0.5) * 0.6,
      cell: cellOfPoint(x, z),
      color: new THREE.Color(ROOF_COLORS[Math.floor(hash(i * 7.9) * ROOF_COLORS.length)]),
    });
  }
  return { trunks, crowns, palms, palmTrunks, houses, shrubs };
}

type Tmp = { m4: THREE.Matrix4; q: THREE.Quaternion; v: THREE.Vector3; sc: THREE.Vector3; up: THREE.Vector3 };

/**
 * Tulis letak dan warna hiasan ke `InstancedMesh`. Hiasan di petak yang
 * terbakar mengecil (`shrinkBurnt`) dan menghitam; batang pohon tetap
 * berdiri sebagai tonggak hangus.
 */
function writeDecor(mesh: THREE.InstancedMesh, list: readonly Deco[], fire: ReadonlyMap<number, CellFire> | null, shrinkBurnt: number, t: Tmp, color?: THREE.Color) {
  list.forEach((d, i) => {
    const burnt = fire?.has(d.cell) ?? false;
    const k = burnt ? shrinkBurnt : 1;
    t.q.setFromAxisAngle(t.up, d.rot);
    t.v.set(d.x, d.y, d.z);
    t.sc.set(d.sx * k, d.sy * k, d.sz * k);
    t.m4.compose(t.v, t.q, t.sc);
    mesh.setMatrixAt(i, t.m4);
    mesh.setColorAt(i, burnt ? BURNT : (color ?? d.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

/** Petak dari nomor larik datarnya. */
function cellOf(i: number): { x: number; y: number } {
  return { x: i % GRID_W, y: Math.floor(i / GRID_W) };
}

/** Tinggi tanah di tengah petak, untuk meletakkan bercak api. */
const CELL_TOPS: readonly number[] = Array.from({ length: GRID_W * GRID_H }, (_, i) => {
  const { x, y } = cellOf(i);
  const [cx, cz] = cellCenter(x, y);
  return Math.max(groundHeight(cx, cz), WATER_TOP) + 0.012;
});

/** Lebar bercak api dibanding satu kotak: sedikit melebihi supaya bercak bersebelahan menyatu. */
const BLOB_SCALE = 1.35;

/* ============================================================================
 *  KOMPONEN
 * ========================================================================== */

export default function LandscapeMap({
  stateRef,
  pickRef,
  act,
  day,
  burnsLit,
  burnAnim,
  highlight,
  highlightStrength,
  quality,
  reducedMotion,
}: {
  stateRef: RefObject<SceneState>;
  pickRef: RefObject<MapPicker | null>;
  act: number;
  day: number;
  burnsLit: number;
  burnAnim: BurnAnim | null;
  highlight: InspectPart | null;
  highlightStrength: number;
  quality: Quality;
  reducedMotion: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const groundRef = useRef<THREE.Mesh>(null);
  const camera = useThree((s) => s.camera);
  const surface = useTexture("/textures/gambut/permukaan_kering_color.webp");

  const res = useMemo(() => {
    const n = GRID_W * GRID_H;
    const decor = buildDecor(TREE_STEP[quality]);
    const groundTex = surface.clone();
    groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.colorSpace = THREE.SRGBColorSpace;
    groundTex.needsUpdate = true;
    const groundGeo = quality === "high" ? createGround(220, 150) : createGround(130, 90);
    const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, vertexColors: true, roughness: 0.95 });
    const waterGeo = createWater();
    const waterMat = new THREE.MeshStandardMaterial({ color: "#2c6683", roughness: 0.08, metalness: 0.35 });
    const blobTex = createBlobTexture();
    const emberTex = createEmberTexture(256);
    const blobGeo = new THREE.PlaneGeometry(S * BLOB_SCALE, S * BLOB_SCALE);
    blobGeo.rotateX(-Math.PI / 2);
    const decal = { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
    const scarMat = new THREE.MeshStandardMaterial({ ...decal, map: groundTex, alphaMap: blobTex, color: "#2b221c", roughness: 1, opacity: 0.95 });
    const hotMat = new THREE.MeshBasicMaterial({ ...decal, alphaMap: blobTex, color: "#d9480f", opacity: 0.92, toneMapped: false });
    const glowMat = new THREE.MeshBasicMaterial({ ...decal, map: emberTex, alphaMap: blobTex, color: "#ffb347", toneMapped: false, blending: THREE.AdditiveBlending });
    const lightMat = new THREE.MeshBasicMaterial({ ...decal, alphaMap: blobTex, color: "#ffffff", opacity: 0, toneMapped: false, blending: THREE.AdditiveBlending });
    // Garis kisi 1 km² yang sangat tipis: pengingat bahwa satelit melihat kotak.
    const gridPts: number[] = [];
    const seg = 0.05;
    const push = (ax: number, az: number, bx: number, bz: number) => {
      const r = (x: number, z: number) => Math.hypot(x, z) < outlineRadius(Math.atan2(z, x)) - 0.03;
      if (r(ax, az) && r(bx, bz)) gridPts.push(ax, groundHeight(ax, az) + 0.008, az, bx, groundHeight(bx, bz) + 0.008, bz);
    };
    for (let x = 1; x < GRID_W; x++) {
      const px = (x - GRID_W / 2) * S;
      for (let z = -HALF_D; z < HALF_D; z += seg) push(px, z, px, z + seg);
    }
    for (let y = 1; y < GRID_H; y++) {
      const pz = (y - GRID_H / 2) * S;
      for (let x = -HALF_W; x < HALF_W; x += seg) push(x, pz, x + seg, pz);
    }
    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute("position", new THREE.Float32BufferAttribute(gridPts, 3));
    const gridMat = new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.08, depthWrite: false });
    const crownGeo = new THREE.IcosahedronGeometry(1, quality === "high" ? 1 : 0);
    const trunkGeo = new THREE.CylinderGeometry(0.006, 0.009, 1, 5);
    trunkGeo.translate(0, 0.5, 0);
    const palmGeo = createPalmGeometry();
    const leafMat = new THREE.MeshStandardMaterial({ roughness: 0.82, flatShading: true });
    const palmMat = new THREE.MeshStandardMaterial({ roughness: 0.75, flatShading: true, side: THREE.DoubleSide });
    const barkMat = new THREE.MeshStandardMaterial({ roughness: 0.9 });
    const shrubMat = new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true });
    const wallGeo = new THREE.BoxGeometry(0.055, 0.032, 0.04);
    wallGeo.translate(0, 0.016, 0);
    const roofGeo = new THREE.ConeGeometry(0.044, 0.028, 4);
    roofGeo.rotateY(Math.PI / 4);
    roofGeo.translate(0, 0.046, 0);
    const wallMat = new THREE.MeshStandardMaterial({ roughness: 0.8 });
    const roofMat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.2 });
    const ringGeo = new THREE.RingGeometry(0.75, 1, 48);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: "#ffd9a8", transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
    const smokeTex = createSmokeTexture();
    const sparkTex = createSparkTexture();
    return {
      n,
      decor,
      groundTex,
      groundGeo,
      groundMat,
      waterGeo,
      waterMat,
      blobTex,
      emberTex,
      blobGeo,
      scarMat,
      hotMat,
      glowMat,
      lightMat,
      gridGeo,
      gridMat,
      crownGeo,
      trunkGeo,
      palmGeo,
      leafMat,
      palmMat,
      barkMat,
      shrubMat,
      wallGeo,
      roofGeo,
      wallMat,
      roofMat,
      ringGeo,
      ringMat,
      smokeTex,
      sparkTex,
    };
  }, [surface, quality]);
  useEffect(
    () => () => {
      for (const v of Object.values(res)) if (v && typeof (v as { dispose?: () => void }).dispose === "function") (v as { dispose: () => void }).dispose();
    },
    [res],
  );

  const hotRef = useRef<THREE.InstancedMesh>(null);
  const glowRef = useRef<THREE.InstancedMesh>(null);
  const scarRef = useRef<THREE.InstancedMesh>(null);
  const lightRef = useRef<THREE.InstancedMesh>(null);
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const crownRef = useRef<THREE.InstancedMesh>(null);
  const palmRef = useRef<THREE.InstancedMesh>(null);
  const palmTrunkRef = useRef<THREE.InstancedMesh>(null);
  const shrubRef = useRef<THREE.InstancedMesh>(null);
  const wallRef = useRef<THREE.InstancedMesh>(null);
  const roofRef = useRef<THREE.InstancedMesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const tmp = useMemo<Tmp>(
    () => ({ m4: new THREE.Matrix4(), q: new THREE.Quaternion(), v: new THREE.Vector3(), sc: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) }),
    [],
  );

  // Asap dan lidah api: sprite yang dibagi bergiliran ke kotak-kotak panas.
  const smoke = useMemo(
    () =>
      Array.from({ length: SMOKE[quality] }, (_, i) => {
        const mat = new THREE.SpriteMaterial({ map: res.smokeTex, color: "#6f6760", transparent: true, opacity: 0, depthWrite: false });
        return { sprite: new THREE.Sprite(mat), mat, seed: hash(i * 4.3) };
      }),
    [res, quality],
  );
  const flames = useMemo(
    () =>
      Array.from({ length: FLAMES[quality] }, (_, i) => {
        const mat = new THREE.SpriteMaterial({
          map: res.sparkTex,
          color: "#ffa040",
          transparent: true,
          opacity: 0,
          depthWrite: false,
          toneMapped: false,
          blending: THREE.AdditiveBlending,
        });
        return { sprite: new THREE.Sprite(mat), mat, seed: hash(i * 7.9), ox: hash(i * 2.1) - 0.5, oz: hash(i * 3.3) - 0.5 };
      }),
    [res, quality],
  );
  useEffect(
    () => () => {
      smoke.forEach((p) => p.mat.dispose());
      flames.forEach((p) => p.mat.dispose());
    },
    [smoke, flames],
  );

  // Tanah untuk klik pembaca; rumah dan batang sawit ditulis sekali.
  useEffect(() => {
    if (groundRef.current && groupRef.current) pickRef.current = { camera, surface: groundRef.current, root: groupRef.current };
    if (wallRef.current) writeDecor(wallRef.current, res.decor.houses, null, 1, tmp, new THREE.Color("#e2d8c6"));
    if (roofRef.current) writeDecor(roofRef.current, res.decor.houses, null, 1, tmp);
    if (palmTrunkRef.current) writeDecor(palmTrunkRef.current, res.decor.palmTrunks, null, 1, tmp);
    return () => {
      pickRef.current = null;
    };
  }, [res, camera, pickRef, tmp]);

  // Bagian yang disorot: bercak lembut di atas semua kotak bagian itu.
  useEffect(() => {
    const light = lightRef.current;
    if (!light) return;
    const m4 = new THREE.Matrix4();
    let k = 0;
    if (highlight)
      for (let i = 0; i < res.n; i++) {
        const { x, y } = cellOf(i);
        const [cx, cz] = cellCenter(x, y);
        const match = highlight === "kanal" ? isCanal(x, y) : highlight === "sungai" ? landAt(x, y) === "sungai" : landNatural(cx, cz) === highlight && !isCanal(x, y);
        if (!match) continue;
        m4.makeTranslation(cx, CELL_TOPS[i] + 0.004, cz);
        light.setMatrixAt(k++, m4);
      }
    light.count = k;
    light.instanceMatrix.needsUpdate = true;
  }, [highlight, res]);

  // Keadaan api per petak: ditulis ulang hanya bila berubah.
  const lastKey = useRef("");
  const hotCells = useRef<number[]>([]);
  // Saat mutu grafis turun, pohon dan bercak dibuat ulang: tulis ulang semuanya.
  useEffect(() => {
    lastKey.current = "";
  }, [res]);

  useFrame((state, delta) => {
    const s = stateRef.current;
    const g = groupRef.current;
    if (!s || !g) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, BASE_YAW + s.rotation, reducedMotion ? 30 : 10, dt);

    // 1 · Keadaan api saat ini.
    let fire: Map<number, CellFire>;
    if (act === 1) fire = fireAt(CASE_FIRE, day);
    else {
      const elapsed = burnAnim ? (reducedMotion ? Infinity : performance.now() - burnAnim.start) : Infinity;
      fire = burnsAt(burnsLit, burnAnim?.index ?? null, elapsed);
    }
    let key = `${act}|`;
    for (const [i, v] of fire) key += `${i}${v === "hot" ? "h" : "s"},`;
    if (key !== lastKey.current) {
      lastKey.current = key;
      const hot = hotRef.current;
      const glow = glowRef.current;
      const scar = scarRef.current;
      if (hot && glow && scar) {
        let nh = 0;
        let ns = 0;
        const hc: number[] = [];
        for (const [i, v] of fire) {
          const { x, y } = cellOf(i);
          const [cx, cz] = cellCenter(x, y);
          // Tiap bercak diputar acak supaya tepi lembutnya tidak berulang sama.
          tmp.q.setFromAxisAngle(tmp.up, Math.floor(hash(i * 3.3) * 4) * (Math.PI / 2));
          tmp.v.set(cx, CELL_TOPS[i], cz);
          tmp.sc.set(1, 1, 1);
          tmp.m4.compose(tmp.v, tmp.q, tmp.sc);
          if (v === "hot") {
            hot.setMatrixAt(nh, tmp.m4);
            glow.setMatrixAt(nh++, tmp.m4);
            hc.push(i);
          } else scar.setMatrixAt(ns++, tmp.m4);
        }
        hot.count = glow.count = nh;
        scar.count = ns;
        hot.instanceMatrix.needsUpdate = true;
        glow.instanceMatrix.needsUpdate = true;
        scar.instanceMatrix.needsUpdate = true;
        hotCells.current = hc;
      }
      if (crownRef.current) writeDecor(crownRef.current, res.decor.crowns, fire, 0.4, tmp);
      if (trunkRef.current) writeDecor(trunkRef.current, res.decor.trunks, fire, 1, tmp);
      if (palmRef.current) writeDecor(palmRef.current, res.decor.palms, fire, 0.4, tmp);
      if (shrubRef.current) writeDecor(shrubRef.current, res.decor.shrubs, fire, 0.01, tmp);
    }

    // 2 · Pijar bercak panas berdenyut seperti bara yang hidup.
    res.glowMat.opacity = reducedMotion ? 0.9 : 0.7 + 0.3 * Math.sin(t * 7.1) * Math.sin(t * 2.9 + 1);
    res.hotMat.opacity = reducedMotion ? 0.92 : 0.86 + 0.08 * Math.sin(t * 5.3);

    // 3 · Lidah api pendek dan asap pekat dari kotak-kotak yang masih panas.
    const hc = hotCells.current;
    flames.forEach((p, i) => {
      if (hc.length === 0) {
        p.mat.opacity = 0;
        return;
      }
      const cycle = 0.6 + p.seed * 0.6;
      const a = reducedMotion ? 0.4 : ((t + p.seed * 5) % cycle) / cycle;
      const cell = hc[i % hc.length];
      const { x, y } = cellOf(cell);
      const [cx, cz] = cellCenter(x, y);
      p.sprite.position.set(cx + p.ox * S * 0.8, CELL_TOPS[cell] + 0.01 + a * 0.09, cz + p.oz * S * 0.8);
      p.sprite.scale.setScalar(0.07 * (1 - a * 0.6));
      p.mat.opacity = Math.sin(Math.PI * a) * 0.95;
      p.mat.color.setRGB(1, 0.45 + 0.3 * (1 - a), 0.15);
    });
    smoke.forEach((p, i) => {
      if (hc.length === 0 || reducedMotion) {
        p.mat.opacity = 0;
        return;
      }
      const cycle = 3 + p.seed * 2;
      const a = ((t + p.seed * 10) % cycle) / cycle;
      const cell = hc[(i + Math.floor((t + p.seed * 10) / cycle) * 7) % hc.length];
      const { x, y } = cellOf(cell);
      const [cx, cz] = cellCenter(x, y);
      p.sprite.position.set(cx + (p.seed - 0.5) * S * 0.5 + a * 0.3, CELL_TOPS[cell] + 0.05 + a * 1.0, cz + (hash(i) - 0.5) * S * 0.5);
      p.sprite.scale.setScalar(0.14 + a * 0.5);
      p.mat.opacity = Math.sin(Math.PI * a) * 0.5;
    });

    // 4 · Sorotan bagian yang diklik berdenyut.
    const pulse = reducedMotion ? 1 : 0.65 + 0.35 * Math.sin(t * 4);
    res.lightMat.opacity = THREE.MathUtils.damp(res.lightMat.opacity, highlight ? 0.3 * pulse * highlightStrength : 0, 8, dt);

    // 5 · Cincin titik sulut, hanya saat waktu sudah diputar sampai hari ke-0.
    const ring = ringRef.current;
    if (ring) {
      const on = act === 1 && day === 0;
      ring.visible = on;
      if (on) {
        const k = reducedMotion ? 0.5 : (t % 1.6) / 1.6;
        ring.scale.setScalar(S * (0.5 + 1.3 * k));
        res.ringMat.opacity = 0.9 * (1 - k);
      }
    }
  });

  const [ix, iz] = cellCenter(CASE_IGNITION.x, CASE_IGNITION.y);
  const ignitionTop = CELL_TOPS[cellIndex(CASE_IGNITION.x, CASE_IGNITION.y)];
  const pill =
    "pointer-events-none whitespace-nowrap rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-medium text-white/85 sm:text-[10px] [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]";
  const d = res.decor;

  return (
    <group ref={groupRef} rotation={[0, BASE_YAW, 0]}>
      <PeatWalls />
      <mesh ref={groundRef} geometry={res.groundGeo} material={res.groundMat} receiveShadow />
      <mesh geometry={res.waterGeo} material={res.waterMat} receiveShadow />
      <lineSegments geometry={res.gridGeo} material={res.gridMat} />
      <instancedMesh ref={scarRef} args={[res.blobGeo, res.scarMat, res.n]} frustumCulled={false} receiveShadow renderOrder={1} />
      <instancedMesh ref={hotRef} args={[res.blobGeo, res.hotMat, res.n]} frustumCulled={false} renderOrder={2} />
      <instancedMesh ref={glowRef} args={[res.blobGeo, res.glowMat, res.n]} frustumCulled={false} renderOrder={3} />
      <instancedMesh ref={lightRef} args={[res.blobGeo, res.lightMat, res.n]} frustumCulled={false} renderOrder={4} />
      <instancedMesh ref={trunkRef} args={[res.trunkGeo, res.barkMat, Math.max(1, d.trunks.length)]} castShadow frustumCulled={false} />
      <instancedMesh ref={crownRef} args={[res.crownGeo, res.leafMat, Math.max(1, d.crowns.length)]} castShadow receiveShadow frustumCulled={false} />
      <instancedMesh ref={palmTrunkRef} args={[res.trunkGeo, res.barkMat, Math.max(1, d.palmTrunks.length)]} castShadow frustumCulled={false} />
      <instancedMesh ref={palmRef} args={[res.palmGeo, res.palmMat, Math.max(1, d.palms.length)]} castShadow frustumCulled={false} />
      <instancedMesh ref={shrubRef} args={[res.crownGeo, res.shrubMat, Math.max(1, d.shrubs.length)]} castShadow frustumCulled={false} />
      <instancedMesh ref={wallRef} args={[res.wallGeo, res.wallMat, Math.max(1, d.houses.length)]} castShadow frustumCulled={false} />
      <instancedMesh ref={roofRef} args={[res.roofGeo, res.roofMat, Math.max(1, d.houses.length)]} castShadow frustumCulled={false} />
      {flames.map((p, i) => (
        <primitive key={`f${i}`} object={p.sprite} />
      ))}
      {smoke.map((p, i) => (
        <primitive key={`s${i}`} object={p.sprite} />
      ))}
      <mesh ref={ringRef} geometry={res.ringGeo} material={res.ringMat} position={[ix, ignitionTop + 0.01, iz]} visible={false} renderOrder={5} />
      {act === 1 && day === 0 && (
        <group position={[ix, ignitionTop + 0.12, iz]}>
          <Html center zIndexRange={[10, 0]}>
            <span className={`${pill} inline-block -translate-y-4 bg-[#ff6f1c]/85 text-white`}>{FORENSIK_TEXT.ignitionMark}</span>
          </Html>
        </group>
      )}
      {LABELS.map((l) => {
        const [lx, lz] = cellCenter(l.x, l.y);
        const x = l.part === "sungai" ? riverX(lz) : lx;
        return (
          <group key={l.part} position={[x, GROUND + 0.16, lz]}>
            <Html center zIndexRange={[10, 0]}>
              <span className={pill}>{l.part === "kanal" ? "Kanal" : LAND_LABEL[l.part]}</span>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

/**
 * Dinding bongkahan di bawah peta: empat lapisan gambut dengan tekstur yang
 * sama seperti bongkahan Modul Anatomi, tepinya melengkung dan batas
 * lapisannya bergelombang, sehingga peta tampak sebagai sepotong lahan yang
 * diangkat dari tanah, bukan papan datar.
 */
function PeatWalls() {
  const maps = useTexture(WALL_LAYERS.map((l) => `/textures/gambut/${l.id}_color.webp`));
  const layers = useMemo(
    () =>
      WALL_LAYERS.map((l, i) => {
        const tex = maps[i].clone();
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        const [r, g, b] = PEAT_LAYER_TINT[l.id];
        const mat = new THREE.MeshStandardMaterial({ map: tex, color: new THREE.Color(r, g, b), roughness: 0.95, side: THREE.DoubleSide });
        return { id: l.id, tex, mat, geo: createWallLayer(i) };
      }),
    [maps],
  );
  // Dasar bongkahan, supaya dari sudut rendah tidak tampak berlubang.
  const base = useMemo(() => {
    const shape = new THREE.Shape();
    for (let j = 0; j <= 96; j++) {
      const theta = (j / 96) * Math.PI * 2;
      const R = outlineRadius(theta) * 0.96;
      if (j === 0) shape.moveTo(Math.cos(theta) * R, Math.sin(theta) * R);
      else shape.lineTo(Math.cos(theta) * R, Math.sin(theta) * R);
    }
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(Math.PI / 2);
    geo.translate(0, -1.47, 0);
    return { geo, mat: new THREE.MeshStandardMaterial({ color: "#8a8579", roughness: 1 }) };
  }, []);
  useEffect(
    () => () => {
      layers.forEach((l) => {
        l.tex.dispose();
        l.mat.dispose();
        l.geo.dispose();
      });
      base.geo.dispose();
      base.mat.dispose();
    },
    [layers, base],
  );
  return (
    <>
      {layers.map((l) => (
        <mesh key={l.id} geometry={l.geo} material={l.mat} castShadow receiveShadow />
      ))}
      <mesh geometry={base.geo} material={base.mat} />
    </>
  );
}
