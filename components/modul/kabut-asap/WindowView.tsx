"use client";

import { useEffect, useMemo, useState } from "react";
import { hazeLevel } from "@/lib/model/haze";
import { daylight, goldenness, lightsOn, nightness, sunElevation, wrapHour, SUNRISE_HOUR, DAY_LENGTH_H } from "@/lib/model/daylight";
import { createWindowTextures, type WindowTextures } from "./windowTextures";

// Babak 02 · Jendela kota: pemandangan pusat kota besar (ilustratif) dari
// jendela sebuah gedung, memenuhi layar di belakang panel. Lapisannya dari
// jauh ke dekat: deretan pencakar langit, jembatan gantung, gedung-gedung
// bertangki air di atapnya, lalu jalan dengan taksi dan pejalan kaki serta
// gedung bata bertangga darurat di tepi layar.
//
// Dua hal mengatur suasananya:
//   - jam (0–24): letak matahari dan bulan, warna langit, cahaya keemasan,
//     lampu jendela, kalung lampu jembatan, papan iklan, lampu jalan;
//   - ISPU: kabut diletakkan di antara lapisan, lebih tebal untuk lapisan yang
//     lebih jauh, sehingga gedung terjauh hilang lebih dulu, lalu jembatan,
//     lalu gedung menengah, seperti jarak pandang yang memendek. Makin pekat,
//     makin sedikit pejalan kaki di trotoar (anjuran: kurangi aktivitas luar).
//
// Hanya gradien, bentuk SVG, dan tekstur kanvas; gerakan memakai animasi
// transform/opacity CSS. Tanpa filter blur (lihat catatan kinerja proyek).

// ---------------------------------------------------------------------------
// Warna

type RGB = [number, number, number];
type Color = string | RGB;
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
/** Terima "#rrggbb", "rgb(r,g,b)", atau [r, g, b]. */
const rgb = (c: Color): RGB => {
  if (typeof c !== "string") return c;
  if (c.startsWith("#")) return hex(c);
  const [r, g, b] = c.slice(c.indexOf("(") + 1, -1).split(",").map(Number);
  return [r, g, b];
};
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Campuran dua warna; t = 0 → a, t = 1 → b. */
function mix(a: Color, b: Color, t: number): RGB {
  const x = rgb(a);
  const y = rgb(b);
  const k = clamp01(t);
  return [x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k, x[2] + (y[2] - x[2]) * k];
}
const css = (c: Color) => {
  const v = rgb(c);
  return `rgb(${Math.round(v[0])},${Math.round(v[1])},${Math.round(v[2])})`;
};
/** Warna berjenjang sepanjang t = 0…1. */
function ramp(stops: string[], t: number): RGB {
  const k = clamp01(t) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(k));
  return mix(stops[i], stops[i + 1], k - i);
}
/** Warna dari tabel [nilai, warna] pada nilai x. */
function table(stops: readonly [number, string][], x: number): RGB {
  if (x <= stops[0][0]) return hex(stops[0][1]);
  for (let i = 0; i < stops.length - 1; i++) {
    const [x0, c0] = stops[i];
    const [x1, c1] = stops[i + 1];
    if (x <= x1) return mix(c0, c1, (x - x0) / (x1 - x0));
  }
  return hex(stops[stops.length - 1][1]);
}

/** Bilangan semu 0–1 yang tetap untuk masukan yang sama. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Warna langit menurut ketinggian matahari: malam, senja biru, senja jingga,
// jam keemasan, siang.
const SKY_TOP: [number, string][] = [
  [-0.3, "#05070f"],
  [-0.14, "#0b1330"],
  [-0.03, "#24325e"],
  [0.06, "#3d5d92"],
  [0.25, "#3c79bf"],
  [0.7, "#2a6fc0"],
];
const SKY_MID: [number, string][] = [
  [-0.3, "#0a0e1e"],
  [-0.14, "#1a2146"],
  [-0.03, "#6b5a80"],
  [0.06, "#c9a39a"],
  [0.25, "#8ab7de"],
  [0.7, "#82bbe6"],
];
const SKY_HORIZON: [number, string][] = [
  [-0.3, "#1a1a2a"],
  [-0.14, "#33304a"],
  [-0.03, "#ec7a45"],
  [0.06, "#f7b877"],
  [0.25, "#dbe7ee"],
  [0.7, "#e2eef4"],
];

// ---------------------------------------------------------------------------
// Tata letak pemandangan (satuan viewBox 1600 × 900)

/** Kaki gedung terjauh (tertutup lapisan di depannya). */
const FAR_BASE = 660;
/** Kaki gedung menengah. */
const MID_BASE = 792;
/** Trotoar dan jalan. */
const SIDEWALK_Y = 792;
const ROAD_Y = 808;

type Win = { x: number; y: number; k: number };
/** Kotak-kotak jendela pada satu bidang; tiap jendela punya peluang menyala sendiri. */
function windowGrid(x: number, top: number, w: number, h: number, cw: number, ch: number, ww: number, seed: number): Win[] {
  const cols = Math.max(1, Math.floor((w - 4) / cw));
  const rows = Math.max(1, Math.floor((h - 6) / ch));
  const pad = (w - cols * cw) / 2;
  const out: Win[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) out.push({ x: x + pad + c * cw + (cw - ww) / 2, y: top + 5 + r * ch, k: hash(seed * 31 + r * 13.7 + c * 7.3) });
  return out;
}
const winPath = (list: Win[], ww: number, wh: number) => list.map((w) => `M${w.x.toFixed(1)} ${w.y.toFixed(1)}h${ww}v${wh}h${-ww}z`).join("");

/**
 * Menara bermahkota bertingkat ala gedung art deco: badan, beberapa tingkat
 * yang mengecil (setback), lalu mahkota dan jarum.
 */
function decoTower(x: number, w: number, h: number, crown: "mast" | "arch") {
  const base = FAR_BASE;
  const parts: string[] = [`M${x} ${base}V${base - h * 0.62}H${x + w}V${base}Z`];
  const cx = x + w / 2;
  let tw = w * 0.78;
  let ty = base - h * 0.62;
  for (const f of [0.12, 0.09, 0.06]) {
    const th = h * f;
    parts.push(`M${cx - tw / 2} ${ty}V${ty - th}H${cx + tw / 2}V${ty}Z`);
    ty -= th;
    tw *= 0.72;
  }
  if (crown === "mast") {
    parts.push(`M${cx - tw * 0.35} ${ty}L${cx - 2} ${ty - h * 0.06}H${cx + 2}L${cx + tw * 0.35} ${ty}Z`);
    parts.push(`M${cx - 1.2} ${ty - h * 0.06}V${ty - h * 0.16}H${cx + 1.2}V${ty - h * 0.06}Z`);
  } else {
    // Mahkota berlengkung bersusun yang meruncing jadi jarum.
    for (let k = 0; k < 4; k++) {
      const ww = tw * (1 - k * 0.22);
      const hh = h * 0.035;
      parts.push(`M${cx - ww / 2} ${ty}Q${cx} ${ty - hh * 2.2} ${cx + ww / 2} ${ty}Z`);
      ty -= hh;
    }
    parts.push(`M${cx - 1.4} ${ty}L${cx} ${ty - h * 0.12}L${cx + 1.4} ${ty}Z`);
  }
  return parts.join("");
}

/** Pencakar langit di kejauhan. */
const FAR = (() => {
  let x = -40;
  const list: { x: number; w: number; h: number; i: number; antenna: boolean; glass: boolean }[] = [];
  for (let i = 0; x < 1660; i++) {
    const w = 28 + hash(i * 1.3) * 46;
    const tall = hash(i * 9.1) > 0.8 ? 120 : 0;
    const h = 120 + hash(i * 3.1) * 190 + tall;
    list.push({ x, w, h, i, antenna: hash(i * 5.3) > 0.7, glass: hash(i * 6.7) > 0.6 });
    x += w + 1 + hash(i * 1.7) * 5;
  }
  return list;
})();
const DECO = [
  { x: 560, w: 64, h: 470, crown: "mast" as const },
  { x: 1010, w: 52, h: 420, crown: "arch" as const },
];
const FAR_WINDOWS = FAR.flatMap((b) => windowGrid(b.x, FAR_BASE - b.h, b.w, b.h, 6, 8, 2.6, b.i));

/** Jembatan gantung: dua menara batu, kabel utama melengkung, kabel kipas. */
const TOWERS = [600, 1120];
const TOWER_TOP = 236;
const DECK_Y = 548;
const TOWER_W = 70;
/** Tinggi kabel utama pada x: melengkung di antara menara, turun di luarnya. */
function cableY(x: number): number {
  const [a, b] = TOWERS;
  const top = TOWER_TOP + 14;
  if (x < a) return top + ((a - x) / 500) ** 1.3 * (DECK_Y - top - 10);
  if (x > b) return top + ((x - b) / 500) ** 1.3 * (DECK_Y - top - 10);
  const t = (x - (a + b) / 2) / ((b - a) / 2);
  return DECK_Y - 34 - (DECK_Y - 34 - top) * t * t;
}
const CABLE = Array.from({ length: 81 }, (_, i) => {
  const x = -120 + i * 23;
  return `${i ? "L" : "M"}${x} ${cableY(x).toFixed(1)}`;
}).join("");
const SUSPENDERS = Array.from({ length: 70 }, (_, i) => -100 + i * 26)
  .filter((x) => TOWERS.every((t) => Math.abs(x - t) > TOWER_W / 2 + 4))
  .map((x) => `M${x} ${cableY(x).toFixed(1)}V${DECK_Y}`)
  .join("");
/** Kabel kipas dari puncak menara ke lantai jembatan. */
const STAYS = TOWERS.flatMap((t) =>
  Array.from({ length: 12 }, (_, k) => {
    const side = k < 6 ? -1 : 1;
    const d = 40 + (k % 6) * 42;
    return `M${t + side * 14} ${TOWER_TOP + 30}L${t + side * (TOWER_W / 2 + d)} ${DECK_Y}`;
  }),
).join("");
/** Menara batu dengan dua lengkung runcing (lubangnya memakai evenodd). */
const TOWER_PATH = TOWERS.map((t) => {
  const l = t - TOWER_W / 2;
  const r = t + TOWER_W / 2;
  const outer = `M${l} 720V${TOWER_TOP + 8}H${l + 4}V${TOWER_TOP}H${r - 4}V${TOWER_TOP + 8}H${r}V720Z`;
  const arch = (cx: number) =>
    `M${cx - 9} ${DECK_Y + 4}V${TOWER_TOP + 110}Q${cx - 9} ${TOWER_TOP + 82} ${cx} ${TOWER_TOP + 70}Q${cx + 9} ${TOWER_TOP + 82} ${cx + 9} ${TOWER_TOP + 110}V${DECK_Y + 4}Z`;
  return outer + arch(t - 16) + arch(t + 16);
}).join("");
/** Kalung lampu di sepanjang kabel utama. */
const NECKLACE = Array.from({ length: 58 }, (_, i) => -100 + i * 31).filter((x) => TOWERS.every((t) => Math.abs(x - t) > TOWER_W / 2));

/** Gedung menengah bertangki air dan papan iklan. */
const MID = (() => {
  let x = -60;
  const list: { x: number; w: number; h: number; i: number; tank: boolean; board: number; tone: number }[] = [];
  for (let i = 0; x < 1680; i++) {
    const w = 80 + hash(i * 2.9 + 40) * 90;
    const h = 170 + hash(i * 4.3 + 40) * 150;
    const board = [3, 8, 12].indexOf(i);
    list.push({ x, w, h, i, tank: hash(i * 7.9) > 0.45, board, tone: hash(i * 8.8) });
    x += w + 3 + hash(i * 3.3) * 10;
  }
  return list;
})();
const MID_WINDOWS = MID.flatMap((b) => windowGrid(b.x, MID_BASE - b.h, b.w, b.h, 13, 17, 6, b.i + 200));
const BOARD_COLORS = [
  ["#c93b4f", "#ff3d6e"],
  ["#2f6fa8", "#39c6ff"],
  ["#d6a630", "#ffd23f"],
];

/** Gedung bata di tepi kiri dan kanan layar, bertangga darurat. */
const NEAR = [
  { x: -60, w: 380, top: 60 },
  { x: 1300, w: 400, top: 40 },
];
const NEAR_FLOOR_H = 52;

/** Taksi dan mobil di jalan. */
const STREET_CARS = Array.from({ length: 10 }, (_, i) => ({
  lane: i % 2,
  dur: 11 + hash(i * 2.3 + 9) * 7,
  delay: -hash(i * 5.1 + 9) * 20,
  w: hash(i * 3.7) > 0.8 ? 92 : 62,
  body: hash(i * 6.1) > 0.3 ? "#f2c12e" : ["#2b2f36", "#8a8f94", "#7d2f2a"][i % 3],
}));
/** Kendaraan kecil di lantai jembatan. */
const BRIDGE_CARS = Array.from({ length: 12 }, (_, i) => ({
  lane: i % 2,
  dur: 18 + hash(i * 2.1) * 9,
  delay: -hash(i * 4.7) * 27,
  w: hash(i * 3.9) > 0.75 ? 16 : 10,
  body: ["#e0bb3a", "#7d2f2a", "#2d3c55", "#e4e0d6", "#3a3a3a", "#8a8f94"][i % 6],
}));
/** Pejalan kaki di trotoar. */
const PEOPLE = Array.from({ length: 10 }, (_, i) => ({
  dir: i % 2,
  dur: 55 + hash(i * 1.9) * 40,
  delay: -hash(i * 7.3) * 90,
  h: 26 + hash(i * 4.4) * 6,
  coat: ["#2b2b30", "#5a3a2a", "#3a4a5e", "#7a6a55", "#22303a"][i % 5],
  k: hash(i * 2.2 + 3),
}));
const LAMPS = [200, 470, 740, 1010, 1280, 1550];

/** Bintang: sedikit saja, karena langit kota besar terang. */
const STARS = Array.from({ length: 70 }, (_, i) => ({
  x: hash(i * 1.31) * 1600,
  y: hash(i * 2.77) * 300,
  r: 0.5 + hash(i * 4.1) ** 3 * 1.2,
  k: hash(i * 6.9),
  group: i % 3,
}));

/** Awan kumulus: gugus elips; dasar teduh, puncak terkena cahaya. */
const CLOUDS = Array.from({ length: 6 }, (_, i) => ({
  y: 90 + hash(i * 3.3) * 170,
  s: 0.6 + hash(i * 1.9) * 0.9,
  dur: 260 + hash(i * 5.5) * 220,
  delay: -hash(i * 8.1) * 480,
  puffs: Array.from({ length: 6 }, (_, k) => ({
    dx: (k - 2.5) * 34 + (hash(i * 11 + k) - 0.5) * 20,
    dy: -Math.sin((k / 5) * Math.PI) * 26 - hash(i * 13 + k) * 10,
    r: 26 + hash(i * 17 + k) * 22,
  })),
}));

/** Kawanan merpati: tiap burung mengepak dengan iramanya sendiri. */
const FLOCKS = [
  { y: 200, dur: 30, delay: -6, scale: 1, birds: 7 },
  { y: 140, dur: 44, delay: -28, scale: 0.7, birds: 5 },
  { y: 330, dur: 52, delay: -44, scale: 0.55, birds: 4 },
].map((f, fi) => ({
  ...f,
  list: Array.from({ length: f.birds }, (_, i) => ({
    x: -i * 22 - hash(fi * 10 + i) * 14,
    y: (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 9 + (hash(fi * 7 + i) - 0.5) * 8,
    flap: 0.3 + hash(fi * 5 + i) * 0.2,
    phase: -hash(fi * 3 + i),
  })),
}));

/** Tekstur dibuat sekali per kunjungan halaman, lalu dipakai ulang. */
let textureCache: WindowTextures | null = null;

export default function WindowView({ ispu, hour }: { ispu: number; hour: number }) {
  const h = hazeLevel(ispu);
  const elev = sunElevation(hour);
  const day = daylight(hour);
  const night = nightness(hour);
  const gold = goldenness(hour);
  const lamps = lightsOn(hour);

  // Letak matahari dan bulan di busur langit (timur di kiri, barat di kanan).
  const dayT = (wrapHour(hour) - SUNRISE_HOUR) / DAY_LENGTH_H;
  const sun = { x: 120 + dayT * 1360, y: FAR_BASE - 60 - elev * 560 };
  const moonT = wrapHour(hour - 18.3) / 12;
  const moonElev = Math.sin(Math.PI * moonT);
  const moon = { x: 140 + moonT * 1320, y: FAR_BASE - 80 - moonElev * 480 };

  // Kabut berwarna cahaya: krem-coklat di siang hari, jingga gelap oleh lampu
  // kota di malam hari.
  const hazeDay = ramp(["#d6dee4", "#d8c8a6", "#c69960", "#8a6240"], h);
  const hazeNight = ramp(["#1d2236", "#33292c", "#4e3426", "#5e3c24"], h);
  const haze = mix(hazeNight, mix(hazeDay, table(SKY_HORIZON, elev), 0.15 * (1 - h)), day);
  const hz = css(haze);

  const skyTop = mix(table(SKY_TOP, elev), haze, 0.72 * h);
  const skyMid = mix(table(SKY_MID, elev), haze, 0.86 * h);
  const skyLow = mix(table(SKY_HORIZON, elev), haze, 0.92 * h);

  // Matahari: putih siang, jingga rendah; kabut mengubahnya jadi cakram merah redup.
  const sunCol = mix(mix("#fff7de", "#ff9a48", 1 - clamp01(elev / 0.35)), "#e0532a", h * 0.9);
  const sunVisible = elev > -0.06;
  const glowStrength = clamp01((elev + 0.06) / 0.12) * (1 - 0.55 * h);

  /** Warna benda yang diterangi: campur malam → siang, lalu diberi rona keemasan. */
  const lit = (dayHex: string, nightHex: string) => css(mix(mix(nightHex, dayHex, day), mix(dayHex, "#ff9f5e", 0.55), gold * 0.32));
  // Perspektif udara: makin jauh, makin menyatu dengan warna cakrawala.
  const aerial = (c: string, t: number) => css(mix(rgb(c), skyLow, t));
  const litFace = clamp01(day * 1.2) * (0.35 + gold * 0.4) * (1 - h * 0.7);
  const sunFromLeft = sun.x < 800;
  const warm = "#ffcf7a";

  // Lampu yang menyala dipilih tetap per jendela, jadi bertambah satu per satu
  // saat senja, bukan berkedip acak.
  const litShare = Math.round(lamps * 40) / 40;
  const windows = useMemo(() => {
    const split = (list: Win[], share: number) => [list.filter((w) => w.k < share), list.filter((w) => w.k >= share)];
    const [farOn, farOff] = split(FAR_WINDOWS, litShare * 0.6);
    const [midOn, midOff] = split(MID_WINDOWS, litShare * 0.5);
    return {
      farOn: winPath(farOn, 2.6, 3.6),
      farOff: winPath(farOff, 2.6, 3.6),
      midOn: winPath(midOn, 6, 9),
      midOff: winPath(midOff, 6, 9),
    };
  }, [litShare]);

  // Tekstur kanvas dibuat setelah tampil pertama, supaya babak terbuka tanpa jeda.
  const [tex, setTex] = useState<WindowTextures | null>(textureCache);
  useEffect(() => {
    if (textureCache) return;
    const id = window.setTimeout(() => {
      textureCache = createWindowTextures();
      setTex(textureCache);
    }, 60);
    return () => window.clearTimeout(id);
  }, []);
  /** Rincian tekstur paling jelas di siang hari, memudar di malam dan dalam kabut. */
  const detail = (0.3 + 0.7 * day) * (1 - 0.6 * h);

  const farCol = aerial(lit("#6d7c8e", "#151b28"), 0.45 + 0.15 * day);
  const farShade = aerial(lit("#55626f", "#10141f"), 0.4 + 0.15 * day);
  const decoCol = aerial(lit("#8a8a86", "#171b26"), 0.38 + 0.15 * day);
  const towerStone = aerial(lit("#8b7f6c", "#1a1916"), 0.2);
  const cableCol = aerial(lit("#4a4f55", "#14161b"), 0.2);
  const midCols = [lit("#7b6a5c", "#14110f"), lit("#6a7178", "#101318"), lit("#8a7d6c", "#16130f"), lit("#5d564f", "#0f0d0c")].map((c) => aerial(c, 0.12));
  const brick = lit("#7a3f2c", "#140b08");
  const brickDark = lit("#5a2e20", "#0d0705");
  const iron = lit("#22201f", "#070606");
  const tankWood = aerial(lit("#6b4a32", "#110c09"), 0.12);
  const asphalt = lit("#3a3b3e", "#0b0c0f");
  const sidewalk = lit("#9a958c", "#1d1c1b");
  const starAlpha = night * (1 - h) ** 1.6 * 0.7;
  const birdAlpha = clamp01(day * 1.6) * (1 - h) ** 1.3;
  const cloudLit = mix(mix("#ffffff", "#ffc49a", gold * 0.8), "#3a4466", 1 - day);
  const cloudShade = mix(mix("#b9c6d4", "#b78a8e", gold * 0.7), "#1b2238", 1 - day);
  const cloudAlpha = (0.85 - 0.45 * night) * (1 - h * 0.85);
  // Langit kota besar tak pernah benar-benar gelap: cahaya kota memantul di
  // udara, dan jauh lebih kuat saat udara penuh asap.
  const skyGlow = night * (0.22 + 0.55 * h);
  // Pejalan kaki makin sedikit saat udara memburuk.
  const peopleShown = Math.round(PEOPLE.length * (1 - h) ** 1.4);

  return (
    <div className="pointer-events-none fixed inset-0" aria-hidden>
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
        <defs>
          <linearGradient id="kSky" x1="0" y1="0" x2="0" y2={FAR_BASE} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={css(skyTop)} />
            <stop offset="0.55" stopColor={css(skyMid)} />
            <stop offset="1" stopColor={css(skyLow)} />
          </linearGradient>
          <radialGradient id="kSunGlow">
            <stop offset="0" stopColor={css(sunCol)} stopOpacity={0.9} />
            <stop offset="0.18" stopColor={css(sunCol)} stopOpacity={0.45} />
            <stop offset="0.5" stopColor={css(sunCol)} stopOpacity={0.12} />
            <stop offset="1" stopColor={css(sunCol)} stopOpacity={0} />
          </radialGradient>
          <linearGradient id="kCloud" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={css(cloudLit)} />
            <stop offset="0.55" stopColor={css(mix(cloudLit, cloudShade, 0.35))} />
            <stop offset="1" stopColor={css(cloudShade)} />
          </linearGradient>
          <radialGradient id="kCloudSoft">
            <stop offset="0.55" stopColor={css(cloudLit)} stopOpacity={0.35} />
            <stop offset="1" stopColor={css(cloudLit)} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="kMoonGlow">
            <stop offset="0" stopColor="#dfe6ff" stopOpacity={0.35} />
            <stop offset="1" stopColor="#dfe6ff" stopOpacity={0} />
          </radialGradient>
          <radialGradient id="kMoon" cx="0.4" cy="0.38" r="0.7">
            <stop offset="0" stopColor="#fbf8ee" />
            <stop offset="1" stopColor="#c9c6bc" />
          </radialGradient>
          <radialGradient id="kLamp">
            <stop offset="0" stopColor="#ffe2a6" stopOpacity={0.9} />
            <stop offset="0.3" stopColor="#ffc46a" stopOpacity={0.35} />
            <stop offset="1" stopColor="#ffb050" stopOpacity={0} />
          </radialGradient>
          <radialGradient id="kBeam" cx="0" cy="0.5" r="1">
            <stop offset="0" stopColor="#fff4d6" stopOpacity={0.55} />
            <stop offset="1" stopColor="#fff4d6" stopOpacity={0} />
          </radialGradient>
          <linearGradient id="kGlass" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffffff" stopOpacity={0} />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity={0.5} />
            <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
          </linearGradient>
          <radialGradient id="kPuff">
            <stop offset="0" stopColor={hz} stopOpacity={0.7} />
            <stop offset="1" stopColor={hz} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="kSteam">
            <stop offset="0" stopColor="#f4f1ea" stopOpacity={0.75} />
            <stop offset="1" stopColor="#f4f1ea" stopOpacity={0} />
          </radialGradient>
          <linearGradient id="kFloor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={hz} stopOpacity={0} />
            <stop offset="1" stopColor={hz} stopOpacity={1} />
          </linearGradient>
          <linearGradient id="kCityGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff9a4a" stopOpacity={0} />
            <stop offset="1" stopColor="#ff9a4a" stopOpacity={1} />
          </linearGradient>
          <linearGradient id="kShade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity={0} />
            <stop offset="1" stopColor="#000" stopOpacity={0.4} />
          </linearGradient>
          {BOARD_COLORS.map(([, glow], i) => (
            <radialGradient key={i} id={`kBoard${i}`}>
              <stop offset="0" stopColor={glow} stopOpacity={0.55} />
              <stop offset="1" stopColor={glow} stopOpacity={0} />
            </radialGradient>
          ))}
          {tex && (
            <>
              <pattern id="tBrick" patternUnits="userSpaceOnUse" width="128" height="128" patternTransform="scale(0.7)">
                <image href={tex.brick} width="128" height="128" />
              </pattern>
              <pattern id="tGrime" patternUnits="userSpaceOnUse" width="128" height="128" patternTransform="scale(0.45 0.7)">
                <image href={tex.grime} width="128" height="128" />
              </pattern>
              <pattern id="tGrimeMid" patternUnits="userSpaceOnUse" width="128" height="128" patternTransform="scale(0.9 1.3)">
                <image href={tex.grime} width="128" height="128" />
              </pattern>
              <pattern id="tAsphalt" patternUnits="userSpaceOnUse" width="128" height="128" patternTransform="scale(1 0.5)">
                <image href={tex.asphalt} width="128" height="128" />
              </pattern>
              <pattern id="tGrain" patternUnits="userSpaceOnUse" width="128" height="128">
                <image href={tex.grain} width="128" height="128" />
              </pattern>
            </>
          )}
        </defs>

        {/* ── Langit ─────────────────────────────────────────────── */}
        <rect width="1600" height="900" fill="url(#kSky)" />

        {starAlpha > 0.02 &&
          [0, 1, 2].map((g) => (
            <g key={g} opacity={starAlpha}>
              <g className="kabut-twinkle" style={{ animationDuration: `${3 + g * 1.3}s`, animationDelay: `${-g}s` }}>
                {STARS.filter((s) => s.group === g).map((s, i) => (
                  <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fffaf0" opacity={0.35 + s.k * 0.65} />
                ))}
              </g>
            </g>
          ))}

        {moonElev > -0.05 && (
          <g opacity={night * (1 - 0.6 * h)}>
            <circle cx={moon.x} cy={moon.y} r={150} fill="url(#kMoonGlow)" />
            <circle cx={moon.x} cy={moon.y} r={17} fill="url(#kMoon)" />
            <circle cx={moon.x - 5} cy={moon.y - 4} r={3.4} fill="#b7b3a8" opacity={0.45} />
            <circle cx={moon.x + 6} cy={moon.y + 5} r={2.4} fill="#b7b3a8" opacity={0.4} />
          </g>
        )}

        {sunVisible && (
          <g>
            <circle cx={sun.x} cy={sun.y} r={440} fill="url(#kSunGlow)" opacity={glowStrength} />
            <circle cx={sun.x} cy={sun.y} r={22} fill={css(sunCol)} opacity={1 - 0.45 * h} />
          </g>
        )}

        {cloudAlpha > 0.03 && (
          <g opacity={cloudAlpha}>
            {CLOUDS.map((c, i) => (
              <g key={i} className="kabut-cloud" style={{ animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}>
                <g transform={`translate(0 ${c.y}) scale(${c.s})`}>
                  {/* Tepi lembut: lingkaran pudar yang lebih besar, pengganti blur. */}
                  {c.puffs.map((p, k) => (
                    <ellipse key={`h${k}`} cx={p.dx} cy={p.dy} rx={p.r * 1.6} ry={p.r * 1.05} fill="url(#kCloudSoft)" />
                  ))}
                  <ellipse cx={0} cy={14} rx={118} ry={20} fill={css(cloudShade)} opacity={0.85} />
                  {c.puffs.map((p, k) => (
                    <ellipse key={`l${k}`} cx={p.dx - 4} cy={p.dy} rx={p.r} ry={p.r * 0.7} fill="url(#kCloud)" />
                  ))}
                </g>
              </g>
            ))}
          </g>
        )}

        {/* Merpati yang melintas: siang hari, makin jarang saat berkabut. */}
        {birdAlpha > 0.03 &&
          FLOCKS.filter((_, i) => i === 0 || h < 0.35 * (i + 1)).map((f, fi) => (
            <g key={fi} className="kabut-fly" style={{ animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s` }} opacity={birdAlpha}>
              <g transform={`translate(0 ${f.y}) scale(${f.scale})`}>
                {f.list.map((b, i) => (
                  <g key={i} transform={`translate(${b.x} ${b.y})`}>
                    <path
                      className="kabut-flap"
                      style={{ animationDuration: `${b.flap}s`, animationDelay: `${b.phase}s` }}
                      d="M -8 -0.5 Q -4.5 -5 -0.6 0 L 0 0.8 L 0.6 0 Q 4.5 -5 8 -0.5 Q 4 -2.5 0 1.6 Q -4 -2.5 -8 -0.5 Z"
                      fill="#1d1a19"
                    />
                  </g>
                ))}
              </g>
            </g>
          ))}

        {/* ── Pencakar langit di kejauhan: paling cepat hilang ───── */}
        <g>
          {FAR.map((b) => (
            <g key={b.i}>
              <rect x={b.x} y={FAR_BASE - b.h} width={b.w} height={b.h} fill={b.i % 3 ? farCol : farShade} />
              {b.antenna && <rect x={b.x + b.w * 0.55} y={FAR_BASE - b.h - 26} width={1.6} height={26} fill={farShade} />}
              {/* Gedung kaca memantulkan langit dalam satu pita terang. */}
              {b.glass && day > 0.2 && (
                <rect x={b.x} y={FAR_BASE - b.h} width={b.w} height={b.h} fill="url(#kGlass)" opacity={0.18 * day * (1 - h)} />
              )}
              {litFace > 0.02 && (
                <rect
                  x={sunFromLeft ? b.x : b.x + b.w * 0.68}
                  y={FAR_BASE - b.h}
                  width={b.w * 0.32}
                  height={b.h}
                  fill={css(mix("#ffffff", sunCol, 0.5))}
                  opacity={litFace * 0.3}
                />
              )}
            </g>
          ))}
          {tex && (
            <path d={FAR.map((b) => `M${b.x} ${FAR_BASE - b.h}h${b.w}V${FAR_BASE}h${-b.w}z`).join("")} fill="url(#tGrime)" opacity={0.25 * detail} />
          )}
          <path d={windows.farOff} fill={css(mix(farShade, skyLow, 0.2 * day))} opacity={0.5} />
          <path d={windows.farOn} fill={warm} opacity={0.85 * (1 - 0.55 * h)} />
          {/* Dua menara art deco yang menjulang di atas yang lain */}
          {DECO.map((d, i) => (
            <path key={i} d={decoTower(d.x, d.w, d.h, d.crown)} fill={decoCol} />
          ))}
          {lamps > 0.15 &&
            DECO.map((d, i) => (
              <g key={`l${i}`}>
                <path d={decoTower(d.x, d.w, d.h, d.crown)} fill={warm} opacity={0.12 * lamps * (1 - 0.5 * h)} />
                <circle cx={d.x + d.w / 2} cy={FAR_BASE - d.h * (d.crown === "mast" ? 0.98 : 1.0)} r={2.4} fill="#ff4a3a" className="kabut-blink" />
              </g>
            ))}
        </g>
        <rect width="1600" height={FAR_BASE} fill={hz} opacity={0.8 * h} />
        {skyGlow > 0.02 && <rect y="250" width="1600" height={FAR_BASE - 250} fill="url(#kCityGlow)" opacity={skyGlow * 0.5} />}

        {/* ── Jembatan gantung ───────────────────────────────────── */}
        <g>
          <path d={TOWER_PATH} fill={towerStone} fillRule="evenodd" />
          {/* Sisi menara yang terkena matahari */}
          {litFace > 0.02 &&
            TOWERS.map((t) => (
              <rect
                key={t}
                x={sunFromLeft ? t - TOWER_W / 2 : t + TOWER_W / 2 - 14}
                y={TOWER_TOP}
                width={14}
                height={720 - TOWER_TOP}
                fill="#fff"
                opacity={litFace * 0.18}
              />
            ))}
          <path d={CABLE} fill="none" stroke={cableCol} strokeWidth={3.4} />
          <path d={SUSPENDERS} stroke={cableCol} strokeWidth={0.9} />
          <path d={STAYS} stroke={cableCol} strokeWidth={0.8} opacity={0.8} />
          <rect x="-40" y={DECK_Y} width="1680" height="12" fill={cableCol} />
          <path
            d={Array.from({ length: 84 }, (_, i) => `M${-40 + i * 20} ${DECK_Y + 12}l10 10l10 -10`).join("")}
            stroke={cableCol}
            strokeWidth={1.2}
            fill="none"
          />
          <rect x="-40" y={DECK_Y + 21} width="1680" height="3" fill={cableCol} />
        </g>
        {BRIDGE_CARS.map((c, i) => (
          <g key={i} className={c.lane ? "kabut-drive-l" : "kabut-drive-r"} style={{ animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}>
            <g transform={`translate(0 ${DECK_Y - 1 - c.lane * 1.5})`}>
              <rect x={-c.w / 2} y={-4} width={c.w} height={4.5} rx={1.2} fill={css(mix(mix(c.body, "#101218", 1 - day), skyLow, 0.25))} />
              {lamps > 0.15 && (
                <>
                  <circle cx={c.lane ? -c.w / 2 : c.w / 2} cy={-1.8} r={1.4} fill="#fff6d8" opacity={lamps} />
                  <circle cx={c.lane ? c.w / 2 : -c.w / 2} cy={-1.8} r={1.1} fill="#ff3b2e" opacity={lamps} />
                </>
              )}
            </g>
          </g>
        ))}
        {lamps > 0.05 && (
          <g opacity={lamps * (1 - 0.5 * h)}>
            {NECKLACE.map((x) => (
              <circle key={x} cx={x} cy={cableY(x)} r={1.9} fill="#fff1cc" />
            ))}
            {TOWERS.map((t) => (
              <circle key={t} cx={t} cy={TOWER_TOP + 200} r={160} fill="url(#kLamp)" opacity={0.25} />
            ))}
          </g>
        )}
        <rect width="1600" height="900" fill={hz} opacity={0.52 * h} />

        {/* ── Gedung menengah: tangki air di atap, papan iklan ────── */}
        <g>
          {MID.map((b) => {
            const top = MID_BASE - b.h;
            const col = midCols[b.i % midCols.length];
            const tx = b.x + b.w * (0.25 + b.tone * 0.4);
            return (
              <g key={b.i}>
                <rect x={b.x} y={top} width={b.w} height={b.h} fill={col} />
                {/* Lis atap dan sisi yang terkena cahaya */}
                <rect x={b.x - 2} y={top - 4} width={b.w + 4} height={5} fill={col} />
                <rect x={b.x - 2} y={top - 4} width={b.w + 4} height={2} fill="#000" opacity={0.25} />
                {litFace > 0.02 && (
                  <rect x={sunFromLeft ? b.x : b.x + b.w * 0.78} y={top} width={b.w * 0.22} height={b.h} fill="#fff" opacity={litFace * 0.16} />
                )}
                {b.tank && (
                  <g fill={tankWood}>
                    {/* Tangki air kayu bertiang dengan atap kerucut */}
                    <rect x={tx - 9} y={top - 22} width={2} height={18} />
                    <rect x={tx + 7} y={top - 22} width={2} height={18} />
                    <rect x={tx - 1} y={top - 22} width={2} height={18} />
                    <rect x={tx - 11} y={top - 46} width={22} height={26} rx={2} />
                    <path d={`M${tx - 12} ${top - 46}L${tx} ${top - 60}L${tx + 12} ${top - 46}Z`} />
                    <path d={`M${tx - 11} ${top - 38}h22M${tx - 11} ${top - 28}h22`} stroke="#000" strokeOpacity={0.35} strokeWidth={1.2} />
                  </g>
                )}
                {b.board >= 0 && (
                  <g>
                    {lamps > 0.15 && (
                      <ellipse cx={b.x + b.w / 2} cy={top + 46} rx={110} ry={70} fill={`url(#kBoard${b.board})`} opacity={lamps * (1 - 0.4 * h)} />
                    )}
                    <rect x={b.x + 8} y={top + 18} width={b.w - 16} height={56} fill="#111" />
                    <rect
                      x={b.x + 11}
                      y={top + 21}
                      width={b.w - 22}
                      height={50}
                      fill={css(mix(mix(BOARD_COLORS[b.board][0], "#0c0c10", 1 - day), BOARD_COLORS[b.board][1], lamps * 0.85))}
                    />
                    <rect x={b.x + 18} y={top + 32} width={(b.w - 36) * 0.7} height={6} fill="#fff" opacity={0.75} />
                    <rect x={b.x + 18} y={top + 44} width={(b.w - 36) * 0.45} height={4} fill="#fff" opacity={0.55} />
                  </g>
                )}
              </g>
            );
          })}
          {tex && (
            <path d={MID.map((b) => `M${b.x} ${MID_BASE - b.h}h${b.w}V${MID_BASE}h${-b.w}z`).join("")} fill="url(#tGrimeMid)" opacity={0.35 * detail} />
          )}
          <path d={windows.midOff} fill={lit("#2b3036", "#07080a")} opacity={0.75} />
          <path d={windows.midOn} fill={warm} opacity={0.92 * (1 - 0.45 * h)} />
          <rect y="560" width="1600" height={MID_BASE - 560} fill="url(#kShade)" />
        </g>
        <rect width="1600" height="900" fill={hz} opacity={0.32 * h} />

        {/* ── Jalan: trotoar, aspal, taksi, pejalan kaki, uap ─────── */}
        <rect y={SIDEWALK_Y} width="1600" height={ROAD_Y - SIDEWALK_Y} fill={sidewalk} />
        <rect y={ROAD_Y - 2} width="1600" height="3" fill={lit("#6d6963", "#121110")} />
        <rect y={ROAD_Y} width="1600" height={900 - ROAD_Y} fill={asphalt} />
        {tex && <rect y={ROAD_Y} width="1600" height={900 - ROAD_Y} fill="url(#tAsphalt)" opacity={0.45 * detail + 0.1} />}
        {/* Garis kuning ganda di tengah, garis putus-putus lajur */}
        <rect y={852} width="1600" height="2" fill="#d8a92a" opacity={0.75 * (0.4 + 0.6 * day)} />
        <rect y={856} width="1600" height="2" fill="#d8a92a" opacity={0.75 * (0.4 + 0.6 * day)} />
        <path d={Array.from({ length: 30 }, (_, i) => `M${i * 60} 883h30`).join("")} stroke="#e8e4da" strokeWidth={2} opacity={0.5 * (0.4 + 0.6 * day)} />
        {/* Lampu jalan berkepala melengkung */}
        {LAMPS.map((x) => (
          <g key={x}>
            <path d={`M${x} ${SIDEWALK_Y + 4}V${SIDEWALK_Y - 112}q0 -14 16 -14h18`} fill="none" stroke={iron} strokeWidth={4} />
            <rect x={x + 30} y={SIDEWALK_Y - 130} width={16} height={6} rx={3} fill={iron} />
            {lamps > 0.05 && (
              <g opacity={lamps}>
                <circle cx={x + 38} cy={SIDEWALK_Y - 122} r={90} fill="url(#kLamp)" opacity={0.7} />
                <ellipse cx={x + 38} cy={SIDEWALK_Y + 18} rx={90} ry={14} fill="#ffd590" opacity={0.18} />
              </g>
            )}
          </g>
        ))}
        {/* Uap dari lubang got, khas jalan kota tua */}
        <ellipse cx="905" cy="842" rx="16" ry="3" fill="#111" opacity={0.8} />
        <g opacity={0.55 * (1 - 0.6 * h)}>
          {[0, 1, 2, 3].map((k) => (
            <ellipse key={k} className="kabut-steam" style={{ animationDelay: `${-k * 1.1}s` }} cx="905" cy="828" rx="20" ry="16" fill="url(#kSteam)" />
          ))}
        </g>
        {/* Pejalan kaki: makin sedikit saat udara memburuk */}
        {PEOPLE.slice(0, peopleShown).map((p, i) => (
          <g key={i} className={p.dir ? "kabut-walk-l" : "kabut-walk-r"} style={{ animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` }}>
            <g transform={`translate(0 ${SIDEWALK_Y + 6})`} fill={lit(p.coat, "#060606")}>
              <circle cx={0} cy={-p.h - 3} r={3.4} fill={lit(p.k > 0.5 ? "#c69a7a" : "#7a5238", "#0a0807")} />
              <rect x={-4} y={-p.h} width={8} height={p.h * 0.55} rx={2.5} />
              <rect x={-3.4} y={-p.h * 0.47} width={2.8} height={p.h * 0.47} />
              <rect x={0.6} y={-p.h * 0.47} width={2.8} height={p.h * 0.47} />
            </g>
          </g>
        ))}
        {/* Taksi kuning dan mobil */}
        {STREET_CARS.map((c, i) => {
          const dir = c.lane ? -1 : 1;
          const y = c.lane ? 846 : 878;
          const body = css(mix(c.body, "#0d0d10", (1 - day) * 0.85));
          return (
            <g key={i} className={c.lane ? "kabut-drive-l" : "kabut-drive-r"} style={{ animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}>
              <g transform={`translate(0 ${y}) scale(${dir} 1)`}>
                {lamps > 0.15 && <ellipse cx={c.w / 2 + 60} cy={-4} rx={70} ry={10} fill="url(#kBeam)" opacity={lamps * 0.8} />}
                <path
                  d={`M${-c.w / 2} -6 Q${-c.w / 2} -14 ${-c.w / 2 + 8} -15 L${-c.w * 0.25} -16 L${-c.w * 0.14} -27 L${c.w * 0.18} -27 L${c.w * 0.3} -16 L${c.w / 2 - 4} -14 Q${c.w / 2} -12 ${c.w / 2} -6 Z`}
                  fill={body}
                />
                <path d={`M${-c.w * 0.12} -25 L${c.w * 0.16} -25 L${c.w * 0.26} -17 L${-c.w * 0.22} -17 Z`} fill={lit("#9fb4c4", "#151a20")} opacity={0.9} />
                {c.body === "#f2c12e" && <rect x={-6} y={-31} width={12} height={4} rx={1} fill={lamps > 0.15 ? "#fff2b0" : "#e9e2c6"} />}
                <circle cx={-c.w * 0.3} cy={-5} r={6} fill="#111" />
                <circle cx={c.w * 0.3} cy={-5} r={6} fill="#111" />
                <circle cx={-c.w * 0.3} cy={-5} r={2.4} fill="#777" />
                <circle cx={c.w * 0.3} cy={-5} r={2.4} fill="#777" />
                {lamps > 0.15 && (
                  <>
                    <rect x={c.w / 2 - 4} y={-13} width={4} height={3} fill="#fff6d8" />
                    <rect x={-c.w / 2} y={-13} width={3} height={3} fill="#ff3b2e" />
                  </>
                )}
              </g>
            </g>
          );
        })}

        {/* ── Gedung bata di tepi layar, bertangga darurat ───────── */}
        {NEAR.map((n, i) => {
          const floors = Math.floor((SIDEWALK_Y - 80 - n.top) / NEAR_FLOOR_H);
          const cols = Math.floor(n.w / 64);
          return (
            <g key={i}>
              <rect x={n.x} y={n.top} width={n.w} height={SIDEWALK_Y - n.top} fill={brick} />
              {tex && <rect x={n.x} y={n.top} width={n.w} height={SIDEWALK_Y - n.top} fill="url(#tBrick)" opacity={0.9 * detail + 0.1} />}
              <rect x={n.x - 6} y={n.top - 10} width={n.w + 12} height={12} fill={brickDark} />
              {/* Jendela berkusen batu */}
              {Array.from({ length: floors }, (_, f) =>
                Array.from({ length: cols }, (_, c) => {
                  const wx = n.x + 22 + c * 64;
                  const wy = n.top + 26 + f * NEAR_FLOOR_H;
                  const k = hash(i * 97 + f * 13 + c * 7);
                  const on = k < lamps * 0.38;
                  // Lampu kamar beragam: kuning hangat, putih, sesekali biru layar televisi.
                  const glow = k < 0.08 ? "#9cc4ff" : k < 0.2 ? "#fff1d6" : warm;
                  return (
                    <g key={`${f}-${c}`}>
                      <rect x={wx - 3} y={wy - 4} width={34} height={5} fill={lit("#b8ad9c", "#1a1816")} />
                      <rect x={wx} y={wy} width={28} height={34} fill={on ? glow : lit("#26292e", "#08090b")} opacity={on ? 0.55 + hash(k * 99) * 0.4 : 1} />
                      <rect x={wx} y={wy + 16} width={28} height={2} fill={brickDark} />
                    </g>
                  );
                }),
              )}
              {/* Tangga darurat besi: balkon per lantai dan tangga miring */}
              <path
                d={Array.from({ length: floors }, (_, f) => {
                  const y = n.top + 66 + f * NEAR_FLOOR_H;
                  const x0 = n.x + n.w * 0.3;
                  const x1 = n.x + n.w * 0.72;
                  const rail = `M${x0} ${y}H${x1}M${x0} ${y - 14}H${x1}` + Array.from({ length: 9 }, (_, k) => `M${x0 + ((x1 - x0) * k) / 8} ${y}v-14`).join("");
                  const ladder = f % 2 ? `M${x0 + 10} ${y}L${x1 - 30} ${y + NEAR_FLOOR_H}` : `M${x1 - 10} ${y}L${x0 + 30} ${y + NEAR_FLOOR_H}`;
                  return rail + ladder;
                }).join("")}
                stroke={iron}
                strokeWidth={2}
                fill="none"
              />
              {/* Toko di lantai dasar dengan kanopi */}
              <rect
                x={n.x + 20}
                y={SIDEWALK_Y - 70}
                width={n.w - 40}
                height={70}
                fill={lamps > 0.2 ? css(mix("#2a2620", warm, 0.6 * lamps)) : lit("#2c3034", "#0a0a0b")}
              />
              <path d={`M${n.x + 12} ${SIDEWALK_Y - 74}H${n.x + n.w - 12}L${n.x + n.w - 2} ${SIDEWALK_Y - 52}H${n.x + 2}Z`} fill={lit(i ? "#2f5a3e" : "#8a2a2a", "#0c0a0a")} />
              <rect x={n.x} y={n.top} width={n.w} height={SIDEWALK_Y - n.top} fill="url(#kShade)" />
            </g>
          );
        })}
        <rect width="1600" height="900" fill={hz} opacity={0.15 * h} />

        {/* Gumpalan kabut yang melayang pelan */}
        <g opacity={Math.min(1, h * 1.4)}>
          {Array.from({ length: 7 }, (_, i) => (
            <ellipse
              key={i}
              className="kabut-drift"
              style={{ animationDuration: `${38 + i * 9}s`, animationDelay: `${-i * 11}s` }}
              cx={200 + i * 230}
              cy={430 + hash(i * 3.7) * 300}
              rx={340}
              ry={70 + hash(i) * 50}
              fill="url(#kPuff)"
            />
          ))}
        </g>
        <rect y="300" width="1600" height="600" fill="url(#kFloor)" opacity={0.35 * h} />
        {tex && <rect width="1600" height="900" fill="url(#tGrain)" opacity={0.07} />}
      </svg>
    </div>
  );
}
