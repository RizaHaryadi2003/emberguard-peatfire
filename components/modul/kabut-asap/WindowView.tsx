"use client";

import { useMemo } from "react";
import { hazeLevel } from "@/lib/model/haze";
import {
  daylight,
  goldenness,
  lightsOn,
  nightness,
  sunElevation,
  wrapHour,
  SUNRISE_HOUR,
  DAY_LENGTH_H,
} from "@/lib/model/daylight";

// Babak 02 · Jendela Pontianak: pemandangan tepi Kapuas (ilustratif) yang
// memenuhi layar di belakang panel. Dua hal mengatur suasananya:
//   - jam (0–24): letak matahari dan bulan, warna langit, cahaya keemasan
//     pagi-sore, lampu kota dan bintang di malam hari;
//   - ISPU: kabut diletakkan di antara lapisan pemandangan, lebih tebal untuk
//     lapisan yang lebih jauh, sehingga kota di seberang hilang lebih dulu,
//     lalu jembatan, lalu sungainya, seperti jarak pandang yang memendek.
//     Pada malam berkabut, cahaya kota terpantul kabut menjadi langit jingga.
//
// Hanya gradien dan bentuk SVG; gerakan (awan, burung, kendaraan, perahu,
// kilau air) memakai animasi transform/opacity CSS. Tanpa filter blur, supaya
// ringan di laptop menengah (lihat catatan kinerja proyek).

// ---------------------------------------------------------------------------
// Warna

type RGB = [number, number, number];
type Color = string | RGB;
const hex = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
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
  return [
    x[0] + (y[0] - x[0]) * k,
    x[1] + (y[1] - x[1]) * k,
    x[2] + (y[2] - x[2]) * k,
  ];
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
  [-0.3, "#04060e"],
  [-0.14, "#0a1230"],
  [-0.03, "#24325e"],
  [0.06, "#3d5d92"],
  [0.25, "#3c79bf"],
  [0.7, "#2a6fc0"],
];
const SKY_MID: [number, string][] = [
  [-0.3, "#080c1c"],
  [-0.14, "#172044"],
  [-0.03, "#6b5a80"],
  [0.06, "#c9a39a"],
  [0.25, "#8ab7de"],
  [0.7, "#82bbe6"],
];
const SKY_HORIZON: [number, string][] = [
  [-0.3, "#0f1628"],
  [-0.14, "#2b2c4a"],
  [-0.03, "#ec7a45"],
  [0.06, "#f7b877"],
  [0.25, "#dbe7ee"],
  [0.7, "#e2eef4"],
];

// ---------------------------------------------------------------------------
// Tata letak pemandangan (satuan viewBox 1600 × 900)

/** Garis air di tepi seberang. */
const WATERLINE = 556;
/** Lantai rumah panggung di tepi dekat. */
const NEAR_FLOOR = 790;

/** Kaki langit kota di seberang sungai. */
const SKYLINE = (() => {
  let x = -30;
  return Array.from({ length: 40 }, (_, i) => {
    const w = 24 + hash(i) * 44;
    const tall = i % 9 === 4 ? 70 : i % 5 === 2 ? 30 : 0;
    const h = 22 + hash(i * 3.1) * 60 + tall;
    const b = {
      x,
      w,
      h,
      i,
      step: hash(i * 7.7) > 0.7,
      antenna: hash(i * 5.3) > 0.75,
    };
    x += w + 2 + hash(i * 1.7) * 6;
    return b;
  });
})();
const CITY_BASE = 522;

/** Jendela gedung di seberang: tiap jendela punya peluang menyala sendiri. */
const CITY_WINDOWS = SKYLINE.flatMap((b) => {
  const cols = Math.max(1, Math.floor((b.w - 6) / 8));
  const rows = Math.max(1, Math.floor((b.h - 10) / 9));
  const out: { x: number; y: number; k: number }[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      out.push({
        x: b.x + 4 + c * 8,
        y: CITY_BASE - b.h + 6 + r * 9,
        k: hash(b.i * 97 + r * 13 + c * 7),
      });
  return out;
});
const winPath = (list: typeof CITY_WINDOWS) =>
  list
    .map((w) => `M${w.x.toFixed(1)} ${w.y.toFixed(1)}h3.4v4.6h-3.4z`)
    .join("");

/** Jembatan: tiang, busur, dan lampu jalan. */
const BRIDGE_Y = 468;
const PIERS = Array.from({ length: 8 }, (_, i) => i * 240 - 80);
const LAMPS = Array.from({ length: 17 }, (_, i) => i * 100 - 20);

/** Rumah panggung di tepi dekat. */
const HOUSES = [
  { x: -40, w: 250, h: 112, roof: 50 },
  { x: 236, w: 176, h: 96, roof: 40 },
  { x: 1260, w: 196, h: 104, roof: 44 },
  { x: 1478, w: 200, h: 118, roof: 48 },
];

/** Pohon kelapa: batang melengkung dan pelepah yang menjuntai. */
function palm(
  x: number,
  base: number,
  height: number,
  lean: number,
  seed: number,
) {
  const tx = x + lean * height;
  const ty = base - height;
  const midX = x + lean * height * 0.35;
  const midY = base - height * 0.5;
  const trunk = `M${x - 5} ${base} Q${midX - 4} ${midY} ${tx - 2} ${ty} L${tx + 2} ${ty} Q${midX + 4} ${midY} ${x + 5} ${base} Z`;
  const fronds: string[] = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI + (i / (n - 1)) * Math.PI + (hash(seed + i) - 0.5) * 0.3;
    const L = height * (0.32 + hash(seed * 3 + i) * 0.12);
    const ex = tx + Math.cos(a) * L;
    const ey =
      ty + Math.sin(a) * L * 0.45 + L * 0.42 * Math.abs(Math.cos(a)) + L * 0.15;
    const cx = tx + Math.cos(a) * L * 0.55;
    const cy = ty + Math.sin(a) * L * 0.6 - L * 0.08;
    const w = L * 0.1;
    fronds.push(
      `M${tx} ${ty} Q${cx} ${cy - w} ${ex} ${ey} Q${cx} ${cy + w} ${tx} ${ty + 1} Z`,
    );
  }
  return { trunk, fronds: fronds.join("") };
}
const PALMS_NEAR = [
  palm(470, NEAR_FLOOR + 20, 250, 0.16, 3),
  palm(1210, NEAR_FLOOR + 20, 280, -0.2, 9),
  palm(-10, NEAR_FLOOR - 40, 300, 0.12, 21),
];
const PALMS_FAR = [
  palm(140, 540, 58, 0.1, 31),
  palm(520, 538, 50, -0.08, 41),
  palm(880, 541, 62, 0.12, 51),
  palm(1340, 540, 54, -0.1, 61),
];

/** Tepi seberang: gerumbul pohon yang tak beraturan. */
const FAR_TREES = `M -10 ${WATERLINE + 2} ${Array.from(
  { length: 82 },
  (_, i) => {
    const x = i * 20 - 10;
    const y =
      530 - hash(i * 2.3) * 16 - (i % 6 === 0 ? 10 : 0) - Math.sin(i * 0.4) * 4;
    return `Q ${x - 10} ${y - 8} ${x} ${y}`;
  },
).join(" ")} L 1620 ${WATERLINE + 2} Z`;

/** Bintang: titik kecil di langit atas. */
const STARS = Array.from({ length: 140 }, (_, i) => ({
  x: hash(i * 1.31) * 1600,
  y: hash(i * 2.77) * 430,
  r: 0.5 + hash(i * 4.1) ** 3 * 1.4,
  k: hash(i * 6.9),
  group: i % 3,
}));

/** Awan kumulus: gugus elips; dasar teduh, puncak terkena cahaya. */
const CLOUDS = Array.from({ length: 7 }, (_, i) => ({
  y: 110 + hash(i * 3.3) * 250,
  s: 0.6 + hash(i * 1.9) * 0.9,
  dur: 260 + hash(i * 5.5) * 220,
  delay: -hash(i * 8.1) * 480,
  puffs: Array.from({ length: 6 }, (_, k) => ({
    dx: (k - 2.5) * 34 + (hash(i * 11 + k) - 0.5) * 20,
    dy: -Math.sin((k / 5) * Math.PI) * 26 - hash(i * 13 + k) * 10,
    r: 26 + hash(i * 17 + k) * 22,
  })),
}));

/** Kawanan burung: tiap burung mengepak dengan iramanya sendiri. */
const FLOCKS = [
  { y: 230, dur: 34, delay: -6, scale: 1, birds: 7 },
  { y: 160, dur: 46, delay: -30, scale: 0.7, birds: 5 },
  { y: 300, dur: 58, delay: -48, scale: 0.55, birds: 3 },
].map((f, fi) => ({
  ...f,
  list: Array.from({ length: f.birds }, (_, i) => ({
    x: -i * 22 - hash(fi * 10 + i) * 14,
    y: (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 9 + (hash(fi * 7 + i) - 0.5) * 8,
    flap: 0.32 + hash(fi * 5 + i) * 0.22,
    phase: -hash(fi * 3 + i),
  })),
}));

/** Kendaraan di jembatan: dua lajur, berlawanan arah. */
const CARS = Array.from({ length: 12 }, (_, i) => ({
  lane: i % 2,
  dur: 15 + hash(i * 2.1) * 8,
  delay: -hash(i * 4.7) * 24,
  w: hash(i * 3.9) > 0.75 ? 22 : 13,
  body: ["#c8c4bc", "#7d2f2a", "#2d3c55", "#e4e0d6", "#3a3a3a", "#8a8f94"][
    i % 6
  ],
}));

/** Riak air: garis pendek mendatar, makin lebar makin dekat. */
const RIPPLES = Array.from({ length: 46 }, (_, i) => {
  const y = WATERLINE + 8 + hash(i * 1.9) ** 1.4 * 300;
  const near = (y - WATERLINE) / 300;
  return {
    x: hash(i * 4.4) * 1600,
    y,
    w: 30 + hash(i * 6.6) * 110 * (0.3 + near),
    k: hash(i),
  };
});

export default function WindowView({
  ispu,
  hour,
}: {
  ispu: number;
  hour: number;
}) {
  const h = hazeLevel(ispu);
  const elev = sunElevation(hour);
  const day = daylight(hour);
  const night = nightness(hour);
  const gold = goldenness(hour);
  const lamps = lightsOn(hour);

  // Letak matahari dan bulan di busur langit (timur di kiri, barat di kanan).
  const dayT = (wrapHour(hour) - SUNRISE_HOUR) / DAY_LENGTH_H;
  const sun = { x: 120 + dayT * 1360, y: CITY_BASE - elev * 470 };
  const moonT = wrapHour(hour - 18.3) / 12;
  const moonElev = Math.sin(Math.PI * moonT);
  const moon = { x: 140 + moonT * 1320, y: CITY_BASE - moonElev * 400 };

  // Kabut berwarna cahaya: krem-coklat di siang hari, jingga gelap oleh lampu
  // kota di malam hari.
  const hazeDay = ramp(["#d6dee4", "#d8c8a6", "#c69960", "#8a6240"], h);
  const hazeNight = ramp(["#1b2236", "#2f2a30", "#4c3427", "#5c3c25"], h);
  const haze = mix(
    hazeNight,
    mix(hazeDay, table(SKY_HORIZON, elev), 0.15 * (1 - h)),
    day,
  );
  const hz = css(haze);

  // Langit, lalu ditimpa kabut sesuai kepekatan.
  const skyTop = mix(table(SKY_TOP, elev), haze, 0.72 * h);
  const skyMid = mix(table(SKY_MID, elev), haze, 0.86 * h);
  const skyLow = mix(table(SKY_HORIZON, elev), haze, 0.92 * h);

  // Matahari: putih siang, jingga rendah; kabut mengubahnya jadi cakram merah redup.
  const sunCol = mix(
    mix("#fff7de", "#ff9a48", 1 - clamp01(elev / 0.35)),
    "#e0532a",
    h * 0.9,
  );
  const sunVisible = elev > -0.06;
  const glowStrength = clamp01((elev + 0.06) / 0.12) * (1 - 0.55 * h);

  /** Warna benda yang diterangi: campur malam → siang, lalu diberi rona keemasan. */
  const lit = (dayHex: string, nightHex: string) =>
    css(
      mix(
        mix(nightHex, dayHex, day),
        mix(dayHex, "#ff9f5e", 0.55),
        gold * 0.32,
      ),
    );
  // Perspektif udara: makin jauh, makin menyatu dengan warna cakrawala.
  const aerial = (c: string, t: number) => css(mix(rgb(c), skyLow, t));
  const litFace = clamp01(day * 1.2) * (0.35 + gold * 0.4) * (1 - h * 0.7);
  const sunFromLeft = sun.x < 800;

  // Jendela kota: yang menyala dipilih tetap per jendela, jadi lampu bertambah
  // satu per satu saat senja, bukan berkedip acak.
  const litShare = Math.round(lamps * 40) / 40;
  const windows = useMemo(() => {
    const on = CITY_WINDOWS.filter((w) => w.k < litShare * 0.55);
    const off = CITY_WINDOWS.filter((w) => w.k >= litShare * 0.55);
    return { on: winPath(on), off: winPath(off) };
  }, [litShare]);

  const cityCol = aerial(lit("#5b6b7d", "#141a26"), 0.35 + 0.2 * day);
  const cityShade = aerial(lit("#46535f", "#0f141e"), 0.3 + 0.2 * day);
  const bridgeCol = aerial(lit("#3a4752", "#10141c"), 0.18);
  const farTreeCol = aerial(lit("#2c4a33", "#0b120f"), 0.22);
  const nearWood = lit("#6b4f38", "#120e0c");
  const nearWoodDark = lit("#4a3526", "#0b0908");
  const roofCol = lit("#7d8a90", "#15181c");
  const roofRust = lit("#8b5a3c", "#161110");
  const palmTrunk = lit("#5c4a3a", "#0c0a09");
  const palmLeaf = lit("#3c5a2c", "#080c08");
  const palmLeafFar = aerial(lit("#2f4a2e", "#0a0f0b"), 0.3);
  const waterTop = mix(skyLow, lit("#7d7458", "#0c1018"), 0.35);
  const waterDeep = mix(lit("#4f4632", "#05070c"), haze, 0.25 * h);
  const warmLight = "#ffcf7a";
  const starAlpha = night * (1 - h) ** 1.6;
  const birdAlpha = clamp01(day * 1.6) * (1 - h) ** 1.3;
  const cloudLit = mix(
    mix("#ffffff", "#ffc49a", gold * 0.8),
    "#3a4466",
    1 - day,
  );
  const cloudShade = mix(
    mix("#b9c6d4", "#b78a8e", gold * 0.7),
    "#1b2238",
    1 - day,
  );
  const cloudAlpha = (0.85 - 0.45 * night) * (1 - h * 0.85);
  const glowAtNight = night * (0.1 + 0.5 * h);

  return (
    <div className="pointer-events-none fixed inset-0" aria-hidden>
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
      >
        <defs>
          <linearGradient
            id="kSky"
            x1="0"
            y1="0"
            x2="0"
            y2={WATERLINE}
            gradientUnits="userSpaceOnUse"
          >
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
          <linearGradient
            id="kWater"
            x1="0"
            y1={WATERLINE}
            x2="0"
            y2="900"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor={css(waterTop)} />
            <stop
              offset="0.35"
              stopColor={css(mix(waterTop, waterDeep, 0.6))}
            />
            <stop offset="1" stopColor={css(waterDeep)} />
          </linearGradient>
          <linearGradient id="kStreak" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={warmLight} stopOpacity={0.85} />
            <stop offset="1" stopColor={warmLight} stopOpacity={0} />
          </linearGradient>
          <radialGradient id="kLamp">
            <stop offset="0" stopColor="#ffe2a6" stopOpacity={0.9} />
            <stop offset="0.3" stopColor="#ffc46a" stopOpacity={0.35} />
            <stop offset="1" stopColor="#ffb050" stopOpacity={0} />
          </radialGradient>
          <radialGradient id="kPuff">
            <stop offset="0" stopColor={hz} stopOpacity={0.7} />
            <stop offset="1" stopColor={hz} stopOpacity={0} />
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
            <stop offset="1" stopColor="#000" stopOpacity={0.35} />
          </linearGradient>
        </defs>

        {/* ── Langit ─────────────────────────────────────────────── */}
        <rect width="1600" height={WATERLINE + 4} fill="url(#kSky)" />

        {/* Bintang: hanya di malam yang bersih; kabut menelannya. */}
        {starAlpha > 0.02 &&
          [0, 1, 2].map((g) => (
            <g key={g} opacity={starAlpha}>
              <g
                className="kabut-twinkle"
                style={{
                  animationDuration: `${3 + g * 1.3}s`,
                  animationDelay: `${-g}s`,
                }}
              >
                {STARS.filter((s) => s.group === g).map((s, i) => (
                  <circle
                    key={i}
                    cx={s.x}
                    cy={s.y}
                    r={s.r}
                    fill="#fffaf0"
                    opacity={0.35 + s.k * 0.65}
                  />
                ))}
              </g>
            </g>
          ))}

        {/* Bulan */}
        {moonElev > -0.05 && (
          <g opacity={night * (1 - 0.6 * h)}>
            <circle cx={moon.x} cy={moon.y} r={150} fill="url(#kMoonGlow)" />
            <circle cx={moon.x} cy={moon.y} r={17} fill="url(#kMoon)" />
            <circle
              cx={moon.x - 5}
              cy={moon.y - 4}
              r={3.4}
              fill="#b7b3a8"
              opacity={0.45}
            />
            <circle
              cx={moon.x + 6}
              cy={moon.y + 5}
              r={2.4}
              fill="#b7b3a8"
              opacity={0.4}
            />
          </g>
        )}

        {/* Matahari dengan pendarnya */}
        {sunVisible && (
          <g>
            <circle
              cx={sun.x}
              cy={sun.y}
              r={420}
              fill="url(#kSunGlow)"
              opacity={glowStrength}
            />
            <circle
              cx={sun.x}
              cy={sun.y}
              r={22}
              fill={css(sunCol)}
              opacity={1 - 0.45 * h}
            />
          </g>
        )}

        {/* Awan yang hanyut pelan */}
        {cloudAlpha > 0.03 && (
          <g opacity={cloudAlpha}>
            {CLOUDS.map((c, i) => (
              <g
                key={i}
                className="kabut-cloud"
                style={{
                  animationDuration: `${c.dur}s`,
                  animationDelay: `${c.delay}s`,
                }}
              >
                <g transform={`translate(0 ${c.y}) scale(${c.s})`}>
                  {/* Tepi lembut: lingkaran pudar yang lebih besar, pengganti blur. */}
                  {c.puffs.map((p, k) => (
                    <ellipse key={`h${k}`} cx={p.dx} cy={p.dy} rx={p.r * 1.6} ry={p.r * 1.05} fill="url(#kCloudSoft)" />
                  ))}
                  {/* Dasar awan yang datar dan teduh */}
                  <ellipse cx={0} cy={14} rx={118} ry={20} fill={css(cloudShade)} opacity={0.85} />
                  {/* Gumpal atas: terang di puncak, teduh di bawah */}
                  {c.puffs.map((p, k) => (
                    <ellipse key={`l${k}`} cx={p.dx - 4} cy={p.dy} rx={p.r} ry={p.r * 0.7} fill="url(#kCloud)" />
                  ))}
                </g>
              </g>
            ))}
          </g>
        )}

        {/* Burung yang melintas: siang hari, makin jarang saat berkabut. */}
        {birdAlpha > 0.03 &&
          FLOCKS.filter((_, i) => i === 0 || h < 0.35 * (i + 1)).map(
            (f, fi) => (
              <g
                key={fi}
                className="kabut-fly"
                style={{
                  animationDuration: `${f.dur}s`,
                  animationDelay: `${f.delay}s`,
                }}
                opacity={birdAlpha}
              >
                <g transform={`translate(0 ${f.y}) scale(${f.scale})`}>
                  {f.list.map((b, i) => (
                    <g key={i} transform={`translate(${b.x} ${b.y})`}>
                      <path
                        className="kabut-flap"
                        style={{
                          animationDuration: `${b.flap}s`,
                          animationDelay: `${b.phase}s`,
                        }}
                        d="M -8 -0.5 Q -4.5 -5 -0.6 0 L 0 0.8 L 0.6 0 Q 4.5 -5 8 -0.5 Q 4 -2.5 0 1.6 Q -4 -2.5 -8 -0.5 Z"
                        fill="#1d1a19"
                      />
                    </g>
                  ))}
                </g>
              </g>
            ),
          )}

        {/* ── Kota di seberang: paling jauh, paling cepat hilang ─── */}
        <g>
          {SKYLINE.map((b) => (
            <g key={b.i}>
              <rect
                x={b.x}
                y={CITY_BASE - b.h}
                width={b.w}
                height={b.h}
                fill={b.i % 3 ? cityCol : cityShade}
              />
              {b.step && (
                <rect
                  x={b.x + b.w * 0.25}
                  y={CITY_BASE - b.h - 12}
                  width={b.w * 0.5}
                  height={12}
                  fill={cityCol}
                />
              )}
              {b.antenna && (
                <rect
                  x={b.x + b.w * 0.6}
                  y={CITY_BASE - b.h - 22}
                  width={1.6}
                  height={22}
                  fill={cityShade}
                />
              )}
              {/* Sisi yang menghadap matahari sedikit lebih terang. */}
              {litFace > 0.02 && (
                <rect
                  x={sunFromLeft ? b.x : b.x + b.w * 0.68}
                  y={CITY_BASE - b.h}
                  width={b.w * 0.32}
                  height={b.h}
                  fill={css(mix("#ffffff", sunCol, 0.5))}
                  opacity={litFace * 0.35}
                />
              )}
            </g>
          ))}
          {/* Menara air dan kubah masjid sebagai penanda kota */}
          <g fill={cityShade}>
            <rect x="612" y="382" width="9" height="140" />
            <ellipse cx="616" cy="380" rx="26" ry="17" />
            <path d="M 922 470 Q 952 402 982 470 Z" />
            <rect x="951" y="390" width="2" height="16" />
            <circle cx="952" cy="388" r="3" />
            <rect x="998" y="400" width="6" height="122" />
            <path d="M 995 400 L 1001 384 L 1007 400 Z" />
          </g>
          <path
            d={windows.off}
            fill={css(mix(cityShade, skyLow, 0.25 * day))}
            opacity={0.55}
          />
          <path
            d={windows.on}
            fill={warmLight}
            opacity={0.9 * (1 - 0.55 * h)}
          />
          {/* Lampu merah di puncak menara */}
          {lamps > 0.2 && (
            <circle
              cx="616"
              cy="362"
              r="2.4"
              fill="#ff4a3a"
              className="kabut-blink"
            />
          )}
        </g>
        <rect
          width="1600"
          height={CITY_BASE + 6}
          fill={hz}
          opacity={0.82 * h}
        />

        {/* ── Jembatan dan lalu lintasnya ─────────────────────────── */}
        <g fill={bridgeCol}>
          {PIERS.map((x, i) => (
            <path
              key={i}
              d={`M ${x - 7} ${BRIDGE_Y} L ${x + 7} ${BRIDGE_Y} L ${x + 9} ${WATERLINE + 2} L ${x - 9} ${WATERLINE + 2} Z`}
            />
          ))}
          <rect x="-20" y={BRIDGE_Y - 2} width="1640" height="9" />
          <rect x="-20" y={BRIDGE_Y - 8} width="1640" height="1.6" />
        </g>
        <g stroke={bridgeCol} fill="none">
          {PIERS.slice(0, -1).map((x, i) => (
            <path
              key={i}
              d={`M ${x} ${BRIDGE_Y + 7} Q ${x + 120} ${BRIDGE_Y + 34} ${x + 240} ${BRIDGE_Y + 7}`}
              strokeWidth="4"
            />
          ))}
          {LAMPS.map((x) => (
            <path
              key={x}
              d={`M ${x} ${BRIDGE_Y - 2} V ${BRIDGE_Y - 22} h 5`}
              strokeWidth="1.4"
            />
          ))}
        </g>
        {/* Kendaraan: siang terlihat bodinya, malam tinggal lampunya. */}
        {CARS.map((c, i) => (
          <g
            key={i}
            className={c.lane ? "kabut-drive-l" : "kabut-drive-r"}
            style={{
              animationDuration: `${c.dur}s`,
              animationDelay: `${c.delay}s`,
            }}
          >
            <g transform={`translate(0 ${BRIDGE_Y - 6 - c.lane * 1.5})`}>
              <rect
                x={-c.w / 2}
                y={-4}
                width={c.w}
                height={c.w > 15 ? 7 : 5}
                rx={1.5}
                fill={css(mix(mix(c.body, "#101218", 1 - day), skyLow, 0.2))}
              />
              {lamps > 0.15 && (
                <>
                  <circle
                    cx={c.lane ? -c.w / 2 : c.w / 2}
                    cy={-1.5}
                    r={1.6}
                    fill="#fff6d8"
                    opacity={lamps}
                  />
                  <circle
                    cx={c.lane ? c.w / 2 : -c.w / 2}
                    cy={-1.5}
                    r={1.3}
                    fill="#ff3b2e"
                    opacity={lamps}
                  />
                </>
              )}
            </g>
          </g>
        ))}
        {lamps > 0.05 &&
          LAMPS.map((x) => (
            <g key={x} opacity={lamps}>
              <circle cx={x + 5} cy={BRIDGE_Y - 21} r={26} fill="url(#kLamp)" />
              <circle cx={x + 5} cy={BRIDGE_Y - 21} r={1.8} fill="#fff1cc" />
            </g>
          ))}

        {/* ── Tepi seberang: pepohonan dan kelapa ─────────────────── */}
        <path d={FAR_TREES} fill={farTreeCol} />
        {PALMS_FAR.map((p, i) => (
          <g key={i} fill={palmLeafFar}>
            <path d={p.trunk} />
            <path d={p.fronds} />
          </g>
        ))}
        <rect width="1600" height={WATERLINE + 4} fill={hz} opacity={0.5 * h} />
        {/* Langit malam berkabut memantulkan lampu kota menjadi jingga. */}
        {glowAtNight > 0.02 && (
          <rect
            y="260"
            width="1600"
            height={WATERLINE - 258}
            fill="url(#kCityGlow)"
            opacity={glowAtNight * 0.55}
          />
        )}

        {/* ── Sungai Kapuas ──────────────────────────────────────── */}
        <rect
          y={WATERLINE}
          width="1600"
          height={900 - WATERLINE}
          fill="url(#kWater)"
        />
        {/* Bayangan tepi seberang di air */}
        <rect
          y={WATERLINE}
          width="1600"
          height="22"
          fill={farTreeCol}
          opacity={0.35}
        />
        {PIERS.map((x, i) => (
          <rect
            key={i}
            x={x - 8}
            y={WATERLINE}
            width={16}
            height={26}
            fill={bridgeCol}
            opacity={0.25}
          />
        ))}
        {/* Kilau matahari atau bulan: tiang cahaya yang beriak */}
        {(sunVisible || moonElev > 0) && (
          <g
            opacity={
              sunVisible ? glowStrength * 0.9 : night * moonElev * 0.6 * (1 - h)
            }
          >
            <g className="kabut-shimmer">
              {Array.from({ length: 30 }, (_, i) => {
                const y = WATERLINE + 6 + i * i * 0.32;
                const cx = sunVisible ? sun.x : moon.x;
                const w = 10 + i * 3.2 + hash(i * 3.3) * 30;
                return (
                  <rect
                    key={i}
                    x={cx - w / 2 + (hash(i * 7.1) - 0.5) * (12 + i * 2)}
                    y={y}
                    width={w}
                    height={1.4 + i * 0.08}
                    rx={1}
                    fill={
                      sunVisible ? css(mix(sunCol, "#ffffff", 0.3)) : "#e8ecff"
                    }
                    opacity={0.25 + hash(i * 1.7) * 0.6}
                  />
                );
              })}
            </g>
          </g>
        )}
        {/* Pantulan lampu jembatan dan kota: garis cahaya memanjang ke bawah */}
        {lamps > 0.1 && (
          <g opacity={lamps * (1 - 0.6 * h)}>
            <g className="kabut-shimmer" style={{ animationDuration: "3.4s" }}>
              {LAMPS.map((x) => (
                <rect
                  key={x}
                  x={x + 3.5}
                  y={WATERLINE + 4}
                  width={3}
                  height={90 + hash(x) * 50}
                  fill="url(#kStreak)"
                />
              ))}
              {SKYLINE.filter((b) => b.i % 4 === 1).map((b) => (
                <rect
                  key={b.i}
                  x={b.x + b.w / 2}
                  y={WATERLINE + 3}
                  width={2}
                  height={50 + hash(b.i) * 40}
                  fill="url(#kStreak)"
                  opacity={0.6}
                />
              ))}
            </g>
          </g>
        )}
        {/* Riak */}
        <g className="kabut-ripple">
          {RIPPLES.map((r, i) => (
            <rect
              key={i}
              x={r.x}
              y={r.y}
              width={r.w}
              height={1.3}
              rx={0.6}
              fill={css(mix(skyLow, "#ffffff", 0.4))}
              opacity={(0.1 + 0.16 * day) * (1 - 0.5 * h) * (0.4 + r.k)}
            />
          ))}
        </g>

        {/* Perahu klotok yang menyeberang pelan */}
        <g className="kabut-boat">
          <g transform={`translate(0 ${WATERLINE + 104})`}>
            <path
              d="M -95 6 Q -40 3 0 4 Q 40 3 95 6"
              stroke={css(mix(skyLow, "#ffffff", 0.5))}
              strokeWidth="1.4"
              fill="none"
              opacity={0.4 * (1 - 0.5 * h)}
            />
            <path
              d="M -70 -4 L 66 -4 Q 72 -4 76 -12 L 74 2 Q 70 8 58 8 L -62 8 Q -70 8 -72 2 Z"
              fill={nearWoodDark}
            />
            <rect x="-40" y="-26" width="70" height="22" fill={nearWood} />
            <path d="M -48 -26 L 38 -26 L 34 -32 L -44 -32 Z" fill={roofCol} />
            <rect
              x="-30"
              y="-20"
              width="12"
              height="9"
              fill={lamps > 0.2 ? warmLight : nearWoodDark}
              opacity={0.9}
            />
            <rect
              x="-10"
              y="-20"
              width="12"
              height="9"
              fill={lamps > 0.2 ? warmLight : nearWoodDark}
              opacity={0.9}
            />
            {lamps > 0.2 && (
              <circle
                cx="-6"
                cy="-15"
                r="40"
                fill="url(#kLamp)"
                opacity={0.6}
              />
            )}
          </g>
        </g>
        <rect
          y={WATERLINE}
          width="1600"
          height={900 - WATERLINE}
          fill={hz}
          opacity={0.34 * h}
        />

        {/* ── Tepi dekat: rumah panggung, titian, dan kelapa ─────── */}
        {HOUSES.map((r, i) => {
          const top = NEAR_FLOOR - r.h;
          const roofTop = top - r.roof;
          const rust = i % 2 === 1;
          return (
            <g key={i}>
              {/* Tiang di atas air dan bayangannya */}
              {Array.from({ length: Math.round(r.w / 30) + 1 }, (_, k) => (
                <g key={k}>
                  <rect
                    x={r.x + 6 + k * 30}
                    y={NEAR_FLOOR}
                    width={6}
                    height={900 - NEAR_FLOOR}
                    fill={nearWoodDark}
                  />
                </g>
              ))}
              <rect
                x={r.x - 6}
                y={NEAR_FLOOR - 4}
                width={r.w + 12}
                height={10}
                fill={nearWoodDark}
              />
              {/* Dinding papan */}
              <rect x={r.x} y={top} width={r.w} height={r.h} fill={nearWood} />
              <path
                d={Array.from(
                  { length: Math.floor(r.h / 9) },
                  (_, k) => `M${r.x} ${top + 9 * (k + 1)}h${r.w}`,
                ).join("")}
                stroke={nearWoodDark}
                strokeOpacity={0.5}
                strokeWidth={1}
              />
              <rect
                x={r.x}
                y={top}
                width={r.w}
                height={r.h}
                fill="url(#kShade)"
              />
              {/* Atap seng: bidang yang terkena cahaya dan alurnya */}
              <path
                d={`M ${r.x - 18} ${top + 2} L ${r.x + r.w / 2} ${roofTop} L ${r.x + r.w + 18} ${top + 2} Z`}
                fill={rust ? roofRust : roofCol}
              />
              <path
                d={`M ${r.x + r.w / 2} ${roofTop} L ${sunFromLeft ? r.x - 18 : r.x + r.w + 18} ${top + 2} L ${r.x + r.w / 2} ${top + 2} Z`}
                fill="#ffffff"
                opacity={litFace * 0.22}
              />
              <path
                d={Array.from({ length: 12 }, (_, k) => {
                  const f = (k + 0.5) / 12;
                  return `M${r.x + r.w / 2} ${roofTop}L${r.x - 18 + f * (r.w + 36)} ${top + 2}`;
                }).join("")}
                stroke="#000"
                strokeOpacity={0.12}
              />
              {/* Jendela dan pintu: gelap siang hari, hangat menyala saat malam */}
              {[0.18, 0.62].map((f, k) => {
                const on = hash(i * 5 + k) < lamps * 1.1;
                const wx = r.x + r.w * f;
                const wy = top + r.h * 0.28;
                return (
                  <g key={k}>
                    {on && (
                      <circle
                        cx={wx + 14}
                        cy={wy + 14}
                        r={70}
                        fill="url(#kLamp)"
                        opacity={0.55}
                      />
                    )}
                    <rect
                      x={wx}
                      y={wy}
                      width={28}
                      height={30}
                      fill={on ? warmLight : lit("#2b2420", "#0a0807")}
                    />
                    <path
                      d={`M${wx + 14} ${wy}v30M${wx} ${wy + 15}h28`}
                      stroke={nearWoodDark}
                      strokeWidth={2}
                    />
                  </g>
                );
              })}
              <rect
                x={r.x + r.w * 0.42}
                y={top + r.h * 0.32}
                width={24}
                height={r.h * 0.68}
                fill={nearWoodDark}
              />
            </g>
          );
        })}
        {/* Titian kayu ke air dan perahu tertambat */}
        <rect
          x="410"
          y={NEAR_FLOOR + 6}
          width="300"
          height="7"
          fill={nearWoodDark}
        />
        {Array.from({ length: 6 }, (_, k) => (
          <rect
            key={k}
            x={420 + k * 55}
            y={NEAR_FLOOR + 12}
            width="5"
            height={900 - NEAR_FLOOR}
            fill={nearWoodDark}
          />
        ))}
        <path
          d="M 520 846 Q 640 866 780 846 L 768 832 L 532 832 Z"
          fill={nearWoodDark}
        />
        <rect x="590" y="816" width="110" height="18" rx="3" fill={nearWood} />
        {/* Kelapa di depan */}
        {PALMS_NEAR.map((p, i) => (
          <g key={i}>
            <path d={p.trunk} fill={palmTrunk} />
            <path d={p.fronds} fill={palmLeaf} />
          </g>
        ))}
        <rect width="1600" height="900" fill={hz} opacity={0.16 * h} />

        {/* Gumpalan kabut yang melayang pelan */}
        <g opacity={Math.min(1, h * 1.4)}>
          {Array.from({ length: 7 }, (_, i) => (
            <ellipse
              key={i}
              className="kabut-drift"
              style={{
                animationDuration: `${38 + i * 9}s`,
                animationDelay: `${-i * 11}s`,
              }}
              cx={200 + i * 230}
              cy={430 + hash(i * 3.7) * 300}
              rx={340}
              ry={70 + hash(i) * 50}
              fill="url(#kPuff)"
            />
          ))}
        </g>
        <rect
          y="300"
          width="1600"
          height="600"
          fill="url(#kFloor)"
          opacity={0.35 * h}
        />
      </svg>
    </div>
  );
}
