/**
 * ============================================================================
 *  TEKS MODUL 01 — GAMBUT DI SEKITARMU — GANTI DI SINI
 * ============================================================================
 *  Modul pembuka. Pembaca datang dari media sosial dan mengira gambut ada di
 *  hutan yang jauh; modul ini membawanya dari peta Indonesia ke jalan-jalan
 *  di kotanya sendiri.
 *
 *  Setiap angka berasal dari docs/md/acuan-modul-sekitarmu.md:
 *    Anda dkk. (2021)      — luas gambut Indonesia
 *    TRGD Kalbar dalam Mongabay (2017) — luas gambut Kalimantan Barat
 *    Parabi dkk. (2026)    — gambut Kota Pontianak, verifikasi lapangan
 *    Fajania dkk. (2021), Manurung dkk. (2021), Rahsia dkk. (2020)
 *                          — tebal gambut dan kebakaran di Pontianak Tenggara
 *    BPBD Kota Pontianak (2023) — laporan kejadian, bukan pengukuran
 * ============================================================================
 */

export const SEKITARMU_HOOK = {
  setup: "Kebakaran gambut sering terdengar jauh, di pedalaman Kalimantan.",
  question: "Seberapa jauh, sebenarnya?",
  cta: "Cari tahu",
  scrollHint: "atau gulir ke bawah",
};

export type SekitarmuAct = {
  number: string;
  title: string;
  body: string;
  task: string;
  observe: string;
  term: { word: string; meaning: string };
  hint: string;
  fact: { value: string; caption: string };
};

export const SEKITARMU_ACTS: readonly SekitarmuAct[] = [
  {
    number: "01",
    title: "Seluas apa",
    body: "Indonesia menyimpan salah satu hamparan gambut tropis terluas di dunia. Gambut terdalamnya ada di Sumatra dan Kalimantan.",
    task: "Geser Perbesar peta sampai ke Kota Pontianak.",
    observe: "Dari 13,43 juta hektare gambut Indonesia, sebagian ada di kota tempat kamu tinggal.",
    term: {
      word: "Gambut",
      meaning: "tanah dari sisa tumbuhan yang tertimbun di rawa dan tidak membusuk sempurna, tebalnya 50 cm atau lebih.",
    },
    hint: "Perbesar peta sampai ke Kota Pontianak.",
    fact: {
      value: "13,43 juta ha",
      caption: "Luas gambut Indonesia dari pemetaan semi-detail 1:50.000 tahun 2013–2019 (Anda dkk., 2021)",
    },
  },
  {
    number: "02",
    title: "Di kecamatan mana",
    body: "Kota Pontianak terbagi enam kecamatan, dibelah Sungai Kapuas dan Sungai Landak. Sebagian kota ini berdiri di atas gambut, sisanya tanah endapan sungai.",
    task: "Tebak dulu: pilih kecamatan yang menurutmu berdiri di atas gambut, lalu tekan Periksa.",
    observe: "Menurut pemeriksaan langsung di 614 titik, hanya dua kecamatan yang bergambut: 42% Pontianak Utara dan 36% Pontianak Tenggara. Tanah Pontianak Kota dan Timur memang organik, tetapi tidak memenuhi syarat gambut.",
    term: {
      word: "Verifikasi lapangan",
      meaning: "memeriksa tanah langsung di tempatnya, bukan hanya dari peta atau citra satelit.",
    },
    hint: "Pilih tebakanmu, lalu tekan Periksa.",
    fact: {
      value: "23,1 km²",
      caption: "Gambut Kota Pontianak hasil pemeriksaan 614 titik lapangan dan 68 contoh tanah (Parabi dkk., 2026)",
    },
  },
  {
    number: "03",
    title: "Sedalam apa",
    body: "Gambut di bawah kota ini tidak tipis. Peneliti mengebor dan mengukurnya di beberapa jalan di Pontianak Tenggara.",
    task: "Tekan ketiga titik bor di peta untuk melihat sedalam apa gambutnya.",
    observe: "Di bawah jalan-jalan ini, gambutnya setebal beberapa kali tinggi badanmu, dan di satu tempat sampai lima belas meter.",
    term: {
      word: "Bor gambut",
      meaning: "alat yang ditancapkan ke tanah untuk mengambil contoh dan mengukur tebal lapisan gambut.",
    },
    hint: "Buka ketiga titik bor.",
    fact: {
      value: "3–15 m",
      caption: "Tebal lapisan gambut di sekitar Jl. Reformasi Untan, diukur dengan geolistrik (Fajania dkk., 2021)",
    },
  },
  {
    number: "04",
    title: "Pernah terbakar",
    body: "Lahan gambut di Pontianak terbakar berulang hampir setiap tahun. Dua tempat yang baru kamu bor adalah bekas kebakaran.",
    task: "Tekan kedua titik api di peta dan baca apa yang terjadi di sana.",
    observe: "Api menyala tepat di atas gambut setebal beberapa meter. Tanah seperti inilah yang akan kamu kenali lapis demi lapis di modul berikutnya.",
    term: {
      word: "Kebakaran berulang",
      meaning: "lahan yang sama terbakar lagi pada musim kemarau berikutnya, karena gambutnya tetap kering.",
    },
    hint: "Buka kedua titik api.",
    fact: {
      value: "hampir tiap tahun",
      caption: "Kebakaran berulang di lahan gambut Kota Pontianak (Rahsia dkk., 2020)",
    },
  },
];

/** Tiga tingkat perbesaran babak 01, dengan luas gambut di tiap tingkat. */
export const ZOOM_LEVELS = [
  { id: "indonesia", label: "Indonesia", value: "13,43 juta ha", note: "Anda dkk., 2021" },
  { id: "kalbar", label: "Kalimantan Barat", value: "± 1,68 juta ha", note: "TRGD Kalbar dalam Mongabay, 2017" },
  { id: "pontianak", label: "Kota Pontianak", value: "23,1 km²", note: "Parabi dkk., 2026" },
] as const;

/**
 * Gambut per kecamatan menurut verifikasi lapangan Parabi dkk. (2026).
 * Kecamatan yang tidak tercantum tidak bergambut. Pontianak Kota dan
 * Pontianak Timur memuat tanah organik, tetapi bukan gambut.
 */
export const DISTRICT_PEAT: Record<string, { km2: number; percent: number } | undefined> = {
  "Pontianak Utara": { km2: 17.32, percent: 42 },
  "Pontianak Tenggara": { km2: 5.8, percent: 36 },
};

/**
 * Kecamatan yang menurut Parabi dkk. (2026) bertanah organik, tetapi tidak
 * memenuhi syarat gambut. Diberi label sendiri supaya pembaca tidak
 * menyimpulkan tanahnya sama sekali tidak mengandung bahan organik.
 */
export const ORGANIC_DISTRICTS: ReadonlySet<string> = new Set(["Pontianak Kota", "Pontianak Timur"]);

/** Titik bor babak 03. Kedalaman dalam meter; `max` null berarti "lebih dari". */
export const BORE_SITES = [
  {
    id: "reformasi",
    display: "3–15 m",
    title: "Jl. Reformasi Untan",
    minM: 3,
    maxM: 15,
    reading: "Tebal gambut 3–15 m, di atas lapisan lempung.",
    method: "Geolistrik, 4 lintasan × 115 m",
    source: "Fajania dkk., 2021",
  },
  {
    id: "perdana",
    display: "4,5–4,7 m",
    title: "Jl. Perdana, Bansir Darat",
    minM: 4.51,
    maxM: 4.73,
    reading: "Tebal gambut 4,5–4,7 m.",
    method: "Bor gambut",
    source: "Manurung dkk., 2021",
  },
  {
    id: "sepakat",
    display: "0,5 sampai > 5 m",
    title: "Jl. Sepakat II",
    minM: 0.5,
    maxM: 5,
    reading: "Tebal gambut 0,5 m di satu titik, lebih dari 5 m di titik lain yang berdekatan.",
    method: "Bor gambut",
    source: "Rahsia dkk., 2020",
  },
] as const;

/**
 * Titik api babak 04, dikelompokkan per lokasi. Jl. Sepakat II terbakar dua
 * kali: pertengahan 2018 (diukur Rahsia dkk.) dan Oktober 2023 (laporan
 * kejadian BPBD) — itulah arti "berulang".
 */
export const FIRE_SITES = [
  {
    id: "sepakat",
    events: [
      {
        when: "Pertengahan 2018",
        text: "Lahan gambut bekas kebun akasia terbakar. Setahun kemudian tanahnya masih terus melepaskan CO₂.",
        source: "Rahsia dkk., 2020",
      },
      {
        when: "Oktober 2023",
        text: "Terbakar lagi. Api merembes sampai ke akar dan menyala kembali tiga hari setelah dipadamkan.",
        source: "BPBD Kota Pontianak, 2023",
      },
    ],
  },
  {
    id: "perdana",
    events: [
      {
        when: "Agustus 2019",
        text: "Lahan terbakar. Gambutnya kini lebih matang dan lebih dangkal daripada lahan di sebelahnya yang tidak terbakar.",
        source: "Manurung dkk., 2021",
      },
    ],
  },
] as const;

export const SEKITARMU_TEXT = {
  zoomLabel: "Perbesar",
  check: "Periksa",
  checked: (right: number, total: number) => `Tebakanmu benar untuk ${right} dari ${total} kecamatan.`,
  peat: (percent: number) => `${percent}% gambut`,
  notPeat: "bukan gambut",
  organic: "tanah organik, bukan gambut",
  hatchNote: "Arsiran: sebagian kecamatan ini gambut. Batas gambutnya tidak digambar, hanya luasnya yang diketahui.",
  personNote: "Orang dewasa ± 1,7 m",
  /** Tebal gambut dinyatakan sebagai tumpukan orang dewasa setinggi 1,7 m. */
  personStack: (n: number) => `sampai ≈ ${n} orang dewasa bertumpuk`,
  drilling: "Mengebor…",
  guessRight: "tebakanmu tepat",
  guessWrong: "tebakanmu meleset",
  firePeat: (depth: string) => `Di bawah api ini: gambut ${depth}.`,
  attribution: "Citra Sentinel-2 cloudless 2024 © EOX (CC BY-NC-SA 4.0, data Copernicus) · Peta © kontributor OpenStreetMap (ODbL) · Natural Earth",
  /** Atribusi ringkas untuk layar ponsel; lisensi lengkap ada di data/SUMBER.md. */
  attributionShort: "Citra © EOX, Copernicus · Peta © OpenStreetMap",
  reset: "Mulai dari awal",
};
