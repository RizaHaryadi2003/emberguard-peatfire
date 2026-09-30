// Pembangkit bilangan acak semu yang dapat diulang. Dipakai agar tata letak
// tumbuhan, batu, dan titik sulut selalu sama setiap halaman dimuat, sehingga
// tangkapan layar pada naskah skripsi dapat direproduksi.

/**
 * Pembangkit Lehmer (konstanta 16807, modulus 2^31−1).
 * Mengembalikan fungsi yang menghasilkan bilangan 0–1 secara berurutan.
 */
export function seeded(seed: number): () => number {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}
