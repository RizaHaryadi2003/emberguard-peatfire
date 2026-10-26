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
  /**
   * Petunjuk yang muncul saat pembaca mencoba melompat ke babak yang masih
   * terkunci. Satu kalimat perintah, bukan penjelasan.
   */
  hint: string;
  /** Angka kunci babak ini. */
  fact: { value: string; caption: string };
};

export const KANAL_ACTS: readonly KanalAct[] = [
  {
    number: "01",
    title: "Satu kanal",
    body: "Kanal digali untuk mengeringkan lahan agar dapat ditanami atau dilalui. Begitu ia terbuka, air di dalam gambut mengalir keluar dengan sendirinya — tidak dipompa, hanya mengikuti gravitasi. Muka air tanah di sekitarnya melengkung turun ke arah kanal.",
    task: "Gali kanal sampai sedalam satu meter.",
    hint: "Gali kanalnya sampai sedalam satu meter untuk melanjutkan.",
    fact: {
      value: "≤ 0,4 m",
      caption: "Muka air tanah yang wajib dijaga pada ekosistem gambut budidaya (PP 57/2016)",
    },
  },
  {
    number: "02",
    title: "Jauh dari tepi",
    body: "Yang mengering bukan hanya tepi kanalnya. Lengkung muka air itu memanjang ratusan meter ke dalam kubah gambut, dan di sepanjang itu lapisan atasnya berubah menjadi bahan bakar. Satu kanal mengeringkan lahan yang jauh lebih luas daripada yang digali.",
    task: "Geser penanda pada grafik ke tempat muka airnya menyeberangi batas 40 cm.",
    hint: "Tandai tempat muka airnya menyeberangi batas 40 cm pada grafik.",
    // Angka kunci babak ini sengaja bukan jarak tepi daerah rawan. Jarak itu
    // justru yang sedang dicari pembaca pada grafik, dan mencetaknya di panel
    // yang sama berarti menjawabnya untuk dia. Yang ditampilkan panjang
    // peluruhannya — tetapan yang membuat jaraknya sejauh itu, bukan jaraknya.
    fact: {
      value: "190 m",
      caption: "Panjang pengaruh satu kanal untuk tiap satu meter kedalamannya",
    },
  },
  {
    number: "03",
    title: "Tahun demi tahun",
    body: "Gambut kering tidak hanya mudah terbakar; ia juga menyusut dan teroksidasi sendiri, tanpa api sama sekali. Permukaannya turun sedikit demi sedikit, dan karbon yang tersimpan ribuan tahun terlepas ke udara. Inilah bagian yang tidak terlihat karena terjadi terlalu lambat.",
    task: "Jalankan waktu sampai permukaannya turun setengah meter.",
    hint: "Jalankan waktu sampai permukaannya turun setengah meter.",
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
    hint: "Pasang sekat kanalnya.",
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

/**
 * Teks penanda jarak pada grafik — tugas babak 02.
 *
 * Babak 02 meminta pembaca menemukan tepi daerah rawan. Sebelum ini tidak ada
 * yang dapat dikerjakannya untuk "menemukan": syaratnya sudah terpenuhi oleh
 * babak 01, jadi kalimat tugasnya hanya sebuah ajakan tanpa pekerjaan. Dengan
 * penanda ini ia benar-benar harus mencarinya, dan jawabannya berubah tiap
 * kali kedalaman kanalnya diubah.
 */
export const PROBE_TEXT = {
  label: "Penanda jarak",
  idle: "Geser penanda di sepanjang grafik.",
  tooNear: "Di sini muka airnya masih di bawah batas. Coba lebih jauh dari kanal.",
  tooFar: "Di sini muka airnya sudah di atas batas. Coba lebih dekat ke kanal.",
  found: "Tepat di sini muka airnya menyeberangi batas 40 cm.",
  // Kanal yang dalam membuat tepinya jatuh di luar satu kilometer. Itu bukan
  // cacat, melainkan jawabannya — dan pembaca harus menandai ujung grafik
  // untuk menyatakan bahwa ia melihatnya.
  beyond: "Seluruh satu kilometer ini rawan. Tandai ujung grafik.",
  beyondFound: "Benar — dengan kanal sedalam ini, pengaruhnya tidak muat dalam satu kilometer.",
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
