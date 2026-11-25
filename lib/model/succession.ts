// Model Modul 10 · Suksesi Gagal: berapa pohon yang tersisa di hutan rawa
// gambut sesudah satu, dua, atau lebih kebakaran.
//
// Sumber (lihat docs/md/acuan-modul/acuan-modul-suksesi-gagal.md):
//   A  Yeager dkk. (2003), Tropical Biodiversity 8(1):121–138: hutan rawa
//      gambut Tanjung Puting, transek 400 × 5 m, pohon hidup > 10 cm.
//   B  Hoscilo dkk. (2010), abstrak EGU2010-803: bagian lahan yang terbakar
//      berulang di bekas Proyek Lahan Gambut Sejuta Hektare.
//   D  Faradiba dkk. (2022), abstrak skripsi IPB: Rasau Jaya, Kubu Raya.

/** Jalur ukur (transek) dalam A: 400 m × 5 m. */
export const TRANSECT = { lengthM: 400, widthM: 5 } as const;
/** Luas satu transek dalam hektare (0,2 ha). */
export const TRANSECT_HA = (TRANSECT.lengthM * TRANSECT.widthM) / 10_000;

/** Jumlah kebakaran yang bisa dipilih: 0, 1, 2, atau 3 (= lebih dari dua kali). */
export type Fires = 0 | 1 | 2 | 3;
export const FIRES: readonly Fires[] = [0, 1, 2, 3];

/** Pohon hidup > 10 cm per hektare menurut jumlah kebakaran (A, Tabel 2 dan hlm. 129). */
export const TREES_PER_HA: Record<Fires, number> = {
  0: 975,
  1: 358.3,
  2: 53.8,
  3: 3,
};

/** Jumlah jenis pohon di seluruh transek hutan tidak terbakar (A, Tabel 2). */
export const SPECIES_UNBURNED = 61;

/** Semai dan pancang per m² di hutan tidak terbakar vs terbakar (A, hlm. 129). */
export const SEEDLINGS_PER_M2 = { unburned: 4.48, burned: 1.29 } as const;
export const SAPLINGS_PER_M2 = { unburned: 0.77, burned: 0.08 } as const;

/** Tambahan batang yang mati delapan bulan sesudah survei pertama (A, hlm. 130). */
export const LATER_LOSS = 0.347;

/** Bagian lahan yang terbakar berulang 1997–2005 (B). */
export const REBURNED_SHARE = { twice: 0.37, threeOrMore: 0.08 } as const;

/** Jumlah jenis tumbuhan di hutan lindung Rasau Jaya (D). */
export const RASAU_JAYA = { unburned: 36, burned: 8 } as const;

/** Jumlah pohon hidup dalam satu transek, dibulatkan. */
export function treesInTransect(fires: Fires): number {
  return Math.round(TREES_PER_HA[fires] * TRANSECT_HA);
}

/** Bagian pohon yang tersisa dibanding hutan yang tidak pernah terbakar (0–1). */
export function remainingShare(fires: Fires): number {
  return TREES_PER_HA[fires] / TREES_PER_HA[0];
}

/** Bilangan semu 0–1 yang tetap untuk masukan yang sama. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export type TransectTree = {
  /** Jarak dari awal transek (m). */
  x: number;
  /** Jarak dari garis tengah transek (m), −2,5 sampai 2,5. */
  y: number;
  /** Kebakaran terbanyak yang masih bisa dilewati pohon ini (0–3). */
  survives: Fires;
  /** Ukuran relatif 0–1 untuk gambar (diameter dan tinggi). */
  size: number;
};

/**
 * Pohon-pohon dalam satu transek hutan utuh, dengan pohon yang selamat dari
 * kebakaran berikutnya selalu bagian dari yang selamat sebelumnya, supaya
 * gambar tetap menyambung saat jumlah kebakaran ditambah. Jumlah yang
 * selamat tepat sama dengan treesInTransect(); ilustratif hanya letaknya.
 */
export function transectTrees(seed = 3): TransectTree[] {
  const total = treesInTransect(0);
  // Urutan acak tetap; yang paling depan paling tahan api.
  const order = Array.from({ length: total }, (_, i) => i).sort(
    (a, b) => hash(a * 7.3 + seed) - hash(b * 7.3 + seed),
  );
  const rank = new Map(order.map((idx, r) => [idx, r]));
  return Array.from({ length: total }, (_, i) => {
    const r = rank.get(i)!;
    let survives: Fires = 0;
    for (const f of FIRES) if (r < treesInTransect(f)) survives = f;
    return {
      x: ((i + hash(i * 3.1 + seed)) / total) * TRANSECT.lengthM,
      y: (hash(i * 5.7 + seed) - 0.5) * TRANSECT.widthM,
      survives,
      size: 0.35 + hash(i * 9.1 + seed) * 0.65,
    };
  });
}

/** Pohon yang masih hidup sesudah sejumlah kebakaran. */
export function aliveAfter(trees: readonly TransectTree[], fires: Fires): TransectTree[] {
  return trees.filter((t) => t.survives >= fires);
}
