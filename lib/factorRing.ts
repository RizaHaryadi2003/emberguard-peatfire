// Lingkaran roda faktor pada beranda: hampir bulat, tetapi bersegi halus di
// setiap faktor, seperti lingkaran yang digambar dengan tangan lewat titik-titik.
//
// Jari-jari r(θ) = 1 − a·|sin(n(θ − θ₀)/2)|: tepat 1 di setiap faktor (sudut
// θ₀ + k·2π/n) dan sedikit masuk di antara dua faktor. Nilai mutlak sinus
// membuat sudut tumpul tepat di titik faktor; dengan a kecil sudut itu terasa
// tanpa mencolok.

/** Sudut faktor pertama: di atas (arah jam 12). */
export const FIRST_ANGLE = -Math.PI / 2;

/** Sudut faktor ke-i dari `count` faktor, searah jarum jam (sumbu y layar ke bawah). */
export function factorAngle(i: number, count: number): number {
  return FIRST_ANGLE + (2 * Math.PI * i) / count;
}

/** Jari-jari relatif lingkaran pada sudut θ. */
export function ringRadius(theta: number, count: number, corner: number): number {
  return 1 - corner * Math.abs(Math.sin((count * (theta - FIRST_ANGLE)) / 2));
}

/**
 * Lintasan SVG lingkaran dalam kotak `size` × `size`, dimulai dari faktor
 * pertama dan berjalan searah jarum jam, supaya bisa "digambar" berurutan.
 */
export function ringPath(count: number, size: number, corner = 0.022, samplesPerSide = 24): string {
  const half = size / 2;
  const total = count * samplesPerSide;
  const parts: string[] = [];
  for (let s = 0; s <= total; s++) {
    const theta = FIRST_ANGLE + (2 * Math.PI * s) / total;
    const r = ringRadius(theta, count, corner) * half;
    const x = half + r * Math.cos(theta);
    const y = half + r * Math.sin(theta);
    parts.push(`${s === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return parts.join(" ");
}
