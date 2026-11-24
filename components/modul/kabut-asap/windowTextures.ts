// Tekstur jendela kota yang digambar lewat kanvas 2D, tanpa berkas gambar:
// dinding bata, aspal jalan, noda luntur dinding gedung, dan butir foto.
//
// Sebagian besar tekstur dibuat abu-abu dengan transparansi (gelap/terang di
// atas bening). Dengan begitu tekstur hanya menambah rincian, sedangkan warna
// dan cahayanya tetap diatur pemandangan: bata yang sama tampak merah hangat
// di pagi hari dan hampir hitam di malam hari.
//
// Semua tekstur bisa diulang tanpa sambungan terlihat (tileable), dibuat sekali
// saat Babak 02 dibuka, lalu dipakai sebagai <pattern> SVG. Tanpa filter, jadi
// tetap ringan di laptop menengah.

/** Bilangan acak semu yang dapat diulang. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Derau nilai yang bisa diulang: kisi acak berukuran `px` × `py` yang
 * membungkus di tepinya, dihaluskan dengan kurva smoothstep.
 */
function tileNoise(px: number, py: number, seed: number) {
  const rand = mulberry32(seed);
  const grid = Array.from({ length: px * py }, rand);
  const at = (x: number, y: number) => grid[(((y % py) + py) % py) * px + (((x % px) + px) % px)];
  const s = (t: number) => t * t * (3 - 2 * t);
  /** u, v dalam 0–1 (satu ubin). */
  return (u: number, v: number) => {
    const x = u * px;
    const y = v * py;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = s(x - x0);
    const fy = s(y - y0);
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * fx;
    const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * fx;
    return a + (b - a) * fy;
  };
}

/** Jumlah beberapa oktaf derau (fbm), hasil 0–1. */
function fbm(px: number, py: number, octaves: number, seed: number) {
  const layers = Array.from({ length: octaves }, (_, i) => tileNoise(px << i, py << i, seed + i * 101));
  const norm = layers.reduce((s, _, i) => s + 0.5 ** i, 0);
  return (u: number, v: number) => layers.reduce((s, n, i) => s + n(u, v) * 0.5 ** i, 0) / norm;
}

type Painter = (u: number, v: number, x: number, y: number) => [number, number, number, number];

/** Isi kanvas w × h piksel demi piksel, lalu kembalikan sebagai URL data. */
function paint(w: number, h: number, fn: Painter): string {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = fn(x / w, y / h, x, y);
      const i = (y * w + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = a;
    }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL("image/png");
}

/** Gelap (v < 0,5) atau terang (v > 0,5) di atas bening, kekuatan `k`. */
const shade = (v: number, k: number): [number, number, number, number] => {
  const d = (v - 0.5) * 2;
  return d < 0 ? [0, 0, 0, Math.min(255, -d * k * 255)] : [255, 255, 255, Math.min(255, d * k * 255)];
};

/** Dinding bata: susunan setengah bata bergeser, tiap bata beda rona, nat terang. */
function brick(): string {
  const W = 128;
  const bw = 32;
  const bh = 12;
  const tone = fbm(4, 8, 2, 71);
  const soot = fbm(3, 3, 3, 72);
  const rand = mulberry32(73);
  const each = Array.from({ length: (W / bw) * (W / bh + 1) }, () => rand());
  return paint(W, W, (u, v, x, y) => {
    const row = Math.floor(y / bh);
    const off = row % 2 ? bw / 2 : 0;
    const col = Math.floor(((x + off) % W) / bw);
    const inX = (x + off) % bw;
    const inY = y % bh;
    // Nat semen di antara bata.
    if (inX < 2 || inY < 2) return [214, 204, 186, 150];
    let k = 0.5 + (each[row * (W / bw) + col] - 0.5) * 0.45 + (tone(u, v) - 0.5) * 0.25;
    k -= (soot(u, v) - 0.4) * 0.35;
    if (inY === 2) k += 0.1;
    return shade(Math.min(1, Math.max(0, k)), 0.8);
  });
}

/** Aspal jalan: butir kerikil halus dan tambalan yang lebih gelap. */
function asphalt(): string {
  const W = 128;
  const patch = fbm(3, 3, 3, 81);
  const rand = mulberry32(82);
  return paint(W, W, (u, v) => {
    let k = 0.5 + (rand() - 0.5) * 0.5;
    if (patch(u, v) > 0.66) k -= 0.12;
    return shade(k, 0.45);
  });
}

/** Dinding beton kota: noda luntur hujan yang memanjang ke bawah. */
function grime(): string {
  const W = 128;
  const streak = fbm(16, 2, 3, 51);
  const patch = fbm(3, 3, 3, 52);
  return paint(W, W, (u, v) => {
    const k = 0.5 - (streak(u, v) - 0.5) * 0.9 + (patch(u, v) - 0.5) * 0.5;
    return shade(k, 0.6);
  });
}

/** Butir halus seperti foto, untuk seluruh pemandangan. */
function grain(): string {
  const rand = mulberry32(61);
  return paint(128, 128, () => shade(rand(), 0.35));
}

export type WindowTextures = Record<"brick" | "asphalt" | "grime" | "grain", string>;

/** Buat semua tekstur (±50 ms, sekali saja). Hanya di peramban. */
export function createWindowTextures(): WindowTextures {
  return { brick: brick(), asphalt: asphalt(), grime: grime(), grain: grain() };
}
