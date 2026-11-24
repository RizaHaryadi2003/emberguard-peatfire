// Tekstur Jendela Pontianak yang digambar lewat kanvas 2D, tanpa berkas
// gambar: serat papan kayu, seng bergelombang berkarat, riak air sungai,
// rimbun daun, dan noda luntur dinding gedung.
//
// Sebagian besar tekstur dibuat abu-abu dengan transparansi (gelap/terang di
// atas bening). Dengan begitu tekstur hanya menambah rincian, sedangkan warna
// dan cahayanya tetap diatur pemandangan: papan yang sama tampak coklat hangat
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

/** Papan kayu tegak: tiap bilah berbeda rona, berserat, bercelah, sesekali bermata kayu. */
function wood(): string {
  const W = 256;
  const plank = 32;
  const grain = fbm(4, 16, 4, 11);
  const blotch = fbm(4, 4, 3, 12);
  const rand = mulberry32(13);
  const tone = Array.from({ length: W / plank }, () => rand());
  const knots = Array.from({ length: 5 }, () => ({ x: rand() * W, y: rand() * W, r: 3 + rand() * 4 }));
  return paint(W, W, (u, v, x, y) => {
    const p = Math.floor(x / plank);
    const inP = (x % plank) / plank;
    let k = 0.5 + (tone[p] - 0.5) * 0.35;
    // Serat: garis tegak yang berkelok mengikuti derau.
    const g = Math.sin((u * 64 + grain(u, v) * 6) * Math.PI * 2);
    k += g * 0.06 + (blotch(u, v) - 0.5) * 0.3;
    // Celah gelap antarbilah dan tepi bilah yang sedikit terang.
    if (inP < 0.05) k = 0.08;
    else if (inP < 0.1) k += 0.12;
    for (const n of knots) {
      const d = Math.hypot(x - n.x, (y - n.y) * 0.6);
      if (d < n.r * 2) k -= (1 - d / (n.r * 2)) * 0.35;
    }
    return shade(k, 0.85);
  });
}

/** Seng bergelombang: alur tegak berkilau, noda karat yang meleleh ke bawah. */
function zinc(): string {
  const W = 256;
  const rust = fbm(6, 3, 4, 21);
  const drip = fbm(32, 2, 3, 22);
  return paint(W, W, (u, v, x) => {
    const wave = Math.sin((x / 8) * Math.PI * 2);
    const light = 0.5 + wave * 0.22;
    const r = rust(u, v) * 0.8 + drip(u, v) * 0.5 * v;
    if (r > 0.62) {
      const a = Math.min(1, (r - 0.62) * 4) * 0.85;
      const l = 0.75 + wave * 0.2;
      return [Math.round(122 * l), Math.round(64 * l), Math.round(34 * l), Math.round(a * 255)];
    }
    return shade(light + (rust(u * 2, v * 2) - 0.5) * 0.2, 0.7);
  });
}

/** Riak air sungai: guratan mendatar panjang, terang dan gelap bergantian. */
function water(): string {
  const W = 512;
  const H = 256;
  const big = fbm(3, 24, 4, 31);
  const fine = fbm(8, 64, 3, 32);
  return paint(W, H, (u, v) => {
    const n = big(u, v) * 0.65 + fine(u, v) * 0.35;
    const k = 0.5 + (n - 0.5) * 2.2;
    return shade(Math.min(1, Math.max(0, k)), 0.55);
  });
}

/** Rimbun daun: gumpalan daun kecil, terang di atas dan teduh di bawah. */
function foliage(): string {
  const W = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = W;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const rand = mulberry32(41);
  // Gambar tiga kali bergeser satu ubin supaya tepinya menyambung.
  for (let i = 0; i < 900; i++) {
    const x = rand() * W;
    const y = rand() * W;
    const r = 2 + rand() * 4.5;
    const rot = rand() * Math.PI;
    const light = rand();
    for (const dx of [-W, 0, W])
      for (const dy of [-W, 0, W]) {
        ctx.save();
        ctx.translate(x + dx, y + dy);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.ellipse(0, 1, r, r * 0.55, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.32)";
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(0, -0.6, r * 0.85, r * 0.45, 0, 0, Math.PI * 2);
        ctx.fillStyle = light > 0.55 ? `rgba(255,255,230,${0.12 + light * 0.18})` : "rgba(0,0,0,0.18)";
        ctx.fill();
        ctx.restore();
      }
  }
  return canvas.toDataURL("image/png");
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

export type WindowTextures = Record<"wood" | "zinc" | "water" | "foliage" | "grime" | "grain", string>;

/** Buat semua tekstur (±50 ms, sekali saja). Hanya di peramban. */
export function createWindowTextures(): WindowTextures {
  return { wood: wood(), zinc: zinc(), water: water(), foliage: foliage(), grime: grime(), grain: grain() };
}
