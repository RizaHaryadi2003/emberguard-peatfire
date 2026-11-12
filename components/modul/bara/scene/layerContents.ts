import * as THREE from "three";
import { PEAT_LAYERS, PROFILE_DEPTH, type PeatLayer, type PeatLayerId } from "@/lib/peat";
import { seeded } from "@/lib/random";
import { BLOCK_WIDTH } from "@/components/modul/scene/dioramaConstants";

// Isi tiap lapisan tanah yang digambar pada bidang potong. Fibrik penuh serat,
// akar, ranting, dan daun yang masih utuh; hemik menyisakan potongannya;
// saprik hampir tanpa serat; tanah mineral hanya berisi pasir dan kerikil.
//
// Jumlah dan ukuran benda di sini adalah ilustrasi yang dibesarkan agar terbaca
// di layar, bukan hasil ukur. Yang mengikuti data hanyalah urutannya: serat
// berkurang dari fibrik ke saprik sesuai kadar serat pada `PEAT_LAYERS`, dan
// tanah mineral tidak berisi bahan organik.

export type ContentKind = "grain" | "fiber" | "leaf" | "root" | "twig" | "pebble";

export type ContentItem = {
  kind: ContentKind;
  layer: PeatLayerId;
  /** Titik garis atau tepi bentuk: [jarak dari tepi kiri, kedalaman] dalam meter. */
  points: [number, number][];
  /** Tebal garis (m); hanya berarti untuk bentuk yang berupa garis. */
  width: number;
  color: string;
};

/** Urutan gambar: butir halus di bawah, benda besar di atas. */
const KIND_ORDER: ContentKind[] = ["grain", "fiber", "leaf", "root", "twig", "pebble"];

/** Banyaknya benda per meter persegi bidang potong. */
const DENSITY: Record<PeatLayerId, Partial<Record<ContentKind, number>>> = {
  fibrik: { fiber: 110, leaf: 4, root: 4, twig: 3 },
  hemik: { grain: 40, fiber: 60, leaf: 1, twig: 1 },
  saprik: { grain: 150, fiber: 6 },
  mineral: { grain: 260, pebble: 28 },
};

/** Keutuhan sisa tumbuhan: makin matang, makin pendek potongannya. */
const INTACT: Record<PeatLayerId, number> = { fibrik: 1, hemik: 0.45, saprik: 0.2, mineral: 0 };

const PALETTE: Record<PeatLayerId, Partial<Record<ContentKind, string[]>>> = {
  fibrik: {
    fiber: ["#a98a5e", "#94754c", "#b89b70", "#7c5e3a"],
    leaf: ["#6a5230", "#574428", "#755a36"],
    root: ["#634630", "#705038"],
    twig: ["#4a3424", "#553c2a"],
  },
  hemik: {
    grain: ["#2a1c12", "#3a281a"],
    fiber: ["#8a6238", "#6b4a2a", "#9a7144"],
    leaf: ["#3a2a18", "#4a3520"],
    twig: ["#3f2a1a"],
  },
  saprik: {
    grain: ["#0f0b08", "#2a1e15", "#1a130d"],
    fiber: ["#4a3424", "#3f2c1e"],
  },
  mineral: {
    grain: ["#e3ddcd", "#6f6c66", "#c9c4b8"],
    pebble: ["#b9b6ae", "#8f8c85", "#d4cfc4"],
  },
};

type Rand = () => number;

/** Jepit satu titik agar tetap di dalam lapisannya dan di dalam bidang potong. */
function clampPoint(x: number, d: number, layer: PeatLayer, width: number): [number, number] {
  const margin = 0.02;
  return [Math.max(0, Math.min(width, x)), Math.max(layer.top + margin, Math.min(layer.bottom - margin, d))];
}

/** Garis berkelok dari satu titik awal. */
function wander(
  x: number,
  d: number,
  angle: number,
  length: number,
  segments: number,
  bend: number,
  rand: Rand,
  layer: PeatLayer,
  width: number,
): [number, number][] {
  const points = [clampPoint(x, d, layer, width)];
  const step = length / segments;
  let a = angle;
  let px = x;
  let pd = d;
  for (let i = 0; i < segments; i++) {
    a += (rand() - 0.5) * bend;
    px += Math.cos(a) * step;
    pd += Math.sin(a) * step;
    points.push(clampPoint(px, pd, layer, width));
  }
  return points;
}

/** Bentuk tertutup tak beraturan; dipakai untuk butir dan kerikil. */
function lump(
  x: number,
  d: number,
  radius: number,
  sides: number,
  rand: Rand,
  layer: PeatLayer,
  width: number,
): [number, number][] {
  return Array.from({ length: sides }, (_, i) => {
    const t = (i / sides) * Math.PI * 2;
    const r = radius * (0.75 + rand() * 0.45);
    return clampPoint(x + Math.cos(t) * r, d + Math.sin(t) * r, layer, width);
  });
}

/** Daun runcing di kedua ujung; titik ke-0 dan ke-5 adalah kedua ujungnya. */
function leaf(
  x: number,
  d: number,
  length: number,
  breadth: number,
  angle: number,
  layer: PeatLayer,
  width: number,
): [number, number][] {
  return Array.from({ length: 10 }, (_, i) => {
    const t = (i / 10) * Math.PI * 2;
    const along = (Math.cos(t) * length) / 2;
    const across = (Math.sin(t) * Math.abs(Math.sin(t)) * breadth) / 2;
    return clampPoint(
      x + Math.cos(angle) * along - Math.sin(angle) * across,
      d + Math.sin(angle) * along + Math.cos(angle) * across,
      layer,
      width,
    );
  });
}

function makeItem(kind: ContentKind, layer: PeatLayer, width: number, rand: Rand): ContentItem {
  const x = rand() * width;
  const d = layer.top + rand() * (layer.bottom - layer.top);
  const colors = PALETTE[layer.id][kind] ?? ["#000000"];
  const color = colors[Math.floor(rand() * colors.length)];
  const intact = INTACT[layer.id];
  // Sisa tumbuhan mengendap kurang lebih mendatar, jadi arahnya dekat sumbu x.
  const lying = (rand() - 0.5) * 0.9 + (rand() < 0.5 ? 0 : Math.PI);
  let points: [number, number][];
  let lineWidth = 0;

  switch (kind) {
    case "grain":
      points = lump(x, d, 0.005 + rand() * 0.007, 6, rand, layer, width);
      break;
    case "fiber":
      points = wander(x, d, lying, (0.12 + rand() * 0.28) * intact, 5, 0.7, rand, layer, width);
      lineWidth = 0.005 + rand() * 0.006;
      break;
    case "leaf":
      points = leaf(x, d, 0.07 + rand() * 0.05, 0.03 + rand() * 0.02, lying, layer, width);
      break;
    case "root":
      // Akar tumbuh menembus endapan, jadi arahnya condong ke bawah.
      points = wander(x, d, Math.PI / 2 + (rand() - 0.5) * 1.1, 0.35 + rand() * 0.6, 8, 0.8, rand, layer, width);
      lineWidth = 0.02 + rand() * 0.015;
      break;
    case "twig":
      points = wander(x, d, lying, (0.18 + rand() * 0.25) * intact, 3, 0.35, rand, layer, width);
      lineWidth = 0.026 + rand() * 0.02;
      break;
    case "pebble":
      points = lump(x, d, 0.025 + rand() * 0.045, 9, rand, layer, width);
      break;
  }
  return { kind, layer: layer.id, points, width: lineWidth, color };
}

/** Susun isi seluruh lapisan. Hasilnya selalu sama untuk benih yang sama. */
export function generateLayerContents(
  layers: readonly PeatLayer[] = PEAT_LAYERS,
  width: number = BLOCK_WIDTH,
  seed = 23,
): ContentItem[] {
  const rand = seeded(seed);
  const items: ContentItem[] = [];
  for (const kind of KIND_ORDER) {
    for (const layer of layers) {
      const count = Math.round((DENSITY[layer.id][kind] ?? 0) * width * (layer.bottom - layer.top));
      for (let i = 0; i < count; i++) items.push(makeItem(kind, layer, width, rand));
    }
  }
  return items;
}

const LINE_KINDS = new Set<ContentKind>(["fiber", "root", "twig"]);

/**
 * Gambar isi lapisan menjadi tekstur transparan untuk bidang potong.
 *
 * Satu tekstur yang digambar sekali saat dimuat, supaya peneduh cukup satu
 * pembacaan tambahan tiap fragmen. Tinggi kanvas mengikuti perbandingan
 * lebar dan kedalaman bidang potong, jadi bentuknya tidak meregang.
 */
export function createLayerContentsTexture(canvasWidth: number, anisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = Math.round((canvasWidth * PROFILE_DEPTH) / BLOCK_WIDTH);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kanvas 2D tidak tersedia");

  const scale = canvasWidth / BLOCK_WIDTH;
  const shadowShift = Math.max(1, scale * 0.003);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const trace = (points: [number, number][], closed: boolean) => {
    const path = new Path2D();
    points.forEach(([x, d], i) => {
      if (i === 0) path.moveTo(x * scale, d * scale);
      else path.lineTo(x * scale, d * scale);
    });
    if (closed) path.closePath();
    return path;
  };

  /** Garis yang menipis ke kedua ujungnya, seperti serat dan akar sungguhan. */
  const strokeTapered = (points: [number, number][], width: number) => {
    for (let i = 1; i < points.length; i++) {
      const along = (i - 0.5) / (points.length - 1);
      ctx.lineWidth = width * (0.45 + 0.55 * Math.sin(Math.PI * along));
      ctx.stroke(trace([points[i - 1], points[i]], false));
    }
  };

  for (const item of generateLayerContents()) {
    const isLine = LINE_KINDS.has(item.kind);
    const path = trace(item.points, !isLine);

    // Bayangan tipis di belakang tiap benda, agar ia terbaca menempel di tanah.
    if (item.kind !== "grain") {
      ctx.save();
      ctx.translate(shadowShift, shadowShift);
      ctx.strokeStyle = ctx.fillStyle = "rgba(12, 7, 4, 0.5)";
      if (isLine) strokeTapered(item.points, item.width * scale * 1.3);
      else ctx.fill(path);
      ctx.restore();
    }

    ctx.strokeStyle = ctx.fillStyle = item.color;
    if (isLine) strokeTapered(item.points, item.width * scale);
    else ctx.fill(path);

    if (item.kind === "pebble") {
      // Sisi kerikil yang kena cahaya.
      const cx = item.points.reduce((sum, p) => sum + p[0], 0) / item.points.length;
      const cd = item.points.reduce((sum, p) => sum + p[1], 0) / item.points.length;
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      ctx.fill(
        trace(
          item.points.map(([x, d]): [number, number] => [cx + (x - cx) * 0.55 - 0.008, cd + (d - cd) * 0.55 - 0.01]),
          true,
        ),
      );
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // Baris pertama kanvas adalah permukaan tanah, sama dengan arah uv.y bidang potong.
  texture.flipY = false;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = anisotropy;
  return texture;
}
