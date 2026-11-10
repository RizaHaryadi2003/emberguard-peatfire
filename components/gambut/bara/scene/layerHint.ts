import { CELL_STATE_TEXT } from "@/config/bara-content";
import type { PeatLayerId } from "@/lib/peat";
import { CELL_ASH, CELL_QUENCHED, CELL_SMOLDER, type CellState } from "@/lib/smolder";

// Keterangan yang hanya muncul saat pembaca menunjuk tanah.
//
// Dahulu nama keempat lapisan selalu tertulis di atas bidang potong, sehingga
// kapsulnya justru menutupi isi tanah yang ingin diperlihatkan. Sekarang nama
// itu baru tampil pada lapisan yang sedang ditunjuk, satu per satu.

export type HintTone = "plain" | "ember" | "ash";

export type Hint = { text: string; tone: HintTone };

/** Pintu yang dipakai adegan 3D untuk menampilkan keterangan di atas halaman. */
export type LayerHintHandle = {
  show: (hint: Hint, clientX: number, clientY: number) => void;
  /** Geser keterangan yang sedang tampil tanpa mengganti isinya. */
  move: (clientX: number, clientY: number) => void;
  hide: () => void;
};

/** Nama singkat tiap lapisan, dipakai saat keadaan selnya yang lebih penting. */
const LAYER_NAME: Record<PeatLayerId, string> = {
  fibrik: "Fibrik",
  hemik: "Hemik",
  saprik: "Saprik",
  mineral: "Tanah mineral",
};

/** Isi tiap lapisan dengan kata yang singkat. */
const LAYER_CONTENT: Record<PeatLayerId, string> = {
  fibrik: "serat & akar masih utuh",
  hemik: "sisa tumbuhan setengah terurai",
  saprik: "halus, serat hampir hilang",
  mineral: "pasir & kerikil",
};

/** Keterangan sebuah lapisan yang belum tersentuh bara. */
export function describeLayer(layer: PeatLayerId): Hint {
  return { text: `${LAYER_NAME[layer]} · ${LAYER_CONTENT[layer]}`, tone: "plain" };
}

/**
 * Keterangan satu titik pada bidang potong.
 *
 * Keadaan sel didahulukan daripada nama lapisannya: menyebut "Saprik" pada
 * bagian yang gambutnya sudah habis terbakar akan menyesatkan pembaca.
 */
export function describeCell(state: CellState, layer: PeatLayerId): Hint {
  const label = CELL_STATE_TEXT[state].label;
  if (state === CELL_SMOLDER) return { text: `${label} · lapisan ${LAYER_NAME[layer]}`, tone: "ember" };
  if (state === CELL_ASH) return { text: `${label} · gambut sudah habis`, tone: "ash" };
  if (state === CELL_QUENCHED) return { text: `${label} · lapisan ${LAYER_NAME[layer]}`, tone: "ash" };
  return describeLayer(layer);
}

/** Jarak keterangan dari ujung kursor (piksel). */
const CURSOR_GAP = 14;

/** Jarak terkecil keterangan dari tepi modul (piksel). */
const EDGE_MARGIN = 8;

/**
 * Letak sudut kiri atas keterangan di dalam modul.
 *
 * Bawaannya di kanan atas kursor agar tidak tertutup ujung penunjuk. Bila
 * ruangnya habis, keterangan pindah ke sisi seberang kursor, bukan sekadar
 * dijepit ke tepi, karena dijepit berarti tepat berada di bawah kursor.
 */
export function placeHint(
  x: number,
  y: number,
  width: number,
  height: number,
  boundsWidth: number,
  boundsHeight: number,
): { left: number; top: number } {
  let left = x + CURSOR_GAP;
  if (left + width > boundsWidth - EDGE_MARGIN) left = x - CURSOR_GAP - width;

  let top = y - CURSOR_GAP - height;
  if (top < EDGE_MARGIN) top = y + CURSOR_GAP;

  return {
    left: Math.max(EDGE_MARGIN, Math.min(left, boundsWidth - EDGE_MARGIN - width)),
    top: Math.max(EDGE_MARGIN, Math.min(top, boundsHeight - EDGE_MARGIN - height)),
  };
}

/** Perangkat tanpa kursor: keterangannya harus dibuka dengan ketukan. */
export function isTouchOnly(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;
}
