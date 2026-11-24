"use client";

import { hazeLevel } from "@/lib/model/haze";

// Babak 02 · Jendela Pontianak: pemandangan tepi Kapuas (ilustratif) yang
// memenuhi layar di belakang panel. Kabut diletakkan di antara lapisan
// pemandangan, lebih tebal untuk lapisan yang lebih jauh, sehingga saat ISPU
// naik kota di seberang hilang lebih dulu, lalu jembatan, lalu sungainya —
// seperti jarak pandang yang memendek sungguhan.
//
// Hanya gradien dan bentuk SVG; tanpa filter blur, supaya ringan di laptop
// menengah (lihat catatan kinerja proyek).

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const css = (c: RGB) => `rgb(${c.map((v) => Math.round(v)).join(",")})`;
/** Campuran warna berjenjang: `stops` dibaca sepanjang t = 0…1. */
function ramp(stops: string[], t: number): string {
  const k = Math.min(1, Math.max(0, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(k));
  const f = k - i;
  const a = hex(stops[i]);
  const b = hex(stops[i + 1]);
  return css([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]);
}

/** Bilangan semu 0–1 yang tetap untuk masukan yang sama. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Kaki langit kota di seberang sungai: gedung, menara air, kubah. */
const SKYLINE = (() => {
  let x = 0;
  return Array.from({ length: 34 }, (_, i) => {
    const w = 26 + hash(i) * 46;
    const h = 24 + hash(i * 3.1) * 70 + (i % 7 === 3 ? 60 : 0);
    const b = { x, w, h, i };
    x += w + 4;
    return b;
  });
})();

/** Rumah panggung di tepi dekat (kiri dan kanan bawah). */
const HOUSES = [
  { x: -20, w: 230, h: 120, roof: 46 },
  { x: 240, w: 170, h: 100, roof: 40 },
  { x: 1310, w: 200, h: 110, roof: 44 },
  { x: 1500, w: 180, h: 120, roof: 44 },
];

export default function WindowView({ ispu }: { ispu: number }) {
  const h = hazeLevel(ispu);
  const hazeColor = ramp(["#d6dee4", "#d9c9a8", "#c79a63", "#8c6440"], h);
  const skyTop = ramp(["#5f9fd6", "#9fb6c4", "#b9925f", "#7a5434"], h);
  const skyLow = ramp(["#cfe5f2", "#e2d7bd", "#d9a565", "#a8763f"], h);
  const sun = ramp(["#fffbe8", "#ffe7a8", "#ff9a4a", "#e0542a"], h);
  const water = ramp(["#3f7aa0", "#6b7f7f", "#7e6a4c", "#4e3a28"], h);

  const skyline = SKYLINE;

  return (
    <div className="pointer-events-none fixed inset-0" aria-hidden>
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
        <defs>
          <linearGradient id="kSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={skyTop} />
            <stop offset="1" stopColor={skyLow} />
          </linearGradient>
          <radialGradient id="kSun">
            <stop offset="0" stopColor={sun} stopOpacity={1} />
            <stop offset="0.35" stopColor={sun} stopOpacity={0.55 - 0.25 * h} />
            <stop offset="1" stopColor={sun} stopOpacity={0} />
          </radialGradient>
          <linearGradient id="kWater" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={skyLow} />
            <stop offset="0.25" stopColor={water} />
            <stop offset="1" stopColor={ramp(["#21445c", "#3b4038", "#4a3a28", "#2c2017"], h)} />
          </linearGradient>
          <radialGradient id="kPuff">
            <stop offset="0" stopColor={hazeColor} stopOpacity={0.7} />
            <stop offset="1" stopColor={hazeColor} stopOpacity={0} />
          </radialGradient>
          <linearGradient id="kFloor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={hazeColor} stopOpacity={0} />
            <stop offset="1" stopColor={hazeColor} stopOpacity={1} />
          </linearGradient>
        </defs>

        {/* Langit dan matahari yang meredup menjadi cakram jingga */}
        <rect width="1600" height="900" fill="url(#kSky)" />
        <circle cx="1170" cy="250" r={200} fill="url(#kSun)" opacity={1 - 0.45 * h} />
        <circle cx="1170" cy="250" r={34} fill={sun} opacity={1 - 0.35 * h} />

        {/* Kota di seberang: paling jauh, paling cepat hilang */}
        <g fill={ramp(["#5b6c7c", "#6a6a60", "#7a5f45", "#5a4230"], h)} transform="translate(-10 0)">
          {skyline.map((b) => (
            <rect key={b.i} x={b.x * 1.02} y={500 - b.h} width={b.w} height={b.h} />
          ))}
          {/* Menara air dan kubah masjid sebagai penanda kota */}
          <rect x="612" y="372" width="10" height="70" />
          <ellipse cx="617" cy="368" rx="26" ry="18" />
          <path d="M 930 444 Q 960 380 990 444 Z" />
          <rect x="1002" y="388" width="6" height="56" />
        </g>
        <rect width="1600" height="520" fill={hazeColor} opacity={0.8 * h} />

        {/* Jembatan melintasi sungai, jarak menengah */}
        <g stroke={ramp(["#2f3d48", "#4a4a44", "#5a4632", "#4a3626"], h)} fill="none" strokeWidth="7">
          <path d="M -20 470 L 1620 470" />
          {Array.from({ length: 6 }, (_, i) => (
            <path key={i} d={`M ${i * 300 - 20} 470 Q ${i * 300 + 130} 400 ${i * 300 + 280} 470`} strokeWidth="5" />
          ))}
          {Array.from({ length: 7 }, (_, i) => (
            <path key={`p${i}`} d={`M ${i * 300 - 20} 470 L ${i * 300 - 20} 540`} strokeWidth="12" />
          ))}
        </g>
        {/* Tepi seberang: pepohonan dan atap */}
        <path
          d={`M 0 540 ${Array.from({ length: 41 }, (_, i) => `L ${i * 40} ${520 - hash(i * 2.3) * 26 - (i % 5 === 0 ? 14 : 0)}`).join(" ")} L 1600 545 L 1600 560 L 0 560 Z`}
          fill={ramp(["#2f4a36", "#4b5440", "#6b5236", "#4c3826"], h)}
        />
        <rect width="1600" height="560" fill={hazeColor} opacity={0.5 * h} />

        {/* Sungai Kapuas dengan riak */}
        <rect y="555" width="1600" height="345" fill="url(#kWater)" />
        {Array.from({ length: 26 }, (_, i) => {
          const y = 575 + hash(i * 1.9) * 260;
          const x = hash(i * 4.4) * 1500;
          const w = 40 + hash(i * 6.6) * 120 * ((y - 560) / 300 + 0.4);
          return <rect key={i} x={x} y={y} width={w} height={1.6} rx={1} fill="#ffffff" opacity={(0.18 - 0.12 * h) * (0.5 + hash(i))} />;
        })}
        {/* Pantulan matahari di air */}
        <rect x="1150" y="560" width="40" height="160" fill={sun} opacity={0.18 * (1 - h)} />
        <rect width="1600" height="900" y="555" fill={hazeColor} opacity={0.38 * h} />

        {/* Tepi dekat: rumah panggung di atas tiang, perahu klotok */}
        <g fill={ramp(["#2a2420", "#332b24", "#3a2c20", "#2a1f16"], h)}>
          {HOUSES.map((r, i) => (
            <g key={i}>
              <rect x={r.x} y={900 - r.h - 70} width={r.w} height={r.h} />
              <path d={`M ${r.x - 14} ${900 - r.h - 70} L ${r.x + r.w / 2} ${900 - r.h - 70 - r.roof} L ${r.x + r.w + 14} ${900 - r.h - 70} Z`} />
              {Array.from({ length: Math.round(r.w / 34) }, (_, k) => (
                <rect key={k} x={r.x + 8 + k * 34} y={900 - 72} width={7} height={72} />
              ))}
              <rect x={r.x + r.w * 0.3} y={900 - r.h - 40} width={r.w * 0.16} height={r.h * 0.34} fill={ramp(["#f3c46b", "#e9b257", "#d98a3a", "#b8682a"], h)} opacity={0.6} />
            </g>
          ))}
          <path d="M 560 805 Q 700 838 860 806 L 846 790 L 574 790 Z" />
          <rect x="640" y="770" width="120" height="22" rx="4" />
        </g>
        <rect width="1600" height="900" fill={hazeColor} opacity={0.18 * h} />

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
      </svg>
    </div>
  );
}
