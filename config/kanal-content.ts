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
    body: "Kanal digali untuk mengeringkan lahan. Begitu terbuka, air di dalam gambut mengalir keluar sendiri — tanpa pompa, hanya gravitasi. Makin dalam kanalnya, makin dalam muka air tanah di sekitarnya turun.",
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
    body: "Yang kering bukan hanya tepi kanal. Muka air tanah melengkung turun sampai ratusan meter ke dalam, dan sepanjang itu lapisan atasnya menjadi bahan bakar. Satu kanal mengeringkan lahan jauh lebih luas daripada galiannya.",
    task: "Pada grafik, cari jarak tempat muka airnya melewati batas 40 cm.",
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
    body: "Gambut kering menyusut sendiri, tanpa api sama sekali. Permukaannya turun beberapa sentimeter tiap tahun, dan karbon yang tersimpan ribuan tahun terlepas ke udara. Tidak terlihat karena terlalu lambat.",
    task: "Jalankan waktu sampai permukaan turun 50 cm.",
    hint: "Jalankan waktu sampai permukaannya turun setengah meter.",
    fact: {
      value: "± 5 cm/tahun",
      caption: "Laju penurunan permukaan gambut yang dikeringkan sedalam satu meter",
    },
  },
  {
    number: "04",
    title: "Yang kembali hanya airnya",
    body: "Sekat menahan air, muka airnya naik, dan lahan ini tidak lagi rawan terbakar. Tetapi tanah yang sudah melesak tidak kembali: gambut tumbuh satu milimeter per tahun. Garis putus-putus menunjukkan setinggi mana tanah ini dahulu.",
    task: "Pasang sekat, lalu bandingkan dengan garis putus-putus.",
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

/**
 * Keterangan yang menjelaskan hubungan dua gambar di layar.
 *
 * Modul ini memperlihatkan dua hal sekaligus dengan skala yang berbeda seribu
 * kali: bongkahan tanah selebar 36 m tiap sisi, dan grafik sepanjang 1 km.
 * Tanpa dikatakan, pembaca mengira keduanya memperlihatkan hal yang sama dan
 * tidak dapat memahami satu pun — dan itu memang yang terjadi.
 */
export const FIGURE_NOTE = {
  block: (lengthM: number) => `Gambar: ${lengthM} m dari tepi kanal`,
  chart: "Grafik: seluruh 1 km",
  chartLead: "Seberapa dalam muka air tanah, pada tiap jarak dari kanal",
  // Petak 36 m hanya 3,6% lebar grafik — sepotong pita yang terlalu tipis
  // untuk diberi label di dalam gambarnya. Jadi hubungannya dikatakan dengan
  // kalimat, bukan dengan tanda yang harus dicari.
  window: (lengthM: number) => `Pita terang di kiri: ${lengthM} m yang digambar besar`,
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
