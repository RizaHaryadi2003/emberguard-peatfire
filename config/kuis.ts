/**
 * ============================================================================
 *  SOAL KUIS — GANTI DI SINI
 * ============================================================================
 *  Salinan draf 1 soal di docs/md/acuan-kuis.md §8. Dokumen itulah sumbernya:
 *  di sana tercatat konsep, tingkat berpikir, dan acuan setiap jawaban. Bila
 *  soal diubah (misalnya sesudah validasi ahli), ubah dokumennya dulu, lalu
 *  salin ke sini.
 *
 *  Susunan pembahasan mengikuti §5 dokumen itu:
 *    `note`     — untuk pembaca yang memilih pengecoh itu: mengapa terdengar
 *                 benar dan di mana kelirunya (± 40 kata);
 *    `core`     — rantai sebab-akibat yang tampil untuk semua pembaca;
 *    `takeaway` — satu kalimat pegangan.
 * ============================================================================
 */

/** Bagian materi, sama dengan `id` di config/modules-content.ts. */
export type QuizPart = "gambut" | "kering" | "api" | "dampak" | "mencegah";

/** Proses berpikir menurut taksonomi Bloom revisi (acuan-kuis §3). */
export type QuizProcess = "Memahami" | "Menerapkan" | "Menganalisis" | "Mengevaluasi";

export type QuizOption = {
  text: string;
  /** Penjelasan khusus bila pilihan ini dipilih. Kosong pada kunci. */
  note?: string;
};

export type QuizItem = {
  id: string;
  part: QuizPart;
  process: QuizProcess;
  /** Konsep yang diuji, ditampilkan di halaman hasil bila jawabannya salah. */
  concept: string;
  stem: string;
  options: readonly [QuizOption, QuizOption, QuizOption, QuizOption];
  /** Indeks pilihan yang benar (0 = A). */
  answer: 0 | 1 | 2 | 3;
  core: string;
  takeaway: string;
  /** Modul yang membahasnya. */
  module: { href: string; act: string };
};

export const QUIZ_TEXT = {
  eyebrow: "Kuis",
  title: "Seberapa paham kamu?",
  lead: "Sepuluh soal dari kelima bagian modul. Tiap soal hanya bisa dijawab sekali, dan setiap jawaban langsung dibahas.",
  meta: "10 soal · ± 10 menit",
  start: "Mulai",
  suggestion: "Lebih mudah bila kamu sudah menjelajah modulnya.",
  toModules: "Lihat modul",
  question: (i: number, n: number) => `Soal ${i} dari ${n}`,
  score: (s: number) => `Skor ${s}`,
  pick: "Pilih satu jawaban. Pembahasannya muncul sesudah kamu memilih.",
  right: "Tepat",
  wrong: "Belum tepat",
  yourPick: "Pilihanmu",
  correctIs: (letter: string) => `Jawaban yang tepat: ${letter}`,
  takeaway: "Pegangan",
  learnMore: "Pelajari lagi",
  next: "Soal berikutnya",
  finish: "Lihat hasil",
  resultEyebrow: "Hasil kuis",
  passed: "Paham",
  retry: "Coba lagi",
  passedLead: "Sebagian besar konsep sudah kamu kuasai. Periksa yang masih keliru di bawah.",
  retryLead: "Beberapa konsep masih keliru. Buka lagi modulnya, lalu coba kuisnya sekali lagi.",
  perPart: "Pemahaman per bagian",
  wrongConcepts: "Yang masih keliru",
  allRight: "Semua soal terjawab tepat.",
  again: "Ulangi kuis",
  modules: "Daftar modul",
} as const;

/** Teks cek singkat di akhir bagian (tanpa skor). */
export const CHECK_TEXT = {
  open: "Cek pemahaman",
  openNote: (n: number) => `${n} soal`,
  eyebrow: (part: string) => `Cek singkat · Bagian ${part}`,
  close: "Tutup",
  finish: "Selesai",
  doneTitle: (right: number, total: number) => `${right} dari ${total} tepat`,
  doneAll: "Semua konsep bagian ini sudah kamu pegang.",
  doneSome: "Konsep yang masih keliru, beserta modulnya:",
  again: "Ulangi cek",
  back: "Kembali ke modul",
  next: "Modul berikutnya",
} as const;

/** Huruf pilihan A–D. */
export const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

/** Batas skor kategori "Paham" (Bab III). */
export const PASS_SCORE = 70;

/** Nilai tiap jawaban benar (Bab III). */
export const POINTS_PER_ITEM = 10;

export const MAIN_QUIZ: readonly QuizItem[] = [
  {
    id: "U-01",
    part: "gambut",
    process: "Mengevaluasi",
    concept: "Tanah organik belum tentu gambut. Di Kota Pontianak, yang bergambut hanya Pontianak Utara dan Tenggara.",
    stem: "Sebuah unggahan berbunyi: “Tanah di Pontianak Kota dan Pontianak Timur gelap dan penuh sisa tumbuhan. Berarti dua kecamatan itu berdiri di atas gambut.” Penilaian mana yang paling tepat?",
    options: [
      {
        text: "Tepat, karena tanah yang mengandung sisa tumbuhan sudah tergolong gambut.",
        note: "Warna gelap dan sisa tumbuhan memang ciri gambut, jadi wajar mengira itu cukup. Padahal gambut punya syarat, salah satunya timbunan setebal 50 cm atau lebih. Tanah organik yang tidak memenuhinya belum disebut gambut.",
      },
      {
        text: "Tepat, karena seluruh kecamatan di Kota Pontianak berdiri di atas gambut.",
        note: "Kota ini dikelilingi rawa, jadi kesannya memang seluruh kota bergambut. Pemeriksaan lapangan menunjukkan sebaliknya: empat dari enam kecamatan tidak bergambut, sebagian besar tanahnya endapan sungai.",
      },
      { text: "Kurang tepat, karena tanah organik belum tentu memenuhi syarat gambut, dan di kota ini hanya Utara dan Tenggara yang memenuhinya." },
      {
        text: "Kurang tepat, karena gambut hanya terbentuk di pedalaman yang jauh dari sungai besar.",
        note: "Kebakaran gambut memang lebih sering diberitakan dari pedalaman. Tetapi gambut juga ada di dalam kota ini, kota yang dibelah Sungai Kapuas dan Sungai Landak.",
      },
    ],
    answer: 2,
    core: "Gambut adalah tanah dari sisa tumbuhan yang tertimbun di rawa dan tidak membusuk sempurna, tebalnya 50 cm atau lebih. Pemeriksaan tanah langsung di 614 titik di Pontianak menemukan gambut hanya di Pontianak Utara (42% wilayahnya) dan Pontianak Tenggara (36%). Tanah Pontianak Kota dan Timur memang organik, tetapi tidak memenuhi syarat gambut.",
    takeaway: "Tanah gelap belum tentu gambut. Yang menentukan adalah pemeriksaan di lapangan.",
    module: { href: "/modul/sekitarmu", act: "Babak 02" },
  },
  {
    id: "U-02",
    part: "gambut",
    process: "Memahami",
    concept: "Gambut terbakar ketika pori di atas muka air tanah kehilangan airnya.",
    stem: "Sekitar 90% volume gambut fibrik berupa pori, dan dalam keadaan alami pori itu penuh air. Mengapa tanah seperti ini tetap bisa menjadi bahan bakar?",
    options: [
      {
        text: "Pori gambut menyerap panas matahari saat kemarau, sampai gambut menyala dengan sendirinya.",
        note: "Kebakaran gambut sering terlihat muncul tiba-tiba saat panas terik, jadi kesannya terbakar sendiri. Panas matahari mengeringkan gambut, tetapi tidak menyalakannya. Penyulutnya api dari luar, paling sering api pembukaan lahan.",
      },
      { text: "Saat muka air tanah turun, pori di atasnya terisi udara, dan sisa tumbuhan yang mengering itulah yang terbakar." },
      {
        text: "Gambut tersusun dari sisa tumbuhan, sehingga ia mudah terbakar walaupun porinya masih penuh air.",
        note: "Benar bahwa gambut adalah bahan organik yang bisa terbakar. Tetapi selama porinya penuh air, gambut tidak bisa menyala dan merambat. Airnya harus hilang lebih dulu.",
      },
      {
        text: "Air di pori menguap pada siang terik, sehingga seluruh lapisan gambut kering setiap hari.",
        note: "Penguapan memang mengambil air setiap hari, tetapi hanya menurunkan muka air sedikit demi sedikit. Gambut di bawah garis itu tetap jenuh air.",
      },
    ],
    answer: 1,
    core: "Selama pori gambut penuh air, api sulit menyala dan tidak dapat merambat. Kanal dan kemarau menurunkan muka air tanah. Gambut di atas garis itu kehilangan airnya, porinya berisi udara, dan sisa tumbuhan yang tertimbun berubah menjadi bahan bakar. Lewat 40 cm, lahan masuk golongan rawan terbakar.",
    takeaway: "Yang terbakar adalah gambut di atas muka air. Gambut di bawahnya tetap basah.",
    module: { href: "/modul/anatomi", act: "Tahap 3–4" },
  },
  {
    id: "U-03",
    part: "kering",
    process: "Mengevaluasi",
    concept: "Kanal mengeringkan gambut jauh melampaui tepinya.",
    stem: "Pemilik kebun menggali kanal sedalam 1 m di tepi lahan gambutnya, lalu berkata: “Yang kering hanya tanah di pinggir parit. Lahan di tengah tetap basah.” Penilaian mana yang paling tepat?",
    options: [
      {
        text: "Benar, karena air hanya keluar dari tanah yang menyentuh dinding kanal.",
        note: "Galiannya memang hanya menyentuh tanah di tepinya, jadi wajar mengira hanya tepi yang kering. Tetapi air di dalam gambut bergerak. Tanah di belakang tepi itu terus mengalirkan airnya ke arah kanal.",
      },
      {
        text: "Benar, karena gambut menahan air dengan kuat sehingga hanya tepinya yang terpengaruh.",
        note: "Gambut memang menyimpan banyak air, seperti spons. Justru karena itu, ada banyak air yang terus mengalir keluar ke kanal, dari tempat yang jauh sekalipun.",
      },
      {
        text: "Kurang tepat, karena kanal justru membuat air berkumpul dan menggenangi seluruh lahan.",
        note: "Air memang berkumpul di dalam kanal, tetapi kanal mengalirkannya pergi. Lahan di sekitarnya kehilangan air, bukan menerimanya.",
      },
      { text: "Kurang tepat, karena air dari gambut di sekitarnya terus mengalir ke kanal, sehingga lahan ratusan meter jauhnya ikut kering." },
    ],
    answer: 3,
    core: "Begitu kanal terbuka, air di dalam gambut mengalir ke kanal dengan sendirinya, tanpa pompa, hanya karena gravitasi. Muka air tanah turun paling dalam di tepi kanal, lalu melandai menjauhinya. Pengaruhnya terukur jauh: di Kalampangan, Kalimantan Tengah, muka air di tepi kanal 40–50 cm lebih dalam daripada 1 km darinya. Lahan yang muka airnya lewat 40 cm menjadi rawan terbakar, dan pada kanal 1 m itu terjadi sampai ratusan meter dari tepinya.",
    takeaway: "Satu kanal mengeringkan lahan jauh lebih luas daripada galiannya.",
    module: { href: "/modul/kanal", act: "Babak 01–02" },
  },
  {
    id: "U-04",
    part: "kering",
    process: "Menerapkan",
    concept: "Dua ambang muka air: lewat 40 cm bahaya tinggi, lewat 60 cm lahan terbakar.",
    stem: "Di akhir hujan, muka air tanah sebuah lahan gambut berparit berada 20 cm di bawah permukaan. Tanpa hujan, muka air turun sekitar 1,3 cm setiap hari. Di lahan gambut tetangga Pontianak, lahan terbakar setelah muka air melewati 60 cm. Kira-kira berapa hari tanpa hujan sampai batas itu terlewati?",
    options: [
      {
        text: "Sekitar 3 hari",
        note: "Kemungkinan 1,3 cm dibaca sebagai 13 cm sehari. Muka air turun jauh lebih pelan dari itu, karena air hanya hilang lewat akar dan penguapan.",
      },
      {
        text: "Sekitar 15 hari",
        note: "Ini hari ketika air lewat 40 cm, ambang bahaya tinggi. Yang ditanyakan ambang 60 cm, ketika lahan benar-benar terbakar, dan itu dua kali lebih lama.",
      },
      { text: "Sekitar 30 hari" },
      {
        text: "Sekitar 90 hari",
        note: "Kemungkinan hitungannya dimulai dari permukaan, atau memakai laju yang lebih kecil. Mulailah dari 20 cm, karena air sudah berada di sana sejak awal.",
      },
    ],
    answer: 2,
    core: "Muka air harus turun 60 − 20 = 40 cm. Dengan 1,3 cm sehari, butuhnya 40 ÷ 1,3 ≈ 31 hari. Separuh jalan, sekitar hari ke-15, air sudah lewat 40 cm dan gambut di atasnya cukup kering untuk tersulut. Lewat 60 cm, gambut keringnya lebih dari setengah meter, dan api bisa menjalar masuk ke dalam tanah.",
    takeaway: "Sebulan tanpa hujan cukup untuk membuat lahan berparit siap terbakar.",
    module: { href: "/modul/musim-api", act: "Babak 02" },
  },
  {
    id: "U-05",
    part: "api",
    process: "Menganalisis",
    concept: "Gambut tersulut oleh panas yang bertahan lama, bukan oleh nyala yang besar.",
    stem: "Dua orang membuka lahan gambut kering dengan api. P membakar semak tebasan yang habis dalam beberapa menit. Q membakar tumpukan kayu sisa tebasan yang menyala berjam-jam. Mana yang lebih mungkin meninggalkan bara di dalam gambut?",
    options: [
      { text: "Q, karena panas yang bertahan satu sampai dua jam di satu titik membuat gambut di bawahnya ikut membara." },
      {
        text: "P, karena nyala semak yang besar langsung menembus gambut lebih dalam.",
        note: "Api yang besar memang terlihat paling berbahaya. Tetapi nyala semak habis dalam menit, dan panas sesingkat itu tidak cukup untuk menyulut gambut di bawahnya.",
      },
      {
        text: "Keduanya sama, karena gambut kering langsung membara begitu tersentuh api apa pun.",
        note: "Gambut kering memang bisa terbakar, tetapi tidak oleh sentuhan api sebentar. Panasnya harus bertahan cukup lama di satu titik.",
      },
      {
        text: "Tidak keduanya, karena api di permukaan padam sebelum panasnya sampai ke gambut.",
        note: "Api yang singkat memang sering tidak menyulut gambut. Tetapi api yang bertahan berjam-jam di satu titik bisa, dan itulah yang terjadi pada kayu sisa tebasan.",
      },
    ],
    answer: 0,
    core: "Titik panas di gambut baru berkembang bila panasnya bertahan satu sampai dua jam di tempat yang sama. Kalau tidak, titik itu hilang sendiri. Nyala semak besar tetapi cepat lewat. Kayu yang terbakar lama memanaskan satu titik terus-menerus, panasnya masuk ke gambut, dan setelah apinya habis baranya tetap hidup.",
    takeaway: "Yang menyulut gambut adalah lamanya panas, bukan besarnya api.",
    module: { href: "/modul/bara", act: "Babak 01" },
  },
  {
    id: "U-06",
    part: "api",
    process: "Memahami",
    concept: "Siraman memadamkan permukaan, sedangkan bara di bawah tetap hidup.",
    stem: "Petugas menyiram lahan gambut terbakar sampai asapnya tidak terlihat lagi. Tiga hari kemudian lahan yang sama berasap dan menyala kembali. Penjelasan mana yang paling sesuai dengan cara bara gambut bekerja?",
    options: [
      {
        text: "Air siraman cepat menguap dan membuat gambut lebih kering daripada sebelum disiram.",
        note: "Siraman memang tidak bertahan lama di permukaan. Tetapi air tidak membuat gambut lebih kering daripada sebelumnya. Yang menyalakan lagi adalah bara yang tidak pernah padam.",
      },
      { text: "Bara tetap hidup di bawah, di luar jangkauan siraman, lalu naik lagi setelah lapisan atas kering." },
      {
        text: "Abu sisa kebakaran menyimpan panas, lalu menyulut rumput kering yang tumbuh di atasnya.",
        note: "Abu memang bisa tetap panas. Tetapi yang bertahan berhari-hari di gambut adalah bara di dalam tanah, dan bara itulah yang naik lagi.",
      },
      {
        text: "Siraman mendorong api ke lahan sebelah, lalu api itu kembali ke lahan semula.",
        note: "Api permukaan memang bisa berpindah. Tetapi lahan itu menyala lagi dari bawahnya sendiri, karena baranya masih hidup di bawah tempat yang disiram.",
      },
    ],
    answer: 1,
    core: "Bara gambut menjalar ke samping dan turun ke dalam tanpa nyala. Dari atas, yang terlihat hanya asap. Siraman sedikit membasahi lapisan atas, sehingga asap surut dan lahan tampak aman, padahal bara di lapisan dalam masih hidup. Begitu lapisan atas kering lagi, bara merambat naik dan permukaannya menyala kembali. Ini pernah terjadi di Pontianak.",
    takeaway: "Asap yang hilang bukan tanda bara padam.",
    module: { href: "/modul/bara", act: "Babak 02–03" },
  },
  {
    id: "U-07",
    part: "dampak",
    process: "Menerapkan",
    concept: "Gambut yang terbakar adalah luas dikali kedalaman, bukan luas saja.",
    stem: "Kebakaran X menghanguskan 30 ha gambut sedalam 10 cm. Kebakaran Y hanya 10 ha, tetapi sedalam 33 cm. Mana yang melepas karbon dioksida lebih banyak?",
    options: [
      {
        text: "X, karena luasnya tiga kali luas Y.",
        note: "Luas memang angka yang selalu diberitakan, jadi wajar mengukur dengan luas. Tetapi gambut terbakar ke dalam. Lahan Y tiga kali lebih dalam, dan itu menutup selisih luasnya.",
      },
      {
        text: "Keduanya sama, karena luas dan kedalamannya saling mengimbangi.",
        note: "Hampir benar: keduanya memang mendekati. Hitung luas × kedalaman: 3 lawan 3,3. Y sedikit lebih banyak.",
      },
      {
        text: "Tidak bisa dibandingkan tanpa mengetahui jenis pohon di atasnya.",
        note: "Pohon memang ikut terbakar, tetapi karbon terbesar tersimpan di gambut di bawahnya. Sekitar separuh bobot kering gambut adalah karbon.",
      },
      { text: "Y, karena gambut yang terbakarnya, luas kali kedalaman, sedikit lebih banyak." },
    ],
    answer: 3,
    core: "Gambut yang terbakar = luas × kedalaman. X: 30 ha × 0,10 m = 3 ha·m. Y: 10 ha × 0,33 m = 3,3 ha·m. Setiap satu hektare gambut yang habis sedalam satu meter melepas sekitar 2.000 ton karbon dioksida. Jadi X melepas sekitar 6.000 ton, Y sekitar 6.600 ton.",
    takeaway: "Berita yang hanya menyebut hektare belum mengatakan seberapa besar kebakarannya.",
    module: { href: "/modul/karbon", act: "Babak 01–02" },
  },
  {
    id: "U-08",
    part: "dampak",
    process: "Menganalisis",
    concept: "Gambut habis dalam beberapa minggu, tetapi baru tertimbun kembali setelah berabad-abad.",
    stem: "Satu hektare gambut habis terbakar sedalam 50 cm dalam beberapa minggu. Sesudahnya lahan itu dijaga tetap basah agar gambut menumpuk lagi. Pernyataan mana yang paling tepat?",
    options: [
      { text: "Lepas sekitar 1.000 ton CO₂, dan takiknya baru tertutup setelah sekitar 500 tahun." },
      {
        text: "Lepas sekitar 1.000 ton CO₂, dan takiknya tertutup dalam sekitar 50 tahun bila hutan ditanam ulang.",
        note: "Hutan memang bisa tumbuh lagi dalam beberapa dasawarsa, jadi wajar mengira tanahnya ikut pulih. Tetapi gambut menumpuk jauh lebih lambat daripada pohon tumbuh: sekitar satu milimeter setahun.",
      },
      {
        text: "Lepas sekitar 1.000 ton CO₂, dan seluruhnya terserap kembali oleh hutan baru dalam beberapa tahun.",
        note: "Hutan baru memang menyerap karbon, tetapi sebagian besar karbon itu dulunya tersimpan di gambut, bukan di pohon. Mengembalikan 50 cm gambut butuh berabad-abad.",
      },
      {
        text: "Lepas sekitar 100 ton CO₂, karena yang terbakar hanya serasah dan pohon di permukaan.",
        note: "Yang terlihat terbakar memang serasah dan pohon. Tetapi api gambut masuk ke dalam tanah, dan gambut itulah gudang karbonnya.",
      },
    ],
    answer: 0,
    core: "Setiap meter gambut yang hilang dari satu hektare melepas sekitar 2.000 ton CO₂, jadi 50 cm melepas sekitar 1.000 ton. Gambut tumbuh rata-rata satu milimeter setahun, sama seperti dahulu, jadi 50 cm butuh sekitar 500 tahun. Hutannya bisa ditanam ulang dalam beberapa dasawarsa, tetapi gambut di bawahnya tidak.",
    takeaway: "Api menghabiskan dalam minggu, gambut mengembalikannya dalam abad.",
    module: { href: "/modul/karbon", act: "Babak 01 dan 03" },
  },
  {
    id: "U-09",
    part: "mencegah",
    process: "Mengevaluasi",
    concept: "Bara dalam padam hanya bila air mencapai tempatnya.",
    stem: "Bara sudah masuk sekitar 40 cm ke dalam gambut sebuah lahan berparit. Tindakan mana yang benar-benar menghentikannya?",
    options: [
      {
        text: "Menyiram permukaan berulang kali sampai asapnya tidak terlihat lagi.",
        note: "Asap yang hilang terlihat seperti padam. Tetapi siraman hanya membasahi lapisan atas, dan bara di bawahnya tetap merambat.",
      },
      {
        text: "Menebang semak di sekelilingnya agar bara tidak mendapat bahan bakar baru.",
        note: "Memutus bahan bakar memang cara menahan api permukaan. Tetapi bahan bakar bara adalah gambut itu sendiri, dan gambut kering masih ada di sekeliling bara.",
      },
      { text: "Menaikkan muka air tanah sampai air mencapai kedalaman tempat bara berada." },
      {
        text: "Menunggu hujan lebat pertama turun di akhir musim kemarau.",
        note: "Hujan memang membantu, tetapi bara dalam tetap sulit padam walau hujan lebat. Air yang lewat retakan tidak terserap oleh gambut yang sudah kering.",
      },
    ],
    answer: 2,
    core: "Bara berhenti bila air benar-benar sampai ke tempatnya. Gambut di bawah muka air jenuh dan tidak dapat terbakar, jadi bara yang terkepung air mendingin dan mati. Di lahan gambut, rambatan bara dalam berhenti saat muka air tanah naik. Karena itu muka air pada gambut budidaya wajib dijaga tidak lebih dalam dari 0,4 m.",
    takeaway: "Padamkan dari bawah, dengan menaikkan airnya.",
    module: { href: "/modul/bara", act: "Babak 04" },
  },
  {
    id: "U-10",
    part: "mencegah",
    process: "Memahami",
    concept: "Sekat kanal mengembalikan air, tidak mengembalikan tanah.",
    stem: "Lahan gambut yang bertahun-tahun dikeringkan kanal sudah turun 50 cm. Kanalnya kemudian disekat dan muka air naik lagi mendekati permukaan. Apa hasilnya?",
    options: [
      {
        text: "Air dan permukaan tanah sama-sama kembali ke tinggi semula.",
        note: "Kalau tanahnya turun karena kering, wajar mengira tanahnya naik lagi saat basah. Tetapi sebagian besar yang hilang sudah menjadi gas karbon. Tidak ada lagi yang bisa mengembang.",
      },
      { text: "Lahan tidak lagi rawan terbakar, tetapi permukaan tanah tetap di bawah tinggi semula." },
      {
        text: "Permukaan tanah naik kembali, tetapi lahan tetap rawan terbakar.",
        note: "Kebalikannya. Permukaan tidak naik, tetapi gambut yang basah kembali tidak lagi rawan terbakar.",
      },
      {
        text: "Lahan tetap rawan terbakar, karena air yang tertahan sekat tetap berada di dalam kanal.",
        note: "Air memang ditahan di dalam kanal, tetapi air itu lalu menahan air di gambut sekitarnya. Muka air ikut naik sampai sekitar 400 m ke kiri dan kanan kanal.",
      },
    ],
    answer: 1,
    core: "Selama dikeringkan, gambut mengempis dan perlahan terurai menjadi gas karbon. Bagian itu sudah hilang ke udara, jadi permukaannya turun. Sekat menahan air di kanal, muka air di lahan sekitarnya naik, dan gambut di atasnya basah kembali. Itu menghentikan rawan terbakarnya, tetapi gambut yang sudah hilang tidak bisa kembali.",
    takeaway: "Airnya bisa dikembalikan, tanahnya tidak. Karena itu gambut harus dijaga basah sejak awal.",
    module: { href: "/modul/kanal", act: "Babak 03–04" },
  },
];

/**
 * Cek singkat per bagian (acuan-kuis §7): tanpa skor, tampil sesudah modul
 * terakhir sebuah bagian. Baru Gambut dan Kering yang semua modulnya ada.
 * Belum dipasang di halaman modul.
 */
export const PART_CHECKS: Readonly<Partial<Record<QuizPart, readonly QuizItem[]>>> = {
  gambut: [
    {
      id: "C-GAM-01",
      part: "gambut",
      process: "Menganalisis",
      concept: "Puncak kubah gambut hidup dari hujan, bukan dari sungai.",
      stem: "Sungai di tepi hutan rawa gambut membawa lumpur dan hara. Mengapa hutan di puncak kubah gambut tidak mendapatkannya?",
      options: [
        {
          text: "Akar pohon di puncak kubah terlalu dangkal untuk mencapai air sungai.",
          note: "Yang memisahkan hutan dari sungai bukan akarnya, tetapi ketinggian tanahnya. Air sungai tidak pernah naik setinggi puncak kubah.",
        },
        {
          text: "Banjir sungai hanya datang beberapa tahun sekali, jadi hutan bergantung pada hujan.",
          note: "Yang menentukan bukan seberapa sering banjir datang, tetapi seberapa tinggi. Sesering apa pun, air sungai berhenti di lereng kubah.",
        },
        { text: "Puncak kubah lebih tinggi daripada jangkauan banjir sungai, jadi air sungai berhenti di tepi hutan." },
        {
          text: "Gambut di puncak kubah menyaring hara dari air sungai sebelum mencapai akar.",
          note: "Air sungai tidak sampai ke puncak kubah sama sekali, jadi tidak ada yang tersaring di sana.",
        },
      ],
      answer: 2,
      core: "Gambut menumpuk paling tebal di tengah hutan, sampai sekitar 13 m, sehingga permukaannya melengkung seperti kubah. Banjir sungai hanya mencapai tepinya. Hutan di atas kubah mendapat air dan hara hanya dari hujan dan debu. Karena itu kanopi hutan rawa gambut umumnya lebih rendah daripada hutan di tanah mineral.",
      takeaway: "Puncak kubah hidup dari hujan, bukan dari sungai.",
      module: { href: "/modul/hutan-rawa", act: "Babak 01–02" },
    },
    {
      id: "C-GAM-02",
      part: "gambut",
      process: "Memahami",
      concept: "Lapisan yang lebih dulu tertimbun lebih lama terurai, sehingga lebih matang.",
      stem: "Pada gambut di tepi Sungai Kapuas, lapisan atasnya masih berserat kasar, sedangkan lapisan bawahnya halus. Penjelasan mana yang paling tepat?",
      options: [
        { text: "Lapisan bawah tertimbun lebih dulu, jadi sisa tumbuhannya lebih lama terurai dan lebih matang." },
        {
          text: "Lapisan atas lebih matang karena lebih sering terkena panas matahari.",
          note: "Kebalikannya. Lapisan atas justru yang paling mentah, karena paling baru tertimbun.",
        },
        {
          text: "Lapisan bawah tertekan air, sehingga seratnya hancur dalam beberapa tahun.",
          note: "Lapisan bawah memang terendam air, tetapi air justru memperlambat penguraian. Seratnya hancur karena waktu yang sangat lama, bukan beberapa tahun.",
        },
        {
          text: "Lapisan atas lebih padat karena tertekan oleh beban hutan di atasnya.",
          note: "Yang lebih rapat justru lapisan bawah, yang lebih matang. Lapisan atas berserat dan banyak pori.",
        },
      ],
      answer: 0,
      core: "Gambut menumpuk dari atas, sedikit demi sedikit, jadi makin ke bawah makin tua. Bahan yang lebih dulu tertimbun sudah lebih lama terurai. Pada profil ini seratnya berangsur hilang dari atas ke bawah: fibrik yang mentah, hemik yang setengah matang, lalu saprik yang halus.",
      takeaway: "Makin dalam, makin tua, makin matang.",
      module: { href: "/modul/anatomi", act: "Tahap 1–2" },
    },
    {
      id: "C-GAM-03",
      part: "gambut",
      process: "Mengevaluasi",
      concept: "Kebakaran gambut juga terjadi di dalam Kota Pontianak.",
      stem: "Seorang teman berkata: “Kebakaran gambut itu urusan orang pedalaman, bukan warga Pontianak.” Bantahan mana yang paling kuat?",
      options: [
        {
          text: "Seluruh kecamatan di Pontianak berdiri di atas gambut, jadi semuanya sama rawannya.",
          note: "Bantahannya terlalu jauh. Hanya dua dari enam kecamatan yang bergambut. Bantahan yang salah mudah dipatahkan.",
        },
        { text: "Di bawah Pontianak Utara dan Tenggara ada gambut bermeter-meter, dan lahan di sana terbakar berulang." },
        {
          text: "Gambut di Pontianak tipis, tetapi tetap mudah terbakar karena dekat permukiman.",
          note: "Gambut di kota ini tidak tipis. Di beberapa titik tebalnya lebih dari 4 m, bahkan sampai 15 m.",
        },
        {
          text: "Gambut di kota terbentuk dari timbunan sampah, sehingga lebih mudah terbakar.",
          note: "Gambut terbentuk dari sisa tumbuhan rawa selama ribuan tahun, bukan dari sampah.",
        },
      ],
      answer: 1,
      core: "Pontianak Utara dan Pontianak Tenggara berdiri di atas gambut. Di beberapa jalan di Pontianak Tenggara gambutnya 3 sampai 15 m, beberapa kali tinggi badan orang dewasa. Lahan di Jl. Sepakat II terbakar pada 2018 dan terbakar lagi pada Oktober 2023.",
      takeaway: "Gambut ada di kotamu sendiri, dan sudah berkali-kali terbakar.",
      module: { href: "/modul/sekitarmu", act: "Babak 02–04" },
    },
  ],
  kering: [
    {
      id: "C-KER-01",
      part: "kering",
      process: "Memahami",
      concept: "Di tahun biasa, masa kering Pontianak terlalu pendek untuk menurunkan muka air sampai ambang bahaya.",
      stem: "Pontianak punya dua masa kering setahun, Februari–Maret dan Agustus. Mengapa di tahun biasa lahan gambut berparit pun tidak sampai terbakar?",
      options: [
        {
          text: "Udara khatulistiwa terlalu lembap, sehingga api tidak bisa menyala di musim apa pun.",
          note: "Udara lembap memang membantu, tetapi yang menentukan adalah air di dalam gambut. Di tahun El Niño, lahan gambut di Kalimantan terbakar luas.",
        },
        {
          text: "Gambut di Pontianak sangat tebal, sehingga airnya tidak bisa turun di masa kering.",
          note: "Tebal gambut tidak menahan muka air. Muka air tetap turun setiap hari tanpa hujan, berapa pun tebal gambutnya.",
        },
        {
          text: "Pada bulan-bulan itu warga tidak membuka lahan, sehingga tidak ada sumber api.",
          note: "Api memang butuh penyulut, tetapi soal ini menanyakan mengapa gambutnya tidak terbakar. Selama muka airnya dangkal, gambut terlalu basah untuk menyala.",
        },
        { text: "Masa keringnya pendek, dan hujan kembali sebelum muka air turun melewati 40 cm." },
      ],
      answer: 3,
      core: "Pontianak tepat di khatulistiwa, jadi kemaraunya pendek. Saat hujan berhenti, muka air turun sekitar 1,3 cm sehari, tetapi hujan segera datang lagi, pori gambut terisi, dan air naik kembali. Di tahun biasa air tidak sampai 40 cm, jadi gambutnya tetap cukup basah. Yang berbahaya adalah kemarau yang tidak berhenti.",
      takeaway: "Yang menentukan adalah berapa lama hujan absen.",
      module: { href: "/modul/musim-api", act: "Babak 01–02" },
    },
    {
      id: "C-KER-02",
      part: "kering",
      process: "Menganalisis",
      concept: "Api gambut melonjak setelah ambang terlewati, tidak sebanding dengan berkurangnya hujan.",
      stem: "Pada tahun El Niño, hujan September di Kalimantan Barat tinggal sekitar sepertiga dari biasanya. Namun luas lahan terbakar di Kalimantan bisa sekitar sepuluh kali tahun biasa, bukan tiga kali. Mengapa?",
      options: [
        {
          text: "El Niño membawa udara panas yang menyalakan gambut dengan sendirinya.",
          note: "El Niño memang membuat kemarau terasa lebih panas. Tetapi ia tidak menyalakan gambut. Ia hanya membuat gambut kering lebih lama, dan api tetap datang dari luar.",
        },
        { text: "Kemarau tersambung sampai Oktober, sehingga muka air melewati 60 cm dan bertahan di bawahnya berminggu-minggu." },
        {
          text: "Luas terbakar mestinya sebanding dengan berkurangnya hujan, jadi angka sepuluh kali adalah salah hitung.",
          note: "Wajar mengira akibat sebanding dengan sebab. Tetapi gambut punya ambang: di atas 60 cm hampir tidak terbakar, di bawahnya terbakar luas.",
        },
        {
          text: "Angin El Niño membawa api dari pulau lain ke lahan gambut di Kalimantan.",
          note: "Asap memang bisa terbawa jauh, tetapi api gambut menyala di lahan gambut itu sendiri, dari gambut yang kering.",
        },
      ],
      answer: 1,
      core: "El Niño tidak menyalakan api. Ia mengurangi hujan Agustus–Oktober, sehingga kemarau Agustus tersambung sampai Oktober. Muka air terus turun melewati 40 cm, lalu 60 cm, dan tinggal di sana sampai hujan November datang. Lewat ambang itu, api tidak bertambah sedikit demi sedikit, melainkan melonjak.",
      takeaway: "Sekali ambang terlewati, kebakaran tidak lagi sebanding dengan hujan yang hilang.",
      module: { href: "/modul/musim-api", act: "Babak 02–03" },
    },
    {
      id: "C-KER-03",
      part: "kering",
      process: "Memahami",
      concept: "Gambut yang dikeringkan hilang ke udara tanpa api.",
      stem: "Permukaan lahan gambut yang dikeringkan kanal turun beberapa sentimeter setiap tahun, padahal lahan itu tidak pernah terbakar. Ke mana perginya gambut itu?",
      options: [
        {
          text: "Larut oleh air hujan lalu meresap ke tanah mineral di bawahnya.",
          note: "Air hujan justru membuat gambut tetap utuh. Yang menguraikannya adalah udara yang masuk setelah gambut kering.",
        },
        {
          text: "Menguap bersama air tanah setiap kali musim kemarau datang.",
          note: "Yang menguap adalah airnya. Gambutnya sendiri hilang karena terurai menjadi gas karbon, bukan karena menguap.",
        },
        { text: "Mengempis lalu perlahan terurai menjadi gas karbon yang lepas ke udara." },
        {
          text: "Tenggelam ke tanah mineral karena gambut kering lebih berat.",
          note: "Gambut kering justru lebih ringan, karena airnya hilang. Yang turun adalah permukaannya, karena gambutnya menyusut dan terurai.",
        },
      ],
      answer: 2,
      core: "Gambut yang kering kehilangan air yang menopang porinya, sehingga mengempis. Lalu, setelah bersentuhan dengan udara, sisa tumbuhan yang ribuan tahun terawetkan mulai terurai menjadi gas karbon. Permukaannya turun beberapa sentimeter setiap tahun, sekitar 7 cm untuk tiap satu meter muka air diturunkan, selama drainasenya dijaga.",
      takeaway: "Gambut kering habis perlahan walau tanpa api.",
      module: { href: "/modul/kanal", act: "Babak 03" },
    },
  ],
};
