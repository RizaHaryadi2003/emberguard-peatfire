/**
 * ============================================================================
 *  TEKS MODUL 03 — KANAL & PENGERINGAN — GANTI DI SINI
 * ============================================================================
 *  Modul ini penampang lanskap, bukan bongkahan: satu kilometer gambut yang
 *  dipotong kanal. Pembaca menggali kanalnya sendiri, memajukan tahun, lalu
 *  mencoba memperbaikinya dengan sekat — dan menemukan bahwa yang kembali
 *  hanya airnya.
 *
 *  Angka pada `fact` mengikuti tetapan di `lib/drainage.ts`, yang semuanya
 *  masih menunggu sumber. Periksa ulang sebelum dipakai di naskah.
 * ============================================================================
 */

export type KanalAct = {
  number: string;
  title: string;
  /** Kalimat pengantar babak. */
  body: string;
  /** Tugas yang harus dilakukan pembaca agar babak berikutnya terbuka. */
  task: string;
  /** Angka kunci babak ini. */
  fact: { value: string; caption: string };
};

export const KANAL_ACTS: readonly KanalAct[] = [
  {
    number: "01",
    title: "Satu kanal",
    body: "Kanal digali untuk mengeringkan lahan agar dapat ditanami atau dilalui. Begitu ia terbuka, air di dalam gambut mengalir keluar dengan sendirinya — tidak dipompa, hanya mengikuti gravitasi. Muka air tanah di sekitarnya melengkung turun ke arah kanal.",
    task: "Seret pengatur untuk menggali kanal.",
    fact: {
      value: "≤ 0,4 m",
      caption: "Muka air tanah yang wajib dijaga pada ekosistem gambut budidaya (PP 57/2016)",
    },
  },
  {
    number: "02",
    title: "Jauh dari tepi",
    body: "Yang mengering bukan hanya tepi kanalnya. Lengkung muka air itu memanjang ratusan meter ke dalam kubah gambut, dan di sepanjang itu lapisan atasnya berubah menjadi bahan bakar. Satu kanal mengeringkan lahan yang jauh lebih luas daripada yang digali.",
    task: "Temukan sampai jarak berapa muka airnya masih melewati batas 40 cm.",
    fact: {
      value: "700 m",
      caption: "Jarak dari kanal sedalam 2 m yang muka airnya masih melewati batas 40 cm",
    },
  },
  {
    number: "03",
    title: "Tahun demi tahun",
    body: "Gambut kering tidak hanya mudah terbakar; ia juga menyusut dan teroksidasi sendiri, tanpa api sama sekali. Permukaannya turun sedikit demi sedikit, dan karbon yang tersimpan ribuan tahun terlepas ke udara. Inilah bagian yang tidak terlihat karena terjadi terlalu lambat.",
    task: "Majukan waktu dan perhatikan permukaannya turun.",
    fact: {
      value: "± 5 cm/tahun",
      caption: "Laju penurunan permukaan gambut yang dikeringkan sedalam satu meter",
    },
  },
  {
    number: "04",
    title: "Yang kembali hanya airnya",
    body: "Menyekat kanal menahan air sehingga muka airnya naik kembali dan lahan itu tidak lagi rawan terbakar. Tetapi permukaan yang sudah melesak tidak kembali — gambut tumbuh satu milimeter per tahun, sedangkan yang hilang tadi puluhan sentimeter. Garis putus-putus di gambar menunjukkan setinggi mana tanah ini dahulu berada.",
    task: "Pasang sekat kanal, lalu bandingkan dengan garis permukaan asalnya.",
    fact: {
      value: "1 mm/tahun",
      caption: "Laju gambut tumbuh kembali — seribu tahun untuk satu meter",
    },
  },
];

/** Pilihan kecepatan waktu. */
export const TIME_SPEEDS: readonly { label: string; yearsPerSecond: number }[] = [
  { label: "Henti", yearsPerSecond: 0 },
  { label: "Lambat", yearsPerSecond: 0.5 },
  { label: "Sedang", yearsPerSecond: 2 },
  { label: "Cepat", yearsPerSecond: 6 },
];

export const CANAL_TEXT = {
  depthLabel: "Kedalaman kanal",
  blockLabel: "Pasang sekat kanal",
  blockedLabel: "Sekat terpasang",
  blockedMessage:
    "Muka air sudah pulih dan lahan ini tidak lagi rawan terbakar. Tetapi permukaannya tetap di tempatnya yang baru — bandingkan dengan garis putus-putus di atasnya.",
  resetLabel: "Mulai dari awal",
};

/** Keterangan skala yang wajib tampil pada gambar. */
export const SCALE_NOTE = {
  exaggeration: (times: number) => `Tegak dibesarkan ${times}×`,
  canal: (widthM: number) => `Lebar kanal ${widthM} m, menurut skala`,
  // Pohon sengaja tidak ikut dibesarkan tegaknya; ia patokan ukuran, jadi ia
  // harus setinggi pohon sungguhan. Alasannya ada di `scene/vegetation.ts`.
  trees: "Pohon menurut tinggi sebenarnya",
  near: (lengthM: number) => `Petak dekat kanal, ${lengthM} m tiap sisi`,
};

export const KANAL_SUMMARY = {
  title: "Yang ditinggalkan satu kanal",
  lead: "Tiga puluh tahun berlalu, dan kanal itu masih bekerja setiap hari tanpa ada yang menyalakannya.",
  closing:
    "Gambut yang kering inilah yang dibahas modul sebelumnya: begitu ada satu sulutan, ia tidak lagi butuh nyala untuk terus membakar.",
};
