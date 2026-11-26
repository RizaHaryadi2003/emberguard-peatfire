// Siluet rangkong badak (Buceros rhinoceros) terbang, tampak samping,
// menghadap ke kanan. Badan, sayap, dan ekor digambar untuk proyek ini;
// kepala diambil dari siluet berlisensi CC0 (lihat HORNBILL_HEAD).
// Koordinat dalam HORNBILL_VIEWBOX dengan bahu di WING_PIVOT. Ciri yang
// dijaga supaya tetap dikenali walau hitam polos: paruh besar melengkung ke
// bawah, balung di atas paruh yang ujungnya melengkung ke atas seperti cula,
// leher tebal, sayap lebar dengan bulu primer yang merenggang di ujung, dan
// ekor panjang yang melebar ke ujung.

/** Badan, leher, dan ekor (kepala ditempel terpisah, lihat HORNBILL_HEAD). */
export const HORNBILL_BODY =
  // pangkal ekor atas → punggung → bahu → tengkuk
  "M -50 -14 C -30 -24 6 -28 30 -24 " +
  "C 40 -27 48 -31 56 -34 " +
  // ujung leher tertutup kepala
  "L 70 -40 L 93 -26 " +
  // leher depan → dada → perut
  "C 86 -12 64 2 32 12 " +
  "C 12 18 -16 18 -36 12 " +
  "C -42 10 -46 8 -52 6 " +
  // ekor panjang yang melebar ke ujung, ujungnya hampir lurus
  "C -74 9 -100 16 -124 21 " +
  "C -128 22 -131 20 -132 16 " +
  "C -134 6 -135 -2 -135 -10 " +
  "C -135 -14 -132 -16 -128 -16 " +
  "C -102 -16 -74 -15 -50 -14 Z";

/**
 * Kepala, paruh, dan balung rangkong badak dari siluet PhyloPic karya
 * Ferran Sayol (CC0 1.0, domain publik):
 * https://www.phylopic.org/images/6c6ccca8-64e1-4cf0-914b-992ba77de847
 *
 * Jalur aslinya (keluaran potrace) memakai sistem koordinat gambar 1019 × 1536
 * yang dibalik lewat `transform`. Hanya bagian kepala yang dipakai: dipotong
 * dengan HEAD_CLIP, lalu dipindah ke leher badan lewat HEAD_TRANSFORM.
 */
export const HORNBILL_HEAD = {
  d: "M7645 15352 c-23 -22 -214 -126 -324 -176 -174 -80 -312 -132 -646 -246 -490 -167 -796 -297 -983 -421 -136 -89 -232 -203 -310 -366 -35 -74 -36 -79 -42 -233 l-6 -156 -66 -89 c-114 -151 -201 -354 -245 -570 -28 -141 -26 -472 5 -623 51 -251 109 -382 289 -654 219 -328 253 -431 172 -523 -41 -46 -98 -62 -289 -81 -177 -17 -288 -50 -575 -169 -1125 -466 -2032 -1228 -2612 -2195 -82 -136 -497 -909 -588 -1095 -196 -400 -296 -686 -359 -1025 -45 -243 -67 -437 -111 -995 -32 -414 -51 -592 -81 -795 -13 -91 -24 -171 -24 -177 0 -10 38 -13 155 -13 85 0 155 -1 155 -3 0 -22 -71 -246 -107 -335 -44 -113 -69 -169 -258 -576 -138 -300 -189 -467 -320 -1061 -36 -165 -99 -433 -140 -595 -175 -699 -248 -1067 -294 -1485 -22 -200 -41 -478 -41 -611 l0 -86 58 7 c237 28 602 151 689 232 41 39 64 106 148 433 121 473 141 514 312 656 217 180 358 328 455 479 69 107 92 158 158 350 92 268 113 303 228 374 69 44 162 146 222 246 97 161 169 352 265 710 31 116 78 284 105 375 68 228 99 362 174 755 127 666 143 721 221 767 30 17 161 42 190 36 10 -2 -4 -18 -39 -44 -32 -26 -61 -59 -75 -86 -19 -41 -58 -245 -47 -255 2 -2 32 10 67 28 92 46 273 103 444 139 372 78 516 127 665 226 40 26 95 51 140 63 156 44 551 111 884 151 94 11 190 23 214 26 l42 5 -17 31 c-24 41 -92 102 -142 128 -61 31 -140 48 -298 64 -78 9 -157 22 -176 30 -123 51 -83 199 171 631 212 360 382 562 727 865 431 379 601 602 850 1113 128 263 193 422 231 564 24 91 27 121 34 398 11 407 18 436 139 597 220 294 384 621 456 908 97 390 29 744 -197 1024 -75 93 -211 213 -316 279 -62 39 -63 40 -40 55 86 57 152 152 239 343 67 145 113 225 163 278 38 40 356 255 565 381 369 222 816 409 1137 475 309 64 677 71 1042 20 53 -8 99 -12 101 -9 12 12 -25 121 -61 176 -92 142 -259 269 -536 407 -463 231 -793 313 -1202 297 -277 -10 -464 -36 -1018 -142 -189 -36 -348 -64 -353 -62 -5 2 50 55 123 118 348 302 473 455 508 626 13 61 10 100 -5 86z",
  /** Pembalik koordinat potrace ke koordinat gambar (0..1019 × 0..1536). */
  sourceTransform: "translate(0 1536) scale(0.1 -0.1)",
  /** Kotak potong kepala dalam koordinat gambar. */
  clip: { x: 490, y: -10, w: 540, h: 300 },
  /** Pangkal leher (koordinat gambar) ditempel ke (72, −24), miring 22° agar paruh ke depan bawah. */
  transform: "translate(72 -24) rotate(22) scale(0.21) translate(-625 -305)",
} as const;

/**
 * Sayap terangkat penuh (bahu di WING_PIVOT). Saat dikepakkan, bentuk ini
 * dicerminkan ke bawah lewat skala tegak, jadi satu bentuk cukup untuk
 * seluruh kepakan.
 */
export const HORNBILL_WING =
  "M -26 -18 " +
  // tepi belakang (bulu sekunder bergerigi halus) naik ke ujung sayap
  "C -32 -34 -40 -50 -46 -66 " +
  "C -50 -80 -52 -96 -50 -108 " +
  // lima bulu primer yang merenggang, ujungnya runcing
  "C -52 -122 -50 -134 -46 -139 C -43 -130 -40 -124 -36 -121 " +
  "C -34 -132 -30 -142 -24 -147 C -21 -136 -18 -128 -15 -124 " +
  "C -12 -136 -8 -146 -1 -150 C 1 -138 3 -130 4 -126 " +
  "C 8 -136 13 -142 19 -144 C 19 -134 20 -127 21 -121 " +
  "C 26 -128 30 -129 34 -128 C 31 -119 28 -112 26 -108 " +
  // tepi depan melengkung turun kembali ke bahu
  "C 32 -90 38 -62 36 -20 Z";

/** Titik putar sayap (bahu). */
export const WING_PIVOT = { x: 6, y: -20 } as const;

/** Kotak gambar (viewBox) yang memuat sayap terangkat dan terkulai penuh. */
export const HORNBILL_VIEWBOX = { x: -142, y: -155, w: 334, h: 300 } as const;

/**
 * Jangkauan siluet dari bahu (satuan gambar): ke ujung paruh, ke pangkal
 * leher (batas depan badan), dan ke ujung ekor.
 */
export const HORNBILL_REACH = { front: 166, neck: 60, back: 141 } as const;
