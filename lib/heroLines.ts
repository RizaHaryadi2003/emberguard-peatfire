// Garis lingkaran bergaya goresan tangan pada beranda.
//
// Setiap garis adalah lingkaran lonjong yang tepinya sedikit bergelombang,
// dihitung dalam kotak 1000 × 1000 dengan titik pusat (500, 500), lalu
// direntangkan ke seluruh layar. Karena itu lonjongnya ikut melebar ke
// kiri-kanan dan pada akhir animasi pembuka hanya lengkungan di tepi layar
// yang tampak.
//
// Gelombang di tepi garis terus bergeser searah jarum jam (lihat `spin`),
// sehingga keempat garis tampak berputar pelan dan saling bersilangan.

/** Ukuran kotak hitung (satuan bebas). */
export const LINE_BOX = 1000;
const CENTER = LINE_BOX / 2;

/** Bentuk satu garis: jari-jari, kemiringan, gelombang tepi, dan laju putar. */
export type LoopSpec = {
  rx: number;
  ry: number;
  /** Kemiringan dalam radian. */
  tilt: number;
  /** Takaran gelombang (pecahan jari-jari), banyak gelombang per putaran, dan fasenya. */
  waves: { amp: number; freq: number; phase: number }[];
  /** Laju geser gelombang searah jarum jam (radian per detik). */
  spin: number;
  /** Tebal garis dalam piksel CSS. */
  width: number;
  opacity: number;
};

/** Empat garis yang saling bertumpuk; nilainya tetap supaya gambar selalu sama. */
export const HERO_LOOPS: LoopSpec[] = [
  { rx: 470, ry: 560, tilt: 0.02, waves: [{ amp: 0.022, freq: 2, phase: 0.4 }, { amp: 0.01, freq: 3, phase: 1.9 }], spin: 0.11, width: 1.1, opacity: 0.9 },
  { rx: 456, ry: 545, tilt: -0.03, waves: [{ amp: 0.026, freq: 2, phase: 2.2 }, { amp: 0.008, freq: 5, phase: 0.7 }], spin: 0.08, width: 0.8, opacity: 0.7 },
  { rx: 482, ry: 575, tilt: 0.05, waves: [{ amp: 0.018, freq: 3, phase: 3.1 }, { amp: 0.012, freq: 2, phase: 5.0 }], spin: 0.14, width: 0.7, opacity: 0.55 },
  { rx: 444, ry: 532, tilt: -0.05, waves: [{ amp: 0.028, freq: 2, phase: 4.4 }, { amp: 0.007, freq: 4, phase: 2.6 }], spin: 0.06, width: 0.55, opacity: 0.45 },
];

/** Jumlah titik sampel per garis; cukup halus tanpa membebani gambar. */
export const SAMPLES = 72;

/**
 * Titik-titik di tepi satu garis (dalam kotak hitung), berurutan searah
 * jarum jam. `time` dalam detik menggeser gelombang sejauh `spin × time`.
 */
export function loopPoints(spec: LoopSpec, time = 0, samples = SAMPLES): [number, number][] {
  const cos = Math.cos(spec.tilt);
  const sin = Math.sin(spec.tilt);
  const shift = spec.spin * time;
  const points: [number, number][] = [];
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * Math.PI * 2;
    let k = 1;
    for (const w of spec.waves) k += w.amp * Math.sin(w.freq * (t - shift) + w.phase);
    const x = spec.rx * k * Math.cos(t);
    const y = spec.ry * k * Math.sin(t);
    points.push([CENTER + x * cos - y * sin, CENTER + x * sin + y * cos]);
  }
  return points;
}

/** Bagian dari CanvasRenderingContext2D yang dipakai untuk menggambar garis. */
export type PathSink = {
  moveTo(x: number, y: number): void;
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void;
  closePath(): void;
};

/**
 * Menggambar lintasan tertutup yang halus melalui semua titik (kurva
 * Catmull-Rom yang diubah menjadi kurva Bézier kubik).
 */
export function traceLoop(sink: PathSink, p: [number, number][]): void {
  const n = p.length;
  const at = (i: number) => p[(i + n) % n];
  sink.moveTo(p[0][0], p[0][1]);
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    sink.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) / 6,
      p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6,
      p2[1] - (p3[1] - p1[1]) / 6,
      p2[0],
      p2[1],
    );
  }
  sink.closePath();
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
