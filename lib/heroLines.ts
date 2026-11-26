// Garis lingkaran bergaya goresan tangan pada beranda.
//
// Setiap garis adalah lingkaran lonjong yang tepinya sedikit bergelombang,
// digambar dalam kotak 1000 × 1000 dengan titik pusat (500, 500). SVG-nya
// direntangkan ke seluruh layar, jadi lonjongnya ikut melebar ke kiri-kanan
// dan pada akhir animasi hanya lengkungan di tepi layar yang tampak.

/** Ukuran kotak gambar (satuan SVG). */
export const LINE_BOX = 1000;
const CENTER = LINE_BOX / 2;

/** Bentuk satu garis: jari-jari, kemiringan, dan takaran gelombang tepinya. */
export type LoopSpec = {
  rx: number;
  ry: number;
  /** Kemiringan dalam radian. */
  tilt: number;
  /** Takaran gelombang (pecahan jari-jari) dan pergeseran fasenya. */
  waves: { amp: number; freq: number; phase: number }[];
  width: number;
  opacity: number;
};

/** Lima garis yang saling bertumpuk; nilainya tetap supaya gambar selalu sama. */
export const HERO_LOOPS: LoopSpec[] = [
  { rx: 470, ry: 560, tilt: 0.02, waves: [{ amp: 0.012, freq: 2, phase: 0.4 }, { amp: 0.008, freq: 3, phase: 1.9 }], width: 1.1, opacity: 0.9 },
  { rx: 455, ry: 545, tilt: -0.03, waves: [{ amp: 0.016, freq: 2, phase: 2.2 }, { amp: 0.006, freq: 5, phase: 0.7 }], width: 0.8, opacity: 0.7 },
  { rx: 482, ry: 575, tilt: 0.05, waves: [{ amp: 0.01, freq: 3, phase: 3.1 }, { amp: 0.009, freq: 2, phase: 5.0 }], width: 0.7, opacity: 0.55 },
  { rx: 440, ry: 530, tilt: -0.06, waves: [{ amp: 0.02, freq: 2, phase: 4.4 }, { amp: 0.005, freq: 4, phase: 2.6 }], width: 0.6, opacity: 0.45 },
  { rx: 494, ry: 590, tilt: 0.0, waves: [{ amp: 0.014, freq: 3, phase: 0.1 }, { amp: 0.007, freq: 2, phase: 3.7 }], width: 0.5, opacity: 0.35 },
];

/** Jumlah titik sampel per garis; cukup halus tanpa membebani SVG. */
const SAMPLES = 72;

const round = (v: number) => Math.round(v * 10) / 10;

/** Titik-titik di tepi satu garis, berurutan searah jarum jam. */
export function loopPoints(spec: LoopSpec, samples = SAMPLES): [number, number][] {
  const cos = Math.cos(spec.tilt);
  const sin = Math.sin(spec.tilt);
  const points: [number, number][] = [];
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * Math.PI * 2;
    const k = 1 + spec.waves.reduce((sum, w) => sum + w.amp * Math.sin(w.freq * t + w.phase), 0);
    const x = spec.rx * k * Math.cos(t);
    const y = spec.ry * k * Math.sin(t);
    points.push([CENTER + x * cos - y * sin, CENTER + x * sin + y * cos]);
  }
  return points;
}

/**
 * Lintasan SVG tertutup dan halus melalui semua titik (kurva Catmull-Rom
 * yang diubah menjadi kurva Bézier kubik).
 */
export function loopPath(spec: LoopSpec): string {
  const p = loopPoints(spec);
  const n = p.length;
  const at = (i: number) => p[(i + n) % n];
  let d = `M${round(p[0][0])} ${round(p[0][1])}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${round(p2[0])} ${round(p2[1])}`;
  }
  return `${d}Z`;
}

/**
 * Skala awal agar garis yang sudah direntangkan ke layar tampak sebagai
 * lingkaran kecil di tengah (jari-jari `radiusVh` × tinggi layar, tetapi
 * tidak lebih dari 0,4 × lebar layar supaya di ponsel tegak tetap muat).
 * Animasi pembuka lalu membawa skala ini ke 1 sehingga lingkaran melebar.
 */
export function introScale(viewportW: number, viewportH: number, radiusVh = 0.3): { sx: number; sy: number } {
  const avgRx = HERO_LOOPS.reduce((s, l) => s + l.rx, 0) / HERO_LOOPS.length;
  const avgRy = HERO_LOOPS.reduce((s, l) => s + l.ry, 0) / HERO_LOOPS.length;
  const radiusPx = Math.min(viewportH * radiusVh, viewportW * 0.4);
  return {
    sx: radiusPx / ((avgRx / LINE_BOX) * viewportW),
    sy: radiusPx / ((avgRy / LINE_BOX) * viewportH),
  };
}
