// Bentuk rangkong badak (Buceros rhinoceros) untuk pembuka: kepala, paruh,
// dan balung dari siluet berlisensi CC0, serta jangkauan badan. Model 3D
// lengkapnya ada di hornbill3d/.

/**
 * Kepala, paruh, dan balung rangkong badak dari siluet PhyloPic karya
 * Ferran Sayol (CC0 1.0, domain publik):
 * https://www.phylopic.org/images/6c6ccca8-64e1-4cf0-914b-992ba77de847
 *
 * Jalur aslinya (keluaran potrace) memakai sistem koordinat gambar 1019 × 1536
 * yang dibalik lewat translate(0 1536) scale(0.1 −0.1). Hanya bagian kepala
 * yang dipakai (di dalam `clip`), lalu dipindah ke leher lewat `place`;
 * lihat hornbill3d/head.ts.
 */
export const HORNBILL_HEAD = {
  d: "M7645 15352 c-23 -22 -214 -126 -324 -176 -174 -80 -312 -132 -646 -246 -490 -167 -796 -297 -983 -421 -136 -89 -232 -203 -310 -366 -35 -74 -36 -79 -42 -233 l-6 -156 -66 -89 c-114 -151 -201 -354 -245 -570 -28 -141 -26 -472 5 -623 51 -251 109 -382 289 -654 219 -328 253 -431 172 -523 -41 -46 -98 -62 -289 -81 -177 -17 -288 -50 -575 -169 -1125 -466 -2032 -1228 -2612 -2195 -82 -136 -497 -909 -588 -1095 -196 -400 -296 -686 -359 -1025 -45 -243 -67 -437 -111 -995 -32 -414 -51 -592 -81 -795 -13 -91 -24 -171 -24 -177 0 -10 38 -13 155 -13 85 0 155 -1 155 -3 0 -22 -71 -246 -107 -335 -44 -113 -69 -169 -258 -576 -138 -300 -189 -467 -320 -1061 -36 -165 -99 -433 -140 -595 -175 -699 -248 -1067 -294 -1485 -22 -200 -41 -478 -41 -611 l0 -86 58 7 c237 28 602 151 689 232 41 39 64 106 148 433 121 473 141 514 312 656 217 180 358 328 455 479 69 107 92 158 158 350 92 268 113 303 228 374 69 44 162 146 222 246 97 161 169 352 265 710 31 116 78 284 105 375 68 228 99 362 174 755 127 666 143 721 221 767 30 17 161 42 190 36 10 -2 -4 -18 -39 -44 -32 -26 -61 -59 -75 -86 -19 -41 -58 -245 -47 -255 2 -2 32 10 67 28 92 46 273 103 444 139 372 78 516 127 665 226 40 26 95 51 140 63 156 44 551 111 884 151 94 11 190 23 214 26 l42 5 -17 31 c-24 41 -92 102 -142 128 -61 31 -140 48 -298 64 -78 9 -157 22 -176 30 -123 51 -83 199 171 631 212 360 382 562 727 865 431 379 601 602 850 1113 128 263 193 422 231 564 24 91 27 121 34 398 11 407 18 436 139 597 220 294 384 621 456 908 97 390 29 744 -197 1024 -75 93 -211 213 -316 279 -62 39 -63 40 -40 55 86 57 152 152 239 343 67 145 113 225 163 278 38 40 356 255 565 381 369 222 816 409 1137 475 309 64 677 71 1042 20 53 -8 99 -12 101 -9 12 12 -25 121 -61 176 -92 142 -259 269 -536 407 -463 231 -793 313 -1202 297 -277 -10 -464 -36 -1018 -142 -189 -36 -348 -64 -353 -62 -5 2 50 55 123 118 348 302 473 455 508 626 13 61 10 100 -5 86z",
  /** Kotak potong kepala dalam koordinat gambar (setelah dibalik: translate(0 1536) scale(0.1 −0.1)). */
  clip: { x: 490, y: -10, w: 540, h: 300 },
  /** Titik gambar (ox, oy) ditempel ke (x, y) profil, diputar dan diskalakan agar paruh ke depan bawah. */
  place: { x: 91.5, y: -30, rotate: 22, scale: 0.17, ox: 625, oy: 305 },
} as const;

/**
 * Jangkauan model dari bahu (satuan model): ke ujung paruh, ke pangkal
 * leher (batas depan badan), dan ke ujung ekor.
 */
export const HORNBILL_REACH = { front: 175, neck: 75, back: 180 } as const;
