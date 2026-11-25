import {
  BRONCHI,
  BRONCHIOLE,
  CARINA,
  CLUSTER_STEMS,
  DIAPHRAGM_PATH,
  FISSURES,
  LENS,
  LUNG_L_PATH,
  LUNG_R_PATH,
  SACS,
  TRACHEA,
  TREES,
  ZOOM_SPOT,
  type Branch,
  type Pt,
} from "./lungGeometry";

// Gambar paru-paru Babak 03: vektor datar bernada lembut agar menyatu dengan
// latar gelap. Trakea, bronkus, kedua paru dengan pohon bronkusnya, diafragma
// tipis, dan lensa yang memperbesar gugus alveolus. Kepala dan leher tetap
// dari ilustrasi Wikipedia (lihat BreathView).

const VIEW = "0 0 907.08 966.42";

/** Ruas bertitik menjadi kurva halus (Catmull-Rom ke Bézier kubik). */
function smooth(pts: Pt[]): string {
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d += ` C${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6} ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6} ${p2.x} ${p2.y}`;
  }
  return d;
}

const branchD = (b: Branch) => `M${b.a.x} ${b.a.y} Q${b.c.x} ${b.c.y} ${b.b.x} ${b.b.y}`;

/** Cincin tulang rawan: garis pendek tegak lurus garis tengah trakea. */
function tracheaRings(count: number): string {
  const segs: string[] = [];
  const pts = [...TRACHEA, CARINA];
  const lens = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
  const total = lens.reduce((a, b) => a + b, 0);
  for (let k = 0; k < count; k++) {
    let d = ((k + 0.5) / count) * total * 0.94;
    let i = 0;
    while (d > lens[i]) d -= lens[i++];
    const a = pts[i];
    const b = pts[i + 1];
    const f = d / lens[i];
    const x = a.x + (b.x - a.x) * f;
    const y = a.y + (b.y - a.y) * f;
    const nx = -(b.y - a.y) / lens[i];
    const ny = (b.x - a.x) / lens[i];
    const h = 11;
    // Huruf C: sedikit melengkung ke bawah.
    segs.push(
      `M${x - nx * h} ${y - ny * h} Q${x} ${y + 3.5} ${x + nx * h} ${y + ny * h}`,
    );
  }
  return segs.join(" ");
}

/** Dua garis singgung dari titik yang diperbesar ke tepi lensa. */
function lensLinks(spotR: number): string {
  const dx = LENS.cx - ZOOM_SPOT.x;
  const dy = LENS.cy - ZOOM_SPOT.y;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  return [1, -1]
    .map(
      (s) =>
        `M${ZOOM_SPOT.x + nx * spotR * s} ${ZOOM_SPOT.y + ny * spotR * s} L${LENS.cx + nx * LENS.r * s} ${LENS.cy + ny * LENS.r * s}`,
    )
    .join(" ");
}

const TRACHEA_D = smooth([...TRACHEA, CARINA]);
const RINGS_D = tracheaRings(17);

export default function LungArt({
  breathId,
  breathSec,
}: {
  breathId: number;
  /** Lama satu tarikan napas (detik), sama dengan lama perjalanan butir. */
  breathSec: number;
}) {
  return (
    <svg viewBox={VIEW} className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <radialGradient id="lung-fill" cx="0.45" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#f2b4b4" />
          <stop offset="0.6" stopColor="#e0939a" />
          <stop offset="1" stopColor="#b8656f" />
        </radialGradient>
        <linearGradient id="lung-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe1dc" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffe1dc" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="airway" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c9b7a6" />
          <stop offset="0.5" stopColor="#f3e6d8" />
          <stop offset="1" stopColor="#c9b7a6" />
        </linearGradient>
        <radialGradient id="lens-bg" cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#2b2124" />
          <stop offset="1" stopColor="#171315" />
        </radialGradient>
        <radialGradient id="sac" cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#ffd3d3" />
          <stop offset="0.55" stopColor="#eb9ea4" />
          <stop offset="1" stopColor="#c2707c" />
        </radialGradient>
        <clipPath id="lung-r-clip">
          <path d={LUNG_R_PATH} />
        </clipPath>
        <clipPath id="lung-l-clip">
          <path d={LUNG_L_PATH} />
        </clipPath>
        <clipPath id="lens-clip">
          <circle cx={LENS.cx} cy={LENS.cy} r={LENS.r} />
        </clipPath>
      </defs>
      <style>{`
        @keyframes lung-inhale {
          0% { transform: scale(1); }
          45% { transform: scale(1.035, 1.05); }
          100% { transform: scale(1); }
        }
        .lung-breath { transform-origin: 445px 560px; transform-box: view-box; }
        .lung-breath[data-on="1"] { animation: lung-inhale ${breathSec}s ease-in-out; }
        @media (prefers-reduced-motion: reduce) {
          .lung-breath[data-on="1"] { animation: none; }
        }
      `}</style>

      {/* Diafragma: hanya lengkung tipis, bukan bidang besar. */}
      <path
        d={DIAPHRAGM_PATH}
        fill="none"
        stroke="#c98a72"
        strokeOpacity="0.45"
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* Kunci diganti tiap tarikan napas agar animasi mengembang diulang. */}
      <g key={breathId} className="lung-breath" data-on={breathId > 0 ? 1 : 0}>
        {(
          [
            ["R", LUNG_R_PATH, "lung-r-clip"],
            ["L", LUNG_L_PATH, "lung-l-clip"],
          ] as const
        ).map(([side, d, clip]) => (
          <g key={side}>
            <path d={d} fill="url(#lung-fill)" />
            <g clipPath={`url(#${clip})`}>
              {/* Bayang lembut di tepi dalam memberi kesan membulat. */}
              <path
                d={d}
                fill="none"
                stroke="#8f4553"
                strokeOpacity="0.35"
                strokeWidth="26"
              />
              {FISSURES.filter((_, i) => (side === "R" ? i < 2 : i === 2)).map(
                (f) => (
                  <path
                    key={f}
                    d={f}
                    fill="none"
                    stroke="#9c4f5d"
                    strokeOpacity="0.55"
                    strokeWidth="1.6"
                  />
                ),
              )}
              {/* Pohon bronkus: lapis lebar redup lalu garis terang. */}
              {TREES[side].map((b, i) => (
                <path
                  key={`w${i}`}
                  d={branchD(b)}
                  fill="none"
                  stroke="#9a4352"
                  strokeOpacity="0.35"
                  strokeWidth={b.width + 3}
                  strokeLinecap="round"
                />
              ))}
              {TREES[side].map((b, i) => (
                <path
                  key={`t${i}`}
                  d={branchD(b)}
                  fill="none"
                  stroke="#fff1ea"
                  strokeOpacity={0.9 - b.gen * 0.08}
                  strokeWidth={Math.max(1, b.width * 0.7)}
                  strokeLinecap="round"
                />
              ))}
            </g>
            <path
              d={d}
              fill="none"
              stroke="url(#lung-rim)"
              strokeWidth="1.5"
            />
          </g>
        ))}

        {/* Bronkus utama. */}
        {(["R", "L"] as const).map((s) => (
          <g key={s}>
            <path
              d={smooth(BRONCHI[s])}
              fill="none"
              stroke="#8a7465"
              strokeWidth={s === "R" ? 19 : 16}
              strokeLinecap="round"
            />
            <path
              d={smooth(BRONCHI[s])}
              fill="none"
              stroke="#eedfd0"
              strokeWidth={s === "R" ? 15 : 12}
              strokeLinecap="round"
            />
          </g>
        ))}
      </g>

      {/* Trakea bercincin tulang rawan. */}
      <path
        d={TRACHEA_D}
        fill="none"
        stroke="#8a7465"
        strokeWidth="27"
        strokeLinecap="round"
      />
      <path
        d={TRACHEA_D}
        fill="none"
        stroke="#eedfd0"
        strokeWidth="23"
        strokeLinecap="round"
      />
      <path
        d={RINGS_D}
        fill="none"
        stroke="#b49a86"
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Lensa: titik kecil di paru kiri diperbesar menjadi gugus alveolus. */}
      <circle
        cx={ZOOM_SPOT.x}
        cy={ZOOM_SPOT.y}
        r="11"
        fill="none"
        stroke="#fff"
        strokeOpacity="0.7"
        strokeWidth="1.5"
      />
      <path
        d={lensLinks(11)}
        stroke="#fff"
        strokeOpacity="0.22"
        strokeWidth="1"
      />
      <circle cx={LENS.cx} cy={LENS.cy} r={LENS.r} fill="url(#lens-bg)" />
      <g clipPath="url(#lens-clip)">
        {/* Bronkiolus menuju tiap gugus. */}
        {CLUSTER_STEMS.map((c, i) => {
          const d = smooth([...BRONCHIOLE, c]);
          return (
            <g key={i}>
              <path d={d} fill="none" stroke="#9a5562" strokeWidth="15" strokeLinecap="round" />
              <path d={d} fill="none" stroke="#f0c2be" strokeWidth="10" strokeLinecap="round" />
            </g>
          );
        })}
        {SACS.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill="url(#sac)"
            stroke="#a95a68"
            strokeOpacity="0.6"
            strokeWidth="1.2"
          />
        ))}
        {/* Pembuluh kapiler tipis yang melilit kantong. */}
        {SACS.map((s, i) => (
          <path
            key={`c${i}`}
            d={`M${s.x - s.r * 0.9} ${s.y + s.r * 0.1} Q${s.x - s.r * 0.2} ${s.y - s.r * (0.5 + (i % 3) * 0.15)} ${s.x + s.r * 0.85} ${s.y - s.r * 0.15}`}
            fill="none"
            stroke={i % 2 ? "#c94a5a" : "#6d7fc0"}
            strokeOpacity="0.45"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        ))}
      </g>
      <circle
        cx={LENS.cx}
        cy={LENS.cy}
        r={LENS.r}
        fill="none"
        stroke="#fff"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
    </svg>
  );
}
