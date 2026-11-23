// Daftar shot purwarupa Simulasi: Babak 4, dari api menyala sampai bara
// muncul lagi (shot 4.1 dan 4.4–4.6 pada docs/md/simulasi, "Skrip Simulasi:
// Film Sinematik Interaktif").
//
// Aturan sinematik dokumen itu yang dipegang di sini:
//   - satu shot, satu gerakan kamera, dengan jalur kurva (CatmullRom);
//   - durasi shot 3–6 detik;
//   - kurva gerak power2.inOut, kecuali satu kejutan expo.out per babak;
//   - kamera tidak pernah benar-benar diam (melayang pelan saat menunggu).

/** Suasana cahaya; tiap suasana punya warna langit, kabut, dan cahaya sendiri. */
export type Look = "malam" | "pagi" | "bawah" | "siang";

export type Ease = "power2.inOut" | "sine.inOut" | "expo.out";

export type Shot = {
  id: string;
  /** Detik; Infinity = menunggu pembaca (kamera melayang). */
  duration: number;
  /** Titik jalur kamera dan titik bidiknya (koordinat dunia, m). */
  path: [number, number, number][];
  target: [number, number, number][];
  ease: Ease;
  look: Look;
  /** Kedalaman bidang (fokus dangkal) di shot sinema. */
  dof?: boolean;
  /** Teks layar: kata dalam `key` diwarnai oranye. */
  subtitle?: { text: string; key: string[] };
  /** Teks waktu di sudut, mis. "3 hari kemudian". */
  stamp?: string;
};

/** Puncak bongkahan (permukaan gambut) di dunia. */
const TOP = 0.2;

export const SHOTS = {
  /** 4.1 · Malam, wide shot rendah: api menyala di lahan. */
  api: {
    id: "4.1",
    duration: 5,
    path: [
      [7.5, 1.3, 9.5],
      [6.2, 1.0, 7.6],
    ],
    target: [
      [0, 0.7, 0],
      [0, 0.6, 0],
    ],
    ease: "power2.inOut",
    look: "malam",
    subtitle: { text: "Api datang di malam yang kering.", key: ["Api"] },
  },
  /** Menunggu keputusan: kamera melayang di atas api. */
  keputusan: {
    id: "keputusan",
    duration: Infinity,
    path: [[5.6, 1.6, 6.8]],
    target: [[0, 0.5, 0]],
    ease: "sine.inOut",
    look: "malam",
    subtitle: { text: "Api menyala. Apa yang kamu lakukan?", key: ["menyala"] },
  },
  /** Menyapu semprotan air: kamera lebih dekat ke nyala. */
  siram: {
    id: "siram",
    duration: Infinity,
    path: [[3.6, 2.2, 4.6]],
    target: [[0, 0.2, 0]],
    ease: "power2.inOut",
    look: "malam",
    subtitle: { text: "Tekan, lalu sapukan air di atas api.", key: ["sapukan"] },
  },
  /** 4.4 · Close-up lahan yang baru disiram, pagi pucat. */
  padam: {
    id: "4.4",
    duration: 4.5,
    path: [
      [2.6, 1.5, 3.2],
      [1.7, 1.0, 2.4],
    ],
    target: [
      [0.2, TOP, 0.2],
      [0, TOP, 0.2],
    ],
    ease: "power2.inOut",
    look: "pagi",
    dof: true,
    subtitle: { text: "Dari atas, ia tampak padam.", key: ["padam"] },
  },
  /** 4.5 · Shot khas: kamera turun menembus tanah ke penampang. */
  tembus: {
    id: "4.5",
    duration: 6.5,
    path: [
      [0.4, 1.4, 4.4],
      [0.2, 0.25, 4.7],
      [0, -1.1, 5.0],
    ],
    target: [
      [0, 0, 0.6],
      [0, -0.4, 1.0],
      [0, -0.9, 1.2],
    ],
    ease: "power2.inOut",
    look: "bawah",
    subtitle: { text: "Bara hidup di bawah, tempat air siraman tak sampai.", key: ["Bara"] },
  },
  /** 4.6 · Kamera naik kembali; asap tipis lalu nyala baru di tempat lain. */
  muncul: {
    id: "4.6",
    duration: 6,
    path: [
      [0, -1.0, 5.0],
      [1.2, 0.8, 6.2],
      [5.0, 2.8, 8.0],
    ],
    target: [
      [0, -0.8, 1.2],
      [-0.6, 0.3, 0],
      [-1.2, 0.4, 0],
    ],
    ease: "power2.inOut",
    look: "siang",
    stamp: "3 hari kemudian",
    subtitle: { text: "Ia muncul lagi.", key: ["muncul", "lagi"] },
  },
  /** Penutup purwarupa: melayang di atas nyala baru. */
  akhir: {
    id: "akhir",
    duration: Infinity,
    path: [[4.6, 2.4, 7.0]],
    target: [[-1.2, 0.4, 0]],
    ease: "sine.inOut",
    look: "siang",
  },
} satisfies Record<string, Shot>;

export type ShotKey = keyof typeof SHOTS;

/** Kurva gerak, sama dengan nama kurva GSAP di dokumen. */
export function ease(kind: Ease, t: number): number {
  const x = Math.min(1, Math.max(0, t));
  if (kind === "expo.out") return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
  if (kind === "sine.inOut") return -(Math.cos(Math.PI * x) - 1) / 2;
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}
