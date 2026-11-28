// Gelombang halus di latar beranda saat logo turun dan lingkaran faktor
// terbentuk: beberapa cincin tipis melebar dari pusat roda seperti riak di
// permukaan air yang tenang, lalu memudar. Tepinya sedikit bergelombang
// (beberapa lekuk yang perlahan berputar) agar tidak tampak seperti
// lingkaran jangka.

/** Jumlah titik per cincin; cukup halus untuk garis rambut di layar besar. */
const SAMPLES = 144;

export type WaveShape = {
  /** Jari-jari rata-rata (px). */
  radius: number;
  /** Simpangan tepi terhadap jari-jari (bagian, mis. 0,01 = 1%). */
  wobble: number;
  /** Jumlah lekuk di sepanjang keliling. */
  lobes: number;
  /** Putaran lekuk (rad). */
  phase: number;
};

/** Jari-jari cincin pada sudut θ. */
export function waveRadius(theta: number, w: WaveShape): number {
  // Dua harmonik dengan arah putar berlawanan: lekuknya terasa mengalir.
  const a = Math.sin(w.lobes * theta + w.phase);
  const b = Math.sin((w.lobes + 2) * theta - 0.7 * w.phase + 1.3);
  return w.radius * (1 + w.wobble * (0.65 * a + 0.35 * b));
}

/** Lintasan SVG tertutup sebuah cincin berpusat di (cx, cy). */
export function wavePath(cx: number, cy: number, w: WaveShape): string {
  const parts: string[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    const theta = (2 * Math.PI * i) / SAMPLES;
    const r = waveRadius(theta, w);
    parts.push(`${i === 0 ? "M" : "L"}${(cx + r * Math.cos(theta)).toFixed(1)} ${(cy + r * Math.sin(theta)).toFixed(1)}`);
  }
  return parts.join(" ") + "Z";
}

/**
 * Keadaan satu cincin pada kemajuannya p (0..1): melebar dengan laju yang
 * melambat (seperti riak yang kehilangan tenaga), muncul lembut lalu memudar.
 */
export function waveAt(p: number, from: number, to: number): { radius: number; opacity: number; wobble: number } {
  const c = Math.min(1, Math.max(0, p));
  const ease = 1 - Math.pow(1 - c, 2.2);
  return {
    radius: from + (to - from) * ease,
    opacity: Math.sin(Math.PI * c) ** 1.5,
    // Riak muda lebih bergelombang, lalu merata saat melebar.
    wobble: 0.012 * (1 - 0.5 * c),
  };
}
