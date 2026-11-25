"use client";

import { useEffect, useRef } from "react";
import {
  TRANSECT,
  aliveAfter,
  remainingShare,
  transectTrees,
  type Fires,
  type TransectTree,
} from "@/lib/model/succession";

// Gambar transek tampak samping: pembaca berdiri di jalur ukur dan melihat
// pohon-pohon di sepanjang jalur, seperti berjalan di hutan rawa gambut.
// Pohon dan jumlahnya dari lib/model/succession.ts (Yeager dkk. 2003);
// bentuk pohon, pakis, dan latar hutan ilustratif.
//
// Satuan dunia meter: x di sepanjang jalur (0–400), y melintang (−2,5–2,5,
// negatif = jauh). Kanvas digambar ulang hanya saat keadaan berubah, kecuali
// saat api menyala (nyala api bergerak).

export type TransectState = {
  /** Posisi pembaca di sepanjang jalur (m). */
  walkedM: number;
  /** Jumlah kebakaran yang sudah dialami lahan. */
  fires: Fires;
  /** Tutupan pakis dan rumput 0–1. */
  fern: number;
  /** Bekas bakar yang masih baru 0–1 (abu dan arang di tanah). */
  char: number;
  /** Api sedang menjalar: 0 belum, 0–1 bagian layar yang sudah dilalui api. */
  burning: number;
  /** Anakan pohon per m² yang digambar. */
  seedlingsPerM2: number;
};

/** Lebar pandangan (m) di layar lebar dan sempit. */
const VIEW_M = { wide: 50, narrow: 24 };
/** Jarak layar per meter melintang, dibanding per meter memanjang. */
const DEPTH = 3.2;
/** Batas dekat (m) benda di tanah di depan jalur. */
const NEAR_M = 7;
/** Letak pembaca dari tepi kiri layar (bagian lebar). */
const WALKER_AT = 0.32;

const TREES = transectTrees();

/** Bilangan semu 0–1 yang tetap untuk masukan yang sama. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: [number, number, number], b: [number, number, number], t: number) =>
  `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;

type View = {
  g: CanvasRenderingContext2D;
  W: number;
  H: number;
  ppm: number;
  /** Garis tanah (px) untuk y = 0. */
  ground: number;
  /** x dunia (m) di tepi kiri layar. */
  left: number;
  time: number;
};

/** Letak layar sebuah titik (x m, y m melintang, h m di atas tanah). */
function project(v: View, x: number, y: number, h = 0) {
  // y lebih jauh (negatif) sedikit lebih kecil dan lebih tinggi di layar.
  const k = 1 + y * 0.05;
  return {
    x: v.W / 2 + ((x - v.left) * v.ppm - v.W / 2) * k,
    y: v.ground + y * v.ppm * DEPTH - h * v.ppm * k,
    s: k,
  };
}

/** Langit dan latar hutan di balik jalur. */
function drawBackdrop(v: View, st: TransectState) {
  const { g, W, H } = v;
  const open = 1 - remainingShare(st.fires);
  const sky = g.createLinearGradient(0, 0, 0, v.ground);
  // Hutan utuh: kanopi gelap kehijauan; terbuka: langit pucat berkabut.
  sky.addColorStop(0, mix([18, 32, 24], [196, 186, 166], open));
  sky.addColorStop(1, mix([46, 66, 44], [224, 214, 192], open));
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  // Asap tipis sesaat sesudah kebakaran.
  if (st.char > 0) {
    g.fillStyle = `rgba(120,108,96,${0.25 * st.char})`;
    g.fillRect(0, 0, W, v.ground);
  }

  // Tiga lapis pohon di luar jalur, makin jauh makin pucat dan lambat.
  const layers = [
    { par: 0.25, gap: 2.2, hue: [70, 94, 72] as [number, number, number], hMin: 14 },
    { par: 0.45, gap: 1.6, hue: [44, 64, 46] as [number, number, number], hMin: 16 },
    { par: 0.7, gap: 1.2, hue: [28, 42, 30] as [number, number, number], hMin: 18 },
  ];
  const fog: [number, number, number] = open > 0.5 ? [205, 196, 178] : [60, 80, 60];
  layers.forEach((L, li) => {
    const leftM = v.left * L.par;
    const span = W / v.ppm / (0.55 + li * 0.15);
    const first = Math.floor(leftM / L.gap) - 2;
    const scale = 0.5 + li * 0.15;
    const baseY = v.ground - 2.6 * DEPTH * v.ppm - (18 - li * 7) * scale;
    for (let i = first; i < first + span / L.gap + 6; i++) {
      const r = hash(i * 13.7 + li * 101);
      // Di lahan terbuka, pohon latar yang tersisa jarang sekali.
      const alive = r < remainingShare(st.fires) ** 1.6;
      const sx = (i * L.gap - leftM) * v.ppm * scale + hash(i + li) * 20;
      const h = (L.hMin + hash(i * 3.3 + li) * 10) * v.ppm * scale;
      const tw = (0.25 + hash(i * 5.1) * 0.3) * v.ppm * scale;
      const col = mix(L.hue, fog, 0.55 - li * 0.18 + open * 0.15);
      g.fillStyle = col;
      if (alive) {
        g.fillRect(sx - tw / 2, baseY - h, tw, h);
        // Tajuk: tiga gumpal kecil, bukan satu bulatan besar.
        const cr = (1.4 + hash(i * 7.9 + li) * 1.6) * v.ppm * scale;
        g.fillStyle = mix(open > 0.5 ? [64, 88, 54] : L.hue, fog, 0.45 - li * 0.15);
        for (let k = 0; k < 3; k++) {
          g.beginPath();
          g.ellipse(sx + (k - 1) * cr * 0.8, baseY - h + (k === 1 ? -cr * 0.4 : 0), cr, cr * 0.65, 0, 0, Math.PI * 2);
          g.fill();
        }
      } else if (hash(i * 2.1 + li) < 0.35) {
        // Batang mati yang masih berdiri.
        const sh = h * (0.25 + hash(i * 8.8) * 0.4);
        g.fillStyle = mix([40, 34, 30], fog, 0.5 - li * 0.15);
        g.fillRect(sx - tw / 2, baseY - sh, tw * 0.8, sh);
      }
    }
    // Kaki lapisan menyatu dengan semak atau pakis.
    const foot = g.createLinearGradient(0, baseY - 8 * scale, 0, v.ground - 2.6 * DEPTH * v.ppm + 4);
    foot.addColorStop(0, "rgba(0,0,0,0)");
    foot.addColorStop(1, col0(L.hue, fog, open, li));
    g.fillStyle = foot;
    g.fillRect(0, baseY - 8 * scale, W, v.ground - 2.6 * DEPTH * v.ppm - baseY + 12);
  });

  // Berkas cahaya di bawah kanopi hutan utuh.
  if (open < 0.4) {
    g.save();
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 4; i++) {
      const x0 = ((hash(i * 4.4) * W + v.left * v.ppm * 0.15) % (W + 200)) - 100;
      const grad = g.createLinearGradient(x0, 0, x0 + 160, v.ground);
      grad.addColorStop(0, `rgba(255,236,190,${0.08 * (1 - open * 2.5)})`);
      grad.addColorStop(1, "rgba(255,236,190,0)");
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(x0, 0);
      g.lineTo(x0 + 40, 0);
      g.lineTo(x0 + 200, v.ground);
      g.lineTo(x0 + 120, v.ground);
      g.fill();
    }
    g.restore();
  }
}
function col0(hue: [number, number, number], fog: [number, number, number], open: number, li: number) {
  return mix(open > 0.5 ? [92, 110, 66] : hue, fog, 0.5 - li * 0.15);
}

/** Tanah gambut: gelap dan basah, berserasah; sesudah api abu dan arang. */
function drawGround(v: View, st: TransectState) {
  const { g, W, H } = v;
  const top = v.ground - 2.6 * DEPTH * v.ppm;
  const grad = g.createLinearGradient(0, top, 0, H);
  grad.addColorStop(0, st.char > 0.3 ? "#4a4038" : "#3a2c20");
  grad.addColorStop(1, "#1b140e");
  g.fillStyle = grad;
  g.fillRect(0, top, W, H - top);
  // Genangan air hitam yang memantulkan langit.
  for (let i = Math.floor(v.left / 3) - 1; i < (v.left + W / v.ppm) / 3 + 1; i++) {
    if (hash(i * 9.3) < 0.55) continue;
    const p = project(v, i * 3 + hash(i) * 2, -2.5 + hash(i * 2.7) * (NEAR_M + 2.5));
    g.fillStyle = "rgba(14,12,10,0.85)";
    g.beginPath();
    g.ellipse(p.x, p.y, (0.8 + hash(i * 4.1) * 1.6) * v.ppm, 0.16 * v.ppm, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "rgba(200,210,200,0.08)";
    g.beginPath();
    g.ellipse(p.x - 0.2 * v.ppm, p.y - 0.03 * v.ppm, 0.6 * v.ppm, 0.05 * v.ppm, 0, 0, Math.PI * 2);
    g.fill();
  }
  // Serasah (hutan utuh) atau abu dan arang (baru terbakar).
  const n = Math.round((W / v.ppm) * 24);
  for (let k = 0; k < n; k++) {
    const i = Math.floor(v.left * 24) + k;
    const p = project(v, i / 24, -2.5 + hash(i * 1.9) * (NEAR_M + 2.5));
    if (st.char > 0.05 && hash(i * 3.3) < st.char) {
      g.fillStyle = hash(i) < 0.5 ? "rgba(150,146,140,0.55)" : "rgba(20,18,16,0.8)";
      g.fillRect(p.x, p.y, 2 + hash(i * 5) * 4, 1.5);
    } else if (st.fires === 0) {
      g.fillStyle = hash(i * 7.7) < 0.5 ? "#6a4a2c" : "#8a6638";
      g.fillRect(p.x, p.y, 3 + hash(i * 2) * 3, 1.5);
    }
  }
}

/** Pita ukur di garis tengah jalur, dengan patok tiap 10 m. */
function drawTape(v: View) {
  const { g, W } = v;
  const p0 = project(v, v.left, 0);
  g.strokeStyle = "rgba(255,214,90,0.85)";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(Math.max(0, p0.x), p0.y);
  g.lineTo(W, p0.y);
  g.stroke();
  for (let m = Math.ceil(v.left / 10) * 10; m <= v.left + W / v.ppm; m += 10) {
    if (m < 0 || m > TRANSECT.lengthM) continue;
    const p = project(v, m, 0);
    g.fillStyle = "#c9a15a";
    g.fillRect(p.x - 2, p.y - 1.1 * v.ppm, 4, 1.1 * v.ppm);
    g.fillStyle = "#ff8a3d";
    g.fillRect(p.x - 3, p.y - 1.1 * v.ppm, 6, 0.18 * v.ppm);
    g.fillStyle = "rgba(255,255,255,0.8)";
    g.font = `${Math.max(9, 0.32 * v.ppm)}px Inter, sans-serif`;
    g.textAlign = "center";
    g.fillText(`${m} m`, p.x, p.y + 0.5 * v.ppm);
  }
}

/** Satu rumpun pakis (atau rumput) di tanah. */
function drawFern(v: View, x: number, y: number, seed: number, scale: number, grass: boolean) {
  const { g } = v;
  const p = project(v, x, y);
  const fronds = 5 + Math.floor(hash(seed) * 4);
  const len = (0.5 + hash(seed * 2) * 0.6) * v.ppm * scale * p.s;
  for (let f = 0; f < fronds; f++) {
    const a = -Math.PI / 2 + (f / (fronds - 1) - 0.5) * 2.2 + (hash(seed + f) - 0.5) * 0.3;
    const ex = p.x + Math.cos(a) * len;
    const ey = p.y + Math.sin(a) * len * 0.9;
    const cx = p.x + Math.cos(a) * len * 0.5;
    const cy = p.y + Math.sin(a) * len * 0.9 - len * 0.25;
    const green = grass ? "rgb(150,160,80)" : `rgb(${70 + f * 6},${126 + f * 5},${54})`;
    g.strokeStyle = green;
    g.lineWidth = grass ? 1 : 1.3;
    g.beginPath();
    g.moveTo(p.x, p.y);
    g.quadraticCurveTo(cx, cy, ex, ey);
    g.stroke();
    if (grass) continue;
    // Anak daun di kedua sisi tangkai.
    g.lineWidth = 1.6;
    for (let k = 2; k < 9; k++) {
      const t = k / 9;
      const qx = (1 - t) * (1 - t) * p.x + 2 * (1 - t) * t * cx + t * t * ex;
      const qy = (1 - t) * (1 - t) * p.y + 2 * (1 - t) * t * cy + t * t * ey;
      const l = len * 0.16 * (1 - t * 0.6);
      g.beginPath();
      g.moveTo(qx, qy);
      g.lineTo(qx + Math.cos(a - 1.1) * l, qy + Math.sin(a - 1.1) * l);
      g.moveTo(qx, qy);
      g.lineTo(qx + Math.cos(a + 1.1) * l, qy + Math.sin(a + 1.1) * l);
      g.stroke();
    }
  }
}

/** Anakan pohon: batang kecil dengan beberapa daun. */
function drawSeedling(v: View, x: number, y: number, seed: number) {
  const { g } = v;
  const p = project(v, x, y);
  const h = (0.25 + hash(seed) * 0.35) * v.ppm;
  g.strokeStyle = "#5b4a2e";
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(p.x, p.y);
  g.lineTo(p.x, p.y - h);
  g.stroke();
  g.fillStyle = "#6fa24a";
  for (let k = 0; k < 3; k++) {
    g.beginPath();
    g.ellipse(p.x + (k - 1) * 3, p.y - h + k * 2, 3.2, 1.6, (k - 1) * 0.6, 0, Math.PI * 2);
    g.fill();
  }
}

/** Pohon hidup: batang berakar tunjang dan tajuk rapat. */
function drawTree(v: View, t: TransectTree, idx: number, tagged: boolean) {
  const { g } = v;
  const base = project(v, t.x, t.y);
  const hM = 16 + t.size * 14;
  const dM = 0.3 + t.size * 0.5;
  const w = dM * v.ppm * base.s;
  const top = project(v, t.x, t.y, hM);
  const shade = 0.75 + (t.y + 2.5) * 0.06;
  // Akar tunjang yang keluar di atas gambut basah.
  g.strokeStyle = `rgba(${Math.round(70 * shade)},${Math.round(52 * shade)},${Math.round(36 * shade)},1)`;
  g.lineWidth = Math.max(1.5, w * 0.18);
  for (let r = 0; r < 6; r++) {
    const side = r < 3 ? -1 : 1;
    const spread = (0.6 + hash(idx * 3 + r) * 0.9) * v.ppm * base.s;
    const rise = (0.8 + hash(idx * 5 + r) * 1.1) * v.ppm * base.s;
    g.beginPath();
    g.moveTo(base.x + side * w * 0.3, base.y - rise);
    g.quadraticCurveTo(base.x + side * spread * 0.6, base.y - rise * 0.8, base.x + side * spread, base.y);
    g.stroke();
  }
  // Batang: menyempit ke atas, sisi kiri lebih terang (cahaya dari kiri atas).
  const bark = g.createLinearGradient(base.x - w / 2, 0, base.x + w / 2, 0);
  bark.addColorStop(0, `rgb(${Math.round(150 * shade)},${Math.round(128 * shade)},${Math.round(100 * shade)})`);
  bark.addColorStop(0.6, `rgb(${Math.round(96 * shade)},${Math.round(80 * shade)},${Math.round(62 * shade)})`);
  bark.addColorStop(1, `rgb(${Math.round(52 * shade)},${Math.round(42 * shade)},${Math.round(34 * shade)})`);
  g.fillStyle = bark;
  g.beginPath();
  g.moveTo(base.x - w / 2, base.y - 0.5 * v.ppm);
  g.lineTo(top.x - w * 0.22, top.y);
  g.lineTo(top.x + w * 0.22, top.y);
  g.lineTo(base.x + w / 2, base.y - 0.5 * v.ppm);
  g.closePath();
  g.fill();
  // Bercak lumut dan lentisel di kulit kayu.
  g.fillStyle = "rgba(120,140,90,0.35)";
  for (let k = 0; k < 6; k++) {
    const yy = base.y - (1 + hash(idx * 7 + k) * 8) * v.ppm;
    g.fillRect(base.x - w * 0.4 + hash(idx * 11 + k) * w * 0.5, yy, w * 0.25, 3);
  }
  // Dahan utama yang menyangga tajuk.
  g.strokeStyle = `rgb(${Math.round(80 * shade)},${Math.round(66 * shade)},${Math.round(50 * shade)})`;
  g.lineWidth = Math.max(1.5, w * 0.25);
  const cr = (2.6 + t.size * 2.8) * v.ppm * base.s;
  for (let k = 0; k < 4; k++) {
    const dir = k % 2 ? 1 : -1;
    g.beginPath();
    g.moveTo(top.x, top.y + cr * 0.6);
    g.quadraticCurveTo(top.x + dir * cr * 0.3, top.y, top.x + dir * cr * (0.5 + hash(idx * 17 + k) * 0.5), top.y - cr * (0.1 + k * 0.12));
    g.stroke();
  }
  // Tajuk: banyak gumpal daun kecil, gelap di bawah, terang di kiri atas.
  for (let k = 0; k < 18; k++) {
    const a = hash(idx * 13 + k) * Math.PI * 2;
    const d = Math.sqrt(hash(idx * 19 + k));
    const bx = top.x + Math.cos(a) * cr * 1.15 * d;
    const by = top.y - cr * 0.2 + Math.sin(a) * cr * 0.55 * d;
    const r = cr * (0.26 + hash(idx * 23 + k) * 0.2);
    const lit = Math.max(0, Math.min(1, 0.55 - (bx - top.x) / (cr * 3) - (by - top.y) / (cr * 2)));
    const lg = g.createRadialGradient(bx - r * 0.35, by - r * 0.45, r * 0.1, bx, by, r);
    lg.addColorStop(0, `rgb(${Math.round((70 + 70 * lit) * shade)},${Math.round((104 + 70 * lit) * shade)},${Math.round((50 + 30 * lit) * shade)})`);
    lg.addColorStop(1, `rgb(${Math.round(22 * shade)},${Math.round(44 * shade)},${Math.round(26 * shade)})`);
    g.fillStyle = lg;
    g.beginPath();
    g.ellipse(bx, by, r, r * 0.78, 0, 0, Math.PI * 2);
    g.fill();
  }
  // Pita penanda pohon yang sudah dicatat.
  if (tagged) {
    const ty = base.y - 1.4 * v.ppm;
    g.fillStyle = "#ff8a3d";
    g.fillRect(base.x - w * 0.52, ty, w * 1.04, Math.max(3, 0.12 * v.ppm));
    g.beginPath();
    g.moveTo(base.x + w * 0.5, ty);
    g.lineTo(base.x + w * 0.5 + 0.35 * v.ppm, ty + 0.25 * v.ppm);
    g.lineTo(base.x + w * 0.5 + 0.2 * v.ppm, ty + 0.05 * v.ppm);
    g.fill();
  }
}

/** Pohon yang mati terbakar: batang hangus patah, sebagian tumbang. */
function drawDeadTree(v: View, t: TransectTree, idx: number) {
  const { g } = v;
  const base = project(v, t.x, t.y);
  const dM = 0.3 + t.size * 0.5;
  const w = dM * v.ppm * base.s;
  if (hash(idx * 4.7) < 0.45) {
    // Tumbang: batang hangus melintang di tanah.
    const L = (5 + t.size * 9) * v.ppm;
    const a = (hash(idx * 6.1) - 0.5) * 0.25;
    g.save();
    g.translate(base.x, base.y - w * 0.4);
    g.rotate(a);
    const grad = g.createLinearGradient(0, -w / 2, 0, w / 2);
    grad.addColorStop(0, "#4a3e36");
    grad.addColorStop(1, "#141110");
    g.fillStyle = grad;
    g.fillRect(0, -w * 0.4, L, w * 0.8);
    g.restore();
    return;
  }
  const hM = 2 + hash(idx * 8.3) * 9 + t.size * 4;
  const top = project(v, t.x, t.y, hM);
  const grad = g.createLinearGradient(base.x - w / 2, 0, base.x + w / 2, 0);
  grad.addColorStop(0, "#5a4c42");
  grad.addColorStop(0.5, "#2a221e");
  grad.addColorStop(1, "#121010");
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(base.x - w / 2, base.y);
  g.lineTo(top.x - w * 0.3, top.y + 4);
  // Ujung patah yang bergerigi.
  g.lineTo(top.x - w * 0.1, top.y - 6);
  g.lineTo(top.x + w * 0.05, top.y + 2);
  g.lineTo(top.x + w * 0.25, top.y - 3);
  g.lineTo(base.x + w / 2, base.y);
  g.closePath();
  g.fill();
  // Retak arang berpola kotak.
  g.strokeStyle = "rgba(0,0,0,0.5)";
  g.lineWidth = 1;
  for (let y = base.y - 0.6 * v.ppm; y > top.y + 6; y -= 0.45 * v.ppm) {
    g.beginPath();
    g.moveTo(base.x - w * 0.35, y);
    g.lineTo(base.x + w * 0.3, y + 1);
    g.stroke();
  }
}

/** Lidah api menjalar di permukaan (babak 03). */
function drawFireFront(v: View, st: TransectState) {
  const { g, W } = v;
  const front = st.burning * (W + 200) - 100;
  g.save();
  g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 70; i++) {
    const x = front - hash(i * 2.3) * 260;
    if (x < -40 || x > W + 40) continue;
    const yM = -2.5 + hash(i * 5.9) * (NEAR_M + 2.5);
    const p = project(v, v.left + x / v.ppm, yM);
    const flick = 0.6 + 0.4 * Math.sin(v.time * 9 + i);
    const h = (0.6 + hash(i * 7.1) * 1.6) * v.ppm * flick;
    const grad = g.createLinearGradient(0, p.y, 0, p.y - h);
    grad.addColorStop(0, "rgba(255,150,40,0.9)");
    grad.addColorStop(0.5, "rgba(255,90,20,0.55)");
    grad.addColorStop(1, "rgba(255,60,10,0)");
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(p.x - h * 0.3, p.y);
    g.quadraticCurveTo(p.x - h * 0.15, p.y - h * 0.6, p.x + (hash(i) - 0.5) * 6, p.y - h);
    g.quadraticCurveTo(p.x + h * 0.2, p.y - h * 0.5, p.x + h * 0.3, p.y);
    g.fill();
  }
  // Asap tebal di belakang garis api.
  g.globalCompositeOperation = "source-over";
  const smoke = g.createLinearGradient(front - 300, 0, front, 0);
  smoke.addColorStop(0, "rgba(70,62,56,0)");
  smoke.addColorStop(1, "rgba(70,62,56,0.35)");
  g.fillStyle = smoke;
  g.fillRect(Math.max(0, front - 300), 0, Math.min(W, 300), v.ground);
  g.restore();
}

function render(v: View, st: TransectState) {
  const { g, W, H } = v;
  g.clearRect(0, 0, W, H);
  drawBackdrop(v, st);
  drawGround(v, st);

  const right = v.left + W / v.ppm + 12;
  const visible = (x: number) => x > v.left - 12 && x < right;
  const alive = new Set(aliveAfter(TREES, st.fires));

  // Benda di tanah dan pohon, dari belakang ke depan per lajur melintang.
  type Item = { y: number; draw: () => void };
  const items: Item[] = [];
  TREES.forEach((t, i) => {
    if (!visible(t.x)) return;
    items.push({
      y: t.y,
      draw: () =>
        alive.has(t)
          ? drawTree(v, t, i, t.x <= st.walkedM)
          : drawDeadTree(v, t, i),
    });
  });
  // Pakis dan rumput: rumpun tiap ±0,5 m, muncul sesuai tutupannya.
  if (st.fern > 0) {
    const start = Math.floor(v.left * 2) - 4;
    for (let i = start; i < start + (W / v.ppm) * 2 + 8; i++) {
      for (let lane = 0; lane < 5; lane++) {
        const seed = i * 5 + lane;
        if (hash(seed * 1.7) > st.fern) continue;
        const x = i / 2 + hash(seed * 2.9) * 0.5;
        const y = -2.5 + (lane + hash(seed * 4.3)) * ((NEAR_M + 2.5) / 5);
        const grass = st.fires >= 3 && hash(seed * 6.6) < 0.35;
        const sc = 0.6 + st.fern * 0.6;
        items.push({ y, draw: () => drawFern(v, x, y, seed, sc, grass) });
      }
    }
  }
  // Anakan pohon (jumlah sebanding kerapatan; skala ilustratif).
  const seedCount = Math.round(st.seedlingsPerM2 * 40 * (W / v.ppm / VIEW_M.wide));
  for (let k = 0; k < seedCount; k++) {
    const x = v.left + hash(k * 3.7 + Math.floor(v.left / 40)) * (W / v.ppm);
    const y = -2.5 + hash(k * 5.3) * (NEAR_M + 2.5);
    items.push({ y, draw: () => drawSeedling(v, x, y, k) });
  }
  items.sort((a, b) => a.y - b.y);
  // Pita ukur di tengah, digambar saat urutan mencapai y = 0.
  let taped = false;
  for (const it of items) {
    if (!taped && it.y > 0) {
      drawTape(v);
      taped = true;
    }
    it.draw();
  }
  if (!taped) drawTape(v);

  if (st.burning > 0 && st.burning < 1) drawFireFront(v, st);

  // Penanda posisi pembaca.
  const wx = (st.walkedM - v.left) * v.ppm;
  g.strokeStyle = "rgba(255,255,255,0.55)";
  g.setLineDash([4, 5]);
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(wx, v.ground - 6 * v.ppm);
  g.lineTo(wx, v.ground + 1.5 * v.ppm);
  g.stroke();
  g.setLineDash([]);

  // Tepi gambar memudar ke warna latar halaman, tanpa bingkai keras.
  const edge = Math.min(W, H) * 0.12;
  const bg = "17,20,15";
  for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [
    [0, 0, edge, 0, 0, 0, edge, H],
    [W, 0, W - edge, 0, W - edge, 0, edge, H],
    [0, 0, 0, edge, 0, 0, W, edge],
    [0, H, 0, H - edge, 0, H - edge, W, edge],
  ]) {
    const eg = g.createLinearGradient(x0, y0, x1, y1);
    eg.addColorStop(0, `rgba(${bg},1)`);
    eg.addColorStop(1, `rgba(${bg},0)`);
    g.fillStyle = eg;
    g.fillRect(rx, ry, rw, rh);
  }
}

export default function TransectView({
  state,
  onWalk,
}: {
  state: TransectState;
  /** Seret di gambar untuk berjalan maju atau mundur. */
  onWalk?: (m: number) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const drag = useRef<{ x: number; m: number } | null>(null);
  const ppmRef = useRef(30);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const g = c.getContext("2d");
    if (!g) return;
    let raf = 0;
    let W = 0;
    let H = 0;
    let last = "";
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const st = stateRef.current;
      const key = `${W}x${H}|${JSON.stringify(st)}`;
      const animating = st.burning > 0 && st.burning < 1;
      if (key === last && !animating) return;
      last = key;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const ppm = W / (W < 640 ? VIEW_M.narrow : VIEW_M.wide);
      ppmRef.current = ppm;
      const ground = H * 0.64;
      // Kamera mengikuti pembaca tetapi tidak melewati kedua ujung jalur.
      const span = W / ppm;
      const left = Math.max(-1, Math.min(TRANSECT.lengthM + 1 - span, st.walkedM - span * WALKER_AT));
      render({ g, W, H, ppm, ground, left, time: now / 1000 }, st);
    };
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = c.clientWidth;
      H = c.clientHeight;
      c.width = W * dpr;
      c.height = H * dpr;
      last = "";
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className={`absolute inset-0 h-full w-full ${onWalk ? "cursor-grab active:cursor-grabbing" : ""}`}
      style={{ touchAction: onWalk ? "pan-y" : undefined }}
      aria-label={`Jalur ukur hutan rawa gambut, ${Math.round(state.walkedM)} dari ${TRANSECT.lengthM} meter`}
      role="img"
      onPointerDown={(e) => {
        if (!onWalk) return;
        drag.current = { x: e.clientX, m: stateRef.current.walkedM };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!onWalk || !drag.current) return;
        const dm = (drag.current.x - e.clientX) / ppmRef.current;
        onWalk(Math.min(TRANSECT.lengthM, Math.max(0, drag.current.m + dm)));
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
    />
  );
}
